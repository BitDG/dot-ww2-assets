// Literal Worker imports preserve Vite's real production bundling and original algorithms.
import referenceWorker from '../reference-armored-car/worker.js?worker&url';
import trackedWorker from '../tracked-mortar/worker.js?worker&url';
import gustavWorker from '../gustav-visual-prop/worker.js?worker&url';
import dieselWorker from '../diesel-locomotive/worker.js?worker&url';
import legacyWorker from '../armored-4x4/worker.js?worker&url';
import nebelwerferWorker from '../nebelwerfer41-visual-prop/worker.js?worker&url';
import qf25Worker from '../qf25-visual-prop/worker.js?worker&url';
import flakzwillingWorker from '../flakzwilling43-visual-prop/worker.js?worker&url';
import bm13Worker from '../bm13-us6-visual-prop/worker.js?worker&url';
import qf17Worker from '../qf17-visual-prop/worker.js?worker&url';
import landMattressWorker from '../land-mattress-visual-prop/worker.js?worker&url';
const backends={
  'land-mattress-visual-prop':{workerURL:landMattressWorker,load:()=>import('../land-mattress-visual-prop/definition.mjs')},
  'qf17-visual-prop':{workerURL:qf17Worker,load:()=>import('../qf17-visual-prop/definition.mjs')},
  'bm13-us6-visual-prop':{workerURL:bm13Worker,load:()=>import('../bm13-us6-visual-prop/definition.mjs')},
  'flakzwilling43-visual-prop':{workerURL:flakzwillingWorker,load:()=>import('../flakzwilling43-visual-prop/definition.mjs')},
  'qf25-visual-prop':{workerURL:qf25Worker,load:()=>import('../qf25-visual-prop/definition.mjs')},
  'nebelwerfer41-visual-prop':{workerURL:nebelwerferWorker,load:()=>import('../nebelwerfer41-visual-prop/definition.mjs')},
  'reference-armored-car':{workerURL:referenceWorker,load:()=>import('../reference-armored-car/definition.mjs')},
  'tracked-mortar':{workerURL:trackedWorker,load:()=>import('../tracked-mortar/definition.mjs')},
  'gustav-visual-prop':{workerURL:gustavWorker,load:()=>import('../gustav-visual-prop/definition.mjs')},
  'diesel-locomotive':{workerURL:dieselWorker,load:()=>import('../diesel-locomotive/definition.mjs')},
  'armored-4x4':{workerURL:legacyWorker,load:()=>import('../armored-4x4/definition.mjs')},
};
export async function loadBackend(model){const entry=backends[model.assetId];if(!entry)throw Error('模型尚未接入统一视图');return {...entry,adapter:(await entry.load()).default};}
export function runModelJob(backend,message,{signal,timeoutMs=120000}={}) {
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('操作已取消','AbortError'));return;}
    const worker=new Worker(backend.workerURL,{type:'module',name:'dot-model-'+(message.op??'generate')});
    let finished=false,timer;
    const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);};
    const abort=()=>finish(new DOMException('操作已取消','AbortError'));
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>data.ok?finish(null,data):finish(Error(data.error??'模型操作失败'));
    worker.onerror=event=>finish(Error(event.message));
    timer=setTimeout(()=>finish(Error('模型操作超时，请降低细节等级')),timeoutMs);
    try{worker.postMessage(message);}catch(error){finish(error);}
  });
}
