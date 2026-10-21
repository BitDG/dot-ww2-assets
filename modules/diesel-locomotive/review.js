/** Canonical definition → actual GLB → GLTFLoader → genuine Three canvas review. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeTree} from './core.mjs';
import {prepareGenerator} from '../../generator-sdk/validation.mjs';
import {writeSceneGLB} from '../../src/plugins/scatter/io.js';
import definition from './definition.mjs';
const query=new URLSearchParams(location.search),preset=definition.presets.find(p=>p.id===query.get('preset'))??definition.presets[0];
let w=innerWidth,h=innerHeight,frames=0,disposed=false,activeView='hero',diagnosticsPanel=null,lastCapture=null,presetSelect=null,presetDownload=null;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(w,h);renderer.setClearColor('#edf0ef');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight('#f6fafb','#737a78',1.1));const key=new THREE.DirectionalLight('#fff8ed',2.3);key.position.set(-10,20,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:.1,far:70});key.shadow.bias=-.00025;scene.add(key);const fill=new THREE.DirectionalLight('#dae8fb',1);fill.position.set(6,9,-12);scene.add(fill);
const result=await prepareGenerator(definition).generate({seed:'diesel-art-1',params:preset.params,input:{}}),identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
let modelSource={kind:'generated',presetId:preset.id,recipe:result.recipe};
const exported=writeSceneGLB([{contentHash:'review',asset:result.asset}],[{id:'review',assetContentHash:'review',transform:identity,tags:[]}],{preserveSemantics:true});
let modelSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',exported)),v=>v.toString(16).padStart(2,'0')).join('');
let model=(await new GLTFLoader().parseAsync(exported.buffer,'')).scene;scene.add(model);
model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
function render(){if(!disposed){renderer.render(scene,camera);frames++;}}
function view(name='hero',projectionAspect=w/h){
 activeView=name;
 const bounds=new THREE.Box3().setFromObject(model,true),target=bounds.getCenter(new THREE.Vector3()),dirs={hero:[-22,16,30],side:[0,0,35],front:[-35,0,0],top:[0,40,0]};camera.position.copy(target).add(new THREE.Vector3(...(dirs[name]??dirs.hero)));camera.up.set(0,1,0);if(name==='top')camera.up.set(0,0,-1);camera.lookAt(target);camera.updateMatrixWorld(true);
 const points=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)),span=name==='hero'?Math.max(height,width/(w/h))*1.12:Math.max(bounds.max.y-bounds.min.y,bounds.max.z-bounds.min.z,(bounds.max.x-bounds.min.x)/projectionAspect)*1.12;
 camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.01;camera.far=200;camera.updateProjectionMatrix();controls.target.copy(target);controls.update();camera.position.copy(target).add(new THREE.Vector3(...(dirs[name]??dirs.hero)));camera.lookAt(target);camera.updateMatrixWorld(true);render();if(diagnosticsPanel)diagnosticsPanel.textContent=JSON.stringify(diagnostics(),null,2);
}
function diagnostics(){let triangles=0,meshes=0;model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {preset:modelSource.kind==='generated'?modelSource.presetId:null,modelSource,view:activeView,modelSha256,resolution:[w,h],camera:{direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),near:camera.near,far:camera.far,unitsPerPixel:(camera.top-camera.bottom)/h,type:camera.type,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,target:controls.target.toArray()},triangles,meshes,frames,renderer:renderer.info.render,memory:renderer.info.memory};}
async function loadGLBData(buffer,sourceName='Imported GLB'){
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),v=>v.toString(16).padStart(2,'0')).join(''),loaded=await new GLTFLoader().parseAsync(buffer,'');let envelope;loaded.scene.traverse(o=>{envelope??=o.userData.pgf;});
 scene.remove(model);disposeTree(model);model=loaded.scene;modelSha256=sha;modelSource={kind:'imported-glb',sourceName,presetId:null,recipe:envelope?.metadata?.recipe??null};lastCapture=null;
 if(presetSelect)presetSelect.value='__imported__';if(presetDownload){presetDownload.disabled=true;presetDownload.title='导入模型请使用当前视图PNG按钮；切换预设将重新生成';}
 model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});scene.add(model);view();return {...diagnostics(),bounds:new THREE.Box3().setFromObject(model,true),components:envelope?.metadata?.components?.length};
}
function dispose(){if(disposed)return;disposed=true;controls.dispose();disposeTree(model);floor.geometry.dispose();floor.material.dispose();env.dispose();renderer.dispose();}
window.DIESEL_REVIEW={view,render,renderer,result,exported,diagnostics,loadGLBData,dispose};controls.addEventListener('change',render);addEventListener('resize',()=>{w=innerWidth;h=innerHeight;renderer.setSize(w,h);view(query.get('view')??'hero');});addEventListener('pagehide',dispose,{once:true});view(query.get('view')??'hero');window.DIESEL_REVIEW_READY=true;
if(query.get('controls')==='1'){
 const panel=document.createElement('section');panel.style.cssText='position:fixed;left:12px;bottom:12px;max-width:430px;max-height:42vh;overflow:auto;padding:12px;background:#fffffff2;color:#24302e;font:12px system-ui;border:1px solid #aab4b0;border-radius:8px';
 const title=document.createElement('strong');title.textContent='实际 PGF GLB · 非功能性外观审核';panel.append(title,document.createElement('br'));
 const select=document.createElement('select');presetSelect=select;const importedOption=new Option('已导入GLB（切换将重新生成）','__imported__');importedOption.disabled=true;select.add(importedOption);select.setAttribute('aria-label','审核预设');for(const p of definition.presets)select.add(new Option(p.name,p.id));select.value=preset.id;select.onchange=()=>{query.set('preset',select.value);location.search=query.toString();};panel.append(select);
 const download=document.createElement('button');presetDownload=download;download.textContent='下载此预设 PNG (500×380)';download.onclick=()=>{const W=w,H=h;w=500;h=380;renderer.setSize(w,h,false);view();const a=document.createElement('a');a.download='diesel-locomotive-'+preset.id+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();w=W;h=H;renderer.setSize(w,h);view(query.get('view')??'hero');};panel.append(download);
 for(const [id,label]of [['hero','整体'],['side','侧视'],['front','正视'],['top','俯视']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>view(id);panel.append(b);}
 const capture=document.createElement('button');capture.textContent='下载当前视图清晰 PNG';capture.onclick=()=>{const W=w,H=h,V=activeView;[w,h]=V==='hero'?[1200,760]:V==='front'?[560,420]:[1400,420];renderer.setSize(w,h,false);view(V,1400/420);lastCapture={...diagnostics(),capture:'Pure Three canvas; orthographic views use common vertical span and 420 pixel height'};const a=document.createElement('a');a.download='diesel-locomotive-'+V+'-'+modelSha256.slice(0,12)+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();w=W;h=H;renderer.setSize(w,h);view(V);};panel.append(capture);
 const receipt=document.createElement('button');receipt.textContent='下载上张 PNG 相机 JSON';receipt.onclick=()=>{if(!lastCapture)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lastCapture,null,2)],{type:'application/json'})),a=document.createElement('a');a.download='diesel-locomotive-'+lastCapture.view+'-camera.json';a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);};panel.append(receipt);
 const info=document.createElement('pre');diagnosticsPanel=info;info.style.cssText='white-space:pre-wrap';info.textContent=JSON.stringify({preset:preset.id,params:result.recipe.params,...diagnostics()},null,2);panel.append(info);
 const input=document.createElement('input');input.type='file';input.accept='.glb';input.setAttribute('aria-label','回读下载的 GLB');input.onchange=async()=>{const file=input.files[0];if(!file)return;try{info.textContent=JSON.stringify({sourceFile:file.name,...await loadGLBData(await file.arrayBuffer(),file.name)},null,2);}catch(e){info.textContent=e.message;}};panel.append(input);document.body.append(panel);
}
