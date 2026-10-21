// Test-only driver of the original PGF workbench and its public APIs.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sha256Portable,readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
const ID=new URLSearchParams(location.search).get('asset');
if(!['qf17-visual-prop','land-mattress-visual-prop'].includes(ID))throw Error('Unknown acceptance target');
const {default:adapter}=await import('../../'+ID+'/definition.mjs');
const {PARTS}=await import('../../'+ID+'/params.mjs');
const {SOURCES}=await import('../../'+ID+'/sources.mjs');
const report={assetId:ID,stage:'Towed exterior unified Firefox static acceptance',started:new Date().toISOString(),userAgent:navigator.userAgent,checks:[],errors:[]};
window.TOWED_DOT_QA_REPORT=report;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok,details)=>{report.checks.push({name,ok:!!ok,details});if(!ok)throw Error(name+' failed');};
async function until(predicate,label,ms=180000){const start=performance.now();while(!predicate()){if(performance.now()-start>ms)throw Error('Timeout '+label);await sleep(50);}}
const onError=e=>report.errors.push(String(e.error?.stack??e.message)),onRejection=e=>report.errors.push(String(e.reason?.stack??e.reason));
window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);
const oldError=console.error;console.error=(...args)=>{report.errors.push(args.map(String).join(' '));oldError(...args);};
try{
 await until(()=>window.__PGF_READY__&&window.PGF_ACTIVE?.selectModel,'actual PGF startup');
 const editor=window.PGF_ACTIVE,root=document.querySelector('#rock-lab'),canvas=root.querySelector('canvas'),fields=root.querySelector('.plugin-fields'),selector=root.querySelector('[data-dot-model]');
 const ready=()=>editor.diagnostics().phase==='ready';
 selector.value=ID;selector.dispatchEvent(new Event('change',{bubbles:true}));await until(()=>editor.currentModel()===ID&&ready(),'TOWED initial generation');
 check('real Firefox WebGL context',navigator.userAgent.includes('Firefox/')&&editor.diagnostics().preview.contextLost===false);
 check('same unified canvas and schema container',canvas===root.querySelector('canvas')&&fields===root.querySelector('.plugin-fields')&&root.querySelectorAll('canvas').length===1);
 const baseline=structuredClone(editor.snapshot().models[ID]);baseline.seed=ID+'-unified-acceptance';baseline.params={...adapter.defaults};
 await editor.applyRecipe(baseline);await until(ready,'baseline');
 const changed=(key,value)=>{const input=root.querySelector('[data-param="'+key+'"]');if(!input)throw Error('Missing input '+key);if(input.type==='checkbox')input.checked=value;else if(input.tagName==='SELECT')input.value=String(adapter.parameterSchema.properties[key].enum.indexOf(value));else input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));};
 const set=async(key,value)=>{changed(key,value);await until(()=>ready()&&editor.snapshot().models[ID].params[key]===value,'parameter '+key);};
 const semantic=asset=>{const names=asset.nodes.map(n=>n.name);return Object.values(PARTS).every(name=>names.includes(name));};
 let asset=editor.currentAsset();report.baseline={stats:editor.diagnostics().stats,source:asset.metadata.source};
 check('native TOWED identity and final medium source',asset.generator.id===ID&&asset.metadata.source.sha256===SOURCES.medium.sha256);
 check('all authored semantic exterior part groups retained',semantic(asset));
 report.authoredNodes=asset.nodes.map(n=>n.name);
 if(ID==='land-mattress-visual-prop'){check('fixed 1945 thirty-mouth five-by-six exterior contract retained',asset.metadata.exteriorPattern.rows===5&&asset.metadata.exteriorPattern.columns===6&&asset.metadata.exteriorPattern.mouthCount===30&&asset.metadata.exteriorPattern.editable===false);check('two static wheel pivots without rack or weapon animation',asset.metadata.visualRuntime.wheelPivots.length===2&&asset.metadata.visualRuntime.animationEnabled===false&&asset.metadata.visualRuntime.rackMovement===false&&asset.metadata.visualRuntime.weaponOperation===false);}
 check('fixed art controls and static-only capabilities',adapter.capabilities.procedural===false&&adapter.capabilities.onlineRemodeling===false&&adapter.capabilities.animation===false&&adapter.capabilities.staticGLB===true);
 check('no motion or firing controls enabled',root.querySelector('[data-animation-drive]').disabled&&root.querySelector('[data-animation-fire]').disabled&&!editor.preview.runtime.available);
 const triangles=editor.diagnostics().stats.renderedTriangles;
 for(const [key,value]of [['paintColor','#a17b57'],['roughness',.83],['weathering',.6],['camoPattern','winter'],['camoEnvironment','snow'],['camoScale',2]]){await set(key,value);check('actual shared material control '+key,editor.diagnostics().stats.renderedTriangles===triangles&&editor.snapshot().models[ID].params[key]===value);}
 check('actual PBR textures present',editor.currentAsset().textures.length>=3);
 for(const [key,name]of Object.entries(PARTS)){await set(key,false);check('part '+key+' changes actual geometry',!editor.currentAsset().nodes.some(n=>n.name===name)&&editor.diagnostics().stats.renderedTriangles<triangles);await set(key,true);}
 for(const detail of ['low','high','medium']){await set('detail',detail);check('actual '+detail+' source selected',editor.currentAsset().metadata.source.sha256===SOURCES[detail].sha256);}
 await set('artScale',1.25);check('uniform art scale applied',editor.currentAsset().nodes.some(n=>n.name===(ID==='qf17-visual-prop'?'QF17_ROOT':'LM_ROOT')&&n.transform.scale.every(s=>s===1.25)));
 const completed=structuredClone(editor.snapshot()),completedAsset=editor.currentAsset(),runtime=editor.preview.runtime;
 for(const key of Object.keys(PARTS))changed(key,false);
 await until(()=>editor.diagnostics().phase==='error','all parts hidden rejection');
 check('failed draft preserves successful asset and recipe',editor.currentAsset()===completedAsset&&editor.preview.runtime===runtime&&JSON.stringify(editor.snapshot())===JSON.stringify(completed)&&root.querySelector('[data-export]').disabled);
 root.querySelector('[data-cancel]').click();check('cancel restores successful controls',ready()&&Object.keys(PARTS).every(k=>root.querySelector('[data-param="'+k+'"]').checked));
 changed('roughness',.71);root.querySelector('[data-cancel]').click();await sleep(500);
 check('pending replacement cancellation retains asset',ready()&&editor.currentAsset()===completedAsset&&editor.preview.runtime===runtime&&JSON.stringify(editor.snapshot())===JSON.stringify(completed));
 const canceled=editor.exportAsset();root.querySelector('[data-cancel]').click();check('canceled export produces no stale download',(await canceled)===null);
 await editor.applyRecipe(baseline);await until(ready,'restore baseline');const first=await editor.exportAsset();
 check('actual static GLB export bytes',first?.bytes?.length>1000);
 await editor.applyRecipe(baseline);await until(ready,'deterministic regeneration');const second=await editor.exportAsset();
 check('same seed and parameters produce identical GLB',sha256Portable(first.bytes)===sha256Portable(second.bytes));
 const seedVariant=structuredClone(baseline);seedVariant.seed+='-different';await editor.applyRecipe(seedVariant);await until(ready,'alternate seed');const seedExport=await editor.exportAsset();check('different seed changes authored cosmetic result without geometry count change',sha256Portable(seedExport.bytes)!==sha256Portable(first.bytes)&&editor.snapshot().models[ID].seed===seedVariant.seed&&editor.diagnostics().stats.renderedTriangles===triangles);await editor.applyRecipe(baseline);await until(ready,'restore baseline seed');
 const buffer=first.bytes.buffer.slice(first.bytes.byteOffset,first.bytes.byteOffset+first.bytes.byteLength),gltf=await new GLTFLoader().parseAsync(buffer,'');
 let meshes=0;const textures=new Set(),materials=new Set(),geometries=new Set(),names=[];
 gltf.scene.traverse(o=>{names.push(o.name);if(o.isMesh){meshes++;geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});
 const bounds=new THREE.Box3().setFromObject(gltf.scene),reread=validateAsset(readGLB(buffer,ID));
 report.export={bytes:first.bytes.length,sha256:sha256Portable(first.bytes),meshes,textures:textures.size,animations:gltf.animations.length,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
 check('independent GLTFLoader finite static PBR readback',meshes>0&&gltf.animations.length===0&&textures.size>=3&&[...textures].every(t=>(t.image?.width??t.source?.data?.width)>0)&&bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
 check('static export retains semantic exterior parts and provenance',semantic(reread)&&reread.generator.id===ID&&reread.metadata.source.sha256===SOURCES.medium.sha256);
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});
 check('actual exported GLB persisted',(await fetch('/__towed_qa/export?asset='+ID,{method:'POST',body:first.bytes})).ok);
 const native=JSON.stringify(editor.snapshot().models[ID]);
 for(const id of ['qf25-visual-prop','flakzwilling43-visual-prop','bm13-us6-visual-prop',...(ID==='land-mattress-visual-prop'?['qf17-visual-prop']:[]),ID]){await editor.selectModel(id);await until(ready,'switch '+id);check('existing identity preserved '+id,editor.currentAsset().generator.id===id&&root.querySelector('canvas')===canvas);}
 check('TOWED recipe restored without schema leakage',JSON.stringify(editor.snapshot().models[ID])===native&&Object.keys(PARTS).every(k=>!!root.querySelector('[data-param="'+k+'"]'))&&!root.querySelector('[data-param=showCab]'));
 report.cleanup=[];
 for(let cycle=0;cycle<3;cycle++){const old=editor.preview.runtime;await editor.selectModel('k5-railway-prop');await until(()=>!editor.diagnostics().preview.pending,'clear pending');const d=editor.diagnostics();report.cleanup.push(d.preview);check('TOWED GPU cleanup cycle '+cycle,d.phase==='source-only'&&!editor.currentAsset()&&d.preview.geometries===0&&d.preview.textures===0&&d.preview.render.calls===0&&old.state().disposed,d.preview);await editor.selectModel(ID);await until(ready,'rebuild '+cycle);}
 await Promise.all([editor.selectModel(ID),editor.selectModel('reference-armored-car'),editor.selectModel(ID)]);await until(ready,'rapid final selection');
 check('rapid switching final TOWED wins on same canvas',editor.currentAsset().generator.id===ID&&root.querySelector('canvas')===canvas&&root.querySelectorAll('canvas').length===1);
 await until(()=>!editor.diagnostics().preview.pending,'idle');await sleep(250);let frames=editor.diagnostics().preview.frames;await sleep(600);check('static idle stops rendering',editor.diagnostics().preview.frames===frames);
 editor.setActive(false);frames=editor.diagnostics().preview.frames;await sleep(300);check('hidden viewport stops rendering',editor.diagnostics().preview.frames===frames);editor.setActive(true);await sleep(200);
 report.beforeDispose=editor.diagnostics();editor.dispose();const d=editor.diagnostics();
 check('dispose releases canvas workers timers URLs and GPU context',d.disposed&&d.canvasCount===0&&!d.worker&&!d.exportWorker&&d.preview.disposed&&d.preview.contextLost&&!d.preview.pending&&!d.debouncePending&&d.ownedObjectURLs===0,d);
 check('no browser or shader errors',report.errors.length===0);report.status='passed';report.completed=new Date().toISOString();
}catch(error){report.status='failed';report.failure=error.stack??String(error);}
finally{console.error=oldError;window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection);await fetch('/__towed_qa/report?asset='+ID,{method:'POST',body:JSON.stringify(report)});console.log('TOWED_DOT_QA_RESULT',report.status,report);document.title='TOWED unified Firefox '+report.status;}
