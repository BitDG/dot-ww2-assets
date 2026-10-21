// Integrate a bounded 3D density field through a sphere, in camera ray order.
// The billboard is only a rasterization bound; density rotates with the world.
const states = new WeakMap();
export function installVolumeParticle(material, source = null) {
  const uniforms = states.get(source) ?? { fxAge: { value: 0 }, fxSeed: { value: 0 }, fxTurbulence: { value: 1 }, fxShading: { value: .7 }, fxHot: { value: 0 } };
  states.set(material, uniforms);
  material.customProgramCacheKey = () => 'volume-particle-v1';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec2 fxUv;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nfxUv = uv;');
    shader.fragmentShader = `varying vec2 fxUv;
uniform float fxAge, fxSeed, fxTurbulence, fxShading, fxHot;
float fxNoise(vec3 p) {
  return .5 + .22*sin(p.x*3.1+sin(p.z*2.7))*sin(p.y*3.7+p.z)
    + .13*sin(p.x*7.3+p.y*4.1)*sin(p.z*6.7-p.y*2.3)
    + .07*sin(p.x*15.1-p.z*9.2)*sin(p.y*13.4+p.z*5.7);
}
float fxDensity(vec3 p) {
  vec3 q=p*1.65+vec3(fxSeed,fxAge*fxTurbulence*.27,fxSeed*.37);
  float n=fxNoise(q);
  return smoothstep(0.,.38,1.-length(p)+(n-.5)*.52)*(.32+n*.9);
}
` + shader.fragmentShader.replace('#include <map_fragment>', `
vec2 xy=fxUv*2.-1.;
float r2=dot(xy,xy);
if(r2>=1.) discard;
float extent=sqrt(1.-r2);
vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
vec3 toward=vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]);
vec3 lightDir=normalize(vec3(-.45,.85,.35));
float transmittance=1.; vec3 radiance=vec3(0.);
for(int sampleIndex=0;sampleIndex<6;sampleIndex++) {
  float z=extent*(1.-2.*(float(sampleIndex)+.5)/6.);
  vec3 p=right*xy.x+up*xy.y+toward*z;
  float density=fxDensity(p);
  float a=1.-exp(-density*extent*.62);
  float shadow=fxDensity(p+lightDir*.3);
  float lighting=mix(1.,clamp(.42+.65*max(0.,dot(normalize(p+vec3(.001)),lightDir))+.4*(density-shadow),.28,1.15),fxShading);
  vec3 tint=mix(diffuse*lighting,diffuse*mix(.6,1.3,density)*mix(1.,lighting,.35),fxHot);
  radiance+=transmittance*a*tint; transmittance*=1.-a;
}
float coverage=1.-transmittance;
diffuseColor=vec4(radiance/max(.001,coverage),opacity*coverage);
`);
  };
  return material;
}
export const isVolumeParticle = material => states.has(material);
export function updateVolumeParticle(material, age, settings = {}, seed = 0, hot = false) {
  const u = states.get(material); if (!u) return;
  material.rotation = 0;
  u.fxAge.value = age; u.fxSeed.value = seed; u.fxTurbulence.value = settings.turbulence ?? 1;
  u.fxShading.value = settings.shading ?? .7; u.fxHot.value = hot ? 1 : 0;
}
