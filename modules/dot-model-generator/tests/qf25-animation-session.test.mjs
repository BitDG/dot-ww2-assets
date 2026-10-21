import test from 'node:test';
import assert from 'node:assert/strict';
import {createQf25AnimationSession} from '../qf25-animation-session.mjs';
function fixture(){let mode='tow',playing=false,active=true,time=0,disposed=0,fire=true;const calls=[];
 const runtime={available:true,get playing(){return active&&playing;},diagnostics:()=>({mode,playing:active&&playing,time,capabilities:{tow:true,fire}}),
  play(name){calls.push(['play',name]);mode=name;playing=true;return true;},pause(){playing=false;},reset(){time=0;playing=false;},seek(t){if(!Number.isFinite(t)||t<0)throw Error('time');time=t;},setActive(v){active=v;},update(t){calls.push(['update',t]);if(active&&playing)time+=t;},bounds:()=>({scope:'presentation'}),dispose(){disposed++;runtime.available=false;playing=false;}};
 const api=createQf25AnimationSession({runtime,modelBounds:()=>({scope:'model'}),onDispose:()=>calls.push(['dispose-report'])});
 return {api,runtime,calls,disableFire:()=>{fire=false;},disposed:()=>disposed};}

test('QF25 bridge maps drive to tow and advances a single mutually exclusive runtime once',()=>{const {api,calls}=fixture();assert.equal(api.play('drive'),true);assert.deepEqual(calls[0],['play','tow']);api.setSpeed(2);api.update(.25);assert.deepEqual(calls[1],['update',.5]);assert.equal(api.state().motionPlaying,true);api.play('fire');assert.equal(api.state().motionPlaying,false);assert.equal(api.state().firePlaying,true);api.update(.5);assert.equal(calls.filter(x=>x[0]==='update').length,2);assert.equal(api.play('tow'),false);api.dispose();});
test('QF25 bridge preserves host pause, inactive, reset, seek and disposal behavior',()=>{const f=fixture(),{api}=f;api.play();api.pause();api.update(1);assert.equal(api.diagnostics().animation.qf25.time,0);api.play();api.setActive(false);assert.equal(api.play('fire'),false);const n=f.calls.length;api.update(5);assert.equal(f.calls.length,n);api.setActive(true);api.seek(2);assert.equal(api.diagnostics().animation.qf25.time,2);api.reset();assert.equal(api.playing,false);api.dispose();api.dispose();assert.equal(f.disposed(),1);assert.equal(api.state().disposed,true);assert.equal(api.play(),false);assert.equal(api.available,false);});
test('QF25 bridge exposes dynamic fire gating and independently switches framing',()=>{const f=fixture(),{api}=f;assert.equal(api.state().fireAvailable,true);f.disableFire();assert.equal(api.state().fireAvailable,false);assert.deepEqual(api.bounds(),{scope:'model'});api.setFraming('presentation');assert.deepEqual(api.bounds(),{scope:'presentation'});assert.throws(()=>api.setFraming('invalid'));assert.throws(()=>api.setSpeed(NaN));assert.throws(()=>api.setSpeed(0));assert.throws(()=>api.update(-1));assert.throws(()=>api.seek(Infinity));api.dispose();});

test('QF25 unified factory binds the real runtime without allocating an extra clock or disposing borrowed resources',async()=>{
 const THREE=await import('three');const {createModelAnimationRuntime,animationCapabilities}=await import('../animation-runtime.js');
 const scene=new THREE.Scene(),object=new THREE.Group(),body=new THREE.Group(),assembly=new THREE.Group();body.name='QF25_ROOT';assembly.name='QF25_Wheel_Assembly';scene.add(object);object.add(body);body.add(assembly);
 for(const name of ['QF25_Wheel_Left_Pivot','QF25_Wheel_Right_Pivot']){const n=new THREE.Group();n.name=name;assembly.add(n);}
 for(const name of ['QF25_Cosmetic_Muzzle_Anchor','QF25_Shallow_Sealed_Front']){const n=new THREE.Group();n.name=name;body.add(n);}
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());body.add(mesh);let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);
 const asset={generator:{id:'qf25-visual-prop'},metadata:{showCover:false}},before=JSON.stringify(asset);let emitted=0;
 const effectsFactory=()=>({setPreview(){},setSeed(){},emit(){emitted++;},update(){},clear(){},dispose(){},snapshot:()=>({emitted})});
 const r=createModelAnimationRuntime({scene,object,asset,effectsFactory,invalidate(){}});
 assert.equal(animationCapabilities('qf25-visual-prop').motionLabel,'牵引滚动展示');assert.equal(r.state().fireAvailable,true);
 r.play('drive');r.update(2);assert.equal(body.position.z,.7);assert.ok(assembly.children.every(n=>n.rotation.x>0));
 r.play('fire');assert.equal(body.position.z,0);r.update(.25);assert.equal(emitted,1);assert.equal(r.state().motionPlaying,false);assert.equal(r.state().firePlaying,true);assert.equal(JSON.stringify(asset),before);
 r.reset();assert.equal(scene.children.length,2);r.dispose();assert.equal(scene.children.length,1);assert.equal(disposed,0);assert.equal(r.state().disposed,true);
 mesh.geometry.dispose();mesh.material.dispose();
});

test('Flakzwilling uses the same single lease controls for display/smoke without drive capability',async()=>{
 const THREE=await import('three'),{createModelAnimationRuntime,animationCapabilities}=await import('../animation-runtime.js'),{FZ43_NODES:names}=await import('../../flakzwilling43-visual-runtime/binding.mjs');
 const scene=new THREE.Scene(),object=new THREE.Group(),body=new THREE.Group(),base=new THREE.Group();body.name=names.body;base.name=names.base;scene.add(object);object.add(body);body.add(base);const moving=names.moving.map(name=>{const n=new THREE.Group();n.name=name;body.add(n);return n;});
 names.anchors.forEach((name,i)=>{const n=new THREE.Group();n.name=name;moving[i+2].add(n);});names.faces.forEach((name,i)=>{const n=new THREE.Group();n.name=name;moving[i+2].add(n);});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());base.add(mesh);let disposed=0,emitted=0;mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);
 const caps=animationCapabilities('flakzwilling43-visual-prop');assert.equal(caps.drive,false);assert.equal(caps.motion,true);assert.equal(caps.fireLabel,'艺术烟云');
 const effectsFactory=()=>({setPreview(){},setSeed(){},emit(){emitted++;},update(){},clear(){},dispose(){},snapshot:()=>({emitted})});
 const r=createModelAnimationRuntime({scene,object,asset:{generator:{id:'flakzwilling43-visual-prop'}},effectsFactory,invalidate(){}});
 assert.equal(r.state().motionAvailable,true);r.play('drive');r.update(2.5);assert.ok(moving.every(n=>n.quaternion.angleTo(new THREE.Quaternion())>.2));assert.equal(base.quaternion.angleTo(new THREE.Quaternion()),0);assert.equal(r.diagnostics().animation.flakzwilling.mode,'display');
 r.play('fire');r.update(.25);assert.equal(emitted,2);assert.equal(r.diagnostics().animation.flakzwilling.mode,'smoke');assert.equal(r.state().motionPlaying,false);r.dispose();assert.ok(moving.every(n=>n.quaternion.angleTo(new THREE.Quaternion())===0));assert.equal(disposed,0);assert.equal(scene.children.length,1);mesh.geometry.dispose();mesh.material.dispose();
});
