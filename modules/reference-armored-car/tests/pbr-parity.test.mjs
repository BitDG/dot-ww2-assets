import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {createReferenceArmoredCarModel,disposeTree} from '../core.mjs';
function glb(bytes){const n=bytes.readUInt32LE(12);return {doc:JSON.parse(bytes.toString('utf8',20,20+n)),bin:bytes.subarray(28+n)};}
function png(bytes){
 let w,h,channels;const parts=[];
 for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p),kind=bytes.toString('ascii',p+4,p+8),d=bytes.subarray(p+8,p+8+n);if(kind==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);assert.equal(d[8],8);channels=d[9]===6?4:d[9]===2?3:0;assert.ok(channels);assert.equal(d[12],0);}if(kind==='IDAT')parts.push(d);p+=n+12;}
 const raw=inflateSync(Buffer.concat(parts)),stride=w*channels,data=new Uint8Array(w*h*channels);let at=0;
 for(let y=0;y<h;y++){const filter=raw[at++];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?data[i-channels]:0,b=y?data[i-stride]:0,c=y&&x>=channels?data[i-stride-channels]:0;let predictor=0;if(filter===1)predictor=a;if(filter===2)predictor=b;if(filter===3)predictor=Math.floor((a+b)/2);if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}assert.ok(filter<=4);data[i]=(raw[at++]+predictor)&255;}}
 return {w,h,channels,data};
}
function image(g,index){const im=g.doc.images[g.doc.textures[index].source],v=g.doc.bufferViews[im.bufferView];return png(g.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength));}
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
test('actual source and runtime GLBs have equivalent factored PBR without double tinting',async()=>{
 const source=glb(await fs.readFile(new URL('../assets/blender/reference-armored-car-high.glb',import.meta.url))),runtime=glb(await fs.readFile(new URL('../evidence/runtime-reference.glb',import.meta.url)));
 assert.equal(source.doc.images.length,20);assert.equal(runtime.doc.images.length,6);
 const root=createReferenceArmoredCarModel({},{seed:'pgf-components-1'}),roles={};root.traverse(o=>{if(o.isMesh)roles[o.material.name]=o.material;});
 const report={sourceImages:20,runtimeImages:6,sourceBakedFactors:'1 (glTF defaults)',runtime:'tank armor and accessory basecolor/MR/normal sets times linear material factors',roles:[],maxLinearColorError:0,maxMRError:0,ao:false};
 try{for(const sm of source.doc.materials){const sp=sm.pbrMetallicRoughness,role=sm.name,m=roles[role],color=m.color.toArray(),rm=runtime.doc.materials.find(x=>{const p=x.pbrMetallicRoughness;return color.every((v,k)=>Math.abs(v-p.baseColorFactor[k])<1e-8)&&Math.abs(m.roughness-p.roughnessFactor)<1e-8&&Math.abs(m.metalness-p.metallicFactor)<1e-8;});assert.ok(rm,role+' factor mismatch');const rp=rm.pbrMetallicRoughness;assert.equal(sm.occlusionTexture,undefined);assert.equal(rm.occlusionTexture,undefined);
 if(role==='lens'){for(let k=0;k<3;k++)assert.ok(Math.abs(sp.baseColorFactor[k]-rp.baseColorFactor[k])<1e-6);continue;}
 assert.deepEqual(sp.baseColorFactor??[1,1,1,1],[1,1,1,1]);assert.equal(sp.roughnessFactor??1,1);assert.equal(sp.metallicFactor??1,1);
 const sc=image(source,sp.baseColorTexture.index),rc=image(runtime,rp.baseColorTexture.index),ss=image(source,sp.metallicRoughnessTexture.index),rs=image(runtime,rp.metallicRoughnessTexture.index);assert.equal(sc.w,rc.w);assert.equal(sc.h,rc.h);
 for(let i=0;i<sc.w*sc.h;i+=251){for(let k=0;k<3;k++){const e=Math.abs(linear(sc.data[i*sc.channels+k]/255)-linear(rc.data[i*rc.channels+k]/255)*rp.baseColorFactor[k]);report.maxLinearColorError=Math.max(report.maxLinearColorError,e);assert.ok(e<.004,role+' basecolor error '+e);}for(const [k,factor]of [[1,rp.roughnessFactor],[2,rp.metallicFactor]]){const e=Math.abs(ss.data[i*ss.channels+k]/255-rs.data[i*rs.channels+k]/255*factor);report.maxMRError=Math.max(report.maxMRError,e);assert.ok(e<=.5/255+1e-7,role+' MR error '+e);}}
 const sn=image(source,sm.normalTexture.index),rn=image(runtime,rm.normalTexture.index);for(let i=0;i<sn.w*sn.h;i+=251)for(let k=0;k<3;k++)assert.equal(sn.data[i*sn.channels+k],rn.data[i*rn.channels+k]);report.roles.push(role);
 }}finally{disposeTree(root);}
 report.status='PASS';await fs.writeFile(new URL('../evidence/pbr-parity.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
