import * as THREE from 'three';

export const QF25_NODES=Object.freeze({body:'QF25_ROOT',left:'QF25_Wheel_Left_Pivot',right:'QF25_Wheel_Right_Pivot',assembly:'QF25_Wheel_Assembly',muzzle:'QF25_Cosmetic_Muzzle_Anchor',cover:'QF25_Canvas_Cover',sealedFront:'QF25_Shallow_Sealed_Front'});
const finite=Number.isFinite;
function named(root,name,optional=false){const all=[];root.traverse(n=>{if(n.name===name)all.push(n);});if(all.length!==1&&!(optional&&all.length===0))throw Error('QF25 节点缺失或重复：'+name);return all[0]??null;}
export function snapshot(node){return {node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),matrixAutoUpdate:node.matrixAutoUpdate};}
export function restore(s){s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);s.node.updateMatrix();s.node.matrixAutoUpdate=s.matrixAutoUpdate;}
function isBelow(child,parent){for(let n=child;n;n=n.parent)if(n===parent)return true;return false;}
function visible(node){for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;}
/** Fixed author-supplied exterior names, not nearest-mesh inference. */
export function bindQf25Visual({object,scene,asset,appearance=asset?.metadata?.showCover??asset?.metadata?.recipe?.params?.showCover,radiusArt=.53}={}){
  if(!object?.isObject3D||!scene?.isObject3D||!isBelow(object,scene))throw TypeError('QF25 host object must belong to the host scene');
  if(!finite(radiusArt)||radiusArt<=0)throw RangeError('Invalid authored wheel radius');
  const body=named(object,QF25_NODES.body),wheels=[named(body,QF25_NODES.left),named(body,QF25_NODES.right)],muzzle=named(body,QF25_NODES.muzzle),cover=named(body,QF25_NODES.cover,appearance===false);
  const sealedFront=named(body,QF25_NODES.sealedFront),assembly=named(body,QF25_NODES.assembly),bodyBase=snapshot(body),wheelBases=wheels.map(snapshot);
  const uniform=s=>s.x>0&&Math.abs(s.x-s.y)<1e-6&&Math.abs(s.x-s.z)<1e-6;
  if(!uniform(body.scale)||wheels.some(w=>!uniform(w.scale)))throw Error('QF25 motion requires positive uniform authored root/wheel scale');
  if(assembly.parent!==body||assembly.position.length()>1e-6||assembly.quaternion.angleTo(new THREE.Quaternion())>1e-6||assembly.scale.distanceTo(new THREE.Vector3(1,1,1))>1e-6||wheels.some(w=>w.parent!==assembly))throw Error('QF25 wheels require the author-confirmed identity assembly under body root');
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(bodyBase.quaternion).multiplyScalar(bodyBase.scale.z);
  return {body,wheels,muzzle,cover,sealedFront,bodyBase,wheelBases,radiusArt,
    fireAllowed(){return appearance===false&&(!cover||cover.visible===false)&&visible(body)&&visible(muzzle)&&visible(sealedFront);},
    applyTow(distance){body.position.copy(bodyBase.position).addScaledVector(forward,distance);body.updateMatrix();for(const b of wheelBases){b.node.quaternion.copy(b.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),distance/(radiusArt*b.scale.x)));b.node.updateMatrix();}},
    restore(){restore(bodyBase);wheelBases.forEach(restore);},
    anchor(){muzzle.updateWorldMatrix(true,false);scene.updateWorldMatrix(true,false);const matrix=new THREE.Matrix4().copy(scene.matrixWorld).invert().multiply(muzzle.matrixWorld);const position=new THREE.Vector3().setFromMatrixPosition(matrix),direction=new THREE.Vector3(0,1,0).transformDirection(matrix);const scale=new THREE.Vector3().setFromMatrixScale(matrix);if(![...position.toArray(),...direction.toArray(),...scale.toArray()].every(finite))throw Error('QF25 anchor must be finite');return {position,direction,artScale:Math.max(scale.x,scale.y,scale.z)};},
    diagnostics(){return {nodes:{...QF25_NODES},radiusArt,explicitNoCover:appearance===false,coverVisible:cover?.visible??null,fireAllowed:this.fireAllowed()};},
  };
}
