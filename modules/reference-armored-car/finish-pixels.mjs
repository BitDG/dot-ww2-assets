// Dependency-free texture authoring shared by Blender PBR preparation and PGF runtime.
function random(seed){let s=2166136261;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),16777619)>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
/** Neutral, repeatable PBR variation, never a photograph or baked lighting. */
export function createFinishPixels(wear,seed){
 const n=512,albedo=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),orm=new Uint8Array(n*n*4),rng=random(seed+'-finish');
 const fields=[8,48,128].map(size=>({size,data:Float32Array.from({length:size*size},()=>rng())}));
 function noise(f,u,v){const s=f.size,x=((u%1+1)%1)*s,y=((v%1+1)%1)*s,ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,d=f.data;return (d[iy*s+ix]*(1-a)+d[iy*s+(ix+1)%s]*a)*(1-b)+(d[((iy+1)%s)*s+ix]*(1-a)+d[((iy+1)%s)*s+(ix+1)%s]*a)*b;}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,u=x/n,v=y/n,macro=noise(fields[0],u,v),grain=noise(fields[2],u,v),patch=noise(fields[1],u,v),r=rng();
  const chip=wear>0&&patch<.29&&r<wear*.035,stain=wear*(.14*macro+.065*patch),f=Math.round(255*(1-stain)-(chip?wear*95:0));
  albedo.set([f,Math.max(0,f-Math.round(wear*3)),Math.max(0,f-Math.round(wear*9)),255],i);
  const dx=noise(fields[2],u+1/n,v)-grain,dy=noise(fields[2],u,v+1/n)-grain;
  normal.set([128+Math.round(dx*(3+wear*18)),128+Math.round(dy*(3+wear*18)),255,255],i);
  // Neutral R is deliberately unused: PGF does not preserve AO.
  orm.set([255,Math.round(231+macro*24),255,255],i);
 }
 return {albedo,normal,orm,size:n};
}
