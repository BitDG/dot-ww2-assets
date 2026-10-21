import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {createReferenceArmoredCarModel,disposeTree,defaults} from './core.mjs';
import {PORTABLE_FINISH_SCHEMA,PORTABLE_FINISH_ENUM_LABELS,finishFromParams,applyPortableCamouflage} from '../tank/src/portable-vehicle-finish.mjs';
export {defaults};
export default defineGenerator({
 id:'reference-armored-car',version:'1.1.0',label:'参考图四轮装甲车',enumLabels:PORTABLE_FINISH_ENUM_LABELS,
 parameterSchema:{type:'object',additionalProperties:false,properties:{
  scale:{type:'number',title:'整体比例',minimum:.1,maximum:3},
  turretYaw:{type:'number',title:'炮塔转角（度）',minimum:-180,maximum:180},
  gunElevation:{type:'number',title:'炮管俯仰（度）',minimum:-8,maximum:25},
  paint:{type:'string',title:'装甲漆色',pattern:'^#[0-9a-fA-F]{6}$'},
  roughness:{type:'number',title:'漆面粗糙度',minimum:.35,maximum:1},
  weathering:{type:'number',title:'积尘与磨损',minimum:0,maximum:1},
  antennas:{type:'boolean',title:'天线'},markings:{type:'boolean',title:'白色菱形标识'},
  detail:{type:'integer',title:'几何细节（三档）',minimum:24,maximum:64},...PORTABLE_FINISH_SCHEMA
 }},inputSchema:{type:'object',additionalProperties:false,properties:{}},defaults,
 ui:{basic:['scale','turretYaw','gunElevation','paint','weathering','antennas','markings'],shape:['scale','turretYaw','gunElevation','detail'],material:['paint','roughness','weathering','markings','camoPattern','camoEnvironment','camoScale'],scene:['antennas']},
 presets:[{id:'reference',name:'照片姿态',params:{}},{id:'forward',name:'炮塔朝前',params:{turretYaw:0}},{id:'clean',name:'干净装甲',params:{weathering:.05}},{id:'dusty',name:'风化装甲',params:{weathering:.65,paint:'#8d8061'}}],
 capabilities:{procedural:true,browserWorker:true,staticGLB:true,units:'meters',upAxis:'Y'},
 async generate(request,{signal,budget={}}={}){
  const aborted=()=>{if(signal?.aborted)throw new DOMException('生成已取消','AbortError');};aborted();
  const params={...defaults,...request.params},root=createReferenceArmoredCarModel(params,{seed:request.seed}),recipe={generator:'reference-armored-car',version:'1.1.0',seed:request.seed??'pgf-components-1',params};
  try{
   await applyPortableCamouflage(root,{seed:request.seed,weathering:params.weathering,paint:params.paint,finish:finishFromParams(params)});aborted();
   const asset=await threeToIR(root);aborted();asset.id='reference-armored-car';asset.generator={id:'reference-armored-car',version:'1.1.0'};asset.seed=recipe.seed;
   const parts=[];root.traverse(n=>{if(n.isMesh&&n.userData.sourceParts)parts.push({batch:n.name,ranges:n.userData.sourceParts});});
   asset.metadata={recipe,units:'meters',upAxis:'Y',forwardAxis:'+Z',referenceReconstruction:{noHumans:true,hiddenRear:'inferred',scale:'approximate metres',visualRevision:'2026-10-10-blender-brown-diamond-tank-finish',tankFinish:root.userData.camouflage,materialSource:'PGF tank buildTurretSurfacePixels + bakePgfCamo; paint roles only',defaultMigration:'Default turretYaw changes from -35 to -10 degrees and paint from #73795b to #827456; all explicit recipe values retain their original numeric meaning',finish:'Existing PGF tank armor surface and source pattern painter on armor roles; separate original rubber/canvas/metal/marking PBR; no photograph projection',qualityScope:'Exterior art reconstruction reviewed visually; no numerical likeness percentage asserted',wheelPose:'Visual rigid articulation only; not suspension, ballistics, functional design or engineering CAD',source:'User-supplied brown armored-car photograph; generated three-view for inferred unseen surfaces',authoring:'Blender 4.3.2 through actual local stdio MCP',kitSha256:root.userData.pgf.sourceSha256,detailTier:root.userData.pgf.detailTier,detailRanges:{low:[24,35],medium:[36,55],high:[56,64]},ao:'Not translated by current PGF AssetIR path; no AO preservation claimed',reused:['Blender-authored modular parts','shared Three-to-AssetIR converter','shared data workbench']},pivots:root.userData.pgf.pivots,parts};
   const t=(position=[0,0,0])=>({position,rotation:[0,0,0,1],scale:[1,1,1]});
   const rootId=asset.rootNodeIds[0];asset.sockets=[{id:'placement',nodeId:rootId,transform:t(),tags:['placement']}];
   for(const name of root.userData.pgf.pivots){const node=asset.nodes.find(n=>n.name===name);if(node)asset.sockets.push({id:name,nodeId:node.id,transform:t(),tags:['articulation',name.includes('wheel')?'wheel':name.includes('gun')?'gun':'turret']});}
   asset.colliders=[{kind:'box',nodeId:rootId,size:[2.70,2.65,4.60],offset:[0,1.325,0]}];
   const stats=assetStatistics(asset),actual={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes,maxMaterialSlots:stats.materials};
   for(const [key,limit]of Object.entries({...BUDGET,...budget})){if(!(key in actual)||!Number.isFinite(limit)||limit<0)throw Error('Invalid budget '+key);if(actual[key]>limit)throw Error(key+' exceeded: '+actual[key]);}
   return {asset,recipe,diagnostics:[{engine:'blender-mcp-authored-parametric-kit',detailTier:root.userData.pgf.detailTier,...stats,noHumans:true}]};
  }finally{disposeTree(root);}
 }
});
