import * as THREE from 'three';

/** Read-only binding to a closed cosmetic end face, not a bore or weapon joint. */
export function bindGustavVisualMouth(object, scene) {
  if (!object?.isObject3D || !scene?.isObject3D) throw new TypeError('Host object and scene required');
  const matches=[]; object.traverse(node=>{if(node.name==='opaque-front-recess')matches.push(node);});
  if(matches.length!==1)throw new Error('古斯塔夫外观端面缺失或重复');
  const meshes=[];matches[0].traverse(node=>{if(node.isMesh&&node.geometry?.attributes.position)meshes.push(node);});
  if(meshes.length!==1)throw new Error('外观端面几何不唯一');
  const mesh=meshes[0],box=new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  if(box.isEmpty())throw new Error('外观端面为空');
  const center=new THREE.Vector3((box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,(box.min.z+box.max.z)/2);
  const origin=new THREE.Vector3(center.x,box.max.y+.018,center.z);
  const edgeA=new THREE.Vector3(box.min.x,center.y,center.z),edgeB=new THREE.Vector3(box.max.x,center.y,center.z);
  const matrix=new THREE.Matrix4();
  return {
    name:'opaque-front-recess',
    read(){
      mesh.updateWorldMatrix(true,false);scene.updateWorldMatrix(true,false);
      matrix.copy(scene.matrixWorld).invert().multiply(mesh.matrixWorld);
      const position=origin.clone().applyMatrix4(matrix),direction=new THREE.Vector3(0,1,0).transformDirection(matrix);
      const cosmeticWidth=edgeA.clone().applyMatrix4(matrix).distanceTo(edgeB.clone().applyMatrix4(matrix));
      const artScale=THREE.MathUtils.clamp(cosmeticWidth/.416,.25,4);
      if(![...position.toArray(),...direction.toArray(),artScale].every(Number.isFinite))throw new Error('外观锚点不是有限数');
      return {position,direction,artScale};
    },
  };
}
