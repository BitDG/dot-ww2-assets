// Offline preset-image review of actual canonical PGF exports. This does not
// replace or disable the native workbench's real OffscreenCanvas RenderWorker.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareGenerator} from '../../generator-sdk/validation.mjs';
import {writeSceneGLB} from '../../src/plugins/scatter/io.js';
import definition from './definition.mjs';
import {disposeModel} from './model.mjs';

const query=new URLSearchParams(location.search),preset=definition.presets.find(p=>p.id===query.get('preset'))??definition.presets[0];
const result=await prepareGenerator(definition).generate({seed:'pgf-components-1',params:preset.params});
const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},bytes=writeSceneGLB([{contentHash:'preset-review',asset:result.asset}],[{id:'preset-review',assetContentHash:'preset-review',transform:identity,tags:[]}],{preserveSemantics:true});
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setClearColor('#eeece6');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight('#f7f5ee','#827d64',1.1));
const key=new THREE.DirectionalLight('#fff7e9',2.8);key.position.set(-5,12,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0003;Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:35});scene.add(key);
const fill=new THREE.DirectionalLight('#cddae6',1.15);fill.position.set(7,5,-7);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.28;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.OrthographicCamera(-8,8,6,-6,.01,200),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
let model,report,width=innerWidth,height=innerHeight;
function render(){renderer.render(scene,camera);}
function fit(){
 const box=new THREE.Box3().setFromObject(model,true),center=box.getCenter(new THREE.Vector3());floor.position.y=box.min.y-.012;camera.up.set(0,1,0);camera.position.copy(center).add(new THREE.Vector3(14,9,11));camera.lookAt(center);camera.updateMatrixWorld();controls.target.copy(center);
 const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),span=Math.max(Math.max(...ys)-Math.min(...ys),(Math.max(...xs)-Math.min(...xs))/(width/height))*1.12;
 camera.left=-span*width/height/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();controls.update();render();
}
async function load(buffer){
 const next=(await new GLTFLoader().parseAsync(buffer,'')).scene;if(model){scene.remove(model);disposeModel(model);}model=next;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});fit();
 let triangles=0,nonFinite=0,recipe;model.traverse(o=>{recipe??=o.userData.pgf?.metadata?.recipe;if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const a of Object.values(o.geometry.attributes))for(const v of a.array)if(!Number.isFinite(v))nonFinite++;}});
 return {triangles,nonFinite,frameCalls:renderer.info.render.calls,memory:{...renderer.info.memory},recipe};
}
renderer.setSize(width,height);report=await load(bytes.buffer);controls.addEventListener('change',render);
addEventListener('resize',()=>{width=innerWidth;height=innerHeight;renderer.setSize(width,height);fit();});
const panel=document.createElement('section');panel.style.cssText='position:fixed;left:12px;bottom:12px;max-width:510px;padding:12px;background:#fffffff2;color:#282821;border:1px solid #aaa;font:13px system-ui;border-radius:8px';
const title=document.createElement('strong');title.textContent='实际 PGF GLB · 离线预设图审核';panel.append(title,document.createElement('br'));
const select=document.createElement('select');select.setAttribute('aria-label','审核预设');for(const p of definition.presets)select.add(new Option(p.name,p.id));select.value=preset.id;select.onchange=()=>{location.search='?controls=1&preset='+select.value;};panel.append(select);
const capture=document.createElement('button');capture.textContent='下载此预设 PNG (500×380)';capture.onclick=()=>{const before=[width,height];width=500;height=380;renderer.setSize(width,height,false);fit();const a=document.createElement('a');a.download='tracked-mortar-'+preset.id+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();[width,height]=before;renderer.setSize(width,height);fit();};panel.append(capture);
const back=document.createElement('a');back.href='./preview.html';back.textContent='返回真实工作台';panel.append(back);
const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:12px monospace;max-height:28vh;overflow:auto';info.textContent=JSON.stringify({preset:preset.id,params:result.recipe.params,...report},null,2);panel.append(info);
const importer=document.createElement('input');importer.type='file';importer.accept='.glb';importer.setAttribute('aria-label','回读下载的 GLB');const label=document.createElement('label');label.textContent='回读下载的 GLB：';label.append(importer);panel.append(label);
importer.onchange=async()=>{const file=importer.files[0];if(!file)return;try{report=await load(await file.arrayBuffer());capture.disabled=true;info.textContent=JSON.stringify({sourceFile:file.name,bytes:file.size,...report},null,2);}catch(error){info.textContent=error.message;}};
document.body.append(panel);
addEventListener('pagehide',()=>{controls.dispose();disposeModel(model);floor.geometry.dispose();floor.material.dispose();environment.dispose();renderer.dispose();},{once:true});
