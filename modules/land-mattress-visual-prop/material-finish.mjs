/** LAND_MATTRESS-only ownership wrapper over existing PGF painted-metal pixels and camo painter.
 * No custom shader, replacement baker, armor panel grid, or shared-module mutation. */
import * as THREE from 'three';
import {metalFinishPixels} from '../material-kit/metal-finish.mjs';
import {normalizeFinish,resolvedPattern,bindVehicleCamouflage} from '../tank/src/camouflage.js';
import {portableSeed} from '../tank/src/portable-vehicle-finish.mjs';
import {bakePgfCamo} from '../tank/upstream/vendor/legacy-tank-source/src/vehicles/materials.js';
const flipped=(data,n)=>{const out=new Uint8Array(data.length);for(let y=0;y<n;y++)out.set(data.subarray(y*n*4,(y+1)*n*4),(n-1-y)*n*4);return out;};
function texture(data,n,name,color=false){const t=new THREE.DataTexture(flipped(data,n),n,n);t.name=name;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
export function finishLevels(weathering){return {rust:weathering*.16,chips:weathering*.4,dirt:weathering*.22,wear:weathering*.45};}
export function createLandMattressFinishMaps({seed,weathering,resolution=512}){
 const pixels=metalFinishPixels({seed,resolution,finish:finishLevels(weathering),color:'#ffffff',role:'paint'});
 return {albedo:texture(pixels.base,resolution,'pgf-land-mattress-metal-base',true),normal:texture(pixels.normal,resolution,'pgf-land-mattress-metal-normal'),orm:texture(pixels.orm,resolution,'pgf-land-mattress-metal-orm')};
}
let nodeHost;
async function host(){
 if(typeof process!=='undefined'&&process.versions?.node){const name='@napi-rs/canvas';nodeHost??=import(/* @vite-ignore */name);const {createCanvas,Path2D,DOMMatrix}=await nodeHost;return {createCanvas,Path2D,DOMMatrix};}
 if(typeof document!=='undefined'&&typeof Path2D!=='undefined'){const doc=document;return {document:doc,createCanvas:(w,h)=>{const c=doc.createElement('canvas');c.width=w;c.height=h;return c;},Path2D:globalThis.Path2D,DOMMatrix:globalThis.DOMMatrix};}
 if(typeof OffscreenCanvas!=='undefined'&&typeof Path2D!=='undefined')return {createCanvas:(w,h)=>new OffscreenCanvas(w,h),Path2D:globalThis.Path2D,DOMMatrix:globalThis.DOMMatrix};
 throw Error('PGF camo painter requires its existing Canvas2D host');
}
export async function applyLandMattressCamouflage(root,{seed,weathering,paint,finish=normalizeFinish(),resolution=512}){
 finish=normalizeFinish(finish);const pattern=resolvedPattern(finish);
 if(pattern==='original'){root.userData.camouflage={...finish,pattern,source:'PGF material-kit metalFinishPixels; no armor panel grid'};return;}
 const canvasHost=await host(),saved=new Map();let baked;
 function replace(key,value){if(globalThis[key]===value)return;saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});}
 try{
  replace('document',canvasHost.document??{createElement(tag){if(tag!=='canvas')throw Error('Unexpected PGF painter element');return canvasHost.createCanvas(resolution,resolution);}});
  replace('Path2D',canvasHost.Path2D);if(canvasHost.DOMMatrix)replace('DOMMatrix',canvasHost.DOMMatrix);
  baked=bakePgfCamo(pattern,portableSeed(seed),paint,resolution);
 }finally{for(const [key,value]of saved)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
 const pixels=new Uint8Array(baked.canvas.getContext('2d').getImageData(0,0,resolution,resolution).data);
 const wear=metalFinishPixels({seed,resolution,finish:finishLevels(weathering),color:'#ffffff',role:'paint'}).base;
 for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)pixels[i+c]=Math.round(pixels[i+c]*wear[i+c]/255);
 const scaled=new Uint8Array(pixels.length),density=finish.scale;
 if(density===1)scaled.set(pixels);else for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const sx=Math.floor((x+.5)*density)%resolution,sy=Math.floor((y+.5)*density)%resolution;scaled.set(pixels.subarray((sy*resolution+sx)*4,(sy*resolution+sx)*4+4),(y*resolution+x)*4);
 }
 const map=texture(scaled,resolution,'pgf-land-mattress-camo:'+pattern,true);try{bindVehicleCamouflage({root},finish,map,baked.visual);}catch(error){map.dispose();throw error;}
 root.userData.camouflage.source='PGF bakePgfCamo pattern + PGF metalFinishPixels wear; no armor panel grid';
}
