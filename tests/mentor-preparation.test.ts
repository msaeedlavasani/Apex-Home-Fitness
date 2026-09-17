import assert from 'node:assert/strict';
import {test, beforeEach, afterEach} from 'node:test';
import * as THREE from 'three';
import {
  acquireMentorPreparation,
  disposeMentorPreparation,
  disposeMentorResources,
  prepareMentorAsset,
  __resetMentorPreparationForTests,
} from '../src/components/workout/experience/mentor/mentorPreparation';
import {MENTOR_URL} from '../src/components/workout/experience/mentor/contract';

/**
 * Mentor preparation lifecycle (PREPARE ONCE → REUSE) — safety contract.
 *
 * The REAL GLTFLoader/parse path runs here: a minimal valid GLB is
 * synthesized in-memory and served through a mocked fetch. Node cannot
 * construct a Request from a root-relative URL, so a Request stub rewrites
 * the canonical asset URL to an absolute test origin (capturing what was
 * requested). The production GLB is never downloaded.
 */

// ---- Minimal valid GLB (glTF 2.0 container with an empty JSON scene) ----
function buildGlb(): ArrayBuffer {
  const json = JSON.stringify({
    asset: {version: '2.0', generator: 'unit-test'},
    scenes: [{nodes: []}],
    scene: 0,
    nodes: [],
  });
  const jsonBytes = new TextEncoder().encode(json);
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonLength = jsonBytes.length + jsonPad;
  const headerLength = 12;
  const chunkHeaderLength = 8;
  const totalLength = headerLength + chunkHeaderLength + jsonLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); // 'glTF'
  view.setUint32(4, 2, true); // version
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true); // 'JSON'
  const jsonChunk = new Uint8Array(buffer, 20, jsonLength);
  jsonChunk.set(jsonBytes);
  jsonChunk.fill(0x20, jsonBytes.length); // JSON chunk padding must be spaces
  return buffer;
}

const GLB_BYTES = buildGlb();

const RealRequest = globalThis.Request;
const originalFetch = globalThis.fetch;

// Node lacks the DOM ProgressEvent used by three's FileLoader progress path.
class ProgressEventStub {
  type: string;
  loaded: number;
  total: number;
  lengthComputable: boolean;
  constructor(type: string, init?: {loaded?: number; total?: number}) {
    this.type = type;
    this.loaded = init?.loaded ?? 0;
    this.total = init?.total ?? 0;
    this.lengthComputable = this.total > 0;
  }
}

let fetchCalls = 0;
let requestCalls = 0;
let requestedUrl = '';
let fetchMode: 'ok' | 'notfound' | 'absent' = 'ok';

beforeEach(() => {
  __resetMentorPreparationForTests();
  fetchCalls = 0;
  requestCalls = 0;
  requestedUrl = '';
  fetchMode = 'ok';
  (globalThis as {ProgressEvent?: unknown}).ProgressEvent = ProgressEventStub;
  // Capture + absolutize the loader's URL resolution (Node has no base URI).
  globalThis.Request = class extends RealRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      requestCalls += 1;
      requestedUrl = url;
      super(url.startsWith('/') ? `https://mentor.test${url}` : url, init);
    }
  } as typeof Request;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    if (fetchMode === 'notfound') {
      return new Response('not found', {status: 404});
    }
    return new Response(GLB_BYTES.slice(0), {
      status: 200,
      headers: {'content-type': 'model/gltf-binary'},
    });
  }) as typeof fetch;
});

afterEach(() => {
  disposeMentorPreparation();
  globalThis.Request = RealRequest;
  globalThis.fetch = originalFetch;
  delete (globalThis as {ProgressEvent?: unknown}).ProgressEvent;
  __resetMentorPreparationForTests();
});

function spyTexture(material: THREE.MeshStandardMaterial): {texture: THREE.Texture; disposed: () => boolean} {
  const texture = new THREE.Texture();
  let disposed = false;
  const original = texture.dispose.bind(texture);
  texture.dispose = () => {
    disposed = true;
    original();
  };
  material.map = texture;
  return {texture, disposed: () => disposed};
}

test('PREPARE ONCE: prepare + acquire coalesce into exactly ONE fetch/parse of the canonical asset', async () => {
  const prepared = prepareMentorAsset();
  const acquired = acquireMentorPreparation();
  assert.equal(prepared, acquired, 'in-flight preparation is joined, not duplicated');
  const gltf = await acquired;
  assert.ok(gltf.scene instanceof THREE.Group, 'parsed GLTF carries the consumable scene');
  assert.equal(requestCalls, 1, 'exactly one URL resolution');
  assert.equal(requestedUrl, MENTOR_URL, 'the SAME canonical Squat Mentor asset is prepared');
  assert.equal(fetchCalls, 1, 'exactly one GLB network request');
});

test('settled preparation is reused without refetch or reparse', async () => {
  const first = await acquireMentorPreparation();
  const second = await acquireMentorPreparation();
  assert.equal(first, second, 'same parsed GLTF instance reused');
  assert.equal(requestCalls, 1);
  assert.equal(fetchCalls, 1, 'no second request after settle');
});

test('stage-owned resources survive session teardown; explicit resource dispose releases them', async () => {
  const gltf = await acquireMentorPreparation();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({color: 0xff0000}),
  );
  const {texture, disposed} = spyTexture(mesh.material as THREE.MeshStandardMaterial);
  const geometry = mesh.geometry;
  gltf.scene.add(mesh);

  // Session teardown after consumption: ownership already transferred.
  disposeMentorPreparation();
  await Promise.resolve();
  assert.equal(disposed(), false, 'teardown does NOT dispose stage-owned textures');
  assert.ok(geometry.attributes.position, 'teardown does NOT dispose stage-owned geometry');

  // The stage's own unmount path disposes exactly once:
  disposeMentorResources(gltf);
  assert.equal(disposed(), true, 'explicit resource dispose releases textures');
});

test('prepared-but-NEVER-acquired resources are released by session teardown', async () => {
  const gltf = await prepareMentorAsset();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({color: 0x00ff00}),
  );
  const {texture, disposed} = spyTexture(mesh.material as THREE.MeshStandardMaterial);
  gltf.scene.add(mesh);
  await gltf; // settled

  disposeMentorPreparation();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(disposed(), true, 'teardown releases never-acquired prepared resources');
  assert.equal(fetchCalls, 1, 'teardown does not trigger extra requests');

  // A NEW session prepares from scratch (the boundary was reset).
  const fresh = await acquireMentorPreparation();
  assert.notEqual(fresh, gltf, 'new preparation after teardown — no stale reuse');
  assert.equal(requestCalls, 2, 'fresh session resolves the URL again');
});

test('honest failure: no retry, no second request, rejection is memoized', async () => {
  fetchMode = 'notfound';
  const first = acquireMentorPreparation();
  await assert.rejects(first);
  const second = acquireMentorPreparation();
  assert.equal(first, second, 'the failed preparation is joined, not retried');
  await assert.rejects(second);
  assert.equal(requestCalls, 1, 'no second URL resolution after failure');
  assert.equal(fetchCalls, 1, 'no second fetch after failure');
});

test('fetch-less runtime fails honestly instead of crashing the caller', async () => {
  const withoutFetch = globalThis.fetch;
  delete (globalThis as {fetch?: typeof fetch}).fetch;
  try {
    await assert.rejects(acquireMentorPreparation());
  } finally {
    globalThis.fetch = withoutFetch;
  }
});
