import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {PORTABLE_FINISH_DEFAULTS,PORTABLE_FINISH_SCHEMA,PORTABLE_FINISH_ENUM_LABELS} from '../tank/src/portable-vehicle-finish.mjs';
import {buildVisualProp,checkAbort,PARTS,SOURCE_SHA256} from './model.mjs';

export const defaults=Object.freeze({...PORTABLE_FINISH_DEFAULTS,paintColor:'#79807f',roughness:.64,weathering:.3,showCradle:true,showFrontSupport:true,showRearTrails:true,showTubeCluster:true,showWheels:true});
export const ID='nebelwerfer41-visual-prop',VERSION='1.0.1';
export default defineGenerator({
 id:ID,version:VERSION,label:'Nebelwerfer 41 · 外观美术资产',defaults,
 parameterSchema:{type:'object',additionalProperties:false,properties:{
  paintColor:{title:'漆面颜色',type:'string',pattern:'^#[0-9a-fA-F]{6}$'},
  roughness:{title:'漆面粗糙度',type:'number',minimum:.35,maximum:1},
  weathering:{title:'表面风化',type:'number',minimum:0,maximum:1},
  ...PORTABLE_FINISH_SCHEMA,
  showCradle:{title:'支架外壳',type:'boolean'},showFrontSupport:{title:'前支撑外壳',type:'boolean'},
  showRearTrails:{title:'后支腿外壳',type:'boolean'},showTubeCluster:{title:'管束外壳',type:'boolean'},showWheels:{title:'车轮外观',type:'boolean'},
 }},inputSchema:{type:'object',additionalProperties:false,properties:{}},enumLabels:PORTABLE_FINISH_ENUM_LABELS,
 ui:{basic:['paintColor','roughness','weathering','camoPattern'],groups:[{id:'material',title:'PGF 共享涂装',fields:['camoEnvironment','camoScale']},{id:'shape',title:'外观部件可见性',fields:Object.keys(PARTS)}]},
 presets:[{id:'gray',name:'灰绿色 · 完整外观',params:{}},{id:'clean',name:'干净漆面',params:{weathering:0,roughness:.45}},{id:'aged',name:'风化漆面',params:{weathering:.8,roughness:.9}},{id:'winter',name:'PGF 冬季涂装',params:{camoPattern:'winter',camoEnvironment:'snow'}}],
 capabilities:{procedural:false,authoredAssetAssembly:true,browserWorker:true,staticGLB:true,recipeJSON:true,partVisibility:true,materialParameters:true,onlineRemodeling:false,animation:false,units:'meters',upAxis:'Y',source:'fixed-blender-authored-exterior-glb',scope:'Nonfunctional sealed exterior art; no internal design, fire control, physics or weapon performance'},
 async generate({params={},seed},{signal,budget={}}={}){
  checkAbort(signal);
  if(!budget||typeof budget!=='object'||Array.isArray(budget))throw Error('Invalid budget');
  const supported=new Set(['maxTriangles','maxDraws','maxNodes','maxOutputBytes','maxMaterialSlots']),limits={...BUDGET,...budget};
  for(const [key,value]of Object.entries(limits))if(!supported.has(key)||!Number.isFinite(value)||value<0)throw Error('Invalid budget '+key);
  const resolved={...defaults,...params},model=await buildVisualProp(resolved,{seed,signal});
  try{
   checkAbort(signal);const asset=await threeToIR(model.root);checkAbort(signal);
   asset.id=ID;asset.generator={id:ID,version:VERSION};asset.seed=seed;
   const recipe={generator:ID,version:VERSION,seed,params:resolved};
   asset.metadata={recipe,units:'meters',upAxis:'Y',...model.metadata,source:{kind:'Blender MCP authored exterior art',sha256:SOURCE_SHA256,stage:'N2',originalSourceUnchanged:true},capabilityBoundary:{operation:'Fixed authored exterior assembly, part visibility and PGF PBR materials',geometry:'N4 shallow sealed surface correction and fixed art display pose',onlineRemodeling:false,animation:false,performanceSimulation:false,internalMechanism:false,dimensions:'Unmeasured art proportions'},materialSource:'PGF portable-vehicle-finish: existing turret-surface PBR and bakePgfCamo',export:'Static visible geometry, PBR textures and recipe metadata; no launch animation'};
   for(const node of asset.nodes)if(Object.values(PARTS).includes(node.name))node.tags.push('selectable','art-exterior-part');
   const stats=assetStatistics(asset),actual={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes,maxMaterialSlots:stats.materials};
   for(const [key,value]of Object.entries(actual))if(value>limits[key])throw Error(key+' exceeded: '+value+' > '+limits[key]);
   return {asset,recipe,diagnostics:[{engine:'fixed-authored-glb-pgf-assembly',...stats,scope:'静态外观资产重组与材质配置；非在线重新建模，GLB 不含演出动画'}]};
  }finally{model.owner.dispose();}
 }
});
