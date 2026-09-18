'use client';

import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import type {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  type MentorStageStrings,
  type MentorStageStatus,
} from './contract';
import {MENTOR_BONE_MAP, type MentorBoneKey} from './mentorBones';
import {acquireMentorPreparation, disposeMentorResources} from './mentorPreparation';
import {
  applyMentorCameraFit,
  collectVisibleMeshBounds,
  selectProjectedEnvelopeVertices,
  solveMentorCameraFit,
  yieldToMain,
} from './mentorFraming';

/**
 * MentorStage (INTRO) — the existing APPROVED 3D Mentor capability
 * (owner polish delta §C), re-expressed for the V2 experience layer from
 * `prototype/workout-layout-blueprint` (plan.md §9:
 * REUSABLE_IMPLEMENTATION_EVIDENCE — selectively re-expressed against the
 * current contracts, never a V2 baseline).
 *
 * WHAT IS PRESERVED VERBATIM (the approved capability):
 *   - the GLB asset (embedded squat clip), rig and bone map — no rerig,
 *     no GLB modification, no new exercise animation;
 *   - the self-framing camera model (animated-envelope fit with safe-area
 *     margins, portrait vertical shift, subpixel Safari buffer) — the exact
 *     math, extracted to `mentorFraming.ts`;
 *   - root-drift neutralization (Hips X/Z locked so the squat cannot walk
 *     across the stage);
 *   - the loading/ready/failed status surface with a usable degraded mode
 *     (no crash, no broken canvas — status text + aria-live).
 *
 * HANDOFF TWO-PHASE DEFERRED MOUNT (owner device correction §1 — the
 * freeze fix): the previous implementation performed its ENTIRE mount work
 * — WebGL renderer/scene creation AND the demonstration attach (33
 * skinned-pose vertex samples + per-pose silhouette selection + camera
 * solve) — synchronously inside ONE mount task. On real devices that was a
 * multi-second long main-thread task sitting exactly between the PREPARING
 * countdown completion (T1) and the first INTRO paint (T3) — measured
 * T1→T3 ≈ 5.4s with T1→T2 = 0ms: the state transition was already instant;
 * the MOUNT TASK blocked the first visible frame. The mount is now
 * TWO-PHASE and COOPERATIVE:
 *   phase 0 — the effect body does nothing heavy; it yields to the main
 *     thread FIRST so the PREPARING→INTRO transition paints immediately;
 *   phase 1 — renderer/scene creation + the attach work, every chunk
 *     capped (~12ms budget) and separated by main-thread yields
 *     (`mentorFraming`).
 * The stage keeps the existing lightweight loading state until the attach
 * settles — the demonstration appears with its final framing, never a
 * wrong-size flash, and NOTHING (state, render, orchestration) waits on
 * this work.
 *
 * Resizes re-solve from the CACHED pose candidates (never resample), so
 * the ResizeObserver path stays cheap and loop-free.
 *
 * Lifecycle contract: the stage is mounted ONLY while INTRO is presented
 * (one mount per exercise identity — spec §5.3 intro cadence). The GLB is
 * NOT loaded here: the stage ACQUIRES the session's prepared Mentor
 * (PREPARE ONCE → REUSE — `mentorPreparation.ts`, started during
 * PREPARING by the shared shell) and only ATTACHES the parsed GLTF to its
 * own renderer/scene. If preparation is still in flight at mount, the
 * stage shows the existing lightweight loading state and attaches the SAME
 * in-flight lifecycle when it settles — no restart, no duplicate request,
 * no second parse. `paused` freezes the animation loop through the
 * existing prop convention. Reduced motion: the demonstration IS the
 * content (motion conveys the movement understanding INTRO exists for);
 * the stage still renders and respects `paused`. WebGL failure degrades
 * to the text status surface.
 */

export interface MentorStageProps {
  /** Freezes the demonstration (orchestration pause authority). */
  paused: boolean;
  /** Layout host the canvas absolutely fills (shell-controlled geometry). */
  fillHost?: boolean;
  /** Localized presentation strings (loading/failed/aria). */
  strings: MentorStageStrings;
  /** Fires once when the GLB is loaded and the clip starts. */
  onReady?: () => void;
  /** Fires when the renderer/GLB cannot initialize (degraded surface shown). */
  onFailed?: () => void;
}

/** Main-thread budget per attach chunk (ms) — caps every task under a frame. */
const ATTACH_CHUNK_BUDGET_MS = 12;
/** Pose samples across the embedded clip (owner-approved framing contract). */
const ATTACH_POSE_SAMPLES = 16;
/**
 * Vertex subsample stride for the pose sampling. The dense Mentor mesh has
 * ~60k skinned vertices; every 8th vertex keeps the per-pose vertex work
 * inside the attach chunk budget (the solved fit is unchanged — see
 * collectVisibleMeshBounds), so INTRO stays responsive during the
 * time-sliced attach.
 */
const ATTACH_VERTEX_STRIDE = 8;

export function MentorStage({paused, fillHost = true, strings, onReady, onFailed}: MentorStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onReadyRef = useRef(onReady);
  const onFailedRef = useRef(onFailed);
  const [status, setStatus] = useState<MentorStageStatus>('loading');

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onFailedRef.current = onFailed;
  }, [onFailed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mutable attach state shared by the boot phases (all mutations happen
    // on the main thread).
    let mixer: THREE.AnimationMixer | null = null;
    let animationAction: THREE.AnimationAction | null = null;
    let model: THREE.Group | null = null;
    let preparedGltf: GLTF | null = null;
    let normalizedModelPosition = new THREE.Vector3();
    let shouldNeutralizeRootDrift = false;
    let hasFit = false;
    // Cached solve inputs: resizes re-solve from these — never resample.
    const framingBounds = new THREE.Box3();
    const framingVertexSets: THREE.Vector3[][] = [];
    let framingTargetY = 0.52;

    let disposed = false;
    let animationFrame = 0;
    let activeRenderer: THREE.WebGLRenderer | null = null;
    let activeResizeObserver: ResizeObserver | null = null;
    const stage = canvas.parentElement;

    /**
     * PHASE 1 — the whole WebGL lifecycle, deferred past the first INTRO
     * paint (see the two-phase mount contract above). Everything heavy
     * (renderer/scene creation, attach, sampling) runs here, chunked.
     */
    const boot = async () => {
      await yieldToMain();
      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
      camera.position.set(0, 0.57, 2.32);
      camera.lookAt(0, 0.52, 0);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
      } catch {
        setStatus('failed');
        onFailedRef.current?.();
        return;
      }
      activeRenderer = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      scene.add(new THREE.AmbientLight(0xffffff, 1.25));
      const keyLight = new THREE.DirectionalLight(0xfff4e9, 2.6);
      keyLight.position.set(2.5, 3.5, 3);
      keyLight.castShadow = true;
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xb9d6ff, 1.3);
      fillLight.position.set(-2, 1.5, 1);
      scene.add(fillLight);
      const warmLight = new THREE.PointLight(0xff895e, 1.2, 5);
      warmLight.position.set(0, 0.8, 1.6);
      scene.add(warmLight);

      const mentorAnchor = new THREE.Group();
      mentorAnchor.name = 'MentorPresentationAnchor';
      scene.add(mentorAnchor);
      const mentorBones: Partial<Record<MentorBoneKey, THREE.Bone>> = {};

      const stageBox = () => {
        if (!stage) return null;
        const {width, height} = stage.getBoundingClientRect();
        if (width <= 0 || height <= 0) return null;
        return {width, height};
      };

      const applyFitFromCache = () => {
        if (!hasFit) return;
        const box = stageBox();
        if (!box) return;
        camera.aspect = box.width / box.height;
        camera.updateProjectionMatrix();
        const fit = solveMentorCameraFit({
          width: box.width,
          height: box.height,
          camera,
          anchorPosition: mentorAnchor.position,
          bounds: framingBounds,
          vertexSets: framingVertexSets,
          baseTargetY: framingTargetY,
          isMobilePortrait: box.width <= 430 && box.height > box.width,
        });
        applyMentorCameraFit(camera, fit);
      };

      const resize = () => {
        const box = stageBox();
        if (!box) return;
        renderer.setSize(Math.round(box.width), Math.round(box.height), false);
        camera.aspect = box.width / box.height;
        camera.updateProjectionMatrix();
        // Cached-candidates re-solve only — sampling never reruns here.
        applyFitFromCache();
      };
      // Observe the stable layout host, not the canvas. renderer.setSize mutates
      // the canvas bitmap dimensions; observing the canvas itself can create a
      // ResizeObserver feedback loop in some browsers.
      const resizeObserver = stage ? new ResizeObserver(resize) : null;
      activeResizeObserver = resizeObserver;
      if (resizeObserver && stage) resizeObserver.observe(stage);
      resize();

      // Time-sliced attach scheduling: a chunk may run up to the budget, then
      // must yield (frame tick / scheduler.yield) before continuing.
      let chunkStart = performance.now();
      const chunkBudgetExceeded = () => performance.now() - chunkStart > ATTACH_CHUNK_BUDGET_MS;
      const yieldChunk = async () => {
        await yieldToMain();
        chunkStart = performance.now();
      };

      /**
       * Cooperative attach — the heavy demonstration work, time-sliced so no
       * single main-thread task blocks the PREPARING→INTRO transition paint
       * (owner device correction §1). Status stays on the existing lightweight
       * loading surface until the final framing is applied.
       */
      const attach = async () => {
        let acquired: GLTF;
        try {
          acquired = await acquireMentorPreparation();
        } catch {
          if (!disposed) {
            setStatus('failed');
            onFailedRef.current?.();
          }
          return;
        }
        // Unmount won the race before the preparation settled: release the
        // acquired single-consumer ownership here (the cleanup path ran with
        // preparedGltf still null and cannot see this resource).
        if (disposed) {
          disposeMentorResources(acquired);
          return;
        }
        preparedGltf = acquired;
        model = acquired.scene;
        chunkStart = performance.now();

        // CHUNK: collect rig bones + normalize the authored asset into
        // presentation space (one vertex traversal — cheap).
        model.traverse((object) => {
          if (!(object instanceof THREE.Bone)) return;
          const match = (Object.entries(MENTOR_BONE_MAP) as Array<[MentorBoneKey, string]>)
            .find(([, boneName]) => boneName === object.name);
          if (match) mentorBones[match[0]] = object;
        });
        const sourceBounds = new THREE.Box3().setFromObject(model);
        const sourceSize = sourceBounds.getSize(new THREE.Vector3());
        const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
        const scaleFactor = 1.08;
        const baseScale = 1.22 / Math.max(sourceSize.y, 0.01);
        const scale = baseScale * scaleFactor;
        model.scale.setScalar(scale);
        model.position.set(
          -sourceCenter.x * scale,
          -sourceBounds.min.y * scale,
          -sourceCenter.z * scale,
        );
        // Empirically verified against the rendered asset: its visible face
        // is presented to the camera at the unrotated Y orientation.
        model.rotation.y = 0;
        mentorAnchor.add(model);
        model.updateMatrixWorld(true);

        // The GLB contains a Hips translation track. Clone the runtime clip
        // and keep its vertical component, while locking X/Z to the first
        // keyed position so the squat cannot walk across the stage.
        const clip = acquired.animations[0];
        const playableClip = clip?.clone();
        if (playableClip) {
          playableClip.tracks.forEach((track) => {
            if (!/(^|\.)((position)|(translation))$/.test(track.name) ||
                !/(^|\.)((root)|(hips)|(armature)|(scene))($|\.)/i.test(track.name)) return;
            const values = track.values;
            const stride = track.getValueSize();
            const baseX = values[0] ?? 0;
            const baseZ = values[2] ?? 0;
            for (let index = 0; index < values.length; index += stride) {
              values[index] = baseX;
              if (stride > 2) values[index + 2] = baseZ;
            }
            shouldNeutralizeRootDrift = true;
          });
        }
        const previewMixer = playableClip ? new THREE.AnimationMixer(model) : null;
        const previewAction = previewMixer && playableClip ? previewMixer.clipAction(playableClip) : null;
        await yieldChunk();
        if (disposed || !model) return;

        // CHUNKS: sample the embedded clip ONCE, time-sliced per chunk so no
        // task exceeds the frame budget. Unioning these pose bounds gives the
        // squat loop a stable frame that covers both standing and deep-squat
        // extremes without per-frame camera movement.
        const animatedBounds = new THREE.Box3();
        normalizedModelPosition = new THREE.Vector3(-sourceCenter.x * scale, model.position.y, -sourceCenter.z * scale);
        const poseVertexSets: THREE.Vector3[][] = [];
        if (previewAction && previewMixer && playableClip) {
          previewAction.play();
          for (let index = 0; index <= ATTACH_POSE_SAMPLES; index += 1) {
            previewMixer.setTime((playableClip.duration * index) / ATTACH_POSE_SAMPLES);
            model.updateMatrixWorld(true);
            const poseBounds = new THREE.Box3();
            const poseVertices: THREE.Vector3[] = [];
            collectVisibleMeshBounds(model, poseBounds, poseVertices, ATTACH_VERTEX_STRIDE);
            animatedBounds.union(poseBounds);
            poseVertexSets.push(poseVertices);
            if (chunkBudgetExceeded()) {
              // eslint-disable-next-line no-await-in-loop
              await yieldChunk();
              if (disposed || !model) return;
            }
          }
        } else {
          const poseVertices: THREE.Vector3[] = [];
          collectVisibleMeshBounds(model, animatedBounds, poseVertices, ATTACH_VERTEX_STRIDE);
          poseVertexSets.push(poseVertices);
        }
        if (chunkBudgetExceeded()) {
          await yieldChunk();
          if (disposed || !model) return;
        }

        // CHUNKS: per-pose silhouette candidate selection (projections at
        // three reference distances), time-sliced the same way.
        // Use the current camera only to identify each pose's projected
        // silhouette candidates. The actual fit below tests every pose
        // independently at every candidate distance.
        const animatedSize = animatedBounds.getSize(new THREE.Vector3());
        const animatedCenter = animatedBounds.getCenter(new THREE.Vector3());
        // Keep the approved anchor and camera framing fixed while applying
        // the requested presentation-only scale increase.
        const framingAnimatedSize = animatedSize.clone().multiplyScalar(1 / scaleFactor);
        const framingAnimatedMinY = animatedBounds.min.y / scaleFactor;
        const anchorVerticalOffset = framingAnimatedSize.y * 0.06;
        // Empirically verified deterministic visual-envelope correction from
        // the approved prototype presentation (shared by every pose).
        const presentationOffset = new THREE.Vector3(-0.002, 0.055, 0);
        const torsoTargetY = framingAnimatedMinY + framingAnimatedSize.y * 0.58;
        const visualStageLift = framingAnimatedSize.y * 0.05;
        framingTargetY = torsoTargetY + visualStageLift;
        camera.position.set(0, framingTargetY, 2.32);
        camera.lookAt(0, framingTargetY, 0);
        camera.updateProjectionMatrix();
        for (const poseVertices of poseVertexSets) {
          framingVertexSets.push(selectProjectedEnvelopeVertices(poseVertices, camera, mentorAnchor.position));
          if (chunkBudgetExceeded()) {
            // eslint-disable-next-line no-await-in-loop
            await yieldChunk();
            if (disposed || !model) return;
          }
        }
        // The anchor is the sole horizontal/depth presentation transform. The
        // camera must look at that normalized space, otherwise applying the
        // bounds center to both anchor and camera causes a visible side drift.
        const framingAnimatedCenter = animatedCenter.clone().multiplyScalar(1 / scaleFactor);
        const presentationCenterX = framingAnimatedCenter.x;
        const presentationCenterZ = framingAnimatedCenter.z;
        mentorAnchor.position.set(
          -presentationCenterX + presentationOffset.x,
          anchorVerticalOffset + presentationOffset.y,
          -presentationCenterZ + presentationOffset.z,
        );
        framingBounds.copy(animatedBounds);

        // Final framing solve from the cached candidates, then the real
        // animation loop content. Ready only AFTER the final framing is
        // applied — the user never sees a mis-framed intermediate state.
        hasFit = true;
        applyFitFromCache();
        previewAction?.stop();
        previewMixer?.stopAllAction();
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            if (object.material instanceof THREE.MeshStandardMaterial) {
              object.material.roughness = Math.max(object.material.roughness, 0.72);
            }
          }
        });

        if (acquired.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          animationAction = mixer.clipAction(playableClip ?? acquired.animations[0]);
          animationAction.setLoop(THREE.LoopRepeat, Infinity);
          animationAction.paused = pausedRef.current;
          animationAction.play();
        }
        model.updateMatrixWorld(true);
        setStatus('ready');
        onReadyRef.current?.();
      };

      const lastTimeRef = {value: performance.now()};
      const render = (time: number) => {
        if (disposed) return;
        const delta = Math.min((time - lastTimeRef.value) / 1000, 0.05);
        lastTimeRef.value = time;
        if (animationAction) animationAction.paused = pausedRef.current;
        mixer?.update(delta);
        // Mixer evaluation can reapply root translation tracks. Reassert the
        // stable presentation transform without touching joint rotations.
        if (model && shouldNeutralizeRootDrift) {
          model.position.x = normalizedModelPosition.x;
          model.position.z = normalizedModelPosition.z;
        }
        if (model) model.updateMatrixWorld(true);
        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(render);
      };
      animationFrame = requestAnimationFrame(render);

      await attach();
    };
    void boot();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      activeResizeObserver?.disconnect();
      mixer?.stopAllAction();
      // The stage OWNS the acquired preparation (single consumer) — its
      // unmount releases geometry/material/textures (see mentorPreparation).
      if (preparedGltf) disposeMentorResources(preparedGltf);
      activeRenderer?.dispose();
    };
    // Mount-once lifecycle: the stage exists exactly while INTRO presents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-workout-v2-mentor=""
      role="img"
      aria-label={strings.ariaLabel}
      className={
        fillHost
          ? 'relative h-full w-full'
          : 'relative aspect-[3/4] w-full max-w-[300px] justify-self-center sm:max-w-[360px]'
      }
    >
      {status !== 'ready' ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-3xl text-sm text-[color:var(--apex-text-secondary)]"
        >
          <span aria-hidden="true" className="text-lg">◌</span>
          <span>{status === 'failed' ? strings.unavailable : strings.loading}</span>
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={status === 'ready' ? 'h-full w-full' : 'h-full w-full opacity-0'}
      />
    </div>
  );
}

export default MentorStage;
