/* Mapbox Earcut v2.2.4: adapted planar triangulation routines.
ISC License

Copyright (c) 2016, Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
*/
/** PGF planar geometry. Ear triangulation adapted from Mapbox earcut v2.2.4 (ISC).
 * No renderer, I/O, global state or random numbers. See licenses/earcut.txt. */
export const EARTH_RADIUS = 6378137;
export function project(lon, lat, origin) {
  const d=Math.PI/180; return [(lon-origin.lon)*d*EARTH_RADIUS*Math.cos(origin.lat*d), -(lat-origin.lat)*d*EARTH_RADIUS];
}
export function unproject(x,z,origin){const d=Math.PI/180;return [origin.lon+x/(d*EARTH_RADIUS*Math.cos(origin.lat*d)),origin.lat-z/(d*EARTH_RADIUS)];}
export function signedArea(r){let a=0;for(let i=0,j=r.length-1;i<r.length;j=i++)a+=r[j][0]*r[i][1]-r[i][0]*r[j][1];return a/2;}
export function cleanRing(r){
  const out=[]; for(const p of r){if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))throw new Error('无效多边形坐标');const q=out.at(-1);if(!q||Math.hypot(q[0]-p[0],q[1]-p[1])>1e-8)out.push([p[0],p[1]]);}
  if(out.length>1&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<1e-8)out.pop();return out;
}
export function pointInRing(p,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
export function pointInPolygon(p,rings){return pointInRing(p,rings[0])&&!rings.slice(1).some(r=>pointInRing(p,r));}
export function ringBounds(r){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const [x,y] of r){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return [minX,minY,maxX,maxY];}
export function distanceSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function clipSegment(a,b,box){let t0=0,t1=1;const dx=b[0]-a[0],dy=b[1]-a[1],p=[-dx,dx,-dy,dy],q=[a[0]-box[0],box[2]-a[0],a[1]-box[1],box[3]-a[1]];for(let i=0;i<4;i++){if(Math.abs(p[i])<1e-15){if(q[i]<0)return null;}else{const t=q[i]/p[i];if(p[i]<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);if(t0>t1)return null;}}return [[a[0]+dx*t0,a[1]+dy*t0],[a[0]+dx*t1,a[1]+dy*t1]];}
// Linked-ring ear slicing, including hole bridging and diagonal recovery. Z-order
// acceleration is omitted: the caller caps ring size and runs in a worker.
function Node(i,x,y){this.i=i;this.x=x;this.y=y;this.prev=null;this.next=null;this.steiner=false;}
function insertNode(i,x,y,last){const p=new Node(i,x,y);if(!last)p.prev=p.next=p;else{p.next=last.next;p.prev=last;last.next.prev=p;last.next=p;}return p;}
function removeNode(p){p.next.prev=p.prev;p.prev.next=p.next;}
function eq(a,b){return a.x===b.x&&a.y===b.y;}
function area(a,b,c){return (b.y-a.y)*(c.x-b.x)-(b.x-a.x)*(c.y-b.y);}
function list(data,start,end,cw){let sum=0,last;for(let i=start,j=end-2;i<end;i+=2){sum+=(data[j]-data[i])*(data[i+1]+data[j+1]);j=i;}if(cw===(sum>0)){for(let i=start;i<end;i+=2)last=insertNode(i/2,data[i],data[i+1],last);}else{for(let i=end-2;i>=start;i-=2)last=insertNode(i/2,data[i],data[i+1],last);}if(last&&eq(last,last.next)){removeNode(last);last=last.next;}return last;}
function filter(start,end){if(!start)return start;if(!end)end=start;let p=start,again;do{again=false;if(!p.steiner&&(eq(p,p.next)||Math.abs(area(p.prev,p,p.next))<1e-12)){removeNode(p);p=end=p.prev;if(p===p.next)break;again=true;}else p=p.next;}while(again||p!==end);return end;}
function inTri(ax,ay,bx,by,cx,cy,px,py){return (cx-px)*(ay-py)>=(ax-px)*(cy-py)&&(ax-px)*(by-py)>=(bx-px)*(ay-py)&&(bx-px)*(cy-py)>=(cx-px)*(by-py);}
function isEar(e){const a=e.prev,b=e,c=e.next;if(area(a,b,c)>=0)return false;let p=c.next;while(p!==a){if(inTri(a.x,a.y,b.x,b.y,c.x,c.y,p.x,p.y)&&area(p.prev,p,p.next)>=0)return false;p=p.next;}return true;}
function local(a,b){return area(a.prev,a,a.next)<0?area(a,b,a.next)>=0&&area(a,a.prev,b)>=0:area(a,b,a.prev)<0||area(a,a.next,b)<0;}
function sign(n){return n>0?1:n<0?-1:0;}
function onSegment(p,q,r){return q.x<=Math.max(p.x,r.x)&&q.x>=Math.min(p.x,r.x)&&q.y<=Math.max(p.y,r.y)&&q.y>=Math.min(p.y,r.y);}
function intersects(p1,q1,p2,q2){const o1=sign(area(p1,q1,p2)),o2=sign(area(p1,q1,q2)),o3=sign(area(p2,q2,p1)),o4=sign(area(p2,q2,q1));return (o1!==o2&&o3!==o4)||(!o1&&onSegment(p1,p2,q1))||(!o2&&onSegment(p1,q2,q1))||(!o3&&onSegment(p2,p1,q2))||(!o4&&onSegment(p2,q1,q2));}
function intersectsRing(a,b){let p=a;do{if(p.i!==a.i&&p.next.i!==a.i&&p.i!==b.i&&p.next.i!==b.i&&intersects(p,p.next,a,b))return true;p=p.next;}while(p!==a);return false;}
function middleInside(a,b){let p=a,inside=false;const px=(a.x+b.x)/2,py=(a.y+b.y)/2;do{if((p.y>py)!==(p.next.y>py)&&p.next.y!==p.y&&px<(p.next.x-p.x)*(py-p.y)/(p.next.y-p.y)+p.x)inside=!inside;p=p.next;}while(p!==a);return inside;}
function diagonal(a,b){return a.next.i!==b.i&&a.prev.i!==b.i&&!intersectsRing(a,b)&&((local(a,b)&&local(b,a)&&middleInside(a,b)&&(area(a.prev,a,b.prev)||area(a,b.prev,b)))||(eq(a,b)&&area(a.prev,a,a.next)>0&&area(b.prev,b,b.next)>0));}
function splitPolygon(a,b){const a2=new Node(a.i,a.x,a.y),b2=new Node(b.i,b.x,b.y),an=a.next,bp=b.prev;a.next=b;b.prev=a;a2.next=an;an.prev=a2;b2.next=a2;a2.prev=b2;bp.next=b2;b2.prev=bp;return b2;}
function cut(ear,tri,pass=0){if(!ear)return;let stop=ear;while(ear.prev!==ear.next){const prev=ear.prev,next=ear.next;if(isEar(ear)){tri.push(prev.i,ear.i,next.i);removeNode(ear);ear=next.next;stop=next.next;continue;}ear=next;if(ear===stop){if(!pass)cut(filter(ear),tri,1);else if(pass===1){let p=filter(ear),start=p;do{const a=p.prev,b=p.next.next;if(!eq(a,b)&&intersects(a,p,p.next,b)&&local(a,b)&&local(b,a)){tri.push(a.i,p.i,b.i);removeNode(p);removeNode(p.next);p=start=b;}p=p.next;}while(p!==start);cut(filter(p),tri,2);}else{let a=ear;do{let b=a.next.next;while(b!==a.prev){if(a.i!==b.i&&diagonal(a,b)){let c=splitPolygon(a,b);a=filter(a,a.next);c=filter(c,c.next);cut(a,tri);cut(c,tri);return;}b=b.next;}a=a.next;}while(a!==ear);}break;}}}
function leftmost(start){let p=start,left=start;do{if(p.x<left.x||(p.x===left.x&&p.y<left.y))left=p;p=p.next;}while(p!==start);return left;}
function bridge(hole,outer){let p=outer,qx=-Infinity,m;const hx=hole.x,hy=hole.y;do{if(hy<=p.y&&hy>=p.next.y&&p.next.y!==p.y){const x=p.x+(hy-p.y)*(p.next.x-p.x)/(p.next.y-p.y);if(x<=hx&&x>qx){qx=x;m=p.x<p.next.x?p:p.next;if(x===hx)return m;}}p=p.next;}while(p!==outer);if(!m)return null;const stop=m,mx=m.x,my=m.y;let tanMin=Infinity;p=m;do{if(hx>=p.x&&p.x>=mx&&hx!==p.x&&inTri(hy<my?hx:qx,hy,mx,my,hy<my?qx:hx,hy,p.x,p.y)){const tan=Math.abs(hy-p.y)/(hx-p.x);if(local(p,hole)&&(tan<tanMin||(tan===tanMin&&(p.x>m.x||(p.x===m.x&&area(m.prev,m,p.prev)<0&&area(p.next,m,m.next)<0))))){m=p;tanMin=tan;}}p=p.next;}while(p!==stop);return m;}
export function triangulate(rings){
  const cleaned=rings.map(cleanRing).filter(r=>r.length>=3);if(!cleaned.length)return {points:[],indices:[]};const data=[],holes=[];cleaned.forEach((r,i)=>{if(i)holes.push(data.length/2);r.forEach(p=>data.push(...p));});
  let outer=list(data,0,holes.length?holes[0]*2:data.length,true);if(!outer||outer.next===outer.prev)return {points:[],indices:[]};
  const queue=holes.map((h,i)=>leftmost(list(data,h*2,i+1<holes.length?holes[i+1]*2:data.length,false))).sort((a,b)=>a.x-b.x);
  for(const h of queue){const b=bridge(h,outer);if(!b)throw new Error('内环无法连接到外环');const rev=splitPolygon(b,h);filter(rev,rev.next);outer=filter(b,b.next);}
  const indices=[];cut(outer,indices);const points=cleaned.flat();let measured=0;for(let i=0;i<indices.length;i+=3)measured+=Math.abs(signedArea([points[indices[i]],points[indices[i+1]],points[indices[i+2]]]));const expected=Math.abs(signedArea(cleaned[0]))-cleaned.slice(1).reduce((s,r)=>s+Math.abs(signedArea(r)),0);
  if(expected<=1e-10||Math.abs(measured-expected)>Math.max(1e-5,expected*1e-5))throw new Error('轮廓三角化不完整或自相交，已拒绝生成');return {points,indices};
}
export function newMeshBuilder(){return {positions:[],normals:[],uv:[]};}
export function triangle(m,a,b,c){const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...n);if(len<1e-10)return;for(const p of [a,b,c]){m.positions.push(...p);m.normals.push(...n.map(v=>v/len));m.uv.push(p[0]/10,p[2]/10);}}
export function upwardTriangle(m,a,b,c){const y=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);if(y>=0)triangle(m,a,b,c);else triangle(m,a,c,b);}
// Clip already-triangulated water, preserving holes and disconnected pieces.
export function clippedUpwardTriangle(m,box,...points){
  for(const [axis,edge,sign] of [[0,box[0],1],[0,box[2],-1],[2,box[1],1],[2,box[3],-1]]){
    const out=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],ai=(a[axis]-edge)*sign>=0,bi=(b[axis]-edge)*sign>=0;
      if(ai)out.push(a);
      if(ai!==bi){const t=(edge-a[axis])/(b[axis]-a[axis]),p=a.map((v,k)=>v+(b[k]-v)*t);p[axis]=edge;out.push(p);}
    }
    points=out;
  }
  for(let i=1;i+1<points.length;i++)upwardTriangle(m,points[0],points[i],points[i+1]);
}
export function primitive(m,materialId){const count=m.positions.length/3,indices=count>65535?new Uint32Array(count):new Uint16Array(count);for(let i=0;i<count;i++)indices[i]=i;return {positions:new Float32Array(m.positions),normals:new Float32Array(m.normals),uv0:new Float32Array(m.uv),indices,materialId};}
export function boundsFromPositions(primitives){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of primitives)for(let i=0;i<p.positions.length;i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p.positions[i+k]);max[k]=Math.max(max[k],p.positions[i+k]);}return min[0]===Infinity?{min:[0,0,0],max:[0,0,0]}:{min,max};}
export function srgbToLinear(hex){if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('颜色必须为 #RRGGBB');return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);});}
