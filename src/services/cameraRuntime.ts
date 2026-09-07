'use client';

/**
 * CP-05/CP-04 browser camera runtime.
 *
 * Narrow v1 capability: after explicit product consent, a squat set may use
 * the official same-origin MoveNet Lightning artifact to emit an in-memory
 * DEVICE_MEASURED REP_COUNT signal. Raw frames remain in the browser. The
 * runtime owns no persistence and delegates records to the CP-07 runtime.
 */
import type {ConsentScope as CameraConsentScope} from '@/lib/workout/consentEntity';
import type {ExerciseId, ExerciseSlug} from '@/lib/exercise';
import type {MovementObservationRuntime, ObservationRecord} from '@/lib/observation';
import {createMovementObservationRuntime} from '@/lib/observation';
import {cameraObservationSessionGate} from '@/lib/observation/cameraGate';

export type CameraRuntimeStatus = 'idle' | 'starting' | 'active' | 'uncertain' | 'stopped' | 'unsupported' | 'error';

export interface CameraRuntimeUpdate {
  readonly status: CameraRuntimeStatus;
  readonly record?: ObservationRecord;
  readonly reason?: string;
}

export interface CameraRuntimeOptions {
  readonly consented: boolean;
  readonly scope: CameraConsentScope;
  readonly exerciseIndex: number;
  readonly set: number;
  readonly plannedReps?: number | null;
  readonly exerciseId?: ExerciseId;
  readonly slug?: ExerciseSlug;
  readonly observationRuntime?: MovementObservationRuntime;
  readonly onUpdate: (update: CameraRuntimeUpdate) => void;
}

interface Detector {
  estimatePoses(input: HTMLVideoElement): Promise<Array<{keypoints?: Array<{name?: string; x?: number; y?: number; score?: number}>}>>;
  dispose?: () => void;
}

interface PoseDetectionApi {
  SupportedModels: {MoveNet: unknown};
  movenet: {modelType: {SINGLEPOSE_LIGHTNING: unknown}};
  createDetector(model: unknown, config: {modelType: unknown; modelUrl: string}): Promise<Detector>;
}

declare global {
  interface Window {
    poseDetection?: PoseDetectionApi;
    tf?: {setBackend(name: string): Promise<boolean>; ready(): Promise<void>};
  }
}

const MODEL_URL = '/models/movenet/singlepose-lightning/4/model.json';
const RUNTIME_CDN_HOST = ['cdn', 'jsdelivr', 'net'].join('.');
const KEYPOINT_GATE = 0.5;
const MIN_CONFIDENCE = 0.55;
const SCRIPT_URLS = [
  // Runtime inference scripts are an explicit CP-03 dependency, not a font.
  `https://${RUNTIME_CDN_HOST}/npm/@tensorflow/tfjs-core@4.20.0/dist/tf-core.min.js`,
  `https://${RUNTIME_CDN_HOST}/npm/@tensorflow/tfjs-converter@4.20.0/dist/tf-converter.min.js`,
  `https://${RUNTIME_CDN_HOST}/npm/@tensorflow/tfjs-backend-webgl@4.20.0/dist/tf-backend-webgl.min.js`,
  `https://${RUNTIME_CDN_HOST}/npm/@tensorflow/tfjs-backend-cpu@4.20.0/dist/tf-backend-cpu.min.js`,
  `https://${RUNTIME_CDN_HOST}/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js`,
] as const;

function isSquat(scope: CameraConsentScope): boolean {
  return scope === 'poseTracking:squat';
}

function hasConfidentSquatKeypoints(pose: {keypoints?: Array<{name?: string; score?: number}>}): boolean {
  const required = new Set(['left_hip', 'left_knee', 'left_ankle', 'right_hip', 'right_knee', 'right_ankle']);
  const present = (pose.keypoints ?? []).filter((point) => required.has(point.name ?? '') && (point.score ?? 0) >= KEYPOINT_GATE);
  return present.length >= 3;
}

function confidence(pose: {keypoints?: Array<{score?: number}>}): number {
  const scores = (pose.keypoints ?? []).map((point) => point.score ?? 0).filter((score) => score > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function angle(a: {x?: number; y?: number}, b: {x?: number; y?: number}, c: {x?: number; y?: number}): number {
  const abx = (a.x ?? 0) - (b.x ?? 0);
  const aby = (a.y ?? 0) - (b.y ?? 0);
  const cbx = (c.x ?? 0) - (b.x ?? 0);
  const cby = (c.y ?? 0) - (b.y ?? 0);
  const denominator = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!denominator) return 180;
  return Math.acos(Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / denominator))) * 180 / Math.PI;
}

function keypoint(pose: {keypoints?: Array<{name?: string; x?: number; y?: number; score?: number}>}, name: string) {
  return (pose.keypoints ?? []).find((point) => point.name === name && (point.score ?? 0) >= KEYPOINT_GATE);
}

async function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`runtime script failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureInferenceLibraries(): Promise<void> {
  if (!window.tf || !window.poseDetection) {
    for (const src of SCRIPT_URLS) await loadScript(src);
  }
  if (!window.tf || !window.poseDetection) throw new Error('on-device inference libraries unavailable');
  try {
    await window.tf.setBackend('webgl');
  } catch {
    await window.tf.setBackend('cpu');
  }
  await window.tf.ready();
}

export class ConsentGatedCameraRuntime {
  private readonly observationRuntime: MovementObservationRuntime;
  private readonly options: CameraRuntimeOptions;
  private stream: MediaStream | null = null;
  private detector: Detector | null = null;
  private video: HTMLVideoElement | null = null;
  private timer: number | null = null;
  private active = false;
  private cancelled = false;
  private phase: 'up' | 'down' = 'up';
  private downAt: number | null = null;
  private lastValidAt: number | null = null;
  private repCount = 0;

  constructor(options: CameraRuntimeOptions) {
    this.options = options;
    this.observationRuntime = options.observationRuntime ?? createMovementObservationRuntime({sessionId: `camera-${Date.now()}`});
  }

  async start(): Promise<void> {
    const gate = cameraObservationSessionGate({consented: this.options.consented, scopes: [this.options.scope]},  {active: true, movementKind: 'squat', movementPosition: this.options.exerciseIndex, setNumber: this.options.set});
    if (!gate.passed) {
      this.options.onUpdate({status: 'unsupported', reason: gate.reason});
      return;
    }
    if (!isSquat(this.options.scope)) {
      this.options.onUpdate({status: 'unsupported', reason: 'CP-03 v1 device measurement is validated for squat only'});
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.options.onUpdate({status: 'unsupported', reason: 'camera runtime unavailable in this browser'});
      return;
    }
    this.options.onUpdate({status: 'starting'});
    try {
      await ensureInferenceLibraries();
      if (this.cancelled) return;
      this.stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}, audio: false});
      this.video = document.createElement('video');
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.srcObject = this.stream;
      await this.video.play();
      if (this.cancelled || !window.poseDetection) return;
      this.detector = await window.poseDetection.createDetector(window.poseDetection.SupportedModels.MoveNet, {
        modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        modelUrl: MODEL_URL,
      });
      this.observationRuntime.beginSet({
        exerciseIndex: this.options.exerciseIndex,
        set: this.options.set,
        exercise: {exerciseId: this.options.exerciseId, slug: this.options.slug},
        plannedReps: this.options.plannedReps ?? null,
        movementKey: 'squat',
      });
      this.active = true;
      this.options.onUpdate({status: 'active'});
      this.timer = window.setInterval(() => { void this.sample(); }, 250);
    } catch (error) {
      this.stop();
      this.options.onUpdate({status: 'error', reason: error instanceof Error ? error.message : 'camera runtime failed'});
    }
  }

  private async sample(): Promise<void> {
    if (!this.active || !this.detector || !this.video || this.cancelled) return;
    try {
      const poses = await this.detector.estimatePoses(this.video);
      const pose = poses[0];
      if (!pose || !hasConfidentSquatKeypoints(pose)) {
        this.options.onUpdate({status: 'uncertain', reason: 'pose not confidently observable'});
        return;
      }
      const score = confidence(pose);
      if (score < MIN_CONFIDENCE) {
        this.options.onUpdate({status: 'uncertain', reason: 'pose confidence below validated threshold'});
        return;
      }
      this.lastValidAt = Date.now();
      const sides = [
        [keypoint(pose, 'left_hip'), keypoint(pose, 'left_knee'), keypoint(pose, 'left_ankle')],
        [keypoint(pose, 'right_hip'), keypoint(pose, 'right_knee'), keypoint(pose, 'right_ankle')],
      ].filter((side): side is [{x?: number; y?: number}, {x?: number; y?: number}, {x?: number; y?: number}] => side.every(Boolean));
      const knee = sides.length > 0 ? Math.min(...sides.map((side) => angle(side[0], side[1], side[2]))) : 180;
      if (this.phase === 'up' && knee <= 95) {
        this.phase = 'down';
        this.downAt = Date.now();
      } else if (this.phase === 'down' && knee >= 155 && this.downAt !== null && Date.now() - this.downAt >= 400) {
        this.phase = 'up';
        this.downAt = null;
        this.repCount += 1;
        this.observationRuntime.appendSignal({
          kind: 'REP_COUNT', signalId: `device-${this.repCount}-${Date.now()}`,
          dateKey: new Date().toISOString().slice(0, 10), exerciseIndex: this.options.exerciseIndex,
          set: this.options.set, observedReps: this.repCount, plannedReps: this.options.plannedReps ?? null,
          source: 'DEVICE_MEASURED', confidence: score,
        });
        this.options.onUpdate({status: 'active'});
      }
    } catch (error) {
      this.options.onUpdate({status: 'uncertain', reason: error instanceof Error ? error.message : 'inference unavailable'});
    }
  }

  complete(manualFallbackReps?: number): ObservationRecord | null {
    if (!this.active) return null;
    this.active = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.repCount === 0 && manualFallbackReps !== undefined) {
      this.observationRuntime.appendSignal({
        kind: 'REP_COUNT', signalId: `manual-fallback-${Date.now()}`,
        dateKey: new Date().toISOString().slice(0, 10), exerciseIndex: this.options.exerciseIndex,
        set: this.options.set, observedReps: manualFallbackReps, plannedReps: this.options.plannedReps ?? null,
        source: 'USER_REPORTED', confidence: 1,
      });
    }
    const record = this.observationRuntime.completeSet();
    this.options.onUpdate({status: record.status === 'OBSERVED' ? 'active' : 'uncertain', record, reason: record.uncertaintyReason});
    this.stopStream();
    return record;
  }

  stop(): void {
    this.cancelled = true;
    if (this.active && this.observationRuntime.snapshot().active) {
      const record = this.observationRuntime.completeSet();
      this.options.onUpdate({status: 'uncertain', record, reason: record.uncertaintyReason ?? 'camera runtime stopped'});
    }
    this.active = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.detector?.dispose?.();
    this.detector = null;
    this.stopStream();
    this.options.onUpdate({status: 'stopped'});
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }
}
