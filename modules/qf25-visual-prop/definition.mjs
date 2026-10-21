import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {PORTABLE_FINISH_DEFAULTS,PORTABLE_FINISH_SCHEMA,PORTABLE_FINISH_ENUM_LABELS} from '../tank/src/portable-vehicle-finish.mjs';
import {buildVisualProp,checkAbort,PARTS,SOURCES} from './model.mjs';
export const ID='qf25-visual-prop',VERSION='1.1.0';
export const defaults=Object.freeze({...PORTABLE_FINISH_DEFAULTS,detail:'medium',artScale:1,wheelSpacing:1,paintColor:'#727b76',roughness:.65,weathering:.3,...Object.fromEntries(Object.keys(PARTS).map(k=>[k,true]))});
const partTitles={showBarrel:'炮管外壳',showShield:'上下盾板',showCarriage:'炮架外壳',showLeftWheel:'左轮外观',showRightWheel:'右轮外观',showTrail:'单箱式尾架',showPlatform:'收起圆平台',showFittings:'座盘手轮与外饰'};
export default defineGenerator({
 id:ID,version:VERSION,label:'QF25 MkII · 外观游戏道具',defaults,quality:['low','medium','high'],
 parameterSchema:{type:'object',additionalProperties:false,properties:{
  detail:{title:'几何细节档',type:'string',enum:['low','medium','high']},
  artScale:{title:'整体艺术比例',type:'number',minimum:.75,maximum:1.5},
  wheelSpacing:{title:'轮距艺术比例',type:'number',minimum:.95,maximum:1.1},
  paintColor:{title:'漆面颜色',type:'string',pattern:'^#[0-9a-fA-F]{6}$'},
  roughness:{title:'漆面粗糙度',type:'number',minimum:.35,maximum:1},
  weathering:{title:'表面风化',type:'number',minimum:0,maximum:1},
  ...PORTABLE_FINISH_SCHEMA,...Object.fromEntries(Object.keys(PARTS).map(k=>[k,{title:partTitles[k],type:'boolean'}]))
 }},inputSchema:{type:'object',additionalProperties:false,properties:{}},
 enumLabels:{...PORTABLE_FINISH_ENUM_LABELS,detail:['低','中','高']},
 ui:{basic:['detail','paintColor','roughness','weathering','camoPattern'],groups:[{id:'shape',title:'艺术比例与外观部件',fields:['artScale','wheelSpacing',...Object.keys(PARTS)]},{id:'material',title:'PGF共享涂装',fields:['camoEnvironment','camoScale']}]},
 presets:[{id:'standard',name:'灰绿 · 无布罩无袋',params:{}},{id:'clean',name:'干净漆面',params:{weathering:0,roughness:.45}},{id:'aged',name:'旧化漆面',params:{weathering:.7,roughness:.82}},{id:'winter',name:'PGF冬季涂装',params:{camoPattern:'winter',camoEnvironment:'snow'}},{id:'low',name:'低细节预览',params:{detail:'low'}}],
 capabilities:{procedural:false,authoredAssetAssembly:true,multiQuality:true,browserWorker:true,staticGLB:true,recipeJSON:true,partVisibility:true,materialParameters:true,artProportions:true,onlineRemodeling:false,animation:false,units:'art-units-exported-as-meters',upAxis:'Y',scope:'Nonfunctional closed exterior game art; no internal mechanism, manufacture data, performance or projectile simulation'},
 async generate({params={},seed,quality},{signal,budget={}}={}){
  checkAbort(signal);if(!budget||typeof budget!=='object'||Array.isArray(budget))throw Error('Invalid budget');
  const supported=new Set(['maxTriangles','maxDraws','maxNodes','maxOutputBytes','maxMaterialSlots']),limits={...BUDGET,...budget};
  for(const [k,v]of Object.entries(limits))if(!supported.has(k)||!Number.isFinite(v)||v<0)throw Error('Invalid budget '+k);
  const resolved={...defaults,...params,...(quality?{detail:quality}:{})};
  const model=await buildVisualProp(resolved,{seed,signal});
  try{
   checkAbort(signal);const asset=await threeToIR(model.root);checkAbort(signal);asset.id=ID;asset.generator={id:ID,version:VERSION};asset.seed=seed;
   const recipe={generator:ID,version:VERSION,seed,params:resolved,quality:resolved.detail};
   asset.metadata={recipe,...model.metadata,source:{kind:'Blender MCP authored closed exterior',sha256:SOURCES[resolved.detail].sha256,stage:'Q2',quality:resolved.detail},materialSource:'PGF material-kit metalFinishPixels PBR + existing bakePgfCamo; no armor panel grid',capabilityBoundary:{geometry:'Fixed authored multi-quality assembly with bounded art-scale and wheel-spacing',onlineRemodeling:false,animationExported:false,functional:false,internalMechanism:false,historicalFidelity:'1940–42 MkII/MkI-L exterior interpretation, not exact museum replication'},export:'Static visible geometry, PBR textures, semantic hierarchy and recipe; runtime effects excluded'};
   for(const n of asset.nodes)if(Object.values(PARTS).includes(n.name))n.tags.push('selectable','art-exterior-part');
   const stats=assetStatistics(asset),actual={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes,maxMaterialSlots:stats.materials};
   for(const [k,v]of Object.entries(actual))if(v>limits[k])throw Error(k+' exceeded: '+v+' > '+limits[k]);
   return {asset,recipe,diagnostics:[{engine:'blender-mcp-authored-pgf-assembly',...stats,quality:resolved.detail,showCover:false,scope:'静态GLB；牵引滚动和烟雾仅宿主预览，不包含真实机构或性能'}]};
  }finally{model.owner.dispose();}
 }
});
