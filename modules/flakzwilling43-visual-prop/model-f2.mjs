import {createMetalFinishMaps,METAL_FINISH_PROVENANCE} from './f2-surface.mjs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../src/plugins/scatter/io.js';
import {applyPortableCamouflage,finishFromParams} from '../tank/src/portable-vehicle-finish.mjs';


export const SOURCES=Object.freeze({"low": {"file": "FZ43-F2-low.glb", "sha256": "78686e356e48a2c7ee14e2fc02a7587b7e040fd1631a071ec59d1252c18abc6d"}, "medium": {"file": "FZ43-F2-geometry.glb", "sha256": "4f1d831d1deb439bccbd3d4686cb5c71184ec3fbb7828793b064d79b31223aa4"}, "high": {"file": "FZ43-F2-high.glb", "sha256": "4199b7a5f700fce25f33a14476d19ecce7ea844be5f6b40d9067a8acc6915a74"}});
export const SOURCE_SHA256=SOURCES.medium.sha256;
export const SOURCE_URLS=Object.freeze({low:new URL('./assets/FZ43-F2-low.glb',import.meta.url),medium:new URL('./assets/FZ43-F2-geometry.glb',import.meta.url),high:new URL('./assets/FZ43-F2-high.glb',import.meta.url)});
export const SOURCE_URL=SOURCE_URLS.medium;
export const PARTS=Object.freeze({showTripod:'FZ43_Tripod_Base',showTurntable:'FZ43_Turntable_Exterior',showShield:'FZ43_Folded_Shield',showUpper:'FZ43_Upper_Exterior',showLower:'FZ43_Lower_Exterior',showSeats:'FZ43_Seats_Platforms',showFittings:'FZ43_Exterior_Fittings'});
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

export async function readSourceBytes({detail='medium',url=SOURCE_URLS[detail],signal,fetcher=globalThis.fetch}={}){
 checkAbort(signal);let bytes;
 if(url.protocol==='file:'){
  const packageName='node:fs/promises';const {readFile}=await import(/* @vite-ignore */ packageName);
  bytes=new Uint8Array(await readFile(url,{signal}));
 }else{
  const response=await fetcher(url,{signal});if(!response.ok)throw Error('FZ43 art asset load failed: HTTP '+response.status);
  bytes=new Uint8Array(await response.arrayBuffer());
 }
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('FZ43 art source checksum mismatch');
 return bytes;
}

/** Uses the existing PGF reader as the static asset gate, then Three for PGF PBR. */
export async function loadExternalArt(bytes,{detail='medium',signal,owner=createResourceOwner(),configureLoader}={}){
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('FZ43 art source checksum mismatch');
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 validateAsset(readGLB(buffer,'flakzwilling43-authored-source'));
 const loader=new GLTFLoader();
 loader.register(parser=>({
  name:'FZ43_OWNED_ART_RESOURCES',
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
  const bytes=await readSourceBytes({detail:params.detail,signal});
  const {root}=await loadExternalArt(bytes,{detail:params.detail,signal,owner});
  const body=root.getObjectByName('FZ43_ROOT');body.scale.setScalar(params.artScale);
  for(const part of ['Folded_Shield'])root.getObjectByName('FZ43_'+part).scale.x*=params.shieldWidth;
  const maps=createMetalFinishMaps({seed,paintColor:params.paintColor,weathering:params.weathering,resolution:params.detail==='low'?256:512});Object.values(maps).forEach(owner.capture);
  const materials=new Set();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))materials.add(m);});
  for(const m of materials){
   if(!painted.has(m.userData.appearanceRole))continue;
   m.color.set('#ffffff').multiplyScalar(m.userData.appearanceRole==='fittingPaint'?.82:m.userData.appearanceRole==='wheelPaint'?1.12:1);
   m.roughness=params.roughness;m.metalness=.5;m.map=maps.albedo;m.normalMap=maps.normal;m.roughnessMap=m.metalnessMap=maps.orm;m.normalScale.set(1,1);
  }
  await applyPortableCamouflage(root,{seed,weathering:params.weathering,paint:params.paintColor,finish:finishFromParams(params),resolution:params.detail==='low'?256:512});owner.capture(root);checkAbort(signal);
  // The shared binder releases the old albedo after replacing every paint map.
  if(root.userData.camouflage.pattern!=='original')owner.forget(maps.albedo);
  const activeParts=[];
  for(const [key,name]of Object.entries(PARTS)){const part=root.getObjectByName(name);part.visible=params[key];if(part.visible)activeParts.push(name);}
  root.updateMatrixWorld(true);
  return {root,owner,metadata:{surfaceProvenance:METAL_FINISH_PROVENANCE,activeParts,camouflage:root.userData.camouflage,visualRuntime:{schema:'flakzwilling43.visual-runtime/1',bodyRoot:'FZ43_ROOT',stationaryBase:'FZ43_Tripod_Base',cosmeticAnchors:['FZ43_Upper_Cosmetic_Anchor','FZ43_Lower_Cosmetic_Anchor'],sealedFaces:['FZ43_upper_Sealed_Front','FZ43_lower_Sealed_Front'],noWheels:true,nonfunctional:true}}};
 }catch(error){owner.dispose();throw error;}
}
