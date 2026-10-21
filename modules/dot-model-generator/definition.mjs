import { defineGenerator } from '../../generator-sdk/definition.mjs';
import { prepareGenerator } from '../../generator-sdk/validation.mjs';
import { MODEL_CATALOG, DEFAULT_ASSET_ID, GENERATOR_ID, GENERATOR_VERSION, requireRunnableModel } from './catalog.mjs';
import { createModelDispatcher } from './dispatch.mjs';

const definitions = {
  'land-mattress-visual-prop': () => import('../land-mattress-visual-prop/definition.mjs'),
  'qf17-visual-prop': () => import('../qf17-visual-prop/definition.mjs'),
  'bm13-us6-visual-prop': () => import('../bm13-us6-visual-prop/definition.mjs'),
  'flakzwilling43-visual-prop': () => import('../flakzwilling43-visual-prop/definition.mjs'),
  'qf25-visual-prop': () => import('../qf25-visual-prop/definition.mjs'),
  'nebelwerfer41-visual-prop': () => import('../nebelwerfer41-visual-prop/definition.mjs'),
  'reference-armored-car': () => import('../reference-armored-car/definition.mjs'),
  'tracked-mortar': () => import('../tracked-mortar/definition.mjs'),
  'gustav-visual-prop': () => import('../gustav-visual-prop/definition.mjs'),
  'diesel-locomotive': () => import('../diesel-locomotive/definition.mjs'),
  'armored-4x4': () => import('../armored-4x4/definition.mjs'),
};
const loadDefinition = async model => (await definitions[model.assetId]()).default;
export async function describeModel(assetId) {
  const model = requireRunnableModel(assetId), adapter = await loadDefinition(model);
  return { ...model, parameterSchema: adapter.parameterSchema, defaults: adapter.defaults,
    presets: adapter.presets, ui: adapter.ui, enumLabels: adapter.enumLabels };
}
export default defineGenerator({
  id: GENERATOR_ID, version: GENERATOR_VERSION, label: 'dot 模型生成器',
  parameterSchema: { type: 'object', additionalProperties: false, properties: {
    assetId: { title: '模型 / 装备', type: 'string', enum: MODEL_CATALOG.map(model => model.assetId) },
    parameters: { title: '所选模型原始参数', type: 'object', additionalProperties: true },
  } },
  defaults: { assetId: DEFAULT_ASSET_ID, parameters: {} },
  enumLabels: { assetId: MODEL_CATALOG.map(model => model.label) },
  ui: { basic: ['assetId'], groups: [{ id: 'advanced', fields: ['parameters'] }] },
  presets: [{ id: DEFAULT_ASSET_ID, name: '参考图四轮装甲车', params: { assetId: DEFAULT_ASSET_ID, parameters: {} } }],
  capabilities: { catalog: MODEL_CATALOG, delegatesOriginalSchemas: true,
    nativeAssetProvenance: true, staticGLB: 'per-model', animationExport: false,
    unifiedRuntimeVerification: 'per-model-catalog' },
  generate: createModelDispatcher({ loadDefinition, prepare: prepareGenerator }),
});
