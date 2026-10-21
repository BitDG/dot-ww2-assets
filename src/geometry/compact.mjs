/** Lossless storage compaction. Triangle order, winding and every attribute bit stay intact. */
export function compactIndexedAttributes(attributes, indices, {removeUnused=true,indexWidth=true}={}) {
  const fields=Object.entries(attributes).map(([name,{array,size}])=>{
    if(!ArrayBuffer.isView(array)||array instanceof DataView||!Number.isInteger(size)||size<1)throw Error('Expected typed vertex attributes');
    const words=array.BYTES_PER_ELEMENT>=4?new Uint32Array(array.buffer,array.byteOffset,array.byteLength/4):new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    return {name,array,size,words,stride:size*array.BYTES_PER_ELEMENT/words.BYTES_PER_ELEMENT};
  });
  if(!fields.length)throw Error('Missing vertex attributes');
  const count=fields[0].array.length/fields[0].size;
  if(!Number.isInteger(count)||fields.some(f=>f.array.length/f.size!==count))throw Error('Vertex attribute counts differ');
  const referenced=removeUnused?new Uint8Array(count):null;
  for(const i of indices){if(!Number.isInteger(i)||i<0||i>=count)throw Error('Index outside vertex attributes');if(referenced)referenced[i]=1;}
  const heads=new Map(),sources=new Uint32Array(count),next=new Int32Array(count),remap=new Uint32Array(count);
  let unique=0;
  for(let i=0;i<count;i++){
    if(referenced&&!referenced[i])continue;
    let hash=2166136261;
    for(const f of fields)for(let k=0;k<f.stride;k++)hash=Math.imul(hash^f.words[i*f.stride+k],16777619);
    let found=-1;
    for(let at=heads.get(hash)??-1;at!==-1;at=next[at]){
      const source=sources[at];let same=true;
      for(const f of fields){for(let k=0;k<f.stride;k++)if(f.words[i*f.stride+k]!==f.words[source*f.stride+k]){same=false;break;}if(!same)break;}
      if(same){found=at;break;}
    }
    if(found<0){found=unique++;sources[found]=i;next[found]=heads.get(hash)??-1;heads.set(hash,found);}
    remap[i]=found;
  }
  const changed=unique!==count;
  let outputIndices=changed?Uint32Array.from(indices,i=>remap[i]):indices;
  if(indexWidth)outputIndices=compactIndices(outputIndices);
  if(!changed)return {attributes,indices:outputIndices};
  const output={};
  for(const f of fields){const array=new f.array.constructor(unique*f.size);for(let i=0;i<unique;i++)array.set(f.array.subarray(sources[i]*f.size,(sources[i]+1)*f.size),i*f.size);output[f.name]={...attributes[f.name],array};}
  return {attributes:output,indices:outputIndices};
}

/** glTF reserves the largest integer value for primitive restart. */
export function compactIndices(indices) {
  let max=0;
  for(const i of indices){if(!Number.isInteger(i)||i<0||i>=4294967295)throw Error('Invalid triangle index');if(i>max)max=i;}
  const Type=max<65535?Uint16Array:Uint32Array;
  return indices instanceof Type?indices:Type.from(indices);
}

export function compactPrimitive(primitive,options) {
  const attributes={};
  for(const [key,size]of [['positions',3],['normals',3],['uv0',2],['uv1',2],['colors',4],['tangents',4]])if(primitive[key])attributes[key]={array:primitive[key],size};
  const result=compactIndexedAttributes(attributes,primitive.indices,options);
  if(result.attributes===attributes&&result.indices===primitive.indices)return primitive;
  const output={...primitive,indices:result.indices};
  for(const [key,{array}]of Object.entries(result.attributes))output[key]=array;
  return output;
}

/** Per-operation reuse only: callers must keep input buffers immutable for that operation. */
export function createPrimitiveCompactor(){
  const cache=new Map(),keys=['positions','normals','uv0','uv1','colors','tangents','indices'];
  return primitive=>{
    const entries=cache.get(primitive.positions)??[];
    const hit=entries.find(entry=>keys.every(key=>entry.source[key]===primitive[key]));
    if(hit)return {...primitive,...hit.geometry};
    const compacted=compactPrimitive(primitive),geometry={};
    for(const key of keys)if(compacted[key])geometry[key]=compacted[key];
    entries.push({source:Object.fromEntries(keys.map(key=>[key,primitive[key]])),geometry});cache.set(primitive.positions,entries);
    return compacted;
  };
}
