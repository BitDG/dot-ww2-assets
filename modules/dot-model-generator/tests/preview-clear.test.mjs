import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const workerSource=(await readFile(new URL('../../../src/plugins/preview.worker.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const mainSource=(await readFile(new URL('../../../src/plugins/preview.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').split('export async function exportPluginGLB')[0].replace('export function createPluginPreview','function createPluginPreview');
function workerHarness(){
 const calls={disposed:0,selectionDisposed:0,frames:0,messages:[]};let fulfill;
 const context=vm.createContext({console,DOMException,Map,Promise,self:{},postMessage:m=>calls.messages.push(m),requestAnimationFrame:()=>++calls.frames,cancelAnimationFrame(){},
  createAssetHandle:()=>new Promise(r=>fulfill=r),THREE:{}});
 vm.runInContext(workerSource,context);
 vm.runInContext(`renderer={getContext:()=>({isContextLost:()=>false}),info:{memory:{geometries:2,textures:1}}};scene={remove(){}};`,context);
 context.disposed=()=>calls.disposed++;context.selectionDisposed=()=>calls.selectionDisposed++;
 const run=code=>vm.runInContext(code,context);
 return {calls,context,run,resolve:()=>fulfill({dispose:context.disposed})};
}
test('render Worker clear is idempotent, releases asset and selection, retains renderer',async()=>{
 const h=workerHarness();h.run(`desired=4;handle={dispose:disposed};selection={geometry:{dispose:selectionDisposed},material:{dispose:selectionDisposed}};nodeObjects.set('old',{});clipSphere={};fitted=8;`);
 await h.run(`command('clearAsset',[4])`);await h.run(`command('clearAsset',[4])`);
 assert.equal(h.calls.disposed,1);assert.equal(h.calls.selectionDisposed,2);assert.equal(h.run('handle'),null);assert.equal(h.run('nodeObjects.size'),0);assert.equal(h.run('fitted'),0);assert.ok(h.run('renderer'));assert.equal(h.run('dead'),false);
});
test('render Worker cancels an already-uploading old asset before queued clear executes',async()=>{
 const h=workerHarness();h.run(`self.onmessage({data:{id:1,method:'setAsset',args:[{},1]}})`);await Promise.resolve();
 h.run(`self.onmessage({data:{id:2,method:'clearAsset',args:[2]}})`);h.resolve();await h.run('queue');
 assert.equal(h.calls.disposed,1);assert.equal(h.run('handle'),null);assert.equal(h.calls.messages.find(m=>m.id===1).error.name,'AbortError');assert.ok(h.calls.messages.find(m=>m.id===2).result);
});
test('stale queued clear does not erase the newer revision',async()=>{
 const h=workerHarness();h.run('desired=9;handle={dispose:disposed}');await h.run(`command('clearAsset',[8])`);assert.equal(h.calls.disposed,0);assert.ok(h.run('handle'));
});
function mainHarness(){
 const calls={disposed:0,contextLoss:0,renders:0,cancel:0,listeners:new Map()};let resolveUpload;
 const vector=()=>({set(){return this;},copy(){return this;},clone(){return this;},sub(){return this;},normalize(){return this;}});
 class Renderer{constructor(){this.domElement={setAttribute(){},remove(){}};this.info={memory:{},render:{}};}setClearColor(){}dispose(){calls.disposed++;}forceContextLoss(){calls.contextLoss++;}getContext(){return {isContextLost:()=>!!calls.contextLoss};}}
 class Camera{constructor(){this.position=vector();}updateProjectionMatrix(){}}
 class Controls{constructor(){this.target=vector();}update(){}addEventListener(){}dispose(){}}
 class Scene{add(){}remove(){}}
 const THREE={WebGLRenderer:Renderer,PerspectiveCamera:Camera,Scene,HemisphereLight:class{},DirectionalLight:class{constructor(){this.position=vector();}}};
 const loop={invalidate(){},setActive(){},dispose(){},stats:{}};
 const context=vm.createContext({console,DOMException,Map,document:{addEventListener:(type,fn)=>calls.listeners.set(type,fn),removeEventListener:(type,fn)=>{if(calls.listeners.get(type)===fn)calls.listeners.delete(type);}},HTMLCanvasElement:{prototype:{}},THREE,OrbitControls:Controls,ResizeObserver:class{observe(){}disconnect(){}},createRenderLoop:()=>loop,
 createAssetHandle:()=>new Promise(r=>resolveUpload=r),createWorkerPreview(){throw Error('unexpected worker');}});
 vm.runInContext(mainSource,context);context.container={clientWidth:0,clientHeight:0,prepend(){}};
 const preview=vm.runInContext('createPluginPreview(container)',context);
 return {preview,calls,resolve:()=>resolveUpload({dispose(){calls.cancel++;},animations:[]})};
}
test('main-thread clear invalidates delayed upload and does not destroy the renderer',async()=>{
 const h=mainHarness();const upload=h.preview.setAsset({},()=>true);h.preview.clearAsset();h.preview.clearAsset();h.resolve();await assert.rejects(upload,{name:'AbortError'});
 assert.equal(h.calls.cancel,1);assert.equal(h.calls.disposed,0);assert.equal(h.calls.contextLoss,0);assert.equal(h.preview.object,undefined);
 h.preview.dispose();h.preview.dispose();assert.equal(h.calls.disposed,1);assert.equal(h.calls.contextLoss,1);assert.equal(h.calls.listeners.size,0);
});
test('main-thread cancelPending invalidates only the upload, keeping disposal explicit',async()=>{
 const h=mainHarness();const upload=h.preview.setAsset({},()=>true);h.preview.cancelPending();h.resolve();await assert.rejects(upload,{name:'AbortError'});assert.equal(h.calls.disposed,0);h.preview.dispose();
});
