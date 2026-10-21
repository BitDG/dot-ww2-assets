import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createReferenceArmoredCarModel,disposeTree,detailTier,defaults,pivots} from '../core.mjs';
import definition from '../definition.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
import {readGLB,writeSceneGLB} from '../../../src/plugins/scatter/io.js';
const prepared=prepareGenerator(definition);
const request=params=>({seed:'blender-kit-test',params,input:{}});
function count(root){let n=0;root.traverse(o=>{if(o.isMesh&&o.visible)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;}
function owned(params,fn){const r=createReferenceArmoredCarModel(params,{seed:'blender-kit-test'});try{return fn(r);}finally{disposeTree(r);}}

test('formal checks run with PGF pinned Three.js and preserve generator contract',()=>{
 assert.equal(THREE.REVISION,'180','Do not certify this project against another checkout\'s Three version');
 assert.equal(definition.id,'reference-armored-car');assert.equal(definition.version,'1.1.0');
 assert.deepEqual(definition.presets.map(p=>p.id),['reference','forward','clean','dusty']);
 assert.deepEqual(Object.keys(defaults),['scale','turretYaw','gunElevation','paint','roughness','weathering','antennas','markings','detail','camoPattern','camoEnvironment','camoScale']);
});
test('Blender owners and visual pivots remain explicit and finite',()=>owned({},root=>{
 for(const name of ['hull','running-gear','front-fenders','rear-fenders','side-boxes','rear-boxes','hatch','tools',...pivots])assert.ok(root.getObjectByName(name),name);
 assert.equal(root.getObjectByName('gun-elevation-pivot').parent.name,'turret-pivot');
 for(const name of pivots.filter(n=>n.startsWith('wheel-')))assert.equal(root.getObjectByName(name).parent.name,'running-gear');
 root.traverse(o=>{if(!o.isMesh)return;for(const a of Object.values(o.geometry.attributes))for(const x of a.array)assert.ok(Number.isFinite(x));assert.ok(o.geometry.attributes.uv);});
}));
test('detail selects three genuinely distinct Blender geometry levels',()=>{
 assert.equal(detailTier(24),'low');assert.equal(detailTier(35),'low');assert.equal(detailTier(36),'medium');assert.equal(detailTier(55),'medium');assert.equal(detailTier(56),'high');assert.equal(detailTier(64),'high');
 const counts=[24,48,64].map(detail=>owned({detail},count));assert.ok(counts[0]<counts[1]&&counts[1]<counts[2],JSON.stringify(counts));
});
test('scale and exterior pose controls affect correct local transforms only',()=>{
 const base=owned({scale:1,turretYaw:0,gunElevation:0},r=>new THREE.Box3().setFromObject(r).getSize(new THREE.Vector3()));
 owned({scale:2,turretYaw:0,gunElevation:0},r=>{const box=new THREE.Box3().setFromObject(r).getSize(new THREE.Vector3());assert.ok(box.distanceTo(base.clone().multiplyScalar(2))<1e-5);});
 owned({turretYaw:71,gunElevation:19},r=>{assert.ok(Math.abs(r.getObjectByName('turret-pivot').rotation.y-THREE.MathUtils.degToRad(71))<1e-8);assert.ok(Math.abs(r.getObjectByName('gun-elevation-pivot').rotation.x+THREE.MathUtils.degToRad(19))<1e-8);assert.ok(r.getObjectByName('hull').rotation.toArray().slice(0,3).every(v=>Math.abs(v)<1e-10));});
});
test('materials are instance-owned and optional cosmetics disappear from export',async()=>{
 const a=createReferenceArmoredCarModel({paint:'#713b21',roughness:.48,weathering:0}),b=createReferenceArmoredCarModel({paint:'#62764e',roughness:.97,weathering:.8});
 try{let am,bm;a.traverse(o=>{if(o.isMesh&&o.material.name==='armor')am=o.material;});b.traverse(o=>{if(o.isMesh&&o.material.name==='armor')bm=o.material;});assert.notEqual(am,bm);assert.equal(am.color.getHexString(),'713b21');assert.equal(am.roughness,.48);assert.equal(bm.roughness,.97);assert.notDeepEqual(am.map.image.data,bm.map.image.data);assert.equal(am.aoMap,null);}finally{disposeTree(a);disposeTree(b);}
 const on=await prepared.generate(request({antennas:true,markings:true})),off=await prepared.generate(request({antennas:false,markings:false}));
 assert.ok(on.asset.nodes.some(n=>n.name==='markings'));assert.ok(!off.asset.nodes.some(n=>n.name==='markings'));assert.ok(!off.asset.nodes.some(n=>n.name==='antennas'));assert.ok(assetStatistics(off.asset).renderedTriangles<assetStatistics(on.asset).renderedTriangles);
});
test('canonical definition provides sockets, PBR channels and reversible real GLB',async()=>{
 const {asset,recipe}=await prepared.generate(request({}));assert.equal(asset.sockets.length,7);assert.equal(recipe.generator,'reference-armored-car');assert.equal(asset.metadata.referenceReconstruction.authoring,'Blender 4.3.2 through actual local stdio MCP');assert.ok(!JSON.stringify(asset.metadata).includes('90%'));
 assert.ok(asset.materials.some(m=>m.baseColorTextureId&&m.normalTextureId&&m.metallicRoughnessTextureId));assert.equal(asset.textures.length,6);for(const t of asset.textures){assert.equal(t.width,512);assert.equal(t.height,512);assert.ok(t.bytes.length>1000);}
 const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},bytes=writeSceneGLB([{contentHash:'kit',asset}],[{id:'car',assetContentHash:'kit',transform:identity,tags:[]}],{preserveSemantics:true});
 const reimport=readGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'kit-roundtrip');assert.equal(reimport.sockets.length,7);assert.equal(assetStatistics(reimport).renderedTriangles,assetStatistics(asset).renderedTriangles);assert.equal(reimport.textures.length,6);for(let k=0;k<3;k++){assert.ok(Math.abs(reimport.bounds.min[k]-asset.bounds.min[k])<1e-5);assert.ok(Math.abs(reimport.bounds.max[k]-asset.bounds.max[k])<1e-5);}
});
test('schema limits, cancellation and budget rejection still work',async()=>{
 for(const params of [{scale:0},{detail:23},{detail:65},{detail:36.5},{paint:[]},{turretYaw:181},{gunElevation:26},{weathering:-.1},{antennas:'yes'},{unknown:1}])await assert.rejects(prepared.generate(request(params)));
 const c=new AbortController();c.abort();await assert.rejects(prepared.generate(request({}),{signal:c.signal}),e=>e.name==='AbortError');
 await assert.rejects(prepared.generate(request({}),{budget:{maxTriangles:1}}),/exceeded/);
});

test('collider and sockets stay node-local under non-unit scale',async()=>{
 for(const scale of [.5,2]){const {asset}=await prepared.generate(request({scale,detail:24})),root=asset.nodes.find(n=>n.id===asset.rootNodeIds[0]),collider=asset.colliders[0];assert.deepEqual(root.transform.scale,[scale,scale,scale]);assert.deepEqual(collider.size,[2.70,2.65,4.60]);assert.deepEqual(collider.offset,[0,1.325,0]);assert.equal(collider.nodeId,root.id);for(const socket of asset.sockets)assert.deepEqual(socket.transform.position,[0,0,0]);}
});
