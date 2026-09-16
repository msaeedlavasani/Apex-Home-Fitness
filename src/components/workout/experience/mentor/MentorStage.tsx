'use client';

import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  MENTOR_URL,
  type MentorStageStrings,
  type MentorStageStatus,
} from './contract';
import {MENTOR_BONE_MAP, type MentorBoneKey} from './mentorBones';

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
 *     margins, portrait vertical shift, subpixel Safari buffer);
 *   - root-drift neutralization (Hips X/Z locked so the squat cannot walk
 *     across the stage);
 *   - the loading/ready/failed status surface with a usable degraded mode
 *     (no crash, no broken canvas — status text + aria-live).
 *
 * WHAT IS DELIBERATELY DROPPED (later-slice capabilities):
 *   - tracking overlays (bone projections to screen space, skeleton
 *     connections, camera-correction targets) — INTRO demonstrates the
 *     movement; camera/tracking is a later authorized slice;
 *   - prototype-specific CSS class names — the stage renders into the
 *     supplied layout host (`fillHost`) with self-contained utility
 *     classes so it obeys the shared shell's frozen visual system.
 *
 * Lifecycle contract: the stage is mounted ONLY while INTRO is presented
 * (one mount per exercise identity — spec §5.3 intro cadence). `paused`
 * freezes the animation loop through the existing prop convention.
 * Reduced motion: the demonstration IS the content (motion conveys the
 * movement understanding INTRO exists for); the stage still renders and
 * respects `paused`. WebGL failure degrades to the text status surface.
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

    let mixer: THREE.AnimationMixer | null = null;
    let animationAction: THREE.AnimationAction | null = null;
    let model: THREE.Group | null = null;
    let normalizedModelPosition = new THREE.Vector3();
    let shouldNeutralizeRootDrift = false;
    const mentorBones: Partial<Record<MentorBoneKey, THREE.Bone>> = {};
    const mentorAnchor = new THREE.Group();
    mentorAnchor.name = 'MentorPresentationAnchor';
    scene.add(mentorAnchor);
    const animatedFrameBounds = new THREE.Box3();
    const animatedFrameVertexSets: THREE.Vector3[][] = [];
    const cameraTarget = new THREE.Vector3();
    const frameCorner = new THREE.Vector3();
    const framePoint = new THREE.Vector3();
    const visualVertex = new THREE.Vector3();
    const projectedVertex = new THREE.Vector3();
    let hasAnimatedFrameBounds = false;
    let animationFrame = 0;
    let lastTime = performance.now();
    let disposed = false;

    const stage = canvas.parentElement;
    const fitCameraToAnimatedEnvelope = () => {
      if (!stage || !hasAnimatedFrameBounds) return;
      const {width, height} = stage.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const projectedBoundsAtDistance = (distance: number) => {
        camera.position.set(0, cameraTarget.y, distance);
        camera.lookAt(cameraTarget);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();

        let left = Infinity;
        let right = -Infinity;
        let top = Infinity;
        let bottom = -Infinity;
        if (animatedFrameVertexSets.length > 0) {
          animatedFrameVertexSets.forEach((vertices) => {
            vertices.forEach((vertex) => {
              framePoint.copy(vertex).add(mentorAnchor.position).project(camera);
              const screenX = (framePoint.x + 1) * 0.5 * width;
              const screenY = (1 - framePoint.y) * 0.5 * height;
              left = Math.min(left, screenX);
              right = Math.max(right, screenX);
              top = Math.min(top, screenY);
              bottom = Math.max(bottom, screenY);
            });
          });
        } else {
          for (let x = 0; x <= 1; x += 1) {
            for (let y = 0; y <= 1; y += 1) {
              for (let z = 0; z <= 1; z += 1) {
                frameCorner.set(
                  x ? animatedFrameBounds.max.x : animatedFrameBounds.min.x,
                  y ? animatedFrameBounds.max.y : animatedFrameBounds.min.y,
                  z ? animatedFrameBounds.max.z : animatedFrameBounds.min.z,
                ).project(camera);
                const screenX = (frameCorner.x + 1) * 0.5 * width;
                const screenY = (1 - frameCorner.y) * 0.5 * height;
                left = Math.min(left, screenX);
                right = Math.max(right, screenX);
                top = Math.min(top, screenY);
                bottom = Math.max(bottom, screenY);
              }
            }
          }
        }
        return {left, right, top, bottom};
      };

      const horizontalSafeArea = 12;
      const verticalSafeArea = 16;
      const fitsSafeArea = (bounds: ReturnType<typeof projectedBoundsAtDistance>) =>
        bounds.left >= horizontalSafeArea &&
        bounds.right <= width - horizontalSafeArea &&
        bounds.top >= verticalSafeArea &&
        bounds.bottom <= height - verticalSafeArea;

      let nearest = Math.max(0.1, animatedFrameBounds.max.z + mentorAnchor.position.z + 0.05);
      let farthest = 20.0;
      while (!fitsSafeArea(projectedBoundsAtDistance(farthest)) && farthest < 160) {
        farthest *= 2;
      }
      for (let iteration = 0; iteration < 28; iteration += 1) {
        const distance = (nearest + farthest) * 0.5;
        if (fitsSafeArea(projectedBoundsAtDistance(distance))) farthest = distance;
        else nearest = distance;
      }

      const isMobilePortrait = width <= 430 && height > width;
      const requestedVerticalShiftPx = isMobilePortrait ? 12 : 0;
      const fittedBounds = projectedBoundsAtDistance(farthest);
      const maximumTopShiftPx = Math.max(0, fittedBounds.top - 12);
      // Keep a small subpixel buffer for Safari rasterization at the lower
      // edge; the product contract remains a minimum 6px clearance.
      const maximumBottomShiftPx = Math.max(0, height - fittedBounds.bottom - 6.25);
      const appliedVerticalShiftPx = Math.min(
        requestedVerticalShiftPx,
        maximumTopShiftPx,
        maximumBottomShiftPx,
      );
      const worldUnitsPerPixel =
        (2 * farthest * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) / height;
      const shiftedCameraTarget = frameCorner.copy(cameraTarget);
      shiftedCameraTarget.y += appliedVerticalShiftPx * worldUnitsPerPixel;

      camera.position.set(0, shiftedCameraTarget.y, farthest);
      camera.lookAt(shiftedCameraTarget);
      camera.near = Math.max(0.01, farthest * 0.01);
      camera.far = Math.max(20, farthest * 4);
      camera.updateProjectionMatrix();
    };

    const resize = () => {
      if (!stage) return;
      const {width, height} = stage.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(Math.round(width), Math.round(height), false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fitCameraToAnimatedEnvelope();
    };
    // Observe the stable layout host, not the canvas. renderer.setSize mutates
    // the canvas bitmap dimensions; observing the canvas itself can create a
    // ResizeObserver feedback loop in some browsers.
    const resizeObserver = stage ? new ResizeObserver(resize) : null;
    if (resizeObserver && stage) resizeObserver.observe(stage);
    resize();

    const loader = new GLTFLoader();
    const collectVisibleMeshBounds = (target: THREE.Box3, collectVertices?: THREE.Vector3[]) => {
      if (!model) return target.makeEmpty();
      target.makeEmpty();
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const position = object.geometry.getAttribute('position');
        if (!position) return;
        for (let index = 0; index < position.count; index += 1) {
          const skinnedMesh = object instanceof THREE.SkinnedMesh ? object : null;
          if (skinnedMesh) skinnedMesh.getVertexPosition(index, visualVertex);
          else visualVertex.fromBufferAttribute(position, index);
          projectedVertex.copy(visualVertex);
          object.localToWorld(projectedVertex);
          target.expandByPoint(projectedVertex);
          collectVertices?.push(projectedVertex.clone());
        }
      });
      return target;
    };
    const selectProjectedEnvelopeVertices = (vertices: THREE.Vector3[]) => {
      if (vertices.length === 0) return [];

      // The full mesh is collected for every sampled pose. These candidates
      // preserve the vertices that can define the projected silhouette for
      // each pose while keeping the responsive distance solve inexpensive.
      const candidateVertices: THREE.Vector3[] = [];
      // Perspective can change which mesh vertex is the silhouette extremum
      // as distance changes. Keep extrema from several reference distances,
      // then solve the final distance against every pose independently.
      [1.8, 2.32, 4.0].forEach((distance) => {
        camera.position.set(0, cameraTarget.y, distance);
        camera.lookAt(cameraTarget);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const projectedVertices = vertices.map((vertex) => {
          framePoint.copy(vertex).add(mentorAnchor.position).project(camera);
          return {vertex, screenX: framePoint.x, screenY: framePoint.y};
        });
        candidateVertices.push(
          projectedVertices.reduce((best, item) => item.screenX < best.screenX ? item : best).vertex,
          projectedVertices.reduce((best, item) => item.screenX > best.screenX ? item : best).vertex,
          projectedVertices.reduce((best, item) => item.screenY < best.screenY ? item : best).vertex,
          projectedVertices.reduce((best, item) => item.screenY > best.screenY ? item : best).vertex,
        );
      });
      candidateVertices.push(
        vertices.reduce((best, vertex) => vertex.z < best.z ? vertex : best),
        vertices.reduce((best, vertex) => vertex.z > best.z ? vertex : best),
      );
      return Array.from(new Set(candidateVertices)).map((vertex) => vertex.clone());
    };

    loader.load(
      MENTOR_URL,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.traverse((object) => {
          if (!(object instanceof THREE.Bone)) return;
          const match = (Object.entries(MENTOR_BONE_MAP) as Array<[MentorBoneKey, string]>)
            .find(([, boneName]) => boneName === object.name);
          if (match) mentorBones[match[0]] = object;
        });
        // Frame the imported asset from its actual world-space bounds. The
        // source is authored around a skeleton root, so hard-coded camera
        // assumptions can leave the skinned mesh outside the portrait view.
        model.updateMatrixWorld(true);
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
        model.updateMatrixWorld(true);

        // Sample the complete embedded clip once before fixing the camera.
        // Unioning these pose bounds gives the squat loop a stable frame that
        // covers both standing and deep-squat extremes without per-frame
        // camera movement.
        const clip = gltf.animations[0];
        // The GLB contains a Hips translation track. Clone the runtime clip
        // and keep its vertical component, while locking X/Z to the first
        // keyed position so the squat cannot walk across the stage.
        const playableClip = clip?.clone();
        if (playableClip) {
          playableClip.tracks.forEach((track) => {
            if (!/(^|\\.)((position)|(translation))$/.test(track.name) ||
                !/(^|\\.)((root)|(hips)|(armature)|(scene))($|\\.)/i.test(track.name)) return;
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
        const animatedBounds = new THREE.Box3();
        normalizedModelPosition = new THREE.Vector3(-sourceCenter.x * scale, model.position.y, -sourceCenter.z * scale);
        animatedFrameVertexSets.length = 0;
        const poseVertexSets: THREE.Vector3[][] = [];
        if (previewAction && previewMixer && playableClip) {
          previewAction.play();
          const sampleCount = 32;
          for (let index = 0; index <= sampleCount; index += 1) {
            previewMixer.setTime((playableClip.duration * index) / sampleCount);
            model.updateMatrixWorld(true);
            const poseBounds = new THREE.Box3();
            const poseVertices: THREE.Vector3[] = [];
            collectVisibleMeshBounds(poseBounds, poseVertices);
            animatedBounds.union(poseBounds);
            poseVertexSets.push(poseVertices);
          }
        } else {
          const poseVertices: THREE.Vector3[] = [];
          collectVisibleMeshBounds(animatedBounds, poseVertices);
          poseVertexSets.push(poseVertices);
        }
        const animatedSize = animatedBounds.getSize(new THREE.Vector3());
        const animatedCenter = animatedBounds.getCenter(new THREE.Vector3());
        // Keep the approved anchor and camera framing fixed while applying
        // the requested presentation-only scale increase.
        const framingAnimatedSize = animatedSize.clone().multiplyScalar(1 / scaleFactor);
        const framingAnimatedCenter = animatedCenter.clone().multiplyScalar(1 / scaleFactor);
        const framingAnimatedMinY = animatedBounds.min.y / scaleFactor;
        // Presentation centering stays on the stable outer anchor; horizontal
        // root-motion tracks are neutralized by restoring the animated
        // model's X/Z position after each mixer update.
        const presentationCenterX = framingAnimatedCenter.x;
        const presentationCenterZ = framingAnimatedCenter.z;
        // The anchor is the sole horizontal/depth presentation transform. The
        // camera must look at that normalized space, otherwise applying the
        // bounds center to both anchor and camera causes a visible side drift.
        const anchorVerticalOffset = framingAnimatedSize.y * 0.06;
        // Empirically verified deterministic visual-envelope correction from
        // the approved prototype presentation (shared by every pose).
        const presentationOffset = new THREE.Vector3(-0.002, 0.055, 0);
        mentorAnchor.position.set(
          -presentationCenterX + presentationOffset.x,
          anchorVerticalOffset + presentationOffset.y,
          -presentationCenterZ + presentationOffset.z,
        );
        const torsoTargetY = framingAnimatedMinY + framingAnimatedSize.y * 0.58;
        const visualStageLift = framingAnimatedSize.y * 0.05;
        cameraTarget.set(0, torsoTargetY + visualStageLift, 0);
        // Use the current camera only to identify each pose's projected
        // silhouette candidates. The actual fit below tests every pose
        // independently at every candidate distance.
        camera.position.set(0, cameraTarget.y, 2.32);
        camera.lookAt(cameraTarget);
        camera.updateProjectionMatrix();
        animatedFrameVertexSets.push(...poseVertexSets.map(selectProjectedEnvelopeVertices));
        animatedFrameBounds.copy(animatedBounds).translate(mentorAnchor.position);
        hasAnimatedFrameBounds = true;
        fitCameraToAnimatedEnvelope();
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
        mentorAnchor.add(model);

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          animationAction = mixer.clipAction(playableClip ?? gltf.animations[0]);
          animationAction.setLoop(THREE.LoopRepeat, Infinity);
          animationAction.paused = pausedRef.current;
          animationAction.play();
        }
        model.updateMatrixWorld(true);
        setStatus('ready');
        onReadyRef.current?.();
      },
      undefined,
      () => {
        if (!disposed) {
          setStatus('failed');
          onFailedRef.current?.();
        }
      },
    );

    const render = (time: number) => {
      if (disposed) return;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
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

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      mixer?.stopAllAction();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
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
