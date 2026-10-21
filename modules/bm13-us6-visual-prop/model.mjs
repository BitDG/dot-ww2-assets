import {batchExterior} from './batch-exterior.mjs';
import {normalizeParams,validateSeed,PARTS} from './params.mjs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../src/plugins/scatter/io.js';
import {finishFromParams} from '../tank/src/portable-vehicle-finish.mjs';
import {createBm13FinishMaps,applyBm13Camouflage} from './material-finish.mjs';


import {SOURCES,SOURCE_URLS} from './sources.mjs';
export {SOURCES,SOURCE_URLS};
export const SOURCE_SHA256=SOURCES.medium.sha256;
export const SOURCE_URL=SOURCE_URLS.medium;
export {PARTS};
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
  const response=await fetcher(url,{signal});if(!response.ok)throw Error('BM13 art asset load failed: HTTP '+response.status);
  bytes=new Uint8Array(await response.arrayBuffer());
 }
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('BM13 art source checksum mismatch');
 return bytes;
}

/** Uses the existing PGF reader as the static asset gate, then Three for PGF PBR. */
export async function loadExternalArt(bytes,{detail='medium',signal,owner=createResourceOwner(),configureLoader}={}){
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('BM13 art source checksum mismatch');
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 validateAsset(readGLB(buffer,'bm13-authored-source'));
 const loader=new GLTFLoader();
 loader.register(parser=>({
  name:'BM13_OWNED_ART_RESOURCES',
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

export async function buildVisualProp(params,{seed='bm13-us6-art-1944',signal,onResources}={}){
 checkAbort(signal);
 const p=normalizeParams(params);validateSeed(seed);
 const owner=createResourceOwner();onResources?.(owner);
 try{
  const bytes=await readSourceBytes({detail:p.detail,signal});
  const {root}=await loadExternalArt(bytes,{detail:p.detail,signal,owner});
  const body=root.getObjectByName('BM13_ROOT');if(!body)throw Error('Missing BM13_ROOT');body.scale.setScalar(p.artScale);
  const wheelPivots=[];body.traverse(n=>{if(/^BM13_Wheel_[012]_-?1_[01]_Pivot$/.test(n.name))wheelPivots.push(n.name);});
  if(wheelPivots.length!==10)throw Error('Expected ten authored road tire pivots');
  const maps=createBm13FinishMaps({seed,weathering:p.weathering,resolution:p.detail==='low'?256:512});Object.values(maps).forEach(owner.capture);
  const materials=new Set();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))materials.add(m);});
  for(const m of materials){
   if(!painted.has(m.userData.appearanceRole))continue;
   m.color.set(p.paintColor).multiplyScalar(m.userData.appearanceRole==='fittingPaint'?.86:m.userData.appearanceRole==='wheelPaint'?.96:1);
   m.roughness=p.roughness;m.metalness=.40;m.map=maps.albedo;m.normalMap=maps.normal;m.roughnessMap=m.metalnessMap=maps.orm;m.normalScale.set(1,1);
  }
  await applyBm13Camouflage(root,{seed,weathering:p.weathering,paint:p.paintColor,finish:finishFromParams(p),resolution:p.detail==='low'?256:512});owner.capture(root);checkAbort(signal);
  if(root.userData.camouflage.pattern!=='original')owner.forget(maps.albedo);
  const batchAudit=batchExterior(root,owner);
  const activeParts=[];
  for(const [key,name]of Object.entries(PARTS)){const part=root.getObjectByName(name);part.visible=p[key];if(part.visible)activeParts.push(name);}
  root.updateMatrixWorld(true);
  return {root,owner,metadata:{batchAudit,pose:'unloaded-horizontal-display',activeParts,camouflage:root.userData.camouflage,visualRuntime:{status:'static-only',bodyRoot:'BM13_ROOT',wheelPivots:wheelPivots.sort(),wheelAxis:[1,0,0],animationEnabled:false,rackMovement:false,weaponOperation:false},historicalBoundary:'BM-13N on 1944 Studebaker US6 interpretation; grille/rear fenders not photographically verified; hidden surfaces inferred'}};
 }catch(error){owner.dispose();throw error;}
}
