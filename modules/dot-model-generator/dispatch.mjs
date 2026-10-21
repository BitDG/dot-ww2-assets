import { DEFAULT_ASSET_ID, GENERATOR_ID, GENERATOR_VERSION, requireRunnableModel } from './catalog.mjs';
import { copyJSON } from './recipes.mjs';

/** Injected loader/validator keep dispatch testable without loading Three.js or a renderer. */
export function createModelDispatcher({ loadDefinition, prepare }) {
  return async function generate(request, context = {}) {
    const check = () => { if (context.signal?.aborted) throw new DOMException('生成已取消', 'AbortError'); };
    check();
    const params = request.params ?? {}, assetId = params.assetId ?? DEFAULT_ASSET_ID;
    const model = requireRunnableModel(assetId);
    const adapter = await loadDefinition(model); check();
    const prepared = prepare(adapter);
    const nativeRequest = { seed: request.seed, params: params.parameters ?? {}, input: request.input ?? {} };
    const result = await prepared.generate(nativeRequest, context); check();
    if (result.asset?.generator?.id !== model.backend.moduleId) throw Error('子模型生成器身份不匹配');
    // Keep asset bytes/geometry/materials and original generator provenance untouched.
    return { ...result,
      recipe: { generator: GENERATOR_ID, version: GENERATOR_VERSION, seed: request.seed,
        params: { assetId, parameters: copyJSON(result.recipe.params ?? nativeRequest.params) },
        input: copyJSON(nativeRequest.input), sourceRecipe: copyJSON(result.recipe) },
      diagnostics: [...(result.diagnostics ?? []), { code: 'DOT_MODEL_DELEGATED', assetId,
        backend: model.backend.type, export: 'native-static-glb', animationExport: false }],
    };
  };
}
