import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export {THREE};
export const TAU=Math.PI*2;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function random(seed){let s=2166136261;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),16777619)>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
export function material(color,metalness=0,roughness=.6){return new THREE.MeshStandardMaterial({color,metalness,roughness});}
export function part(root,name,geometry,mat,position=[0,0,0]){const p=geometry.attributes.position,idx=geometry.index?.array??Array.from({length:p.count},(_,i)=>i),keep=[];const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<idx.length;i+=3){a.fromBufferAttribute(p,idx[i]);b.fromBufferAttribute(p,idx[i+1]).sub(a);c.fromBufferAttribute(p,idx[i+2]).sub(a);if(b.cross(c).lengthSq()>1e-30)keep.push(idx[i],idx[i+1],idx[i+2]);}geometry.setIndex(keep);geometry.normalizeNormals();const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.position.fromArray(position);root.add(mesh);return mesh;}
export function box(root,name,size,mat,position,round=0,detail=2){return part(root,name,round?new RoundedBoxGeometry(...size,detail,Math.min(round,...size.map(v=>v*.49))):new THREE.BoxGeometry(...size),mat,position);}
export function cylinder(root,name,radius,height,mat,position,segments=32,radiusTop=radius){return part(root,name,new THREE.CylinderGeometry(radiusTop,radius,height,segments),mat,position);}
export function rod(root,name,start,end,radius,mat,segments=16){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),delta=b.clone().sub(a);const mesh=cylinder(root,name,radius,delta.length(),mat,a.clone().add(b).multiplyScalar(.5).toArray(),segments);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
export function extrude(shape,depth,curveSegments=12){const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments});g.computeVertexNormals();return g;}
export function circlePath(radius,segments=32,clockwise=true){const path=new THREE.Path();for(let i=0;i<=segments;i++){const a=(clockwise?-1:1)*TAU*i/segments;if(i===0)path.moveTo(radius*Math.cos(a),radius*Math.sin(a));else path.lineTo(radius*Math.cos(a),radius*Math.sin(a));}return path;}
export function polygon(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
export function roundedRectangle(w,h,r,segments=6){r=Math.min(r,w*.49,h*.49);const points=[];for(const [cx,cy,start]of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]])for(let i=0;i<=segments;i++){const a=start+i*Math.PI/2/segments;points.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return polygon(points);}
export function ring(root,name,outer,inner,height,mat,position,segments=32){const s=polygon(Array.from({length:segments},(_,i)=>[outer*Math.cos(TAU*i/segments),outer*Math.sin(TAU*i/segments)]));s.holes.push(circlePath(inner,segments));const g=extrude(s,height);g.rotateX(-Math.PI/2);g.translate(0,-height/2,0);return part(root,name,g,mat,position);}
/** Sample an actual helical radial surface, including caps/rims. Radius is a function of phase. */
export function threadGeometry(major,minor,length,pitch,segments=36,internal=false,outerRadius=major*1.6,starts=1){
  const rows=Math.ceil(length/pitch*12),positions=[],uv=[],indices=[];
  if(rows*segments>500000)throw Error('螺纹超过规则网格预算，请增大螺距或减少长度/细分');
  const profile=f=>{f=((f%1)+1)%1;return f<.125?1:f<.5?1-(f-.125)/.375:f<.625?0:(f-.625)/.375;};
  for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){const angle=TAU*i/segments,y=length*j/rows;const envelope=clamp(Math.min(y,length-y)/(pitch*.5),0,1),r=minor+(major-minor)*profile(y/pitch-angle/TAU*starts)*envelope;positions.push(r*Math.cos(angle),y,r*Math.sin(angle));uv.push(i/segments,y/pitch);}
  for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(...(internal?[a,a+1,b,a+1,b+1,b]:[a,b,a+1,a+1,b,b+1]));}
  // End rims connect the threaded bore to the exterior nut, or cap a screw shaft.
  const outerLoops=[];for(const j of [0,rows]){const y=length*j/rows,base=positions.length/3;outerLoops.push(base);for(let i=0;i<=segments;i++){const a=TAU*i/segments,r=internal?(typeof outerRadius==='function'?outerRadius(a):outerRadius):0;positions.push(r*Math.cos(a),y,r*Math.sin(a));uv.push(i/segments,j/rows);}for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=base+i;const face=[a,b,a+1,a+1,b,b+1];indices.push(...((j===0)===internal?face:face.reverse()));}}
  if(internal)for(let i=0;i<segments;i++){const a=outerLoops[0]+i,b=outerLoops[1]+i;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** Spur gear perimeter with involute flanks and a through bore. */
export function gearGeometry(radius,teeth,width,segments=36){
  const base=radius*Math.cos(Math.PI/9),root=radius*(1-Math.min(.22,2.5/teeth)),tip=radius*(1+Math.min(.1,2/teeth)),points=[],inv=r=>{const t=Math.sqrt(Math.max(0,(r/base)**2-1));return t-Math.atan(t);},pitchInv=inv(radius),half=Math.PI/(2*teeth);
  const samples=Math.max(3,Math.ceil(segments/12));
  for(let i=0;i<teeth;i++){const center=TAU*i/teeth,low=Math.max(base,root);points.push([root*Math.cos(center-Math.PI/teeth),root*Math.sin(center-Math.PI/teeth)]);for(let j=0;j<=samples;j++){const r=low+(tip-low)*j/samples,a=center-half+inv(r)-pitchInv;points.push([r*Math.cos(a),r*Math.sin(a)]);}for(let j=samples;j>=0;j--){const r=low+(tip-low)*j/samples,a=center+half-inv(r)+pitchInv;points.push([r*Math.cos(a),r*Math.sin(a)]);}points.push([root*Math.cos(center+Math.PI/teeth),root*Math.sin(center+Math.PI/teeth)]);}
  const s=polygon(points);s.holes.push(circlePath(radius*.28,segments));const g=extrude(s,width);g.translate(0,0,-width/2);return g;
}
/** Coplanar equal-radius tube union. Adjacent arms share their exact miter boundary.
 * Both skins and end annuli are generated, leaving connected open bores. */
export function pipeGeometry(radius,length,angles,segments){
  angles=angles.map(a=>(a%TAU+TAU)%TAU).sort((a,b)=>a-b);const positions=[],uv=[],indices=[];
  for(let arm=0;arm<angles.length;arm++){
    const angle=angles[arm],next=(angles[(arm+1)%angles.length]-angle+TAU)%TAU,prev=(angle-angles[(arm-1+angles.length)%angles.length]+TAU)%TAU;
    const start=positions.length/3;
    for(const [r,end]of [[radius,false],[radius,true],[radius*.82,false],[radius*.82,true]])for(let i=0;i<=segments;i++){
      const t=TAU*i/segments,x=r*Math.cos(t),y=r*Math.sin(t),s=end?length:(x>=0?x/Math.tan(next/2):-x/Math.tan(prev/2));
      if(!end&&s>length*.98)throw Error('管长不足以容纳该半径和分支角度，请增加长度');
      positions.push(s*Math.sin(angle)+x*Math.cos(angle),y,s*Math.cos(angle)-x*Math.sin(angle));uv.push(i/segments,end?length/radius:0);
    }
    const n=segments+1;for(let i=0;i<segments;i++)for(const [a,b,flip]of [[start,start+n,true],[start+2*n,start+3*n,false],[start+n,start+3*n,true]]){const f=[a+i,b+i,a+i+1,a+i+1,b+i,b+i+1];indices.push(...(flip?f.reverse():f));}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function disposeTree(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
