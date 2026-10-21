import {metalFinishPixels} from '../modules/material-kit/metal-finish.mjs';
import {createRequire} from 'node:module';import {writeFile,copyFile,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const {createCanvas,ImageData}=createRequire(import.meta.url)('@napi-rs/canvas');const path='assets/kar98k-wip/textures/';
const pixels=metalFinishPixels({seed:'dot-kar98k-exterior-wip-01',resolution:256,finish:{rust:.03,chips:0,dirt:.12,wear:.19},color:'#343d43',role:'dark-metal'});
for(const key of ['base','orm','normal']){const c=createCanvas(256,256);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels[key]),256,256),0,0);await writeFile(path+'metal-'+key+'.png',c.toBuffer('image/png'));}
await copyFile('modules/reference-armored-car/assets/blender/pbr/wood-basecolor.png',path+'wood-basecolor.png');
const rows=[];for(const n of ['metal-base','metal-orm','metal-normal','wood-basecolor']){const b=await readFile(path+n+'.png');rows.push({file:path+n+'.png',sha256:createHash('sha256').update(b).digest('hex'),source:n.startsWith('metal')?'modules/material-kit/metal-finish.mjs / deterministic seed dot-kar98k-exterior-wip-01':'modules/reference-armored-car/assets/blender/pbr/wood-basecolor.png'});}
await writeFile('assets/kar98k-wip/materials.json',JSON.stringify(rows,null,2)+'\n');
