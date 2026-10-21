/** Executable contract for ZIP plugins. Independent of UI and Three.js. */
export const API_VERSION = '1.0.0';
export const THREE_VERSION = '0.180.0';
export const LIMITS = Object.freeze({ zip: 16 * 1024 ** 2, expanded: 32 * 1024 ** 2, files: 128, source: 2 * 1024 ** 2, triangles: 1000000, bytes: 128 * 1024 ** 2, texturePixels: 16777216, timeoutMs: 60000 });
const own = (o, k) => Object.hasOwn(o, k);
export function check(condition, message) { if (!condition) throw new Error(message); }
export function record(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null); }
export function shortText(v, max = 100) { return typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f]/.test(v); }
export function validateManifest(m) {
  check(record(m), 'plugin.json 必须是对象');
  check(typeof m.id === 'string' && /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/.test(m.id) && m.id.length <= 80, '插件 id 必须是带命名空间的小写标识，例如 studio.pillar');
  check(typeof m.version === 'string' && /^\d+\.\d+\.\d+$/.test(m.version), 'version 必须是精确三段版本');
  check(m.apiVersion === API_VERSION, `仅支持插件 API ${API_VERSION}`);
  check(['asset-v1', 'scatter-v1'].includes(m.profile), '仅支持 asset-v1 / scatter-v1 插件');
  check(m.threeVersion === THREE_VERSION, `Three.js 必须声明为 ${THREE_VERSION}`);
  check(['environment', 'architecture', 'items', 'machines'].includes(m.category), '未知插件分类');
  check(shortText(m.name, 50) && shortText(m.description, 500) && shortText(m.author) && shortText(m.license), '缺少名称、说明、作者或许可证');
  check(m.entry === 'dist/generator.js', 'entry 必须是 dist/generator.js');
  check(record(m.dependencies) && Object.keys(m.dependencies).length === 0, '首版不支持运行时依赖；算法依赖应打包进入单个 ESM');
  return m;
}
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
export function validateSchema(s) {
  check(record(s) && s.type === 'object' && s.additionalProperties === false && record(s.properties), 'params.schema.json 必须是封闭对象 Schema');
  const entries = Object.entries(s.properties);
  check(entries.length <= 64, '参数不能超过 64 项');
  check(Array.isArray(s.required) && s.required.length === entries.length && new Set(s.required).size === entries.length && s.required.every(k => own(s.properties, k)), 'required 必须列出所有参数');
  check(Object.keys(s).every(k => ['$schema', 'type', 'additionalProperties', 'properties', 'required', 'title'].includes(k)), '不支持的根 Schema 字段');
  for (const [key, p] of entries) {
    check(/^[a-zA-Z][a-zA-Z0-9_]{0,47}$/.test(key) && !forbidden.has(key), '非法参数名');
    check(record(p) && ['number', 'integer', 'boolean', 'string'].includes(p.type) && shortText(p.title, 80) && own(p, 'default'), `参数 ${key} 缺少类型、标题或默认值`);
    check(Object.keys(p).every(k => ['type', 'title', 'description', 'default', 'minimum', 'maximum', 'multipleOf', 'enum', 'maxLength', 'format'].includes(k)), `参数 ${key} 使用了不支持的 Schema 字段`);
    if (p.description !== undefined) check(shortText(p.description, 300), '参数说明过长');
    if (p.type === 'number' || p.type === 'integer') {
      check(Number.isFinite(p.minimum) && Number.isFinite(p.maximum) && p.minimum <= p.maximum, `${key} 必须声明有限范围`);
      if (p.multipleOf !== undefined) check(Number.isFinite(p.multipleOf) && p.multipleOf > 0, 'multipleOf 必须为正数');
    }
    if (p.enum !== undefined) check(Array.isArray(p.enum) && p.enum.length > 0 && p.enum.length <= 64 && p.enum.every(v => ['string', 'number', 'boolean'].includes(typeof v)), '非法枚举');
    if (p.type === 'string') check(Number.isInteger(p.maxLength) && p.maxLength >= 1 && p.maxLength <= 1024, `${key} 必须声明 maxLength (1..1024)`);
    if (p.format !== undefined) check(p.type === 'string' && p.format === 'color', '仅支持 string/color 格式');
    validateValue(key, p.default, p);
    if (p.enum) { check(new Set(p.enum).size === p.enum.length, '枚举不能重复'); for (const value of p.enum) validateValue(key, value, p); }
  }
  return s;
}
function validateValue(key, v, p) {
  check(p.type === 'integer' ? Number.isInteger(v) : typeof v === p.type, `${key} 类型错误`);
  if (typeof v === 'number') {
    check(Number.isFinite(v) && v >= p.minimum && v <= p.maximum, `${key} 超出范围`);
    if (p.multipleOf) check(Math.abs(v / p.multipleOf - Math.round(v / p.multipleOf)) < 1e-7, `${key} 不满足步长`);
  }
  if (typeof v === 'string') check(v.length <= p.maxLength && !/[\u0000-\u001f]/.test(v), `${key} 文本无效`);
  if (p.format === 'color') check(/^#[0-9a-fA-F]{6}$/.test(v), `${key} 必须是 #RRGGBB`);
  if (p.enum) check(p.enum.includes(v), `${key} 不在枚举中`);
}
export function defaults(schema) { return Object.fromEntries(Object.entries(schema.properties).map(([k, p]) => [k, p.default])); }
export function validateParams(params, schema) {
  check(record(params) && Object.keys(params).length === Object.keys(schema.properties).length, '参数数量错误');
  for (const [k, p] of Object.entries(schema.properties)) { check(own(params, k), `缺少参数 ${k}`); validateValue(k, params[k], p); }
  return params;
}
export function validatePresets(presets, schema) {
  check(Array.isArray(presets) && presets.length >= 1 && presets.length <= 64, '需要 1..64 个预设');
  const ids = new Set();
  for (const p of presets) {
    check(record(p) && shortText(p.id, 60) && !ids.has(p.id) && shortText(p.name, 60) && shortText(p.seed, 128), '预设名称、ID 或 seed 无效');
    ids.add(p.id); validateParams(p.params, schema);
  }
  return presets;
}
export function makeRecipe(manifest, params, seed, quality = 'final') {
  check(shortText(seed, 128), 'seed 必须是 1..128 个字符');
  check(['preview', 'final'].includes(quality), '未知质量档');
  return { apiVersion: API_VERSION, generator: { id: manifest.id, version: manifest.version }, seed, params: structuredClone(params), quality };
}
export function validateRecipe(recipe, plugin) {
  check(record(recipe) && recipe.apiVersion === API_VERSION && recipe.generator?.id === plugin.manifest.id && recipe.generator?.version === plugin.manifest.version, '配方插件或版本不匹配，请使用原版本插件');
  validateParams(recipe.params, plugin.schema);
  return makeRecipe(plugin.manifest, recipe.params, recipe.seed, recipe.quality);
}
