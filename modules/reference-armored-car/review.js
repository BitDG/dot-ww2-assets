import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeTree} from './core.mjs';
import {prepareGenerator} from '../../generator-sdk/validation.mjs';
import {writeSceneGLB} from '../../src/plugins/scatter/io.js';
import definition from './definition.mjs';
let renderWidth=innerWidth,renderHeight=innerHeight;
const query=new URLSearchParams(location.search),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor('#eeece6');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight('#f7f5ee','#827d64',1.1));const key=new THREE.DirectionalLight('#fff7e9',2.8);key.position.set(-3,11,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.radius=5;renderer.shadowMap.type=THREE.PCFShadowMap;Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});key.shadow.bias=-.0003;scene.add(key);const fill=new THREE.DirectionalLight('#cddae6',1.15);fill.position.set(5,4,-4);scene.add(fill);
const request={seed:'pgf-components-1',params:{...definition.presets.find(p=>p.id===query.get('preset'))?.params,...(query.get('zeroYaw')==='1'?{turretYaw:0}:{})},input:{}};
const result=await prepareGenerator(definition).generate(request);
const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
const exported=writeSceneGLB([{contentHash:'review-source',asset:result.asset}],[{id:'review',assetContentHash:'review-source',transform:identity,tags:[]}],{preserveSemantics:true});
let model=(await new GLTFLoader().parseAsync(exported.buffer,'')).scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const camera=query.has('photo')?new THREE.PerspectiveCamera(16,innerWidth/innerHeight,.01,200):new THREE.OrthographicCamera(),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;const target=new THREE.Vector3(0,1.85,.35);let frames=0;
function view(name='hero'){
 const directions={hero:[12,7.5,7],front:[0,1.85,10],rear:[0,1.85,-10],left:[-10,1.85,0],right:[10,1.85,0],top:[0,12,.35],grazing:[6,3.19,4]};const d=directions[name]??directions.hero;camera.position.fromArray(d);camera.up.set(0,1,0);if(name==='top')camera.up.set(0,0,-1);controls.target.copy(target);const span=name==='left'||name==='right'?5.8:5.55;const aspect=renderWidth/renderHeight;if(camera.isPerspectiveCamera){camera.clearViewOffset();camera.aspect=aspect;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(span/(2*camera.position.distanceTo(target))));}else{camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;}camera.near=.01;camera.far=200;camera.updateProjectionMatrix();controls.update();render();}
function render(){renderer.render(scene,camera);frames++;}
controls.addEventListener('change',render);addEventListener('resize',()=>{renderWidth=innerWidth;renderHeight=innerHeight;renderer.setSize(renderWidth,renderHeight);view(query.get('view')??'hero');});
window.RECONSTRUCTION={view,model,result,exported,renderer,camera,scene,render,mask(enable){floor.visible=!enable;if(enable){scene.overrideMaterial=new THREE.MeshBasicMaterial({color:'#303030'});renderer.setClearColor('#ffffff');}else{scene.overrideMaterial?.dispose();scene.overrideMaterial=null;renderer.setClearColor('#eeece6');}render();},frames:()=>frames,diagnostics(){let triangles=0,meshes=0;model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {triangles,meshes,renderer:renderer.info.render,memory:renderer.info.memory,stage:model.userData.pgf?.stage??'GLB-reimport'};},dispose(){controls.dispose();disposeTree(model);floor.geometry.dispose();floor.material.dispose();env.dispose();renderer.dispose();}};
view(query.get('view')??'hero');window.RECONSTRUCTION_READY=true;
window.RECONSTRUCTION.photoCamera=fit=>{
 const a=THREE.MathUtils.degToRad(fit.azimuth),e=THREE.MathUtils.degToRad(fit.elevation),k=fit.pixelsPerMetre,[tx,ty]=fit.translation;
 const distance=fit.distance??20;camera.position.set(Math.cos(a)*Math.cos(e)*distance,Math.sin(e)*distance,Math.sin(a)*Math.cos(e)*distance);camera.up.set(0,1,0);controls.target.set(0,0,0);
 if(camera.isPerspectiveCamera){camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(innerHeight/(2*k*distance)));camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,innerWidth/2-tx,innerHeight/2-ty,innerWidth,innerHeight);}else{camera.left=-tx/k;camera.right=(innerWidth-tx)/k;camera.bottom=(ty-innerHeight)/k;camera.top=ty/k;}camera.updateProjectionMatrix();controls.update();
 renderer.setClearColor('#ffffff');renderer.toneMappingExposure=.92;key.intensity=2.2;fill.intensity=.85;floor.material.opacity=.065;renderer.shadowMap.type=THREE.PCFSoftShadowMap;key.shadow.mapSize.set(512,512);key.shadow.map?.dispose();key.shadow.map=null;render();
};
window.RECONSTRUCTION.loadGLBData=async buffer=>{
 const loaded=await new GLTFLoader().parseAsync(buffer,'');
 scene.remove(model);disposeTree(model);model=loaded.scene;window.RECONSTRUCTION.model=model;
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);view('hero');
 const box=new THREE.Box3().setFromObject(model,true);let triangles=0,nonFinite=0,images=0;
 model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const a of Object.values(o.geometry.attributes))for(const v of a.array)if(!Number.isFinite(v))nonFinite++;for(const key of ['map','normalMap','roughnessMap'])if(o.material[key])images++;}});
 let importedRecipe;model.traverse(o=>{importedRecipe??=o.userData.pgf?.metadata?.recipe;});
 return {min:box.min.toArray(),max:box.max.toArray(),triangles,nonFinite,textureBindings:images,drawCalls:renderer.info.render.calls,recipe:importedRecipe};
};

window.RECONSTRUCTION.loadGLB=base64=>window.RECONSTRUCTION.loadGLBData(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)).buffer);
addEventListener('pagehide',()=>window.RECONSTRUCTION.dispose(),{once:true});
// Visible acceptance controls: this page always renders the canonical definition's actual exported GLB.
if(query.get('controls')==='1'){
 const box=document.createElement('section');box.style.cssText='position:fixed;left:12px;bottom:12px;max-width:510px;padding:12px;background:#fffffff2;color:#282821;border:1px solid #aaa;font:13px system-ui;border-radius:8px';
 const label=document.createElement('strong');label.textContent='实际 PGF GLB · 预设审核';box.append(label,document.createElement('br'));
 const select=document.createElement('select');select.setAttribute('aria-label','审核预设');for(const p of definition.presets)select.add(new Option(p.name,p.id));select.value=query.get('preset')??'reference';select.onchange=()=>{query.set('preset',select.value);location.search=query.toString();};box.append(select);
 const shot=document.createElement('button');shot.textContent='下载此预设 PNG (500×380)';shot.onclick=()=>{const w=renderWidth,h=renderHeight;renderWidth=500;renderHeight=380;renderer.setSize(500,380,false);view('hero');const a=document.createElement('a');a.download='reference-armored-car-'+select.value+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();renderWidth=w;renderHeight=h;renderer.setSize(w,h);view(query.get('view')??'hero');};box.append(shot);
 const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap;font:12px monospace;margin:6px 0 0';info.textContent=JSON.stringify({preset:select.value,params:result.recipe.params,triangles:window.RECONSTRUCTION.diagnostics().triangles,modelMeshes:window.RECONSTRUCTION.diagnostics().meshes,frameCalls:renderer.info.render.calls},null,2);box.append(info);
 const importer=document.createElement('input');importer.type='file';importer.accept='.glb';importer.setAttribute('aria-label','回读下载的 GLB');
 const importLabel=document.createElement('label');importLabel.textContent='回读下载的 GLB：';importLabel.append(importer);box.append(importLabel);
 importer.onchange=async()=>{const file=importer.files[0];if(!file)return;try{const report=await window.RECONSTRUCTION.loadGLBData(await file.arrayBuffer());info.textContent=JSON.stringify({sourceFile:file.name,bytes:file.size,...report},null,2);}catch(error){info.textContent=error.message;}};
 document.body.append(box);
}
