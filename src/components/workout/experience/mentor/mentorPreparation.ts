import * as THREE from 'three';
import type {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MENTOR_URL} from './contract';
import {
  prepareMentorAttachment,
  type MentorAttachmentPreparation,
} from './mentorFraming';

/**
 * Mentor preparation boundary — PREPARE ONCE → REUSE.
 *
 * The approved Mentor GLB is a 16MB asset whose fetch + parse/decode
 * dominates the cold INTRO experience (~14s measured to visible readiness).
 * PREPARING is the intended preparation window (spec: PREPARING owns
 * readiness; INTRO must not begin paying the demonstration cold start).
 *
 * This module prepares the asset ONE time and hands the parsed GLTF to the
 * consuming INTRO stage. It is a promise-memoized loader boundary, NOT a
 * second Mentor system:
 *
 *   - prepareMentorAsset() starts (or joins) the single fetch/parse for the
 *     canonical MENTOR_URL. In-flight calls coalesce; settled results are
 *     reused without refetch or reparse. The shared shell calls this while
 *     PREPARING counts down (fire-and-forget — never blocks the UI).
 *   - acquireMentorPreparation() (MentorStage) starts/joins the SAME
 *     preparation and takes single-consumer ownership of the parsed GLTF.
 *     The stage only ATTACHES gltf.scene to its own renderer — Three.js
 *     uploads textures/geometries to that renderer's GL context at attach;
 *     no second network or parse lifecycle exists.
 *   - Ownership is exclusive: after acquire, the stage's own unmount
 *     cleanup disposes the shared resources. disposeMentorPreparation()
 *     (session teardown) disposes prepared resources ONLY when no stage
 *     ever acquired them, then drops the reference either way.
 *
 * PURE-ish boundary: no React, no timers, no UI. Failure is honest — a
 * failed preparation settles rejected; the stage renders its existing
 * degraded state. No retry loop is introduced.
 */

let preparation: Promise<GLTF> | null = null;
let preparationConsumed = false;
const attachmentPreparations = new WeakMap<GLTF, MentorAttachmentPreparation>();

function markPreparationPerformance(name: string): void {
  if (typeof performance === 'undefined') return;
  if (performance.getEntriesByName(name).length === 0) performance.mark(name);
}

function startPreparation(): Promise<GLTF> {
  markPreparationPerformance('MENTOR_PREPARATION_STARTED');
  return new Promise<GLTF>((resolve, reject) => {
    try {
      new GLTFLoader().load(
        MENTOR_URL,
        (gltf) => {
          void prepareMentorAttachment(gltf).then(
            (prepared) => {
              attachmentPreparations.set(gltf, prepared);
              markPreparationPerformance('MENTOR_PREPARATION_RESOLVED');
              resolve(gltf);
            },
            reject,
          );
        },
        undefined,
        (error) => reject(error instanceof Error ? error : new Error(String(error))),
      );
    } catch (error) {
      // Environment-level synchronous failure (e.g. no fetch in a test
      // runtime) is an honest rejection — never an uncaught crash.
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** Fire-and-forget start/join of the single preparation (PREPARING window). */
export function prepareMentorAsset(): Promise<GLTF> {
  if (!preparation) {
    preparation = startPreparation();
    preparationConsumed = false;
  }
  return preparation;
}

/**
 * Start/join the single preparation AND take single-consumer ownership of
 * the parsed GLTF (the INTRO stage). Exactly one consumer may own the
 * prepared resource; ownership transfers the dispose duty to the stage.
 */
export function acquireMentorPreparation(): Promise<GLTF> {
  const promise = prepareMentorAsset();
  preparationConsumed = true;
  return promise;
}

/** Read the renderer-independent work prepared with the shared GLTF. */
export function getMentorAttachmentPreparation(gltf: GLTF): MentorAttachmentPreparation {
  const prepared = attachmentPreparations.get(gltf);
  if (!prepared) throw new Error('Mentor attachment preparation is unavailable');
  return prepared;
}

/** Release prepared-but-NEVER-acquired resources (session teardown). */
export function disposeMentorPreparation(): void {
  markPreparationPerformance('MENTOR_PREPARATION_DISPOSED');
  if (preparation && !preparationConsumed) {
    void preparation.then(disposeMentorResources).catch(() => undefined);
  }
  preparation = null;
  preparationConsumed = false;
}

/** Dispose the shared GPU-side resources of a parsed Mentor GLTF (once). */
export function disposeMentorResources(gltf: GLTF): void {
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      for (const value of Object.values(material)) {
        if (value && typeof value === 'object' && 'isTexture' in value) {
          (value as THREE.Texture).dispose();
        }
      }
      material.dispose();
    });
  });
}

/** TEST HOOK: resets module state between tests (never used in production). */
export function __resetMentorPreparationForTests(): void {
  preparation = null;
  preparationConsumed = false;
}
