import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../src/plugins/scatter/io.js';
import {finishFromParams} from '../tank/src/portable-vehicle-finish.mjs';
import {createQf25FinishMaps,applyQf25Camouflage} from './material-finish.mjs';


export const SOURCES=Object.freeze({"low": {"file": "QF25-Q2-low.glb", "sha256": "f7422f7c04915a3cf4ccab8f92d873339e113f88e2e4d8ae7f5d9357fbb588fa"}, "medium": {"file": "QF25-Q2-geometry.glb", "sha256": "69ba1127753c21e64aac45d98f0ff02fa7868020b483ac182b7225ce91364251"}, "high": {"file": "QF25-Q2-high.glb", "sha256": "49a5f536f5941d82b5a428416bc9da4991e874ef5de156c830a42fdd4570ca06"}});
export const SOURCE_SHA256=SOURCES.medium.sha256;
export const SOURCE_URLS=Object.freeze({low:new URL('./assets/QF25-Q2-low.glb',import.meta.url),medium:new URL('./assets/QF25-Q2-geometry.glb',import.meta.url),high:new URL('./assets/QF25-Q2-high.glb',import.meta.url)});
export const SOURCE_URL=SOURCE_URLS.medium;
export const PARTS=Object.freeze({showBarrel:'QF25_Barrel_Exterior',showShield:'QF25_Shield_Assembly',showCarriage:'QF25_Carriage_Exterior',showLeftWheel:'QF25_Wheel_Left_Pivot',showRightWheel:'QF25_Wheel_Right_Pivot',showTrail:'QF25_Single_Box_Trail',showPlatform:'QF25_Stowed_Circular_Platform',showFittings:'QF25_Exterior_Fittings'});
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
  const response=await fetcher(url,{signal});if(!response.ok)throw Error('QF25 art asset load failed: HTTP '+response.status);
  bytes=new Uint8Array(await response.arrayBuffer());
 }
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('QF25 art source checksum mismatch');
 return bytes;
}

/** Uses the existing PGF reader as the static asset gate, then Three for PGF PBR. */
export async function loadExternalArt(bytes,{detail='medium',signal,owner=createResourceOwner(),configureLoader}={}){
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('QF25 art source checksum mismatch');
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 validateAsset(readGLB(buffer,'qf25-authored-source'));
 const loader=new GLTFLoader();
 loader.register(parser=>({
  name:'QF25_OWNED_ART_RESOURCES',
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
  const body=root.getObjectByName('QF25_ROOT');body.scale.setScalar(params.artScale);
  for(const side of ['Left','Right'])root.getObjectByName('QF25_Wheel_'+side+'_Pivot').position.x*=params.wheelSpacing;
  const axle=root.getObjectByName('QF25_Axle_Exterior');axle.scale.x*=params.wheelSpacing;
  for(const s of [-1,1])root.getObjectByName('QF25_Axle_Collar_'+s).position.x*=params.wheelSpacing;
  if(root.getObjectByName('QF25_Canvas_Cover')||root.getObjectByName('QF25_Rear_Canvas_Pouch'))throw Error('Removed cloth must not exist in delivered asset');
  const maps=createQf25FinishMaps({seed,weathering:params.weathering,resolution:params.detail==='low'?256:512});Object.values(maps).forEach(owner.capture);
  const materials=new Set();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))materials.add(m);});
  for(const m of materials){
   if(!painted.has(m.userData.appearanceRole))continue;
   m.color.set(params.paintColor).multiplyScalar(m.userData.appearanceRole==='fittingPaint'?.82:m.userData.appearanceRole==='wheelPaint'?1.12:1);
   m.roughness=params.roughness;m.metalness=.5;m.map=maps.albedo;m.normalMap=maps.normal;m.roughnessMap=m.metalnessMap=maps.orm;m.normalScale.set(1,1);
  }
  await applyQf25Camouflage(root,{seed,weathering:params.weathering,paint:params.paintColor,finish:finishFromParams(params),resolution:params.detail==='low'?256:512});owner.capture(root);checkAbort(signal);
  // The shared binder releases the old albedo after replacing every paint map.
  if(root.userData.camouflage.pattern!=='original')owner.forget(maps.albedo);
  const activeParts=[];
  for(const [key,name]of Object.entries(PARTS)){const part=root.getObjectByName(name);part.visible=params[key];if(part.visible)activeParts.push(name);}
  root.updateMatrixWorld(true);
  return {root,owner,metadata:{showCover:false,appearance:'uncapped',activeParts,camouflage:root.userData.camouflage,visualRuntime:{schema:'qf25.visual-runtime/1',bodyRoot:'QF25_ROOT',wheelPivots:['QF25_Wheel_Left_Pivot','QF25_Wheel_Right_Pivot'],wheelAxis:[1,0,0],radiusArt:.53,towDirection:[0,0,1],muzzleAnchor:'QF25_Cosmetic_Muzzle_Anchor',muzzleDirection:[0,1,0],sealedFace:'QF25_Shallow_Sealed_Front',showCover:false,appearance:'uncapped'}}};
 }catch(error){owner.dispose();throw error;}
}
