import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelSession } from '../session.mjs';
import { readWorkspaceRecipe } from '../recipes.mjs';

const A = 'reference-armored-car', B = 'tracked-mortar', C = 'diesel-locomotive';
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const recipe = (generator, params = {}) => ({ format: 'PGF.ComponentRecipe', version: 1, generator, seed: generator + '-seed', params });
function harness(options = {}) {
  const calls = [], editors = []; let live = 0, peak = 0;
  const session = createModelSession({
    initial: options.initial,
    load: options.load ?? (async model => { calls.push(['load', model.assetId]); return model; }),
    async mount(model, loaded, initial) {
      calls.push(['mount', model.assetId, initial]); live++; peak = Math.max(peak, live);
      const firstFrame = deferred();
      const record = { assetId: model.assetId, disposed: false, active: true, snapshots: 0,
        disposeCount: 0, currentRecipe: initial ?? recipe(model.assetId), firstFrame };
      const editor = {
        ready: firstFrame.promise,
        snapshot() { record.snapshots++; return options.snapshot?.(record) ?? structuredClone(record.currentRecipe); },
        setActive(value) { record.active = value; calls.push(['active', model.assetId, value]); },
        diagnostics() { return { disposed: record.disposed, active: record.active }; },
        dispose() {
          if (record.disposed) return; record.disposed = true; record.disposeCount++; live--;
          calls.push(['dispose', model.assetId]); firstFrame.reject(new DOMException('disposed', 'AbortError'));
        },
      };
      firstFrame.promise.catch(() => {}); record.editor = editor; editors.push(record);
      if (options.mountDelay) await options.mountDelay(model);
      if (!options.manualReady) firstFrame.resolve();
      return editor;
    },
    onRelease: record => calls.push(['release', record.assetId]),
  });
  return { session, calls, editors, live: () => live, peak: () => peak };
}

test('switching retains independent completed recipes and owns only one editor', async () => {
  const h = harness(); await h.session.select(A); await h.session.ready;
  h.editors[0].currentRecipe = recipe(A, { paint: '#abcdef' });
  await h.session.select(B); h.editors[1].currentRecipe = recipe(B, { elevation: 40 });
  await h.session.select(A);
  assert.deepEqual(h.editors[2].currentRecipe.params, { paint: '#abcdef' });
  const state = await h.session.snapshot(); assert.deepEqual(state.models[B].params, { elevation: 40 });
  assert.equal(h.peak(), 1); assert.equal(h.editors[0].disposeCount, 1);
  h.session.dispose(); await tick(); assert.equal(h.live(), 0);
});

test('rapid switching discards stale loads without mounting them', async () => {
  const delayed = deferred(); const h = harness({ load: async model => model.assetId === A ? delayed.promise : model });
  const old = h.session.select(A); await tick();
  const latest = h.session.select(B); delayed.resolve({});
  assert.equal(await old, false); assert.equal(await latest, true);
  assert.deepEqual(h.editors.map(record => record.assetId), [B]); h.session.dispose(); await tick();
});

test('async stale mounts are released before the next editor can allocate', async () => {
  const delayed = deferred(); const h = harness({ mountDelay: model => model.assetId === A ? delayed.promise : undefined });
  const old = h.session.select(A); await tick(); const latest = h.session.select(B);
  assert.equal(h.live(), 1); delayed.resolve();
  await old; await latest; assert.equal(h.peak(), 1);
  assert.equal(h.editors[0].disposeCount, 1); h.session.dispose(); await tick();
});

test('switch before first frame cancels old readiness and resolves ready on the latest asset', async () => {
  const h = harness({ manualReady: true }); const first = h.session.select(A); await tick();
  const second = h.session.select(B); await tick();
  assert.equal(await first, false); assert.equal(h.editors[0].disposed, true);
  h.editors[1].firstFrame.resolve(); assert.equal(await second, true); await h.session.ready;
  const state = await h.session.snapshot(); assert.equal(state.models[A], undefined);
  assert.equal(state.assetId, B); h.session.dispose(); await tick();
});

test('async retirement is awaited, and superseded requests do not reallocate', async () => {
  let hold = false; const delayed = deferred();
  const h = harness({ snapshot: record => hold && record.assetId === A ? delayed.promise : undefined });
  await h.session.select(A); hold = true;
  const next = h.session.select(B); const newest = h.session.select(C); await tick();
  assert.equal(h.editors.length, 1); assert.equal(h.editors[0].active, false);
  assert.equal(h.session.diagnostics().ownedWorkbenches, 1);
  delayed.resolve(recipe(A, { saved: 'late-snapshot' }));
  assert.equal(await next, false); assert.equal(await newest, true);
  assert.deepEqual(h.editors.map(record => record.assetId), [A, C]); assert.equal(h.peak(), 1);
  assert.equal((await h.session.snapshot()).models[A].params.saved, 'late-snapshot');
  h.session.dispose(); await tick();
});

test('source-only selection releases the renderer and never loads a backend', async () => {
  const h = harness(); await h.session.select(A); await h.session.select('k5-railway-prop');
  assert.equal(h.live(), 0); assert.equal(h.session.current(), null);
  assert.equal(h.session.diagnostics().phase, 'source-only'); assert.equal(h.editors.length, 1);
  const state = await h.session.snapshot(); assert.equal(state.assetId, 'k5-railway-prop');
  assert.ok(state.models[A]); assert.equal(state.models['k5-railway-prop'], undefined);
  h.session.dispose();
});

test('pause while loading is applied to the editor; resume delegates to the same child', async () => {
  const delayed = deferred(); const h = harness({ load: () => delayed.promise });
  const selected = h.session.select(A); h.session.setActive(false); delayed.resolve({});
  await selected; assert.equal(h.editors[0].active, false);
  h.session.setActive(true); assert.equal(h.editors[0].active, true);
  assert.equal(h.editors.length, 1); h.session.dispose(); await tick();
});

test('restore replaces saved slots only after retirement; native generator identity is mandatory', async () => {
  const h = harness(); await h.session.select(A);
  const imported = readWorkspaceRecipe(); imported.assetId = B; imported.models[B] = recipe(B, { imported: 17 });
  await h.session.restore(imported);
  assert.equal(h.editors[1].currentRecipe.params.imported, 17);
  assert.equal((await h.session.snapshot()).models[A], undefined);
  assert.throws(() => h.session.select(A, { recipe: recipe(B) }), /不匹配/);
  assert.equal(h.session.diagnostics().assetId, B); h.session.dispose(); await tick();
});

test('initial backend failure rejects ready; a later selection can recover', async () => {
  const h = harness({ load: async model => { if (model.assetId === A) throw Error('missing backend'); return model; } });
  await assert.rejects(h.session.select(A), /missing backend/);
  await assert.rejects(h.session.ready, /missing backend/);
  await h.session.select(B); assert.equal(h.session.diagnostics().phase, 'ready');
  h.session.dispose(); await tick();
});

test('early disposal rejects ready, cancels selection, and releases each resource once', async () => {
  const h = harness({ manualReady: true }); const selected = h.session.select(A); await tick();
  h.session.dispose(); h.session.dispose();
  await assert.rejects(h.session.ready, { name: 'AbortError' }); assert.equal(await selected, false); await tick();
  assert.equal(h.live(), 0); assert.equal(h.editors[0].disposeCount, 1);
  await assert.rejects(h.session.select(B), { name: 'AbortError' });
  assert.equal(h.session.diagnostics().ownedWorkbenches, 0);
});

test('bad backend snapshot fails closed and never enters another model slot', async () => {
  const h = harness({ snapshot: () => recipe(B) });
  await assert.rejects(h.session.select(A), /不匹配/); await assert.rejects(h.session.ready, /不匹配/);
  assert.equal(h.live(), 0); assert.deepEqual((await h.session.snapshot()).models, {}); h.session.dispose();
});
