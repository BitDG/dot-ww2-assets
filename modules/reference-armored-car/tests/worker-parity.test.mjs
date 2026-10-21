import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import definition from '../definition.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {writeSceneGLB} from '../../../src/plugins/scatter/io.js';
const digest=x=>createHash('sha256').update(x).digest('hex');
test('real Worker transport preserves exact Node GLB bytes for tank original and desert',async()=>{
 const worker=new Worker(new URL('./worker-harness.mjs',import.meta.url),{type:'module'}),prepared=prepareGenerator(definition),records=[];
 try{await once(worker,'message');for(const params of [{detail:24},{detail:24,camoPattern:'desert',camoScale:1.2}]){
  const request={seed:'transport-parity',params,input:{}},node=await prepared.generate(request),identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},expected=writeSceneGLB([{contentHash:'generated',asset:node.asset}],[{id:node.asset.id,assetContentHash:'generated',transform:identity,tags:[]}],{preserveSemantics:true});
  let pending=once(worker,'message');worker.postMessage({op:'generate',request});const [generated]=await pending;assert.equal(generated.ok,true,generated.error);pending=once(worker,'message');worker.postMessage({op:'export',asset:generated.result.asset});const [exported]=await pending;assert.equal(exported.ok,true,exported.error);assert.equal(digest(exported.bytes),digest(expected));records.push({params,bytes:expected.length,sha256:digest(expected)});
 }}finally{await worker.terminate();}
 await fs.writeFile(new URL('../evidence/worker-byte-parity.json',import.meta.url),JSON.stringify({status:'PASS',host:'Pinned Three 0.180.0 + shared actual module worker_threads transport',records},null,2)+'\n');
});
