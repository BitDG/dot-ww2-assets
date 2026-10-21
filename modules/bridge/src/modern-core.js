// PGF native modern bridge part plans. Meters, Y up, deck along Z.
// Public structural references are recorded in ../README.md; no Blender runtime required.
export const MODERN_TYPES = ['steel-girder', 'steel-truss', 'box-girder', 'tied-arch', 'cable-stayed'];
export const MODERN_FIELDS = {
  deckUse: 'rail', spanCount: 1, trackCount: 2, trackGauge: 1.435,
  trackSpacing: 4.2, trackBed: 'ballast', hasCatenary: false,
  roadLaneCount: 2, trussHeight: 7, bayCount: 8, towerHeight: 28,
  steelColor: '#486c78', concreteColor: '#b5b3ad', deckColor: '#343c43',
  railColor: '#aab6bd', cableColor: '#d9dee1',
};
export const MODERN_PRESETS = {
  'rail-girder': { label: '铁路钢梁桥', bridgeType: 'steel-girder', spanLength: 24, bridgeWidth: 9.6, pillarHeight: 8, spanCount: 2, deckUse: 'rail', trackBed: 'ballast', hasCatenary: false, steelColor: '#486c78' },
  'rail-truss': { label: '铁路钢桁架桥', bridgeType: 'steel-truss', spanLength: 48, bridgeWidth: 9.6, pillarHeight: 10, spanCount: 1, deckUse: 'rail', trackBed: 'ballast', trussHeight: 8, bayCount: 8, hasCatenary: false, steelColor: '#496d6a' },
  'highspeed-viaduct': { label: '高铁高架桥', bridgeType: 'box-girder', spanLength: 32, bridgeWidth: 12.2, pillarHeight: 14, spanCount: 3, deckUse: 'rail', trackBed: 'slab', hasCatenary: true, concreteColor: '#c3c3b9' },
  'highway-box': { label: '现代公路箱梁桥', bridgeType: 'box-girder', spanLength: 30, bridgeWidth: 15, pillarHeight: 10, spanCount: 3, deckUse: 'road', roadLaneCount: 4, hasCatenary: false, concreteColor: '#b5b5ac' },
  'modern-arch': { label: '现代系杆拱桥', bridgeType: 'tied-arch', spanLength: 64, bridgeWidth: 13, pillarHeight: 8, spanCount: 1, deckUse: 'road', roadLaneCount: 4, trussHeight: 16, bayCount: 12, hasCatenary: false, steelColor: '#b0c4c5' },
  'modern-cable': { label: '双塔斜拉桥', bridgeType: 'cable-stayed', spanLength: 80, bridgeWidth: 15, pillarHeight: 12, spanCount: 1, deckUse: 'road', roadLaneCount: 4, towerHeight: 34, bayCount: 10, hasCatenary: false, steelColor: '#bbc4c1' },
};
export const TYPE_DEFAULTS = Object.fromEntries(MODERN_TYPES.map(type => [type, {
  ...MODERN_FIELDS, supportPillars: true, hasRailings: true, hasLanterns: false,
  plankJitter: 0, archHeight: 0, ...Object.values(MODERN_PRESETS).find(p => p.bridgeType === type),
}]));
export function isModern(type) { return MODERN_TYPES.includes(type); }
export function bridgeLayout(p) {
  // Cable-stayed bridge has two half-length anchor spans plus one full main span.
  const lengths = p.bridgeType === 'cable-stayed' ? [p.spanLength / 2, p.spanLength, p.spanLength / 2] : Array(p.spanCount).fill(p.spanLength);
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  let z = -totalLength / 2;
  const spans = lengths.map(length => { const span = { start: z, end: z + length, length }; z += length; return span; });
  return { totalLength, spans, supports: [spans[0].start, ...spans.map(s => s.end)] };
}
export function validateModern(p) {
  if (!['rail', 'road'].includes(p.deckUse)) throw Error('桥面用途应为铁路或公路');
  if (!['ballast', 'slab'].includes(p.trackBed)) throw Error('不支持的轨道基础');
  for (const [key, min, max, integer] of [
    ['spanCount', 1, 6, true], ['trackCount', 1, 2, true], ['trackGauge', 1, 1.8],
    ['trackSpacing', 3.5, 5.5], ['roadLaneCount', 1, 6, true],
    ['trussHeight', 3, 30], ['bayCount', 4, 20, true], ['towerHeight', 10, 60],
  ]) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max || (integer && !Number.isInteger(p[key]))) throw Error(`${key} 超出范围 ${min}–${max}`);
  }
  if (typeof p.hasCatenary !== 'boolean') throw Error('接触网应为布尔值');
  if (p.bridgeType === 'cable-stayed' && p.spanCount !== 1) throw Error('斜拉桥使用一组主跨及两侧锚跨，组数应为 1');
  const requiredWidth = p.deckUse === 'rail' ? (p.trackCount - 1) * p.trackSpacing + p.trackGauge + 2.2 : p.roadLaneCount * 2.8 + 1.2;
  if (p.bridgeWidth < requiredWidth) throw Error(`当前桥面至少需要 ${requiredWidth.toFixed(2)} m 宽度`);
  if (p.bridgeType === 'steel-truss' && p.trussHeight < (p.hasCatenary && p.deckUse === 'rail' ? 7 : 5)) throw Error('桁架净高不足：普通轨道至少 5 m，接触网至少 7 m');
}
export function generateModernBridge(recipe) {
  const p = recipe.params, { totalLength: L, spans, supports } = bridgeLayout(p), W = p.bridgeWidth;
  const parts = [], width = W / 2;
  const add = (id, material, kind, args, ops) => parts.push({ id, material, kind, args, ops });
  const box = (id, mat, w, h, d, x, y, z) => add(id, mat, 'box', [w, h, d], [['t', x, y, z]]);
  const beam = (id, mat, a, b, w, h) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return;
    add(id, mat, 'box', [w, h, length], [['rx', -Math.atan2(dy, Math.hypot(dx, dz))], ['ry', Math.atan2(dx, dz)], ['t', ...a.map((v, i) => (v + b[i]) / 2)]]);
  };
  const cable = (id, a, b, radius = .045) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return;
    add(id, 'cable', 'cylinder', [radius, radius, length, 8], [['rx', Math.PI / 2 - Math.atan2(dy, Math.hypot(dx, dz))], ['ry', Math.atan2(dx, dz)], ['t', ...a.map((v, i) => (v + b[i]) / 2)]]);
  };
  const iBeam = (id, a, b, w, h) => {
    const t = Math.min(w, h) * .16, dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.hypot(dx, dy, dz), pitch = Math.atan2(dy, Math.hypot(dx, dz)), yaw = Math.atan2(dx, dz);
    for (const [name, pw, ph, offset] of [['web', t, h - t * 2, 0], ['top', w, t, (h - t) / 2], ['bottom', w, t, -(h - t) / 2]]) {
      add(`${id}-${name}`, 'steel', 'box', [pw, ph, length], [['t', 0, offset, 0], ['rx', -pitch], ['ry', yaw], ['t', ...a.map((v, i) => (v + b[i]) / 2)]]);
    }
  };
  const girderDepth = p.bridgeType === 'steel-girder' ? Math.max(.9, p.spanLength / 22) : Math.max(1.2, p.spanLength / 24);
  const deckThickness = .35, girderBottom = -deckThickness - girderDepth;
  box('deck-slab', 'concrete', W, deckThickness, L, 0, -deckThickness / 2, 0);
  for (const [i, span] of spans.entries()) {
    const length = span.length - .06, z = (span.start + span.end) / 2;
    if (['steel-girder', 'steel-truss', 'tied-arch'].includes(p.bridgeType)) {
      for (const [j, x] of [-W * .32, W * .32].entries()) iBeam(`main-girder-${i}-${j}`, [x, -deckThickness - girderDepth / 2, span.start + .03], [x, -deckThickness - girderDepth / 2, span.end - .03], .55, girderDepth);
      const count = Math.ceil(span.length / 4);
      for (let j = 0; j <= count; j++) { const zc = span.start + span.length * j / count; iBeam(`cross-girder-${i}-${j}`, [-W * .4, -.6, zc], [W * .4, -.6, zc], .28, .45); }
    } else {
      // Open-ended hollow box section: top slab, bottom flange, two webs.
      const bw = W * .62, wall = .24;
      box(`box-bottom-${i}`, 'concrete', bw, wall, length, 0, girderBottom + wall / 2, z);
      for (const side of [-1, 1]) box(`box-web-${i}-${side}`, 'concrete', wall, girderDepth, length, side * (bw - wall) / 2, -deckThickness - girderDepth / 2, z);
    }
    // Small paired expansion-joint strips identify the actual span boundaries.
    if (i) box(`expansion-${i}`, 'rail', W, .018, .05, 0, .009, span.start);
  }
  if (p.supportPillars) for (const [i, z] of supports.entries()) {
    const base = girderBottom - p.pillarHeight - .65, pierW = Math.min(W * .4, 4.2);
    box(`pier-base-${i}`, 'concrete', pierW + 1.2, .65, 3, 0, base + .325, z);
    box(`pier-shaft-${i}`, 'concrete', pierW, p.pillarHeight, 1.8, 0, girderBottom - .6 - p.pillarHeight / 2, z);
    box(`pier-cap-${i}`, 'concrete', W * .82, .5, 2.2, 0, girderBottom - .35, z);
    for (const side of [-1, 1]) box(`bearing-${i}-${side}`, 'rail', .7, .1, .8, side * W * .25, girderBottom - .05, z);
  }
  let sleeperCount = 0, catenaryCount = 0;
  const trackCenters = p.trackCount === 1 ? [0] : [-p.trackSpacing / 2, p.trackSpacing / 2];
  if (p.deckUse === 'rail') {
    for (const [track, x] of trackCenters.entries()) {
      const baseY = p.trackBed === 'ballast' ? .26 : .18, bedWidth = p.trackGauge + 1.15;
      box(`track-bed-${track}`, p.trackBed === 'ballast' ? 'ballast' : 'concrete', bedWidth, baseY, L, x, baseY / 2, 0);
      const count = Math.floor((L - .5) / .6) + 1;
      for (let i = 0; i < count; i++) {
        const z = -L / 2 + .25 + i * .6;
        box(`sleeper-${track}-${i}`, 'sleeper', p.trackGauge + .9, .16, .24, x, baseY + .08, z); sleeperCount++;
        for (const side of [-1, 1]) box(`clip-${track}-${i}-${side}`, 'rail', .32, .035, .16, x + side * (p.trackGauge + .07) / 2, baseY + .178, z);
      }
      for (const side of [-1, 1]) {
        const rx = x + side * (p.trackGauge + .07) / 2, railY = baseY + .16;
        box(`rail-foot-${track}-${side}`, 'rail', .15, .025, L, rx, railY + .0125, 0);
        box(`rail-web-${track}-${side}`, 'rail', .025, .10, L, rx, railY + .075, 0);
        box(`rail-head-${track}-${side}`, 'rail', .07, .055, L, rx, railY + .1525, 0);
      }
    }
    for (const side of [-1, 1]) {
      box(`inspection-path-${side}`, 'concrete', .65, .16, L, side * (width - .48), .08, 0);
      box(`cable-trough-${side}`, 'concrete', .18, .28, L, side * (width - 1.03), .14, 0);
    }
    if (p.hasCatenary) {
      const count = Math.max(1, Math.ceil(L / 24));
      for (let i = 0; i <= count; i++) {
        const z = -L / 2 + i * L / count;
        for (const side of [-1, 1]) {
          box(`catenary-post-${i}-${side}`, 'steel', .18, 6.4, .18, side * (width - .35), 3.2, z);
          beam(`catenary-arm-${i}-${side}`, 'steel', [side * (width - .35), 5.9, z], [0, 5.9, z], .09, .10);
        }
        for (const [track, x] of trackCenters.entries()) {
          add(`insulator-${i}-${track}`, 'sleeper', 'cylinder', [.085, .085, .28, 10], [['t', x, 5.74, z]]);
          if (i < count) {
            const next = -L / 2 + (i + 1) * L / count;
            cable(`contact-wire-${i}-${track}`, [x, 5.45, z], [x, 5.45, next], .014);
            const steps = 12;
            const messengerY = t => 6.1 - .38 * 4 * t * (1 - t);
            for (let j = 0; j < steps; j++) {
              const t = j / steps, u = (j + 1) / steps;
              cable(`messenger-${i}-${track}-${j}`, [x, messengerY(t), z + (next - z) * t], [x, messengerY(u), z + (next - z) * u], .018);
              if (j % 2 === 1) cable(`dropper-${i}-${track}-${j}`, [x, 5.45, z + (next - z) * t], [x, messengerY(t), z + (next - z) * t], .01);
            }
          }
        }
        catenaryCount++;
      }
    }
  } else {
    const roadwayW = W - 1.2, laneW = roadwayW / p.roadLaneCount;
    box('asphalt', 'asphalt', roadwayW, .06, L, 0, .03, 0);
    for (const side of [-1, 1]) box(`edge-line-${side}`, 'marking', .10, .008, L - .4, side * (roadwayW / 2 - .25), .065, 0);
    for (let lane = 1; lane < p.roadLaneCount; lane++) for (let z = -L / 2 + 1.5, i = 0; z < L / 2 - .5; z += 6, i++) box(`lane-line-${lane}-${i}`, 'marking', .12, .008, Math.min(3, L / 2 - z), -roadwayW / 2 + lane * laneW, .065, z);
  }
  if (p.hasRailings) for (const side of [-1, 1]) {
    const x = side * (width - .1);
    if (p.deckUse === 'road') box(`barrier-${side}`, 'concrete', .4, .9, L, x - side * .1, .45, 0);
    else {
      const count = Math.ceil(L / 2);
      for (let j = 0; j <= count; j++) box(`guard-post-${side}-${j}`, 'steel', .055, 1.15, .055, x, .575, -L / 2 + j * L / count);
      for (const y of [.6, 1.1]) box(`guard-rail-${side}-${y}`, 'steel', .05, .05, L, x, y, 0);
    }
  }
  if (p.bridgeType === 'steel-truss') for (const [i, span] of spans.entries()) {
    const height = p.trussHeight, y0 = .3, x0 = width - .35, step = span.length / p.bayCount;
    for (const side of [-1, 1]) {
      const x = side * x0;
      for (const y of [y0, height]) iBeam(`truss-chord-${i}-${side}-${y}`, [x, y, span.start], [x, y, span.end], .35, .45);
      for (let bay = 0; bay <= p.bayCount; bay++) {
        const z = span.start + step * bay;
        beam(`truss-upright-${i}-${side}-${bay}`, 'steel', [x, y0, z], [x, height, z], .25, .25);
        box(`gusset-${i}-${side}-${bay}`, 'steel', .07, .7, .7, x + side * .14, y0 + .2, z);
        if (bay < p.bayCount) beam(`truss-diagonal-${i}-${side}-${bay}`, 'steel', [x, bay % 2 ? height : y0, z], [x, bay % 2 ? y0 : height, z + step], .28, .28);
      }
    }
    for (let bay = 0; bay <= p.bayCount; bay++) {
      const z = span.start + step * bay;
      beam(`truss-portal-${i}-${bay}`, 'steel', [-x0, p.trussHeight, z], [x0, p.trussHeight, z], .25, .25);
      if (bay < p.bayCount) beam(`truss-top-brace-${i}-${bay}`, 'steel', [-x0, p.trussHeight, z], [x0, p.trussHeight, z + step], .12, .12);
    }
  }
  if (p.bridgeType === 'tied-arch') for (const [i, span] of spans.entries()) {
    const count = p.bayCount * 3, x0 = width - .35, arch = t => .3 + p.trussHeight * 4 * t * (1 - t);
    for (const side of [-1, 1]) {
      const x = side * x0;
      for (let j = 0; j < count; j++) beam(`arch-rib-${i}-${side}-${j}`, 'steel', [x, arch(j / count), span.start + span.length * j / count], [x, arch((j + 1) / count), span.start + span.length * (j + 1) / count], .55, .65);
      for (let j = 1; j < p.bayCount; j++) { const t = j / p.bayCount, z = span.start + span.length * t; cable(`arch-hanger-${i}-${side}-${j}`, [x, .3, z], [x, arch(t), z], .045); }
      beam(`arch-tie-${i}-${side}`, 'steel', [x, .3, span.start], [x, .3, span.end], .35, .45);
    }
    for (let j = 1; j < 5; j++) { const t = j / 5; beam(`arch-cross-${i}-${j}`, 'steel', [-x0, arch(t), span.start + span.length * t], [x0, arch(t), span.start + span.length * t], .3, .3); }
  }
  if (p.bridgeType === 'cable-stayed') {
    const towerZs = [-p.spanLength / 2, p.spanLength / 2], tx = width - .4;
    for (const [i, z] of towerZs.entries()) {
      for (const side of [-1, 1]) {
        beam(`tower-leg-${i}-${side}`, 'concrete', [side * (width + .55), girderBottom, z], [side * tx * .45, p.towerHeight, z], .9, 1.2);
        for (let j = 1; j <= p.bayCount; j++) {
          const y = p.towerHeight * (.66 + .31 * j / p.bayCount), towerX = side * (width + .55 + (tx * .45 - width - .55) * (y - girderBottom) / (p.towerHeight - girderBottom));
          for (const direction of [-1, 1]) {
            const anchorZ = z + direction * (p.spanLength / 2 - 1) * j / p.bayCount;
            cable(`stay-${i}-${side}-${direction}-${j}`, [side * tx, .3, anchorZ], [towerX, y, z], .065);
            box(`stay-anchor-${i}-${side}-${direction}-${j}`, 'steel', .2, .3, .4, side * tx, .15, anchorZ);
          }
        }
      }
      beam(`tower-cross-${i}`, 'concrete', [-tx * .6, p.towerHeight * .74, z], [tx * .6, p.towerHeight * .74, z], .6, .8);
    }
  }
  if (parts.length > 20000) throw Error('桥梁部件超过 20,000 预算');
  return {
    recipe, parts,
    bounds: { min: [-width - 1, p.supportPillars ? girderBottom - p.pillarHeight - .65 : girderBottom, -L / 2 - 1.5], max: [width + 1, Math.max(1.2, p.hasCatenary && p.deckUse === 'rail' ? 6.4 : 0, p.bridgeType === 'steel-truss' || p.bridgeType === 'tied-arch' ? p.trussHeight + .7 : 0, p.bridgeType === 'cable-stayed' ? p.towerHeight + 1 : 0), L / 2 + 1.5] },
    stats: { partCount: parts.length, plankCount: 0, sleeperCount, catenaryCount, totalLength: L, spanCount: spans.length, trackCount: p.deckUse === 'rail' ? p.trackCount : 0, byMaterial: parts.reduce((acc, x) => (acc[x.material] = (acc[x.material] || 0) + 1, acc), {}) },
  };
}
