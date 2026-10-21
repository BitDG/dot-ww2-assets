import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {readGLB} from '../../../src/plugins/scatter/io.js';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';

test('actual module Worker generates parameterized kit and exports the identical AssetIR',async()=>{
 const worker=new Worker(new URL('./worker-harness.mjs',import.meta.url),{type:'module'});
 try{
  const [ready]=await once(worker,'message');assert.equal(ready.ready,true);
  const resultPromise=once(worker,'message');worker.postMessage({op:'generate',request:{seed:'worker-kit',params:{turretYaw:28,gunElevation:13,detail:24,markings:false,antennas:false,paint:'#756249'},input:{}}});const [message]=await resultPromise;assert.equal(message.ok,true,message.error);const asset=message.result.asset;assert.equal(asset.sockets.length,7);assert.equal(message.result.recipe.params.turretYaw,28);assert.ok(!asset.nodes.some(n=>n.name==='markings'||n.name==='hull-markings'||n.name==='antennas'));
  const exportPromise=once(worker,'message');worker.postMessage({op:'export',asset});const [exported]=await exportPromise;assert.equal(exported.ok,true,exported.error);assert.ok(exported.bytes.length>10000);const roundtrip=readGLB(exported.bytes.buffer,'worker-export');assert.equal(assetStatistics(roundtrip).renderedTriangles,assetStatistics(asset).renderedTriangles);assert.equal(roundtrip.textures.length,6);assert.equal(roundtrip.sockets.length,7);
  const badPromise=once(worker,'message');worker.postMessage({op:'generate',request:{seed:'invalid',params:{detail:999},input:{}}});const [bad]=await badPromise;assert.equal(bad.ok,false);assert.ok(bad.error);
 }finally{await worker.terminate();}
});
