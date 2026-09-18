'use client';

import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import type {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  type MentorStageStrings,
  type MentorStageStatus,
} from './contract';
import {MENTOR_BONE_MAP, type MentorBoneKey} from './mentorBones';
import {
  acquireMentorPreparation,
  disposeMentorResources,
  getMentorAttachmentPreparation,
} from './mentorPreparation';
import {
  ATTACH_CHUNK_BUDGET_MS,
  applyMentorCameraFit,
  projectMentorBoundsAtDistance,
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
 * freeze fix): the renderer-independent normalization, animation-track
 * cleanup, pose sampling, and envelope collection are prepared once with
 * the session GLTF during PREPARING. INTRO then yields before creating its
 * renderer and only performs the renderer-bound attach, responsive candidate
 * selection, and camera solve in cooperative chunks. This keeps the parsed
 * scene as one owned instance while moving reusable work out of the visible
 * handoff path.
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

function markMentorPerformance(name: string): void {
  if (typeof performance === 'undefined') return;
  if (performance.getEntriesByName(name).length === 0) performance.mark(name);
}

// The approved pre-correction mobile cue stack occupied 80px (three 24px
// rows with 4px gaps); the accepted intrinsic 2+1 group occupies 54px. Keep
// that 26px of vertical framing budget in the camera solve so the cue
// composition can stay compact without enlarging the already-approved Mentor.
const MOBILE_CUE_FRAMING_RESERVE_PX = 26;
const MOBILE_PRESENTATION_OFFSET_Y = 0.125;
const DESKTOP_PRESENTATION_OFFSET_Y = 0.1;

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
    let framingAnimatedSize = new THREE.Vector3();
    let framingAnimatedCenter = new THREE.Vector3();
    let framingAnimatedMinY = 0;
    let hasFramingPresentation = false;

    let disposed = false;
    let animationFrame = 0;
    let firstAnimationFrameMarked = false;
    let firstVisibleFrameMarked = false;
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
      markMentorPerformance('v2:mentor-renderer-created');
      markMentorPerformance('E_MENTOR_RENDERER_CREATED');
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
        const isMobilePortrait = box.width <= 430 && box.height > box.width;
        const framingHeight = isMobilePortrait
          ? Math.max(1, box.height - MOBILE_CUE_FRAMING_RESERVE_PX)
          : box.height;
        if (hasFramingPresentation) {
          const anchorVerticalOffset = framingAnimatedSize.y * 0.06;
          const presentationOffset = new THREE.Vector3(
            -0.002,
            isMobilePortrait ? MOBILE_PRESENTATION_OFFSET_Y : DESKTOP_PRESENTATION_OFFSET_Y,
            0,
          );
          mentorAnchor.position.set(
            -framingAnimatedCenter.x + presentationOffset.x,
            anchorVerticalOffset + presentationOffset.y,
            -framingAnimatedCenter.z + presentationOffset.z,
          );
        }
        camera.aspect = box.width / box.height;
        camera.updateProjectionMatrix();
        const fit = solveMentorCameraFit({
          width: box.width,
          height: framingHeight,
          camera,
          anchorPosition: mentorAnchor.position,
          bounds: framingBounds,
          vertexSets: framingVertexSets,
          baseTargetY: framingTargetY,
          isMobilePortrait: box.width <= 430 && box.height > box.width,
        });
        applyMentorCameraFit(camera, fit);
        const projected = projectMentorBoundsAtDistance(
          {
            camera: camera.clone(),
            anchorPosition: mentorAnchor.position,
            vertexSets: framingVertexSets,
            bounds: framingBounds,
          },
          fit.distance,
          fit.targetY,
          box.width,
          box.height,
        );
        if (canvas.parentElement) {
          canvas.parentElement.dataset.mentorProjectedBounds = JSON.stringify(projected);
          canvas.parentElement.dataset.mentorCameraDistance = String(fit.distance);
          canvas.parentElement.dataset.mentorCameraTargetY = String(fit.targetY);
        }
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
        markMentorPerformance('v2:mentor-prepared-gltf-available');
        markMentorPerformance('D_MENTOR_GLTF_PREPARATION_SETTLED');
        // Unmount won the race before the preparation settled: release the
        // acquired single-consumer ownership here (the cleanup path ran with
        // preparedGltf still null and cannot see this resource).
        if (disposed) {
          disposeMentorResources(acquired);
          return;
        }
        preparedGltf = acquired;
        model = acquired.scene;
        const preparedAttachment = getMentorAttachmentPreparation(acquired);
        normalizedModelPosition.copy(preparedAttachment.normalizedModelPosition);
        shouldNeutralizeRootDrift = preparedAttachment.shouldNeutralizeRootDrift;

        // The parsed scene is the single owned instance. Preparation already
        // normalized it; INTRO only attaches it to this renderer's anchor.
        model.traverse((object) => {
          if (!(object instanceof THREE.Bone)) return;
          const match = (Object.entries(MENTOR_BONE_MAP) as Array<[MentorBoneKey, string]>)
            .find(([, boneName]) => boneName === object.name);
          if (match) mentorBones[match[0]] = object;
        });
        mentorAnchor.add(model);
        markMentorPerformance('v2:mentor-scene-attached');
        markMentorPerformance('F_MENTOR_SCENE_ATTACHED');
        model.updateMatrixWorld(true);

        const {playableClip, animatedBounds, poseVertexSets} = preparedAttachment;
        framingAnimatedSize = preparedAttachment.framingAnimatedSize;
        framingAnimatedMinY = preparedAttachment.framingAnimatedMinY;
        framingAnimatedCenter = preparedAttachment.framingAnimatedCenter;
        hasFramingPresentation = true;
        markMentorPerformance('v2:mentor-clone-instance-prepared');
        framingBounds.copy(animatedBounds);
        chunkStart = performance.now();
        await yieldChunk();
        if (disposed || !model) return;

        // CHUNKS: per-pose silhouette candidate selection (projections at
        // three reference distances), time-sliced the same way.
        // Use the current camera only to identify each pose's projected
        // silhouette candidates. The actual fit below tests every pose
        // independently at every candidate distance.
        // The presentation offset is derived again from the settled stage
        // dimensions in applyFitFromCache. That preserves the approved mobile
        // framing even when the first layout read occurs before iOS finishes
        // resolving the stage height.
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
        framingBounds.copy(animatedBounds);

        // Final framing solve from the cached candidates, then the real
        // animation loop content. Ready only AFTER the final framing is
        // applied — the user never sees a mis-framed intermediate state.
        hasFit = true;
        applyFitFromCache();
        markMentorPerformance('v2:mentor-framing-solved');
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
        markMentorPerformance('v2:mentor-animation-setup');
        model.updateMatrixWorld(true);
        setStatus('ready');
      };

      const lastTimeRef = {value: performance.now()};
      const render = (time: number) => {
        if (disposed) return;
        if (!firstAnimationFrameMarked) {
          firstAnimationFrameMarked = true;
          markMentorPerformance('v2:mentor-first-request-animation-frame');
          markMentorPerformance('v2:mentor-first-raf-callback');
        }
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
        if (model && hasFit && !firstVisibleFrameMarked) {
          firstVisibleFrameMarked = true;
          markMentorPerformance('v2:mentor-first-visible-frame');
          markMentorPerformance('MENTOR_FIRST_VISIBLE_FRAME');
          markMentorPerformance('H_MENTOR_FIRST_MESH_RENDERED');
          requestAnimationFrame(() => {
            markMentorPerformance('I_BROWSER_PAINT_AFTER_MENTOR_FRAME');
          });
          onReadyRef.current?.();
        }
        animationFrame = requestAnimationFrame(render);
      };
      markMentorPerformance('G_MENTOR_FIRST_RAF_REQUESTED');
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
