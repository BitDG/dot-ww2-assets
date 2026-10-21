import {defineGenerator} from '../../generator-sdk/definition.mjs';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {buildVehicle,disposeVehicle} from './model.mjs';
import {enforceBudget} from '../wheel-assembly/budget.mjs';
export const defaults={length:6.1,wheelbase:4,tireScale:1,roofEquipment:true,spareWheel:true,finish:'reference',wear:.45,steering:0,explode:0};
export const parameterSchema={type:'object',additionalProperties:false,properties:{
 length:{title:'车身长度 · m',type:'number',minimum:5.5,maximum:7},
 wheelbase:{title:'轴距 · m',type:'number',minimum:3.7,maximum:4.15},
 tireScale:{title:'越野轮胎比例',type:'number',minimum:.9,maximum:1.1},
 roofEquipment:{title:'车顶设备与天线',type:'boolean'},spareWheel:{title:'后部备用轮胎',type:'boolean'},
 finish:{title:'装甲涂装',type:'string',enum:['reference','sand','olive']},
 wear:{title:'尘土强度',type:'number',minimum:0,maximum:1},
 steering:{title:'前轮转向 · °',type:'number',minimum:-30,maximum:30},
 explode:{title:'零部件分解',type:'number',minimum:0,maximum:1}
}};
export default defineGenerator({parameterSchema,defaults,enumLabels:{finish:['参考图 · 沙色迷彩','沙色装甲','橄榄绿装甲']},
 presets:[{id:'reference',name:'参考车 · 沙色迷彩',params:defaults},{id:'desert',name:'沙漠 · 纯色装甲',params:{finish:'sand',wear:.65}},{id:'olive',name:'林地 · 橄榄绿',params:{finish:'olive',wear:.2}},{id:'field',name:'轻装 · 移除顶架',params:{roofEquipment:false,spareWheel:false}},{id:'exploded',name:'结构 · 分解观察',params:{explode:.65}}],
 ui:{basic:['length','tireScale','finish','roofEquipment','steering','explode'],groups:[{id:'shape',fields:['wheelbase','spareWheel']},{id:'material',fields:['wear']}]},
 async generate({params={},seed='armored-4x4-reference'},{budget}={}){
  const p={...defaults,...params},root=buildVehicle(p);
  try{const asset=await threeToIR(root);asset.id='armored-4x4';asset.generator={id:'armored-4x4',version:'1.0.0'};asset.seed=seed;
   const recipe={seed,params:p};asset.metadata={recipe,reconstruction:root.userData.reconstruction,visualAcceptance:{threshold:.90,status:'not-passed',evidence:'outputs/armored-4x4/quality90/'}};
   asset.sockets=[{id:'roof-rack',nodeId:asset.rootNodeIds[0],transform:{position:[-.6,2.75,0],rotation:[0,0,0,1],scale:[1,1,1]},tags:['equipment','mount']}];
   asset.colliders=[{kind:'box',nodeId:asset.rootNodeIds[0],size:asset.bounds.max.map((v,i)=>v-asset.bounds.min[i]),offset:asset.bounds.max.map((v,i)=>(v+asset.bounds.min[i])/2)}];
   enforceBudget(asset,budget);
   return {asset,recipe,diagnostics:[{code:'APPROXIMATE_RECONSTRUCTION',message:'可见轮廓与表面源自参考图；后部及底盘为补全。'}]};
  }finally{disposeVehicle(root);}
 }
});
