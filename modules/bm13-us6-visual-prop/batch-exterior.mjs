import * as THREE from 'three';
import {batchRuleLeaves} from '../gustav-visual-prop/batch.mjs';

function leafSurface(mesh,start=0,count=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3){
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,idx=g.index;
 const position=new Float64Array(count*9),normal=new Float64Array(count*9),texcoord=new Float64Array(count*6),v=new THREE.Vector3(),nm=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
 for(let j=0;j<count*3;j++){
  const index=idx?idx.getX(start*3+j):start*3+j;
  v.fromBufferAttribute(p,index).applyMatrix4(mesh.matrixWorld);position.set(v.toArray(),j*3);
  v.fromBufferAttribute(n,index).applyMatrix3(nm).normalize();normal.set(v.toArray(),j*3);
  texcoord[j*2]=uv.getX(index);texcoord[j*2+1]=uv.getY(index);
 }
 return {position,normal,texcoord,material:mesh.material,owner:mesh.parent.name,count};
}
/** Uses existing PGF same-owner batching. Audits every transformed face attribute. */
export function batchExterior(root,owner){
 root.updateMatrixWorld(true);const before=new Map();
 root.traverse(o=>{if(o.isMesh)before.set(o.name,leafSurface(o));});
 const body=root.getObjectByName('BM13_ROOT');
 for(const group of [body,root.getObjectByName('BM13_Front_Wheels'),root.getObjectByName('BM13_Rear_Dual_Wheels')]){
  const old=new Set();root.traverse(o=>{if(o.geometry)old.add(o.geometry);});
  try{batchRuleLeaves(group);}finally{owner.capture(root);}
  const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry);});
  for(const g of old)if(!retained.has(g))owner.forget(g); // Existing helper disposed replaced buffers.
 }
 root.updateMatrixWorld(true);const report={source:'PGF gustav-visual-prop batchRuleLeaves reused',beforeDraws:before.size,afterDraws:0,sourceLeaves:0,triangles:0,maxPositionDelta:0,maxNormalDelta:0,maxUVDelta:0,ownerAndMaterialPreserved:true};
 const seen=new Set();
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;report.afterDraws++;
  const ranges=mesh.userData.sourceParts??[{name:mesh.name,start:0,count:(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3}];
  for(const range of ranges){
   const old=before.get(range.name),current=leafSurface(mesh,range.start,range.count);
   if(!old||seen.has(range.name)||old.count!==current.count||old.material!==current.material||old.owner!==current.owner)throw Error('Batch changed semantic ownership or material: '+range.name);
   seen.add(range.name);report.sourceLeaves++;report.triangles+=current.count;
   for(const [key,field]of [['position','maxPositionDelta'],['normal','maxNormalDelta'],['texcoord','maxUVDelta']]){
    for(let i=0;i<old[key].length;i++){const delta=Math.abs(old[key][i]-current[key][i]);if(!Number.isFinite(delta))throw Error('Nonfinite batched surface');report[field]=Math.max(report[field],delta);}
   }
  }
 });
 if(seen.size!==before.size||report.maxPositionDelta>2e-6||report.maxNormalDelta>2e-6||report.maxUVDelta!==0)throw Error('Batch surface mismatch: '+JSON.stringify(report));
 report.pass=true;return report;
}
