import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createAssetHandle} from '../../../src/plugins/asset.js';
import {createVehicleMotionAdapter,vehicleMotionCapabilities,VEHICLE_MOTION_IDS} from '../vehicle-motion.mjs';
import {mortarTrackFrame} from '../vehicle-motion-tracked.mjs';
import {writeSceneGLB,readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
import {createUnifiedController} from '../controller.mjs';

// Node exercises the production AssetIR->Three geometry path. Pixel decoding and
// real GPU rendering remain browser acceptance, not claimed by this fixture.
globalThis.createImageBitmap=async blob=>{const bytes=await blob.arrayBuffer(),view=new DataView(bytes);return {width:view.getUint32(16),height:view.getUint32(20),close(){}};};
const near=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function fingerprint(asset){const h=createHash('sha256');for(const mesh of asset.meshes)for(const p of mesh.primitives)for(const v of Object.values(p))if(ArrayBuffer.isView(v))h.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength));h.update(JSON.stringify(asset.nodes));h.update(JSON.stringify(asset.metadata));return h.digest('hex');}
async function fixture(id,params={},seed='motion-baseline'){
  const definition=(await import('../../'+id+'/definition.mjs')).default;
  const {asset}=await definition.generate({seed,params:id==='armored-4x4'?{finish:'olive',...params}:params});
  const handle=await createAssetHandle({...asset,schemaVersion:'pgf.asset/1',roots:asset.rootNodeIds},THREE);
  return {asset,handle,dispose:()=>handle.dispose()};
}
const modelName=id=>id==='armored-4x4'?'Armored 4x4':id;
function transforms(root){const result=[];root.traverse(n=>result.push([n,n.position.toArray(),n.quaternion.toArray(),n.scale.toArray(),n.visible,n.geometry,n.material]));return result;}
function unchanged(rows){for(const [n,p,q,s,visible,geometry,material]of rows){assert.deepEqual(n.position.toArray(),p,n.name+' position');assert.deepEqual(n.quaternion.toArray(),q,n.name+' quaternion');assert.deepEqual(n.scale.toArray(),s,n.name+' scale');assert.equal(n.visible,visible,n.name+' visible');assert.equal(n.geometry,geometry,n.name+' geometry ownership');assert.equal(n.material,material,n.name+' material ownership');}}

for(const id of VEHICLE_MOTION_IDS)test(id+' uses original AssetIR and real Three; loop, pause, stop, dispose are reversible',async()=>{
  const f=await fixture(id);let r;try{
    const original=fingerprint(f.asset),before=transforms(f.handle.object),model=f.handle.object.getObjectByName(modelName(id)),start=model.position.clone();
    const rail=model.getObjectByName('display-rails'),railMatrix=rail?.matrixWorld.clone();let borrowedDisposals=0;const mats=new Set();f.handle.object.traverse(n=>{for(const m of [n.material].flat().filter(Boolean))mats.add(m);});for(const m of mats)m.addEventListener('dispose',()=>borrowedDisposals++);
    r=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset});assert.equal(r.available,true,r.diagnostics().motionReason);assert.equal(r.playing,false);assert.equal(r.play('fire'),false);assert.equal(r.play('drive'),true);r.update(.5);
    assert.ok(model.position.distanceTo(start)>.1);if(rail)rail.matrixWorld.elements.forEach((v,i)=>near(v,railMatrix.elements[i]));
    r.pause();const paused=r.diagnostics();r.update(2);assert.deepEqual(r.diagnostics(),paused);assert.equal(r.play('drive'),true);r.setActive(false);r.update(2);assert.equal(r.diagnostics().motionTime,paused.motionTime);r.setActive(true);r.update(.1);assert.ok(r.diagnostics().motionTime>paused.motionTime);
    r.seek(2);near(r.diagnostics().motionDistance,r.diagnostics().motionAmplitude);r.seek(6);near(r.diagnostics().motionDistance,-r.diagnostics().motionAmplitude);r.seek(8);near(r.diagnostics().motionDistance,0);r.seek(1);const replay=transforms(f.handle.object).map(a=>[a[1],a[2]]);r.seek(3);r.seek(1);assert.deepEqual(transforms(f.handle.object).map(a=>[a[1],a[2]]),replay);
    r.stop();near(model.position.distanceTo(start),0);assert.equal(r.playing,false);assert.equal(r.diagnostics().motionTime,0);r.play();r.update(.3);r.dispose();r.dispose();unchanged(before);assert.equal(borrowedDisposals,0);assert.equal(fingerprint(f.asset),original);
    assert.throws(()=>{const temporary=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset});try{temporary.setSpeed(Infinity);}finally{temporary.dispose();}},/倍率/);
  }finally{r?.dispose();f.dispose();}
});

test('track parts follow their exact course and road-wheel bands rotate, not just the whole asset',async()=>{
  const f=await fixture('tracked-mortar',{length:9,detail:'standard',exploded:.4},'track-variation');let r;try{
    r=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset});assert.equal(r.available,true,r.diagnostics().motionReason);const root=f.handle.object,shoe=root.getObjectByName('dot-motion-track-shoe'),band=root.getObjectByName('dot-motion-road-band');assert.equal(shoe.count,168);const index=shoe.userData.motionSourceNames.indexOf('track-shoe--1-0'),a=new THREE.Matrix4(),b=new THREE.Matrix4();shoe.getMatrixAt(index,a);band.getMatrixAt(0,b);r.seek(1);const moved=new THREE.Matrix4();shoe.getMatrixAt(index,moved);const frame=mortarTrackFrame(r.diagnostics().motionDistance/mortarTrackFrame(0,9).total,9);near(moved.elements[13],frame.y,1e-5);near(moved.elements[14],frame.z,1e-5);assert.notDeepEqual(moved.elements,a.elements);band.getMatrixAt(0,moved);assert.notDeepEqual(moved.elements,b.elements);assert.equal(r.diagnostics().motionParts.trackParts,336);assert.equal(r.diagnostics().motionParts.wheelParts,90);
    // At the bottom the track moves backward relative to a forward-moving body.
    const bottomIndex=shoe.userData.motionSourceNames.indexOf('track-shoe--1-50');r.seek(0);shoe.getMatrixAt(bottomIndex,a);r.seek(.01);shoe.getMatrixAt(bottomIndex,b);assert.ok(b.elements[14]<a.elements[14]);
  }finally{r?.dispose();f.dispose();}
});

test('rolling contact directions and Gustav decorative wheel geometry agree with translation',async()=>{
  for(const id of ['reference-armored-car','armored-4x4','gustav-visual-prop','diesel-locomotive']){
    const f=await fixture(id);let r;try{
      const model=f.handle.object.getObjectByName(modelName(id));const name=id==='reference-armored-car'?'wheel-left-front':id==='armored-4x4'?'Front right wheel':f.asset.metadata.visualOnly.wheelCenters[0].name;
      const wheel=model.getObjectByName(name),initial=wheel.quaternion.clone();r=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset});r.seek(.001);const delta=wheel.quaternion.clone().multiply(initial.invert()),axis=new THREE.Vector3(delta.x,delta.y,delta.z).normalize(),tangent=axis.cross(new THREE.Vector3(0,-1,0)),forward=id==='reference-armored-car'?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);assert.ok(tangent.dot(forward)<-.99,id+' wheel must cancel forward ground velocity');
      if(id==='gustav-visual-prop'){const c=f.asset.metadata.components.find(c=>c.sourceParts?.some(p=>p.name.startsWith('wheel-face-paint-'))),mesh=model.getObjectByName(c.name).children.find(n=>n.isMesh),before=mesh.geometry.attributes.position.array.slice();r.seek(1);assert.notDeepEqual(mesh.geometry.attributes.position.array,before);}
    }finally{r?.dispose();f.dispose();}
  }
});

test('different seeds and shape/detail parameters rebind without cached nodes',async()=>{
  const cases=[['reference-armored-car',{scale:1.25,detail:24,turretYaw:22}],['tracked-mortar',{length:12,detail:'high',exploded:.5}],['armored-4x4',{length:7,tireScale:1.1,steering:15,explode:.2}],['gustav-visual-prop',{silhouetteLength:.85,silhouetteWidth:1.15,wheelVisualScale:1.15,detail:'low'}],['diesel-locomotive',{bodyLength:.85,bodyWidth:1.15,wheelScale:1.15,detail:'low',showRails:false}]];
  for(const [id,params]of cases){const f=await fixture(id,params,'changed-shape-2026');let r;try{const before=transforms(f.handle.object);r=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset});assert.equal(r.available,true,id+': '+r.diagnostics().motionReason);r.play();for(let i=0;i<40;i++)r.update(.05);assert.ok(r.diagnostics().motionDistance>0);r.reset();r.dispose();unchanged(before);}finally{r?.dispose();f.dispose();}}
});

test('invalid binding provenance fails closed and leaves no replacement geometry',async()=>{
  for(const id of ['tracked-mortar','gustav-visual-prop','diesel-locomotive','reference-armored-car']){const f=await fixture(id);try{const before=transforms(f.handle.object);let asset=f.asset;
    if(id==='tracked-mortar')asset={...asset,metadata:{...asset.metadata,referenceReconstruction:{sourceGLBSha256:'different'}}};
    else if(id==='gustav-visual-prop'){asset=structuredClone(asset);const c=asset.metadata.components.find(c=>c.sourceParts?.some(p=>p.name.startsWith('wheel-face-paint-')));c.sourceParts[0].count+=1;}
    else if(id==='diesel-locomotive'){asset=structuredClone(asset);asset.metadata.visualOnly.wheelCenters[0].radius=NaN;}
    else{f.handle.object.getObjectByName('wheel-left-front').name='missing-wheel';}
    const r=createVehicleMotionAdapter({object:f.handle.object,asset});assert.equal(r.available,false);assert.equal(r.play('drive'),false);r.dispose();unchanged(before);assert.equal(f.handle.object.getObjectByName('dot-motion-running-gear'),undefined);
  }finally{f.dispose();}}
});

test('upload ticket invalidation preserves mounted motion until explicit host disposal',async()=>{
  const f=await fixture('tracked-mortar');try{const before=transforms(f.handle.object);
    assert.equal(createVehicleMotionAdapter({object:f.handle.object,asset:f.asset,valid:()=>false}).available,false);unchanged(before);
    for(let i=0;i<5;i++){let valid=true;const r=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset,valid:()=>valid});r.play();r.update(.1);valid=false;r.update(.1);assert.equal(r.available,true);near(r.diagnostics().motionTime,.2);r.pause();r.update(.5);near(r.diagnostics().motionTime,.2);r.reset();near(r.diagnostics().motionTime,0);assert.equal(r.play(),true);r.update(.1);assert.equal(r.diagnostics().disposed,false);r.dispose();r.dispose();assert.equal(r.play(),false);assert.equal(r.diagnostics().disposed,true);unchanged(before);}
    assert.equal(f.handle.object.getObjectByName('dot-motion-running-gear'),undefined);
  }finally{f.dispose();}
});

test('actual unified controller failed edits and cancel retain the last successful Three motion',async()=>{
  const f=await fixture('tracked-mortar');let controller,runtime,uploadValid,revision=0,jobs=0,hostDisposals=0;
  const before=transforms(f.handle.object),params=f.asset.metadata.recipe.params;
  try{
    const preview={cancelPending(){revision++;},clearAsset(){runtime?.dispose();runtime=null;},
      setAsset(asset,valid){const ticket=++revision;uploadValid=()=>ticket===revision&&valid();runtime=createVehicleMotionAdapter({object:f.handle.object,asset,valid:uploadValid});controller.frameRendered();},
      setActive(value){runtime?.setActive(value);},dispose(){hostDisposals++;runtime?.dispose();unchanged(before);f.handle.dispose();}};
    controller=createUnifiedController({preview,loadBackend:async()=>({adapter:{defaults:params,presets:[]}}),runJob:async()=>{if(jobs++)throw Error('replacement generation failed');return {result:{asset:f.asset,recipe:{params}},stats:{}};}});
    await controller.select('tracked-mortar');await controller.ready;const originalRuntime=runtime;assert.equal(runtime.available,true);assert.equal(uploadValid(),true);runtime.play();runtime.update(.1);
    const recipe={format:'PGF.ComponentRecipe',version:1,generator:'tracked-mortar',seed:'edit-failed',params:{...params,length:12}};
    controller.updateDraft(recipe,{automatic:false});assert.equal(uploadValid(),false);assert.equal(runtime,originalRuntime);runtime.update(.1);assert.equal(runtime.available,true);
    assert.equal(await controller.generate(recipe),false);assert.equal(controller.state().phase,'error');assert.equal(controller.currentAsset(),f.asset);assert.equal(runtime,originalRuntime);
    runtime.pause();runtime.reset();assert.equal(runtime.play(),true);runtime.update(.1);assert.ok(runtime.diagnostics().motionDistance>0);
    controller.cancel();assert.equal(controller.state().phase,'ready');assert.equal(runtime,originalRuntime);assert.equal(uploadValid(),false);runtime.pause();runtime.reset();assert.equal(runtime.play(),true);
    controller.setActive(false);const at=runtime.diagnostics().motionTime;runtime.update(2);near(runtime.diagnostics().motionTime,at);controller.setActive(true);runtime.update(.1);assert.ok(runtime.diagnostics().motionTime>at);
    controller.dispose();controller.dispose();assert.equal(hostDisposals,1);assert.equal(originalRuntime.diagnostics().disposed,true);assert.equal(originalRuntime.play(),false);
  }finally{controller?.dispose();runtime?.dispose();f.dispose();}
});

test('capabilities never grant self propulsion to N41, unbound K5 or any firing action',()=>{
  for(const id of [...VEHICLE_MOTION_IDS,'nebelwerfer41-visual-prop','k5-railway-prop']){const c=vehicleMotionCapabilities(id);assert.equal(c.fire,false);assert.equal(c.animatedGLB,false);assert.equal(c.drive,VEHICLE_MOTION_IDS.includes(id));}assert.equal(createVehicleMotionAdapter({assetId:'nebelwerfer41-visual-prop'}).available,false);
});

test('actual static GLB export stays byte-identical while each vehicle is moving',async()=>{
  const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
  for(const id of VEHICLE_MOTION_IDS){const f=await fixture(id,{},'static-export');let r;try{
    const exportBytes=()=>writeSceneGLB([{contentHash:'generated',asset:validateAsset(f.asset)}],[{id,assetContentHash:'generated',transform:identity,tags:[]}],{preserveSemantics:true});
    const before=exportBytes();r=createVehicleMotionAdapter({object:f.handle.object,asset:f.asset});assert.equal(r.available,true);r.play();r.update(1.25);const during=exportBytes();assert.deepEqual(during,before,id+' GLB changed during preview');const result=validateAsset(readGLB(during.buffer.slice(during.byteOffset,during.byteOffset+during.byteLength),id));assert.equal(result.generator.id,id);assert.ok(result.meshes.length);assert.equal(result.animations?.length??0,0);
  }finally{r?.dispose();f.dispose();}}
});
