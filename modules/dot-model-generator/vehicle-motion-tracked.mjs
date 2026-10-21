import * as THREE from 'three';
import {kit} from '../tracked-mortar/blender-kit.mjs';

const AXLE=new THREE.Vector3(1,0,0),UP=new THREE.Vector3(0,0,1);
const wrap=x=>((x%1)+1)%1;
export function mortarTrackFrame(phase,length,offset=0){
  // Exact authored capsule, also used by tracked-mortar/model.mjs. Replacing it
  // with the tank generator's wheel-envelope solver changes this asset's shape.
  const end=4.53*length/10.8,r=.635,total=4*end+2*Math.PI*r,d=wrap(phase)*total;
  let z,y,angle;
  if(d<2*end){z=-end+d;y=.755+r;angle=0;}
  else if(d<2*end+Math.PI*r){angle=(d-2*end)/r;z=end+r*Math.sin(angle);y=.755+r*Math.cos(angle);}
  else if(d<4*end+Math.PI*r){z=end-(d-2*end-Math.PI*r);y=.755-r;angle=Math.PI;}
  else{angle=Math.PI+(d-4*end-Math.PI*r)/r;z=-end+r*Math.sin(angle);y=.755+r*Math.cos(angle);}
  return {z:z+offset*Math.sin(angle),y:y+offset*Math.cos(angle),angle,total};
}
function decode(a){const s=atob(a.data),b=Uint8Array.from(s,c=>c.charCodeAt(0));return a.type==='Float32Array'?new Float32Array(b.buffer):new Uint32Array(b.buffer);}
function geometry(p){
  const g=new THREE.BufferGeometry();
  for(const key of ['position','normal','uv'])if(p[key])g.setAttribute(key,new THREE.BufferAttribute(decode(p[key]),p[key].itemSize));
  g.setIndex(new THREE.BufferAttribute(decode(p.index),1));
  if(!g.attributes.uv){const a=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(a.count*2);
    for(let i=0;i<a.count;i++){const ns=[Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i))],axis=ns.indexOf(Math.max(...ns));uv[i*2]=axis===0?a.getZ(i):a.getX(i);uv[i*2+1]=axis===1?a.getZ(i):a.getY(i);}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
  g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function actualMesh(node){if(node?.isMesh)return node;return node?.children.find(n=>n.isMesh);}
function staticPose(n,p){
  const position=new THREE.Vector3().fromArray(n.position),rotation=new THREE.Quaternion().fromArray(n.rotation),scale=new THREE.Vector3().fromArray(n.scale);
  const e=n.extras,ratio=p.length/10.8,roadScale=Math.min(1,(.748*ratio-.02)/.664);
  if(e.roadWheelStationZ!==undefined){position.y=.112+.332*roadScale+(position.y-.444)*roadScale;position.z=e.roadWheelStationZ*ratio+(position.z-e.roadWheelStationZ)*roadScale;scale.y*=roadScale;scale.z*=roadScale;}
  else if(e.track_phase!==undefined){const f=mortarTrackFrame(e.track_phase,p.length,e.track_offset||0);position.y=f.y;position.z=f.z;rotation.setFromAxisAngle(AXLE,f.angle);}
  else{if(e.lengthAttachmentCenterZ!==undefined)position.z=e.lengthAttachmentCenterZ*ratio+(position.z-e.lengthAttachmentCenterZ);else{position.z*=ratio;if(e.rod_stretch){const d=UP.clone().applyQuaternion(rotation);d.z*=ratio;const factor=d.length();rotation.setFromUnitVectors(UP,d.normalize());scale.z*=factor;}else if(e.length_stretch)scale.z*=ratio;}}
  return {position,rotation,scale,roadScale};
}

/** Preview-only exact-prototype replacement. Borrow materials, own only geometry
 * and instance buffers. Do not mutate/export the source AssetIR or old batches. */
export function createMortarRunningGear(model,asset,p){
  if(!Number.isFinite(p.length)||p.length<9||p.length>12||!['standard','high'].includes(p.detail))throw Error('履带参数缺失或不受支持');
  if(asset?.metadata?.referenceReconstruction?.sourceGLBSha256!==kit.sourceGLBSha256)throw Error('履带原型版本与资产不匹配');
  const owner=model.getObjectByName('mortar-running-gear');if(!owner)throw Error('缺少原始履带运行件');
  const source=kit.nodes.find(n=>n.name==='mortar-running-gear'),selected=source.children.map(i=>kit.nodes[i]).filter(n=>!n.extras.fine_detail||p.detail==='high');
  const byPrototype=new Map(),byMaterial=new Map(),owned=[];const group=new THREE.Group();group.name='dot-motion-running-gear';
  let mounted=false,dead=false;const previous=[...owner.children].map(node=>({node,visible:node.visible}));
  const dispose=()=>{if(dead)return;dead=true;if(mounted){group.removeFromParent();for(const {node,visible}of previous)node.visible=visible;}for(const g of owned)g.dispose();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});};
  try{
    for(const n of selected){const primitive=kit.meshes[n.mesh]?.primitives;if(primitive?.length!==1)throw Error('履带原型格式不支持');const pr=primitive[0];
      const parts=byPrototype.get(n.mesh)??[];parts.push(n);byPrototype.set(n.mesh,parts);byMaterial.set(pr.material,(byMaterial.get(pr.material)??0)+decode(pr.index).length);}
    const mats=new Map();
    for(const [id,count]of byMaterial){const name='running-gear-'+kit.materials[id].name+'-batch',mesh=actualMesh(owner.getObjectByName(name));
      if(!mesh||Array.isArray(mesh.material)||(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)!==count)throw Error('原始履带合批结构不匹配：'+name);mats.set(id,mesh.material);}
    const bindings=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),spin=new THREE.Quaternion();
    for(const [id,nodes]of byPrototype){const pr=kit.meshes[id].primitives[0],g=geometry(pr);owned.push(g);const mesh=new THREE.InstancedMesh(g,mats.get(pr.material),nodes.length);mesh.name='dot-motion-'+nodes[0].name.replace(/-?-?\d.*/,'');mesh.userData.motionSourceNames=nodes.map(n=>n.name);mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);
      for(const [index,n]of nodes.entries()){
        const base=staticPose(n,p),e=n.extras;let center=null,radius=null;
        if(e.roadWheelStationZ!==undefined){center=new THREE.Vector3(base.position.x,.112+.332*base.roadScale,e.roadWheelStationZ*p.length/10.8);radius=.332*base.roadScale;}
        else if(n.name.startsWith('high-end-wheel')||n.name.startsWith('endwheel-rib')){const z=e.lengthAttachmentCenterZ??n.position[2];center=new THREE.Vector3(base.position.x,.755,z*p.length/10.8);radius=.635;}
        else if(n.name.startsWith('return-roller')){center=base.position.clone();radius=(g.boundingBox.max.y-g.boundingBox.min.y)*.5*base.scale.y;}
        if(e.track_phase===undefined&&(!center||!(radius>0)))throw Error('未知运行件绑定：'+n.name);
        bindings.push({mesh,index,n,base,center,radius});
      }
    }
    function apply(distance){
      if(dead)return;
      for(const b of bindings){const {n,base}=b,e=n.extras;
        if(e.track_phase!==undefined){const total=mortarTrackFrame(0,p.length).total,f=mortarTrackFrame(e.track_phase+distance/total,p.length,e.track_offset||0);v.copy(base.position);v.y=f.y;v.z=f.z;q.setFromAxisAngle(AXLE,f.angle);}
        else{spin.setFromAxisAngle(AXLE,distance/b.radius);v.copy(base.position).sub(b.center).applyQuaternion(spin).add(b.center);q.copy(spin).multiply(base.rotation);}
        b.mesh.setMatrixAt(b.index,matrix.compose(v,q,base.scale));
      }
      for(const o of group.children)o.instanceMatrix.needsUpdate=true;
      group.updateMatrixWorld(true);
    }
    apply(0);
    // Validate static topology and bounds before hiding any original node.
    group.updateMatrixWorld(true);const fresh=new THREE.Box3(),old=new THREE.Box3(),point=new THREE.Vector3();
    // InstancedMesh's transformed prototype AABB is conservative at the curved
    // ends. Compare actual vertices, otherwise a correct shoe can fail by 1 mm.
    for(const mesh of group.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const a=mesh.geometry.attributes.position;for(let j=0;j<a.count;j++)fresh.expandByPoint(point.fromBufferAttribute(a,j).applyMatrix4(matrix));}
    for(const {node}of previous){node.updateMatrixWorld(true);node.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();old.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});}
    // Compare in the owner's local frame, including the exploded pose.
    owner.updateWorldMatrix(true,false);fresh.applyMatrix4(owner.matrixWorld);
    if(fresh.min.distanceTo(old.min)>3e-5||fresh.max.distanceTo(old.max)>3e-5)throw Error('履带原型与原资产静态边界不一致 '+JSON.stringify({fresh:[fresh.min.toArray(),fresh.max.toArray()],old:[old.min.toArray(),old.max.toArray()]}));
    for(const {node}of previous)node.visible=false;owner.add(group);mounted=true;
    return {apply,dispose,group,diagnostics:()=>({trackShoes:168,wheelAssemblies:46,trackParts:bindings.filter(b=>b.n.extras.track_phase!==undefined).length,wheelParts:bindings.filter(b=>b.n.extras.track_phase===undefined).length,ownedGeometries:owned.length,draws:group.children.length,source:'original-blender-kit-instancing',staticTopologyPreserved:true})};
  }catch(error){dispose();throw error;}
}
