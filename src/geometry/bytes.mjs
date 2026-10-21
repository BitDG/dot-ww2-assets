/** Synchronous content interning with exact collision checks; no mutable material sharing. */
const nativeLittleEndian=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
export class ByteTable {
  constructor(){this.buckets=new Map();this.identities=new WeakMap();}
  get(bytes,key=''){
    const identity=key+':'+bytes.byteOffset+':'+bytes.byteLength,known=this.identities.get(bytes.buffer)?.get(identity);
    if(known)return {entry:known,identity};
    let hash=2166136261;
    // Whole words reduce the large-buffer scan by four; collisions still compare all bytes.
    const count=Math.floor(bytes.length/4),words=nativeLittleEndian&&bytes.byteOffset%4===0?new Uint32Array(bytes.buffer,bytes.byteOffset,count):null;
    const view=words?null:new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(let i=0;i<count;i++)hash=Math.imul(hash^(words?words[i]:view.getUint32(i*4,true)),16777619);
    for(let i=count*4;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);
    const id=key+':'+bytes.length+':'+(hash>>>0),bucket=this.buckets.get(id)??[];
    for(const entry of bucket){let same=true;for(let i=0;i<bytes.length;i++)if(bytes[i]!==entry.bytes[i]){same=false;break;}if(same){this.remember(bytes,identity,entry);return {entry,bucket,id,identity};}}
    return {entry:null,bucket,id,identity};
  }
  remember(bytes,identity,entry){const entries=this.identities.get(bytes.buffer)??new Map();entries.set(identity,entry);this.identities.set(bytes.buffer,entries);}
  set(found,bytes,value){const entry={bytes,value};found.bucket.push(entry);this.buckets.set(found.id,found.bucket);this.remember(bytes,found.identity,entry);return value;}
}
