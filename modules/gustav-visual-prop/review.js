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
let w=innerWidth,h=innerHeight,frames=0,disposed=false;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(w,h);renderer.setClearColor('#edf0ef');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight('#f6fafb','#737a78',1.1));const key=new THREE.DirectionalLight('#fff8ed',2.3);key.position.set(-10,20,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:.1,far:70});key.shadow.bias=-.00025;scene.add(key);const fill=new THREE.DirectionalLight('#dae8fb',1);fill.position.set(6,9,-12);scene.add(fill);
const result=await prepareGenerator(definition).generate({seed:'gustav-art-1',params:preset.params,input:{}}),identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
const exported=writeSceneGLB([{contentHash:'review',asset:result.asset}],[{id:'review',assetContentHash:'review',transform:identity,tags:[]}],{preserveSemantics:true});
const sha256=async buffer=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
let displayedSHA=await sha256(exported),displayedSource='Canonical definition export',displayedRecipe=result.recipe,lastCapture=null,currentView='hero';
let model=(await new GLTFLoader().parseAsync(exported.buffer,'')).scene;scene.add(model);
model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
function render(){if(!disposed){renderer.render(scene,camera);frames++;}}
function view(name='hero',strict=false){
 currentView=name;
 const bounds=new THREE.Box3().setFromObject(model,true),target=bounds.getCenter(new THREE.Vector3()),dirs={hero:[-22,17,29],side:[0,0,35],front:[-35,0,0],top:[0,40,0]};camera.position.copy(target).add(new THREE.Vector3(...(dirs[name]??dirs.hero)));camera.up.set(0,1,0);if(name==='top')camera.up.set(0,0,-1);camera.lookAt(target);camera.updateMatrixWorld(true);
 const points=[];model.updateMatrixWorld(true);model.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse));});
 const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)),span=strict&&name!=='hero'?h/(1600/((bounds.max.x-bounds.min.x)*1.10)):Math.max(height,width/(w/h))*(strict?1.11:1.10);
 camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.01;camera.far=200;camera.updateProjectionMatrix();controls.target.copy(target);controls.update();render();
}
function diagnostics(){let triangles=0,meshes=0;model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {preset:displayedSource==='Canonical definition export'?preset.id:'imported-glb',recipe:displayedRecipe,triangles,meshes,frames,renderer:renderer.info.render,memory:renderer.info.memory};}
async function loadGLBData(buffer,sourceName='Imported GLB'){displayedSHA=await sha256(buffer);displayedSource=sourceName;const loaded=await new GLTFLoader().parseAsync(buffer,'');scene.remove(model);disposeTree(model);model=loaded.scene;model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});scene.add(model);view();let envelope;model.traverse(o=>{envelope??=o.userData.pgf;});displayedRecipe=envelope?.metadata?.recipe??null;lastCapture=null;return {...diagnostics(),bounds:new THREE.Box3().setFromObject(model,true),sourceGLBSha256:displayedSHA,recipe:envelope?.metadata?.recipe,components:envelope?.metadata?.components?.length};}
function downloadData(filename,type,data){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function captureFinal(name=currentView){
 const saved={w,h,view:currentView},size={hero:[1600,900],side:[1600,520],top:[1600,420],front:[600,520]}[name]??[1600,900];[w,h]=size;renderer.setSize(w,h,false);view(name,true);
 const bounds=new THREE.Box3().setFromObject(model,true),direction=camera.getWorldDirection(new THREE.Vector3()).toArray();if(name==='top'&&Math.abs(direction[1]+1)>1e-8)throw Error('Top camera is not exactly vertical');
 lastCapture={generator:definition.id,version:definition.version,view:name,resolution:size,sourceGLBSha256:displayedSHA,source:displayedSource,camera:{type:'OrthographicCamera',position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),lookDirection:direction,matrixWorld:camera.matrixWorld.toArray(),projectionMatrix:camera.projectionMatrix.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom},pixelsPerArtUnit:name==='hero'?null:1600/((bounds.max.x-bounds.min.x)*1.10),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},...diagnostics(),rendering:'Actual Three GLTFLoader, antialiased WebGL, shared PBR pixels; no Monte Carlo sampling noise'};
 const a=document.createElement('a');a.download='gustav-visual-prop-final-'+name+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();w=saved.w;h=saved.h;renderer.setSize(w,h);view(saved.view);return lastCapture;
}
function dispose(){if(disposed)return;disposed=true;controls.dispose();disposeTree(model);floor.geometry.dispose();floor.material.dispose();env.dispose();renderer.dispose();}
window.GUSTAV_REVIEW={view,render,renderer,result,exported,diagnostics,loadGLBData,captureFinal,get lastCapture(){return lastCapture;},dispose};controls.addEventListener('change',render);addEventListener('resize',()=>{w=innerWidth;h=innerHeight;renderer.setSize(w,h);view(query.get('view')??'hero');});addEventListener('pagehide',dispose,{once:true});view(query.get('view')??'hero');window.GUSTAV_REVIEW_READY=true;
if(query.get('controls')==='1'){
 const panel=document.createElement('section');panel.style.cssText='position:fixed;left:12px;bottom:12px;max-width:430px;max-height:42vh;overflow:auto;padding:12px;background:#fffffff2;color:#24302e;font:12px system-ui;border:1px solid #aab4b0;border-radius:8px';
 const title=document.createElement('strong');title.textContent='实际 PGF GLB · 非功能性外观审核';panel.append(title,document.createElement('br'));
 const select=document.createElement('select');select.setAttribute('aria-label','审核预设');for(const p of definition.presets)select.add(new Option(p.name,p.id));select.value=preset.id;select.onchange=()=>{query.set('preset',select.value);location.search=query.toString();};panel.append(select);
 const download=document.createElement('button');download.textContent='下载此预设 PNG (500×380)';download.onclick=()=>{const W=w,H=h;w=500;h=380;renderer.setSize(w,h,false);view();const a=document.createElement('a');a.download='gustav-visual-prop-'+preset.id+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();w=W;h=H;renderer.setSize(w,h);view(query.get('view')??'hero');};panel.append(download);
 for(const [id,label]of [['hero','整体'],['side','侧视'],['front','正视'],['top','俯视']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{view(id);info.textContent=JSON.stringify({view:id,sourceGLBSha256:displayedSHA,camera:{type:'OrthographicCamera',position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),matrixWorld:camera.matrixWorld.toArray()},...diagnostics()},null,2);};panel.append(b);}
 const full=document.createElement('button');full.textContent='下载当前视图清晰 PNG';full.onclick=()=>{info.textContent=JSON.stringify(captureFinal(),null,2);proof.disabled=false;};panel.append(full);
 const proof=document.createElement('button');proof.textContent='下载上张图相机回执 JSON';proof.disabled=true;proof.onclick=()=>{if(lastCapture)downloadData('gustav-visual-prop-final-'+lastCapture.view+'-camera.json','application/json',JSON.stringify(lastCapture,null,2));};panel.append(proof);
 const info=document.createElement('pre');info.style.cssText='white-space:pre-wrap';info.textContent=JSON.stringify({preset:preset.id,params:result.recipe.params,...diagnostics()},null,2);panel.append(info);
 const input=document.createElement('input');input.type='file';input.accept='.glb';input.setAttribute('aria-label','回读下载的 GLB');input.onchange=async()=>{const file=input.files[0];if(!file)return;try{info.textContent=JSON.stringify({sourceFile:file.name,...await loadGLBData(await file.arrayBuffer(),file.name)},null,2);download.disabled=true;proof.disabled=true;}catch(e){info.textContent=e.message;}};panel.append(input);document.body.append(panel);
}
