import * as THREE from 'three';
import {CAMO_PATTERN_IDS,CAMO_PATTERN_LABEL,bakePgfCamo} from '../upstream/vendor/legacy-tank-source/src/vehicles/materials.js';
export const ENVIRONMENTS={desert:'沙漠',jungle:'丛林',snow:'雪地',urban:'城市'};
export const GROUPS={
 '环境迷彩':['summer','desert','winter','digital','merdc','tropic','ambushdot','splinter','pinkdesert','autumn','urbanblock','washworn'],
 '战术图案':['naval','dazzle','flecktarn','amoeba','dpm','tigerstripe','m90','chocchip','digitaldesert','merdcwinter','winterbands','berlin','oakleaf','hexfield','midnight'],
 '历史环境':['normandy44','berlin45','ardennes44','pacific45','jungleops','rasputitsa'],
 '个性涂装':['claude','spark','ducky','suits','flames','leopardprint','bolt','stars','daisy','circuit','racing','paintball'],
};
const chinese=['夏季林地','沙漠','冬季雪地','数码迷彩','MERDC 四色','热带','伏击斑点','碎片','沙漠粉','秋季','城市色块','旧化白涂装','海军灰','眩晕条纹','德式斑点','变形虫','DPM 林地','虎纹','M90 碎片','巧克力碎片','沙漠数码','MERDC 冬季','冬季条带','柏林旅','橡叶','六角网格','午夜行动'];
export const PATTERNS=Object.fromEntries(CAMO_PATTERN_IDS.filter(k=>!['auto','factory'].includes(k)).map((id,i)=>[id,chinese[i]??CAMO_PATTERN_LABEL[id]]));
export const DEFAULT_FINISH={pattern:'original',environment:'desert',scale:1};
export function normalizeFinish(value=DEFAULT_FINISH){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['pattern','environment','scale'].includes(k)))throw Error('迷彩配置无效');
 const v={...DEFAULT_FINISH,...value};
 if(typeof v.pattern!=='string'||!['original','auto',...Object.keys(PATTERNS)].includes(v.pattern)||typeof v.environment!=='string'||!Object.hasOwn(ENVIRONMENTS,v.environment)||!Number.isFinite(v.scale)||v.scale<.5||v.scale>2)throw Error('迷彩图案、环境或比例无效');return v;
}
export function resolvedPattern(finish){return finish.pattern==='auto'?{desert:'desert',jungle:'summer',snow:'winter',urban:'urbanblock'}[finish.environment]:finish.pattern;}
export function applyCamouflage(tank,finish){
 return applyVehicleCamouflage(tank,finish);
}
export function applyVehicleCamouflage(vehicle,finish){
 const pattern=resolvedPattern(finish);if(pattern==='original'||typeof document==='undefined')return;
 const root=vehicle.root??vehicle.object,appearance=vehicle.recipe.design?.appearance??vehicle.recipe.appearance;
 const {canvas,visual}=bakePgfCamo(pattern,vehicle.recipe.seed,appearance.color);
 // Preserve the existing seeded paint-wear field underneath the source pattern.
 let wearTexture=root.getObjectByName('generated-armored-hull')?.material.map;
 if(!wearTexture)root.traverse(node=>{if(!wearTexture&&node.material?.userData?.appearanceRole==='armorPaint')wearTexture=node.material.map;});
 const wearMap=wearTexture?.image;
 if(wearMap?.getContext){const context=canvas.getContext('2d'),paint=context.getImageData(0,0,512,512),wear=wearMap.getContext('2d').getImageData(0,0,512,512).data;for(let i=0;i<paint.data.length;i+=4){const factor=(wear[i]+wear[i+1]+wear[i+2])/(3*194);for(let c=0;c<3;c++)paint.data[i+c]=Math.min(255,paint.data[i+c]*factor);}context.putImageData(paint,0,0);}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.setScalar(finish.scale);map.anisotropy=4;map.name=`pgf-camo:${pattern}`;
 return bindVehicleCamouflage(vehicle,finish,map,visual);
}
export function bindVehicleCamouflage(vehicle,finish,map,visual){
 const root=vehicle.root??vehicle.object,pattern=resolvedPattern(finish);
 const replaced=new Set(),seen=new Set();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean)){if(seen.has(m))continue;seen.add(m);const role=m.userData.appearanceRole;if(['armorPaint','wheelPaint','fittingPaint','armor'].includes(role)){if(m.map)replaced.add(m.map);m.map=map;m.color.set(role==='wheelPaint'?visual.base:'#ffffff');m.needsUpdate=true;}}});
 for(const old of replaced){if(![...seen].some(m=>Object.values(m).includes(old)))old.dispose();}
 if(![...seen].some(m=>m.map===map))map.dispose();
 root.userData.camouflage={pattern,environment:finish.environment,colors:[visual.base,...visual.patches??[]],scale:finish.scale};
}
