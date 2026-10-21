import {PORTABLE_FINISH_DEFAULTS,PORTABLE_FINISH_SCHEMA} from '../tank/src/portable-vehicle-finish.mjs';
export const PARTS=Object.freeze({showBundle:'LM_Tube_Bundle_Exterior',showRackFrame:'LM_Rack_Frame_Exterior',showCarriage:'LM_Carriage_Exterior',showWheels:'LM_Road_Wheels',showFenders:'LM_Fenders',showDrawbar:'LM_Drawbar_Tow_Eye',showSupports:'LM_Display_Supports',showFittings:'LM_Cosmetic_Fittings'});
export const ART_CONTRACT=Object.freeze({variant:'Land Mattress No.8 Mk I / A.C. Cars 1945',rows:5,columns:6,mouthCount:30,roadWheels:2,pose:'parked-unloaded-display',functional:false,animation:false,measurements:false});
export const defaults=Object.freeze({...PORTABLE_FINISH_DEFAULTS,detail:'medium',artScale:1,paintColor:'#777e7d',roughness:.66,weathering:.24,...Object.fromEntries(Object.keys(PARTS).map(k=>[k,true]))});
const titles={showBundle:'五排六列外观管束',showRackFrame:'外框与侧面支撑',showCarriage:'轮式底架外观',showWheels:'单轴双轮',showFenders:'翼板',showDrawbar:'牵引架与拖环',showSupports:'静态展示支脚',showFittings:'表面小配件'};
export const parameterSchema={type:'object',additionalProperties:false,properties:{
 detail:{type:'string',title:'外观细节档',enum:['low','medium','high']},
 artScale:{type:'number',title:'整体艺术比例',minimum:.65,maximum:1.5},
 paintColor:{type:'string',title:'漆面颜色',pattern:'^#[0-9a-fA-F]{6}$'},
 roughness:{type:'number',title:'漆面粗糙度',minimum:.35,maximum:1},
 weathering:{type:'number',title:'表面旧化',minimum:0,maximum:1},
 ...PORTABLE_FINISH_SCHEMA,...Object.fromEntries(Object.keys(PARTS).map(k=>[k,{type:'boolean',title:titles[k]}]))
}};
export function normalizeParams(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw TypeError('Land Mattress params must be a plain object');
 for(const key of Object.keys(input))if(!Object.hasOwn(defaults,key))throw TypeError('Unknown Land Mattress art parameter: '+key);
 const p={...defaults,...input};
 for(const [key,s]of Object.entries(parameterSchema.properties)){
  const v=p[key];if(s.enum){if(!s.enum.includes(v))throw TypeError('Invalid '+key);continue;}
  if(s.type==='number'){if(typeof v!=='number'||!Number.isFinite(v)||v<s.minimum||v>s.maximum)throw RangeError('Out of range '+key);}
  else if(s.type==='boolean'){if(typeof v!=='boolean')throw TypeError('Invalid '+key);}
  else if(s.type==='string'){if(typeof v!=='string'||!new RegExp(s.pattern).test(v))throw TypeError('Invalid '+key);}
 }
 if(!Object.keys(PARTS).some(k=>p[k]))throw RangeError('Keep at least one exterior part visible');
 return p;
}
export function validateSeed(seed){if(typeof seed!=='string'||!seed.length||seed.length>128||/[\x00-\x1f]/.test(seed))throw TypeError('Seed must be 1–128 printable characters');return seed;}
