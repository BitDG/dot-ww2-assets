import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import definition from '../../nebelwerfer41-visual-prop/definition.mjs';
import { prepareGenerator } from '../../../generator-sdk/validation.mjs';
import { createAssetHandle } from '../../../src/plugins/asset.js';
import { writeSceneGLB } from '../../../src/plugins/scatter/io.js';
import { createHostedLaunchRuntime, loadAuthoredProjectile } from '../hosted-launch-runtime.mjs';
import { DEFAULTS, createScore } from '../n4-source/sequence-core.mjs';
import { readVisualAnchors } from '../binding.mjs';

const saved = { document: globalThis.document, createImageBitmap: globalThis.createImageBitmap, requestAnimationFrame: globalThis.requestAnimationFrame };
let textureCanvases = 0, frameRequests = 0;
globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); textureCanvases++; const canvas = createCanvas(1, 1); const get = canvas.getContext.bind(canvas); canvas.getContext = type => { assert.equal(type, '2d', 'Only the shared PGF texture canvas is allowed'); return get(type); }; return canvas; } };
globalThis.createImageBitmap = async blob => { const result = await loadImage(Buffer.from(await blob.arrayBuffer())); result.close = () => {}; return result; };
globalThis.requestAnimationFrame = () => { frameRequests++; throw new Error('A hosted runtime must not schedule frames'); };
after(() => { for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; } });

const asset = (await prepareGenerator(definition).generate({ seed: 'hosted-n41-tests', params: {} })).asset;
const cases = [], report = { actualThreeRevision: THREE.REVISION, actualN5Asset: true, actualPGFCombatFX: true, gpuShaders: 'not tested by Node', checks: [] };
after(async () => { report.pass = report.checks.length === 7; await writeFile(new URL('../evidence/node-runtime-report.json', import.meta.url), JSON.stringify(report, null, 2)); });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const exportBytes = () => writeSceneGLB([{ contentHash: 'n41', asset }], [{ id: 'static', assetContentHash: 'n41', transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }, tags: [] }], { preserveSemantics: true });
async function create(extra = {}) {
  const scene = new THREE.Scene(), handle = await createAssetHandle({ ...asset, schemaVersion: 'pgf.asset/1', roots: asset.rootNodeIds }, THREE), camera = new THREE.PerspectiveCamera();
  scene.add(handle.object); scene.background = new THREE.Color('#123456'); camera.position.set(8, 9, 10);
  let invalidations = 0;
  const runtime = createHostedLaunchRuntime({ scene, object: handle.object, asset, camera, invalidate: () => invalidations++, ...extra });
  const result = { scene, handle, runtime, camera, get invalidations() { return invalidations; } }; cases.push(result); return result;
}
after(() => { for (const item of cases) { item.runtime.dispose(); item.handle.dispose(); } });
function sprites(scene) { const result = []; scene.traverse(node => { if (node.isSprite && node.visible && node.material.opacity > 0) result.push([...node.position.toArray(), node.material.opacity]); }); return result; }
function borrowedFingerprint(object) {
  const result = [];
  object.traverse(node => {
    if (node.geometry) result.push(['geometry', node.geometry.uuid, ...Object.entries(node.geometry.attributes).map(([name, attr]) => [name, digest(new Uint8Array(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength))])]);
    for (const material of [node.material].flat().filter(Boolean)) result.push(['material', material.uuid, material.color?.getHexString(), material.roughness, material.metalness, material.transparent, material.opacity, ...Object.entries(material).filter(([, value]) => value?.isTexture).map(([name, value]) => [name, value.uuid, value.version])]);
  });
  return result;
}

test('actual N5 binding, deterministic replay, pause, host inactivity and completion', async () => {
  const { runtime, scene, handle, camera } = await create(); await runtime.ready;
  assert.equal(runtime.available, true); assert.equal(runtime.playing, false); assert.equal(scene.children.length, 2);
  const before = borrowedFingerprint(handle.object), staticBefore = digest(exportBytes()), cameraBefore = camera.position.toArray();
  let borrowedDisposals = 0; const borrowed = new Set(); handle.object.traverse(node => { if (node.geometry) borrowed.add(node.geometry); for (const material of [node.material].flat().filter(Boolean)) { borrowed.add(material); for (const value of Object.values(material)) if (value?.isTexture) borrowed.add(value); } });
  for (const resource of borrowed) resource.addEventListener('dispose', () => borrowedDisposals++);
  const samples = [], pools = [];
  for (let repeat = 0; repeat < 4; repeat++) {
    runtime.play(); runtime.update(2.4); const playing = runtime.diagnostics(); assert.equal(playing.sequence.tick, 288); assert.ok(playing.fx.live > 0);
    samples.push(sprites(scene)); assert.ok(samples.at(-1).length > 10);
    runtime.pause(); const paused = runtime.diagnostics(); runtime.update(2); assert.deepEqual(runtime.diagnostics().sequence, paused.sequence); assert.deepEqual(sprites(scene), samples.at(-1));
    runtime.resume(); runtime.setActive(false); assert.equal(runtime.playing, false); runtime.update(20); assert.equal(runtime.diagnostics().sequence.tick, 288);
    runtime.setActive(true); assert.equal(runtime.playing, true); runtime.update(DEFAULTS.duration - 2.4);
    const completed = runtime.diagnostics(); assert.equal(completed.sequence.state, 'complete'); assert.equal(completed.fx.launches, 6); assert.equal(completed.fx.live, 0); assert.equal(runtime.playing, false);
    pools.push(completed.fx.upstream.materialPool.allocated);
  }
  for (const sample of samples) assert.deepEqual(sample, samples[0]); assert.equal(pools.at(-1), pools[1]);
  runtime.play(); runtime.update(.5); runtime.stop(); assert.equal(runtime.diagnostics().sequence.state, 'idle'); assert.equal(runtime.diagnostics().fx.live, 0);
  runtime.seek(2.4); assert.equal(runtime.diagnostics().sequence.state, 'paused'); assert.deepEqual(sprites(scene), samples[0]);
  runtime.reset(); assert.equal(runtime.diagnostics().sequence.tick, 0);
  assert.equal(digest(exportBytes()), staticBefore); const glb = exportBytes(), view = new DataView(glb.buffer, glb.byteOffset); const json = JSON.parse(new TextDecoder().decode(glb.slice(20, 20 + view.getUint32(12, true))).trim()); assert.equal(json.animations, undefined); assert.ok(!json.nodes.some(node => /HostedLaunch|PreviewProjectile|CombatFX/.test(node.name ?? '')));
  assert.deepEqual(borrowedFingerprint(handle.object), before); assert.deepEqual(camera.position.toArray(), cameraBefore); assert.equal(scene.background.getHexString(), '123456');
  runtime.dispose(); runtime.dispose(); assert.equal(scene.children.length, 1); assert.equal(handle.object.parent, scene); assert.equal(borrowedDisposals, 0);
  const disposed = runtime.diagnostics(); assert.equal(disposed.resources.owned, disposed.resources.released); runtime.play(); runtime.update(1); runtime.seek(1); runtime.setActive(true); assert.equal(scene.children.length, 1);
  report.checks.push('N5 uploaded Group/Mesh anchors; four deterministic real-PGF replays; pause/resume/inactivity/stop/reset/seek/completion; static GLB bytes unchanged; host resources and scene/camera unchanged; idempotent disposal');
  report.replays = { spriteCount: samples[0].length, pooledAllocation: pools, released: disposed.resources };
});

test('disposed async initialization cannot attach its late result; source lease released', async () => {
  let resolve, releases = 0; const template = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const { runtime, scene } = await create({ loadProjectile: () => new Promise(value => { resolve = value; }) });
  const ready = runtime.ready; await Promise.resolve(); runtime.play(); runtime.dispose(); resolve({ root: template, dispose: () => releases++ });
  await assert.rejects(ready, { name: 'AbortError' }); assert.equal(scene.children.length, 1); assert.equal(releases, 1); assert.equal(runtime.diagnostics().disposed, true);
  report.checks.push('late async result after disposal cannot attach and releases its owned source lease');
});

test('initial stale validity cancels one attempt but old retained runtime can be played again', async () => {
  let resolve, calls = 0, valid = true; const template = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const { runtime, scene } = await create({ valid: () => valid, loadProjectile: () => { calls++; return calls === 1 ? new Promise(value => { resolve = value; }) : template; } });
  const initial = runtime.ready; await Promise.resolve(); valid = false; resolve(template); await assert.rejects(initial, { name: 'AbortError' });
  assert.equal(scene.children.length, 1); assert.equal(runtime.diagnostics().status, 'cancelled');
  runtime.play(); await runtime.ready; runtime.update(1); assert.equal(calls, 2); assert.equal(runtime.playing, true); assert.equal(runtime.diagnostics().sequence.tick, 120);
  runtime.update(1); assert.equal(runtime.diagnostics().sequence.tick, 240); runtime.dispose();
  report.checks.push('cancelled edit with retained asset: stale initial validity does not permanently disable playback');
});

test('reset cancels pending play; repeated play shares one loader; retry after error', async () => {
  let resolve, calls = 0; const template = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const { runtime, scene } = await create({ loadProjectile: () => { calls++; if (calls === 1) return new Promise(value => { resolve = value; }); if (calls === 2) throw new Error('Fixture resource failure'); return template; } });
  const initial = runtime.ready; await Promise.resolve(); runtime.play(); runtime.play(); assert.equal(calls, 1); runtime.reset(); resolve(template); await assert.rejects(initial, { name: 'AbortError' }); assert.equal(scene.children.length, 1);
  runtime.play(); await assert.rejects(runtime.ready, /Fixture resource failure/); assert.equal(runtime.diagnostics().status, 'error'); runtime.play(); await runtime.ready; runtime.update(1); assert.equal(calls, 3); assert.equal(runtime.playing, true);
  runtime.configure({ ...DEFAULTS, trail: 0, smoke: 0 }); runtime.play(); runtime.update(1); assert.equal(runtime.diagnostics().fx.trailPuffs, 0); assert.equal(runtime.diagnostics().fx.dustBursts, 0);
  runtime.dispose(); report.checks.push('pending play deduplication, reset cancellation, resource-failure retry, reconfiguration');
});

test('unavailable tube cluster is truthful and does not allocate or invent anchors', async () => {
  const scene = new THREE.Scene(), object = new THREE.Group(); scene.add(object); let calls = 0;
  const runtime = createHostedLaunchRuntime({ scene, object, loadProjectile() { calls++; } });
  assert.equal(await runtime.ready, false); assert.equal(runtime.available, false); assert.equal(runtime.play(), false); assert.match(runtime.diagnostics().error, /管束外壳/); assert.equal(calls, 0); assert.equal(scene.children.length, 1); runtime.dispose();
  assert.equal(runtime.capabilities.exportedAnimation, false); assert.equal(runtime.capabilities.exportedParticles, false); assert.equal(runtime.capabilities.performanceSimulation, false);
  report.checks.push('hidden/missing tube cluster disables art playback without synthetic anchors or assets');
});

test('actual authored projectile is loaded; runtime owns no display canvas or scheduler', async () => {
  const lease = await loadAuthoredProjectile(); let meshes = 0; lease.root.traverse(node => { if (node.isMesh) meshes++; }); assert.ok(meshes > 0); lease.dispose();
  const source = await readFile(new URL('../hosted-launch-runtime.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /new\s+(?:THREE\.)?(?:WebGLRenderer|Scene|PerspectiveCamera|OrbitControls)|requestAnimationFrame|createRenderLoop|\.render\(/);
  assert.equal(frameRequests, 0); report.textureCanvases = textureCanvases; report.frameRequests = frameRequests;
  report.checks.push('frozen authored projectile loaded; only shared-PGF offscreen 2D textures, no renderer, display canvas or animation scheduler');
});

test('bounds covers static geometry, frozen art paths and visible billboards in transformed host space', async () => {
  let reframes = 0; const { runtime, handle, scene } = await create({ reframe: () => reframes++ }); await runtime.ready;
  assert.equal(reframes, 1);
  const original = borrowedFingerprint(handle.object);
  handle.object.position.set(3, 4, -2); handle.object.rotation.y = .7; handle.object.scale.setScalar(1.4);
  const anchors = readVisualAnchors(handle.object), box = runtime.bounds(); assert.ok(box.isBox3);
  for (const cue of createScore(DEFAULTS, anchors).cues) for (const point of cue.curve) assert.ok(box.containsPoint(new THREE.Vector3(...point).applyMatrix4(handle.object.matrixWorld)));
  runtime.play(); runtime.update(2.4); const during = runtime.bounds(); scene.updateMatrixWorld(true);
  scene.traverseVisible(node => {
    if (!node.isSprite || node.material.opacity <= 0) return;
    const position = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld), scale = new THREE.Vector3().setFromMatrixScale(node.matrixWorld), radius = Math.hypot(scale.x, scale.y) / 2;
    assert.ok(during.containsPoint(position.clone().addScalar(radius))); assert.ok(during.containsPoint(position.clone().addScalar(-radius)));
  });
  assert.deepEqual(borrowedFingerprint(handle.object), original); runtime.play(); runtime.reset(); runtime.seek(1); assert.equal(reframes, 1); runtime.dispose();
  report.checks.push('world bounds cover static geometry, original N4 curve hull and camera-independent particle billboards; initial successful ready reframes once');
});
