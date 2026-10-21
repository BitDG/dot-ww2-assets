/** Dedicated encoded tread PBR. Surface-art texture, not a manufactured tread specification. */
import * as THREE from 'three';
export function createDeckFinish({resolution=128,weathering=.3}={}){
 const n=resolution,albedo=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),orm=new Uint8Array(n*n*4),height=new Float32Array(n*n);
 const period=n/4;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(x+y)%period/period,v=((x-y+n)%period)/period;
  const du=Math.min(u,1-u),dv=Math.min(v,1-v),raised=(du<.09&&v>.22&&v<.78)||(dv<.09&&u>.22&&u<.78);height[y*n+x]=raised?1:0;
  const noise=((Math.imul(x+11,73856093)^Math.imul(y+29,19349663))>>>0)%255/255-.5,tone=raised?190:186;const i=(y*n+x)*4;
  albedo.set([tone+noise*weathering*12,tone+noise*weathering*12,tone+noise*weathering*12,255],i);orm.set([255,raised?178:194,255,255],i);
 }
 const at=(x,y)=>height[((y+n)%n)*n+(x+n)%n];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){let a=(at(x-1,y)-at(x+1,y))*.45,b=(at(x,y-1)-at(x,y+1))*.45,c=1;const length=Math.hypot(a,b,c),i=(y*n+x)*4;normal.set([(a/length*.5+.5)*255,(b/length*.5+.5)*255,(c/length*.5+.5)*255,255],i);}
 function texture(data,name,srgb=false){const t=new THREE.DataTexture(data,n,n);t.name=name;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
 return {albedo:texture(albedo,'gustav-deck-tread-basecolor',true),normal:texture(normal,'gustav-deck-tread-normal'),orm:texture(orm,'gustav-deck-tread-metallic-roughness')};
}
