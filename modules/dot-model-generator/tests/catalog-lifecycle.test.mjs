import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_CATALOG,canMount} from '../catalog.mjs';
import {createUnifiedController} from '../controller.mjs';

// Exercises the host contract for every runnable catalog entry. These deliberately
// mocked jobs do not constitute geometry, browser, material or export validation.
const ids=MODEL_CATALOG.filter(canMount).map(model=>model.assetId);
const recipe=(id,value)=>({format:'PGF.ComponentRecipe',version:1,generator:id,seed:'catalog-lifecycle-seed',params:{value}});
const result=(id,request)=>({result:{asset:{id,generator:{id},rootNodeIds:['root'],nodes:[],materials:[]},recipe:{params:request.params}},stats:{}});
function setup(){
 let c,visible=null,disposed=0,pending=null;
 const preview={clearAsset(){visible=null;},cancelPending(){},setActive(){},dispose(){disposed++;visible=null;},async setAsset(asset,valid){if(valid()){visible=asset;c.frameRendered();}}};
 c=createUnifiedController({preview,delayMs:0,loadBackend:async model=>({id:model.assetId,adapter:{defaults:{value:1}}}),runJob:async(b,m)=>{
   if(pending)return pending(b,m);
   return m.op==='export'?{bytes:new TextEncoder().encode(b.id)}:result(b.id,m.request);
 }});
 return {c,get visible(){return visible;},get disposed(){return disposed;},hold(fn){pending=fn;}};
}

test('all runnable catalog models preserve isolated recipes across repeated switching',async()=>{
 const h=setup(),{c}=h;
 for(let round=0;round<3;round++)for(const [i,id]of ids.entries()){
   assert.equal(await c.select(id),true);
   if(round===0)assert.equal(await c.generate(recipe(id,i+2)),true);
   assert.equal(c.currentRecipe().params.value,i+2);
   assert.equal(c.currentAsset().generator.id,id);
   assert.equal(h.visible.id,id);
   assert.equal(c.state().exportable,true);
   assert.equal(new TextDecoder().decode((await c.exportAsset()).bytes),id);
 }
 assert.equal(Object.keys(c.snapshot().models).length,ids.length);
 for(const [i,id]of ids.entries())assert.equal(c.snapshot().models[id].params.value,i+2);
 c.dispose();c.dispose();assert.equal(h.disposed,1);assert.equal(h.visible,null);
});

for(const id of ids)test(`${id}: canceled replacement retains successful asset and discards stale completion`,async()=>{
 const h=setup(),{c}=h;await c.select(id);const original=c.currentAsset(),originalVisible=h.visible;let release;
 h.hold((b,m)=>new Promise(resolve=>{release=()=>resolve(result(b.id,m.request));}));
 const replacement=c.generate(recipe(id,42));
 c.cancel();assert.equal(c.currentAsset(),original);assert.equal(h.visible,originalVisible);
 assert.equal(c.currentRecipe().params.value,1);assert.equal(c.state().exportable,true);
 release();await replacement;assert.equal(c.currentAsset(),original);assert.equal(c.snapshot().models[id].params.value,1);
 c.dispose();assert.equal(h.disposed,1);assert.equal(c.diagnostics().worker,false);assert.equal(c.diagnostics().exportWorker,false);
});
