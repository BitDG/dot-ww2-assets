import * as THREE from 'three';
import {unzlibSync} from 'fflate';
import low from './assets/blender-kit-low.mjs';
import medium from './assets/blender-kit-medium.mjs';
import high from './assets/blender-kit-high.mjs';
import {disposeTree} from '../rule-kit/geometry.mjs';
import {createFinishPixels} from './finish-pixels.mjs';
import {createPortableArmorMaps,PORTABLE_FINISH_DEFAULTS} from '../tank/src/portable-vehicle-finish.mjs';
export {disposeTree};
export const reconstruction=Object.freeze({hullLength:4.22,hullWidth:2.00,wheelRadius:.594,wheelX:1.14,wheelZ:[1.42,-1.48],turretY:1.96,turretHeight:.65,barrelLength:1.68});
export const stages=['blockout','structural-pass','form-refinement','material-pass','surface-pass','lighting-pass','interaction-pass','optimization-pass'];
export const unlockedStage='optimization-pass';
export const defaults=Object.freeze({scale:1,turretYaw:-10,gunElevation:0,paint:'#827456',roughness:.81,weathering:.35,antennas:true,markings:true,detail:48,...PORTABLE_FINISH_DEFAULTS});
export const pivots=Object.freeze(['turret-pivot','gun-elevation-pivot','wheel-left-front','wheel-right-front','wheel-left-rear','wheel-right-rear']);
export const detailTier=detail=>detail<36?'low':detail<56?'medium':'high';
const kits={low,medium,high};
function decode(text,Type){const packed=Uint8Array.from(atob(text),c=>c.charCodeAt(0)),bytes=unzlibSync(packed);return new Type(bytes.buffer,bytes.byteOffset,bytes.byteLength/Type.BYTES_PER_ELEMENT);}
function texture(data,size,srgb=false){const t=new THREE.DataTexture(data,size,size);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
function finishMaps(wear,seed){const d=createFinishPixels(wear,seed);return {albedo:texture(d.albedo,d.size,true),normal:texture(d.normal,d.size),orm:texture(d.orm,d.size)};}

function materials(p,seed){
 const maps=finishMaps(p.weathering,seed),armorMaps=createPortableArmorMaps({seed,weathering:p.weathering}),paint=new THREE.Color(p.paint),edge=paint.clone().multiplyScalar(1.07+.20*p.weathering),dust=new THREE.Color('#988b70');
 const mix=(c,amount)=>new THREE.Color(c).lerp(dust,p.weathering*amount);
 const spec={
  armor:{color:paint,roughness:p.roughness,metalness:.12},
  'armor-edge':{color:edge,roughness:Math.max(.35,p.roughness-.055),metalness:.15+.20*p.weathering},
  steel:{color:mix('#504938',.22),roughness:.65+p.weathering*.13,metalness:.65},
  dark:{color:'#39382c',roughness:.91,metalness:.20},
  rubber:{color:mix('#3b3b34',.53),roughness:.94,metalness:0},
  canvas:{color:mix('#8a7b5b',.25),roughness:.96,metalness:0},
  strap:{color:mix('#635237',.25),roughness:.9,metalness:0},
  marking:{color:mix('#e7e6d4',.42),roughness:.87,metalness:0},
  wood:{color:'#94704b',roughness:.87,metalness:0},
  lens:{color:new THREE.Color().setRGB(.55,.59,.54),roughness:.30,metalness:.32},
 };
 return Object.fromEntries(Object.entries(spec).map(([name,props])=>{
  const m=new THREE.MeshStandardMaterial(props);m.name=name;
  if(name!=='lens'){const channels=['armor','armor-edge'].includes(name)?armorMaps:maps;m.map=channels.albedo;m.normalMap=channels.normal;m.roughnessMap=channels.orm;m.metalnessMap=channels.orm;}
  if(['armor','armor-edge'].includes(name))m.userData.appearanceRole='armorPaint';
  return [name,m];
 }));
}
/** Synchronous parametric assembly of immutable Blender-authored geometry kits. */
export function createReferenceArmoredCarModel(params={},options={}){
 const p={...defaults,...params};
 if(options.stage&&!stages.includes(options.stage))throw Error('Unknown build stage: '+options.stage);
 if(!/^#[\da-f]{6}$/i.test(p.paint)||typeof p.paint!=='string')throw Error('Invalid paint');
 if(![p.scale,p.turretYaw,p.gunElevation,p.roughness,p.weathering,p.detail].every(Number.isFinite))throw Error('Non-finite vehicle parameter');
 if(options.referenceFinish)throw Error('The legacy white-star photograph is incompatible with this Blender-authored brown-diamond kit');
 const tier=detailTier(p.detail),kit=kits[tier],mats=materials(p,String(options.seed??'pgf-components-1'));
 const geometry=[];
 for(const source of kit.meshes)geometry.push(source.primitives.map(primitive=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(decode(primitive.positions,Float32Array),3));g.setAttribute('normal',new THREE.BufferAttribute(decode(primitive.normals,Float32Array),3));g.setAttribute('uv',new THREE.BufferAttribute(decode(primitive.uv,Float32Array),2));g.setIndex(new THREE.BufferAttribute(decode(primitive.indices,Uint32Array),1));g.computeBoundingBox();g.computeBoundingSphere();return {g,role:primitive.material};
 }));
 const nodes=kit.nodes.map(source=>{
  const g=new THREE.Group();g.name=source.name;g.position.fromArray(source.position);g.quaternion.fromArray(source.rotation);g.scale.fromArray(source.scale);
  if(source.mesh!==undefined)for(const [i,{g:geo,role}]of geometry[source.mesh].entries()){
   if(!mats[role])throw Error('Unknown authored material role: '+role);
   const mesh=new THREE.Mesh(geo,mats[role]);mesh.name=source.name+'-surface-'+i;mesh.castShadow=true;mesh.receiveShadow=true;
   mesh.userData.sourceParts=source.extras?.sourceParts?JSON.parse(source.extras.sourceParts):[{name:source.name,start:0,count:geo.index.count/3}];g.add(mesh);
  }
  return g;
 });
 kit.nodes.forEach((source,i)=>{for(const child of source.children)nodes[i].add(nodes[child]);});
 let root;
 if(kit.roots.length===1)root=nodes[kit.roots[0]];else{root=new THREE.Group();kit.roots.forEach(i=>root.add(nodes[i]));}
 root.name='reference-armored-car';
 const turret=root.getObjectByName('turret-pivot'),gun=root.getObjectByName('gun-elevation-pivot');
 turret.rotation.y=THREE.MathUtils.degToRad(p.turretYaw);gun.rotation.x=-THREE.MathUtils.degToRad(p.gunElevation);
 const marker=root.getObjectByName('markings'),antenna=root.getObjectByName('antennas');if(marker)marker.visible=p.markings;const hullMarker=root.getObjectByName('hull-markings');if(hullMarker)hullMarker.visible=p.markings;if(antenna)antenna.visible=p.antennas;
 root.scale.setScalar(p.scale);root.updateMatrixWorld(true);
 root.userData.pgf={stage:'optimization-pass',noHumans:true,inferredRear:true,pivots:[...pivots],detailTier:tier,sourceSha256:kit.sourceSha256,authoring:'Blender MCP authored exterior kit'};
 const named={},meshes={},sockets={},destructionGroups={};root.traverse(n=>{if(n.name)named[n.name]=n;if(n.isMesh)meshes[n.name]=n;});
 for(const name of pivots)sockets[name]=named[name];for(const name of ['hull','turret-pivot','running-gear'])destructionGroups[name]=named[name];
 root.userData.sculptRuntime={nodes:named,meshes,sockets,colliders:{},destructionGroups};
 return root;
}
