import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {PORTABLE_FINISH_ENUM_LABELS} from '../tank/src/portable-vehicle-finish.mjs';
import {buildVisualProp,checkAbort,SOURCES} from './model.mjs';
import {defaults,parameterSchema,normalizeParams,validateSeed,PARTS} from './params.mjs';
export {defaults};
export const ID='qf17-visual-prop',VERSION='0.1.0';
export default defineGenerator({
 id:ID,version:VERSION,label:'QF 17磅炮 Mk I / Mk I炮架 · 外观游戏资产',defaults,quality:['low','medium','high'],parameterSchema,
 inputSchema:{type:'object',additionalProperties:false,properties:{}},
 enumLabels:{...PORTABLE_FINISH_ENUM_LABELS,detail:['低','中','高']},
 ui:{basic:['detail','paintColor','roughness','weathering','camoPattern'],groups:[{id:'shape',title:'艺术比例与外观部件',fields:['artScale',...Object.keys(PARTS)]},{id:'material',title:'PGF共享涂装',fields:['camoEnvironment','camoScale']}]},
 presets:[{id:'gray',name:'灰金属 · 展开静态展示',params:{}},{id:'clean',name:'干净漆面',params:{weathering:0,roughness:.5}},{id:'aged',name:'轻旧化',params:{weathering:.65,roughness:.8}},{id:'winter',name:'PGF冬季涂装',params:{camoPattern:'winter',camoEnvironment:'snow'}},{id:'low',name:'低细节',params:{detail:'low'}}],
 capabilities:{procedural:false,authoredAssetAssembly:true,multiQuality:true,browserWorker:true,staticGLB:true,recipeJSON:true,partVisibility:true,materialParameters:true,artProportions:true,onlineRemodeling:false,animation:false,units:'art-units-exported-as-meters',upAxis:'Y',scope:'Nonfunctional fixed exterior game art; no internal mechanisms, manufacturing measurements or weapon operation'},
 async generate({params={},seed='qf17-exterior-art',quality},{signal,budget={}}={}){
  checkAbort(signal);validateSeed(seed);
  if(!budget||typeof budget!=='object'||Array.isArray(budget))throw TypeError('Invalid budget');
  const supported=new Set(['maxTriangles','maxDraws','maxNodes','maxOutputBytes','maxMaterialSlots']),limits={...BUDGET,...budget};
  for(const [k,v]of Object.entries(limits))if(!supported.has(k)||!Number.isFinite(v)||v<0)throw RangeError('Invalid budget '+k);
  const resolved=normalizeParams({...params,...(quality?{detail:quality}:{})});
  const model=await buildVisualProp(resolved,{seed,signal});
  try{
   checkAbort(signal);const asset=await threeToIR(model.root);checkAbort(signal);asset.id=ID;asset.generator={id:ID,version:VERSION};asset.seed=seed;
   const recipe={generator:ID,version:VERSION,seed,params:resolved,quality:resolved.detail};
   asset.metadata={recipe,...model.metadata,source:{kind:'Blender MCP exterior with reused PGF tire geometry',sha256:SOURCES[resolved.detail].sha256,stage:'Q6',quality:resolved.detail},materialSource:'PGF material-kit metalFinishPixels and existing portable camouflage; no independent bake kernel',capabilityBoundary:{functional:false,internalMechanism:false,manufacturingMeasurements:false,onlineRemodeling:false,animationExported:false,geometry:'Fixed authored exterior with bounded uniform art-scale'},export:'Static visible geometry, PGF materials, semantic hierarchy and art recipe; no weapon-operation animation'};
   for(const n of asset.nodes)if(Object.values(PARTS).includes(n.name))n.tags.push('selectable','art-exterior-part');
   const stats=assetStatistics(asset),actual={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes,maxMaterialSlots:stats.materials};
   for(const [k,v]of Object.entries(actual))if(v>limits[k])throw RangeError(k+' exceeded: '+v+' > '+limits[k]);
   return {asset,recipe,diagnostics:[{engine:'blender-mcp-exterior-pgf-assembly',...stats,scope:'Static deployed exterior game art; Mk pairing source verified; unmeasured and inferred details'}]};
  }finally{model.owner.dispose();}
 }
});
