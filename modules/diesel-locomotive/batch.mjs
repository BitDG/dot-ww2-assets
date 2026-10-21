import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Merge only immutable leaves under the identical owner and material. Wheel leaves stay independent. */
export function batchRuleLeaves(root){
 root.updateMatrixWorld(true);let before=0,beforeTriangles=0,after=0,afterTriangles=0;const replaced=new Set();
 root.traverse(o=>{if(o.isMesh){before++;beforeTriangles+=o.geometry.index.count/3;}});
 for(const owner of [...root.children]){
  if(owner.name==='rail-wheel-facades')continue;
  const buckets=new Map();for(const o of [...owner.children])if(o.isMesh&&!Array.isArray(o.material)&&!o.children.length){const list=buckets.get(o.material)??[];list.push(o);buckets.set(o.material,list);}
  for(const [material,parts]of buckets){if(parts.length<2)continue;let start=0;const ranges=[],copies=[];
   for(const o of parts){o.updateMatrix();const g=o.geometry.clone();g.applyMatrix4(o.matrix);if(o.matrix.determinant()<0){const ix=g.index;for(let i=0;i<ix.count;i+=3){const b=ix.getX(i+1);ix.setX(i+1,ix.getX(i+2));ix.setX(i+2,b);}}copies.push(g);const count=g.index.count/3;ranges.push({name:o.name,owner:owner.name,source:o.userData.source,appearanceRole:material.userData.appearanceRole,start,count});start+=count;}
   const geometry=mergeGeometries(copies,false);if(!geometry)throw Error('Incompatible rule geometry for owner batch');copies.forEach(g=>g.dispose());
   const mesh=new THREE.Mesh(geometry,material);mesh.name=owner.name+'-'+material.name+'-batch';mesh.castShadow=mesh.receiveShadow=true;mesh.userData.source='Same-owner same-material lossless batch';mesh.userData.sourceParts=ranges;owner.add(mesh);
   for(const o of parts){owner.remove(o);replaced.add(o.geometry);}
  }
 }
 const retained=new Set();root.traverse(o=>{if(o.isMesh){after++;afterTriangles+=o.geometry.index.count/3;retained.add(o.geometry);}});for(const g of replaced)if(!retained.has(g))g.dispose();
 if(beforeTriangles!==afterTriangles)throw Error('Batch changed triangle count');root.userData.batch={beforeDraws:before,afterDraws:after,beforeTriangles,afterTriangles,beforeNodes:before+root.children.length+1,afterNodes:after+root.children.length+1,ownerAndMaterialPreserved:true,mirroredWindingCorrected:true};return root;
}
