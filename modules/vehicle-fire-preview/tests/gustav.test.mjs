import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAssetHandle}from'../../../src/plugins/asset.js';
import definition from '../../gustav-visual-prop/definition.mjs';
import {writeSceneGLB,validateAsset}from'../../../src/plugins/scatter/io.js';
import {bindGustavVisualMouth}from'../binding.mjs';
import {createVehicleFirePreview,vehicleFireCapabilities}from'../index.mjs';
import {createTankShotEffects}from'../../combat-fx/runtime/tank-shot-effects.mjs';
// Node-only texture/Canvas shims. Shader compilation remains a Firefox test.
globalThis.createImageBitmap=async blob=>{const bytes=await blob.arrayBuffer(),v=new DataView(bytes);return {width:v.getUint32(16),height:v.getUint32(20),close(){}};};
const canvasDocument={createElement(tag){assert.equal(tag,'canvas');const c={width:0,height:0};c.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),putImageData(data){c.imageData=data;}});return c;}};
async function fixture(params={}){const {asset}=await definition.generate({seed:'gustav-visual-fire-qa',params:{detail:'low',...params}});const h=await createAssetHandle({...asset,schemaVersion:'pgf.asset/1',roots:asset.rootNodeIds},THREE),scene=new THREE.Scene();scene.add(h.object);return {asset,object:h.object,scene,dispose:()=>h.dispose()};}
function runtime(f,options={}){const doc=globalThis.document;globalThis.document=canvasDocument;try{return createVehicleFirePreview({...f,...options});}finally{globalThis.document=doc;}}
function particles(scene){scene.updateMatrixWorld(true);const rows=[];scene.traverse(o=>{if(o.isSprite&&o.visible&&o.material.opacity>0)rows.push([...o.position.toArray(),...o.scale.toArray(),o.material.opacity,o.material.color.getHex()]);});return rows;}
const exportBytes=asset=>writeSceneGLB([{contentHash:'generated',asset:validateAsset(asset)}],[{id:'gustav',assetContentHash:'generated',transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},tags:[]}],{preserveSemantics:true});

test('actual AssetIR wrapper binds the closed cosmetic face at varied art proportions',async()=>{
 for(const p of [{},{silhouetteLength:.85,silhouetteHeight:1.15,silhouetteWidth:.9,shellLengthFactor:1.1}]){const f=await fixture(p);try{const b=bindGustavVisualMouth(f.object,f.scene),a=b.read();assert.ok(a.direction.x<-.99);assert.ok(a.position.x< -10);assert.ok(a.artScale>0);const model=f.object.getObjectByName('gustav-visual-prop');model.position.x+=2;f.object.updateMatrixWorld(true);assert.ok(Math.abs(b.read().position.x-a.position.x-2)<1e-6);}finally{f.dispose();}}
});

test('real PGF runtime replay, pause, inactive, seek and disposal own no asset resources',async()=>{
 const f=await fixture();let r;try{const before=exportBytes(f.asset),records=[];let disposedBorrowed=0;f.object.traverse(o=>{o.geometry?.addEventListener('dispose',()=>disposedBorrowed++);for(const m of [o.material].flat().filter(Boolean))m.addEventListener('dispose',()=>disposedBorrowed++);});
 r=runtime(f);assert.equal(r.available,true,r.diagnostics().fireReason);assert.equal(r.play('drive'),false);assert.equal(r.play('fire'),true);r.update(1.1);const a=particles(f.scene);assert.ok(a.length>20);r.pause();r.update(2);assert.deepEqual(particles(f.scene),a);r.play();r.setActive(false);const tick=r.diagnostics().fireTime;r.update(3);assert.equal(r.diagnostics().fireTime,tick);r.setActive(true);r.seek(1.1);assert.deepEqual(particles(f.scene),a);
 for(let i=0;i<4;i++){r.reset();r.play();r.update(1.1);assert.deepEqual(particles(f.scene),a);r.update(6);const d=r.diagnostics();assert.equal(d.fireEmissions,1);assert.equal(d.fireLive,0);records.push(d.fireUpstream.materialPool.allocated);}
 assert.equal(new Set(records).size,1);assert.deepEqual(exportBytes(f.asset),before);r.dispose();r.dispose();assert.equal(f.scene.children.length,1);assert.equal(disposedBorrowed,0);assert.equal(r.diagnostics().fireLive,0);assert.equal(r.play(),false);
 }finally{r?.dispose();f.dispose();}
});

test('birth point follows movement but an emitted cloud stays behind; binding survives recipe invalidation',async()=>{
 const f=await fixture();let r;try{let valid=true;r=runtime(f,{valid:()=>valid});valid=false;assert.equal(r.play(),true);r.update(.6);const before=r.diagnostics().fireAnchor.position;const model=f.object.getObjectByName('gustav-visual-prop');model.position.z+=4;f.object.updateMatrixWorld(true);r.update(.1);assert.deepEqual(r.diagnostics().fireAnchor.position,before);r.reset();r.play();r.update(.6);assert.ok(Math.abs(r.diagnostics().fireAnchor.position[2]-before[2]-4)<1e-6);}finally{r?.dispose();f.dispose();}
});

test('fixed art stepping is reproducible across frame chunks and multiplier',async()=>{
 const f=await fixture();let r;try{r=runtime(f);r.play();r.update(1.2);const a=particles(f.scene);r.reset();r.play();for(let i=0;i<72;i++)r.update(1/60);assert.deepEqual(particles(f.scene),a);r.reset();r.setSpeed(2);r.play();r.update(.6);assert.deepEqual(particles(f.scene),a);assert.throws(()=>r.setSpeed(Infinity));assert.throws(()=>r.seek(-1));}finally{r?.dispose();f.dispose();}
});

test('only Gustav has current fire capability; unknown and unarmed assets stay unavailable',()=>{
 for(const id of ['diesel-locomotive','armored-4x4','tracked-mortar','reference-armored-car','nebelwerfer41-visual-prop']){assert.equal(vehicleFireCapabilities(id).fire,false);assert.equal(createVehicleFirePreview({assetId:id}).available,false);}assert.equal(vehicleFireCapabilities('gustav-visual-prop').mechanicalRecoil,false);
});

test('binding rejects ambiguous or missing faces before allocating FX',()=>{
 const scene=new THREE.Scene(),object=new THREE.Group();scene.add(object);const r=createVehicleFirePreview({scene,object,assetId:'gustav-visual-prop'});assert.equal(r.available,false);assert.equal(scene.children.length,1);for(let i=0;i<2;i++){const g=new THREE.Group();g.name='opaque-front-recess';object.add(g);}assert.throws(()=>bindGustavVisualMouth(object,scene),/重复/);
});

test('invalid art configuration allocates no scene state',()=>{
 const scene=new THREE.Scene(),object=new THREE.Group();scene.add(object);assert.throws(()=>createVehicleFirePreview({scene,object,assetId:'gustav-visual-prop',config:{duration:Infinity}}));assert.equal(scene.children.length,1);
});

test('world-space framing envelope remains valid under transformed scene parents',async()=>{
 const f=await fixture();let r;try{f.scene.position.set(12,4,-7);f.scene.rotation.y=.4;f.scene.scale.set(1.2,.8,1.1);r=runtime(f);const a=bindGustavVisualMouth(f.object,f.scene).read();const center=a.position.clone().addScaledVector(a.direction,2*a.artScale).applyMatrix4(f.scene.matrixWorld);assert.ok(r.bounds().containsPoint(center));r.play();r.update(.7);const owned=f.scene.getObjectByName('dot-owned-gustav-fire-preview');owned.updateWorldMatrix(true,false);assert.ok(owned.getWorldPosition(new THREE.Vector3()).distanceTo(a.position.clone().applyMatrix4(f.scene.matrixWorld))<1e-6);}finally{r?.dispose();f.dispose();}
});

test('F2 uses three offset cloud layers for one visual cue, with one brief light source',async()=>{
 const f=await fixture();let r;const calls=[];try{r=runtime(f,{effectsFactory(root){const fx=createTankShotEffects(root),emit=fx.emit;fx.emit=(p,d,size,blueprint,look)=>{calls.push({origin:p.toArray(),look:{...look}});return emit(p,d,size,blueprint,look);};return fx;}});r.play();r.update(.7);const d=r.diagnostics();assert.equal(d.fireEmissions,1);assert.equal(d.fireCloudLayers,3);assert.equal(calls.length,3);assert.equal(new Set(calls.map(c=>JSON.stringify(c.origin))).size,1);assert.equal(calls.filter(c=>c.look.flashOpacity>0).length,1);assert.equal(calls.filter(c=>c.look.lightIntensity>0).length,1);assert.ok(calls.every(c=>c.look.flashDurationS<.1));r.update(6);assert.equal(r.diagnostics().fireLive,0);}finally{r?.dispose();f.dispose();}
});


test('F2 cloud layers share a birth point and open continuously before fading',async()=>{
 const f=await fixture();let r;try{r=runtime(f);const groups=()=>f.scene.getObjectByName('dot-owned-gustav-fire-preview').children.filter(o=>o.isGroup);r.seek(50/120);assert.equal(groups().length,3);assert.ok(groups().every(g=>g.position.length()<.001));let previous=groups().map(g=>g.position.clone());for(let i=0;i<144;i++){r.play();r.update(1/120);r.pause();const current=groups().map(g=>g.position.clone());assert.equal(current.length,3);for(let j=0;j<3;j++)assert.ok(current[j].distanceTo(previous[j])<.04,'offset opening stays continuous');previous=current;}r.seek(2);assert.equal(new Set(groups().map(g=>JSON.stringify(g.position.toArray()))).size,3);assert.ok(groups().some(g=>g.position.length()>2));r.seek(5.5);assert.equal(r.diagnostics().fireLive,0);assert.equal(groups().length,0);r.reset();assert.equal(r.diagnostics().fireEmissions,0);}finally{r?.dispose();f.dispose();}
});
