import {metalFinishPixels} from '../modules/material-kit/metal-finish.mjs';
import {createRequire} from 'node:module';import {writeFile,copyFile,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const {createCanvas,ImageData}=createRequire(import.meta.url)('@napi-rs/canvas');const path='assets/kar98k-wip/textures/';
const pixels=metalFinishPixels({seed:'dot-kar98k-exterior-wip-01',resolution:256,finish:{rust:.03,chips:0,dirt:.12,wear:.19},color:'#343d43',role:'dark-metal'});
for(const key of ['base','orm','normal']){const c=createCanvas(256,256);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels[key]),256,256),0,0);await writeFile(path+'metal-'+key+'.png',c.toBuffer('image/png'));}
// Original multiscale stochastic surfaces; no photograph pixels or periodic stripe pattern.
const size=1024;
function hash(x,y){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^0x23ac91;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,s=t=>t*t*(3-2*t),u=s(fx),v=s(fy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
const grain=(u,v)=>{const warp=(noise(u*3,v*4)-.5)*.065+(noise(u*9,v*8)-.5)*.012;const w=v+warp;return .48*noise(u*2.5,w*48)+.27*noise(u*5,w*150)+.15*noise(u*18,w*380)+.10*noise(u*55,v*600);};
const woodH=(u,v)=>.30*grain(u,v)+.025*noise(u*800,v*1000);
const leatherH=(u,v)=>.3*noise(u*140,v*140)+.2*noise(u*310,v*310)+.06*noise(u*700,v*700);
for(const role of ['wood','leather']){
 const base=new Uint8ClampedArray(size*size*4),normal=new Uint8ClampedArray(size*size*4),height=role==='wood'?woodH:leatherH;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,k=(y*size+x)*4;
  if(role==='wood'){const g=grain(u,v),b=noise(u*4,v*10),fiber=Math.pow(Math.max(0,.57-g)*2,2);base.set([Math.round(68+48*g+12*b-24*fiber),Math.round(32+28*g+8*b-16*fiber),Math.round(16+16*g+5*b-8*fiber),255],k);}
  else{const g=leatherH(u,v),b=noise(u*7,v*7);base.set([Math.round(67+35*g+10*b),Math.round(36+25*g+7*b),Math.round(20+17*g+5*b),255],k);}
  const dx=(height(u+1/size,v)-height(u-1/size,v))*.5,dy=(height(u,v+1/size)-height(u,v-1/size))*.5;normal.set([Math.round(127.5-dx*127.5),Math.round(127.5-dy*127.5),255,255],k);
 }
 for(const [suffix,pixels] of [['basecolor',base],['normal',normal]]){const c=createCanvas(size,size);c.getContext('2d').putImageData(new ImageData(pixels,size,size),0,0);await writeFile(path+role+'-'+suffix+'.png',c.toBuffer('image/png'));}
}
const rows=[];for(const n of ['metal-base','metal-orm','metal-normal','wood-basecolor','wood-normal','leather-basecolor','leather-normal']){const b=await readFile(path+n+'.png');rows.push({file:path+n+'.png',sha256:createHash('sha256').update(b).digest('hex'),source:n.startsWith('metal')?'modules/material-kit/metal-finish.mjs / deterministic seed dot-kar98k-exterior-wip-01':'Original multiscale stochastic wood/leather surface / scripts/prepare-kar98k-materials.mjs; no museum image pixels'});}
await writeFile('assets/kar98k-wip/materials.json',JSON.stringify(rows,null,2)+'\n');
