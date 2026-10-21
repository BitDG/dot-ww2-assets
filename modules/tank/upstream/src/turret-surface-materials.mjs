import * as THREE from "three";

const surfaceCache = new Map();
const MAP_NAMES = Object.freeze(["baseColor", "normal", "roughness"]);

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hashNoise(x, y, seed) {
  let value = Math.imul((x | 0) ^ seed, 374761393) + Math.imul((y | 0) ^ (seed >>> 1), 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function valueNoise(x, y, cellSize, seed) {
  const gx = Math.floor(x / cellSize); const gy = Math.floor(y / cellSize);
  const tx = smoothstep((x / cellSize) - gx); const ty = smoothstep((y / cellSize) - gy);
  const a = hashNoise(gx, gy, seed); const b = hashNoise(gx + 1, gy, seed);
  const c = hashNoise(gx, gy + 1, seed); const d = hashNoise(gx + 1, gy + 1, seed);
  const top = a + (b - a) * tx; const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function seedFromText(text) {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function rgba(target, index, red, green, blue, alpha = 255) {
  target[index] = clampByte(red); target[index + 1] = clampByte(green);
  target[index + 2] = clampByte(blue); target[index + 3] = alpha;
}

export function turretSurfaceCacheKey({ skinId, resolution, weathering, generatorId = "tank-surface-baker-v1" }) {
  return `${generatorId}:${skinId}:${resolution}:${Number(weathering).toFixed(3)}`;
}

export function buildTurretSurfacePixels({ resolution, weathering = 0.16, seed = 1 }) {
  if (!Number.isInteger(resolution) || resolution < 16) throw new Error("Turret surface resolution must be an integer of at least 16.");
  const pixelCount = resolution * resolution;
  const baseColor = new Uint8ClampedArray(pixelCount * 4);
  const height = new Uint8ClampedArray(pixelCount);
  const roughness = new Uint8ClampedArray(pixelCount * 4);
  const normal = new Uint8ClampedArray(pixelCount * 4);
  const panelSpacing = Math.max(16, Math.round(resolution / 4));
  const weldWidth = Math.max(1, Math.round(resolution / 512));
  const coarseCell = Math.max(8, Math.round(resolution / 18));
  const mediumCell = Math.max(4, Math.round(resolution / 54));
  const chipThreshold = 0.9982 - weathering * 0.014;

  for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
    const pixel = y * resolution + x; const offset = pixel * 4;
    const panelDistance = Math.min(x % panelSpacing, y % panelSpacing);
    const seam = panelDistance <= weldWidth;
    const weld = !seam && panelDistance <= weldWidth * 2;
    const coarse = valueNoise(x, y, coarseCell, seed + 11) - 0.5;
    const medium = valueNoise(x, y, mediumCell, seed + 29) - 0.5;
    const grain = hashNoise(x, y, seed + 47) - 0.5;
    const chip = hashNoise(x, y, seed + 71) > chipThreshold;
    const rustColumn = hashNoise(Math.floor(x / Math.max(2, resolution / 128)), 0, seed + 89);
    const rust = weathering > 0.04 && rustColumn > 0.986 - weathering * 0.018 && (y % panelSpacing) < panelSpacing * (0.18 + weathering);
    let tone = coarse * 18 + medium * 7 + grain * 4;
    if (seam) tone -= 15;
    if (weld) tone += 5;
    if (chip) tone -= 42;
    const rustAmount = rust ? 1 : 0;
    rgba(baseColor, offset, 188 + tone - rustAmount * 48, 195 + tone - rustAmount * 72, 199 + tone - rustAmount * 88);
    height[pixel] = clampByte(128 + coarse * 4 + grain * 3 + (seam ? -18 : 0) + (weld ? 13 : 0) + (chip ? -24 : 0));
    const rough = 174 + coarse * 15 + grain * 8 + (seam ? 23 : 0) + (weld ? 10 : 0) + (chip ? -36 : 0) + rustAmount * 25;
    rgba(roughness, offset, rough, rough, rough);
  }

  const heightAt = (x, y) => height[((y + resolution) % resolution) * resolution + ((x + resolution) % resolution)];
  for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
    const left = heightAt(x - 1, y); const right = heightAt(x + 1, y);
    const down = heightAt(x, y - 1); const up = heightAt(x, y + 1);
    let nx = (left - right) * 0.035; let ny = (down - up) * 0.035; let nz = 1;
    const length = Math.hypot(nx, ny, nz); nx /= length; ny /= length; nz /= length;
    rgba(normal, (y * resolution + x) * 4, (nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255);
  }

  return { resolution, baseColor, normal, roughness, mapNames: MAP_NAMES };
}

function canvasTexture(pixels, resolution, { color = false, name, anisotropy = 4 } = {}) {
  const canvas = document.createElement("canvas"); canvas.width = resolution; canvas.height = resolution;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas 2D is unavailable for procedural turret texture baking.");
  const image = context.createImageData(resolution, resolution); image.data.set(pixels); context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy; texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.userData.proceduralTurretSurface = true; texture.needsUpdate = true;
  return texture;
}

export function createProceduralTurretTextures(recipe, skin, { anisotropy = 4 } = {}) {
  if (typeof document === "undefined") return null;
  const resolution = recipe.material.textureResolution;
  const generatorId = skin.procedural?.generatorId ?? "tank-surface-baker-v1";
  const key = turretSurfaceCacheKey({ skinId: skin.id, resolution, weathering: recipe.material.weathering, generatorId }) + `:${recipe.seed ?? 1}`;
  const cached = surfaceCache.get(key);
  if (cached) { cached.hits += 1; return cached; }
  const pixels = buildTurretSurfacePixels({ resolution, weathering: recipe.material.weathering, seed: seedFromText(`${generatorId}:${skin.id}:${recipe.seed ?? 1}`) });
  const entry = {
    key, hits: 0, resolution, uvScale: skin.procedural?.uvScale ?? 0.34,
    baseColor: canvasTexture(pixels.baseColor, resolution, { color: true, name: `${key}:baseColor`, anisotropy }),
    normal: canvasTexture(pixels.normal, resolution, { name: `${key}:normal`, anisotropy }),
    roughness: canvasTexture(pixels.roughness, resolution, { name: `${key}:roughness`, anisotropy }),
  };
  surfaceCache.set(key, entry);
  while(surfaceCache.size>8){const oldest=surfaceCache.keys().next().value;const old=surfaceCache.get(oldest);for(const name of MAP_NAMES)old[name].dispose();surfaceCache.delete(oldest);}
  return entry;
}

export function proceduralTurretSurfaceCacheStats() {
  return { entries: surfaceCache.size, keys: [...surfaceCache.keys()], hits: [...surfaceCache.values()].reduce((sum, entry) => sum + entry.hits, 0) };
}
