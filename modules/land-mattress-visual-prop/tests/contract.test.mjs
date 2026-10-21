import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import adapter from '../definition.mjs';
import {ART_CONTRACT,PARTS,defaults,normalizeParams,validateSeed} from '../params.mjs';
import {createResourceOwner} from '../model.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';

test('one schema, eight exterior groups and explicitly static 1945 art contract',()=>{
 const prepared=prepareGenerator(adapter);assert(prepared);
 assert.equal(Object.keys(PARTS).length,8);assert.equal(ART_CONTRACT.rows,5);assert.equal(ART_CONTRACT.columns,6);assert.equal(ART_CONTRACT.mouthCount,30);assert.equal(ART_CONTRACT.roadWheels,2);
 assert.equal(adapter.capabilities.animation,false);assert.equal(adapter.capabilities.procedural,false);assert.equal(adapter.capabilities.onlineRemodeling,false);
 assert.deepEqual(normalizeParams({}),defaults);
});
test('cosmetic controls keep rows, operation and geometry internals out of schema',()=>{
 for(const key of ['tubeCount','rows','columns','caliber','firingRate','elevation','ammunition','barrelLength'])assert.throws(()=>normalizeParams({[key]:1}),/Unknown/);
 for(const bad of [null,[],{paintColor:['#ffffff']},{showWheels:'false'},{roughness:NaN},{artScale:0},{detail:'ultra'},{weathering:2}])assert.throws(()=>normalizeParams(bad));
 const hidden=Object.fromEntries(Object.keys(PARTS).map(k=>[k,false]));assert.throws(()=>normalizeParams(hidden),/at least one/);
 for(const k of Object.keys(PARTS))assert.equal(normalizeParams({...hidden,[k]:true})[k],true);
});
test('deterministic printable seed and all explicit bounded values',()=>{
 assert.equal(validateSeed('land-mattress-no8-mk1-art-1945'),'land-mattress-no8-mk1-art-1945');
 for(const seed of ['',null,[],123,'a\nb','x'.repeat(129)])assert.throws(()=>validateSeed(seed));
 for(const artScale of [.65,1.5])for(const roughness of [.35,1])for(const weathering of [0,1])assert(normalizeParams({artScale,roughness,weathering}));
});
test('resource ownership isolates each instance and releases once, including late captures',()=>{
 const a=createResourceOwner(),b=createResourceOwner(),g=new THREE.BoxGeometry(),m=new THREE.MeshStandardMaterial(),t=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 let gd=0,md=0,td=0;g.addEventListener('dispose',()=>gd++);m.addEventListener('dispose',()=>md++);t.addEventListener('dispose',()=>td++);m.map=t;a.capture(new THREE.Mesh(g,m));
 assert.equal(b.diagnostics().owned,0);a.dispose();a.dispose();assert.deepEqual([gd,md,td],[1,1,1]);assert.equal(a.diagnostics().owned,a.diagnostics().disposed);
 const late=new THREE.BufferGeometry();let count=0;late.addEventListener('dispose',()=>count++);a.capture(late);assert.equal(count,1);a.dispose();assert.equal(count,1);
});
