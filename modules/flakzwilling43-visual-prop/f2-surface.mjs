/** F2 transport wrapper for the existing PGF painted-metal surface implementation.
 * Pixels, masks and normal generation come unchanged from material-kit/metal-finish.mjs.
 * Reused existing project source; no standalone license was included in the recovered snapshot. No new shader or texture-baking algorithm.
 * Surface role: armorPaint/fittingPaint -> paint. Nonfunctional caps stay untextured.
 */
import * as THREE from 'three';
import {metalFinishPixels} from '../material-kit/metal-finish.mjs';
export const METAL_FINISH_PROVENANCE=Object.freeze({source:'modules/material-kit/metal-finish.mjs',function:'metalFinishPixels',roles:{armorPaint:'paint',fittingPaint:'paint'},color:'user paintColor passed directly to PGF metalFinishPixels; fitting role receives 0.82 color multiplier',weathering:'rust=.12*w, chips=.35*w, dirt=.22*w, wear=.30*w',normal:'linear tangent-space map',orm:'R=neutral AO, G=roughness, B=metallic',encoding:'baseColor=sRGB, normal and ORM=linear',scope:'Existing PGF deterministic masks; no invented structural weld patterns'});
function texture(data,n,name,srgb){const t=new THREE.DataTexture(data,n,n);t.name=name;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
export function createMetalFinishMaps({seed,weathering,resolution,paintColor}){const w=weathering,p=metalFinishPixels({seed,resolution,finish:{rust:.12*w,chips:.35*w,dirt:.22*w,wear:.30*w},color:paintColor,role:'paint'});return {albedo:texture(p.base,resolution,'pgf-metal-finish-basecolor',true),normal:texture(p.normal,resolution,'pgf-metal-finish-normal',false),orm:texture(p.orm,resolution,'pgf-metal-finish-orm',false)};}
