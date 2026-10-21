/** Pure presentation choreography. Art units, authored curves, no physical model. */
export const TICK_RATE = 120;
// Fixed display pose and camera-exit direction, not a measured weapon elevation.
export const ART_FORWARD = Object.freeze([0, .24, .9707728879609278]);
export const QUALITY = Object.freeze({ low: { trailEvery: 4, smokeCount: 7 }, medium: { trailEvery: 2, smokeCount: 12 }, high: { trailEvery: 1, smokeCount: 18 } });
export const DEFAULTS = Object.freeze({ version: 1, seed: 8137, duration: 8, trail: .8, smoke: 1, quality: 'medium' });
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function validateConfig(input = DEFAULTS) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new TypeError('Unsupported presentation recipe');
  const out = { version: 1 };
  for (const [k, lo, hi] of [['seed', 0, 4294967295], ['duration', 6, 14], ['trail', 0, 1.5], ['smoke', 0, 2]]) {
    if (typeof input[k] !== 'number' || !Number.isFinite(input[k]) || input[k] < lo || input[k] > hi || (k === 'seed' && !Number.isInteger(input[k]))) throw new RangeError(`Invalid ${k}`);
    out[k] = input[k];
  }
  if (!Object.hasOwn(QUALITY, input.quality)) throw new RangeError('Invalid smoke quality');
  out.quality = input.quality;
  return out;
}
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
export function shuffledCues(seed) {
  const r = seededRandom(seed), a = [0, 1, 2, 3, 4, 5];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function validateSockets(sockets) {
  if (!Array.isArray(sockets) || sockets.length !== 6) throw new TypeError('Six visual anchors required');
  const copy = sockets.map(p => { if (!Array.isArray(p) || p.length !== 3 || p.some(v => !Number.isFinite(v))) throw new TypeError('Finite anchor required'); return [...p]; });
  if (new Set(copy.map(p => p.join(','))).size !== 6) throw new TypeError('Anchors must be distinct');
  return copy;
}
const vec = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const unit = p => { const m = Math.hypot(...p); return m > 1e-10 ? p.map(v => v / m) : [0, 0, 1]; };
export function bezier(points, t) {
  t = clamp(t, 0, 1);
  const a = vec(points[0], points[1], t), b = vec(points[1], points[2], t), c = vec(points[2], points[3], t);
  return vec(vec(a, b, t), vec(b, c, t), t);
}
export function tangent(points, t) {
  const a = sub(points[1], points[0]), b = sub(points[2], points[1]), c = sub(points[3], points[2]);
  return unit(a.map((v, i) => (1 - t) ** 2 * v + 2 * (1 - t) * t * b[i] + t * t * c[i]));
}
export function createScore(input, anchors) {
  const config = validateConfig(input), sockets = validateSockets(anchors), order = shuffledCues(config.seed);
  const totalTicks = Math.round(config.duration * TICK_RATE);
  // Short display-only transit to leave the camera, no flight/weapon model.
  const flightTicks = 26, cueSpan = Math.round(totalTicks * .34);
  const cues = order.map((index, ordinal) => {
    const start = sockets[index];
    const along = distance => start.map((v,k) => v + ART_FORWARD[k] * distance);
    const curve = [start, along(28/3), along(56/3), along(28)];
    return { index, ordinal, at: Math.round(totalTicks * .055 + ordinal / 5 * cueSpan), flightTicks, curve };
  });
  return { config, cues, totalTicks };
}
export function sampleCue(cue, tick) {
  const u = clamp((tick - cue.at) / cue.flightTicks, 0, 1);
  return { index: cue.index, visible: tick >= cue.at && tick < cue.at + cue.flightTicks, progress: u, position: bezier(cue.curve, u), direction: tangent(cue.curve, u), opacity: 1 };
}
export function frameAt(score, tick) {
  return { tick, progress: clamp(tick / score.totalTicks, 0, 1), fired: score.cues.filter(c => tick >= c.at).map(c => c.index), rockets: score.cues.map(c => sampleCue(c, tick)) };
}
/** Fixed tick stream makes emission/RNG identical under different render frame chunks. */
export class PresentationSequence {
  constructor(config, sockets, hooks = {}) { this.score = createScore(config, sockets); this.hooks = hooks; this.state = 'idle'; this.tick = 0; this.remainder = 0; this.active = true; this.disposed = false; }
  play() { if (this.disposed) return; this.hooks.reset?.(this.score.config); this.tick = 0; this.remainder = 0; this.state = 'playing'; this.hooks.frame?.(this.snapshot()); }
  pause() { if (!this.disposed && this.state === 'playing') this.state = 'paused'; }
  resume() { if (!this.disposed && this.state === 'paused') this.state = 'playing'; }
  reset() { if (this.disposed) return; this.hooks.reset?.(this.score.config); this.tick = 0; this.remainder = 0; this.state = 'idle'; this.hooks.frame?.(this.snapshot()); }
  setActive(active) { this.active = !!active; }
  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Finite positive frame delta required');
    if (this.disposed || !this.active || this.state !== 'playing') return this.snapshot();
    this.remainder += seconds * TICK_RATE;
    const count = Math.min(Math.floor(this.remainder + 1e-8), this.score.totalTicks - this.tick);
    this.remainder = Math.max(0, this.remainder - count);
    for (let n = 0; n < count; n++) {
      this.tick++;
      for (const cue of this.score.cues) {
        if (this.tick === cue.at) this.hooks.launch?.({ ...sampleCue(cue, this.tick), ordinal: cue.ordinal });
        const every = QUALITY[this.score.config.quality].trailEvery;
        if (this.score.config.trail > 0 && this.tick >= cue.at && this.tick < cue.at + cue.flightTicks && (this.tick - cue.at) % every === 0) {
          const current = sampleCue(cue, this.tick);
          if (current.progress < .82) this.hooks.trail?.(current);
        }
      }
      this.hooks.step?.(1 / TICK_RATE);
    }
    if (this.tick === this.score.totalTicks) { this.state = 'complete'; this.remainder = 0; this.hooks.finish?.(); }
    this.hooks.frame?.(this.snapshot());
    return this.snapshot();
  }
  snapshot() { return { state: this.state, active: this.active, disposed: this.disposed, ...frameAt(this.score, this.tick) }; }
  dispose() { if (this.disposed) return; this.hooks.reset?.(this.score.config); this.hooks.dispose?.(); this.hooks = {}; this.disposed = true; this.state = 'disposed'; this.remainder = 0; }
}
