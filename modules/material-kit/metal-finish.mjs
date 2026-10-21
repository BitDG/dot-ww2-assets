/** Deterministic, tileable painted-metal masks and PBR pixels. No DOM or Three.js. */
const clamp = value => Math.max(0, Math.min(1, value));
const byte = value => Math.round(clamp(value) * 255);
const TAU = Math.PI * 2;
const levels = ['rust', 'chips', 'dirt', 'wear'];

function seed32(value) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}
function random(x, y, salt) {
  let h = Math.imul(x + 67, 374761393) ^ Math.imul(y + 127, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(u, v, cells, salt) {
  const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
  const wrap = n => ((n % cells) + cells) % cells;
  const smooth = t => t * t * (3 - 2 * t), a = smooth(x - ix), b = smooth(y - iy);
  const p = random(wrap(ix), wrap(iy), salt), q = random(wrap(ix + 1), wrap(iy), salt);
  const r = random(wrap(ix), wrap(iy + 1), salt), s = random(wrap(ix + 1), wrap(iy + 1), salt);
  return (p * (1 - a) + q * a) * (1 - b) + (r * (1 - a) + s * a) * b;
}
function rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); }
function coverage(level, field, bias = 0) { return level === 0 ? 0 : clamp((level * 1.12 + bias - field) * 5) * Math.min(1, level * 20); }

export function normalizeMetalFinish(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !levels.includes(key))) throw Error('Invalid metal finish');
  const result = {rust: 0, chips: 0, dirt: 0, wear: 0, ...input};
  for (const [key, value] of Object.entries(result)) if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw Error(`Invalid metal finish ${key}`);
  return result;
}

export function metalFinishPixels({seed, resolution, finish, color = '#326b78', role = 'paint'} = {}) {
  if (typeof seed !== 'string' || !seed || seed.length > 128 || !Number.isInteger(resolution) || resolution < 16 || resolution > 1024) throw Error('Invalid metal surface seed or resolution');
  if (!/^#[\da-f]{6}$/i.test(color) || !['paint', 'metal', 'dark-metal'].includes(role)) throw Error('Invalid metal surface color or role');
  const p = normalizeMetalFinish(finish), size = resolution * resolution, base = new Uint8Array(size * 4), normal = new Uint8Array(size * 4), orm = new Uint8Array(size * 4), height = new Float32Array(size);
  const masks = Object.fromEntries(levels.map(key => [key, new Uint8Array(size)]));
  const salt = seed32(`${seed}|metal-finish-v1|${role}`), paint = rgb(color), bare = role === 'dark-metal' ? [.32, .35, .36] : [.62, .64, .63];
  const rustScale = role === 'paint' ? 1 : role === 'metal' ? .7 : .45;
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const i = y * resolution + x, k = i * 4, u = (x + .5) / resolution, v = (y + .5) / resolution;
    const broad = noise(u, v, 7, salt), fine = noise(u, v, 31, salt ^ 0x394e7c1a);
    const vertical = noise(u, v, 17, salt ^ 0x2af16b71) * .8 + noise(u, v, 3, salt ^ 0x798e413c) * .2;
    const scratch = Math.abs(Math.sin((u * 37 + fine * .25) * Math.PI)) ** 28;
    const dripBase = .5 + .5 * Math.cos(TAU * v);
    const rust = coverage(p.rust * rustScale, .68 * broad + .32 * fine, .1 * dripBase + .05 * vertical);
    const chips = role === 'paint' ? coverage(p.chips, .55 * broad + .45 * fine, .04 * scratch) : 0;
    const dirt = coverage(p.dirt, .65 * vertical + .35 * broad, .16 * dripBase);
    const wear = coverage(p.wear, .48 * fine + .32 * broad + .2 * (1 - scratch), .06 * scratch);
    masks.rust[i] = byte(rust); masks.chips[i] = byte(chips); masks.dirt[i] = byte(dirt); masks.wear[i] = byte(wear);
    const exposed = clamp(chips + wear * (role === 'paint' ? .48 : .12));
    const oxide = [.46 + .18 * fine, .19 + .08 * fine, .075 + .035 * fine];
    for (let c = 0; c < 3; c++) base[k + c] = byte((paint[c] * (1 - exposed) + bare[c] * exposed) * (1 - rust) * (1 - dirt * .38) + oxide[c] * rust * (1 - dirt * .2));
    base[k + 3] = 255;
    orm.set([255, byte(clamp((role === 'paint' ? .36 : .26) + fine * .1 + rust * .4 + dirt * .3 + wear * .16)), byte(clamp((role === 'paint' ? .28 : .82) * (1 - rust) + exposed * .45 * (1 - rust))), 255], k);
    height[i] = (fine - .5) * .045 - chips * .09 + rust * (.055 * broad - .025) + dirt * .035;
  }
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const i = y * resolution + x, k = i * 4;
    const dx = (height[y * resolution + (x + 1) % resolution] - height[y * resolution + (x + resolution - 1) % resolution]) * 2;
    const dy = (height[((y + 1) % resolution) * resolution + x] - height[((y + resolution - 1) % resolution) * resolution + x]) * 2;
    const length = Math.hypot(dx, dy, 1);
    normal.set([byte((1 - dx / length) / 2), byte((1 - dy / length) / 2), byte((1 + 1 / length) / 2), 255], k);
  }
  return {base, normal, orm, height, masks};
}

export function maskRGBA(mask) {
  const rgba = new Uint8Array(mask.length * 4);
  for (let i = 0; i < mask.length; i++) rgba.set([mask[i], mask[i], mask[i], 255], i * 4);
  return rgba;
}
