/** Runtime transport/mixing of actual Blender-baked pixels. Does not author surface patterns. */
import * as THREE from 'three';
import {unzlibSync} from 'fflate';
import baked from './assets/blender-native-pbr.mjs';
export const NATIVE_SURFACE_PROVENANCE=Object.freeze({source:baked.authoring,blendSha256:baked.sourceBlendSha256,pngSources:baked.sourceFiles.map(({file,pngSha256})=>({file,pngSha256})),ao:'Constant red 1; no complete-vehicle geometry AO',seed:'Deterministic cyclic phase of native baked pixels',weathering:'Mix of native clean/worn endpoints; bare steel stays on clean endpoint'});
export const NATIVE_SCALAR_MATERIALS=baked.scalarMaterials;
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function decode(s){return unzlibSync(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));}
export function createNativeSurfaceMaps({role,seed='gustav-art-1',weathering=.28}){
 const src=baked.roles[role];if(!src)throw Error('Unknown native baked role '+role);const n=baked.size,w=role==='steel'?0:THREE.MathUtils.clamp(weathering,0,1),h=hash(seed+':'+role),dx=role==='deck'?(h%4)*64:h%n,dy=role==='deck'?((h>>>8)%4)*64:(h>>>8)%n;
 const result={};for(const channel of ['baseColor','normal','orm']){const a=decode(src.clean[channel]),b=decode(src.worn[channel]),pixels=new Uint8Array(a.length);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const j=(((y+dy)%n)*n+(x+dx)%n)*4,i=(y*n+x)*4;for(let c=0;c<3;c++)pixels[i+c]=Math.round(a[j+c]+(b[j+c]-a[j+c])*w);pixels[i+3]=255;if(channel==='normal'){const X=pixels[i]/255*2-1,Y=pixels[i+1]/255*2-1,Z=pixels[i+2]/255*2-1,length=Math.hypot(X,Y,Z);pixels[i]=Math.round((X/length*.5+.5)*255);pixels[i+1]=Math.round((Y/length*.5+.5)*255);pixels[i+2]=Math.round((Z/length*.5+.5)*255);}}
 const t=new THREE.DataTexture(pixels,n,n);t.name='gustav-blender-native-'+role+'-'+channel;t.colorSpace=channel==='baseColor'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;t.userData.sourceBlendSha256=baked.sourceBlendSha256;result[channel]=t;}return {albedo:result.baseColor,normal:result.normal,orm:result.orm};
}
