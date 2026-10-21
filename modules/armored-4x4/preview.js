import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createAssetHandle} from '../../src/plugins/asset.js';
import {createRenderLoop,previewPixelRatio} from '../../src/render-loop.js';
export function createVehiclePreview(container,onFrame){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.domElement.className='plugin-canvas';container.append(renderer.domElement);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#bdc0bd');
 const camera=new THREE.PerspectiveCamera(40,1,.01,1000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;camera.position.set(8,4,10);controls.target.set(0,1.5,0);controls.update();
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=environment.texture;scene.environmentIntensity=.72;
 scene.add(new THREE.HemisphereLight('#dbe8ef','#716859',.6));
 const key=new THREE.DirectionalLight('#fff3df',2.1);key.position.set(5,8,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});key.shadow.bias=-.0003;scene.add(key);
 const fill=new THREE.DirectionalLight('#c7dbe8',.6);fill.position.set(-5,4,-4);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#777b77',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
 let handle=null,dead=false,active=true,revision=0,width=0,height=0,fitted=0,selection;const abort=new AbortController();
 const loop=createRenderLoop(()=>{renderer.render(scene,camera);if(handle)onFrame();});controls.addEventListener('change',loop.invalidate);
 function fit(preserve=false){if(!handle||!width||!height)return;const sphere=new THREE.Box3().setFromObject(handle.object).getBoundingSphere(new THREE.Sphere());const angle=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));const next=sphere.radius/Math.sin(angle)*1.12,ratio=preserve&&fitted?camera.position.distanceTo(controls.target)/fitted:1,direction=camera.position.clone().sub(controls.target).normalize();controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(direction,next*ratio);camera.near=.01;camera.far=Math.max(100,next*5);camera.updateProjectionMatrix();fitted=next;controls.update();loop.invalidate();}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h||w===width&&h===height)return;width=w;height=h;renderer.setPixelRatio(previewPixelRatio(w,h));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit(true);loop.invalidate();}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();
 function clearSelection(){if(selection){scene.remove(selection);selection.geometry.dispose();selection.material.dispose();selection=null;}}
 function selectNode(id){clearSelection();let node;handle?.object.traverse(o=>{if(o.userData.pgfNodeId===id)node=o;});if(node){selection=new THREE.BoxHelper(node,'#c98532');scene.add(selection);}loop.invalidate();}
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];},{signal:abort.signal});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4||!handle)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.x)/r.width*2-1,-(e.clientY-r.y)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(handle.object,true)[0];if(hit){let node=hit.object;while(node.parent?.parent!==handle.object&&node.parent!==handle.object&&node.parent)node=node.parent;selectNode(node.userData.pgfNodeId);}},{signal:abort.signal});
 return {camera,controls,renderer,get object(){return handle?.object;},frame:()=>fit(false),selectNode,
 async setAsset(asset,valid){const ticket=++revision,next=await createAssetHandle(asset,THREE,()=>!dead&&ticket===revision&&valid());if(dead||ticket!==revision||!valid()){next.dispose();throw new DOMException('已取消','AbortError');}clearSelection();handle?.dispose();handle=next;scene.add(next.object);next.object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});fitted=0;renderer.shadowMap.needsUpdate=true;fit();},
 setActive(value){active=value;loop.setActive(value);},diagnostics(){return {...loop.stats,contextLost:renderer.getContext().isContextLost(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,active,triangles:renderer.info.render.triangles,draws:renderer.info.render.calls};},
 dispose(){if(dead)return;dead=true;revision++;abort.abort();observer.disconnect();loop.dispose();controls.dispose();clearSelection();handle?.dispose();handle=null;floor.geometry.dispose();floor.material.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
 };
}
