// Acceptance-only module; operates the original PGF app and its single viewport.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
import adapter from '../../flakzwilling43-visual-prop/definition.mjs';
import {PARTS,SOURCES} from '../../flakzwilling43-visual-prop/model.mjs';
const ID='flakzwilling43-visual-prop',report={stage:'Flakzwilling F2 I2 unified Firefox acceptance',started:new Date().toISOString(),userAgent:navigator.userAgent,checks:[],errors:[]};
window.Flakzwilling_DOT_QA_REPORT=report;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok,details)=>{report.checks.push({name,ok:!!ok,details});if(!ok)throw Error(name+' failed');};
async function until(predicate,label,ms=120000){const start=performance.now();while(!predicate()){if(performance.now()-start>ms)throw Error('Timeout '+label);await sleep(50);}}
const errors=e=>report.errors.push(String(e.error?.stack??e.message)),rejections=e=>report.errors.push(String(e.reason?.stack??e.reason));
window.addEventListener('error',errors);window.addEventListener('unhandledrejection',rejections);
let renderer,oldRender,spriteCacheSeen=false;const sharedSpriteGeometry=new THREE.Sprite().geometry;
const oldError=console.error;console.error=(...args)=>{report.errors.push(args.map(String).join(' '));oldError(...args);};
try{
 await until(()=>window.__PGF_READY__&&window.PGF_ACTIVE?.selectModel,'actual app startup');
 const editor=window.PGF_ACTIVE,root=document.querySelector('#rock-lab'),canvas=root.querySelector('canvas'),fields=root.querySelector('.plugin-fields'),selector=root.querySelector('[data-dot-model]');
 const ready=()=>editor.diagnostics().phase==='ready';
 renderer=editor.preview.renderer;oldRender=renderer.render;renderer.render=function(...args){const result=oldRender.apply(this,args);args[0].traverseVisible(o=>{if(o.isSprite){if(o.geometry!==sharedSpriteGeometry)throw Error('Unexpected Sprite geometry ownership');spriteCacheSeen=true;}});return result;};
 check('Firefox real browser',navigator.userAgent.includes('Firefox/'));
 selector.value=ID;selector.dispatchEvent(new Event('change',{bubbles:true}));await until(()=>editor.currentModel()===ID&&ready(),'Flakzwilling initial generation');
 check('one original unified canvas and schema container',canvas===root.querySelector('canvas')&&fields===root.querySelector('.plugin-fields')&&root.querySelectorAll('canvas').length===1);
 const baseline=structuredClone(editor.snapshot().models[ID]);baseline.seed='flakzwilling-unified-acceptance';baseline.params={...adapter.defaults};await editor.applyRecipe(baseline);await until(ready,'baseline');
 let asset=editor.currentAsset();report.baseline={stats:editor.diagnostics().stats,metadata:asset.metadata};
 check('native Flakzwilling identity and exact final source',asset.generator.id===ID&&asset.metadata.source.sha256===SOURCES.medium.sha256&&asset.metadata.visualRuntime.noWheels===true);
 check('three-foot base retained and no wheel geometry',asset.nodes.some(n=>n.name==='FZ43_Tripod_Base')&&!asset.nodes.some(n=>/(?:^|_)(?:wheel|wheels|tire|tyre)(?:_|$)/i.test(n.name)));
 check('schema exposes art controls only, without firing parameters',!Object.keys(adapter.parameterSchema.properties).some(k=>/ballistic|recoil|velocity|fireRate/i.test(k)));
 check('fixed art contract and no online remodeling',adapter.capabilities.procedural===false&&adapter.capabilities.onlineRemodeling===false&&adapter.capabilities.artProportions===true);
 const {generators}=await import('../../../src/generator-registry.js'),{projectGeneratorCollections}=await import('../../../src/runtime/generator-collections.mjs');
 const parent=projectGeneratorCollections(generators).find(x=>x.id==='dot-model-generator');
 check('one collection card with Flakzwilling searchable member',generators.some(x=>x.id===ID)&&!projectGeneratorCollections(generators).some(x=>x.id===ID)&&parent.searchTerms.includes(ID));
 const changed=(key,value)=>{const input=root.querySelector('[data-param="'+key+'"]');if(!input)throw Error('Missing schema input '+key);if(input.type==='checkbox')input.checked=value;else if(input.tagName==='SELECT')input.value=String(adapter.parameterSchema.properties[key].enum.indexOf(value));else input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));};
 const set=async(key,value)=>{changed(key,value);await until(()=>ready()&&editor.snapshot().models[ID].params[key]===value,'parameter '+key);};
 const triangles=editor.diagnostics().stats.renderedTriangles;
 await set('paintColor','#a17b57');await set('roughness',.83);await set('weathering',.6);
 check('real PGF material controls preserve geometry',editor.diagnostics().stats.renderedTriangles===triangles&&editor.snapshot().models[ID].params.paintColor==='#a17b57');
 await set('camoPattern','winter');await set('camoEnvironment','snow');await set('camoScale',2);
 check('shared PGF winter textures and appearance',editor.currentAsset().metadata.camouflage.pattern==='winter'&&editor.currentAsset().metadata.camouflage.environment==='snow'&&editor.currentAsset().textures.length>=3);
 for(const [key,name]of Object.entries(PARTS)){
  await set(key,false);check('hide '+key+' removes group from static AssetIR',!editor.currentAsset().nodes.some(n=>n.name===name)&&editor.diagnostics().stats.renderedTriangles<triangles);
  await set(key,true);
 }
 for(const detail of ['low','high','medium']){await set('detail',detail);check('actual '+detail+' authored source selected',editor.currentAsset().metadata.source.sha256===SOURCES[detail].sha256);}
 await set('artScale',1.25);await set('shieldWidth',1.07);
 check('art proportions keep runtime valid',editor.preview.runtime.state().motionAvailable&&editor.preview.runtime.state().fireAvailable);
 const completed=structuredClone(editor.snapshot()),completedAsset=editor.currentAsset(),runtime=editor.preview.runtime;
 for(const key of Object.keys(PARTS))changed(key,false);
 await until(()=>editor.diagnostics().phase==='error','all hidden guard');
 check('failed edit retains previous asset runtime and completed recipe',editor.currentAsset()===completedAsset&&editor.preview.runtime===runtime&&JSON.stringify(editor.snapshot())===JSON.stringify(completed)&&root.querySelector('[data-export]').disabled);
 root.querySelector('[data-cancel]').click();check('cancel restores successful parameters',ready()&&Object.keys(PARTS).every(k=>root.querySelector('[data-param="'+k+'"]').checked));
 changed('roughness',.71);root.querySelector('[data-cancel]').click();await sleep(400);
 check('pending cancel preserves completed asset and runtime',ready()&&editor.currentAsset()===completedAsset&&editor.preview.runtime===runtime&&JSON.stringify(editor.snapshot())===JSON.stringify(completed));
 const exportCanceled=editor.exportAsset();root.querySelector('[data-cancel]').click();check('canceled export returns no download',(await exportCanceled)===null&&editor.currentAsset()===completedAsset);
 const before=await editor.exportAsset();check('actual static GLB bytes export',before?.bytes.length>1000);
 root.querySelector('[data-dot-tab=animation]').click();check('tow and smoke controls available with clear labels',root.querySelector('[data-animation-drive]').textContent==='朝向展示'&&!root.querySelector('[data-animation-drive]').disabled&&!root.querySelector('[data-animation-fire]').disabled);
 root.querySelector('[data-animation-drive]').click();await sleep(500);root.querySelector('[data-animation-pause]').click();
 const tow=runtime.diagnostics().animation.flakzwilling;check('real display advances with fixed-base author binding',tow.mode==='display'&&tow.time>0&&tow.binding.fixedBase===true&&tow.binding.nodes.moving.length===6);
 const pausedTime=tow.time;await sleep(250);check('pause stops artistic time',runtime.diagnostics().animation.flakzwilling.time===pausedTime);
 const during=await editor.exportAsset();check('display-preview static export byte-identical',sha256Portable(before.bytes)===sha256Portable(during.bytes));
 root.querySelector('[data-animation-fire]').click();await until(()=>runtime.diagnostics().animation.flakzwilling.emissions===1,'actual smoke cue');root.querySelector('[data-animation-pause]').click();
 const smoke=runtime.diagnostics().animation.flakzwilling;report.smoke=smoke;
 check('two local art smoke cues with display stopped',smoke.mode==='smoke'&&smoke.emissions===1&&smoke.lastAnchors?.length===2&&smoke.lastAnchors.every(a=>a.position.every(Number.isFinite))&&!runtime.state().motionPlaying);
 const afterSmoke=await editor.exportAsset();check('smoke excluded from static export',sha256Portable(before.bytes)===sha256Portable(afterSmoke.bytes));
 runtime.seek(.7);check('seek reconstructs deterministic smoke time',Math.abs(runtime.diagnostics().animation.flakzwilling.time-.7)<1e-8);
 root.querySelector('[data-animation-speed]').value='2';root.querySelector('[data-animation-speed]').dispatchEvent(new Event('change',{bubbles:true}));check('UI speed is cosmetic multiplier',runtime.state().speed===2);
 root.querySelector('[data-animation-framing]').value='presentation';root.querySelector('[data-animation-framing]').dispatchEvent(new Event('change',{bubbles:true}));check('presentation framing opt-in',runtime.state().framing==='presentation');
 root.querySelector('[data-animation-reset]').click();check('reset returns static state',runtime.diagnostics().animation.flakzwilling.time===0&&!runtime.playing);
 const buffer=before.bytes.buffer.slice(before.bytes.byteOffset,before.bytes.byteOffset+before.bytes.byteLength),gltf=await new GLTFLoader().parseAsync(buffer,'');
 let meshes=0;const textures=new Set(),materials=new Set(),geometries=new Set(),names=[];gltf.scene.traverse(o=>{names.push(o.name);if(o.isMesh){meshes++;geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});
 const bounds=new THREE.Box3().setFromObject(gltf.scene),reread=validateAsset(readGLB(buffer,ID));report.export={bytes:before.bytes.length,sha256:sha256Portable(before.bytes),meshes,textures:textures.size,animations:gltf.animations.length,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
 check('independent GLTFLoader reimport has finite static geometry and decoded textures',meshes>0&&gltf.animations.length===0&&textures.size>=3&&[...textures].every(t=>(t.image?.width??t.source?.data?.width)>0)&&bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
 check('GLB preserves stationary base and excludes wheels and smoke',names.includes('FZ43_Tripod_Base')&&!names.some(n=>/(?:^|_)(?:wheel|wheels|tire|tyre)(?:_|$)|Owned_Preview_Smoke/i.test(n)));
 check('PGF export provenance and no-wheels state roundtrip',reread.generator.id===ID&&reread.metadata.visualRuntime.noWheels===true&&reread.metadata.source.sha256===SOURCES.medium.sha256);
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});
 const saved=await fetch('/__dot_qa/file?id='+ID,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:before.bytes});check('real exported GLB receipt saved',saved.ok);
 const nativeRecipe=JSON.stringify(editor.snapshot().models[ID]);await editor.selectModel('diesel-locomotive');await until(ready,'diesel');await editor.selectModel(ID);await until(ready,'return Flakzwilling');
 check('native Flakzwilling recipe restores without cross-model schema leakage',JSON.stringify(editor.snapshot().models[ID])===nativeRecipe&&!!root.querySelector('[data-param=shieldWidth]')&&!root.querySelector('[data-param=bodyLength]'));
 const oldRuntime=editor.preview.runtime,oldScene=editor.preview.object.parent;await editor.selectModel('k5-railway-prop');await until(()=>!editor.diagnostics().preview.pending,'empty host frame');check('WIP switch frees Flakzwilling owned resources; only proven shared Sprite cache remains',editor.diagnostics().phase==='source-only'&&editor.diagnostics().preview.geometries===(spriteCacheSeen?1:0)&&editor.diagnostics().preview.textures===0&&editor.diagnostics().preview.render.calls===0&&!editor.currentAsset()&&oldScene.children.every(o=>o.isLight)&&oldRuntime.state().disposed,{preview:editor.diagnostics().preview,sceneTypes:oldScene.children.map(o=>o.type),runtime:oldRuntime.diagnostics()});
 const cycles=[];for(let cycle=0;cycle<3;cycle++){await editor.selectModel(ID);await until(ready,'cache cycle model');const old=editor.preview.runtime,scene=editor.preview.object.parent;editor.preview.play('fire');await until(()=>old.diagnostics().animation.flakzwilling.emissions===1,'cache cycle smoke');await editor.selectModel('k5-railway-prop');await until(()=>!editor.diagnostics().preview.pending,'empty host frame');const sample={cycle,geometry:editor.diagnostics().preview.geometries,textures:editor.diagnostics().preview.textures,calls:editor.diagnostics().preview.render.calls,sceneTypes:scene.children.map(o=>o.type),disposed:old.state().disposed};cycles.push(sample);check('bounded shared Sprite cache cycle '+cycle,spriteCacheSeen&&sample.geometry===1&&sample.textures===0&&sample.calls===0&&scene.children.every(o=>o.isLight)&&sample.disposed,sample);}report.sharedSpriteCache={source:'three@0.180.0/src/objects/Sprite.js module-global geometry; borrowed, never disposed by runtime',cycles};
 await Promise.all([editor.selectModel(ID),editor.selectModel('reference-armored-car'),editor.selectModel(ID)]);await until(ready,'rapid switch');check('rapid final Flakzwilling selection wins on original canvas',editor.currentAsset().generator.id===ID&&root.querySelector('canvas')===canvas&&root.querySelectorAll('canvas').length===1);
 await until(()=>!editor.diagnostics().preview.pending,'idle');await sleep(200);let frames=editor.diagnostics().preview.frames;await sleep(500);check('idle no continuous rendering',editor.diagnostics().preview.frames===frames);
 editor.preview.play('drive');editor.setActive(false);frames=editor.diagnostics().preview.frames;const hiddenTime=editor.preview.runtime.diagnostics().animation.flakzwilling.time;await sleep(300);check('inactive stops render and motion',editor.diagnostics().preview.frames===frames&&editor.preview.runtime.diagnostics().animation.flakzwilling.time===hiddenTime);editor.setActive(true);editor.preview.runtime.reset();
 check('actual GPU context alive',editor.diagnostics().preview.contextLost===false);editor.dispose();const d=editor.diagnostics();check('unified dispose clears canvas, workers, timers and object URLs',d.disposed&&d.canvasCount===0&&!d.worker&&!d.exportWorker&&d.preview.disposed&&d.preview.contextLost&&!d.preview.pending&&!d.debouncePending&&d.ownedObjectURLs===0,d);
 check('no unexpected browser or shader errors',report.errors.length===0);report.status='passed';report.completed=new Date().toISOString();
}catch(error){report.status='failed';report.failure=error.stack??String(error);}
finally{if(renderer&&oldRender)renderer.render=oldRender;console.error=oldError;window.removeEventListener('error',errors);window.removeEventListener('unhandledrejection',rejections);await fetch('/__dot_qa/report?case=flakzwilling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});console.log('Flakzwilling_DOT_QA_RESULT',report.status,report);document.title='Flakzwilling unified Firefox '+report.status;}
