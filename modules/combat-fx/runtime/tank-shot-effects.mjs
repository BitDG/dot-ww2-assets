import * as THREE from 'three';
import { sceneWeather } from './scene-weather.mjs';
import { defaultVisualEffects, validateVisualEffects } from './visual-effects-config.mjs';
import { installVolumeParticle, updateVolumeParticle } from './volume-particle-material.mjs';

// Brief combustion, then entrained smoke. Sprite bounds contain a ray-integrated
// 3D density field; retained maps keep borrowed particle consumers compatible.
export function createTankShotEffects(scene) {
  let previewSettings = null;
  const defaults = defaultVisualEffects();
  const visual = () => previewSettings ?? defaults;
  let seed = 8137;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u),
      THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
  };
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const nx = (x - 128) / 120, ny = (y - 128) / 120;
    const n = noise(x / 35, y / 35) * .6 + noise(x / 13, y / 13) * .28 + noise(x / 5, y / 5) * .12;
    const edge = 1 - Math.hypot(nx, ny) + (n - .5) * .48;
    const alpha = THREE.MathUtils.smoothstep(edge, 0, .3) * (.25 + n * .75);
    const shade = Math.round(130 + n * 100 + (1 - ny) * 12);
    const k = (y * 256 + x) * 4;
    pixels.data[k] = pixels.data[k + 1] = pixels.data[k + 2] = shade;
    pixels.data[k + 3] = Math.round(alpha * 255);
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  // Wind-torn dust sheet: a warped, broken ribbon, with no radial falloff.
  const dustCanvas = document.createElement('canvas'); dustCanvas.width = dustCanvas.height = 256;
  const dustContext = dustCanvas.getContext('2d'), dustPixels = dustContext.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = y / 255;
    const coarse = noise(x / 44, y / 38), detail = noise(x / 12 + 37, y / 10);
    const center = .5 + .13 * Math.sin(u * 11) + (coarse - .5) * .22;
    const ribbon = Math.max(0, 1 - Math.abs(v - center) / (.16 + coarse * .25));
    const ends = THREE.MathUtils.smoothstep(u, .02, .2) * (1 - THREE.MathUtils.smoothstep(u, .78, .98));
    const alpha = ends * ribbon * THREE.MathUtils.smoothstep(coarse * .65 + detail * .35, .27, .7);
    const k = (y * 256 + x) * 4, shade = 170 + detail * 75;
    dustPixels.data[k] = dustPixels.data[k + 1] = dustPixels.data[k + 2] = shade;
    dustPixels.data[k + 3] = Math.round(alpha * 220);
  }
  dustContext.putImageData(dustPixels, 0, 0); const dustTexture = new THREE.CanvasTexture(dustCanvas);
  // Reuse shader-initialized materials, keeping a separate material per live
  // particle. Texture, blending and tone mapping never change within a bucket.
  const materialPool = new Map(); let pooled = 0, reused = 0, allocated = 0;
  const poolLimit = 1040;
  function particleMaterial(options, volume = true) {
    const key = `${volume}:${options.map === dustTexture}:${options.toneMapped ?? true}:${options.blending ?? THREE.NormalBlending}`;
    const available = materialPool.get(key), material = available?.pop();
    if (material) { pooled--; reused++; material.setValues({ color: 0xffffff, rotation: 0, opacity: 0, ...options }); return material; }
    const created = new THREE.SpriteMaterial(options); if(volume)installVolumeParticle(created); created.userData.particlePoolKey = key; allocated++; return created;
  }
  function releaseMaterial(material) {
    if (pooled >= poolLimit) { material.dispose(); return; }
    const key = material.userData.particlePoolKey;
    if (!materialPool.has(key)) materialPool.set(key, []);
    materialPool.get(key).push(material); pooled++;
  }
  // Keep the light count invariant: adding a PointLight on each shot recompiles
  // every lit vehicle/terrain shader and used to stall the first shot >1 second.
  const flashLight = new THREE.PointLight('#ffe5b3', 0, 6, 2); scene.add(flashLight);
  const warmSprites = [true, false].map(toneMapped => {
    const material = installVolumeParticle(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped }));
    const sprite = new THREE.Sprite(material); sprite.scale.setScalar(.00001); sprite.frustumCulled = false; scene.add(sprite); return sprite;
  });
  const warmExhaust = new THREE.Sprite(new THREE.SpriteMaterial({map:dustTexture,transparent:true,opacity:0,depthWrite:false}));
  warmExhaust.scale.setScalar(.00001);warmExhaust.frustumCulled=false;scene.add(warmExhaust);warmSprites.push(warmExhaust);
  const shots = [];
  const dust = [];
  const ambient = [];
  let exhaustClock = 0, engineAge = 0, engineRunning = false, destructionAge = Infinity;
  let exhaustEmitted = 0, explosionEmitted = 0, exhaustLoad = 0;
  const exhaustEmitters = new Map();
  let wreck = null;
  const wreckFires = new Map(); let fireSerial = 0, impactCount = 0, lastImpact = null;
  function puff(kind, origin, velocity, size, life, color, opacity = .6, delay = 0, blending = kind === 'spark' ? THREE.AdditiveBlending : THREE.NormalBlending) {
    const material = particleMaterial({ map: kind === 'exhaust' ? dustTexture : texture, color, transparent: true,
      opacity: 0, depthWrite: false, rotation: random() * Math.PI * 2,
      toneMapped: kind !== 'fire',
      blending }, kind !== 'exhaust');
    const sprite = new THREE.Sprite(material); sprite.position.copy(origin); sprite.scale.setScalar(size); scene.add(sprite);
    sprite.userData.thermalKind = kind;
    const particle = { kind, sprite, origin: origin.clone(), velocity, size, life, opacity, age: -delay, seed: random() * 90,
      fireColor: kind === 'fire' ? new THREE.Color(color) : null }; ambient.push(particle);
    if(kind==='exhaust'){
      particle.stretch=1.8+random()*1.3;particle.flatten=.65+random()*.5;
      particle.rotation=(random()-.5)*1.1;particle.spin=(random()-.5)*.3;
      particle.windOffset=new THREE.Vector3();
    }
    while (ambient.length > 240) { const p = ambient.shift(); p.sprite.removeFromParent(); releaseMaterial(p.sprite.material); }
    return particle;
  }
  function exhaustRibbon(position,direction,width,load=0,startup=false,emitter='player'){
    const previous=emitter===null?null:exhaustEmitters.get(emitter),distance=previous?.distanceTo(position)??0;
    const continuous=previous&&distance<width*8,spacing=Math.max(.16,width*.075);
    const count=continuous?Math.min(24,Math.max(1,Math.ceil(distance/spacing))):1;
    const scale=width/3,side=new THREE.Vector3(direction.z,0,-direction.x).normalize();
    for(let i=0;i<count;i++){
      const t=(i+.3+random()*.7)/count;
      const origin=continuous?previous.clone().lerp(position,t):position.clone();
      origin.addScaledVector(side,(random()-.5)*.16*scale);origin.y+=(random()-.5)*.08*scale;
      const velocity=direction.clone().multiplyScalar(.45+load*.65).addScaledVector(side,(random()-.5)*.5).add(new THREE.Vector3(0,.15+random()*.2,0));
      puff('exhaust',origin,velocity,(.35+random()*.16)*scale*(1+load*.45),2.2+random()*1.3,
        startup||load>.45?0x626765:0x8c9190,(startup?.22:.14)+load*.1);
      exhaustEmitted++;
    }
    if(emitter!==null)exhaustEmitters.set(emitter,position.clone());
  }
  function emitExhaust(dt, running, speed, position, direction, width = 3) {
    if (!running) { engineRunning = false; engineAge = 0; exhaustClock = 0; exhaustLoad = 0; exhaustEmitters.delete('player'); return; }
    if (!engineRunning) { engineAge = 0; exhaustClock = .1; }
    engineRunning = true; engineAge += dt; exhaustClock += dt;
    const startup = engineAge < 1.2;
    const targetLoad = Math.min(1, Math.abs(speed) / 2.4);
    exhaustLoad += (targetLoad - exhaustLoad) * (1 - Math.exp(-dt * 3));
    const interval = 1 / (12 + exhaustLoad * 16);
    let steps = 0;
    while (exhaustClock >= interval && steps++ < 3) {
      exhaustClock -= interval;
      exhaustRibbon(position,direction,width,exhaustLoad,startup);
    }
  }
  function emitExplosion(position, width, groundY, catastrophic = false) {
    const scale = width / 3, radius = catastrophic ? 1.5 : .65;
    const count = catastrophic ? 36 : 14;
    const smoke = visual().impactSmoke, flame = visual().flame;
    for (let i = 0; i < count; i++) {
      const velocity = new THREE.Vector3((random() - .5) * 8, 1 + random() * 5, (random() - .5) * 8).multiplyScalar(scale);
      puff('fire', position, velocity, (.6 + random()) * radius * scale, .3 + random() * .5, flame.tint ? flame.color : 0xffa342, .85, i * .008);
    }
    for (let i = 0; i < Math.round(count * smoke.count); i++) {
      const velocity = new THREE.Vector3((random() - .5) * 4, .5 + random() * 2.5, (random() - .5) * 4).multiplyScalar(scale);
      const particle = puff('smoke', position, velocity, (.7 + random()) * radius * scale * smoke.size,
        (5 + random() * 3) * smoke.life, smoke.tint ? smoke.color : 0x67615b, .58 * smoke.opacity, .3 + i * .01);
      particle.look = smoke;
    }
    for (let i = 0; i < (catastrophic ? 42 : 18); i++) {
      puff('spark', position, new THREE.Vector3((random() - .5) * 15, 3 + random() * 10, (random() - .5) * 15).multiplyScalar(scale),
        (.035 + random() * .055) * scale, .6 + random() * 1.2, flame.tint ? flame.color : 0xffc477, 1.5);
    }
    emitGroundBlast(position, new THREE.Vector3(0, 0, 1), catastrophic ? 220 : 90, groundY);
    explosionEmitted++;
    if (catastrophic) { destructionAge = 0; wreck = { position: position.clone(), scale, next: .4, secondary: false }; }
  }
  let dustTravel = 0, blastDustEmitted = 0, trackDustEmitted = 0, rotorDustEmitted = 0, rotorDustClock = 0;
  let weatherClock = 0, weatherDustEmitted = 0, dustGroundAt = null;
  function addDust(position, velocity, size, life, opacity, groundY, kind, surface = null) {
      const config = { ...visual()[kind === 'track' ? 'trackDust' : 'blastDust'] };
      // Ambient weather and aircraft retain their authored emission and envelope.
      if (kind === 'weather' || kind === 'rotor') Object.assign(config, { count: 1, size: 1, opacity: 1, life: 1, spread: 1, rise: 1, wind: 1, tint: false });
      size *= config.size; life *= config.life; opacity *= config.opacity;
      velocity.multiplyScalar(config.spread);
      const material = particleMaterial({ map: kind === 'rotor' ? texture : dustTexture, color: surface?.color ?? 0xb69a72,
      transparent: true, opacity: 0, depthWrite: false, depthTest: true });
    const sprite = new THREE.Sprite(material); sprite.position.copy(position); scene.add(sprite);
    if (config.tint) material.color.set(config.color);
    sprite.scale.set(size, size * .3, 1); sprite.position.y = groundY + size * .15 + .015;
      dust.push({ sprite, origin: position.clone(), windOffset: new THREE.Vector3(), velocity, size, life: Math.max(.01, life * Math.min(1, (surface?.life ?? 2.6) / 2.6)), opacity, groundY, age: 0, kind, config, seed: random() * 90, surface: surface?.name ?? '沙地' });
    if (kind === 'blast') blastDustEmitted++; else if (kind === 'rotor') rotorDustEmitted++; else if (kind === 'weather') weatherDustEmitted++; else trackDustEmitted++;
    while (dust.length > 220) {
        const index = dust.findIndex(p => p.kind === kind);
        const [old] = dust.splice(Math.max(0, index), 1); old.sprite.removeFromParent(); releaseMaterial(old.sprite.material);
    }
  }
  function emitGroundBlast(position, direction, caliberMm, groundY, amount = 1, surface = null, visualScale = 1) {
    const scale = THREE.MathUtils.clamp(caliberMm / 120, .35, 1.8) * visualScale;
    const height = Math.max(0, position.y - groundY);
    const strength = Math.min(1.5, Math.max(0, amount)) / (1 + height * .18);
    const forward = direction.clone().setY(0).normalize();
    const side = new THREE.Vector3(forward.z, 0, -forward.x);
    for (let i = 0; i < Math.ceil(36 * Math.min(1, strength) * visual().blastDust.count); i++) {
      const angle = random() * Math.PI * 2;
      const radial = side.clone().multiplyScalar(Math.cos(angle)).addScaledVector(forward, Math.sin(angle));
      const origin = position.clone().addScaledVector(radial, random() * .65 * scale).addScaledVector(forward, .35 * scale);
      origin.y = groundY;
      addDust(origin, radial.multiplyScalar((2 + random() * 3.5) * scale).addScaledVector(forward, 1.4 * scale),
          (1.6 + random() * 1.4) * scale, 12 + random() * 3, (.52 + random() * .18) * strength, groundY, 'blast', surface);
    }
  }
    const trackEmitters = new Map();
  function emitTrackDust(distanceDelta, speed, contacts, groundY, surface = null, travel = new THREE.Vector3(0, 0, 1), emitter = null) {
    if (emitter !== null) dustTravel = trackEmitters.get(emitter) ?? 0;
    if (speed < .08) { dustTravel = 0; if(emitter !== null) trackEmitters.set(emitter,0); return; }
    dustTravel += Math.max(0, distanceDelta);
      const spacing = .7 / Math.max(.01, visual().trackDust.count);
      const steps = visual().trackDust.count === 0 ? 0 : Math.min(8, Math.floor(dustTravel / spacing));
      dustTravel = visual().trackDust.count === 0 ? 0 : dustTravel - steps * spacing;
      if(emitter !== null) trackEmitters.set(emitter,dustTravel);
      const side = new THREE.Vector3(travel.z, 0, -travel.x);
    for (let step = 0; step < steps; step++) for (const contact of contacts) {
      const origin = contact.clone(); const contactY = typeof groundY === 'function' ? groundY(contact.x, contact.z) : groundY; origin.y = contactY;
        origin.addScaledVector(side, (random() - .5) * .5);
        const sign = contacts.indexOf(contact) === 0 ? -1 : 1;
        addDust(origin, travel.clone().multiplyScalar(-.8 - speed * .32).addScaledVector(side, sign * (1 + random())),
          (2.3 + random() * 1.4) * Math.min(1.3, .65 + speed * .09), 7 + random() * 2,
          Math.min(.55, .22 + speed * .07), contactY, 'track', surface);
    }
  }
  function emitFormationDust(position,travel,groundAt,surface){
    const origin=position.clone().addScaledVector(travel,-12);origin.y=groundAt(origin.x,origin.z);
    addDust(origin,travel.clone().multiplyScalar(-3).add(new THREE.Vector3((random()-.5)*2,0,0)),10+random()*3,9,.38,origin.y,'rotor',surface);
    dust.at(-1).groundAt=groundAt;
  }
  function emitRocketTrail(position,direction){puff('smoke',position,direction.clone().multiplyScalar(-2),.35,1.2,0xc8c4b9,.6);}
  function emitRotorWash(dt, center, rpm, altitude, groundAt, surface) {
    const strength = THREE.MathUtils.smoothstep(rpm, .3, .95) * (1 - THREE.MathUtils.smoothstep(altitude, 2, 18));
    if (strength < .01) { rotorDustClock = 0; return; }
    rotorDustClock += Math.min(dt, .1) * 32 * strength;
    const count = Math.min(4, Math.floor(rotorDustClock)); rotorDustClock -= count;
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const origin = center.clone().addScaledVector(radial, 3 + random() * (4 + altitude * .12));
      origin.y = groundAt(origin.x, origin.z);
      addDust(origin, radial.multiplyScalar(3 + strength * 4 + random() * 2),
        4 + random() * 2, 3 + random() * 1.5, (.5 + random() * .18) * strength, origin.y, 'rotor', surface);
      dust.at(-1).groundAt = groundAt;
    }
  }
  function emitWindDust(dt, center, groundAt, surface) {
    dustGroundAt = groundAt;
    const weather = sceneWeather.snapshot();
    if (!weather.enabled || weather.intensity < .005) { weatherClock = 0; return; }
    weatherClock += Math.min(dt, .1) * weather.intensity * 12;
    const count = Math.min(3, Math.floor(weatherClock)); weatherClock -= count;
    for (let i = 0; i < count; i++) {
      if (dust.filter(p => p.kind === 'weather').length >= 80) break;
      const origin = center.clone().add(new THREE.Vector3((random() - .5) * 110, 0, (random() - .5) * 110));
      origin.y = groundAt(origin.x, origin.z);
      addDust(origin, new THREE.Vector3(), 7 + random() * 9, 6 + random() * 4, .14 + weather.intensity * .27, origin.y, 'weather', surface);
      dust.at(-1).groundAt = groundAt;
    }
  }
  let emitted = 0;
  function clear() {
    flashLight.intensity = 0;
    trackEmitters.clear(); dustTravel = 0; rotorDustClock = 0; weatherClock = 0; dustGroundAt = null; wreckFires.clear();
    engineRunning = false; engineAge = 0; exhaustClock = 0; destructionAge = Infinity; wreck = null;
    exhaustEmitters.clear();
    for (const p of ambient.splice(0)) { p.sprite.removeFromParent(); releaseMaterial(p.sprite.material); }
    for (const p of dust.splice(0)) { p.sprite.removeFromParent(); releaseMaterial(p.sprite.material); }
    for (const shot of shots.splice(0)) {
      for (const particle of shot.particles) releaseMaterial(particle.sprite.material);
      shot.group.removeFromParent();
    }
  }
  function emit(position, direction, caliberMm, blueprint = false, settings = {}) {
    const config = { flashLength: 1, flashWidth: 1, flashDurationS: .085, flashOpacity: .8, flashColor: '#ffe5b3', smokeColor: blueprint ? '#7b8a92' : '#b7b5ac', lightIntensity: 9, smokeCount: 24, smokeLifeS: 4.5, smokeSpread: 1, smokeRise: .1, ...structuredClone(settings) };
    const look = structuredClone(visual()), flame = look.flame, smoke = look.muzzleSmoke;
    config.flashLength *= flame.length; config.flashWidth *= flame.width;
    config.flashDurationS = Math.max(.001, config.flashDurationS * flame.duration);
    config.flashOpacity *= flame.opacity; config.lightIntensity *= flame.light;
    config.smokeCount = Math.min(48, Math.round(config.smokeCount * smoke.count));
    config.smokeLifeS = Math.max(.01, config.smokeLifeS * smoke.life);
    config.smokeSpread *= smoke.spread; config.smokeRise *= smoke.rise;
    if (flame.tint) config.flashColor = flame.color;
    if (smoke.tint) config.smokeColor = smoke.color;
    const scale = THREE.MathUtils.clamp(caliberMm / 120, .35, 1.8);
    const group = new THREE.Group(); group.position.copy(position);
    // World-space plume stays at the firing position while the gun recoils.
    const forward = direction.clone().normalize();
    const side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const particles = [];
    const add = (kind, offset, velocity, size, life, delay, opacity) => {
      const flash = kind === 'flash' || kind === 'flame';
      const material = particleMaterial({ map: texture, color: flash ? config.flashColor : config.smokeColor,
        transparent: true, opacity: 0, depthWrite: false, depthTest: true,
        blending: kind === 'flash' ? THREE.AdditiveBlending : THREE.NormalBlending, rotation: random() * Math.PI * 2 });
      const sprite = new THREE.Sprite(material); sprite.position.copy(offset); group.add(sprite);
      sprite.userData.thermalKind = kind === 'flash' || kind === 'flame' ? 'fire' : kind;
      particles.push({ kind, sprite, origin: offset, velocity, size: size * (flash ? 1 : smoke.size), life, delay, opacity: opacity * (flash ? 1 : smoke.opacity), seed: random() * 90, look: flash ? flame : smoke });
    };
    for (let i = 0; i < 5; i++) {
      add(i === 0 ? 'flash' : 'flame', forward.clone().multiplyScalar((.1 + i * .19) * scale * config.flashLength), new THREE.Vector3(),
        (.8 - i * .11) * scale * config.flashWidth, config.flashDurationS * (1 + i * .12), i * .004, config.flashOpacity * (i === 0 ? .35 : 1) * (blueprint ? .5 : 1));
    }
    for (let i = 0; i < Math.min(48, config.smokeCount); i++) {
      const spread = (random() - .5) * 2;
      const velocity = forward.clone().multiplyScalar((3 + random() * 8) * scale)
        .addScaledVector(side, spread * 3.1 * scale * config.smokeSpread);
      velocity.y += (random() - .3) * 2.5 * scale * config.smokeSpread;
      add('smoke', forward.clone().multiplyScalar(random() * .6 * scale).addScaledVector(side, (random() - .5) * .35 * scale), velocity,
        (.7 + random() * 1.1) * scale, config.smokeLifeS * (.8 + random() * .4), i * .004,
        blueprint ? .20 : .48 + random() * .14);
    }
    // A faint residual wisp emerges after the pressure plume has left the bore.
    for (let i = 0; i < Math.min(5, config.smokeCount); i++) add('wisp', new THREE.Vector3(), forward.clone().multiplyScalar(.25).add(new THREE.Vector3(0, .22, 0)),
      .2 * scale, config.smokeLifeS * .4, .16 + i * .09, .18);
    scene.add(group); shots.push({ group, particles, age: 0, scale, config }); emitted++;
    while (shots.length > 10) {
      const expired = shots.shift(); expired.group.removeFromParent();
      for (const particle of expired.particles) releaseMaterial(particle.sprite.material);
    }
    update(0);
  }
  function update(dt) {
    flashLight.intensity = 0;
    for (const [id, fire] of wreckFires) {
      fire.age += dt; fire.clock += dt;
      if (fire.age < fire.delay) continue;
      if (fire.age > fire.duration) { wreckFires.delete(id); continue; }
      const strength = 1 - THREE.MathUtils.smoothstep(fire.age, fire.duration * .65, fire.duration);
      let steps = 0;
      while (fire.clock >= .12 && steps++ < 3) {
        fire.clock -= .12;
        for (const site of fire.sites) {
          const origin = site.clone().add(new THREE.Vector3((random() - .5) * .4, 0, (random() - .5) * .4));
          const vent = fire.vented && fire.age < 4 ? 2.5 : 1;
          const tongue = puff('fire', origin, new THREE.Vector3((random() - .5) * .5, (2.1 + random() * 2.1) * vent, (random() - .5) * .5),
            fire.scale * (.5 + random() * .45) * strength, .65 + random() * .45, fire.color, .9 * strength, 0, THREE.AdditiveBlending);
          tongue.column = true;
          const smokeCount = Math.floor(fire.smoke) + (random() < fire.smoke % 1 ? 1 : 0);
          for (let i = 0; i < smokeCount; i++) puff('smoke', origin.clone().add(new THREE.Vector3(0, fire.scale * .6, 0)),
            new THREE.Vector3(.4, 1.4 + random() * 1.3, .2), fire.scale * (1 + random()),
            (5 + random() * 3) * fire.smokeLife, 0x343638, .34 * strength);
        }
      }
    }
    if (wreck) {
      destructionAge += dt;
      if (!wreck.secondary && destructionAge > 1.1) {
        wreck.secondary = true;
        for (let j = 0; j < 12; j++) puff('fire', wreck.position,
          new THREE.Vector3((random() - .5) * 3, 3 + random() * 5, (random() - .5) * 3),
          wreck.scale * (1 + random()), .8, 0xff762c, 1.2);
      }
      if (destructionAge >= wreck.next && destructionAge < 8) {
        wreck.next += .18;
        const origin = wreck.position.clone().add(new THREE.Vector3((random() - .5) * wreck.scale, 0, (random() - .5) * wreck.scale));
        puff('fire', origin, new THREE.Vector3(0, 1.7, 0), wreck.scale, .8, 0xff7b28, 1);
        puff('smoke', origin, new THREE.Vector3(.2, 1.4, .1), 1.4 * wreck.scale, 5, 0x343331, .68);
      }
      if (destructionAge > 8) wreck = null;
    }
    for (let i = ambient.length - 1; i >= 0; i--) {
      const p = ambient[i]; p.age += dt;
      if (p.age >= p.life) { p.sprite.removeFromParent(); releaseMaterial(p.sprite.material); ambient.splice(i, 1); continue; }
      p.sprite.visible = p.age >= 0;
      if (!p.sprite.visible) continue;
      updateVolumeParticle(p.sprite.material, p.age, p.look, p.seed, p.kind === 'fire' || p.kind === 'spark');
      p.sprite.userData.thermalExcess = (({ fire: 300, spark: 400, exhaust: 28, smoke: 6 })[p.kind] ?? 0) * Math.exp(-p.age / (p.kind === 'exhaust' ? .8 : 2));
      const t = p.age / p.life, ballistic = p.kind === 'spark' || p.kind === 'debris', hot = p.kind === 'fire' || p.kind === 'spark';
      p.sprite.position.copy(p.origin).addScaledVector(p.velocity, ballistic ? p.age : (1 - Math.exp(-p.age)));
      if (ballistic) { p.sprite.position.y -= 4.905 * p.age * p.age; if (p.sprite.position.y < (p.groundAt?.(p.sprite.position.x, p.sprite.position.z) ?? p.groundY ?? 0)) p.sprite.visible = false; }
      else { p.sprite.position.x += p.age * .22; p.sprite.position.y += p.age * (p.kind === 'exhaust' ? .16 : .5) * (p.look?.rise ?? 1); }
      if (p.column) p.sprite.scale.set(p.size * (.7 + p.age * .65), p.size * (1.8 + p.age * 1.7), 1);
      else p.sprite.scale.setScalar(p.size * (ballistic ? 1 : 1 + p.age * (hot ? 2 : .75)));
      p.sprite.material.opacity = p.opacity * Math.min(1, p.age / .05) * (1 - t) ** (hot ? .8 : 1.2);
      if(p.kind==='exhaust'){
        const wind=sceneWeather.windAt(p.sprite.position.x,p.sprite.position.z),entrainment=1-Math.exp(-p.age*.8);
        p.windOffset.addScaledVector(new THREE.Vector3(wind.x,0,wind.z),dt*entrainment*.65);
        p.sprite.position.add(p.windOffset).add(new THREE.Vector3(Math.sin(p.seed+p.age*1.7),Math.sin(p.seed*.7+p.age*1.1)*.35,Math.cos(p.seed+p.age*1.3)).multiplyScalar(p.age*.1));
        const spread=p.size*(1+p.age*.85);
        p.sprite.scale.set(spread*p.stretch,spread*p.flatten,1);
        p.sprite.material.rotation=p.rotation+p.spin*p.age;
        p.sprite.material.opacity*=Math.min(1,p.age/.12);
      }
      if (p.kind === 'fire') p.sprite.material.color.copy(p.fireColor).multiplyScalar(1 - .65 * t);
    }
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i]; p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { p.sprite.removeFromParent(); releaseMaterial(p.sprite.material); dust.splice(i, 1); continue; }
        const width = p.size * (1 + Math.sqrt(p.age) * (p.kind === 'weather' ? .22 : .55)), height = width * (p.kind === 'weather' ? .15 : (.35 + Math.min(.55, p.age * .22)) * Math.max(.08, p.config.rise));
        updateVolumeParticle(p.sprite.material, p.age, p.config, p.seed);
        p.sprite.position.copy(p.origin).addScaledVector(p.velocity, (1 - Math.exp(-p.age * .7)) / .7);
        const wind = sceneWeather.windAt(p.sprite.position.x, p.sprite.position.z);
        const entrainment = p.kind === 'weather' ? 1 : 1 - Math.exp(-p.age * .6);
        p.windOffset.x += wind.x * dt * entrainment * p.config.wind; p.windOffset.z += wind.z * dt * entrainment * p.config.wind;
        p.sprite.position.add(p.windOffset);
      // The bottom of each unrotated billboard stays above the measured ground plane.
      const groundAt = p.groundAt ?? dustGroundAt;
      if (groundAt) p.groundY = groundAt(p.sprite.position.x, p.sprite.position.z);
      p.sprite.position.y = p.groundY + height * .5 + .015;
      p.sprite.scale.set(width, height, 1);
        p.sprite.material.opacity = p.opacity * Math.min(1, p.age / (p.kind === 'weather' ? 1.4 : .12)) * (1 - t) ** .85;
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i]; shot.age += dt;
      const intensity = shot.age < shot.config.flashDurationS ? shot.config.lightIntensity * shot.scale * (1 - shot.age / shot.config.flashDurationS) ** 2 : 0;
      if (intensity > flashLight.intensity) { flashLight.intensity = intensity; flashLight.color.set(shot.config.flashColor); flashLight.position.copy(shot.group.position); flashLight.distance = 6 * shot.scale; }
      let alive = false;
      for (const p of shot.particles) {
        const age = shot.age - p.delay, t = age / p.life;
        p.sprite.visible = age >= 0 && t < 1;
        if (t < 1) alive = true;
        if (!p.sprite.visible) continue;
        const flash = p.kind === 'flash' || p.kind === 'flame';
        p.sprite.userData.thermalExcess = (flash ? 450 : p.kind === 'smoke' ? 45 : 12) * Math.exp(-Math.max(0, age) / (flash ? .2 : .7));
        const fade = flash ? (1 - t) ** 2 : Math.min(1, age / .07) * (1 - t) ** 1.4;
        p.sprite.material.opacity = p.opacity * fade;
        updateVolumeParticle(p.sprite.material, age, p.look, p.seed, flash);
        const travel = (1 - Math.exp(-age * 2.5)) / 2.5;
        p.sprite.position.copy(p.origin).addScaledVector(p.velocity, travel);
        if (!flash) { p.sprite.position.x += age * .12; p.sprite.position.y += age * age * shot.config.smokeRise; }
        p.sprite.scale.setScalar(p.size * (flash ? 1 + t * .4 : 1 + age * 1.1));
      }
      if (!alive) {
        for (const p of shot.particles) releaseMaterial(p.sprite.material);
        shot.group.removeFromParent(); shots.splice(i, 1);
      }
    }
  }
  function snapshot() {
    const particles = shots.flatMap((shot) => shot.particles);
    return { model: 'volume-smoke-v3', visualSettings: structuredClone(visual()), preview: Boolean(previewSettings), activeShots: shots.length, emitted, materialPool: { pooled, allocated, reused, limit: poolLimit },
      engineRunning, exhaustLoad, exhaustRate: engineRunning ? 12 + exhaustLoad * 16 : 0,
      exhaustShape:'wind-torn-ribbon',exhaustEmitters:exhaustEmitters.size,
      exhaustCount: ambient.filter(p => p.kind === 'exhaust').length, exhaustEmitted, explosionEmitted,
      explosionParticleCount: ambient.filter(p => p.kind !== 'exhaust').length,
      destructionActive: Boolean(wreck) || wreckFires.size > 0, wreckFires: [...wreckFires.values()].map(f => ({ age: f.age, duration: f.duration, sites: f.sites.map(v => v.toArray()), vented: f.vented })), impactCount, lastImpact, impactMarks: 0, ambientCount: ambient.length, ambientLimit: 240,
      dustCount: dust.length, dustSurfaces: [...new Set(dust.map(p => p.surface))], blastDustCount: dust.filter((p) => p.kind === 'blast').length,
        trackDustCount: dust.filter((p) => p.kind === 'track').length, blastDustEmitted, trackDustEmitted,
        rotorDustCount: dust.filter(p => p.kind === 'rotor').length, rotorDustEmitted,
        oldestBlastDustAge: Math.max(0, ...dust.filter(p => p.kind === 'blast').map(p => p.age)),
        maximumDustWidth: Math.max(0, ...dust.map(p => p.sprite.scale.x)),
      weatherDustCount: dust.filter(p => p.kind === 'weather').length, weatherDustEmitted,
      wind: sceneWeather.snapshot(), dustWindOffsets: dust.slice(-12).map(p => ({ kind: p.kind, age: p.age, offset: p.windOffset.toArray() })),
      dustLimit: 220, minimumDustGroundClearance: dust.length ? Math.min(...dust.map((p) => p.sprite.position.y - p.sprite.scale.y * .5 - p.groundY)) : null,
      flashCount: particles.filter((p) => ['flash', 'flame'].includes(p.kind) && p.sprite.visible).length,
      smokeCount: particles.filter((p) => ['smoke', 'wisp'].includes(p.kind) && p.sprite.visible).length,
      shotSettings: shots.map(s => ({ age: s.age, ...structuredClone(s.config) })),
      particleCount: particles.length, flashDurationS: shots.at(-1)?.config.flashDurationS ?? .085, maxShots: 10, shotParticleLimit: 580 };
  }
  function startWreckFire(sites, { scale = 1, duration = 70, vented = false, delay = 0, smoke = 1, smokeLife = 1, color = 0xff8a23 } = {}) {
    const id = ++fireSerial; wreckFires.set(id, { sites: sites.slice(0, 4).map(p => p.clone()), scale, duration: Math.max(1, Math.min(180, duration)), vented, delay, smoke, smokeLife, color, age: 0, clock: 0 });
    while (wreckFires.size > 4) wreckFires.delete(wreckFires.keys().next().value);
    return id;
  }
  function emitImpact(point, normal, surface, caliber = 120, profile = { kind: 'kinetic', impactScale: 1 }, groundAt = null) {
    const smoke = { ...visual().impactSmoke };
    const visualScale = profile.visualScale ?? 1;
    const scale = THREE.MathUtils.clamp(caliber / 120, .3, 2) * (profile.impactScale ?? 1) * visualScale, explosive = profile.kind === 'he';
    const n = normal.clone().normalize(), tangent = new THREE.Vector3(Math.abs(n.x) < .9 ? 1 : 0, Math.abs(n.x) < .9 ? 0 : 1, 0).projectOnPlane(n).normalize(), side = new THREE.Vector3().crossVectors(n, tangent);
    emitGroundBlast(point, n.clone().add(new THREE.Vector3(0, 0, 1)).normalize(), caliber, point.y, surface.strength * (explosive ? 1.2 : .5), surface, visualScale);
    if (explosive) for (let i = 0; i < 9; i++) {
      const velocity = n.clone().multiplyScalar(2 + random() * 5).addScaledVector(tangent, (random() - .5) * 5).addScaledVector(side, (random() - .5) * 5).multiplyScalar(visualScale);
      puff('fire', point.clone().addScaledVector(n, .1), velocity, (.35 + random() * .65) * scale, .12 + random() * .18, visual().flame.tint ? visual().flame.color : 0xffa444, .8);
    }
    for (let i = 0; i < Math.round((explosive ? 12 : 6) * smoke.count); i++) {
      const velocity = n.clone().multiplyScalar(1 + random() * 2).addScaledVector(tangent, (random() - .5) * 4).addScaledVector(side, (random() - .5) * 4).multiplyScalar(smoke.spread * visualScale);
      const p = puff('smoke', point.clone().addScaledVector(n, .2 + random() * .25), velocity, (.6 + random() * .8) * scale * smoke.size, Math.max(.01, (3 + random() * 3) * smoke.life), smoke.tint ? smoke.color : surface.color, .55 * smoke.opacity, .07 + i * .009);
      p.look = smoke;
    }
    for (let i = 0; i < (explosive ? 30 : 14); i++) {
      const velocity = n.clone().multiplyScalar((3 + random() * 9) * scale).addScaledVector(tangent, (random() - .5) * 14 * scale).addScaledVector(side, (random() - .5) * 14 * scale);
      const hard = surface.name === '岩石' || surface.name === '靶板';
      const particle = puff(hard && i % 3 === 0 ? 'spark' : 'debris', point.clone().addScaledVector(n, .06), velocity, (.025 + random() * .08) * scale, .7 + random() * 1.1, hard && visual().flame.tint ? visual().flame.color : hard ? 0xbaae94 : surface.color, .9);
      particle.groundAt = groundAt; particle.groundY = point.y;
    }
    impactCount++; lastImpact = { kind: profile.kind, point: point.toArray(), normal: n.toArray(), surface: surface.name, explosive, visualScale, craterGeometry: Boolean(profile.craterGeometry), decal: false };
  }

  function rebase(offset) {
    flashLight.position.sub(offset);
    for (const p of [...ambient, ...dust]) { p.origin.sub(offset); p.sprite.position.sub(offset); }
    for (const s of shots) s.group.position.sub(offset);
    if (wreck) wreck.position.sub(offset);
    for (const fire of wreckFires.values()) for (const site of fire.sites) site.sub(offset);
    for(const position of exhaustEmitters.values())position.sub(offset);
  }
  function emitModuleSmoke(point,burning=false,vented=false) {
    puff('smoke',point,new THREE.Vector3(0,vented?2.2:.7,0),burning?1.1:.55,3.5,0x414542,.5);
    if(burning)puff('fire',point,new THREE.Vector3(0,vented?3:1,0),vented?1.1:.65,.5,0xff8b28,.8);
  }
  return { setSeed: value => { if (!Number.isInteger(value) || value < 0 || value > 4294967295) throw new RangeError('Invalid effect seed'); seed = value >>> 0; }, setPreview: value => { previewSettings = value ? validateVisualEffects(value) : null; }, emitVehicleExhaust(point,direction,width=3,emitter=null){exhaustRibbon(point,direction,width,.45,false,emitter);}, emitModuleSmoke, releaseTrackEmitter: id => {trackEmitters.delete(id);exhaustEmitters.delete(id);}, emit, emitFormationDust, emitRocketTrail, emitWindDust, emitGroundBlast, emitTrackDust, emitRotorWash, emitExhaust, emitExplosion, emitImpact, startWreckFire, stopWreckFire: id => wreckFires.delete(id), hasWreckFire: id => wreckFires.has(id), rebase, update, clear, snapshot, dispose() { clear(); for (const bucket of materialPool.values()) for (const material of bucket) material.dispose(); materialPool.clear(); pooled = 0; flashLight.removeFromParent(); flashLight.dispose(); for (const sprite of warmSprites) { sprite.removeFromParent(); sprite.material.dispose(); } texture.dispose(); dustTexture.dispose(); },
    get count() { return shots.length + dust.length + ambient.length + wreckFires.size + (wreck ? 1 : 0); } };
}
