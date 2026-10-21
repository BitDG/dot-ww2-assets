// Presentation and recoil preferences never override ammunition, damage or reload timing.
export const VISUAL_EFFECTS_STORAGE = 'tank-strike:visual-effects@1';
const factor = (label, max = 2, value = 1) => ({ label, min: 0, max, step: .05, value, unit: '倍' });
const smoke = { count: factor('烟团数量'), size: factor('烟团大小', 2.5), opacity: factor('浓度', 2), life: factor('持续时间', 2), spread: factor('扩散速度', 2.5), rise: factor('上升速度', 2), turbulence: factor('翻滚速度', 2), shading: factor('明暗层次', 1, .7) };
const dust = { count: factor('扬尘数量'), size: factor('尘团大小', 2), opacity: factor('浓度'), life: factor('持续时间'), spread: factor('扩散速度'), rise: factor('卷起高度'), wind: factor('随风程度'), turbulence: factor('翻滚速度'), shading: factor('明暗层次', 1, .7) };
export const VISUAL_EFFECT_GROUPS = {
  flame: { label: '炮口火焰', color: '#ffe5b3', fields: { length: factor('喷焰长度'), width: factor('喷焰宽度'), duration: factor('闪光时长', 2), opacity: factor('火焰强度'), light: factor('照明强度'), turbulence: factor('翻滚速度'), shading: factor('明暗层次', 1, .45) } },
  muzzleSmoke: { label: '开火烟雾', color: '#b7b5ac', fields: smoke },
  impactSmoke: { label: '命中烟雾', color: '#8d8579', fields: smoke },
  blastDust: { label: '炮击扬尘', color: '#b69a72', fields: dust },
  trackDust: { label: '行驶扬尘', color: '#b69a72', fields: dust },
  recoil: { label: '炮管制退', fields: { travel: factor('后坐行程'), attack: { ...factor('后坐时间', 3), min: .25 }, return: { ...factor('复进时间', 3), min: .25 }, brake: { label: '制退效率', min: 0, max: .85, step: .05, value: .35, unit: '' } } },
  body: { label: '车体反冲', fields: { impulse: factor('反冲强度', 3), pitch: factor('俯仰响应', 3), roll: factor('侧倾响应', 3), stiffness: { ...factor('悬挂刚度'), min: .5 }, damping: { ...factor('回弹阻尼'), min: .25 } } },
};
export function defaultVisualEffects() {
  return { version: 1, ...Object.fromEntries(Object.entries(VISUAL_EFFECT_GROUPS).map(([key, group]) => [key, { ...Object.fromEntries(Object.entries(group.fields).map(([id, f]) => [id, f.value])), ...(group.color ? { tint: false, color: group.color } : {}) }])) };
}
export function validateVisualEffects(input) {
  if (!input || input.version !== 1) throw new Error('不支持的特效配置版本');
  const result = defaultVisualEffects();
  for (const [key, group] of Object.entries(VISUAL_EFFECT_GROUPS)) {
    const row = input[key];
    if (row === undefined && (key === 'recoil' || key === 'body')) continue;
    if (!row || typeof row !== 'object') throw new Error(`缺少${group.label}配置`);
    for (const [id, field] of Object.entries(group.fields)) {
      if (!Number.isFinite(row[id]) || row[id] < field.min || row[id] > field.max) throw new Error(`${group.label}：${field.label}超出范围`);
      result[key][id] = row[id];
    }
    if (group.color) {
      if (typeof row.tint !== 'boolean' || !/^#[a-f0-9]{6}$/i.test(row.color)) throw new Error(`${group.label}颜色无效`);
      result[key].tint = row.tint; result[key].color = row.color;
    }
  }
  return result;
}
export function createVisualEffectsStore(storage) {
  let saved = defaultVisualEffects(), loadError = '';
  try { const raw = storage?.getItem(VISUAL_EFFECTS_STORAGE); if (raw) saved = validateVisualEffects(JSON.parse(raw)); }
  catch { loadError = '已使用默认特效：本机配置不可读取或格式不兼容。'; }
  return {
    get: () => structuredClone(saved), read: () => saved, loadError,
    save(input) {
      const next = validateVisualEffects(input);
      if (!storage) throw new Error('本机存储不可用，配置尚未保存');
      storage.setItem(VISUAL_EFFECTS_STORAGE, JSON.stringify(next));
      saved = next; return structuredClone(saved);
    },
  };
}
let storage;
try { storage = globalThis.localStorage; } catch {}
export const visualEffectsStore = createVisualEffectsStore(storage);

export function resolveRecoilSettings(settings, preferences = visualEffectsStore.read(), maxRecoilM = settings.recoilM) {
  const recoil = preferences.recoil, body = preferences.body;
  return { ...settings,
    recoilM: Math.max(0, Math.min(maxRecoilM ?? 0, settings.recoilM * recoil.travel)),
    recoilAttackS: settings.recoilAttackS * recoil.attack,
    recoilReturnS: settings.recoilReturnS * recoil.return,
    recoilPhysics: { ...body, brake: recoil.brake, duration: settings.recoilAttackS * recoil.attack },
  };
}
