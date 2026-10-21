import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHash} from 'node:crypto';
import adapter,{defaults} from '../definition.mjs';
import {createTrackedMortarModel,disposeModel} from '../model.mjs';
import {kit} from '../blender-kit.mjs';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {validateAsset as validatePreview} from '../../../src/plugins/asset.js';
import {readGLB,writeSceneGLB} from '../../../src/plugins/scatter/io.js';
import {evaluateVisualReview} from '../visual-gate.mjs';

const ownerNames=['chassis','running-gear','engine','platform','carriage','cradle','barrel','mechanisms'];
test('actual Blender kit is modular, selected-scene-only and has eleven road wheels per side',()=>{
 assert.match(kit.authoring,/MCP/);assert.match(kit.sourceGLBSha256,/^[a-f0-9]{64}$/);assert.ok(kit.meshes.length>20);assert.ok(kit.nodes.length>kit.meshes.length*3);
 assert.equal(kit.nodes.filter(n=>n.name.startsWith('road-wheel-')).length,22);assert.equal(kit.nodes.filter(n=>n.name.startsWith('high-end-wheel-')).length,4);assert.ok(!kit.nodes.some(n=>/STUDIO/.test(n.name)));
});
test('low reference default and saved degree values retain literal visual-angle meaning',()=>{
 assert.equal(defaults.elevation,0);
 for(const elevation of [0,35,60,70]){const m=createTrackedMortarModel({...defaults,elevation});assert.ok(Math.abs(m.parts.barrel.rotation.x+THREE.MathUtils.degToRad(elevation))<1e-8);assert.equal(m.metadata.elevationDegrees,elevation);assert.deepEqual(Object.keys(m.parts),ownerNames);const forward=new THREE.Vector3(0,0,1).applyQuaternion(m.parts.barrel.quaternion);assert.ok(Math.abs(forward.y-Math.sin(elevation*Math.PI/180))<1e-8);disposeModel(m.root);}
});
test('quality removes substantial small detail, preserves wheel count, and keeps draws bounded',()=>{
 const a=createTrackedMortarModel(defaults),b=createTrackedMortarModel({...defaults,detail:'standard'});assert.equal(a.metadata.roadWheelsPerSide,11);assert.equal(b.metadata.roadWheelsPerSide,11);assert.ok(a.metadata.batching.triangles>b.metadata.batching.triangles*1.12);assert.ok(a.metadata.batching.draws<60);assert.ok(a.metadata.batching.partCount>b.metadata.batching.partCount);let vertices=0;a.root.traverse(o=>{if(o.isMesh)for(const attr of Object.values(o.geometry.attributes)){vertices+=attr.count;for(const v of attr.array)assert.ok(Number.isFinite(v));}});assert.ok(vertices>10000);disposeModel(a.root);disposeModel(b.root);
});
test('length, thickness, railings and exploded controls alter independent visual features',()=>{
 const a=createTrackedMortarModel(defaults),b=createTrackedMortarModel({...defaults,length:12,barrelScale:1.15,railings:false,exploded:1});assert.equal(b.parts.barrel.scale.x,1.15);assert.ok(b.parts.engine.position.z>a.parts.engine.position.z);assert.ok(b.parts.platform.position.y>a.parts.platform.position.y);assert.ok(b.parts['running-gear'].position.y<a.parts['running-gear'].position.y);assert.ok(a.parts.platform.userData.sourceParts.some(n=>n.startsWith('rail-post')));assert.ok(!b.parts.platform.userData.sourceParts.some(n=>n.startsWith('rail-post')));const ba=new THREE.Box3().setFromObject(a.parts.chassis),bb=new THREE.Box3().setFromObject(b.parts.chassis);assert.ok(bb.getSize(new THREE.Vector3()).z>ba.getSize(new THREE.Vector3()).z);disposeModel(a.root);disposeModel(b.root);
});
test('unscored art is not converted into an invented visual pass',()=>{
 assert.equal(evaluateVisualReview({status:'unscored-review-required'},{}).passed,false);
});
test('maps and geometry release exactly once without mutating recipe inputs',()=>{
 const params={...defaults},m=createTrackedMortarModel(params);assert.deepEqual(params,defaults);const textures=new Set();m.root.traverse(o=>{for(const material of [o.material].flat().filter(Boolean))for(const v of Object.values(material))if(v?.isTexture)textures.add(v);});assert.ok(textures.size>=3);assert.equal(textures.size,15);
 const counts=new Map();for(const t of textures)t.addEventListener('dispose',()=>counts.set(t,(counts.get(t)||0)+1));disposeModel(m.root);for(const t of textures)assert.equal(counts.get(t),1);
});
test('Node and browser AssetIR validation accepts low pose and old boundary poses',async()=>{
 const prepared=prepareGenerator(adapter);
 for(const elevation of [0,35,70]){const r=await prepared.generate({seed:'mortar-edge',params:{elevation,length:elevation===35?9:12,barrelScale:elevation===35?.85:1.15,detail:'standard',railings:false,exploded:1}});validatePreview({...r.asset,schemaVersion:'pgf.asset/1',roots:r.asset.rootNodeIds});assert.equal(r.asset.metadata.elevationDegrees,elevation);assert.equal(r.asset.sockets.length,3);assert.equal(r.asset.colliders.length,1);assert.equal(r.asset.colliders[0].kind,'box');for(const s of r.asset.sockets)assert.ok(s.position.every(Number.isFinite));assert.equal(r.asset.metadata.visualAcceptance.numericScore,null);}
 await assert.rejects(()=>prepared.generate({seed:'bad',params:{elevation:-1}}));await assert.rejects(()=>prepared.generate({seed:'bad',params:{elevation:NaN}}));await assert.rejects(()=>prepared.generate({seed:'bad',params:{unowned:1}}));
});
test('same seed retains vertex, material and texture identity; wear alters texture bytes',async()=>{
 const prepared=prepareGenerator(adapter),digest=asset=>{const h=createHash('sha256');for(const m of asset.meshes)for(const p of m.primitives)for(const k of ['positions','normals','uv0','indices'])if(p[k])h.update(Buffer.from(p[k].buffer,p[k].byteOffset,p[k].byteLength));for(const t of asset.textures)h.update(t.bytes);return h.digest('hex');};
 const a=await prepared.generate({seed:'repeat',params:{}}),b=await prepared.generate({seed:'repeat',params:{}}),c=await prepared.generate({seed:'repeat',params:{weathering:0}});assert.equal(digest(a.asset),digest(b.asset));assert.notEqual(digest(a.asset),digest(c.asset));
});

test('shortest chassis keeps circular road wheels separated instead of overlapping',()=>{const m=createTrackedMortarModel({...defaults,length:9});assert.ok(m.root.userData.artLayout.roadWheelSpacing-2*m.root.userData.artLayout.roadWheelRadius>=.0199);disposeModel(m.root);});

test('assembled runtime geometry has no zero-area triangles after cap cleanup',()=>{
 for(const length of [9,10.8,12]){const model=createTrackedMortarModel({...defaults,length});model.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index;for(let i=0;i<idx.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i)),b=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(p,idx.getX(i+2));assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>=1e-20);}});disposeModel(model.root);}
});


test('tank PBR replaces paint only and keeps existing steel, rubber and glass identities',()=>{
 const a=createTrackedMortarModel(defaults,{seed:'tank-parity'}),b=createTrackedMortarModel({...defaults,paintColor:'#aa6622'},{seed:'tank-parity'}),materials=model=>{const result=new Map();model.root.traverse(o=>{if(o.material)result.set(o.material.name,o.material);});return result;},ma=materials(a),mb=materials(b);
 for(const name of ['graphite-painted-steel','tube-exterior']){const m=ma.get(name);assert.equal(m.userData.appearanceRole,'armorPaint');assert.equal(m.map.name,'tank-armor-basecolor');assert.equal(m.map.image.width,512);assert.equal(m.normalMap.name,'tank-armor-normal');assert.equal(m.roughnessMap,m.metalnessMap);assert.equal(m.metalness,.15);assert.notEqual(m.color.getHex(),mb.get(name).color.getHex());}
 for(const name of ['cast-edge-steel','panel-shadow','dark-running-bands','lamps-frosted-glass']){assert.notEqual(ma.get(name).userData.appearanceRole,'armorPaint');assert.equal(ma.get(name).map.image.width,128);assert.deepEqual(ma.get(name).map.image.data,mb.get(name).map.image.data);}
 disposeModel(a.root);disposeModel(b.root);
});
test('tank finish defaults preserve old recipes and schema rejects malformed new fields',async()=>{
 const p=prepareGenerator(adapter),a=await p.generate({seed:'old-recipe',params:{elevation:60}});assert.equal(a.recipe.params.camoPattern,'original');assert.equal(a.asset.metadata.camouflage.pattern,'original');assert.match(a.asset.metadata.materialSource,/PGF tank/);assert.equal(a.asset.textures.length,15);
 for(const params of [{paintColor:['#ffffff']},{paintColor:'red'},{camoPattern:'invented'},{camoScale:0},{camoEnvironment:'bad'}])await assert.rejects(()=>p.generate({seed:'bad',params}));
});


test('Node/MCP context rejects pre-aborted requests before allocating an asset',async()=>{
 const prepared=prepareGenerator(adapter),controller=new AbortController();controller.abort();
 await assert.rejects(()=>prepared.generate({seed:'aborted',params:{detail:'standard'}},{signal:controller.signal}),{name:'AbortError'});
 await assert.rejects(()=>adapter.generate({seed:'aborted',params:{}},{signal:controller.signal}),{name:'AbortError'});
});
test('cooperative Node abort yields between phases and disposes owned texture/material objects',async()=>{
 const prepared=prepareGenerator(adapter),controller=new AbortController(),oldTexture=THREE.Texture.prototype.dispose,oldMaterial=THREE.Material.prototype.dispose;let textures=0,materials=0;
 THREE.Texture.prototype.dispose=function(){textures++;return oldTexture.call(this);};THREE.Material.prototype.dispose=function(){materials++;return oldMaterial.call(this);};
 const timer=setTimeout(()=>controller.abort(),0);
 try{await assert.rejects(()=>prepared.generate({seed:'abort-during-phase',params:{detail:'standard'}},{signal:controller.signal}),{name:'AbortError'});assert.equal(textures,15);assert.equal(materials,6);}
 finally{clearTimeout(timer);THREE.Texture.prototype.dispose=oldTexture;THREE.Material.prototype.dispose=oldMaterial;}
});
test('Node/MCP context enforces real instance, draw, node, byte and material budgets',async()=>{
 const prepared=prepareGenerator(adapter),request={seed:'budget-contract',params:{detail:'standard'}};
 for(const key of ['maxTriangles','maxDraws','maxNodes','maxOutputBytes','maxMaterialSlots'])await assert.rejects(()=>prepared.generate(request,{budget:{[key]:1}}),new RegExp(key+' exceeded'));
 for(const budget of [{maxTriangles:-1},{maxTriangles:NaN},{maxDraws:Infinity},{unowned:1},null,[]])await assert.rejects(()=>prepared.generate(request,{budget}),/Invalid budget/);
 const first=await prepared.generate(request),stats=assetStatistics(first.asset),budget={maxTriangles:stats.renderedTriangles,maxDraws:stats.draws,maxNodes:stats.nodes,maxOutputBytes:stats.bytes,maxMaterialSlots:stats.materials},copy={...budget};
 const accepted=await prepared.generate(request,{budget});assert.deepEqual(assetStatistics(accepted.asset),stats);assert.deepEqual(budget,copy);
});
