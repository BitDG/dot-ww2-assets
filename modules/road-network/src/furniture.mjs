import {newMeshBuilder,triangle} from '../../realmap/src/geometry.mjs';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
const add=(builders,key)=>{let m=builders.get(key);if(!m){m=newMeshBuilder();builders.set(key,m);}return m;};
function box(m,x0,y0,z0,x1,y1,z1){[x0,x1]=[Math.min(x0,x1),Math.max(x0,x1)];[y0,y1]=[Math.min(y0,y1),Math.max(y0,y1)];[z0,z1]=[Math.min(z0,z1),Math.max(z0,z1)];const p=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],f=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]];for(const [a,b,c,d] of f){triangle(m,p[a],p[b],p[c]);triangle(m,p[a],p[c],p[d]);}}
function beam(m,a,b,width=.08,height=.08){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);if(len<.02)return;const nx=-dz/len*width,nz=dx/len*width;const p=[[a[0]+nx,a[1]-height,a[2]+nz],[a[0]-nx,a[1]-height,a[2]-nz],[b[0]-nx,b[1]-height,b[2]-nz],[b[0]+nx,b[1]-height,b[2]+nz],[a[0]+nx,a[1]+height,a[2]+nz],[a[0]-nx,a[1]+height,a[2]-nz],[b[0]-nx,b[1]+height,b[2]-nz],[b[0]+nx,b[1]+height,b[2]+nz]],f=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]];for(const [i,j,k,l] of f){triangle(m,p[i],p[j],p[k]);triangle(m,p[i],p[k],p[l]);}}
function at(segment,s){const samples=segment?.samples||[];if(!samples.length)return null;let best=samples[0];for(const v of samples)if(Math.abs(v.s-s)<Math.abs(best.s-s))best=v;return best;}
function validSocket(socket){return socket?.transform?.position?.length===3&&socket.transform.position.every(finite);}

// Local +X reaches into the carriageway; +Z faces approaching vehicles.
function signal(builders,socket,segment){
 const local=new Map(),steel=add(local,'steel'),housing=add(local,'signal-housing');
 box(add(local,'concrete'),-.32,-.05,-.32,.32,.2,.32);
 box(steel,-.11,.2,-.11,.11,5.5,.11);
 beam(steel,[0,5.15,0],[1.6,5.15,0],.08,.08);
 box(steel,1.48,4.85,-.08,1.62,5.15,.08);
 box(housing,1.24,3.79,-.18,1.86,4.99,.18);
 for(let i=0;i<3;i++){
  const cy=4.77-i*.36,lens=add(local,['signal-red','signal-amber','signal-green'][i]);
  // Recessed circular lenses, with a short hood and opaque backplate.
  box(housing,1.32,cy+.15,.18,1.78,cy+.20,.43);
  for(let k=0;k<16;k++){
   const a=k*Math.PI/8,b=(k+1)*Math.PI/8;
   triangle(lens,[1.55,cy,.191],[1.55+Math.cos(a)*.135,cy+Math.sin(a)*.135,.191],[1.55+Math.cos(b)*.135,cy+Math.sin(b)*.135,.191]);
  }
 }
 const t=at(segment,socket.sM)?.tangent;
 const q=socket.transform.rotation||[0,0,0,1];
 let tx=t?.[0]??2*q[1]*q[3],tz=t?.[2]??(1-2*q[1]*q[1]);
 const len=Math.hypot(tx,tz)||1,side=socket.lateralOffsetM<0?-1:1;
 tx=tx/len*side;tz=tz/len*side;
 const [x,y,z]=socket.transform.position;
 for(const [key,m] of local){const target=add(builders,key),p=m.positions;
  for(let i=0;i<p.length;i+=9){const points=[];for(let j=0;j<9;j+=3)points.push([x+p[i+j]*tz+p[i+j+2]*tx,y+p[i+j+1],z-p[i+j]*tx+p[i+j+2]*tz]);triangle(target,...points);}
 }
}

/** Adds low-poly visible road furniture. Builders receive only steel/concrete/marking keys. */
export function addFurniture(builders,sockets=[],segments=[]){if(!(builders instanceof Map))throw new Error('builders 必须是 Map');const steel=add(builders,'steel'),concrete=add(builders,'concrete'),marking=add(builders,'marking'),byId=new Map(segments.map(s=>[s.id,s]));let fixtures=0;
 for(const socket of sockets){if(!validSocket(socket))continue;const tags=socket.tags||[],[x,y,z]=socket.transform.position;
  if(tags.some(t=>t.startsWith('streetlight:'))){const starts=[steel.positions.length,concrete.positions.length];const sign=tags.includes('streetlight:left')?-1:1;box(concrete,x-.28,y-.05,z-.28,x+.28,y+.18,z+.28);box(steel,x-.09,y+.18,z-.09,x+.09,y+7,z+.09);beam(steel,[x,y+6.65,z],[x+sign*1.45,y+6.65,z],.07,.07);box(steel,x+sign*1.27,y+6.43,z-.22,x+sign*1.58,y+6.66,z+.22);const q=socket.transform.rotation||[0,0,0,1],sin=2*q[1]*q[3],cos=1-2*q[1]*q[1];for(const [m,start]of [[steel,starts[0]],[concrete,starts[1]]]){for(let i=start;i<m.positions.length;i+=3){const X=m.positions[i]-x,Z=m.positions[i+2]-z;m.positions[i]=x+X*cos+Z*sin;m.positions[i+2]=z-X*sin+Z*cos;const nx=m.normals[i],nz=m.normals[i+2];m.normals[i]=nx*cos+nz*sin;m.normals[i+2]=-nx*sin+nz*cos;}}fixtures++;}
  if(tags.includes('signal:vehicle')){signal(builders,socket,byId.get(socket.segmentId));fixtures++;}
  if(tags.includes('bridge:abutment'))box(concrete,x-1.1,y-1.1,z-1.1,x+1.1,y+.15,z+1.1);
 }
 for(const segment of segments){if(!segment?.bridge||!Array.isArray(segment.samples)||segment.samples.length<2)continue;const half=(segment.widthM||0)/2;if(!finite(half)||half<=0)continue;for(const side of [-1,1]){let previous=null;for(const sample of segment.samples){const t=sample.tangent||[1,0,0],l=Math.hypot(t[0],t[2]);if(!l)continue;const n=[-t[2]/l*side,t[0]/l*side],post=[sample.x+n[0]*(half-.15),sample.y+.05,sample.z+n[1]*(half-.15)];box(steel,post[0]-.045,post[1],post[2]-.045,post[0]+.045,post[1]+1.05,post[2]+.045);if(previous){beam(steel,[previous[0],previous[1]+.78,previous[2]],[post[0],post[1]+.78,post[2]],.06,.06);beam(steel,[previous[0],previous[1]+.32,previous[2]],[post[0],post[1]+.32,post[2]],.05,.05);}previous=post;}fixtures++;}
 }
 return {fixtures,materials:['steel','concrete','marking'],segmentCount:byId.size};
}
