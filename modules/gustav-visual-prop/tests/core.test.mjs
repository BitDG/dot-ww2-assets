import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from 'three';
import definition from '../definition.mjs';
import {createGustavVisualModel,disposeTree,TIER_BUDGETS} from '../core.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
import {writeSceneGLB,readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
const prepared=prepareGenerator(definition),req=params=>({seed:'gustav-art-1',params,input:{}});
const exportGLB=asset=>writeSceneGLB([{contentHash:'g',asset}],[{id:'g',assetContentHash:'g',transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},tags:[]}],{preserveSemantics:true});
test('strict schema and cancellation',async()=>{
 for(const params of [{paintColor:[]},{silhouetteLength:NaN},{silhouetteWidth:Infinity},{silhouetteHeight:2},{detail:'ultra'},{unknown:1},{showRails:0},{wheelVisualScale:.1},{camoScale:4}])await assert.rejects(prepared.generate(req(params)));
 const c=new AbortController();c.abort();await assert.rejects(prepared.generate(req({}),{signal:c.signal}),e=>e.name==='AbortError');
});
test('explicit tiny context budget is rejected',async()=>{await assert.rejects(prepared.generate(req({detail:'low'}),{budget:{maxTriangles:1}}),/maxTriangles exceeded/);});
test('each tier produces finite indexed UV geometry with unit normals and no zero triangles',async()=>{
 for(const detail of ['low','medium','high']){const {asset}=await prepared.generate(req({detail}));validateAsset(asset);const stats=assetStatistics(asset);assert(stats.renderedTriangles<=TIER_BUDGETS[detail].triangles);assert(stats.draws<=TIER_BUDGETS[detail].draws);
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(const mesh of asset.meshes)for(const p of mesh.primitives){assert(p.uv0);assert.equal(p.uv0.length,p.positions.length/3*2);for(const arr of [p.positions,p.normals,p.uv0])for(const n of arr)assert(Number.isFinite(n));
 for(let i=0;i<p.normals.length;i+=3)assert(Math.abs(Math.hypot(...p.normals.subarray(i,i+3))-1)<1e-4);
 for(let i=0;i<p.indices.length;i+=3){const ids=[...p.indices.subarray(i,i+3)];assert(ids.every(n=>n<p.positions.length/3));a.fromArray(p.positions,ids[0]*3);b.fromArray(p.positions,ids[1]*3);c.fromArray(p.positions,ids[2]*3);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-22);}}
 assert.equal(asset.metadata.components.length,stats.instances);const names=new Set(asset.nodes.map(n=>n.name));assert.equal(names.size,asset.nodes.length);for(const socket of asset.sockets)assert(asset.nodes.some(n=>n.id===socket.nodeId));
 }
});
test('wheel circularity and exact ground or rail contact at all art-proportion extremes',()=>{
 for(const silhouetteLength of [.85,1.15])for(const silhouetteWidth of [.85,1.15])for(const silhouetteHeight of [.85,1.15])for(const wheelVisualScale of [.85,1.15])for(const showRails of [false,true]){
  const root=createGustavVisualModel({silhouetteLength,silhouetteWidth,silhouetteHeight,wheelVisualScale,showRails,detail:'low'});
  try{const centers=root.userData.pgf.wheelCenters;assert.equal(centers.length,56);for(const {name,center,radius}of centers){const node=root.getObjectByName(name);assert.equal(node.scale.x,node.scale.y);assert.equal(node.scale.y,node.scale.z);const bound=new THREE.Box3().setFromObject(node);assert(Math.abs(bound.max.x-bound.min.x-(bound.max.y-bound.min.y))<1e-5);assert(Math.abs(bound.min.y-root.userData.pgf.railTop)<1e-6);assert(Math.abs(center[1]-radius-root.userData.pgf.railTop)<1e-8);}}
  finally{disposeTree(root);}
 }
});
test('deterministic actual GLB and preserve owner source/recipe sockets',async()=>{
 const a=(await prepared.generate(req({detail:'low'}))).asset,b=(await prepared.generate(req({detail:'low'}))).asset;
 const one=exportGLB(a),two=exportGLB(b);assert.equal(crypto.createHash('sha256').update(one).digest('hex'),crypto.createHash('sha256').update(two).digest('hex'));assert(one.length<128000000);
 assert(a.metadata.components.every(c=>c.owner&&c.source&&c.appearanceRole));assert.equal(a.metadata.visualOnly.visualOnly,true);
});
test('bare steel material is isolated from camouflage and resources from separate runs are owned',async()=>{
 const root=createGustavVisualModel({detail:'low'},{batch:false}),other=createGustavVisualModel({detail:'low'},{batch:false});let disposed=0;
 const steel=root.getObjectByName('wheel--1--1--1-0').material;assert.equal(steel.userData.appearanceRole,'bare-steel');assert.equal(steel.map,null);
 const paint=root.getObjectByName('central-closed-housing').material,otherPaint=other.getObjectByName('central-closed-housing').material;assert.notEqual(paint,otherPaint);assert.notEqual(paint.map,otherPaint.map);otherPaint.map.addEventListener('dispose',()=>disposed++);disposeTree(root);disposeTree(root);assert.equal(disposed,0);disposeTree(other);assert.equal(disposed,1);
 const result=await prepared.generate(req({detail:'low',camoPattern:'auto',camoEnvironment:'jungle'}));assert(result.asset.textures.length>=3);
});
test('same-owner batching preserves per-part world triangle order within float32 bake precision',()=>{
 const a=createGustavVisualModel({detail:'low'},{batch:false}),b=createGustavVisualModel({detail:'low'}),original=new Map(),v=new THREE.Vector3();
 a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 function vertices(o,start=0,count=o.geometry.index.count/3){const g=o.geometry,p=g.attributes.position,ix=g.index,out=[];for(let i=start*3;i<(start+count)*3;i++){v.fromBufferAttribute(p,ix.getX(i)).applyMatrix4(o.matrixWorld);out.push(...v.toArray());}return out;}
 try{a.traverse(o=>{if(o.isMesh)original.set(o.name,vertices(o));});let checked=0;b.traverse(o=>{if(!o.isMesh)return;const parts=o.userData.sourceParts??[{name:o.name,owner:o.parent.name,start:0,count:o.geometry.index.count/3,appearanceRole:o.material.userData.appearanceRole}];let end=0;for(const r of parts){assert.equal(r.start,end);assert.equal(r.owner,o.parent.name);assert.equal(r.appearanceRole,o.material.userData.appearanceRole);const A=original.get(r.name),B=vertices(o,r.start,r.count);assert.equal(A.length,B.length);for(let i=0;i<A.length;i++)assert(Math.abs(A[i]-B[i])<2e-6);end+=r.count;checked++;}assert.equal(end,o.geometry.index.count/3);});assert.equal(checked,original.size);assert(b.userData.batch.afterDraws<=85);assert(b.userData.batch.beforeDraws>b.userData.batch.afterDraws*5);}finally{disposeTree(a);disposeTree(b);}
});

test('closed visual plinth overlaps platform and housing through height and wheel art extremes',()=>{
 for(const silhouetteHeight of [.85,1.15])for(const wheelVisualScale of [.85,1.15])for(const showRails of [false,true]){
  const root=createGustavVisualModel({detail:'low',silhouetteHeight,wheelVisualScale,showRails},{batch:false});
  try{const bounds=name=>new THREE.Box3().setFromObject(root.getObjectByName(name));const base=bounds('closed-display-plinth'),housing=bounds('central-closed-housing'),deck=bounds('central-cross-deck');assert(base.intersectsBox(housing));assert(base.intersectsBox(deck));assert(base.min.y<=deck.max.y&&base.max.y>=housing.min.y);}finally{disposeTree(root);}
 }
});

test('dedicated tread is encoded in texture pixels with unit normal scale, uniform facade circles and owned disposal',()=>{
 const root=createGustavVisualModel({detail:'medium',silhouetteLength:1.15,silhouetteWidth:.85},{batch:false});
 try{const deck=root.getObjectByName('rear-elevated-deck').material,paint=root.getObjectByName('central-closed-housing').material;assert.deepEqual(deck.normalScale.toArray(),[1,1]);assert.deepEqual(paint.normalScale.toArray(),[1,1]);assert.notEqual(deck.normalMap,paint.normalMap);assert.equal(deck.normalMap.name,'gustav-deck-tread-normal');assert(new Set(deck.normalMap.image.data).size>4);root.traverse(o=>{if(o.name.startsWith('wheel-face-paint-')){assert.equal(o.scale.x,o.scale.y);assert.equal(o.scale.y,o.scale.z);}});
 let calls=0;deck.normalMap.addEventListener('dispose',()=>calls++);disposeTree(root);disposeTree(root);assert.equal(calls,1);
 }finally{disposeTree(root);}
});

test('wheel rows retain positive gaps and fit the independently stretched closed end decks at all scale extremes',()=>{
 for(const silhouetteLength of [.85,1,1.15])for(const wheelVisualScale of [.85,1,1.15]){
 const root=createGustavVisualModel({silhouetteLength,wheelVisualScale,detail:'low'},{batch:false});
 try{for(const side of [-1,1])for(const lane of [-1,1])for(const end of [-1,1]){const row=root.userData.pgf.wheelCenters.filter(w=>w.name.startsWith(`wheel-${side}-${lane}-${end}-`)).sort((a,b)=>a.center[0]-b.center[0]);for(let i=1;i<row.length;i++)assert(row[i].center[0]-row[i-1].center[0]-row[i].radius-row[i-1].radius>.008);const deck=new THREE.Box3().setFromObject(root.getObjectByName(`end-walkway-${side}-${end}`));assert(row[0].center[0]-row[0].radius>=deck.min.x-.01);assert(row.at(-1).center[0]+row.at(-1).radius<=deck.max.x+.01);}}finally{disposeTree(root);}
 }
});

test('railing toggle hides stair handrails while retaining stair treads and stringers',()=>{
 for(const detail of ['low','medium','high']){const root=createGustavVisualModel({detail,showRailings:false,showStairs:true},{batch:false});try{const names=[];root.traverse(o=>{if(o.isMesh)names.push(o.name);});assert(!names.some(n=>/stair-left-|stair-post-|stair-continuous-guard-|side-low-guard-|upper-guard-|rear-deck-guard-/.test(n)));assert(names.some(n=>n.startsWith('step-')));assert(names.some(n=>n.startsWith('stair-stringer-')));}finally{disposeTree(root);}}
});

test('folded stair sides and handguard elbows stay connected to actual platform guards at artistic extremes',()=>{
 for(const silhouetteLength of [.85,1.15])for(const silhouetteWidth of [.85,1.15])for(const silhouetteHeight of [.85,1.15]){const root=createGustavVisualModel({silhouetteLength,silhouetteWidth,silhouetteHeight,detail:'low'},{batch:false});try{assert.equal(root.userData.pgf.stairGuardConnections.length,2);for(const c of root.userData.pgf.stairGuardConnections){const post=root.getObjectByName(c.post),expected=post.position.clone();expected.y+=.5304;assert(expected.distanceTo(new THREE.Vector3(...c.to))<1e-8);const elbow=root.getObjectByName('stair-platform-elbow-'+c.side);assert(new THREE.Box3().setFromObject(elbow).intersectsBox(new THREE.Box3().setFromObject(post)));}for(const side of [-1,1])for(const edge of [-1,1]){const fold=root.getObjectByName(`stair-stringer-folded-${side}-${edge}`),deck=root.getObjectByName('upper-walkway-'+side);assert(new THREE.Box3().setFromObject(fold).intersectsBox(new THREE.Box3().setFromObject(deck)));}}finally{disposeTree(root);}}
});

test('adjoining guard paths share endpoints and export no duplicate triangles',async()=>{
 for(const detail of ['low','medium','high']){
  const root=createGustavVisualModel({detail},{batch:false});if(detail!=='low')assert.equal(root.userData.sharedGuardPosts.length,2);disposeTree(root);
  const {asset}=await prepared.generate(req({detail}));const parsed=readGLB(exportGLB(asset));
  for(const mesh of parsed.meshes)for(const p of mesh.primitives){const seen=new Set();for(let i=0;i<p.indices.length;i+=3){const key=[p.indices[i],p.indices[i+1],p.indices[i+2]].sort((a,b)=>a-b).join(',');assert(!seen.has(key),'Duplicate triangle in '+mesh.id);seen.add(key);}}
 }
});
