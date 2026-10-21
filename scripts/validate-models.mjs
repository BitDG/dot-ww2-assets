import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRequire} from 'node:module';
const {loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {MODEL_CATALOG,canMount} from '../modules/dot-model-generator/catalog.mjs';
import {prepareGenerator} from '../generator-sdk/validation.mjs';
import {writeSceneGLB,readGLB,validateAsset} from '../src/plugins/scatter/io.js';
import {assetStatistics} from '../generator-sdk/statistics.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const encode=asset=>writeSceneGLB([{contentHash:asset.id,asset}],[{id:asset.id,assetContentHash:asset.id,transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},tags:[]}],{preserveSemantics:true});
const report={date:new Date().toISOString(),kind:'New migration Node generation and independent GLTFLoader readback; not browser acceptance',models:[]};
await mkdir('public/models',{recursive:true});await mkdir('evidence',{recursive:true});
for(const m of MODEL_CATALOG.filter(canMount)){
 const row={id:m.assetId};try{
 const native=(await import('../modules/'+m.assetId+'/definition.mjs')).default,adapter=prepareGenerator(native),request={seed:'dot-gallery-20261021',params:{}};
 const first=await adapter.generate(request),bytes=encode(first.asset);validateAsset(first.asset);const second=await adapter.generate(request);assert.equal(sha(bytes),sha(encode(second.asset)),'deterministic GLB');
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),reread=validateAsset(readGLB(buffer,m.assetId));assert.equal(reread.generator.id,m.assetId);
 let decoded=0;globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>{decoded++;return loadImage(Buffer.from(await blob.arrayBuffer()));};
 let gltf;try{gltf=await new GLTFLoader().parseAsync(buffer,'');}finally{delete globalThis.createImageBitmap;delete globalThis.self;}
 let meshes=0,triangles=0,nonfinite=0,missingNormals=0,missingUVs=0,degenerate=0;
 gltf.scene.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,idx=g.index;triangles+=(idx?.count??p.count)/3;if(!n)missingNormals++;if(!uv)missingUVs++;for(const a of Object.values(g.attributes))for(const v of a.array)if(!Number.isFinite(v))nonfinite++;
 for(let i=0;i<(idx?.count??p.count);i+=3){const ids=[0,1,2].map(j=>idx?idx.getX(i+j):i+j),a=ids.map(k=>[p.getX(k),p.getY(k),p.getZ(k)]),u=a[1].map((v,j)=>v-a[0][j]),v=a[2].map((x,j)=>x-a[0][j]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(cross.every(x=>x===0))degenerate++;}
 });assert.equal(nonfinite,0);assert.equal(gltf.animations.length,0);assert(meshes>0);
 const disposed=new Set();gltf.scene.traverse(o=>{if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}for(const mat of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){for(const t of Object.values(mat))if(t?.isTexture&&!disposed.has(t)){disposed.add(t);t.dispose();}if(!disposed.has(mat)){disposed.add(mat);mat.dispose();}}});
 Object.assign(row,{status:'passed',bytes:bytes.length,sha256:sha(bytes),stats:assetStatistics(first.asset),independent:{meshes,triangles,decodedImages:decoded,animationClips:gltf.animations.length,nonfinite,missingNormals,missingUVs,exactDegenerateTriangles:degenerate,disposedResources:disposed.size},geometryQuality:degenerate||missingNormals||missingUVs?'inherited issues recorded; not certified clean':'checked',deterministic:true});
 await writeFile('public/models/'+m.assetId+'.glb',bytes);await writeFile('public/models/'+m.assetId+'.recipe.json',JSON.stringify(first.recipe,null,2));
 }catch(error){row.status='failed';row.error=error.stack;process.exitCode=1;}
 report.models.push(row);console.log(row.id,row.status,row.error??row.bytes);await writeFile('evidence/model-validation.json',JSON.stringify(report,null,2));
}
