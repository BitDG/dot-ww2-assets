import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../src/plugins/scatter/io.js';
import {createPortableArmorMaps,applyPortableCamouflage,finishFromParams} from '../tank/src/portable-vehicle-finish.mjs';
import {applySourceInformedExterior} from './exterior-correction.mjs';

export const SOURCE_SHA256='5c97cbb68542723fbca7dbcfaa114a08ffe216c1d15cb60eb1febca2845a6896';
export const SOURCE_URL=new URL('./assets/N41-N2-geometry.glb',import.meta.url);
export const PARTS=Object.freeze({showCradle:'N41_Cradle',showFrontSupport:'N41_Front_Support',showRearTrails:'N41_Rear_Trails',showTubeCluster:'N41_Tube_Cluster',showWheels:'N41_Wheel_Pair'});
const painted=new Set(['armorPaint','fittingPaint','wheelPaint']);
export function checkAbort(signal){if(signal?.aborted)throw new DOMException('生成已取消','AbortError');}

/** All parser and later-cloned resources belong to one generation, even on error. */
export function createResourceOwner(){
 const resources=new Set(),disposed=new Set();let closed=false;
 const capture=value=>{
  if(!value)return value;
  if(Array.isArray(value)){value.forEach(capture);return value;}
  if(value.isObject3D){value.traverse(o=>{capture(o.geometry);capture(o.material);});return value;}
  if(value.isMaterial){for(const v of Object.values(value))if(v?.isTexture)capture(v);}
  if(value.isBufferGeometry||value.isMaterial||value.isTexture){resources.add(value);if(closed&&!disposed.has(value)){value.dispose();disposed.add(value);}}
  return value;
 };
 return {capture,forget:resource=>resources.delete(resource),dispose(){closed=true;for(const r of resources)if(!disposed.has(r)){r.dispose();disposed.add(r);}},diagnostics:()=>({owned:resources.size,disposed:disposed.size,closed})};
}

export async function readSourceBytes({url=SOURCE_URL,signal,fetcher=globalThis.fetch}={}){
 checkAbort(signal);let bytes;
 if(url.protocol==='file:'){
  const packageName='node:fs/promises';const {readFile}=await import(/* @vite-ignore */ packageName);
  bytes=new Uint8Array(await readFile(url,{signal}));
 }else{
  const response=await fetcher(url,{signal});if(!response.ok)throw Error('N2 art asset load failed: HTTP '+response.status);
  bytes=new Uint8Array(await response.arrayBuffer());
 }
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCE_SHA256)throw Error('N2 art source checksum mismatch');
 return bytes;
}

/** Uses the existing PGF reader as the static asset gate, then Three for PGF PBR. */
export async function loadExternalArt(bytes,{signal,owner=createResourceOwner(),configureLoader}={}){
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCE_SHA256)throw Error('N2 art source checksum mismatch');
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 validateAsset(readGLB(buffer,'nebelwerfer41-authored-source'));
 const loader=new GLTFLoader();
 loader.register(parser=>({
  name:'N41_OWNED_ART_RESOURCES',
  loadMaterial:index=>parser.loadMaterial(index).then(owner.capture),
  loadMesh:index=>parser.loadMesh(index).then(owner.capture),
  afterRoot:result=>{result.scenes.forEach(owner.capture);},
 }));
 // Internal test seam, never a request parameter or user-supplied import path.
 configureLoader?.(loader);
 try{
  const result=await loader.parseAsync(buffer,'');owner.capture(result.scene);checkAbort(signal);
  const root=result.scene;
  for(const name of Object.values(PARTS))if(!root.getObjectByName(name))throw Error('Missing authored part: '+name);
  return {root,owner};
 }catch(error){owner.dispose();throw error;}
}

export async function buildVisualProp(params,{seed,signal,onResources}={}){
 checkAbort(signal);
 if(!Object.keys(PARTS).some(key=>params[key]))throw Error('至少保留一个可见外观部件');
 const owner=createResourceOwner();onResources?.(owner);
 try{
  const bytes=await readSourceBytes({signal});
  const {root}=await loadExternalArt(bytes,{signal,owner});
  const exterior=applySourceInformedExterior(root);owner.capture(root);
  if(exterior.tubes!==6||exterior.pinsHidden!==6||exterior.capsHidden!==6||exterior.frontRims!==6||!exterior.remainsSealed)throw Error('Unexpected N4 exterior correction contract');
  const maps=createPortableArmorMaps({seed,weathering:params.weathering});Object.values(maps).forEach(owner.capture);
  const materials=new Set();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))materials.add(m);});
  for(const m of materials){
   if(!painted.has(m.userData.appearanceRole))continue;
   m.color.set(params.paintColor).multiplyScalar(m.userData.appearanceRole==='fittingPaint'?.82:m.userData.appearanceRole==='wheelPaint'?1.12:1);
   m.roughness=params.roughness;m.metalness=.5;m.map=maps.albedo;m.normalMap=maps.normal;m.roughnessMap=m.metalnessMap=maps.orm;m.normalScale.set(1,1);
  }
  await applyPortableCamouflage(root,{seed,weathering:params.weathering,paint:params.paintColor,finish:finishFromParams(params)});owner.capture(root);checkAbort(signal);
  // The shared binder releases the old albedo after replacing every paint map.
  if(root.userData.camouflage.pattern!=='original')owner.forget(maps.albedo);
  const activeParts=[];
  for(const [key,name]of Object.entries(PARTS)){const part=root.getObjectByName(name);part.visible=params[key];if(part.visible)activeParts.push(name);}
  root.updateMatrixWorld(true);
  return {root,owner,metadata:{exterior,activeParts,camouflage:root.userData.camouflage}};
 }catch(error){owner.dispose();throw error;}
}
