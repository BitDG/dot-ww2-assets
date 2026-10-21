import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MODEL_CATALOG, DEFAULT_ASSET_ID, getModel, canMount, requireRunnableModel, capabilitySummary } from '../catalog.mjs';
import { readNativeRecipe, readWorkspaceRecipe } from '../recipes.mjs';

const native = (generator = DEFAULT_ASSET_ID) => ({ format: 'PGF.ComponentRecipe', version: 1,
  generator, seed: 'saved-seed', params: { untouched: 3 } });

test('stable catalog contains eleven adapters with separate runtime verification and one unavailable source', () => {
  assert.equal(MODEL_CATALOG.length, 12);
  assert.equal(new Set(MODEL_CATALOG.map(model => model.assetId)).size, 12);
  assert.equal(MODEL_CATALOG.filter(canMount).length, 11);
  for (const model of MODEL_CATALOG) {
    assert.ok(model.source && model.backend && model.status && model.capabilities);
    assert.notEqual(model.verification, 'passed');
    assert.ok(Object.isFrozen(model.capabilities));
  }
  for (const id of ['k5-railway-prop']) {
    const model = getModel(id);
    assert.equal(model.status, 'source-only');
    assert.ok(Object.values(model.capabilities).every(value => value === 'unavailable'));
    assert.throws(() => requireRunnableModel(id), /等待/);
  }
  assert.equal(getModel('armored-4x4').source.visualAcceptance, 'not-passed');
  assert.equal(getModel('nebelwerfer41-visual-prop').source.animation.export, 'not-glb-animation');
});

test('native recipes remain untouched and cannot cross model schemas', () => {
  const original = native(); const copy = readNativeRecipe(DEFAULT_ASSET_ID, original);
  assert.deepEqual(copy, original); copy.params.untouched = 9; assert.equal(original.params.untouched, 3);
  assert.throws(() => readNativeRecipe('tracked-mortar', original), /不匹配/);
  assert.throws(() => readNativeRecipe(DEFAULT_ASSET_ID, { ...original, params: [] }), /不匹配/);
  assert.throws(() => readNativeRecipe(DEFAULT_ASSET_ID, { ...original, params: { value: NaN } }), /有限/);
  assert.throws(() => readNativeRecipe('k5-railway-prop', native('k5-railway-prop')), /不匹配/);
});

test('workspace snapshots use isolated native slots and reject unknown/malformed data', () => {
  const state = readWorkspaceRecipe(); state.models[DEFAULT_ASSET_ID] = native();
  state.models['tracked-mortar'] = native('tracked-mortar');
  assert.deepEqual(readWorkspaceRecipe(state), state);
  assert.throws(() => readWorkspaceRecipe({ ...state, assetId: '__proto__' }), /未知/);
  assert.throws(() => readWorkspaceRecipe({ ...state, models: [] }), /有效/);
  assert.throws(() => readWorkspaceRecipe({ ...state, models: { 'tracked-mortar': native() } }), /不匹配/);
  assert.throws(() => readWorkspaceRecipe(native()), /有效/);
});

test('manifest is module-owned and has the standard automatic workbench entry', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dot-model-generator.generator.json', import.meta.url), 'utf8'));
  assert.equal(manifest.apiVersion, '1'); assert.equal(manifest.id, 'dot-model-generator');
  assert.deepEqual(manifest.workbench, { category: 'machines', entry: './workbench.js' });
  assert.equal(manifest.entry, './definition.mjs');
});


test('authored N41 adapter does not pretend to rebuild geometry or export animation', () => {
  const model=requireRunnableModel('nebelwerfer41-visual-prop');
  assert.equal(model.backend.moduleId,model.assetId);
  assert.equal(model.capabilities.procedural,false);
  assert.equal(model.capabilities.onlineRemodeling,false);
  assert.equal(model.capabilities.animation,'hosted-launch-preview');
  assert.equal(model.capabilities.partVisibility,true);
  assert.equal(model.source.kind,'authored-asset-assembly');
  assert.match(capabilitySummary({...model,verification:'node-only'}),/待 Firefox/);
  assert.doesNotMatch(capabilitySummary({...model,verification:'node-only'}),/已验收/);
  assert.match(capabilitySummary({...model,verification:'firefox-runtime-verified'}),/已验收/);
});


test('QF25 fixed art uses shared material and preview-only tow/smoke without removed-cloth controls',()=>{
 const model=requireRunnableModel('qf25-visual-prop');
 assert.equal(model.capabilities.procedural,false);assert.equal(model.capabilities.onlineRemodeling,false);
 assert.equal(model.capabilities.artProportions,true);assert.equal(model.capabilities.partVisibility,true);
 assert.equal(model.capabilities.animation,'tow-and-smoke-preview');assert.equal(model.source.animation.export,'not-glb-animation');
 assert.equal(model.capabilities.materials,'pgf-shared-metal-finish');
 assert.match(model.source.appearance,/physically-removed-hard-box-retained/);
});


test('Flakzwilling art preview does not claim driving or historical firing footage',()=>{const m=requireRunnableModel('flakzwilling43-visual-prop');assert.equal(m.capabilities.selfPropelled,false);assert.equal(m.capabilities.animation,'game-art-display-and-smoke');assert.equal(m.source.animation.historicalFiringFootage,'not-confirmed');assert.equal(m.capabilities.procedural,false);});


test('BM13 is a separate fixed static art entry with no inherited Firefox or animation claim',()=>{
 const m=requireRunnableModel('bm13-us6-visual-prop');
 assert.equal(m.capabilities.animation,'none');assert.equal(m.animationVerification,'not-provided-static-only');
 assert.equal(m.capabilities.materials,'pgf-shared-metal-finish');assert.equal(m.capabilities.procedural,false);
 assert.equal(m.capabilities.onlineRemodeling,false);assert.equal(m.capabilities.partVisibility,true);
 assert.equal(m.source.stage,'B6');assert.equal(m.source.animation.export,'static-glb-only');
 assert.equal(m.backend.moduleId,m.assetId);assert.notEqual(m.assetId,DEFAULT_ASSET_ID);
});
