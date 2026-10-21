import { DEFAULT_ASSET_ID, GENERATOR_ID, getModel, canMount } from './catalog.mjs';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function copyJSON(value) {
  const text = JSON.stringify(value, (_key, item) => {
    if (typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint' ||
        typeof item === 'number' && !Number.isFinite(item)) throw Error('配方必须是有限 JSON 数据');
    return item;
  });
  if (text === undefined || text.length > 2_000_000) throw Error('配方为空或超过 2 MB');
  return JSON.parse(text);
}
export function readNativeRecipe(assetId, value) {
  const model = getModel(assetId);
  if (!canMount(model) || !isObject(value) || value.format !== 'PGF.ComponentRecipe' ||
      value.version !== 1 || value.generator !== model.backend.recipeGenerator ||
      typeof value.seed !== 'string' || !value.seed.length || value.seed.length > 128 ||
      !isObject(value.params)) throw Error(`配方与模型 ${assetId} 不匹配`);
  // Child schema validation remains in the child's shared Worker; never rename its fields.
  return copyJSON(value);
}
export function readWorkspaceRecipe(value) {
  if (value == null) return { format: 'PGF.DotModelRecipe', version: 1, generator: GENERATOR_ID,
    assetId: DEFAULT_ASSET_ID, models: {} };
  if (!isObject(value) || value.format !== 'PGF.DotModelRecipe' || value.version !== 1 ||
      value.generator !== GENERATOR_ID || typeof value.assetId !== 'string' || !isObject(value.models))
    throw Error('不是有效的 dot 模型工作区配方');
  getModel(value.assetId);
  const models = {};
  for (const [assetId, recipe] of Object.entries(value.models)) models[assetId] = readNativeRecipe(assetId, recipe);
  return copyJSON({ format: value.format, version: 1, generator: GENERATOR_ID, assetId: value.assetId, models });
}
