import {metalFinishPixels} from '../modules/material-kit/metal-finish.mjs';
import {createRequire} from 'node:module';import {writeFile,copyFile,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const {createCanvas,ImageData}=createRequire(import.meta.url)('@napi-rs/canvas');const path='assets/kar98k-wip/textures/';
const pixels=metalFinishPixels({seed:'dot-kar98k-exterior-wip-01',resolution:256,finish:{rust:.03,chips:0,dirt:.12,wear:.19},color:'#343d43',role:'dark-metal'});
for(const key of ['base','orm','normal']){const c=createCanvas(256,256);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels[key]),256,256),0,0);await writeFile(path+'metal-'+key+'.png',c.toBuffer('image/png'));}
// Original deterministic longitudinal grain; no reference photograph is used as a texture.
const size=512,wood=new Uint8ClampedArray(size*size*4),normal=new Uint8ClampedArray(size*size*4);
const height=(u,v)=>{const warp=.018*Math.sin(u*16)+.008*Math.sin(u*39+v*8);return .5+.22*Math.sin((v+warp)*260)+.12*Math.sin((v+warp)*670+Math.sin(u*24))+.06*Math.sin(u*700+v*950);};
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,k=(y*size+x)*4,h=height(u,v),pore=Math.max(0,Math.sin((v+.018*Math.sin(u*16))*260))**16;wood.set([Math.round(86+48*h-12*pore),Math.round(39+29*h-8*pore),Math.round(17+18*h-4*pore),255],k);const dx=(height(u+1/size,v)-height(u-1/size,v))*.12,dy=(height(u,v+1/size)-height(u,v-1/size))*.12;normal.set([Math.round(127.5-dx*127.5),Math.round(127.5-dy*127.5),255,255],k);}
for(const [name,pixels] of [['wood-basecolor',wood],['wood-normal',normal]]){const c=createCanvas(size,size);c.getContext('2d').putImageData(new ImageData(pixels,size,size),0,0);await writeFile(path+name+'.png',c.toBuffer('image/png'));}
const rows=[];for(const n of ['metal-base','metal-orm','metal-normal','wood-basecolor','wood-normal']){const b=await readFile(path+n+'.png');rows.push({file:path+n+'.png',sha256:createHash('sha256').update(b).digest('hex'),source:n.startsWith('metal')?'modules/material-kit/metal-finish.mjs / deterministic seed dot-kar98k-exterior-wip-01':'Original mathematical longitudinal wood grain / scripts/prepare-kar98k-materials.mjs; no museum image pixels'});}
await writeFile('assets/kar98k-wip/materials.json',JSON.stringify(rows,null,2)+'\n');
