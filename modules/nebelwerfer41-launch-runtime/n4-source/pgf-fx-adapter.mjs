import { QUALITY, validateConfig, seededRandom } from './sequence-core.mjs';
/** Dependency injection keeps the exact PGF call contract testable without WebGL. */
export function createPgfFxAdapter({ THREE, scene, createTankShotEffects, defaultVisualEffects, config }) {
  let current = validateConfig(config), disposed = false, counters = { launches: 0, trailPuffs: 0, dustBursts: 0, ticks: 0 }, random = seededRandom(current.seed);
  const previous = new Map();
  const runtime = createTankShotEffects(scene);
  const vector = p => new THREE.Vector3(...p);
  function reset(next = current) {
    if (disposed) return;
    current = validateConfig(next); runtime.clear(); runtime.setSeed(current.seed);
    const look = defaultVisualEffects();
    // Neutral art colors: monochrome footage does not establish historical hues.
    look.flame.tint = true; look.flame.color = '#eee9d8';
    Object.assign(look.muzzleSmoke, { count: current.smoke, size: 1.25, life: .9, opacity: .72, spread: .72, rise: .55, turbulence: 1.3, tint: true, color: '#b4b5af' });
    Object.assign(look.blastDust, { count: current.smoke * .45, size: 1.25, life: Math.min(.28, current.duration * .035), opacity: .5, spread: .55, rise: .35, wind: .4, tint: true, color: '#93938a' });
    runtime.setPreview(look); previous.clear(); random = seededRandom(current.seed ^ 0x4e34);
    counters = { launches: 0, trailPuffs: 0, dustBursts: 0, ticks: 0 };
  }
  reset();
  return {
    reset,
    launch(cue) {
      if (disposed) return;
      // The legacy API's third slot is a visual size scaler only. It is deliberately
      // constant and carries no information about the prop, ammunition, or dimensions.
      runtime.emit(vector(cue.position), vector(cue.direction), 42, false, {
        flashLength: .38, flashWidth: .70, flashDurationS: .055, flashOpacity: .6,
        lightIntensity: 1.2, smokeCount: QUALITY[current.quality].smokeCount,
        smokeLifeS: 3.3, smokeSpread: .8, smokeRise: .16,
      });
      if (current.smoke > 0) {
        // Authored low dust layer, not a physical backblast or terrain model.
        runtime.emitGroundBlast(vector([cue.position[0], .06, cue.position[2] - .2]), vector(cue.direction), 42, 0, .7);
        counters.dustBursts++;
      }
      previous.set(cue.index, [...cue.position]);
      counters.launches++;
    },
    trail(cue) {
      if (disposed || current.trail === 0) return;
      if (cue.progress > Math.min(.45, current.trail * .27)) return;
      const from = previous.get(cue.index) ?? cue.position;
      const distance = Math.hypot(...cue.position.map((v,i) => v - from[i]));
      // Spatial samples overlap softly, with seeded irregular gaps, rather than beads.
      const count = Math.max(1, Math.min(20, Math.ceil(distance / .12)));
      for (let i = 0; i < count; i++) {
        if (cue.progress > .05 && random() < .13) continue;
        const t = (i + .35 + random() * .65) / count;
        const p = cue.position.map((v,k) => from[k] + (v-from[k])*t + (random()-.5)*.07);
        runtime.emitRocketTrail(vector(p), vector(cue.direction)); counters.trailPuffs++;
      }
      previous.set(cue.index, [...cue.position]);
    },
    step(dt) { if (!disposed) { runtime.update(dt); counters.ticks++; } },
    finish() { if (!disposed) runtime.clear(); },
    diagnostics() { return { ...counters, disposed, live: disposed ? 0 : runtime.count, upstream: disposed ? null : runtime.snapshot() }; },
    dispose() { if (disposed) return; runtime.clear(); runtime.dispose(); disposed = true; },
  };
}
