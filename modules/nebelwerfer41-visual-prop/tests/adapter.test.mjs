import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadImage} from '@napi-rs/canvas';
import adapter,{defaults,ID} from '../definition.mjs';
import {PARTS,SOURCE_SHA256,SOURCE_URL,readSourceBytes,loadExternalArt,createResourceOwner,buildVisualProp} from '../model.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
import {readGLB,validateAsset,writeSceneGLB} from '../../../src/plugins/scatter/io.js';
import {generatorManifestSchema} from '../../../generator-sdk/manifest.mjs';

const prepared=prepareGenerator(adapter),seed='n41-pgf-acceptance-1',source=new Uint8Array(await readFile(SOURCE_URL));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const generate=params=>prepared.generate({seed,params});
const transform={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
const exportGLB=asset=>writeSceneGLB([{contentHash:'n41',asset}],[{id:asset.id,assetContentHash:'n41',transform,tags:[]}],{preserveSemantics:true});
const report={sourceSHA256:sha(source),checks:[],independentReadback:null};
let baseline;

test('manifest, single schema and truthful capability contract',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../nebelwerfer41-visual-prop.generator.json',import.meta.url)));
 assert.equal(generatorManifestSchema.parse(manifest).workbench.collectionId,'dot-model-generator');
 assert.equal(adapter.id,ID);assert.equal(adapter.capabilities.procedural,false);assert.equal(adapter.capabilities.onlineRemodeling,false);assert.equal(adapter.capabilities.animation,false);
 assert.equal(sha(source),SOURCE_SHA256);assert.deepEqual(await readSourceBytes(),source);
 report.checks.push('manifest / schema / immutable source');
});

test('real generate, PBR material bindings and sealed N4 vertex colors',async()=>{
 baseline=await generate({});const {asset}=baseline;validateAsset(asset);
 assert.equal(asset.generator.id,ID);assert.equal(assetStatistics(asset).renderedTriangles,109516);
 assert.equal(asset.textures.length,3);assert.deepEqual(asset.metadata.exterior,{tubes:6,pinsHidden:6,capsHidden:6,frontRims:6,changedVertices:576,remainsSealed:true,scope:'runtime appearance only; original N2 GLB unchanged'});
 assert.equal(asset.nodes.filter(n=>/^N41_Solid_Tube_[1-6]$/.test(n.name)).length,6);
 assert.equal(asset.nodes.filter(n=>/^N41_(Cap_Cosmetic_Pin|Shallow_Dark_End)_[1-6]_-1$/.test(n.name)).length,0);
 for(const node of asset.nodes.filter(n=>/^N41_Solid_Tube_[1-6]$/.test(n.name))){const p=asset.meshes.find(m=>m.id===node.meshId).primitives[0];assert(p.colors?.some(v=>v<.2));assert(p.colors.every(Number.isFinite));}
 const rims=asset.nodes.filter(n=>/^N41_Cosmetic_Collar_[1-6]_-1$/.test(n.name));assert.equal(rims.length,6);
 for(const node of rims){const p=asset.meshes.find(m=>m.id===node.meshId).primitives[0];assert.equal(p.indices.length/3,768);for(let i=0;i<p.positions.length;i+=3)assert(Math.hypot(p.positions[i],p.positions[i+1])>.15,'The exterior lip must not cover the sealed dark surface');}
 assert(asset.materials.some(m=>m.baseColorTextureId&&m.normalTextureId&&m.metallicRoughnessTextureId));
 report.baseline=assetStatistics(asset);report.checks.push('actual AssetIR / 3 PBR channels / 6 dark sealed surfaces');
});

test('every semantic part toggle changes actual exported geometry',async()=>{
 for(const [key,name]of Object.entries(PARTS)){
  const {asset}=await generate({[key]:false});assert(!asset.nodes.some(n=>n.name===name));assert(assetStatistics(asset).triangles<report.baseline.triangles);
  const only=Object.fromEntries(Object.keys(PARTS).map(k=>[k,k===key]));const lone=(await generate(only)).asset;
  assert.equal(lone.metadata.activeParts.length,1);assert.equal(lone.metadata.activeParts[0],name);assert(assetStatistics(lone).triangles>0);
 }
 await assert.rejects(generate(Object.fromEntries(Object.keys(PARTS).map(k=>[k,false]))),/至少保留一个/);
 report.checks.push('5 part off / 5 part-only / all-hidden rejected');
});

test('material and seed effects are deterministic without pretending to remodel geometry',async()=>{
 const repeated=await generate({});assert.equal(sha(exportGLB(repeated.asset)),sha(exportGLB(baseline.asset)));
 const variants=[{paintColor:'#ae8060'},{roughness:1},{weathering:1},{camoPattern:'winter',camoEnvironment:'snow',camoScale:2}];
 for(const params of variants){const {asset}=await generate(params);assert.equal(assetStatistics(asset).triangles,report.baseline.triangles);assert.notEqual(sha(exportGLB(asset)),sha(exportGLB(baseline.asset)));assert.equal(asset.generator.id,ID);}
 const differentSeed=await prepared.generate({seed:'n41-other-seed',params:{}});assert.notEqual(sha(differentSeed.asset.textures[0].bytes),sha(baseline.asset.textures[0].bytes));
 for(const params of [{roughness:.35,weathering:0,camoScale:.5},{roughness:1,weathering:1,camoScale:2}])validateAsset((await generate(params)).asset);
 report.checks.push('determinism / paint / roughness / weathering / camo / material-only seed / numeric boundaries');
});

test('invalid inputs, source corruption and undersized budgets reject',async()=>{
 for(const params of [{scale:2},{showWheels:'false'},{roughness:.349},{weathering:1.01},{paintColor:['#ffffff']},{camoPattern:'unknown'},{camoScale:2.1}])await assert.rejects(generate(params));
 await assert.rejects(prepared.generate({seed,params:{},input:{file:'external.glb'}}));
 for(const [key,value]of Object.entries({maxTriangles:1,maxDraws:1,maxNodes:1,maxOutputBytes:1,maxMaterialSlots:1}))await assert.rejects(prepared.generate({seed,params:{}},{budget:{[key]:value}}),new RegExp(key));
 await assert.rejects(adapter.generate({seed,params:{}},{budget:{maxTriangles:NaN}}),/Invalid budget/);
 const corrupt=source.slice();corrupt[corrupt.length-1]^=1;await assert.rejects(loadExternalArt(corrupt),/checksum/);
 report.checks.push('strict input / no user import / invalid source / all five budgets');
});

test('browser-style HTTP bytes load, HTTP failure and fetch cancellation',async()=>{
 const server=createServer((req,res)=>{if(req.url==='/missing'){res.writeHead(404);res.end();}else if(req.url==='/slow'){setTimeout(()=>{res.writeHead(200);res.end(source);},100);}else{res.writeHead(200,{'Content-Type':'model/gltf-binary'});res.end(source);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal(sha(await readSourceBytes({url:new URL(base+'/asset.glb')})),SOURCE_SHA256);
  await assert.rejects(readSourceBytes({url:new URL(base+'/missing')}),/HTTP 404/);
  const control=new AbortController(),pending=readSourceBytes({url:new URL(base+'/slow'),signal:control.signal});setTimeout(()=>control.abort(),10);await assert.rejects(pending,{name:'AbortError'});
 }finally{await new Promise(resolve=>server.close(resolve));}
 report.checks.push('file URL / actual HTTP load / HTTP 404 / aborted fetch');
});

test('abort before/after actual GLTFLoader and parse failure release owned resources',async()=>{
 const early=new AbortController();early.abort();await assert.rejects(prepared.generate({seed,params:{}},{signal:early.signal}),{name:'AbortError'});
 const owner=createResourceOwner(),late=new AbortController();await assert.rejects(loadExternalArt(source,{owner,signal:late.signal,configureLoader:loader=>loader.register(()=>({name:'TEST_ABORT',afterRoot:()=>late.abort()}))}),{name:'AbortError'});
 assert(owner.diagnostics().owned>300);assert.equal(owner.diagnostics().disposed,owner.diagnostics().owned);
 const failed=createResourceOwner();await assert.rejects(loadExternalArt(source,{owner:failed,configureLoader:loader=>loader.register(()=>({name:'TEST_FAILURE',afterRoot(){throw Error('Injected GLTFLoader afterRoot failure');}}))}),/Injected GLTFLoader/);
 assert(failed.diagnostics().owned>300);assert.equal(failed.diagnostics().disposed,failed.diagnostics().owned);
 failed.dispose();assert.equal(failed.diagnostics().disposed,failed.diagnostics().owned);
 const model=await buildVisualProp(defaults,{seed});const normalOwner=model.owner;normalOwner.dispose();assert.equal(normalOwner.diagnostics().disposed,normalOwner.diagnostics().owned);
 report.resourceRelease={lateAbort:owner.diagnostics(),loaderFailure:failed.diagnostics(),normal:normalOwner.diagnostics()};report.checks.push('early / late abort / real loader error / normal and idempotent disposal');
});

test('static GLB independently decodes real PNGs, geometry and preserved semantics',async()=>{
 const bytes=exportGLB(baseline.asset),roundTrip=validateAsset(readGLB(bytes.buffer,ID));assert.equal(assetStatistics(roundTrip).triangles,report.baseline.triangles);
 const previousSelf=globalThis.self,previousBitmap=globalThis.createImageBitmap;let decodedImages=0;
 globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>{const image=await loadImage(Buffer.from(await blob.arrayBuffer()));assert.equal(image.width,512);assert.equal(image.height,512);decodedImages++;return image;};
 let loaded;
 try{loaded=await new GLTFLoader().parseAsync(bytes.buffer,'');}finally{if(previousSelf===undefined)delete globalThis.self;else globalThis.self=previousSelf;if(previousBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=previousBitmap;}
 let triangles=0,meshes=0,darkColors=0,paintedMaterials=0;const materials=new Set();
 loaded.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.geometry.attributes.color?.array.some(v=>v<.2))darkColors++;materials.add(o.material);});
 for(const m of materials)if(m.map&&m.normalMap&&m.roughnessMap&&m.metalnessMap)paintedMaterials++;
 assert.equal(triangles,109516);assert.equal(meshes,355);assert.equal(darkColors,6);assert.equal(decodedImages,3);assert(paintedMaterials>0);assert.equal(loaded.animations.length,0);
 const owner=createResourceOwner();owner.capture(loaded.scene);owner.dispose();
 const out=new URL('../evidence/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('default-static.glb',out),bytes);await writeFile(new URL('default-recipe.json',out),JSON.stringify(baseline.recipe,null,2)+'\n');
 report.independentReadback={bytes:bytes.length,sha256:sha(bytes),triangles,meshes,darkColors,decodedImages,paintedMaterials,animationClips:0};
 assert.equal(sha(await readFile(SOURCE_URL)),SOURCE_SHA256);report.checks.push('PGF GLB writer / independent GLTFLoader / actual PNG decoder / 6 dark colors / static-only / source still unchanged');
});

test('shared worker accepts generate and exports its completed AssetIR',async()=>{
 const oldSelf=globalThis.self;let message;
 globalThis.self={postMessage:value=>{message=value;}};
 try{
  await import('../worker.js');await globalThis.self.onmessage({data:{request:{seed,params:{showWheels:false}}}});
  assert.equal(message.ok,true);assert.equal(message.result.asset.generator.id,ID);assert(!message.result.asset.nodes.some(n=>n.name==='N41_Wheel_Pair'));
  const asset=message.result.asset;await globalThis.self.onmessage({data:{op:'export',asset}});assert.equal(message.ok,true);assert(message.bytes instanceof Uint8Array);validateAsset(readGLB(message.bytes.buffer,ID));
 }finally{if(oldSelf===undefined)delete globalThis.self;else globalThis.self=oldSelf;}
 report.checks.push('real shared worker message protocol / completed-asset export');
 report.browserStatus='NOT RUN: HTTP route is tested in Node; real Firefox unified viewport acceptance is separate';
 await writeFile(new URL('../evidence/node-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
