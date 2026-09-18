import * as THREE from 'three';
import type {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Main-thread budget per reusable preparation chunk. */
export const ATTACH_CHUNK_BUDGET_MS = 12;
/** Pose samples across the embedded clip. */
export const ATTACH_POSE_SAMPLES = 16;
/** Dense mesh subsample stride used by the approved framing heuristic. */
export const ATTACH_VERTEX_STRIDE = 8;

/**
 * Mentor framing/scheduling boundary — OWNER DEVICE CORRECTION (handoff §1).
 *
 * WHY THIS MODULE EXISTS: the previous MentorStage performed its ENTIRE
 * demonstration attach (33 skinned-pose vertex samples + the camera
 * distance solve) synchronously inside one mount task. On real devices that
 * was one long main-thread task sitting exactly between the PREPARING
 * countdown completion (T1) and the first INTRO paint (T3) — the owner-
 * observed ~7s desktop / ~3-4s iPhone "freeze" (T1→T3 measured 5.3-5.5s
 * while T1→T2 was 0ms and T3→T4 <0.2s: the state transition was already
 * instant; the ATTACH blocked the first visible frame).
 *
 * WHAT THIS MODULE IS:
 *   - the PURE framing math extracted verbatim from MentorStage (collect
 *     bounds, project to screen space, select silhouette candidates,
 *     binary-search the camera distance, vertical shift) — same numbers,
 *     same framing, now unit-testable and re-runnable from `resize()`
 *     against the cached pose candidates without resampling;
 *   - cooperative scheduling helpers (`awaitFrame`, `yieldToMain`) so the
 *     stage can spread sampling across frames: the transition render
 *     paints FIRST, the heavy work continues in small chunks after.
 *
 * WHAT THIS MODULE IS NOT: no React, no DOM queries, no renderer, no
 * network, no orchestration — MentorStage remains the only lifecycle owner
 * (PREPARE ONCE → REUSE unchanged; exactly one GLB request/parse).
 *
 * PURE: computation over passed-in THREE objects only. The real camera is
 * touched only by `applyMentorCameraFit`; all distance probing runs on a
 * throwaway camera so no call site can be surprised by state mutation.
 */

/** Cooperative yield: resolves on the next animation frame (paint tick). */
export function awaitFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 16);
  });
}

/**
 * Cooperative main-thread yield between work chunks. Prefers the platform
 * `scheduler.yield()` (continuation priority) and degrades to an animation
 * frame. A timeout twin guards against a fully stalled frame clock (hidden
 * tabs throttle rAF to zero) so the attach can never hang: with the twin at
 * 50ms even a fully hidden page completes the attach in ≤ ~2s while a
 * visible page yields on frame boundaries (~16ms) as intended.
 */
export function yieldToMain(): Promise<void> {
  const scheduler =
    typeof globalThis !== 'undefined'
      ? (globalThis as {scheduler?: {yield?: () => Promise<void>}}).scheduler
      : undefined;
  if (scheduler?.yield) return scheduler.yield();
  return Promise.race([
    awaitFrame(),
    new Promise<void>((resolve) => setTimeout(resolve, 50)),
  ]);
}

/**
 * Collect the world-space bounds of visible mesh vertices (skinned-aware).
 * `vertexStride` subsamples the position buffer (stride 1 = every vertex);
 * the demonstration attach uses a small stride so the per-pose sampling
 * stays inside the frame-budget chunks without changing the solved fit
 * (the union bounds and silhouette candidates are stable under subsampling
 * of a dense mesh — the solve margins are 12–16px).
 */
export function collectVisibleMeshBounds(
  model: THREE.Object3D,
  target: THREE.Box3,
  collectVertices?: THREE.Vector3[],
  vertexStride = 1,
): THREE.Box3 {
  target.makeEmpty();
  const visualVertex = new THREE.Vector3();
  const worldVertex = new THREE.Vector3();
  const stride = Math.max(1, Math.floor(vertexStride));
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    if (!position) return;
    for (let index = 0; index < position.count; index += stride) {
      const skinnedMesh = object instanceof THREE.SkinnedMesh ? object : null;
      if (skinnedMesh) skinnedMesh.getVertexPosition(index, visualVertex);
      else visualVertex.fromBufferAttribute(position, index);
      worldVertex.copy(visualVertex);
      object.localToWorld(worldVertex);
      target.expandByPoint(worldVertex);
      collectVertices?.push(worldVertex.clone());
    }
  });
  return target;
}

export interface MentorAttachmentPreparation {
  normalizedModelPosition: THREE.Vector3;
  shouldNeutralizeRootDrift: boolean;
  playableClip: THREE.AnimationClip | null;
  animatedBounds: THREE.Box3;
  poseVertexSets: THREE.Vector3[][];
  framingAnimatedSize: THREE.Vector3;
  framingAnimatedMinY: number;
  framingAnimatedCenter: THREE.Vector3;
}

/**
 * Prepare the renderer-independent half of Mentor attachment exactly once.
 *
 * The parsed GLTF scene is the single owned scene that INTRO later attaches
 * to its one renderer. Normalization, animation-track cleanup, pose sampling,
 * and envelope collection do not depend on a canvas or viewport, so doing
 * them while the session resource is preparing removes that work from the
 * INTRO mount without creating a clone or a second parse lifecycle.
 */
export async function prepareMentorAttachment(gltf: GLTF): Promise<MentorAttachmentPreparation> {
  const model = gltf.scene;
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
  model.rotation.y = 0;
  model.updateMatrixWorld(true);

  let shouldNeutralizeRootDrift = false;
  const clip = gltf.animations[0];
  const playableClip = clip?.clone() ?? null;
  playableClip?.tracks.forEach((track) => {
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

  const previewMixer = playableClip ? new THREE.AnimationMixer(model) : null;
  const previewAction = previewMixer && playableClip ? previewMixer.clipAction(playableClip) : null;
  await yieldToMain();

  const animatedBounds = new THREE.Box3();
  const normalizedModelPosition = new THREE.Vector3(
    -sourceCenter.x * scale,
    model.position.y,
    -sourceCenter.z * scale,
  );
  const poseVertexSets: THREE.Vector3[][] = [];
  let chunkStart = performance.now();
  const yieldChunk = async () => {
    await yieldToMain();
    chunkStart = performance.now();
  };

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
      if (performance.now() - chunkStart > ATTACH_CHUNK_BUDGET_MS) {
        // eslint-disable-next-line no-await-in-loop
        await yieldChunk();
      }
    }
  } else {
    const poseVertices: THREE.Vector3[] = [];
    collectVisibleMeshBounds(model, animatedBounds, poseVertices, ATTACH_VERTEX_STRIDE);
    poseVertexSets.push(poseVertices);
  }
  if (performance.now() - chunkStart > ATTACH_CHUNK_BUDGET_MS) await yieldChunk();

  const animatedSize = animatedBounds.getSize(new THREE.Vector3());
  const animatedCenter = animatedBounds.getCenter(new THREE.Vector3());
  return {
    normalizedModelPosition,
    shouldNeutralizeRootDrift,
    playableClip,
    animatedBounds,
    poseVertexSets,
    framingAnimatedSize: animatedSize.clone().multiplyScalar(1 / scaleFactor),
    framingAnimatedMinY: animatedBounds.min.y / scaleFactor,
    framingAnimatedCenter: animatedCenter.clone().multiplyScalar(1 / scaleFactor),
  };
}

export interface ProjectedBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface ProjectionContext {
  camera: THREE.PerspectiveCamera;
  /** Presentation anchor offset applied after the model transform. */
  anchorPosition: THREE.Vector3;
  /** Cached per-pose silhouette candidates (empty = use the bounds corners). */
  vertexSets: THREE.Vector3[][];
  /** Fallback envelope (union of all sampled poses), anchor-space. */
  bounds: THREE.Box3;
}

/** Scratch objects — module-level so the hot solve allocates nothing. */
const probePoint = new THREE.Vector3();
const probeCorner = new THREE.Vector3();

/**
 * Project the framed demonstration to stage pixels from a given camera
 * distance. Mutates ONLY the supplied probe camera (the stage's real camera
 * is never passed here — `solveMentorCameraFit` clones it).
 */
export function projectMentorBoundsAtDistance(
  context: ProjectionContext,
  distance: number,
  targetY: number,
  width: number,
  height: number,
): ProjectedBounds {
  const {camera, anchorPosition, vertexSets, bounds} = context;
  camera.position.set(0, targetY, distance);
  camera.lookAt(0, targetY, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  const project = (world: THREE.Vector3) => {
    probePoint.copy(world).add(anchorPosition).project(camera);
    const screenX = (probePoint.x + 1) * 0.5 * width;
    const screenY = (1 - probePoint.y) * 0.5 * height;
    left = Math.min(left, screenX);
    right = Math.max(right, screenX);
    top = Math.min(top, screenY);
    bottom = Math.max(bottom, screenY);
  };
  if (vertexSets.length > 0) {
    vertexSets.forEach((vertices) => vertices.forEach(project));
  } else {
    for (let x = 0; x <= 1; x += 1) {
      for (let y = 0; y <= 1; y += 1) {
        for (let z = 0; z <= 1; z += 1) {
          probeCorner.set(
            x ? bounds.max.x : bounds.min.x,
            y ? bounds.max.y : bounds.min.y,
            z ? bounds.max.z : bounds.min.z,
          );
          project(probeCorner);
        }
      }
    }
  }
  return {left, right, top, bottom};
}

/**
 * Select the per-pose vertices that can define the projected silhouette
 * across candidate distances (verbatim heuristic from the approved
 * prototype/stage implementation — same candidate set, same framing).
 */
export function selectProjectedEnvelopeVertices(
  vertices: THREE.Vector3[],
  camera: THREE.PerspectiveCamera,
  anchorPosition: THREE.Vector3,
  candidateDistances: readonly number[] = [1.8, 2.32, 4.0],
): THREE.Vector3[] {
  if (vertices.length === 0) return [];
  const scratch = new THREE.Vector3();
  const candidateVertices: THREE.Vector3[] = [];
  candidateDistances.forEach((distance) => {
    camera.position.set(0, camera.position.y, distance);
    camera.lookAt(0, camera.position.y, 0);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    const projected = vertices.map((vertex) => {
      scratch.copy(vertex).add(anchorPosition).project(camera);
      return {vertex, screenX: scratch.x, screenY: scratch.y};
    });
    candidateVertices.push(
      projected.reduce((best, item) => (item.screenX < best.screenX ? item : best)).vertex,
      projected.reduce((best, item) => (item.screenX > best.screenX ? item : best)).vertex,
      projected.reduce((best, item) => (item.screenY < best.screenY ? item : best)).vertex,
      projected.reduce((best, item) => (item.screenY > best.screenY ? item : best)).vertex,
    );
  });
  candidateVertices.push(
    vertices.reduce((best, vertex) => (vertex.z < best.z ? vertex : best)),
    vertices.reduce((best, vertex) => (vertex.z > best.z ? vertex : best)),
  );
  return Array.from(new Set(candidateVertices)).map((vertex) => vertex.clone());
}

export interface MentorCameraFit {
  /** Solved camera distance (world units). */
  distance: number;
  /** Final vertical look-at/camera height (world units, shift applied). */
  targetY: number;
  cameraNear: number;
  cameraFar: number;
}

export interface SolveMentorCameraFitInput {
  /** Stage box in CSS pixels. */
  width: number;
  height: number;
  /** Aspect-corrected camera whose fov is authoritative (cloned for probing). */
  camera: THREE.PerspectiveCamera;
  anchorPosition: THREE.Vector3;
  bounds: THREE.Box3;
  vertexSets: THREE.Vector3[][];
  /** Camera target height BEFORE the portrait vertical shift. */
  baseTargetY: number;
  /** Portrait platforms request a small downward shift of the subject. */
  isMobilePortrait: boolean;
}

/**
 * Binary-search the largest subject that fits the stage safe area across
 * EVERY sampled pose, then apply the portrait vertical shift (verbatim
 * contract: 12px requested mobile shift, ≥12px top / ≥6.25px bottom
 * clearance incl. the Safari subpixel buffer). Pure — the stage applies the
 * returned fit to its real camera via `applyMentorCameraFit`.
 */
export function solveMentorCameraFit(input: SolveMentorCameraFitInput): MentorCameraFit {
  const {width, height, camera, anchorPosition, bounds, vertexSets, baseTargetY, isMobilePortrait} = input;
  const probe = camera.clone();

  const horizontalSafeArea = 12;
  const verticalSafeArea = 16;
  const fits = (b: ProjectedBounds) =>
    b.left >= horizontalSafeArea &&
    b.right <= width - horizontalSafeArea &&
    b.top >= verticalSafeArea &&
    b.bottom <= height - verticalSafeArea;

  const context: ProjectionContext = {camera: probe, anchorPosition, vertexSets, bounds};
  let nearest = Math.max(0.1, bounds.max.z + anchorPosition.z + 0.05);
  let farthest = 20.0;
  while (!fits(projectMentorBoundsAtDistance(context, farthest, baseTargetY, width, height)) && farthest < 160) {
    farthest *= 2;
  }
  for (let iteration = 0; iteration < 28; iteration += 1) {
    const distance = (nearest + farthest) * 0.5;
    if (fits(projectMentorBoundsAtDistance(context, distance, baseTargetY, width, height))) farthest = distance;
    else nearest = distance;
  }

  const requestedVerticalShiftPx = isMobilePortrait ? 12 : 0;
  const fitted = projectMentorBoundsAtDistance(context, farthest, baseTargetY, width, height);
  const maximumTopShiftPx = Math.max(0, fitted.top - 12);
  const maximumBottomShiftPx = Math.max(0, height - fitted.bottom - 6.25);
  const appliedVerticalShiftPx = Math.min(requestedVerticalShiftPx, maximumTopShiftPx, maximumBottomShiftPx);
  const worldUnitsPerPixel =
    (2 * farthest * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) / height;

  return {
    distance: farthest,
    targetY: baseTargetY + appliedVerticalShiftPx * worldUnitsPerPixel,
    cameraNear: Math.max(0.01, farthest * 0.01),
    cameraFar: Math.max(20, farthest * 4),
  };
}

/** Apply a solved fit to the stage's real camera (single mutation point). */
export function applyMentorCameraFit(camera: THREE.PerspectiveCamera, fit: MentorCameraFit): void {
  camera.position.set(0, fit.targetY, fit.distance);
  camera.lookAt(0, fit.targetY, 0);
  camera.near = fit.cameraNear;
  camera.far = fit.cameraFar;
  camera.updateProjectionMatrix();
}
