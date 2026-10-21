import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PresentationSequence, DEFAULTS, validateConfig, createScore } from './n4-source/sequence-core.mjs';
import { createPgfFxAdapter } from './n4-source/pgf-fx-adapter.mjs';
import { createTankShotEffects } from '../combat-fx/runtime/tank-shot-effects.mjs';
import { defaultVisualEffects } from '../combat-fx/runtime/visual-effects-config.mjs';
import { readVisualAnchors, readObjectBounds, syncOwnedRoot, createResourceOwner, cloneOwnedProjectile } from './binding.mjs';

export const HOSTED_LAUNCH_CAPABILITIES = Object.freeze({
  animationPreview: true, launchPresentation: true, hostTickOnly: true,
  staticGLB: true, exportedAnimation: false, exportedParticles: false,
  weaponOperation: false, performanceSimulation: false,
  scope: 'N4 authored art presentation on the host-owned static N5 asset',
});
export const PROJECTILE_URL = new URL('./assets/stage-comet.glb', import.meta.url);
const FORWARD = new THREE.Vector3(0, 0, 1);
const aborted = () => new DOMException('发射预览初始化已取消', 'AbortError');

/** Returns an owned lease; no launcher is loaded here. */
export async function loadAuthoredProjectile({ signal } = {}) {
  const owner = createResourceOwner();
  try {
    let bytes;
    if (PROJECTILE_URL.protocol === 'file:') {
      const packageName = 'node:fs/promises';
      const { readFile } = await import(/* @vite-ignore */ packageName);
      bytes = await readFile(PROJECTILE_URL, { signal });
    } else {
      const response = await fetch(PROJECTILE_URL, { signal });
      if (!response.ok) throw new Error('Authored projectile load failed: HTTP ' + response.status);
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    if (signal?.aborted) throw aborted();
    const loader = new GLTFLoader();
    loader.register(parser => ({
      name: 'N41_HOSTED_PROJECTILE_OWNER',
      loadMaterial: index => parser.loadMaterial(index).then(owner.capture),
      loadMesh: index => parser.loadMesh(index).then(owner.capture),
      afterRoot: result => result.scenes.forEach(owner.capture),
    }));
    const result = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    owner.capture(result.scene);
    if (signal?.aborted) throw aborted();
    return { root: result.scene, dispose: () => owner.dispose() };
  } catch (error) { owner.dispose(); throw error; }
}

/**
 * Synchronous PGF runtimeFactory result. The host owns scene, asset, object,
 * renderer, controls and all scheduling. Only the added transient root is ours.
 * loadProjectile is an internal test seam: Object3D means borrowed; a returned
 * {root, dispose} lease is released after its independent owned clone is made.
 */
export function createHostedLaunchRuntime({
  scene, object, asset, config = DEFAULTS, invalidate = () => {}, valid = () => true, reframe = () => {},
  onFrame = () => {}, loadProjectile = loadAuthoredProjectile,
} = {}) {
  if (!scene?.isObject3D || !object?.isObject3D) throw new TypeError('Host scene and asset object are required');
  let settings = validateConfig(config), disposed = false, active = true, epoch = 0, reframed = false;
  let status = 'idle', error = null, pending = null, attempt = null, loading = null, ready = Promise.resolve(false);
  let root = null, rockets = [], fx = null, sequence = null, resources = null, anchors = null, projectileRadius = 0;
  let lastResourceReport = { owned: 0, released: 0, closed: false };
  try { anchors = readVisualAnchors(object); } catch (failure) { status = 'unavailable'; error = failure.message; }

  function notify() { if (!disposed) invalidate(); }
  function applyFrame(state) {
    if (disposed) return;
    for (const value of state.rockets) {
      const rocket = rockets[value.index];
      rocket.visible = value.visible; rocket.position.fromArray(value.position);
      rocket.quaternion.setFromUnitVectors(FORWARD, new THREE.Vector3(...value.direction));
      rocket.traverse(node => { for (const material of [node.material].flat().filter(Boolean)) material.opacity = value.opacity; });
    }
    onFrame(state);
  }
  function makeSequence() {
    sequence = new PresentationSequence(settings, anchors, {
      reset: value => fx.reset(value), launch: value => fx.launch(value),
      trail: value => fx.trail(value), step: dt => fx.step(dt),
      finish: () => fx.finish(), frame: applyFrame,
    });
    sequence.setActive(active); applyFrame(sequence.snapshot());
  }
  function releaseOwned() {
    sequence?.dispose(); sequence = null;
    fx?.dispose(); fx = null;
    root?.removeFromParent(); root?.clear(); root = null; rockets = [];
    if (resources) { resources.dispose(); lastResourceReport = resources.diagnostics(); resources = null; }
  }
  function runCommand(command) {
    if (!sequence || !command || disposed) return;
    if (command.type === 'play') sequence.play();
    else if (command.type === 'resume') sequence.resume();
    else if (command.type === 'seek') {
      const wasPlaying = sequence.state === 'playing';
      sequence.setActive(true); sequence.play(); sequence.advance(Math.min(command.time, settings.duration));
      if (!wasPlaying) sequence.pause(); sequence.setActive(active);
    }
    else if (command.type === 'pause') sequence.pause();
    else sequence.reset();
    notify();
  }
  function initialize(checkInitialValidity) {
    if (disposed || !anchors) return Promise.resolve(false);
    if (sequence) return Promise.resolve(true);
    if (loading) return loading;
    const ticket = ++epoch, controller = new AbortController(); attempt = controller;
    status = 'loading'; error = null;
    const live = () => !disposed && ticket === epoch && !controller.signal.aborted;
    const work = (async () => {
      let lease, own, transient, adapter;
      try {
        // Defer even early failures until loading/ready have been assigned.
        await Promise.resolve();
        if (!live() || checkInitialValidity && !valid()) throw aborted();
        lease = await loadProjectile({ signal: controller.signal });
        if (!live() || checkInitialValidity && !valid()) throw aborted();
        own = createResourceOwner();
        const template = cloneOwnedProjectile(lease?.root ?? lease, own);
        const projectileBox = readObjectBounds(template);
        projectileRadius = Math.hypot(...['x', 'y', 'z'].map(axis => Math.max(Math.abs(projectileBox.min[axis]), Math.abs(projectileBox.max[axis]))));
        const nextRockets = Array.from({ length: 6 }, (_, index) => {
          const rocket = template.clone(true); rocket.visible = false; rocket.name = `N41_PreviewProjectile_${index + 1}`;
          rocket.traverse(node => {
            if (!node.isMesh) return;
            const copy = material => { const result = material.clone(); result.transparent = true; return result; };
            node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
            node.castShadow = false;
          });
          own.capture(rocket); return rocket;
        });
        transient = new THREE.Group(); transient.name = 'N41_HostedLaunchPreview';
        transient.userData.previewOnly = true; transient.matrixAutoUpdate = false;
        const effects = new THREE.Group(); effects.name = 'N41_HostedCombatFX';
        transient.add(effects, ...nextRockets);
        adapter = createPgfFxAdapter({ THREE, scene: effects, createTankShotEffects, defaultVisualEffects, config: settings });
        if (!live() || checkInitialValidity && !valid()) throw aborted();
        root = transient; resources = own; rockets = nextRockets; fx = adapter;
        syncOwnedRoot(root, object, scene); scene.add(root); makeSequence(); status = 'ready';
        const command = pending; pending = null; runCommand(command); notify();
        if (!reframed) { reframed = true; reframe(); }
        transient = own = adapter = null;
        return true;
      } catch (failure) {
        if (root && root === transient) releaseOwned();
        else { adapter?.dispose(); transient?.removeFromParent(); own?.dispose(); }
        if (live()) { status = failure.name === 'AbortError' ? 'cancelled' : 'error'; error = failure.name === 'AbortError' ? null : failure.message; notify(); }
        throw failure;
      } finally {
        if (!lease?.isObject3D) lease?.dispose?.();
        if (ticket === epoch) { loading = null; attempt = null; }
      }
    })();
    loading = work; ready = work;
    // Host does not have to await ready; diagnostics still expose failures.
    work.catch(() => {});
    return work;
  }
  function command(value) {
    if (disposed || !anchors) return false;
    if (sequence) runCommand(value);
    else { pending = value; initialize(false); }
    return true;
  }
  function reset() {
    if (disposed) return;
    pending = null;
    if (sequence) sequence.reset();
    else if (loading) { ++epoch; attempt?.abort(); attempt = null; loading = null; status = 'idle'; error = null; }
    notify();
  }
  const runtime = {
    capabilities: HOSTED_LAUNCH_CAPABILITIES,
    get ready() { return ready; }, get available() { return !!anchors; },
    get playing() { return !!(!disposed && active && sequence?.state === 'playing'); },
    get duration() { return settings.duration; },
    play() { return command({ type: 'play' }); },
    resume() { return command({ type: 'resume' }); },
    pause() { if (disposed) return; if (pending) pending = { type: 'pause' }; sequence?.pause(); notify(); },
    stop: reset, reset,
    seek(time) {
      if (!Number.isFinite(time) || time < 0) throw new RangeError('Finite nonnegative presentation time required');
      return command({ type: 'seek', time });
    },
    configure(next) {
      const checked = validateConfig(next); if (disposed) return;
      reset(); settings = checked;
      if (sequence) { sequence.dispose(); makeSequence(); }
      notify();
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Finite nonnegative host delta required');
      if (disposed || !sequence || !active) return;
      syncOwnedRoot(root, object, scene); sequence.advance(dt);
    },
    setActive(value) { if (disposed) return; active = !!value; sequence?.setActive(active); if (active) notify(); },
    bounds() {
      const box = readObjectBounds(object, { visibleOnly: true });
      if (disposed || !anchors) return box;
      // A Bézier curve stays inside its control-point convex hull. This is the
      // unchanged N4 authored art path, never an inferred real-world range.
      const path = new THREE.Box3();
      for (const cue of createScore(settings, anchors).cues) for (const point of cue.curve) path.expandByPoint(new THREE.Vector3(...point));
      path.expandByScalar(projectileRadius).applyMatrix4(object.matrixWorld); box.union(path);
      if (root) {
        syncOwnedRoot(root, object, scene); box.union(readObjectBounds(root, { visibleOnly: true }));
        root.traverseVisible(node => {
          if (!node.isSprite || node.material.opacity <= 0) return;
          // Sprite planes face the host camera in the shader. A world-space
          // sphere covers their corners for any host camera orientation.
          const position = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
          const scale = new THREE.Vector3().setFromMatrixScale(node.matrixWorld);
          const radius = Math.hypot(scale.x, scale.y) / 2;
          box.expandByPoint(position.clone().addScalar(radius)); box.expandByPoint(position.clone().addScalar(-radius));
        });
      }
      return box;
    },
    diagnostics() {
      return {
        kind: 'hosted-n41-launch', disposed, ready: !!sequence, active, available: !!anchors,
        playing: runtime.playing, status: disposed ? 'disposed' : status, error,
        sequence: sequence?.snapshot() ?? null, fx: fx?.diagnostics() ?? null,
        resources: resources?.diagnostics() ?? lastResourceReport,
        assetId: asset?.generator?.id ?? asset?.id ?? null,
        capabilities: HOSTED_LAUNCH_CAPABILITIES,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true; ++epoch; attempt?.abort(); attempt = null; loading = null; pending = null;
      releaseOwned(); status = 'disposed';
    },
  };
  if (anchors) initialize(true);
  return runtime;
}
