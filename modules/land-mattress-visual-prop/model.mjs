import {batchExterior} from './batch-exterior.mjs';
import {normalizeParams,validateSeed,PARTS} from './params.mjs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../src/plugins/scatter/io.js';
import {finishFromParams} from '../tank/src/portable-vehicle-finish.mjs';
import {createLandMattressFinishMaps,applyLandMattressCamouflage} from './material-finish.mjs';


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
 checkAbort(signal);if(!SOURCES[detail]?.sha256)throw Error('Land Mattress source is not yet authored and frozen');let bytes;
 if(url.protocol==='file:'){
  const packageName='node:fs/promises';const {readFile}=await import(/* @vite-ignore */ packageName);
  bytes=new Uint8Array(await readFile(url,{signal}));
 }else{
  const response=await fetcher(url,{signal});if(!response.ok)throw Error('Land Mattress art asset load failed: HTTP '+response.status);
  bytes=new Uint8Array(await response.arrayBuffer());
 }
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('Land Mattress art source checksum mismatch');
 return bytes;
}

/** Uses the existing PGF reader as the static asset gate, then Three for PGF PBR. */
export async function loadExternalArt(bytes,{detail='medium',signal,owner=createResourceOwner(),configureLoader}={}){
 checkAbort(signal);
 if(sha256Portable(bytes)!=='sha256:'+SOURCES[detail].sha256)throw Error('Land Mattress art source checksum mismatch');
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 validateAsset(readGLB(buffer,'land-mattress-authored-source'));
 const loader=new GLTFLoader();
 loader.register(parser=>({
  name:'Land Mattress_OWNED_ART_RESOURCES',
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

export async function buildVisualProp(params,{seed='land-mattress-no8-mk1-art-1945',signal,onResources}={}){
 checkAbort(signal);
 const p=normalizeParams(params);validateSeed(seed);
 const owner=createResourceOwner();onResources?.(owner);
 try{
  const bytes=await readSourceBytes({detail:p.detail,signal});
  const {root}=await loadExternalArt(bytes,{detail:p.detail,signal,owner});
  const body=root.getObjectByName('LM_ROOT');if(!body)throw Error('Missing LM_ROOT');body.scale.setScalar(p.artScale);
  const wheelPivots=[];body.traverse(n=>{if(/^LM_Wheel_(Left|Right)_Pivot$/.test(n.name))wheelPivots.push(n.name);});
  if(wheelPivots.length!==2)throw Error('Expected two authored road tire pivots');
  const casings=[],closures=[];body.traverse(n=>{if(/^LM_Casing_R[1-5]_C[1-6]$/.test(n.name))casings.push(n.name);if(/^LM_Shallow_Closure_R[1-5]_C[1-6]$/.test(n.name))closures.push(n.name);});
  if(casings.length!==30||closures.length!==30)throw Error('Fixed 5x6 shallow-closed exterior pattern is missing');
  const maps=createLandMattressFinishMaps({seed,weathering:p.weathering,resolution:p.detail==='low'?256:512});Object.values(maps).forEach(owner.capture);
  const materials=new Set();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))materials.add(m);});
  for(const m of materials){
   if(!painted.has(m.userData.appearanceRole))continue;
   m.color.set(p.paintColor).multiplyScalar(m.userData.appearanceRole==='fittingPaint'?.86:m.userData.appearanceRole==='wheelPaint'?.96:1);
   m.roughness=p.roughness;m.metalness=.40;m.map=maps.albedo;m.normalMap=maps.normal;m.roughnessMap=m.metalnessMap=maps.orm;m.normalScale.set(1,1);
  }
  await applyLandMattressCamouflage(root,{seed,weathering:p.weathering,paint:p.paintColor,finish:finishFromParams(p),resolution:p.detail==='low'?256:512});owner.capture(root);checkAbort(signal);
  if(root.userData.camouflage.pattern!=='original')owner.forget(maps.albedo);
  const batchAudit=batchExterior(root,owner);
  const activeParts=[];
  for(const [key,name]of Object.entries(PARTS)){const part=root.getObjectByName(name);part.visible=p[key];if(part.visible)activeParts.push(name);}
  root.updateMatrixWorld(true);
  return {root,owner,metadata:{batchAudit,pose:'parked-unloaded-display',activeParts,camouflage:root.userData.camouflage,visualRuntime:{status:'static-only',bodyRoot:'LM_ROOT',wheelPivots:wheelPivots.sort(),wheelAxis:[1,0,0],animationEnabled:false,rackMovement:false,weaponOperation:false},historicalBoundary:'Land Mattress No.8 Mk I, A.C. Cars 1945 museum-artifact exterior; 5x6 pattern observed; supports, fenders, top and hidden details artistically interpreted',exteriorPattern:{rows:5,columns:6,mouthCount:30,editable:false}}};
 }catch(error){owner.dispose();throw error;}
}
