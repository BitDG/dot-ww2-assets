import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {createDieselLocomotiveModel,defaults,disposeTree,TIER_BUDGETS} from './core.mjs';
import {PORTABLE_FINISH_SCHEMA,PORTABLE_FINISH_ENUM_LABELS,finishFromParams,applyPortableCamouflage} from '../tank/src/portable-vehicle-finish.mjs';
import {projectCamouflageUV} from './camouflage-uv.mjs';
export {defaults};
const factor=title=>({type:'number',title,minimum:.85,maximum:1.15}),toggle=title=>({type:'boolean',title});
export default defineGenerator({id:'diesel-locomotive',version:'1.2.1',label:'柴油机车 · 外观模型',
 enumLabels:{...PORTABLE_FINISH_ENUM_LABELS,detail:['低 · 轮廓','中 · 展示','高 · 近景']},
 parameterSchema:{type:'object',additionalProperties:false,properties:{
 bodyLength:factor('车身长短倍率'),bodyWidth:factor('车身宽窄倍率'),bodyHeight:factor('车身高低倍率'),wheelScale:factor('圆轮视觉倍率'),bogieSpacing:factor('两轮组间距倍率'),detail:{type:'string',title:'细节档',enum:['low','medium','high']},
 fanCount:{type:'integer',title:'屋顶风扇外观数量',minimum:2,maximum:5},grilleDensity:{type:'number',title:'格栅细密度',minimum:0,maximum:1},rivetDensity:{type:'number',title:'铆钉密度',minimum:0,maximum:1},weathering:{type:'number',title:'漆面磨损',minimum:0,maximum:1},
 paintColor:{type:'string',title:'车体油漆色',pattern:'^#[0-9a-fA-F]{6}$'},metalColor:{type:'string',title:'裸钢色',pattern:'^#[0-9a-fA-F]{6}$'},
 showRails:toggle('展示轨道'),showRailings:toggle('走道栏杆'),showGrilles:toggle('外观格栅'),showRivets:toggle('铆钉'),...PORTABLE_FINISH_SCHEMA}},
 inputSchema:{type:'object',additionalProperties:false,properties:{}},defaults,
 ui:{basic:['detail','bodyLength','bodyWidth','bodyHeight','paintColor','showRails'],shape:['bogieSpacing','wheelScale','fanCount','grilleDensity','rivetDensity'],material:['paintColor','metalColor','weathering','camoPattern','camoEnvironment','camoScale'],scene:['showRails','showRailings','showGrilles','showRivets']},
 presets:[{id:'reference-gray',name:'参考灰钢',params:{}},{id:'industrial-yellow',name:'工业黄漆',params:{paintColor:'#d3a324',weathering:.38}},{id:'clean-display',name:'干净展品',params:{weathering:.03,detail:'high',rivetDensity:.8}},{id:'weathered-blue',name:'旧蓝机车',params:{paintColor:'#526b80',weathering:.75}},{id:'low-silhouette',name:'低档轮廓',params:{detail:'low',showRivets:false}}],
 capabilities:{procedural:true,browserWorker:true,staticGLB:true,units:'meters',upAxis:'Y',nonfunctionalExteriorOnly:true},
 async generate(request,{signal,budget={}}={}){
  const check=()=>{if(signal?.aborted)throw new DOMException('Generation canceled','AbortError');};check();
  const params={...defaults,...request.params},recipe={generator:'diesel-locomotive',version:'1.2.1',seed:request.seed,params},root=createDieselLocomotiveModel(params,{seed:request.seed});
  try{
   const camouflageUV=params.camoPattern==='original'?null:projectCamouflageUV(root,{scale:params.camoScale});
   await applyPortableCamouflage(root,{seed:request.seed,weathering:params.weathering,paint:params.paintColor,finish:camouflageUV?{...finishFromParams(params),scale:1}:finishFromParams(params),resolution:params.detail==='low'?128:256});if(camouflageUV)root.userData.camouflage.scale=params.camoScale;check();
   const asset=await threeToIR(root);check();asset.id='diesel-locomotive';asset.generator={id:'diesel-locomotive',version:'1.2.1'};asset.seed=request.seed;
   const sourceByName=new Map(),roleByName=new Map();root.traverse(o=>{if(o.isMesh){sourceByName.set(o.name,{name:o.name,owner:o.parent.name,source:o.userData.source,appearanceRole:o.material.userData.appearanceRole,...(o.userData.sourceParts?{sourceParts:o.userData.sourceParts}:{})});roleByName.set(o.name,o.material.name);}});
   const components=asset.nodes.filter(n=>n.meshId).map(n=>({nodeId:n.id,...sourceByName.get(n.name)}));
   for(const n of asset.nodes){const c=sourceByName.get(n.name);if(c)n.tags=['visual-prop','owner:'+c.owner,'source:'+c.source,'role:'+c.appearanceRole];}
   asset.metadata={recipe,visualOnly:root.userData.pgf,components,batching:root.userData.batch,materialRoles:asset.nodes.filter(n=>n.meshId).map(n=>({nodeId:n.id,role:roleByName.get(n.name)})),finish:root.userData.camouflage,...(camouflageUV?{camouflageUV}:{}),lodPolicy:'Explicit generation detail presets, not automatic runtime LOD',scaleDisclosure:'PGF unit container only; arbitrary unmeasured art units, no historical measurements',aoDisclosure:'Shared ORM R is constant; no baked geometry AO claimed'};
   const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};asset.sockets=[{id:'display-placement',nodeId:asset.rootNodeIds[0],transform:identity,tags:['placement','visual-only']}];
   for(const name of ['rail-wheel-facades','chassis-and-tanks','cab-and-short-nose','long-engine-hood','front-three-axle-bogie','rear-three-axle-bogie','roof-fans-and-exhaust','walkways-and-guards']){const n=asset.nodes.find(n=>n.name===name);if(n)asset.sockets.push({id:'display-'+name,nodeId:n.id,transform:structuredClone(identity),tags:['display-component','visual-only']});}
   const stats=assetStatistics(asset),tier=TIER_BUDGETS[params.detail],actual={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes+JSON.stringify(asset.metadata).length*4+stats.nodes*1200+20000,maxMaterialSlots:stats.materials};
   const limits={...BUDGET,...budget};limits.maxTriangles=Math.min(limits.maxTriangles,tier.triangles);limits.maxDraws=Math.min(limits.maxDraws,tier.draws);limits.maxMaterialSlots=Math.min(limits.maxMaterialSlots??16,16);for(const [key,limit]of Object.entries(limits)){if(!(key in actual)||!Number.isFinite(limit)||limit<0)throw Error('Invalid budget '+key);if(actual[key]>limit)throw Error(key+' exceeded '+actual[key]+'/'+limit);}
   return {asset,recipe,diagnostics:[{...stats,detail:params.detail,source:'Actual Blender MCP prototypes + PGF parametric rule assembly',visualOnly:true}]};
  }finally{disposeTree(root);}
 }
});
