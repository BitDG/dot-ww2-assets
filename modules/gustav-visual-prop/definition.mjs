import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {createGustavVisualModel,defaults,disposeTree,TIER_BUDGETS} from './core.mjs';
import {PORTABLE_FINISH_SCHEMA,PORTABLE_FINISH_ENUM_LABELS,finishFromParams,applyPortableCamouflage} from '../tank/src/portable-vehicle-finish.mjs';
export {defaults};
const factor=title=>({type:'number',title,minimum:.85,maximum:1.15}),toggle=title=>({type:'boolean',title});
export default defineGenerator({id:'gustav-visual-prop',version:'1.1.2',label:'古斯塔夫 · 外观游戏道具',
 enumLabels:{...PORTABLE_FINISH_ENUM_LABELS,detail:['低 · 轮廓','中 · 展示','高 · 近景']},
 parameterSchema:{type:'object',additionalProperties:false,properties:{
 silhouetteLength:factor('轮廓长短倍率'),silhouetteWidth:factor('轮廓宽窄倍率'),silhouetteHeight:factor('轮廓高低倍率'),wheelVisualScale:factor('圆轮视觉倍率'),frameChunkiness:factor('侧架厚重感'),
 shellLengthFactor:{type:'number',title:'长圆筒外观倍率',minimum:.9,maximum:1.1},detail:{type:'string',title:'美术细节档',enum:['low','medium','high']},
 rivetDensity:{type:'number',title:'装饰铆钉密度',minimum:0,maximum:1},weathering:{type:'number',title:'漆面磨损',minimum:0,maximum:1},
 paintColor:{type:'string',title:'油漆色',pattern:'^#[0-9a-fA-F]{6}$'},metalColor:{type:'string',title:'裸钢色',pattern:'^#[0-9a-fA-F]{6}$'},
 showRails:toggle('展示轨道'),showRailings:toggle('栏杆'),showStairs:toggle('外观楼梯'),showRivets:toggle('装饰铆钉'),showRearDeck:toggle('后部展示平台'),showDecorativeBoxes:toggle('装饰箱体'),...PORTABLE_FINISH_SCHEMA}},
 inputSchema:{type:'object',additionalProperties:false,properties:{}},defaults,
 ui:{basic:['detail','silhouetteLength','silhouetteWidth','silhouetteHeight','weathering','showRails'],shape:['wheelVisualScale','shellLengthFactor','frameChunkiness','rivetDensity'],material:['paintColor','metalColor','weathering','camoPattern','camoEnvironment','camoScale'],scene:['showRails','showRailings','showStairs','showRivets','showRearDeck','showDecorativeBoxes']},
 presets:[{id:'reference-gray',name:'参考灰钢',params:{}},{id:'clean-display',name:'干净展品',params:{weathering:.05,rivetDensity:.8,detail:'high'}},{id:'field-olive',name:'美术橄榄',params:{paintColor:'#636c53',weathering:.55}},{id:'low-silhouette',name:'低档轮廓',params:{detail:'low',showRivets:false}}],
 capabilities:{procedural:true,browserWorker:true,staticGLB:true,units:'meters',upAxis:'Y',nonfunctionalExteriorOnly:true},
 async generate(request,{signal,budget={}}={}){
  const check=()=>{if(signal?.aborted)throw new DOMException('Generation canceled','AbortError');};check();
  const params={...defaults,...request.params},recipe={generator:'gustav-visual-prop',version:'1.1.2',seed:request.seed,params},root=createGustavVisualModel(params,{seed:request.seed});
  try{
   await applyPortableCamouflage(root,{seed:request.seed,weathering:params.weathering,paint:params.paintColor,finish:finishFromParams(params),resolution:params.detail==='low'?128:256});check();
   const asset=await threeToIR(root);check();asset.id='gustav-visual-prop';asset.generator={id:'gustav-visual-prop',version:'1.1.2'};asset.seed=request.seed;
   const sourceByName=new Map(),roleByName=new Map();root.traverse(o=>{if(o.isMesh){sourceByName.set(o.name,{name:o.name,owner:o.parent.name,source:o.userData.source,appearanceRole:o.material.userData.appearanceRole,...(o.userData.sourceParts?{sourceParts:o.userData.sourceParts}:{})});roleByName.set(o.name,o.material.name);}});
   const components=asset.nodes.filter(n=>n.meshId).map(n=>({nodeId:n.id,...sourceByName.get(n.name)}));
   for(const n of asset.nodes){const c=sourceByName.get(n.name);if(c)n.tags=['visual-prop','owner:'+c.owner,'source:'+c.source,'role:'+c.appearanceRole];}
   asset.metadata={recipe,visualOnly:root.userData.pgf,components,batching:root.userData.batch,materialRoles:asset.nodes.filter(n=>n.meshId).map(n=>({nodeId:n.id,role:roleByName.get(n.name)})),finish:root.userData.camouflage,lodPolicy:'Explicit generation detail presets, not automatic runtime LOD',scaleDisclosure:'PGF unit container only; arbitrary unmeasured art units, no historical measurements',aoDisclosure:'Shared ORM R is constant; no baked geometry AO claimed'};
   const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};asset.sockets=[{id:'display-placement',nodeId:asset.rootNodeIds[0],transform:identity,tags:['placement','visual-only']}];
   for(const name of ['rail-wheel-facades','main-outer-frame','closed-cylinder-shell','walkways','rear-display-deck']){const n=asset.nodes.find(n=>n.name===name);if(n)asset.sockets.push({id:'display-'+name,nodeId:n.id,transform:structuredClone(identity),tags:['display-component','visual-only']});}
   const stats=assetStatistics(asset),tier=TIER_BUDGETS[params.detail],actual={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes+JSON.stringify(asset.metadata).length*4+stats.nodes*1200+20000,maxMaterialSlots:stats.materials};
   const limits={...BUDGET,...budget};limits.maxTriangles=Math.min(limits.maxTriangles,tier.triangles);limits.maxDraws=Math.min(limits.maxDraws,tier.draws);limits.maxMaterialSlots=Math.min(limits.maxMaterialSlots??16,16);for(const [key,limit]of Object.entries(limits)){if(!(key in actual)||!Number.isFinite(limit)||limit<0)throw Error('Invalid budget '+key);if(actual[key]>limit)throw Error(key+' exceeded '+actual[key]+'/'+limit);}
   return {asset,recipe,diagnostics:[{...stats,detail:params.detail,source:'Actual Blender MCP prototypes + PGF parametric rule assembly',visualOnly:true}]};
  }finally{disposeTree(root);}
 }
});
