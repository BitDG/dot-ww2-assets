import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MODEL_CATALOG,requireRunnableModel,capabilitySummary} from '../catalog.mjs';
import {describeModel} from '../definition.mjs';
const baseline=JSON.parse(await readFile(new URL('../towed-pair-evidence/baseline-catalog.json',import.meta.url),'utf8'));
test('all ten pre-existing catalog identities, capabilities and backend records are preserved exactly',()=>{
 for(const old of baseline)assert.deepEqual(MODEL_CATALOG.find(m=>m.assetId===old.assetId),old);
});
for(const id of ['qf17-visual-prop','land-mattress-visual-prop'])test(id+': explicit static-only capability and frozen three-tier sources',async()=>{
 const model=requireRunnableModel(id),native=(await import('../../'+id+'/definition.mjs')).default;
 assert.equal(model.capabilities.animation,'none');assert.equal(model.animationVerification,'not-provided-static-only');
 assert.equal(model.source.animation.export,'static-glb-only');assert.equal(model.capabilities.procedural,false);
 assert.equal(model.capabilities.onlineRemodeling,false);assert.equal(model.capabilities.selfPropelled,false);
 assert.equal(native.capabilities.animation,false);assert.equal(native.capabilities.staticGLB,true);
 assert.equal(model.backend.moduleId,id);assert.notEqual(model.source.stage,'L0');
 assert.match(capabilitySummary({...model,verification:'node-verified-firefox-pending'}),/待 Firefox/);
 const d=await describeModel(id);assert.deepEqual(d.parameterSchema,native.parameterSchema);assert.deepEqual(d.defaults,native.defaults);
 const {SOURCES,SOURCE_URLS}=await import('../../'+id+'/sources.mjs');
 for(const tier of ['low','medium','high']){assert.match(SOURCES[tier].sha256,/^[a-f0-9]{64}$/);const bytes=await readFile(SOURCE_URLS[tier]);assert.equal(createHash('sha256').update(bytes).digest('hex'),SOURCES[tier].sha256);}
});
test('static-only model descriptions never imply a motion preview',async()=>{
 const src=await readFile(new URL('../workbench.js',import.meta.url),'utf8');
 assert.match(src,/model.capabilities.animation==='none'\?'本模型仅提供静态外观/);
});

const landBaseline=JSON.parse(await readFile(new URL('../towed-pair-evidence/land-baseline-catalog.json',import.meta.url),'utf8'));
test('Land addition preserves all eleven QF17-stage catalog entries exactly',()=>{for(const old of landBaseline)assert.deepEqual(MODEL_CATALOG.find(m=>m.assetId===old.assetId),old);});
