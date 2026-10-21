import {PORTABLE_FINISH_DEFAULTS,PORTABLE_FINISH_SCHEMA} from '../tank/src/portable-vehicle-finish.mjs';
export const PARTS=Object.freeze({showCab:'BM13_Cab_Exterior',showHoodGrille:'BM13_Hood_Grille',showFendersSteps:'BM13_Fenders_Steps',showChassis:'BM13_Chassis_Exterior',showFrontWheels:'BM13_Front_Wheels',showRearWheels:'BM13_Rear_Dual_Wheels',showRack:'BM13_Empty_Rack_Exterior',showFittings:'BM13_Cosmetic_Fittings'});
export const defaults=Object.freeze({...PORTABLE_FINISH_DEFAULTS,detail:'medium',artScale:1,paintColor:'#777e7d',roughness:.66,weathering:.24,...Object.fromEntries(Object.keys(PARTS).map(k=>[k,true]))});
const titles={showCab:'驾驶室外壳',showHoodGrille:'引擎罩与前防护栅',showFendersSteps:'翼子板与踏板',showChassis:'底盘外观',showFrontWheels:'前轴两轮',showRearWheels:'后双轴双胎',showRack:'水平空载后架',showFittings:'表面小配件'};
export const parameterSchema={type:'object',additionalProperties:false,properties:{
 detail:{type:'string',title:'外观细节档',enum:['low','medium','high']},
 artScale:{type:'number',title:'整体艺术比例',minimum:.65,maximum:1.5},
 paintColor:{type:'string',title:'漆面颜色',pattern:'^#[0-9a-fA-F]{6}$'},
 roughness:{type:'number',title:'漆面粗糙度',minimum:.35,maximum:1},
 weathering:{type:'number',title:'表面旧化',minimum:0,maximum:1},
 ...PORTABLE_FINISH_SCHEMA,...Object.fromEntries(Object.keys(PARTS).map(k=>[k,{type:'boolean',title:titles[k]}]))
}};
export function normalizeParams(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw TypeError('BM13 params must be a plain object');
 for(const key of Object.keys(input))if(!Object.hasOwn(defaults,key))throw TypeError('Unknown BM13 art parameter: '+key);
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
