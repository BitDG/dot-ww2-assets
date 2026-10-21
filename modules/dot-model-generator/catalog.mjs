/** Product-facing availability. A source/adapter declaration is not a runtime QA pass. */
export const GENERATOR_ID = 'dot-model-generator';
export const GENERATOR_VERSION = '0.9.0';
export const DEFAULT_ASSET_ID = 'reference-armored-car';

const implemented = (material) => ({
  preview: 'shared-viewport', parameters: 'native-schema', materials: material,
  animation: 'none', staticGLB: 'native-export', recipe: 'native-json',
});
const unavailable = () => ({
  preview: 'unavailable', parameters: 'unavailable', materials: 'unavailable',
  animation: 'unavailable', staticGLB: 'unavailable', recipe: 'unavailable',
});
const entry = (assetId, label, description, material, source) => ({
  assetId, label, description, status: 'adapter-available',
  verification: 'firefox-runtime-verified',
  capabilities: { ...implemented(material), animation: assetId==='gustav-visual-prop'?'movement-and-fire-preview':'movement-preview' },
  animationVerification: 'unified-firefox-verified',
  source: { ...source, definition: `modules/${assetId}/definition.mjs` },
  backend: { type: 'pgf-native-definition', moduleId: assetId, recipeGenerator: assetId },
});
const entries = [
  entry('reference-armored-car', '参考图四轮装甲车',
    'Blender 外观部件库；视觉姿态、漆面与细节参数沿用原模块。分解仅影响预览，GLB 保留装配姿态。',
    'pgf-portable-vehicle-finish', { kind: 'blender-authored-parametric-kit', visualAcceptance: 'review-required' }),
  entry('tracked-mortar', '履带重型臼炮',
    'Blender 外观重建与共享 Worker 装配；保存当前静态展示姿态，隐藏面为推测。',
    'pgf-portable-vehicle-finish', { kind: 'blender-authored-parametric-kit', visualAcceptance: 'unscored-review-required' }),
  entry('gustav-visual-prop', '古斯塔夫 · 外观游戏道具',
    '非功能性外观；未测量艺术比例。保留原部件、涂装、细节档与静态 GLB。',
    'pgf-portable-vehicle-finish', { kind: 'blender-authored-parametric-kit', visualAcceptance: 'review-required' }),
  entry('diesel-locomotive', '柴油机车 · 外观模型',
    '非功能性外观；未测量艺术比例。保留原车身、轮组、涂装与静态 GLB。',
    'pgf-portable-vehicle-finish', { kind: 'blender-authored-parametric-kit', visualAcceptance: 'review-required' }),
  entry('armored-4x4', '旧悍马 · 装甲越野车 v1',
    '保留旧模型和配方；原模块视觉复核未通过。与新版参考图四轮装甲车独立。',
    'native-reference-finish', { kind: 'legacy-procedural-threejs', visualAcceptance: 'not-passed' }),
  {
    assetId: 'k5-railway-prop', label: 'K5(E) 利奥波德 · 制作中',
    description: '暂停制作；本仓库仅恢复概念参考资料，未恢复 K2 模型源码。暂不开放生成、材质编辑或导出。',
    status: 'source-only', verification: 'runtime-unverified', capabilities: unavailable(),
    source: { kind: 'blender-authored-parametric-kit', definition: 'modules/k5-railway-prop/definition.mjs', stage: 'K2' },
    backend: { type: 'unavailable', moduleId: 'k5-railway-prop', reason: '暂停；等待模型恢复，当前仅参考资料归档' },
  },
  {
    assetId: 'nebelwerfer41-visual-prop', label: 'Nebelwerfer 41 · 外观美术资产',
    description: '固定 Blender 外观资产，PGF 涂装与 5 组部件可见性；静态 GLB。未提供在线几何重建，独立发射演出不包含在导出 GLB 中。',
    status: 'adapter-available', verification: 'firefox-runtime-verified',
    capabilities: { ...implemented('pgf-portable-vehicle-finish'), animation: 'hosted-launch-preview', procedural: false, onlineRemodeling: false, partVisibility: true },
    source: { kind: 'authored-asset-assembly', definition: 'modules/nebelwerfer41-visual-prop/definition.mjs', stage: 'N5',
      geometrySource: 'fixed-blender-authored-exterior-glb', hostedAnimationVerification: 'unified-firefox-verified',
      animation: { assetId: 'nebelwerfer41-launch-presentation', stage: 'N4', version: '0.4.2', status: 'standalone-runtime-verified', visualAcceptance: 'review-required', export: 'not-glb-animation' } },
    backend: { type: 'pgf-native-definition', moduleId: 'nebelwerfer41-visual-prop', recipeGenerator: 'nebelwerfer41-visual-prop' },
  },
  {
    assetId: 'qf25-visual-prop', label: 'QF25 MkII / MkI-L · 外观游戏道具',
    description: '固定三档 Blender 外观资产；无布罩、无袋，保留硬盒。PGF 共享涂装、艺术比例和部件开关；牵引滚动与局部烟云仅用于预览，静态 GLB 不含演出。',
    status: 'adapter-available', verification: 'firefox-runtime-verified',
    capabilities: { ...implemented('pgf-shared-metal-finish'), animation: 'tow-and-smoke-preview', procedural: false, onlineRemodeling: false, partVisibility: true, artProportions: true },
    animationVerification: 'unified-firefox-verified',
    source: { kind: 'authored-asset-assembly', definition: 'modules/qf25-visual-prop/definition.mjs', stage: 'Q2',
      geometrySource: 'fixed-blender-authored-exterior-glb', visualAcceptance: 'review-required',
      appearance: 'cloth-cover-and-bag-physically-removed-hard-box-retained',
      animation: { assetId: 'qf25-visual-runtime', status: 'unified-firefox-verified', export: 'not-glb-animation' } },
    backend: { type: 'pgf-native-definition', moduleId: 'qf25-visual-prop', recipeGenerator: 'qf25-visual-prop' },
  },
  {
    assetId: 'flakzwilling43-visual-prop', label: 'Flakzwilling 43 · 外观游戏道具',
    description: '固定三档 Blender 外观资产；三脚底架、无轮。共享 PGF 材质、艺术比例与部件开关。朝向展示和同时烟云属于游戏美术演出，不代表真实发射顺序、时序或性能。',
    status: 'adapter-available', verification: 'firefox-runtime-verified',
    capabilities: { ...implemented('pgf-shared-metal-finish'), animation: 'game-art-display-and-smoke', procedural: false, onlineRemodeling: false, partVisibility: true, artProportions: true, selfPropelled: false },
    animationVerification: 'unified-firefox-verified',
    source: { kind: 'authored-asset-assembly', definition: 'modules/flakzwilling43-visual-prop/definition.mjs', stage: 'F2',
      geometrySource: 'fixed-blender-authored-exterior-glb', visualAcceptance: 'review-required',
      animation: { assetId: 'flakzwilling43-visual-runtime', status: 'unified-firefox-verified', export: 'not-glb-animation', historicalFiringFootage: 'not-confirmed' } },
    backend: { type: 'pgf-native-definition', moduleId: 'flakzwilling43-visual-prop', recipeGenerator: 'flakzwilling43-visual-prop' },
  },
  {
    assetId: 'bm13-us6-visual-prop', label: 'BM-13N / Studebaker US6 · 外观游戏资产',
    description: '固定三档 Blender 外观资产；1944 US6 艺术外观、水平空载后架。PGF 共享涂装、整体艺术比例与八组部件开关；三轴十轮保持静态，不含发射或行驶动画。部分细节与隐藏面为推测。',
    status: 'adapter-available', verification: 'firefox-runtime-verified',
    capabilities: { ...implemented('pgf-shared-metal-finish'), animation: 'none', procedural: false, onlineRemodeling: false, partVisibility: true, artProportions: true },
    animationVerification: 'not-provided-static-only',
    source: { kind: 'authored-asset-assembly', definition: 'modules/bm13-us6-visual-prop/definition.mjs', stage: 'B6',
      geometrySource: 'fixed-blender-authored-exterior-glb', visualAcceptance: 'review-required',
      appearance: '1944-us6-exterior-interpretation-empty-fixed-horizontal-rack',
      historicalFidelity: 'grille-rear-fenders-and-hidden-surfaces-unverified',
      animation: { status: 'not-provided', export: 'static-glb-only' } },
    backend: { type: 'pgf-native-definition', moduleId: 'bm13-us6-visual-prop', recipeGenerator: 'bm13-us6-visual-prop' },
  },
  {
    assetId: 'qf17-visual-prop', label: 'QF17 Mk I / Mk I 轮式炮架 · 外观游戏资产',
    description: '固定三档 Blender 外观资产；正常单轴双轮、展开双尾架与水平炮管。PGF 共享涂装、整体艺术比例和八组部件开关；仅静态外观，不含牵引、发射或烟云动画。非测量美术重建，隐藏面与小件含推测。',
    status: 'adapter-available', verification: 'firefox-runtime-verified',
    capabilities: { ...implemented('pgf-shared-metal-finish'), animation: 'none', procedural: false, onlineRemodeling: false, partVisibility: true, artProportions: true, selfPropelled: false },
    animationVerification: 'not-provided-static-only',
    source: { kind: 'authored-asset-assembly', definition: 'modules/qf17-visual-prop/definition.mjs', stage: 'Q6',
      geometrySource: 'fixed-blender-authored-exterior-glb', visualAcceptance: 'review-required',
      sources: 'modules/qf17-visual-prop/sources.mjs', provenance: 'modules/qf17-visual-prop/adapter-provenance.json',
      appearance: 'mk-i-gun-on-mk-i-wheeled-carriage-horizontal-deployed-split-trails',
      historicalFidelity: 'unmeasured-simplified-exterior-hidden-surfaces-and-small-fittings-inferred',
      animation: { status: 'not-provided', export: 'static-glb-only' } },
    backend: { type: 'pgf-native-definition', moduleId: 'qf17-visual-prop', recipeGenerator: 'qf17-visual-prop' },
  },
  {
    assetId: 'land-mattress-visual-prop', label: 'Land Mattress No.8 Mk I / 1945 · 外观游戏资产',
    description: '固定三档 Blender 外观资产；1945 年 No.8 Mk I 艺术外观、五排六列共三十个浅封闭管口、单轴双轮与空载展示姿态。PGF 共享涂装、整体艺术比例和八组部件开关；仅静态外观，不含发射或牵引动画。支脚、翼板及隐藏面含美术推测。',
    status: 'adapter-available', verification: 'firefox-runtime-verified',
    capabilities: { ...implemented('pgf-shared-metal-finish'), animation: 'none', procedural: false, onlineRemodeling: false, partVisibility: true, artProportions: true, selfPropelled: false },
    animationVerification: 'not-provided-static-only',
    source: { kind: 'authored-asset-assembly', definition: 'modules/land-mattress-visual-prop/definition.mjs', stage: 'L3',
      geometrySource: 'fixed-blender-authored-exterior-glb', visualAcceptance: 'review-required',
      sources: 'modules/land-mattress-visual-prop/sources.mjs', provenance: 'modules/land-mattress-visual-prop/README.zh-CN.md',
      appearance: '1945-no8-mk-i-empty-five-by-six-sealed-mouths-single-axle-two-wheels',
      historicalFidelity: 'unmeasured-exterior-supports-fenders-top-and-hidden-surfaces-interpreted',
      animation: { status: 'not-provided', export: 'static-glb-only' } },
    backend: { type: 'pgf-native-definition', moduleId: 'land-mattress-visual-prop', recipeGenerator: 'land-mattress-visual-prop' },
  },
];
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}
export const MODEL_CATALOG = freeze(entries);
export function getModel(assetId) {
  const model = MODEL_CATALOG.find(item => item.assetId === assetId);
  if (!model) throw Error(`未知 dot 模型：${String(assetId)}`);
  return model;
}
export function canMount(model) {
  return model.status === 'adapter-available' && model.backend.type === 'pgf-native-definition';
}
export function requireRunnableModel(assetId) {
  const model = getModel(assetId);
  if (!canMount(model)) throw Error(`${model.label}：${model.backend.reason}`);
  return model;
}

/** Source availability and actual QA status are deliberately separate. */
export function capabilitySummary(model) {
  if (!canMount(model)) return '制作中 · 参数 / 材质 / 导出尚未开放';
  const scope=model.source.kind==='authored-asset-assembly'?'固定外观部件与 PGF 材质':'原模型参数与材质';
  const verified=model.verification==='firefox-runtime-verified';
  return scope+' · 静态 GLB · '+(verified?'原 PGF Firefox 已验收；新展厅未验收':'待 Firefox 运行验收');
}
