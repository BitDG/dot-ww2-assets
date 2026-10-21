import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {buildTurretSurfacePixels} from '../../tank/upstream/src/turret-surface-materials.mjs';
import {createPortableArmorMaps,buildPortableArmorPixels,applyPortableCamouflage,PORTABLE_FINISH_SCHEMA,PORTABLE_FINISH_ENUM_LABELS,finishFromParams,portableSeed,PATTERNS} from '../../tank/src/portable-vehicle-finish.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(){const root=new THREE.Group(),materials={};for(const role of ['armorPaint','rubber','canvas','bareSteel','glass','marking']){const m=new THREE.MeshStandardMaterial({color:'#827456',roughness:.81,metalness:.12});m.userData.appearanceRole=role;m.name=role;materials[role]=m;root.add(new THREE.Mesh(new THREE.BoxGeometry(),m));}return {root,materials};}
function dispose(root){const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const v of Object.values(o.material))if(v?.isTexture&&!seen.has(v)){seen.add(v);v.dispose();}o.material.dispose();});}
test('shared tank surface reuses exact upstream pixels and schemas',()=>{
 assert.equal(Object.keys(PATTERNS).length,45);assert.equal(PORTABLE_FINISH_SCHEMA.camoPattern.enum.length,47);assert.equal(PORTABLE_FINISH_SCHEMA.camoPattern.enumNames,undefined);assert.equal(PORTABLE_FINISH_ENUM_LABELS.camoPattern.length,47);
 assert.deepEqual(finishFromParams({}),{pattern:'original',environment:'desert',scale:1});for(const bad of [{camoPattern:'missing'},{camoScale:0},{camoEnvironment:'sea'}])assert.throws(()=>finishFromParams(bad));
 const seed='same-source',raw=buildTurretSurfacePixels({resolution:64,weathering:.35,seed:portableSeed(seed)}),p=buildPortableArmorPixels({seed,weathering:.35,resolution:64});for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,j=((63-y)*64+x)*4;assert.equal(p.albedo[i],raw.baseColor[j]);assert.equal(p.normal[i],raw.normal[j]);assert.equal(p.orm[i+1],raw.roughness[j]);assert.equal(p.orm[i+2],255);}assert.notEqual(hash(p.albedo),hash(buildPortableArmorPixels({seed:'other',weathering:.35,resolution:64}).albedo));
});
test('all 45 existing painters execute without touching non-paint roles or leaking Canvas globals',async()=>{
 const before=Object.fromEntries(['document','Path2D','DOMMatrix'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));const hashes={};
 for(const pattern of Object.keys(PATTERNS)){const {root,materials}=fixture();try{await applyPortableCamouflage(root,{seed:'tank-fixture',weathering:.35,paint:'#827456',finish:{pattern,environment:'desert',scale:1.25},resolution:64});const armor=materials.armorPaint;assert.ok(armor.map);assert.equal(armor.color.getHexString(),'ffffff');for(const role of ['rubber','canvas','bareSteel','glass','marking']){assert.equal(materials[role].map,null);assert.equal(materials[role].color.getHexString(),'827456');}hashes[pattern]=hash(armor.map.image.data);assert.equal(root.userData.camouflage.pattern,pattern);}finally{dispose(root);}for(const k of Object.keys(before))assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,k),before[k],k);}
 assert.ok(new Set(Object.values(hashes)).size>40);await fs.writeFile(new URL('../evidence/tank-pattern-coverage.json',import.meta.url),JSON.stringify({status:'PASS',source:'Existing bakePgfCamo painter',resolution:64,patterns:hashes,nonPaintRolesPreserved:true,globalsRestored:true},null,2)+'\n');
});
test('representative full-resolution finishes equal existing tank headless output',async()=>{
 const {applyHeadlessArmorSurface}=await import('../../tank/src/headless-materials.mjs');
 for(const finish of [{pattern:'original',environment:'desert',scale:1},{pattern:'desert',environment:'desert',scale:1.2},{pattern:'digital',environment:'urban',scale:.5},{pattern:'claude',environment:'jungle',scale:2}]){
  const a=fixture(),b=fixture(),maps=createPortableArmorMaps({seed:'same-runtime',weathering:.35});Object.assign(a.materials.armorPaint,{map:maps.albedo,normalMap:maps.normal,roughnessMap:maps.orm,metalnessMap:maps.orm});
  try{await applyPortableCamouflage(a.root,{seed:'same-runtime',weathering:.35,paint:'#827456',finish});applyHeadlessArmorSurface({object:b.root,recipe:{seed:portableSeed('same-runtime'),design:{appearance:{weathering:.35,color:'#827456'}},finish}});for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(hash(a.materials.armorPaint[key].image.data),hash(b.materials.armorPaint[key].image.data),finish.pattern+' '+key);assert.ok(a.materials.armorPaint.color.equals(b.materials.armorPaint.color));}finally{dispose(a.root);dispose(b.root);}
 }
});
