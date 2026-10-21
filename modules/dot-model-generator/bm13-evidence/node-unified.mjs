import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import adapter,{describeModel} from '../definition.mjs';
import native from '../../bm13-us6-visual-prop/definition.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {writeSceneGLB,readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
const ID='bm13-us6-visual-prop',seed='bm13-unified-acceptance',prepared=prepareGenerator(adapter),direct=prepareGenerator(native);
const sha=b=>createHash('sha256').update(b).digest('hex');
const exportGLB=asset=>writeSceneGLB([{contentHash:'bm13',asset}],[{id:asset.id,assetContentHash:'bm13',transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},tags:[]}],{preserveSemantics:true});
const report={status:'running',checks:[],exports:{}};
const description=await describeModel(ID);assert.deepEqual(description.parameterSchema,native.parameterSchema);assert.deepEqual(description.defaults,native.defaults);report.checks.push('single native schema/defaults delegated');
for(const detail of ['low','medium','high']){
 const request={seed,params:{assetId:ID,parameters:{detail}}};
 const result=await prepared.generate(request);validateAsset(result.asset);assert.equal(result.asset.generator.id,ID);assert.equal(result.recipe.generator,'dot-model-generator');assert.equal(result.recipe.sourceRecipe.generator,ID);assert.equal(result.recipe.params.parameters.detail,detail);
 const bytes=exportGLB(result.asset),other=exportGLB((await direct.generate({seed,params:{detail}})).asset);assert.equal(sha(bytes),sha(other));
 const parsed=readGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),ID);validateAsset(parsed);assert.equal(parsed.generator.id,ID);assert.equal(parsed.nodes.filter(n=>/^BM13_Wheel_[012]_-?1_[01]_Pivot$/.test(n.name)).length,10);
 await writeFile(new URL('BM13-unified-node-'+detail+'.glb',import.meta.url),bytes);report.exports[detail]={sha256:sha(bytes),bytes:bytes.length,stats:assetStatistics(result.asset),source:result.asset.metadata.source};
 report.checks.push(detail+' actual unified/native byte equivalence and GLB readback');
}
const control=new AbortController();control.abort();await assert.rejects(prepared.generate({seed,params:{assetId:ID,parameters:{}}},{signal:control.signal}),{name:'AbortError'});report.checks.push('pre-aborted unified generation rejected');
report.status='passed';await writeFile(new URL('node-unified-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
