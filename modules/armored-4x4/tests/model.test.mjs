import {test} from 'node:test';import assert from 'node:assert/strict';
import adapter from '../definition.mjs';import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
const generator=prepareGenerator(adapter);
test('reference asset preserves real component hierarchy, finite bounds and reference textures',async()=>{
 const {asset}=await generator.generate({seed:'armored-test',params:{}});assert.equal(asset.textures.length,3);assert.ok(asset.nodes.some(n=>n.name==='Split armored windshield'));assert.ok(asset.nodes.some(n=>n.name==='Front left wheel'));
 for(const m of asset.meshes)for(const p of m.primitives){assert.ok(Array.from(p.positions).every(Number.isFinite));assert.ok(Array.from(p.normals).every(Number.isFinite));for(let i=0;i<p.indices.length;i+=3){const ids=[p.indices[i],p.indices[i+1],p.indices[i+2]],v=ids.map(i=>Array.from(p.positions.slice(i*3,i*3+3))),a=v[1].map((x,i)=>x-v[0][i]),b=v[2].map((x,i)=>x-v[0][i]),cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];assert.ok(Math.hypot(...cross)>1e-10,'zero-area triangle');}}
});
test('equipment options physically remove assemblies and recoloring removes photo textures',async()=>{const {asset}=await generator.generate({seed:'field',params:{roofEquipment:false,spareWheel:false,finish:'olive'}});assert.ok(!asset.nodes.some(n=>n.name==='Roof equipment rack'||n.name==='Rear spare wheel'));assert.equal(asset.textures.length,0);});
test('invalid imported parameter shapes fail through shared schema',async()=>{await assert.rejects(()=>generator.generate({seed:'bad',params:{length:[6.1]}}));await assert.rejects(()=>generator.generate({seed:'bad',params:{steering:Infinity}}));});
