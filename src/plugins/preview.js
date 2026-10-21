import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from '../../generator-sdk/gltf-exporter.mjs';
import { createRenderLoop, previewPixelRatio } from '../render-loop.js';
import { createAssetHandle } from './asset.js';
import { createWorkerPreview } from './preview-client.js';
import { createWorkerRPC } from '../runtime/worker-rpc.js';
import { previewClipPlanes } from './preview-framing.js';

export function createPluginPreview(container, onFrame = () => {}, {animated=false,preserveView=false,runtimeFactory}={}) {
  if (!animated && HTMLCanvasElement.prototype.transferControlToOffscreen) return createWorkerPreview(container, onFrame);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setClearColor(0x101817); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.prepend(renderer.domElement); renderer.domElement.className = 'plugin-canvas'; renderer.domElement.setAttribute('aria-label', '插件资产三维预览');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .01, 100000000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
  camera.position.set(7, 5, 9); controls.target.set(0, 1, 0); controls.update();
  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x526253, 2.5));
  const key = new THREE.DirectionalLight(0xfff2d8, 3); key.position.set(5, 8, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb4d9ff, 1.7); fill.position.set(-6, 4, -3); scene.add(fill);
  let handle = null, dead = false, active = true, fitted = 0, revision = 0, width = 0, height = 0;
  let clipSphere=null,selection=null,mixer=null,playing=false,previous=0,clipName='',skeletonHelper=null,skeletonVisible=false,clipLoops=new Map(),runtime=null;
  function updateClip(){if(!clipSphere)return;const p=previewClipPlanes(clipSphere.radius,camera.position.distanceTo(clipSphere.center));if(camera.near!==p.near||camera.far!==p.far){camera.near=p.near;camera.far=p.far;camera.updateProjectionMatrix();}}
  const loop = createRenderLoop(time => {const dt=previous?Math.min(.05,(time-previous)/1000):0;if(runtime){runtime.update(dt);previous=time;}else if(playing&&mixer){mixer.update(dt);previous=time;} updateClip(); renderer.render(scene, camera); if (handle) onFrame(); },()=>runtime?runtime.playing:playing);
  function clearSkeleton(){if(!skeletonHelper)return;skeletonHelper.removeFromParent();skeletonHelper.geometry.dispose();skeletonHelper.material.dispose();skeletonHelper=null;}
  function showSkeleton(value){skeletonVisible=!!value;clearSkeleton();if(skeletonVisible&&handle){skeletonHelper=new THREE.SkeletonHelper(handle.object);skeletonHelper.material.depthTest=false;skeletonHelper.material.transparent=true;skeletonHelper.material.opacity=.85;skeletonHelper.renderOrder=10;scene.add(skeletonHelper);}loop.invalidate();}
  function clearAsset() {
    revision++;
    if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}
    clearSkeleton();runtime?.dispose();runtime=null;
    if(mixer){mixer.stopAllAction();if(handle)mixer.uncacheRoot(handle.object);mixer=null;}
    handle?.dispose();handle=null;clipSphere=null;fitted=0;playing=false;previous=0;clipName='';clipLoops.clear();
    if(!dead)loop.invalidate();
  }
  const resetClock=()=>{previous=0;};
  document.addEventListener('visibilitychange',resetClock);
  controls.addEventListener('change', loop.invalidate);
  function fittedDistance(sphere) {
    const angle=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
    return Math.max(.001,sphere.radius)/Math.sin(angle)*1.12;
  }
  function fit(preserve = false) {
    if (!handle || width < 1 || height < 1) return;
    const sphere = (runtime?.bounds?.()??new THREE.Box3().setFromObject(handle.object)).getBoundingSphere(new THREE.Sphere());
    clipSphere=sphere;
    const direction = camera.position.clone().sub(controls.target).normalize();
    const preferred = runtime?.framingDistance?.(camera,sphere,direction);
    const next = Number.isFinite(preferred)&&preferred>0?preferred:fittedDistance(sphere), ratio = preserve && fitted ? camera.position.distanceTo(controls.target) / fitted : 1;
    controls.target.copy(sphere.center); camera.position.copy(sphere.center).addScaledVector(direction, next * ratio);updateClip(); camera.updateProjectionMatrix(); fitted = next; controls.update(); loop.invalidate();
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h || w === width && h === height) return;
    width = w; height = h; renderer.setPixelRatio(previewPixelRatio(w, h)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fit(true); loop.invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize(); loop.invalidate();
  return {
    camera, controls, renderer, get object() { return handle?.object; },get runtime(){return runtime;},invalidate:()=>loop.invalidate(),
    frame: () => fit(false),
    clearAsset,
    cancelPending(){revision++;},
    setTransforms(updates,followId){if(dead||!handle)return;const objects=new Map();handle.object.traverse(o=>{if(o.userData.pgfNodeId)objects.set(o.userData.pgfNodeId,o);});const follow=objects.get(followId),before=follow?.getWorldPosition(new THREE.Vector3());for(const {id,transform:t}of updates){const o=objects.get(id);if(o){o.position.fromArray(t.position);o.quaternion.fromArray(t.rotation).normalize();o.scale.fromArray(t.scale);}}handle.object.updateMatrixWorld(true);if(follow&&before){const delta=follow.getWorldPosition(new THREE.Vector3()).sub(before);camera.position.add(delta);controls.target.add(delta);controls.update();}clipSphere=new THREE.Box3().setFromObject(handle.object).getBoundingSphere(new THREE.Sphere());selection?.update();loop.invalidate();},
    selectNode(id){if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}let chosen;handle?.object.traverse(o=>{if(o.userData.pgfNodeId===id)chosen=o;});if(chosen){selection=new THREE.BoxHelper(chosen,0xd8a756);scene.add(selection);}loop.invalidate();},
    async setAsset(asset, valid=()=>true, {frame=false}={}) {
      const ticket = ++revision, next = await createAssetHandle(asset, THREE, () => !dead && ticket === revision && valid());
      if (dead || ticket !== revision || !valid()) { next.dispose(); throw new DOMException('已取消', 'AbortError'); }
      const keepView=preserveView&&handle&&!frame;
      if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}clearSkeleton();runtime?.dispose();runtime=null;if(mixer){mixer.stopAllAction();mixer.uncacheRoot(handle.object);}handle?.dispose(); handle = next;playing=false;previous=0;clipName='';mixer=next.animations.length?new THREE.AnimationMixer(next.object):null;scene.add(next.object);clipLoops=new Map((asset.metadata?.motionClips??[]).map(c=>[c.name,c.loop]));if(mixer)mixer.addEventListener('finished',()=>{playing=false;previous=0;loop.invalidate();});runtime=runtimeFactory?.({scene,object:next.object,animations:next.animations,asset,camera,controls,renderer,invalidate:loop.invalidate,reframe:()=>fit(false),valid:()=>!dead&&ticket===revision&&valid()});showSkeleton(skeletonVisible);clipSphere=new THREE.Box3().setFromObject(handle.object).getBoundingSphere(new THREE.Sphere());
      if(keepView)fitted=fittedDistance(clipSphere);else{fitted=0;fit();}updateClip(); loop.invalidate();
    },
    setActive(value) { active = value; previous=0; loop.setActive(value); },
    showSkeleton,
    play(name){if(runtime){runtime.play(name);previous=0;loop.invalidate();return;}if(!mixer)return;mixer.stopAllAction();const clip=handle.animations.find(c=>c.name===name);playing=!!clip;clipName=clip?.name??'';previous=0;if(clip){const action=mixer.clipAction(clip).reset();action.setLoop(clipLoops.get(name)===false?THREE.LoopOnce:THREE.LoopRepeat,Infinity);action.clampWhenFinished=clipLoops.get(name)===false;action.play();}mixer.update(0);loop.invalidate();},
    pause(){runtime?.pause();playing=false;previous=0;loop.invalidate();},
    seek(time){if(runtime){runtime.seek(time);previous=0;loop.invalidate();}else if(mixer){mixer.setTime(Math.max(0,Number(time)||0));previous=0;loop.invalidate();}},
    diagnostics() { return { ...loop.stats, contextLost: renderer.getContext().isContextLost(), geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}, active,playing,clipName,skeletonVisible,...runtime?.diagnostics() }; },
    dispose() { if (dead) return; dead = true; revision++; observer.disconnect(); document.removeEventListener('visibilitychange',resetClock); loop.dispose(); controls.dispose();if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}clearSkeleton();runtime?.dispose();runtime=null;if(mixer){mixer.stopAllAction();mixer.uncacheRoot(handle.object);} handle?.dispose(); handle = null; renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); },
  };
}

export async function exportPluginGLB(asset, recipe, valid) {
  if (typeof Worker !== 'undefined' && typeof document !== 'undefined') {
    if (!valid()) throw new DOMException('导出已取消', 'AbortError');
    const rpc=createWorkerRPC(new Worker(new URL('./asset-export.worker.js',import.meta.url),{type:'module',name:'pgf-asset-export'}));
    const monitor=setInterval(()=>{if(!valid())rpc.dispose();},25);
    try{const bytes=await rpc.call('export',[asset,recipe]);if(!valid())throw new DOMException('导出已取消','AbortError');return bytes;}
    finally{clearInterval(monitor);rpc.dispose();}
  }
  // Snapshot owns a separate handle: route changes or regeneration cannot alter export.
  const handle = await createAssetHandle(asset, THREE, valid);
  try {
    handle.object.userData.pgfRecipe = recipe;
    const result = await new GLTFExporter().parseAsync(handle.object, { binary: true, onlyVisible: false, animations:handle.animations });
    if (!valid()) throw new DOMException('导出已取消', 'AbortError');
    return new Uint8Array(result);
  } finally { handle.dispose(); }
}
