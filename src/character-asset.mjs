/** Additive character fields shared by AssetIR 0.1 and pgf.asset/1. */
import {Matrix4} from 'three';
export function validateCharacterAsset(a) {
 if(a.skins===undefined&&a.animations===undefined&&!a.nodes.some(n=>n.skinId!==undefined)&&!a.meshes.some(m=>m.primitives.some(p=>p.joints!==undefined||p.weights!==undefined||p.morphTargets!==undefined)))return 0;
 const fail=m=>{throw Error('Character asset: '+m);};
 const nodes=new Map(a.nodes.map(n=>[n.id,n])), skins=new Map();let bytes=0;
 const floats=(v,n)=>v instanceof Float32Array&&v.length===n&&v.every(Number.isFinite);
 if(a.skins!==undefined&&!Array.isArray(a.skins))fail('skins must be an array');
 for(const s of a.skins??[]){
  if(typeof s.id!=='string'||skins.has(s.id)||!Array.isArray(s.joints)||!s.joints.length||s.joints.length>256||new Set(s.joints).size!==s.joints.length||s.joints.some(id=>!nodes.has(id))||!floats(s.inverseBindMatrices,s.joints.length*16))fail('invalid joints or inverse binds');
  for(let i=0;i<s.joints.length;i++)if(Math.abs(new Matrix4().fromArray(s.inverseBindMatrices,i*16).determinant())<1e-12)fail('singular inverse bind');
  skins.set(s.id,s);bytes+=s.inverseBindMatrices.byteLength;
 }
 for(const n of a.nodes){
  if(n.skinId!==undefined&&!skins.has(n.skinId))fail('unknown skin');
  if(n.skinId&&!n.meshId)fail('skin needs mesh');
 }
 for(const m of a.meshes)for(const p of m.primitives){
  const count=p.positions.length/3;
  if(p.joints!==undefined||p.weights!==undefined){
   if(!(p.joints instanceof Uint16Array)||p.joints.length!==count*4||!floats(p.weights,count*4))fail('joint/weight arrays');
   for(let i=0;i<count;i++)if(Math.abs(p.weights.slice(i*4,i*4+4).reduce((s,v)=>s+v,0)-1)>.002||p.weights.slice(i*4,i*4+4).some(v=>v<0))fail('weights must be normalized');
   const owners=a.nodes.filter(n=>n.meshId===m.id);
   if(!owners.length||owners.some(n=>!n.skinId||p.joints.some(v=>v>=skins.get(n.skinId).joints.length)))fail('joint index/mesh binding');
   bytes+=p.joints.byteLength+p.weights.byteLength;
  }else if(a.nodes.some(n=>n.meshId===m.id&&n.skinId))fail('skinned mesh missing weights');
  if(p.morphTargets!==undefined){
   if(!Array.isArray(p.morphTargets)||p.morphTargets.length>32)fail('morph target budget');
   if(new Set(p.morphTargets.map(t=>t.name)).size!==p.morphTargets.length||p.morphTargets.some(t=>typeof t.name!=='string'||!t.name.length))fail('morph names');
   for(const t of p.morphTargets){if(!floats(t.positions,count*3)||t.normals&&!floats(t.normals,count*3))fail('morph target length');bytes+=t.positions.byteLength+(t.normals?.byteLength??0);}
  }
 }
 for(const m of a.meshes)if(new Set(m.primitives.map(p=>p.morphTargets?.length??0)).size!==1)fail('mesh primitives need matching morph counts');
 if(a.animations!==undefined&&!Array.isArray(a.animations))fail('animations must be an array');
 if((a.animations?.length??0)>64)fail('animation budget');
 for(const clip of a.animations??[]){
  if(typeof clip.name!=='string'||!Array.isArray(clip.tracks)||clip.tracks.length>1024)fail('invalid clip');
  for(const t of clip.tracks){
   const size={translation:3,rotation:4,scale:3}[t.path];
   if(!nodes.has(t.nodeId)||!size||!floats(t.times,t.times?.length)||!t.times.length||!floats(t.values,t.times.length*size)||!['LINEAR','STEP',undefined].includes(t.interpolation))fail('invalid animation track');
   if(t.times.length>10000||t.times.some((v,i)=>v<0||i&&v<=t.times[i-1]))fail('animation times must increase');
   if(t.path==='rotation')for(let i=0;i<t.values.length;i+=4)if(Math.abs(Math.hypot(...t.values.slice(i,i+4))-1)>.002)fail('animation quaternion');
   bytes+=t.times.byteLength+t.values.byteLength;
  }
 }
 if(bytes>64e6)fail('character data exceeds 64 MB');return bytes;
}

export function characterClips(asset,nodes,THREE){
 return (asset.animations??[]).map(clip=>new THREE.AnimationClip(clip.name,-1,clip.tracks.map(t=>{
  const path={translation:'position',rotation:'quaternion',scale:'scale'}[t.path],Type=t.path==='rotation'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
  return new Type(nodes.get(t.nodeId).uuid+'.'+path,t.times,t.values,t.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
 })));
}
