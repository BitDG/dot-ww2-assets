import {unzlibSync,zlibSync} from 'fflate';
const table=Uint32Array.from({length:256},(_,i)=>{for(let k=0;k<8;k++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
function chunk(type,data){const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);out.set(new TextEncoder().encode(type),4);out.set(data,8);v.setUint32(out.length-4,crc(out.subarray(4,-4)));return out;}
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;};
const paeth=(a,b,c)=>{const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;};
const predictor=(type,a,b,c)=>type===1?a:type===2?b:type===3?(a+b)>>>1:type===4?paeth(a,b,c):0;
export function decodePNG8(bytes){
  if(bytes.length<45||!bytes.subarray(0,8).every((x,i)=>x===[137,80,78,71,13,10,26,10][i]))throw Error('Unsupported PNG');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),chunks=[],idat=[];let header,ended=false;
  for(let at=8;at+12<=bytes.length;){const n=v.getUint32(at),end=at+n+12;if(end>bytes.length)throw Error('Invalid PNG chunk');const type=new TextDecoder().decode(bytes.subarray(at+4,at+8)),data=bytes.subarray(at+8,at+8+n);if(crc(bytes.subarray(at+4,at+8+n))!==v.getUint32(at+8+n))throw Error('Invalid PNG CRC');if(type==='IHDR')header=data;if(type==='IDAT')idat.push(data);chunks.push({type,data});if(type==='IEND'){ended=true;break;}at=end;}
  if(!header||header.length!==13||!ended||chunks.some(c=>['acTL','fcTL','fdAT','tRNS'].includes(c.type)))throw Error('Unsupported PNG features');
  const hv=new DataView(header.buffer,header.byteOffset,13),width=hv.getUint32(0),height=hv.getUint32(4),type=header[9],channels=({0:1,2:3,4:2,6:4})[type];
  if(!channels||header[8]!==8||header[10]!==0||header[11]!==0||header[12]!==0||!width||!height||width*height>16777216)throw Error('Unsupported PNG format/budget');
  const row=width*channels,raw=unzlibSync(join(idat),{out:new Uint8Array((row+1)*height)}),pixels=new Uint8Array(row*height);let a=1,b=0;
  for(let i=0;i<raw.length;i++){a=(a+raw[i])%65521;b=(b+a)%65521;}const packed=join(idat);if(new DataView(packed.buffer).getUint32(packed.length-4)!==((b*65536+a)>>>0))throw Error('PNG decompressed length/checksum mismatch');
  for(let y=0;y<height;y++){const filter=raw[y*(row+1)];if(filter>4)throw Error('Invalid PNG filter');for(let x=0;x<row;x++){const at=y*row+x,left=x>=channels?pixels[at-channels]:0,up=y?pixels[at-row]:0,corner=y&&x>=channels?pixels[at-row-channels]:0;pixels[at]=(raw[y*(row+1)+1+x]+predictor(filter,left,up,corner))&255;}}
  const rgba=new Uint8Array(width*height*4);for(let i=0;i<width*height;i++){const p=i*channels,k=i*4;if(type===0||type===4){rgba[k]=rgba[k+1]=rgba[k+2]=pixels[p];rgba[k+3]=type===4?pixels[p+1]:255;}else{rgba[k]=pixels[p];rgba[k+1]=pixels[p+1];rgba[k+2]=pixels[p+2];rgba[k+3]=type===6?pixels[p+3]:255;}}
  return {width,height,rgba,chunks,header};
}
/** Exact decoded RGBA, profile/ancillary chunks retained. Unsupported PNGs stay untouched. */
export function optimizePNG(bytes){
  try{
    const image=decodePNG8(bytes),{width,height,rgba}=image;
    if(image.chunks.some(c=>['bKGD','hIST','sBIT','pCAL','sCAL'].includes(c.type)||(c.type[0]===c.type[0].toUpperCase()&&!['IHDR','IDAT','PLTE','IEND'].includes(c.type))))return bytes;
    let opaque=true,gray=!image.chunks.some(c=>['iCCP','PLTE'].includes(c.type));
    for(let i=0;i<rgba.length;i+=4){opaque&&=rgba[i+3]===255;gray&&=rgba[i]===rgba[i+1]&&rgba[i]===rgba[i+2];}
    const channels=gray?(opaque?1:2):(opaque?3:4),type=gray?(opaque?0:4):(opaque?2:6),row=width*channels,pixels=new Uint8Array(row*height);
    for(let i=0;i<width*height;i++){const p=i*channels,k=i*4;if(gray){pixels[p]=rgba[k];if(!opaque)pixels[p+1]=rgba[k+3];}else{pixels[p]=rgba[k];pixels[p+1]=rgba[k+1];pixels[p+2]=rgba[k+2];if(!opaque)pixels[p+3]=rgba[k+3];}}
    const raw=new Uint8Array((row+1)*height),step=Math.max(1,Math.floor(row/256));
    for(let y=0;y<height;y++){
      let best=0,score=Infinity;for(const filter of [0,1,2,4]){let s=0;for(let x=0;x<row;x+=step){const at=y*row+x,d=(pixels[at]-predictor(filter,x>=channels?pixels[at-channels]:0,y?pixels[at-row]:0,y&&x>=channels?pixels[at-row-channels]:0))&255;s+=Math.min(d,256-d);}if(s<score){score=s;best=filter;}}
      raw[y*(row+1)]=best;for(let x=0;x<row;x++){const at=y*row+x;raw[y*(row+1)+x+1]=(pixels[at]-predictor(best,x>=channels?pixels[at-channels]:0,y?pixels[at-row]:0,y&&x>=channels?pixels[at-row-channels]:0))&255;}
    }
    const header=Uint8Array.from(image.header);header[9]=type;const parts=[bytes.subarray(0,8)];let written=false;
    for(const c of image.chunks){if(c.type==='IHDR')parts.push(chunk('IHDR',header));else if(c.type==='IDAT'){if(!written){parts.push(chunk('IDAT',zlibSync(raw,{level:6})));written=true;}}else parts.push(chunk(c.type,c.data));}
    const result=join(parts);return result.length<bytes.length?result:bytes;
  }catch{return bytes;}
}
