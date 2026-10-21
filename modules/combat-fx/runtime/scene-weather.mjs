export const WEATHER_PRESETS = Object.freeze({
  clear: { intensity: 0, speed: .6, haze: .34, heat: .65 },
  dust: { intensity: .38, speed: 3.4, haze: .56, heat: .85 },
  storm: { intensity: 1, speed: 8, haze: .82, heat: .45 },
});

export function createWeather() {
  let preset = 'dust', direction = 65, angle = direction * Math.PI / 180, time = 0, enabled = false, biome = 'sand';
  const values = { ...WEATHER_PRESETS.dust };
  return {
    setPreset(id) { if (!WEATHER_PRESETS[id]) throw new Error(`Unknown weather: ${id}`); preset = id; },
    setDirection(degrees) { if (!Number.isFinite(degrees)) throw new Error('Wind direction must be finite'); direction = ((degrees % 360) + 360) % 360; },
    update(dt, active = true, surface = 'sand') {
      enabled = active; biome = surface;
      if (!active) return;
      dt = Math.max(0, Math.min(.1, dt)); time += dt;
      const blend = 1 - Math.exp(-dt / 2);
      for (const key of Object.keys(values)) values[key] += (WEATHER_PRESETS[preset][key] - values[key]) * blend;
      const delta = Math.atan2(Math.sin(direction * Math.PI / 180 - angle), Math.cos(direction * Math.PI / 180 - angle));
      angle += delta * blend;
    },
    windAt(x = 0, z = 0) {
      if (!enabled) return { x: 0, z: 0 };
      const gust = 1 + .24 * Math.sin(time * .63) + .12 * Math.sin(time * 1.71);
      const turbulence = Math.sin(x * .047 + z * .033 + time * .8) * values.intensity * .45;
      return { x: Math.sin(angle) * values.speed * gust + Math.cos(angle) * turbulence, z: -Math.cos(angle) * values.speed * gust + Math.sin(angle) * turbulence };
    },
    snapshot() { return { preset, direction, angle, time, enabled, biome, ...values, heat: biome === 'sand' ? values.heat : 0, wind: this.windAt() }; },
  };
}

// One field per editor module realm, shared by the sky and all dust emitters.
export const sceneWeather = createWeather();
