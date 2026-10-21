import * as THREE from 'three';
export const FZ43_NODES=Object.freeze({body:'FZ43_ROOT',base:'FZ43_Tripod_Base',moving:['FZ43_Turntable_Exterior','FZ43_Folded_Shield','FZ43_Upper_Exterior','FZ43_Lower_Exterior','FZ43_Seats_Platforms','FZ43_Exterior_Fittings'],anchors:['FZ43_Upper_Cosmetic_Anchor','FZ43_Lower_Cosmetic_Anchor'],faces:['FZ43_upper_Sealed_Front','FZ43_lower_Sealed_Front']});
function named(root,name){const found=[];root.traverse(n=>{if(n.name===name)found.push(n);});if(found.length!==1)throw Error('Missing or ambiguous authored FZ43 node: '+name);return found[0];}
function below(child,parent){for(let n=child;n;n=n.parent)if(n===parent)return true;return false;}
function visible(node){for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;}
const snap=n=>({node:n,position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone(),auto:n.matrixAutoUpdate});
const restore=s=>{s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);s.node.updateMatrix();s.node.matrixAutoUpdate=s.auto;};
/** Author-confirmed named assembly. No nearest-vertex or geometric part inference. */
export function bindFlakzwillingVisual({object,scene}={}){
 if(!object?.isObject3D||!scene?.isObject3D||!below(object,scene))throw Error('FZ43 object must belong to host scene');
 const body=named(object,FZ43_NODES.body),base=named(body,FZ43_NODES.base),moving=FZ43_NODES.moving.map(n=>named(body,n)),anchors=FZ43_NODES.anchors.map(n=>named(body,n)),faces=FZ43_NODES.faces.map(n=>named(body,n));
 const identity=n=>n.position.length()<1e-6&&n.quaternion.angleTo(new THREE.Quaternion())<1e-6&&n.scale.distanceTo(new THREE.Vector3(1,1,1))<1e-6;
 // Shield may carry the author's bounded width scale; only origin/rotation are fixed.
 if(base.parent!==body||moving.some(n=>n.parent!==body||n.position.length()>1e-6||n.quaternion.angleTo(new THREE.Quaternion())>1e-6)||!identity(base))throw Error('FZ43 authored assembly contract mismatch');
 if(anchors.some((a,i)=>a.parent!==moving[i+2])||faces.some((a,i)=>!below(a,moving[i+2])))throw Error('FZ43 cosmetic anchor hierarchy mismatch');
 const uniform=s=>s.x>0&&Math.abs(s.x-s.y)<1e-6&&Math.abs(s.x-s.z)<1e-6;
 if(!uniform(body.scale))throw Error('FZ43 root requires positive uniform authored scale');
 const bases=moving.map(snap),yaw=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 return {body,base,moving,anchors,faces,
  apply(angle){yaw.setFromAxisAngle(up,angle);for(const s of bases){s.node.quaternion.copy(yaw).multiply(s.quaternion);s.node.updateMatrix();}},
  restore(){bases.forEach(restore);},
  allowed(){return below(object,scene)&&visible(body)&&anchors.every(visible)&&faces.every(visible);},
  read(){scene.updateWorldMatrix(true,true);const inverse=scene.matrixWorld.clone().invert();return anchors.map(a=>{const matrix=inverse.clone().multiply(a.matrixWorld),position=new THREE.Vector3().setFromMatrixPosition(matrix),direction=new THREE.Vector3(0,0,1).transformDirection(matrix),scale=new THREE.Vector3().setFromMatrixScale(matrix);if(![...position,...direction,...scale].every(Number.isFinite))throw Error('Invalid FZ43 cosmetic anchor');return {position,direction,artScale:Math.max(scale.x,scale.y,scale.z)};});},
  diagnostics(){return {nodes:FZ43_NODES,smokeAllowed:this.allowed(),fixedBase:true,authorNamedAssembly:true};}
 };
}
