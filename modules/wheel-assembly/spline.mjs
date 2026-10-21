import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {compactGeometry} from './geometry.mjs';

// Normalized, closed outlines are shared by the editor, Node adapter and Worker.
export const centerOutline = [[-.86,-.64],[-.24,-.86],[.58,-.60],[.96,-.20],[.64,.04],[.94,.32],[.56,.76],[-.02,.66],[-.40,.86],[-.88,.46],[-.58,.10],[-.96,-.18]];
export const shoulderOutline = [[-.96,-.70],[.10,-.88],[.94,-.60],[.94,-.12],[.76,.20],[.98,.60],[.10,.76],[-.40,.54],[-.96,.64],[-.96,.10],[-.64,-.08],[-.96,-.24]];
export const spokeOutline = [[-.65,-1],[.35,-1],[.82,-.40],[.62,.88],[.12,1],[-.55,.88],[-.36,-.10]];
export function signedArea(points) {return points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function intersects(a,b,c,d) {
  const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
  if(ab1*ab2 < -1e-12 && cd1*cd2 < -1e-12)return true;
  const on=(a,b,c)=>Math.abs(cross(a,b,c))<1e-9&&c[0]>=Math.min(a[0],b[0])-1e-9&&c[0]<=Math.max(a[0],b[0])+1e-9&&c[1]>=Math.min(a[1],b[1])-1e-9&&c[1]<=Math.max(a[1],b[1])+1e-9;
  return on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
export function validateOutline(value,label='样条轮廓') {
  if(!Array.isArray(value)||value.length<3||value.length>32)throw Error(`${label}需要 3–32 个控制点`);
  const points=value.map(p=>{
    if(!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1))throw Error(`${label}控制点必须在 [-1,1] 内`);
    return [...p];
  });
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<.004)throw Error(`${label}相邻控制点过近`);
    for(let j=i+1;j<points.length;j++){
      if(j===i+1||i===0&&j===points.length-1)continue;
      if(intersects(a,b,points[j],points[(j+1)%points.length]))throw Error(`${label}存在自交`);
    }
  }
  if(Math.abs(signedArea(points))<.02)throw Error(`${label}面积过小`);
  return points;
}
export function sampleOutline(points,smooth=0,segments=4) {
  const source=validateOutline(points);
  if(!smooth)return source;
  const curve=new THREE.CatmullRomCurve3(source.map(([x,y])=>new THREE.Vector3(x,y,0)),true,'centripetal');
  const sampled=[];
  for(let i=0;i<source.length;i++)for(let j=0;j<segments;j++){
    const t=j/segments,a=source[i],b=source[(i+1)%source.length],c=curve.getPoint((i+t)/source.length);
    sampled.push([THREE.MathUtils.lerp(a[0]+(b[0]-a[0])*t,c.x,smooth),THREE.MathUtils.lerp(a[1]+(b[1]-a[1])*t,c.y,smooth)]);
  }
  // Sampling can introduce crossings even when the control polygon is simple.
  for(let i=0;i<sampled.length;i++)for(let j=i+2;j<sampled.length;j++){
    if(i===0&&j===sampled.length-1)continue;
    if(intersects(sampled[i],sampled[(i+1)%sampled.length],sampled[j],sampled[(j+1)%sampled.length]))throw Error('平滑样条存在自交，请降低平滑度');
  }
  return sampled;
}
export function shapeFromPoints(points) {
  const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();return shape;
}
export function reverseWinding(geometry){
  if(geometry.index){const a=geometry.index;for(let i=0;i<a.count;i+=3){const b=a.getX(i+1);a.setX(i+1,a.getX(i+2));a.setX(i+2,b);}}
  else for(const attr of Object.values(geometry.attributes))for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){const b=attr.array[(i+1)*attr.itemSize+k];attr.array[(i+1)*attr.itemSize+k]=attr.array[(i+2)*attr.itemSize+k];attr.array[(i+2)*attr.itemSize+k]=b;}
}

/** Extrude a planar unit, then wrap its vertices onto the actual curved crown. */
export function crownBlock(points,{center,halfWidth,halfLength,radius,treadHalf,crownDrop,depth,smooth=0,mirror=false,sipeWidth=0,surface=null,embedding=Math.min(.0005,depth*.15)}) {
  const contour=sampleOutline(points,smooth),polygon=contour.map(([u,v])=>[(mirror?-u:u)*halfWidth,v*halfLength]);
  const shape=shapeFromPoints(polygon),parts=[];
  const shortestEdge=Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length];return Math.hypot(a[0]-b[0],a[1]-b[1]);}));
  const bevel=surface?Math.min(.0008,shortestEdge*.18,depth*.12,sipeWidth?sipeWidth*.18:Infinity):0;
  const zOffset=-embedding+bevel;
  if(sipeWidth){
    const line=[[-.45,-.10],[-.08,-.07],[0,.025],[.17,.01],[.45,.075]],w=sipeWidth/halfLength/2;
    const ribbon=line.map(([x,y])=>[x,y-w]).concat([...line].reverse().map(([x,y])=>[x,y+w]));
    const inside=([x,y])=>{let on=false;for(let i=0,j=contour.length-1;i<contour.length;j=i++){const a=contour[i],b=contour[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])on=!on;}return on;};
    const crossing=ribbon.some((a,i)=>contour.some((b,j)=>intersects(a,ribbon[(i+1)%ribbon.length],b,contour[(j+1)%contour.length])));
    if(ribbon.every(inside)&&!crossing){
      const hole=ribbon.map(([u,v])=>[(mirror?-u:u)*halfWidth,v*halfLength]);
      const path=new THREE.Path();path.moveTo(...hole[0]);hole.slice(1).forEach(p=>path.lineTo(...p));path.closePath();shape.holes.push(path);
      // The hole has a physical floor, 1.3 mm below the tread surface.
      parts.push(new THREE.ExtrudeGeometry(shapeFromPoints(hole),{depth:depth+embedding-bevel-Math.min(.0013,depth*.6),bevelEnabled:false,curveSegments:1}));
    }
  }
  parts.unshift(new THREE.ExtrudeGeometry(shape,{depth:depth+embedding-2*bevel,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:1}));
  const geometry=parts.length>1?mergeGeometries(parts,false):parts[0];if(parts.length>1)parts.forEach(g=>g.dispose());
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const height=position.getZ(i)+zOffset;
    if(surface){
      const t=Math.max(0,Math.min(1,1-height/depth)),flare=1+.10*t*t*(3-2*t);
      position.setXYZ(i,...surface.map(center+position.getX(i)*flare,position.getY(i)*flare,height));
    }else{
      const x=center+position.getX(i),angle=position.getY(i)/radius,r=radius-crownDrop*(x/treadHalf)**2+height;
      position.setXYZ(i,x,r*Math.cos(angle),r*Math.sin(angle));
    }
  }
  if(surface)geometry.userData.rootSamples=polygon.map(([x,v])=>surface.map(center+x*1.10,v*1.10,-embedding));
  // (u,v,height) -> (X, radius*cos(v/R), radius*sin(v/R)) reverses handedness.
  reverseWinding(geometry);geometry.computeVertexNormals();geometry.computeBoundingBox();
  return compactGeometry(geometry,Math.PI/4);
}
