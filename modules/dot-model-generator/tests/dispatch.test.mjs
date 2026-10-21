import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelDispatcher } from '../dispatch.mjs';

test('dispatch forwards original params/budget/signal and retains native asset identity and materials', async () => {
  const asset = { generator: { id: 'tracked-mortar', version: '2.0.0' }, materials: [{ id: 'original' }] };
  const context = { budget: { maxTriangles: 12 }, signal: new AbortController().signal };
  let captured;
  const generate = createModelDispatcher({ loadDefinition: async model => model,
    prepare: model => ({ generate: async (request, ctx) => {
      captured = { model, request, ctx }; return { asset, recipe: { seed: request.seed, params: request.params }, diagnostics: [{ native: true }] };
    } }),
  });
  const result = await generate({ seed: 'one', params: { assetId: 'tracked-mortar', parameters: { elevation: 35 } }, input: {} }, context);
  assert.equal(result.asset, asset); assert.equal(result.asset.materials[0].id, 'original');
  assert.equal(captured.ctx, context); assert.deepEqual(captured.request.params, { elevation: 35 });
  assert.equal(result.recipe.params.assetId, 'tracked-mortar');
  assert.deepEqual(result.recipe.params.parameters, { elevation: 35 });
  assert.equal(result.diagnostics[0].native, true); assert.equal(result.diagnostics[1].animationExport, false);
});

test('source-only/unknown models fail before loading or invoking a backend', async () => {
  let called = false;
  const generate = createModelDispatcher({ loadDefinition: () => { called = true; }, prepare: () => {} });
  await assert.rejects(generate({ seed: 'one', params: { assetId: 'k5-railway-prop' } }), /等待/);
  await assert.rejects(generate({ seed: 'one', params: { assetId: 'not-a-model' } }), /未知/);
  assert.equal(called, false);
});

test('child schema validation is delegated rather than coerced or bypassed', async () => {
  const generate = createModelDispatcher({ loadDefinition: async () => ({}),
    prepare: () => ({ generate: async () => { throw Error('params: /elevation must be number'); } }),
  });
  await assert.rejects(generate({ seed: 'one', params: { assetId: 'tracked-mortar', parameters: { elevation: ['35'] } } }), /must be number/);
});

test('cancellation after generation discards the completed stale result', async () => {
  const controller = new AbortController();
  const generate = createModelDispatcher({ loadDefinition: async () => ({}),
    prepare: () => ({ generate: async () => {
      controller.abort(); return { asset: { generator: { id: 'tracked-mortar' } }, recipe: { params: {} } };
    } }),
  });
  await assert.rejects(generate({ seed: 'one', params: { assetId: 'tracked-mortar' } }, { signal: controller.signal }), { name: 'AbortError' });
});

test('an incorrectly wired backend cannot masquerade as another catalog asset', async () => {
  const generate = createModelDispatcher({ loadDefinition: async () => ({}),
    prepare: () => ({ generate: async () => ({ asset: { generator: { id: 'wrong' } }, recipe: { params: {} } }) }),
  });
  await assert.rejects(generate({ seed: 'one', params: { assetId: 'tracked-mortar' } }), /身份不匹配/);
});
