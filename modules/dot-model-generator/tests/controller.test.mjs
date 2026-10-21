import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedController} from '../controller.mjs';
const ids=['reference-armored-car','tracked-mortar','gustav-visual-prop','diesel-locomotive','armored-4x4','nebelwerfer41-visual-prop'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function harness(overrides={}){
 const calls={clear:0,disposed:0,loads:[],jobs:[],uploads:[],schemas:[],visible:null};let controller;
 const preview={clearAsset(){calls.clear++;calls.visible=null;},cancelPending(){},setActive(){},dispose(){calls.disposed++;calls.visible=null;},
  async setAsset(asset,valid){calls.uploads.push(asset);if(valid())calls.visible=asset;controller.frameRendered();},...overrides.preview};
 const loadBackend=async model=>{calls.loads.push(model.assetId);return {id:model.assetId,adapter:{defaults:{scale:1},presets:[]}};};
 const runJob=async(backend,message)=>{calls.jobs.push(message);return message.op==='export'?{bytes:new Uint8Array([1,2])}:result(backend.id,message.request);};
 controller=createUnifiedController({preview,loadBackend,runJob,onSchema:(...a)=>calls.schemas.push(a),delayMs:5,...overrides,preview});
 return {controller,calls,preview};
}
function result(id,request={params:{scale:1}}){return {result:{asset:{id,generator:{id},rootNodeIds:['root'],nodes:[],materials:[{id:'original-paint'}]},recipe:{params:request.params}},stats:{renderedTriangles:8}};}
const recipe=(id,scale)=>({format:'PGF.ComponentRecipe',version:1,generator:id,seed:'seed-'+id,params:{scale}});

test('six models use one preview and retain separate native recipe slots',async()=>{
 const {controller:c,calls}=harness();
 for(const [index,id]of ids.entries()){await c.select(id);await c.generate(recipe(id,index+1));assert.equal(c.state().exportable,true);}
 assert.equal(calls.clear,6);assert.equal(calls.disposed,0);assert.equal(calls.visible.id,ids.at(-1));
 for(const [index,id]of ids.entries())assert.equal(c.snapshot().models[id].params.scale,index+1);
 await c.select(ids[0]);assert.equal(c.currentRecipe().params.scale,1);assert.equal(c.currentAsset().materials[0].id,'original-paint');
 await c.ready;c.dispose();c.dispose();assert.equal(calls.disposed,1);
});

test('old generation cannot fill a source-only selection',async()=>{
 const pending=defer();const {controller:c,calls}=harness({runJob:()=>pending.promise});
 const first=c.select(ids[0]);await tick();await c.select('k5-railway-prop');pending.resolve(result(ids[0]));await first;
 assert.equal(c.state().phase,'source-only');assert.equal(c.state().exportable,false);assert.equal(c.currentAsset(),null);assert.equal(calls.uploads.length,0);assert.deepEqual(c.snapshot().models,{});c.dispose();
});

test('in-flight upload is invalidated on WIP switch and never committed',async()=>{
 const upload=defer();let visible=null;
 const {controller:c}=harness({preview:{clearAsset(){visible=null;},async setAsset(asset,valid){await upload.promise;if(!valid())throw new DOMException('stale','AbortError');visible=asset;}}});
 const first=c.select(ids[0]);await tick();await c.select('k5-railway-prop');upload.resolve();await first;
 assert.equal(visible,null);assert.equal(c.currentAsset(),null);assert.deepEqual(c.snapshot().models,{});c.dispose();
});

test('rapid switches discard late definition loads without mixing schemas',async()=>{
 const old=defer();const {controller:c,calls}=harness({loadBackend:model=>model.assetId===ids[0]?old.promise:Promise.resolve({id:model.assetId,adapter:{defaults:{own:22}}})});
 const first=c.select(ids[0]);await tick();await c.select(ids[1]);old.resolve({id:ids[0],adapter:{defaults:{foreign:9}}});await first;
 assert.equal(c.model().assetId,ids[1]);assert.deepEqual(c.currentRecipe().params,{own:22});assert.equal(calls.schemas.filter(x=>x[0]).length,1);c.dispose();
});

test('invalid draft and cancellation preserve only the last completed recipe',async()=>{
 const {controller:c}=harness();await c.select(ids[0]);c.updateDraft(recipe(ids[0],NaN));
 assert.equal(c.state().phase,'error');assert.equal(c.state().exportable,false);assert.equal(c.snapshot().models[ids[0]].params.scale,1);
 c.cancel();assert.equal(c.state().exportable,true);assert.equal(c.currentRecipe().params.scale,1);c.dispose();
});

test('edit invalidates old work immediately, before debounce and schema validation',async()=>{
 const pending=defer();let jobs=0;const {controller:c}=harness({runJob:(b,m)=>++jobs===1?Promise.resolve(result(b.id,m.request)):pending.promise});
 await c.select(ids[0]);const older=c.generate(recipe(ids[0],2));c.updateDraft(recipe(ids[0],3),{automatic:false});pending.resolve(result(ids[0],{params:{scale:2}}));await older;
 assert.equal(c.state().phase,'editing');assert.equal(c.snapshot().models[ids[0]].params.scale,1);assert.equal(c.state().exportable,false);c.dispose();
});

test('late export after switching never returns the previous model download',async()=>{
 const pending=defer();const {controller:c}=harness({runJob:(b,m)=>m.op==='export'?pending.promise:Promise.resolve(result(b.id,m.request))});
 await c.select(ids[0]);const download=c.exportAsset();await c.select(ids[1]);pending.resolve({bytes:new Uint8Array([7])});assert.equal(await download,null);c.dispose();
});

test('visibility pause cancels pending work and resumes the same draft',async()=>{
 const pending=defer();let count=0;const {controller:c}=harness({runJob:(b,m)=>++count===1?pending.promise:Promise.resolve(result(b.id,m.request))});
 const first=c.select(ids[0]);await tick();c.setActive(false);pending.resolve(result(ids[0]));await first;assert.equal(c.state().phase,'paused');assert.equal(c.currentAsset(),null);
 c.setActive(true);await tick();assert.equal(c.state().phase,'ready');assert.equal(count,2);c.dispose();
});

test('cancel during asynchronous definition loading prevents automatic restart',async()=>{
 const pending=defer();const {controller:c,calls}=harness({loadBackend:()=>pending.promise});
 const first=c.select(ids[0]);await tick();c.cancel();pending.resolve({id:ids[0],adapter:{defaults:{}}});await first;assert.equal(calls.jobs.length,0);c.dispose();
});

test('workspace import rejects cross-model recipes before touching selection',async()=>{
 const {controller:c}=harness();await c.select(ids[0]);const state=c.snapshot();state.models[ids[1]]=recipe(ids[0],2);
 await assert.rejects(c.restore(state),/不匹配/);assert.equal(c.model().assetId,ids[0]);c.dispose();
});

test('initial failure rejects readiness, later selection still recovers',async()=>{
 let fail=true;const {controller:c}=harness({loadBackend:async model=>{if(fail)throw Error('load failed');return {id:model.assetId,adapter:{defaults:{scale:1}}};}});
 await c.select(ids[0]);await assert.rejects(c.ready,/load failed/);fail=false;await c.select(ids[1]);assert.equal(c.state().phase,'ready');c.dispose();
});
