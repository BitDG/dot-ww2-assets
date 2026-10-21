// Procedural bridge generator. Pure data, meters, Y up, deck along Z.
// Ported from zinkkrysty/three-js-asset-studio src/generators/bridgeGenerator.ts
// (https://github.com/zinkkrysty/three-js-asset-studio). Original has no
// LICENSE file; the repo description invites copying generator code. Keep this
// attribution when redistributing. TypeScript geometry code was rewritten as a
// pure-data part plan consumed by src/three-adapter.js.
import { MODERN_TYPES, MODERN_FIELDS, MODERN_PRESETS, TYPE_DEFAULTS, isModern, validateModern, generateModernBridge } from './modern-core.js';
export { isModern, TYPE_DEFAULTS };
export const VERSION = '1.1.0';
export const BRIDGE_TYPES = ['arch', 'rope', 'straight', 'covered', ...MODERN_TYPES];
export const PRESETS = {
  'classic-arch': { label: '经典木拱桥', bridgeType: 'arch', spanLength: 7.5, bridgeWidth: 2.2, archHeight: 0.9, plankSpacing: 0.04, plankJitter: 0.03, supportPillars: true, pillarHeight: 2.5, hasRailings: true, hasLanterns: true, woodColor: '#6a3810', beamColor: '#4a2c11', ropeColor: '#c2a688', glowColor: '#ffaa00' },
  'jungle-rope': { label: '丛林绳索吊桥', bridgeType: 'rope', spanLength: 10, bridgeWidth: 1.6, archHeight: 1.2, plankSpacing: 0.08, plankJitter: 0.08, supportPillars: false, pillarHeight: 1, hasRailings: true, hasLanterns: true, woodColor: '#8b5a2b', beamColor: '#4a2c11', ropeColor: '#c2a688', glowColor: '#00f5d4' },
  'river-pier': { label: '河畔栈桥', bridgeType: 'straight', spanLength: 8, bridgeWidth: 2, archHeight: 0, plankSpacing: 0.03, plankJitter: 0.02, supportPillars: true, pillarHeight: 3.2, hasRailings: true, hasLanterns: false, woodColor: '#5c3317', beamColor: '#3d2612', ropeColor: '#c2a688', glowColor: '#ffaa00' },
  'rustic-covered': { label: '乡村廊桥', bridgeType: 'covered', spanLength: 9, bridgeWidth: 2.5, archHeight: 0.3, plankSpacing: 0.02, plankJitter: 0.01, supportPillars: true, pillarHeight: 2, hasRailings: true, hasLanterns: true, woodColor: '#7a431d', beamColor: '#9e2a2b', ropeColor: '#c2a688', glowColor: '#ffea00' },
  ...MODERN_PRESETS,
};
export const DEFAULTS = { bridgeType: 'arch', spanLength: 7.5, bridgeWidth: 2.2, archHeight: 0.9, plankSpacing: 0.04, plankJitter: 0.04, supportPillars: true, pillarHeight: 2.5, hasRailings: true, hasLanterns: true, woodColor: '#6a3810', beamColor: '#4a2c11', ropeColor: '#c2a688', glowColor: '#ffaa00', ...MODERN_FIELDS };
const HEX = /^#[\da-f]{6}$/i;
export function normalizeRecipe(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('配方必须是对象');
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) throw Error('不支持的配方版本');
  if (input.generatorId !== undefined && input.generatorId !== 'props.bridge') throw Error('请选择桥梁配方');
  if (input.generatorVersion !== undefined && ![VERSION, '1.0.0'].includes(input.generatorVersion)) throw Error('不支持的生成器版本');
  if (input.units !== undefined && input.units !== 'meters') throw Error('仅支持米制配方');
  if (input.params !== undefined && (!input.params || typeof input.params !== 'object' || Array.isArray(input.params))) throw Error('params 必须是对象');
  const p = { ...DEFAULTS, ...TYPE_DEFAULTS[input.params?.bridgeType], ...input.params };
  const modern = isModern(p.bridgeType);
  if (!BRIDGE_TYPES.includes(p.bridgeType)) throw Error('不支持的桥型');
  for (const [key, min, max] of [['spanLength', modern ? 8 : 3, modern ? 100 : 14], ['bridgeWidth', modern ? 4 : 1, modern ? 30 : 4], ['archHeight', 0, 2.5], ['plankSpacing', 0.01, 0.2], ['plankJitter', 0, 0.15], ['pillarHeight', 0.5, modern ? 40 : 6]]) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw Error(`${key} 超出范围 ${min}–${max}`);
  }
  for (const key of ['supportPillars', 'hasRailings', 'hasLanterns']) if (typeof p[key] !== 'boolean') throw Error(`${key} 应为布尔值`);
  for (const key of ['woodColor', 'beamColor', 'ropeColor', 'glowColor', 'steelColor', 'concreteColor', 'deckColor', 'railColor', 'cableColor']) if (typeof p[key] !== 'string' || !HEX.test(p[key])) throw Error(`${key} 颜色格式应为 #RRGGBB`);
  if (modern) validateModern(p);
  const seed = String(input.seed ?? '444');
  if (!seed.length || seed.length > 128) throw Error('种子长度应为 1–128');
  return { schemaVersion: 1, generatorId: 'props.bridge', generatorVersion: VERSION, seed, units: 'meters', params: Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, p[k]])) };
}
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function createPRNG(seed) {
  let a = hash(String(seed));
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Deck elevation profile. Arch rises, rope sags; straight/covered keep a subtle crown.
export function bridgeHeight(type, z, spanLength, archHeight) {
  const normZ = z / (spanLength / 2);
  if (type === 'arch') return Math.cos(normZ * Math.PI * 0.5) * archHeight;
  if (type === 'rope') return (normZ * normZ - 1) * archHeight;
  return (1 - Math.pow(normZ, 4)) * archHeight * 0.3;
}
// A part is a primitive spec: kind + constructor args + ordered transform ops.
// ops: ['rx'|'ry'|'rz', angle] | ['s', x, y, z] | ['t', x, y, z]
export function generateBridge(input = {}) {
  const recipe = normalizeRecipe(input), p = recipe.params;
  if (isModern(p.bridgeType)) return generateModernBridge(recipe);
  const style = p.bridgeType, spanL = p.spanLength, widthW = p.bridgeWidth, archH = p.archHeight;
  const rng = createPRNG(recipe.seed);
  const parts = [];
  const part = (id, material, kind, args, ops) => parts.push({ id, material, kind, args, ops });
  const H = z => bridgeHeight(style, z, spanL, archH);
  const beam = (id, material, [ax, ay, az], [bx, by, bz], w, h, overlap = 0.04) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz) + overlap;
    const pitch = Math.atan2(dy, Math.hypot(dx, dz)), yaw = Math.atan2(dx, dz);
    part(id, material, 'box', [w, h, len], [['rx', -pitch], ['ry', yaw], ['t', (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]]);
  };
  const rope = (id, [ax, ay, az], [bx, by, bz], radius) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz) + 0.02;
    const pitch = Math.atan2(dy, Math.hypot(dx, dz)), yaw = Math.atan2(dx, dz);
    part(id, 'rope', 'cylinder', [radius, radius, len, 5], [['rx', Math.PI / 2 - pitch], ['ry', yaw], ['t', (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]]);
  };
  // 1. Deck planks, stepping along the arc so spacing stays even on slopes.
  const plankWidth = 0.28, targetStep = plankWidth + p.plankSpacing;
  let currZ = -spanL / 2, plankIndex = 0;
  while (currZ < spanL / 2) {
    const y = H(currZ), slope = Math.atan2(H(currZ + 0.02) - H(currZ - 0.02), 0.04);
    const pw = widthW * (0.96 + (rng() - 0.5) * p.plankJitter * 2), pt = 0.12;
    part(`plank-${plankIndex++}`, 'wood', 'box', [pw, pt, plankWidth * 0.95], [
      ['rx', -slope], ['ry', (rng() - 0.5) * p.plankJitter * 0.8], ['rz', (rng() - 0.5) * p.plankJitter * 0.5],
      ['t', (rng() - 0.5) * p.plankJitter * 0.6, y + pt / 2 + (rng() - 0.5) * p.plankJitter * 0.3, currZ],
    ]);
    currZ += targetStep * Math.cos(slope);
  }
  // 2. Underneath support beams following the deck curve on both sides.
  const beamSegments = 36;
  [-widthW * 0.42, widthW * 0.42].forEach((xSide, side) => {
    for (let b = 0; b < beamSegments; b++) {
      const z1 = -spanL / 2 + (b / beamSegments) * spanL, z2 = -spanL / 2 + ((b + 1) / beamSegments) * spanL;
      beam(`deck-beam-${side}-${b}`, 'beam', [xSide, H(z1) - 0.12, z1], [xSide, H(z2) - 0.12, z2], 0.18, 0.24);
    }
  });
  // 3. Support stilts (never for the sagging rope deck).
  if (p.supportPillars && style !== 'rope') {
    const pillarPairs = Math.max(1, Math.floor(spanL / 3.2));
    for (let i = 1; i <= pillarPairs; i++) {
      const pz = -spanL / 2 + (i / (pillarPairs + 1)) * spanL, deckY = H(pz), totalH = p.pillarHeight + deckY;
      [-widthW * 0.42, widthW * 0.42].forEach((px, side) => part(`pillar-${i}-${side}`, 'beam', 'cylinder', [0.16, 0.22, totalH, 6], [['t', px, deckY - totalH / 2, pz]]));
      part(`pillar-cross-${i}`, 'beam', 'box', [widthW * 0.9, 0.16, 0.16], [['t', 0, deckY - totalH * 0.5, pz]]);
    }
  }
  // 4. Railings: posts along both edges, rails/ropes between them, lanterns at entrances.
  if (p.hasRailings) {
    const postCount = Math.max(4, Math.floor(spanL / 1.3)), railH = 0.95;
    [-widthW * 0.46, widthW * 0.46].forEach((rx, side) => {
      const posts = [];
      for (let i = 0; i <= postCount; i++) {
        const pz = -spanL / 2 + (i / postCount) * spanL, py = H(pz), entrance = i === 0 || i === postCount;
        posts.push({ x: rx, y: py, z: pz });
        if (style === 'rope') {
          part(`post-${side}-${i}`, 'beam', 'cylinder', [0.08, 0.08, railH + 0.25, 6], [['t', rx, py + railH / 2 - 0.12, pz]]);
          part(`post-knot-top-${side}-${i}`, 'rope', 'cylinder', [0.12, 0.12, 0.06, 6], [['t', rx, py + railH * 0.85, pz]]);
          part(`post-knot-mid-${side}-${i}`, 'rope', 'cylinder', [0.11, 0.11, 0.06, 6], [['t', rx, py + railH * 0.48, pz]]);
          if (p.hasLanterns && entrance) {
            part(`lantern-post-${side}-${i}`, 'beam', 'cylinder', [0.06, 0.06, 0.35, 6], [['t', rx, py + railH + 0.18, pz]]);
            part(`lantern-cap-${side}-${i}`, 'beam', 'cylinder', [0.1, 0.1, 0.06, 6], [['t', rx, py + railH + 0.35, pz]]);
            part(`lantern-${side}-${i}`, 'glow', 'dodecahedron', [0.15, 0], [['t', rx, py + railH + 0.46, pz]]);
          }
        } else {
          part(`post-${side}-${i}`, 'beam', 'box', [0.13, railH + 0.25, 0.13], [['t', rx, py + railH / 2 - 0.12, pz]]);
          part(`post-cap-${side}-${i}`, 'beam', 'box', [0.18, 0.08, 0.18], [['t', rx, py + railH + 0.04, pz]]);
          part(`post-collar-${side}-${i}`, 'beam', 'box', [0.18, 0.08, 0.18], [['t', rx, py + 0.04, pz]]);
          const dir = rx > 0 ? -1 : 1;
          part(`post-brace-${side}-${i}`, 'beam', 'box', [0.08, 0.42, 0.08], [['rz', dir * Math.PI * 0.25], ['t', rx + dir * 0.12, py - 0.12, pz]]);
          if (p.hasLanterns && entrance) {
            part(`lantern-post-${side}-${i}`, 'beam', 'box', [0.09, 0.35, 0.09], [['t', rx, py + railH + 0.22, pz]]);
            part(`lantern-collar-${side}-${i}`, 'beam', 'box', [0.14, 0.06, 0.14], [['t', rx, py + railH + 0.38, pz]]);
            part(`lantern-${side}-${i}`, 'glow', 'dodecahedron', [0.15, 0], [['t', rx, py + railH + 0.48, pz]]);
          }
        }
      }
      for (let i = 0; i < posts.length - 1; i++) {
        const p1 = posts[i], p2 = posts[i + 1];
        if (style === 'rope') {
          const subsegs = 6;
          for (let s = 0; s < subsegs; s++) {
            const t1 = s / subsegs, t2 = (s + 1) / subsegs;
            const z1 = p1.z + (p2.z - p1.z) * t1, z2 = p1.z + (p2.z - p1.z) * t2;
            const sag1 = (Math.pow(t1 - 0.5, 2) - 0.25) * 0.24, sag2 = (Math.pow(t2 - 0.5, 2) - 0.25) * 0.24;
            const top1 = p1.y + railH * 0.85 + (p2.y - p1.y) * t1 + sag1, top2 = p1.y + railH * 0.85 + (p2.y - p1.y) * t2 + sag2;
            const mid1 = p1.y + railH * 0.48 + (p2.y - p1.y) * t1 + sag1 * 0.6, mid2 = p1.y + railH * 0.48 + (p2.y - p1.y) * t2 + sag2 * 0.6;
            rope(`rail-rope-top-${side}-${i}-${s}`, [p1.x, top1, z1], [p1.x, top2, z2], 0.045);
            rope(`rail-rope-mid-${side}-${i}-${s}`, [p1.x, mid1, z1], [p1.x, mid2, z2], 0.035);
            if (s > 0 && s % 2 === 0) rope(`rail-rope-tie-${side}-${i}-${s}`, [p1.x, top1, z1], [p1.x, mid1, z1], 0.025);
          }
        } else if (style === 'arch') {
          const inX = p1.x * 0.94, outX = p1.x * 1.04;
          beam(`rail-top-${side}-${i}`, 'wood', [p1.x, p1.y + railH, p1.z], [p2.x, p2.y + railH, p2.z], 0.14, 0.09, 0.05);
          beam(`rail-mid-${side}-${i}`, 'wood', [inX, p1.y + railH * 0.48, p1.z], [inX, p2.y + railH * 0.48, p2.z], 0.08, 0.08, 0.03);
          beam(`rail-x-a-${side}-${i}`, 'beam', [outX, p1.y + railH * 0.82, p1.z], [outX, p2.y + railH * 0.18, p2.z], 0.05, 0.06, 0);
          beam(`rail-x-b-${side}-${i}`, 'beam', [outX, p1.y + railH * 0.18, p1.z], [outX, p2.y + railH * 0.82, p2.z], 0.05, 0.06, 0);
        } else if (style === 'straight') {
          beam(`rail-top-${side}-${i}`, 'wood', [p1.x, p1.y + railH, p1.z], [p2.x, p2.y + railH, p2.z], 0.14, 0.09, 0.05);
          beam(`rail-mid-${side}-${i}`, 'wood', [p1.x, p1.y + railH * 0.48, p1.z], [p2.x, p2.y + railH * 0.48, p2.z], 0.08, 0.08, 0.03);
          for (let s = 1; s <= 3; s++) {
            const st = s / 4, sz = p1.z + (p2.z - p1.z) * st, sy = p1.y + (p2.y - p1.y) * st;
            part(`rail-slat-${side}-${i}-${s}`, 'beam', 'box', [0.05, railH * 0.8, 0.05], [['t', p1.x, sy + railH * 0.45, sz]]);
          }
        } else {
          beam(`rail-top-${side}-${i}`, 'wood', [p1.x, p1.y + railH, p1.z], [p2.x, p2.y + railH, p2.z], 0.14, 0.09, 0.05);
          beam(`rail-mid-${side}-${i}`, 'wood', [p1.x, p1.y + railH * 0.48, p1.z], [p2.x, p2.y + railH * 0.48, p2.z], 0.08, 0.08, 0.03);
        }
      }
    });
  }
  // 5. Covered bridge: gabled roof segments above the deck.
  if (style === 'covered') {
    const roofH = 1.8, overhang = 0.4, wallCount = 18, span = widthW + overhang * 2;
    for (let i = 0; i < wallCount; i++) {
      const z1 = -spanL / 2 + (i / wallCount) * spanL, z2 = -spanL / 2 + ((i + 1) / wallCount) * spanL;
      const midZ = (z1 + z2) / 2, midY = (H(z1) + H(z2)) / 2;
      const segL = Math.hypot(z2 - z1, H(z2) - H(z1)) * 1.02, angle = Math.atan2(H(z2) - H(z1), z2 - z1);
      part(`roof-${i}`, 'beam', 'cone', [span * 0.65, roofH, 4], [['ry', Math.PI / 4], ['s', 1, 0.5, segL / span], ['rx', angle], ['t', 0, midY + 2.2, midZ]]);
    }
  }
  const minY = (p.supportPillars && style !== 'rope') ? -p.pillarHeight : (style === 'rope' ? -archH : 0);
  const maxY = style === 'covered' ? archH * 0.3 + 2.2 + 1 : archH + (p.hasRailings ? 1.3 : 0.2) + (p.hasLanterns ? 0.3 : 0);
  return {
    recipe, parts,
    bounds: { min: [-widthW * 0.58, minY, -spanL / 2], max: [widthW * 0.58, Math.max(maxY, 0.2), spanL / 2] },
    stats: { partCount: parts.length, plankCount: plankIndex, byMaterial: parts.reduce((acc, x) => (acc[x.material] = (acc[x.material] || 0) + 1, acc), {}) },
  };
}
