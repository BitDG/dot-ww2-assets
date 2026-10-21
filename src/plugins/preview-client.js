import {createWorkerRPC} from '../runtime/worker-rpc.js';
import {bindOffscreenInput} from '../runtime/offscreen-input.js';

export function createWorkerPreview(container,onFrame=()=>{}){
 const canvas=document.createElement('canvas');canvas.className='plugin-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','插件资产三维预览');container.prepend(canvas);
 let dead=false,active=true,revision=0,stats={frames:0,geometries:0,textures:0};
 const worker=new Worker(new URL('./preview.worker.js',import.meta.url),{type:'module',name:'pgf-asset-preview'});
 const rpc=createWorkerRPC(worker,{onEvent:message=>{if(message.type==='frame'){stats=message.diagnostics;onFrame();}if(message.type==='error')console.error(message.message);}});
 const size=()=>({width:Math.max(1,container.clientWidth),height:Math.max(1,container.clientHeight),dpr:devicePixelRatio});
 const offscreen=canvas.transferControlToOffscreen(),ready=rpc.call('init',[offscreen,size()],[offscreen]);ready.catch(()=>{});
 const releaseInput=bindOffscreenInput(canvas,(method,args)=>rpc.notify(method,args));
 const observer=new ResizeObserver(()=>{if(container.clientWidth&&container.clientHeight)rpc.notify('resize',[size()]);});observer.observe(container);
 const abort=new AbortController();
 const updateActive=()=>rpc.notify('active',[active&&!document.hidden]);document.addEventListener('visibilitychange',updateActive,{signal:abort.signal});
 return {
  renderer:{domElement:canvas},
  frame(){rpc.notify('frame');},
  cancelPending(){if(!dead)rpc.notify('invalidate',[++revision]);},
  async clearAsset(){if(dead)return;const ticket=++revision;rpc.notify('invalidate',[ticket]);await ready;if(dead||ticket!==revision)return;const result=await rpc.call('clearAsset',[ticket]);if(!dead&&ticket===revision)stats=result;},
  async setAsset(asset,valid=()=>true){const ticket=++revision;await ready;if(dead||ticket!==revision||!valid())throw new DOMException('已取消','AbortError');stats=await rpc.call('setAsset',[asset,ticket]);if(dead||ticket!==revision||!valid())throw new DOMException('已取消','AbortError');},
  inspect:()=>rpc.call('inspect'),
  setTransforms(updates,followId){if(!dead)rpc.notify('transforms',[updates,followId]);},
  selectNode(id){if(!dead)rpc.notify('selection',[id]);},
  setActive(value){active=!!value;updateActive();},
  diagnostics:()=>({...stats,active,disposed:dead,pending:dead?false:stats.pending,contextLost:dead?null:stats.contextLost,renderWorker:!dead,workerTerminated:dead,renderRPC:rpc.pending}),
  dispose(){if(dead)return;dead=true;active=false;revision++;abort.abort();observer.disconnect();releaseInput();rpc.dispose();canvas.remove();},
 };
}
