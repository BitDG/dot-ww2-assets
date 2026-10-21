import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as THREE from 'three';
import definition from '../definition.mjs';
import {projectCamouflageUV} from '../camouflage-uv.mjs';
import {createDieselLocomotiveModel,disposeTree,TIER_BUDGETS} from '../core.mjs';
import {prepareGenerator} from '../../../generator-sdk/validation.mjs';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
import {writeSceneGLB,readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
const prepared=prepareGenerator(definition),req=params=>({seed:'diesel-art-1',params,input:{}});
const exportGLB=asset=>writeSceneGLB([{contentHash:'g',asset}],[{id:'g',assetContentHash:'g',transform:{position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]},tags:[]}],{preserveSemantics:true});
test('strict schema and cancellation',async()=>{
 for(const params of [{paintColor:[]},{bodyLength:NaN},{bodyWidth:Infinity},{bodyHeight:2},{detail:'ultra'},{unknown:1},{showRails:0},{wheelScale:.1},{camoScale:4}])await assert.rejects(prepared.generate(req(params)));
 const c=new AbortController();c.abort();await assert.rejects(prepared.generate(req({}),{signal:c.signal}),e=>e.name==='AbortError');
});
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
 for(const bodyLength of [.85,1.15])for(const bodyWidth of [.85,1.15])for(const bodyHeight of [.85,1.15])for(const wheelScale of [.85,1.15])for(const showRails of [false,true]){
  const root=createDieselLocomotiveModel({bodyLength,bodyWidth,bodyHeight,wheelScale,showRails,detail:'low'});
  try{const centers=root.userData.pgf.wheelCenters;assert.equal(centers.length,12);for(const {name,center,radius}of centers){const node=root.getObjectByName(name);assert.equal(node.scale.x,node.scale.y);assert.equal(node.scale.y,node.scale.z);const bound=new THREE.Box3().setFromObject(node);assert(Math.abs(bound.max.x-bound.min.x-(bound.max.y-bound.min.y))<1e-5);assert(Math.abs(bound.min.y-root.userData.pgf.railTop)<1e-6);assert(Math.abs(center[1]-radius-root.userData.pgf.railTop)<1e-8);}}
  finally{disposeTree(root);}
 }
});
test('deterministic actual GLB and preserve owner source/recipe sockets',async()=>{
 const a=(await prepared.generate(req({detail:'low'}))).asset,b=(await prepared.generate(req({detail:'low'}))).asset;
 const one=exportGLB(a),two=exportGLB(b);assert.equal(crypto.createHash('sha256').update(one).digest('hex'),crypto.createHash('sha256').update(two).digest('hex'));assert(one.length<128000000);
 assert(a.metadata.components.every(c=>c.owner&&c.source&&c.appearanceRole));assert.equal(a.metadata.visualOnly.visualOnly,true);
});
test('bare steel material is isolated from camouflage and resources from separate runs are owned',async()=>{
 const root=createDieselLocomotiveModel({detail:'low'},{batch:false}),other=createDieselLocomotiveModel({detail:'low'},{batch:false});let disposed=0;
 const steel=root.getObjectByName('wheel--1--1--1').material;assert.equal(steel.userData.appearanceRole,'bare-steel');assert.equal(steel.map,null);
 const paint=root.getObjectByName('angular-cab').material,otherPaint=other.getObjectByName('angular-cab').material;assert.notEqual(paint,otherPaint);assert.notEqual(paint.map,otherPaint.map);otherPaint.map.addEventListener('dispose',()=>disposed++);disposeTree(root);disposeTree(root);assert.equal(disposed,0);disposeTree(other);assert.equal(disposed,1);
 const result=await prepared.generate(req({detail:'low',camoPattern:'auto',camoEnvironment:'jungle'}));assert(result.asset.textures.length>=3);
});
test('same-owner batching preserves per-part world triangle order within float32 bake precision',()=>{
 const a=createDieselLocomotiveModel({detail:'low'},{batch:false}),b=createDieselLocomotiveModel({detail:'low'}),original=new Map(),v=new THREE.Vector3();
 a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 function vertices(o,start=0,count=o.geometry.index.count/3){const g=o.geometry,p=g.attributes.position,ix=g.index,out=[];for(let i=start*3;i<(start+count)*3;i++){const j=o.matrixWorld.determinant()<0?(i%3===1?i+1:i%3===2?i-1:i):i;v.fromBufferAttribute(p,ix.getX(j)).applyMatrix4(o.matrixWorld);out.push(...v.toArray());}return out;}
 try{a.traverse(o=>{if(o.isMesh)original.set(o.name,vertices(o));});let checked=0;b.traverse(o=>{if(!o.isMesh)return;const parts=o.userData.sourceParts??[{name:o.name,owner:o.parent.name,start:0,count:o.geometry.index.count/3,appearanceRole:o.material.userData.appearanceRole}];let end=0;for(const r of parts){assert.equal(r.start,end);assert.equal(r.owner,o.parent.name);assert.equal(r.appearanceRole,o.material.userData.appearanceRole);const A=original.get(r.name),B=vertices(o,r.start,r.count);assert.equal(A.length,B.length);for(let i=0;i<A.length;i++)assert(Math.abs(A[i]-B[i])<2e-6);end+=r.count;checked++;}assert.equal(end,o.geometry.index.count/3);});assert.equal(checked,original.size);assert(b.userData.batch.afterDraws<=140);assert(b.userData.batch.beforeDraws>b.userData.batch.afterDraws*5);}finally{disposeTree(a);disposeTree(b);}
});

test('cab, short nose and hood touch deck across height and wheel extremes',()=>{
 for(const bodyHeight of [.85,1.15])for(const wheelScale of [.85,1.15]){
 const root=createDieselLocomotiveModel({bodyHeight,wheelScale,detail:'low'},{batch:false});
 try{const bounds=name=>new THREE.Box3().setFromObject(root.getObjectByName(name)),deck=bounds('walkway-deck');for(const name of ['angular-cab','short-sloped-nose','long-hood-main','rear-hood-end']){const b=bounds(name);assert(b.min.y<=deck.max.y+1e-5,name);assert(b.max.y>deck.max.y);}}finally{disposeTree(root);}
 }
});
test('fan count, bogie spacing, and switches change actual geometry without squashing wheels',()=>{
 for(const fanCount of [2,3,4,5]){const r=createDieselLocomotiveModel({fanCount,bodyLength:.85,bodyWidth:.85,detail:'low'},{batch:false});try{const rings=r.getObjectByName('roof-fans-and-exhaust').children.filter(o=>/^fan-ring-/.test(o.name));assert.equal(rings.length,fanCount);const boxes=rings.map(o=>new THREE.Box3().setFromObject(o)).sort((a,b)=>a.min.x-b.min.x);for(let i=1;i<boxes.length;i++)assert(boxes[i].min.x>boxes[i-1].max.x);for(const b of boxes)assert(Math.abs((b.max.x-b.min.x)-(b.max.z-b.min.z))<1e-5);}finally{disposeTree(r);}}
 const a=createDieselLocomotiveModel({detail:'low',bogieSpacing:.85},{batch:false}),b=createDieselLocomotiveModel({detail:'low',bogieSpacing:1.15,showRailings:false,showGrilles:false,showRails:false,showRivets:false},{batch:false});try{assert(a.getObjectByName('wheel-1-1-0').position.x<b.getObjectByName('wheel-1-1-0').position.x);assert.equal(b.getObjectByName('display-rails').children.length,0);assert(!b.getObjectByName('grille-dark-1-0'));assert(!b.getObjectByName('long-guard-1-post:p0'));}finally{disposeTree(a);disposeTree(b);}
});
test('explicit caller maxTriangles=1 is enforced and non-paint identity survives camouflage',async()=>{
 await assert.rejects(prepared.generate(req({detail:'low'}),{budget:{maxTriangles:1}}),/maxTriangles/);
 const original=(await prepared.generate(req({detail:'low'}))).asset,camo=(await prepared.generate(req({detail:'low',camoPattern:'digital',camoEnvironment:'urban'}))).asset;
 function identity(asset,role){const c=asset.metadata.components.find(c=>c.appearanceRole===role);assert(c,role);const n=asset.nodes.find(n=>n.id===c.nodeId),mesh=asset.meshes.find(m=>m.id===n.meshId),m=asset.materials.find(m=>m.id===mesh.primitives[0].materialId);return {...m,id:role};}
 for(const role of ['bare-steel','bare-glass','bare-rubber','bare-lamp'])assert.deepEqual(identity(original,role),identity(camo,role));
 const restored=(await prepared.generate(req({detail:'low'}))).asset;assert.deepEqual(exportGLB(original),exportGLB(restored));
});

test('mirrored pilots and couplers retain outward face winding after owner batch',()=>{
 const root=createDieselLocomotiveModel({detail:'high'}),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),t=new THREE.Vector3();try{root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,ix=g.index;for(let i=0;i<ix.count;i+=3){a.fromBufferAttribute(p,ix.getX(i));b.fromBufferAttribute(p,ix.getX(i+1));c.fromBufferAttribute(p,ix.getX(i+2));t.copy(b).sub(a).cross(c.sub(a));normal.set(0,0,0);for(let k=0;k<3;k++)normal.add(new THREE.Vector3().fromBufferAttribute(n,ix.getX(i+k)));assert(t.dot(normal)>=-1e-10,o.name+' face '+i/3);}});}finally{disposeTree(root);}
});

test('round wheel pairs keep positive clearance and tank fits between bogies at parameter corners',()=>{
 for(const bodyLength of [.85,1.15])for(const wheelScale of [.85,1.15])for(const bogieSpacing of [.85,1.15]){const root=createDieselLocomotiveModel({bodyLength,wheelScale,bogieSpacing,detail:'low'});try{const {wheelCenters,axlePitch,fuelHalf}=root.userData.pgf;assert(axlePitch>2*wheelCenters[0].radius+.075);for(const end of [-1,1]){const ws=wheelCenters.filter(w=>w.bogie===end&&w.name.includes('-1-')).sort((a,b)=>a.center[0]-b.center[0]);const inner=wheelCenters.filter(w=>w.bogie===end).sort((a,b)=>Math.abs(a.center[0])-Math.abs(b.center[0]))[0];assert(fuelHalf<Math.abs(inner.center[0])-inner.radius-.24);}}finally{disposeTree(root);}}
});

test('structural detail uses helical coils, bent grabs and thick four-sided grille frames',()=>{
 const low=createDieselLocomotiveModel({detail:'low'},{batch:false}),med=createDieselLocomotiveModel({detail:'medium'},{batch:false}),high=createDieselLocomotiveModel({detail:'high'},{batch:false});
 try{const coil='suspension-coil--1--1--1--1';assert.equal(low.getObjectByName(coil),undefined);const m=med.getObjectByName(coil),h=high.getObjectByName(coil);assert(m.geometry.index.count>300);assert(h.geometry.index.count>m.geometry.index.count);for(const r of [med,high]){assert(r.getObjectByName('nose-continuous-return-grab--1'));assert(r.getObjectByName('brake-shoe--1--1--1--1'));assert(r.getObjectByName('grille-side-rim--1-0--0.625'));assert(r.getObjectByName('window-metal-bead--1-3.23'));assert(r.getObjectByName('nose-lamp-mount-3.05'));}}
 finally{for(const r of [low,med,high])disposeTree(r);}
});

test('visible suspension projects outside sideframe and medium doors have real folded depth',()=>{
 const root=createDieselLocomotiveModel({detail:'medium'},{batch:false});try{const bounds=name=>new THREE.Box3().setFromObject(root.getObjectByName(name));const coil=bounds('suspension-coil--1--1--1--1'),frame=bounds('three-axle-sideframe--1--1'),door=bounds('access-door--1-0');assert(coil.min.z<frame.min.z-.12);assert(door.max.z-door.min.z>.06);}finally{disposeTree(root);}
});


test('camouflage world density is consistent across body lengths, door panels and fuel tank',()=>{
 for(const bodyLength of [.85,1,1.15])for(const scale of [.5,1.6,2]){const root=createDieselLocomotiveModel({bodyLength,detail:'low'});try{const report=projectCamouflageUV(root,{scale});assert.equal(report.effectiveTileSize,4/scale);let panel=0,tank=0;
 root.traverse(o=>{if(!o.isMesh||o.material.userData.appearanceRole!=='armorPaint')return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(const part of o.userData.sourceParts??[]){if(!part.name.startsWith('access-door-')&&part.name!=='main-fuel-tank')continue;for(let k=part.start*3;k<(part.start+part.count)*3;k++){const i=g.index.getX(k);if(Math.abs(n.getZ(i))<.9)continue;assert(Math.abs(uv.getX(i)-p.getX(i)*scale/4)<2e-6);assert(Math.abs(uv.getY(i)-p.getY(i)*scale/4)<2e-6);if(part.name==='main-fuel-tank')tank++;else panel++;}}});assert(panel>100&&tank>10);
 }finally{disposeTree(root);}}
});
test('camouflage UV changes neither geometry nor bare-material UV/identity',()=>{
 const root=createDieselLocomotiveModel({detail:'low'}),snap=new Map();try{root.traverse(o=>{if(o.isMesh)snap.set(o.name,{positions:o.geometry.attributes.position.array.slice(),normals:o.geometry.attributes.normal.array.slice(),uv:o.geometry.attributes.uv.array.slice(),material:o.material});});projectCamouflageUV(root,{scale:1.6});root.traverse(o=>{if(!o.isMesh)return;const before=snap.get(o.name);assert.deepEqual(o.geometry.attributes.position.array,before.positions);assert.deepEqual(o.geometry.attributes.normal.array,before.normals);assert.equal(o.material,before.material);if(o.material.userData.appearanceRole!=='armorPaint')assert.deepEqual(o.geometry.attributes.uv.array,before.uv);});}finally{disposeTree(root);}
});
test('optional camouflage records real world-density scale and original output stays unprojected',async()=>{
 const c=(await prepared.generate(req({detail:'low',camoPattern:'digital',camoScale:1.6}))).asset;assert.equal(c.metadata.camouflageUV.scale,1.6);assert.equal(c.metadata.finish.scale,1.6);assert.equal(c.metadata.camouflageUV.effectiveTileSize,2.5);
 const original=(await prepared.generate(req({detail:'low',camoPattern:'original'}))).asset;assert.equal(original.metadata.camouflageUV,undefined);
});
