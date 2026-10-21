import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAssetHandle} from './asset.js';
import {offscreenSurface} from '../runtime/offscreen-input.js';
import {previewPixelRatio} from '../render-loop.js';
import {previewClipPlanes} from './preview-framing.js';

let renderer,scene,camera,controls,surface,handle,size,fitted=0,active=true,dead=false,pending=null,frames=0,desired=0;
let clipSphere=null,nodeObjects=new Map(),selection=null;
function updateClip(){if(!clipSphere)return;const p=previewClipPlanes(clipSphere.radius,camera.position.distanceTo(clipSphere.center));if(camera.near!==p.near||camera.far!==p.far){camera.near=p.near;camera.far=p.far;camera.updateProjectionMatrix();}}
function diagnostics(){return {frames,pending:pending!==null,active,disposed:dead,renderWorker:!dead,contextLost:renderer?.getContext().isContextLost()??false,geometries:renderer?.info.memory.geometries??0,textures:renderer?.info.memory.textures??0};}
function draw(){pending=null;if(dead||!active)return;updateClip();renderer.render(scene,camera);frames++;postMessage({type:'frame',diagnostics:diagnostics()});}
function invalidate(){if(!dead&&active&&pending===null)pending=requestAnimationFrame(draw);}
function fit(preserve=false){
 if(!handle)return;
 const sphere=clipSphere,radius=Math.max(.001,sphere.radius),angle=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)),next=radius/Math.sin(angle)*1.12,ratio=preserve&&fitted?camera.position.distanceTo(controls.target)/fitted:1,direction=camera.position.clone().sub(controls.target).normalize();
 controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(direction,next*ratio);updateClip();camera.updateProjectionMatrix();fitted=next;controls.update();invalidate();
}
function resize(next){size=next;surface.resize(size);renderer.setPixelRatio(previewPixelRatio(size.width,size.height,size.dpr));renderer.setSize(size.width,size.height,false);camera.aspect=size.width/size.height;camera.updateProjectionMatrix();fit(true);invalidate();}
async function command(method,args){
 if(method==='init'){
  const [canvas,dimensions]=args;surface=offscreenSurface(canvas,dimensions);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setClearColor(0x101817);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.01,1e8);controls=new OrbitControls(camera,canvas);controls.enableDamping=false;camera.position.set(7,5,9);controls.target.set(0,1,0);controls.update();controls.addEventListener('change',invalidate);
  scene.add(new THREE.HemisphereLight(0xdff2ff,0x526253,2.5));const key=new THREE.DirectionalLight(0xfff2d8,3);key.position.set(5,8,6);scene.add(key);const fill=new THREE.DirectionalLight(0xb4d9ff,1.7);fill.position.set(-6,4,-3);scene.add(fill);resize(dimensions);return diagnostics();
 }
 if(method==='setAsset'){
  const [asset,revision]=args,valid=()=>!dead&&revision===desired;
  const next=await createAssetHandle(asset,THREE,valid);
  if(!valid()){next.dispose();throw new DOMException('旧资产上传已取消','AbortError');}
  try{await renderer.compileAsync(next.object,camera,scene);if(!valid())throw new DOMException('旧预览已取消','AbortError');}catch(error){next.dispose();throw error;}
  if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}
  handle?.dispose();handle=next;nodeObjects=new Map();next.object.traverse(o=>{if(o.userData.pgfNodeId)nodeObjects.set(o.userData.pgfNodeId,o);});scene.add(next.object);clipSphere=new THREE.Box3().setFromObject(handle.object).getBoundingSphere(new THREE.Sphere());fitted=0;fit();updateClip();
  if(active)draw();return diagnostics();
 }
 if(method==='clearAsset'){
  if(args[0]!==desired)return diagnostics();
  if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}
  handle?.dispose();handle=null;nodeObjects.clear();clipSphere=null;fitted=0;invalidate();return diagnostics();
 }
 if(method==='input'){surface.dispatch(args[0]);invalidate();return;}
 if(method==='resize'){resize(args[0]);return;}
 if(method==='frame'){fit();return;}
 if(method==='transforms'){
  const [updates,followId]=args,follow=nodeObjects.get(followId),before=follow?.getWorldPosition(new THREE.Vector3());
  for(const update of updates){const o=nodeObjects.get(update.id),t=update.transform;if(!o||!t||![...t.position,...t.rotation,...t.scale].every(Number.isFinite))continue;o.position.fromArray(t.position);o.quaternion.fromArray(t.rotation).normalize();o.scale.fromArray(t.scale);}
  handle?.object.updateMatrixWorld(true);if(follow&&before){const delta=follow.getWorldPosition(new THREE.Vector3()).sub(before);camera.position.add(delta);controls.target.add(delta);controls.update();}
  if(handle)clipSphere=new THREE.Box3().setFromObject(handle.object).getBoundingSphere(new THREE.Sphere());selection?.update();invalidate();return;
 }
 if(method==='selection'){
  if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}const o=nodeObjects.get(args[0]);if(o){selection=new THREE.BoxHelper(o,0xd8a756);scene.add(selection);}invalidate();return;
 }
 if(method==='active'){active=!!args[0];if(!active&&pending!==null){cancelAnimationFrame(pending);pending=null;}if(active)invalidate();return;}
 if(method==='inspect'){
  const box=handle?new THREE.Box3().setFromObject(handle.object):null;let maxX=0,maxY=0;camera.updateMatrixWorld(true);
  if(box)for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}
  return {...diagnostics(),maxX,maxY,camera:{position:camera.position.toArray(),target:controls.target.toArray(),aspect:camera.aspect,near:camera.near,far:camera.far}};
 }
 if(method==='invalidate')return;
 throw Error('Unknown preview command: '+method);
}
let queue=Promise.resolve();
self.onmessage=({data:{id,method,args}})=>{
 if(method==='setAsset')desired=args[1];if(method==='invalidate'||method==='clearAsset')desired=args[0];
 queue=queue.then(async()=>{try{const result=await command(method,args);if(id)postMessage({id,result});}catch(error){if(id)postMessage({id,error:{name:error.name,message:error.message}});else postMessage({type:'error',message:error.message});}});
};
