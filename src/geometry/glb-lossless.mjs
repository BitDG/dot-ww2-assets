import {ByteTable} from './bytes.mjs';
import {optimizePNG} from './png-lossless.mjs';
const enc=new TextEncoder(),dec=new TextDecoder(),widths={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
export function optimizeGLBResult(input){const out=optimizeGLB(input);return input instanceof ArrayBuffer?out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength):out;}
export function splitGLB(input){const bytes=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(bytes.length<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.length)throw Error('Invalid GLB');const chunks=[];for(let at=12;at<bytes.length;){const length=v.getUint32(at,true),type=v.getUint32(at+4,true);if(at+8+length>bytes.length||length%4)throw Error('Invalid GLB chunk');chunks.push({type,bytes:bytes.subarray(at+8,at+8+length)});at+=8+length;}return {bytes,chunks};}
/** Repack standard GLB without changing geometry, sampling, materials, hierarchy or extras. */
export function optimizeGLB(input){
  const {bytes,chunks}=splitGLB(input),json=chunks.find(c=>c.type===0x4e4f534a),bin=chunks.find(c=>c.type===0x004e4942);if(!json||!bin)return bytes;
  const doc=JSON.parse(dec.decode(json.bytes)),safeExtensions=['EXT_mesh_gpu_instancing','KHR_draco_mesh_compression','KHR_mesh_quantization','KHR_lights_punctual','KHR_texture_transform','KHR_materials_unlit','KHR_materials_transmission','KHR_materials_volume','KHR_materials_ior','KHR_materials_clearcoat','KHR_materials_sheen','KHR_materials_specular','KHR_materials_emissive_strength','KHR_materials_iridescence','KHR_materials_anisotropy','KHR_materials_dispersion','KHR_materials_pbrSpecularGlossiness','KHR_materials_variants'];
  if(doc.buffers?.length!==1||doc.buffers[0].uri||(doc.extensionsUsed??[]).some(name=>!safeExtensions.includes(name))||!doc.bufferViews)return bytes;
  const records=doc.bufferViews.map((view,index)=>{const at=view.byteOffset??0;if(view.buffer!==0||at+view.byteLength>bin.bytes.length)throw Error('Invalid GLB view');return {index,view,bytes:bin.bytes.subarray(at,at+view.byteLength)};});
  const used=new Map();for(const accessor of doc.accessors??[])if(accessor.bufferView!==undefined){const list=used.get(accessor.bufferView)??[];list.push(accessor);used.set(accessor.bufferView,list);}
  const indices=new Set((doc.meshes??[]).flatMap(mesh=>mesh.primitives.map(p=>p.indices)).filter(i=>i!==undefined));
  // Bounds remain mandatory for positions. Other accessor bounds and zero offsets
  // are optional storage metadata; removing them leaves decoded attributes intact.
  const positions=new Set((doc.meshes??[]).flatMap(m=>m.primitives.flatMap(p=>[p.attributes?.POSITION,...(p.targets??[]).map(t=>t.POSITION)])));
  for(let i=0;i<(doc.accessors?.length??0);i++){const a=doc.accessors[i];if(a.byteOffset===0)delete a.byteOffset;if(!positions.has(i)){delete a.min;delete a.max;}}
  for(const id of indices){
    const a=doc.accessors[id],r=records[a?.bufferView],width=widths[a?.componentType];if(!a||a.sparse||!r)continue;
    if(![5123,5125].includes(a.componentType)||a.type!=='SCALAR'||a.byteOffset||r.view.byteStride||used.get(a.bufferView).length!==1||r.bytes.length!==a.count*width)continue;
    const v=new DataView(r.bytes.buffer,r.bytes.byteOffset,r.bytes.byteLength),get=width===4?'getUint32':'getUint16';let max=0;
    for(let i=0;i<a.count;i++)max=Math.max(max,v[get](i*width,true));const next=max<255?1:max<65535?2:4;if(next>=width)continue;
    const small=new Uint8Array(a.count*next),s=new DataView(small.buffer);for(let i=0;i<a.count;i++)if(next===1)small[i]=v[get](i*width,true);else s.setUint16(i*2,v[get](i*width,true),true);
    a.componentType=next===1?5121:5123;r.bytes=small;
  }
  const imageViews=new Set();
  for(const image of doc.images??[])if(image.mimeType==='image/png'&&image.bufferView!==undefined&&!imageViews.has(image.bufferView)){imageViews.add(image.bufferView);const r=records[image.bufferView];if(!used.has(image.bufferView))r.bytes=optimizePNG(r.bytes);}
  const table=new ByteTable(),constant=new Map(),prefixes=new Map(),parts=[];let length=0;
  for(const r of records.toSorted((a,b)=>b.bytes.length-a.bytes.length)){
    const accessor=used.get(r.index)?.[0],period=r.view.byteStride??(accessor?sizes[accessor.type]*widths[accessor.componentType]:0);let key;
    if(period&&period<=64&&r.bytes.length%period===0){let same=true;for(let i=period;i<r.bytes.length;i++)if(r.bytes[i]!==r.bytes[i%period]){same=false;break;}if(same)key=period+':'+Array.from(r.bytes.subarray(0,period)).join(',');}
    const head=Array.from(r.bytes.subarray(0,Math.min(16,r.bytes.length))).join(','),candidates=prefixes.get(head)??[];
    let prefix=key&&constant.get(key);if(prefix===undefined)for(const candidate of candidates){if(candidate.bytes.length<r.bytes.length)continue;let equal=true;for(let i=0;i<r.bytes.length;i++)if(candidate.bytes[i]!==r.bytes[i]){equal=false;break;}if(equal){prefix=candidate.offset;break;}}
    const found=table.get(r.bytes);let offset;
    if(prefix!==undefined)offset=prefix;else if(found.entry)offset=found.entry.value;else{const pad=(4-length%4)%4;if(pad){parts.push(new Uint8Array(pad));length+=pad;}offset=length;parts.push(r.bytes);length+=r.bytes.length;table.set(found,r.bytes,offset);if(key)constant.set(key,offset);}
    if(prefix===undefined&&!found.entry&&candidates.length<64){candidates.push({bytes:r.bytes,offset});prefixes.set(head,candidates);}
    r.view.byteOffset=offset;r.view.byteLength=r.bytes.length;
  }
  doc.buffers[0].byteLength=length;const text=enc.encode(JSON.stringify(doc)),jsonSize=(text.length+3)&~3,binSize=(length+3)&~3,other=chunks.filter(c=>c!==json&&c!==bin),size=12+8+jsonSize+8+binSize+other.reduce((n,c)=>n+8+c.bytes.length,0);if(size>=bytes.length)return bytes;
  const out=new Uint8Array(size),v=new DataView(out.buffer);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,size,true);v.setUint32(12,jsonSize,true);v.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+jsonSize);out.set(text,20);let at=20+jsonSize;v.setUint32(at,binSize,true);v.setUint32(at+4,0x004e4942,true);at+=8;for(const part of parts){out.set(part,at);at+=part.length;}at=20+jsonSize+8+binSize;for(const c of other){v.setUint32(at,c.bytes.length,true);v.setUint32(at+4,c.type,true);out.set(c.bytes,at+8);at+=8+c.bytes.length;}return out;
}
