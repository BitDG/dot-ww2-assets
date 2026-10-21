import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';
import {assetStatistics} from '../../generator-sdk/statistics.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {createTrackedMortarModel,disposeModel} from './model.mjs';
import {PORTABLE_FINISH_DEFAULTS,PORTABLE_FINISH_SCHEMA,finishFromParams,applyPortableCamouflage,PORTABLE_FINISH_ENUM_LABELS} from '../tank/src/portable-vehicle-finish.mjs';
export const defaults={...PORTABLE_FINISH_DEFAULTS,paintColor:'#a2aaaf',length:10.8,elevation:0,barrelScale:1,weathering:.32,detail:'high',railings:true,exploded:0};
export default defineGenerator({
 parameterSchema:{type:'object',additionalProperties:false,properties:{...PORTABLE_FINISH_SCHEMA,paintColor:{title:'坦克材质 · 漆面颜色',type:'string',pattern:'^#[0-9a-fA-F]{6}$'},length:{title:'车体长度（米）',type:'number',minimum:9,maximum:12},elevation:{title:'展示仰角（度）',type:'number',minimum:0,maximum:70},barrelScale:{title:'炮管粗细',type:'number',minimum:.85,maximum:1.15},weathering:{title:'钢材磨损',type:'number',minimum:0,maximum:.65},detail:{title:'细节密度',type:'string',enum:['standard','high']},railings:{title:'平台栏杆',type:'boolean'},exploded:{title:'结构展开',type:'number',minimum:0,maximum:1}}},
 enumLabels:{...PORTABLE_FINISH_ENUM_LABELS,detail:['标准','精细']},defaults,
 presets:[{id:'reference',name:'参考图 · 低位外观',params:{}},{id:'inspection',name:'35° · 外观检查',params:{elevation:35}},{id:'exploded',name:'组件展开',params:{exploded:.65}}],
 ui:{basic:['elevation','barrelScale','weathering','detail','railings','exploded'],groups:[{id:'shape',fields:['length']},{id:'material',title:'坦克材质',fields:['paintColor','camoPattern','camoEnvironment','camoScale']}]},
 capabilities:{units:'meters',backend:'blender-mcp-kit / procedural-threejs',export:'static-glb',reference:'Blender-MCP/exterior-reference-reconstruction',reused:['Blender reusable part kit','shared-workbench','AssetIR']},
 async generate({params={},seed},{signal,budget={}}={}){
  const aborted=()=>{if(signal?.aborted)throw new DOMException('生成已取消','AbortError');};aborted();
  if(!budget||typeof budget!=='object'||Array.isArray(budget))throw Error('Invalid budget');
  const supported=new Set(['maxTriangles','maxDraws','maxNodes','maxOutputBytes','maxMaterialSlots']),limits={...BUDGET,...budget};
  for(const [key,value]of Object.entries(limits))if(!supported.has(key)||!Number.isFinite(value)||value<0)throw Error('Invalid budget '+key);
  const enforce=actual=>{for(const [key,value]of Object.entries(actual))if(limits[key]!==undefined&&value>limits[key])throw Error(key+' exceeded: '+value+' > '+limits[key]);};
  // Yield between owned phases for Node/MCP AbortSignals; browser Workers may
  // additionally terminate their jobs. No partial result is ever returned.
  const checkpoint=async()=>{aborted();if(signal){await new Promise(resolve=>setTimeout(resolve,0));aborted();}};
  const resolved={...defaults,...params},model=createTrackedMortarModel(resolved,{seed});
  try{
   await checkpoint();enforce({maxTriangles:model.metadata.batching.triangles,maxDraws:model.metadata.batching.draws});
   await applyPortableCamouflage(model.root,{seed,weathering:resolved.weathering,paint:resolved.paintColor,finish:finishFromParams(resolved)});await checkpoint();
   model.metadata.camouflage={...model.root.userData.camouflage};
   const asset=await threeToIR(model.root);await checkpoint();asset.id='tracked-mortar';asset.generator={id:'tracked-mortar',version:'2.0.0'};asset.seed=seed;asset.metadata={...model.metadata,recipe:{seed,params:resolved},visualAcceptance:{status:'unscored-review-required',scope:'original visible reference; hidden faces inferred',numericScore:null}};
   for(const [name,node]of Object.entries(model.parts)){const owner=asset.nodes.find(n=>n.name===node.name);if(owner)owner.tags.push('selectable','mortar-part:'+name);}
   const nodeId=asset.rootNodeIds[0];asset.colliders=[{kind:'box',nodeId,size:[3.64,2.2,resolved.length],offset:[0,1.1,0]}];for(const [id,position]of Object.entries(model.metadata.sockets))asset.sockets.push({id,nodeId,position,rotation:[0,0,0,1],transform:{position,rotation:[0,0,0,1],scale:[1,1,1]},tags:['articulation']});
   const stats=assetStatistics(asset);enforce({maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes,maxMaterialSlots:stats.materials});aborted();
   return {asset,recipe:{seed,params:resolved},diagnostics:[{level:'warning',message:'Blender MCP 外观重建；隐藏面为推测，GLB 保存当前展示姿态。新版默认低位，已有角度数值仍保持原度数含义；未声明数值相似度通过。'}]};
  }finally{disposeModel(model.root);}
 }
});
