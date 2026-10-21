/** Additive adapter for external PGF vehicle kits. Existing tank behavior is untouched.
 * PBR pixels: existing PGF turret-surface-materials.mjs.
 * Pattern painter/binder: existing camouflage.js + vendored MIT legacy-tank-source.
 * Canvas hosts are scoped synchronously; Node's optional native host is loaded only for patterns.
 */
import * as THREE from 'three';
import {hash32} from '../../../src/plugins/scatter/core.js';
import {buildTurretSurfacePixels} from '../upstream/src/turret-surface-materials.mjs';
import {PATTERNS,ENVIRONMENTS,normalizeFinish,resolvedPattern,bindVehicleCamouflage} from './camouflage.js';
import {bakePgfCamo} from '../upstream/vendor/legacy-tank-source/src/vehicles/materials.js';
export {PATTERNS,ENVIRONMENTS};
export const PORTABLE_FINISH_DEFAULTS=Object.freeze({camoPattern:'original',camoEnvironment:'desert',camoScale:1});
export const PORTABLE_FINISH_SCHEMA=Object.freeze({
 camoPattern:{type:'string',title:'坦克材质 · 涂装图案',enum:['original','auto',...Object.keys(PATTERNS)]},
 camoEnvironment:{type:'string',title:'坦克材质 · 环境',enum:Object.keys(ENVIRONMENTS)},
 camoScale:{type:'number',title:'坦克材质 · 图案密度',minimum:.5,maximum:2},
});
export const PORTABLE_FINISH_ENUM_LABELS=Object.freeze({camoPattern:['原色涂装','随环境',...Object.values(PATTERNS)],camoEnvironment:Object.values(ENVIRONMENTS)});
export const finishFromParams=p=>normalizeFinish({pattern:p.camoPattern??'original',environment:p.camoEnvironment??'desert',scale:p.camoScale??1});
export const portableSeed=seed=>hash32(seed)%1000000;
function flipRows(source,n){const out=new Uint8Array(source.length);for(let y=0;y<n;y++)out.set(source.subarray(y*n*4,(y+1)*n*4),(n-1-y)*n*4);return out;}
export function buildPortableArmorPixels({seed='pgf-components-1',weathering=.35,resolution=512}={}){
 const p=buildTurretSurfacePixels({resolution,weathering,seed:portableSeed(seed)}),orm=new Uint8Array(p.roughness.length);
 for(let i=0;i<orm.length;i+=4)orm.set([255,p.roughness[i],255,255],i);
 return {albedo:flipRows(p.baseColor,resolution),normal:flipRows(p.normal,resolution),orm:flipRows(orm,resolution),size:resolution};
}
function texture(data,n,name,srgb=false){const t=new THREE.DataTexture(data,n,n);t.name=name;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
export function createPortableArmorMaps(options={}){const p=buildPortableArmorPixels(options);return {albedo:texture(p.albedo,p.size,'tank-armor-basecolor',true),normal:texture(p.normal,p.size,'tank-armor-normal'),orm:texture(p.orm,p.size,'tank-armor-metallic-roughness')};}
let nodeHost;
async function canvasHost(){
 if(typeof process!=='undefined'&&process.versions?.node){
  // Keep the native Node binary out of browser bundles. This is the project's pinned optional host.
  const packageName='@napi-rs/canvas';nodeHost??=import(/* @vite-ignore */ packageName);const {createCanvas,Path2D,DOMMatrix}=await nodeHost;return {createCanvas,Path2D,DOMMatrix};
 }
 if(typeof document!=='undefined'&&typeof Path2D!=='undefined'){const nativeDocument=document;return {document:nativeDocument,createCanvas:(w,h)=>{const c=nativeDocument.createElement('canvas');c.width=w;c.height=h;return c;},Path2D:globalThis.Path2D,DOMMatrix:globalThis.DOMMatrix};}
 if(typeof OffscreenCanvas!=='undefined'&&typeof Path2D!=='undefined')return {createCanvas:(w,h)=>new OffscreenCanvas(w,h),Path2D:globalThis.Path2D,DOMMatrix:globalThis.DOMMatrix};
 throw Error('The existing tank pattern painter requires a Canvas2D/Path2D host');
}
export async function applyPortableCamouflage(root,{seed='pgf-components-1',weathering=.35,paint,finish=normalizeFinish(),resolution=512}={}){
 finish=normalizeFinish(finish);const pattern=resolvedPattern(finish);if(pattern==='original'){root.userData.camouflage={...finish,pattern,source:'PGF tank armor PBR'};return;}
 const host=await canvasHost(),saved=new Map();let baked;
 const replace=(key,value)=>{if(globalThis[key]===value)return;saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});};
 try{
  replace('document',host.document??{createElement(tag){if(tag!=='canvas')throw Error('Unexpected tank painter element');return host.createCanvas(resolution,resolution);}});
  replace('Path2D',host.Path2D);
  if(host.DOMMatrix)replace('DOMMatrix',host.DOMMatrix);
  baked=bakePgfCamo(pattern,portableSeed(seed),paint,resolution);
 }finally{for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 const wear=buildTurretSurfacePixels({resolution,weathering,seed:portableSeed(seed)}).baseColor,paintPixels=baked.canvas.getContext('2d').getImageData(0,0,resolution,resolution).data;
 for(let i=0;i<paintPixels.length;i+=4){const factor=(wear[i]+wear[i+1]+wear[i+2])/(3*194);for(let c=0;c<3;c++)paintPixels[i+c]=Math.min(255,paintPixels[i+c]*factor);}
 // Match the existing tank headless adapter: bake repeat, since AssetIR has no texture-transform field.
 const repeat=new Uint8Array(paintPixels.length),scale=finish.scale;
 if(scale===1)repeat.set(paintPixels);else for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const sx=((x+.5)*scale-.5)%resolution,sy=((y+.5)*scale-.5)%resolution,x0=Math.floor(sx),y0=Math.floor(sy),u=sx-x0,v=sy-y0;
  const sample=(xx,yy,c)=>paintPixels[(((yy+resolution)%resolution)*resolution+(xx+resolution)%resolution)*4+c];
  for(let c=0;c<4;c++)repeat[(y*resolution+x)*4+c]=(sample(x0,y0,c)*(1-u)+sample(x0+1,y0,c)*u)*(1-v)+(sample(x0,y0+1,c)*(1-u)+sample(x0+1,y0+1,c)*u)*v;
 }
 const map=texture(flipRows(repeat,resolution),resolution,'pgf-camo:'+pattern,true);
 bindVehicleCamouflage({root},finish,map,baked.visual);
 root.userData.camouflage.source='Existing PGF tank bakePgfCamo painter';
}
