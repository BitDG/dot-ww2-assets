import {Vector3,MathUtils} from 'three';
/** Fit actual visible authored vertices, not a long assembly's loose sphere.
 * Scope: static authored Mesh geometry only; no instancing, skinning or morphing.
 * The host owns camera target, clipping, resize preservation and the render loop.
 * Occupancy measures projected width/height. A 5% edge guard also keeps asymmetric
 * geometry fully visible when its world-bounds center differs from its image center.
 */
export function projectedModelFitDistance(object,camera,center,direction,occupancy=.75){
 const back=direction.clone().normalize(),right=new Vector3().crossVectors(camera.up,back).normalize(),up=new Vector3().crossVectors(back,right).normalize();
 if(right.lengthSq()<.5||!(camera.aspect>0))return undefined;
 const vertical=Math.tan(MathUtils.degToRad(camera.fov*.5)),horizontal=vertical*camera.aspect,points=[];
 let high=.001,low=.001;const point=new Vector3();object.updateWorldMatrix(true,true);
 object.traverseVisible(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry?.getAttribute('position');if(!positions)return;
  for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).sub(center);const x=point.dot(right)/horizontal,y=point.dot(up)/vertical,z=point.dot(back);points.push(x,y,z);low=Math.max(low,z+.001);high=Math.max(high,z+Math.abs(x)/occupancy,z+Math.abs(y)/occupancy,z+.001);}
 });
 if(!points.length||!Number.isFinite(high))return undefined;
 function contained(distance){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let i=0;i<points.length;i+=3){const depth=distance-points[i+2],x=points[i]/depth,y=points[i+1]/depth;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}return maxX-minX<=2*occupancy&&maxY-minY<=2*occupancy&&Math.max(-minX,maxX,-minY,maxY)<=.95;}
 for(let i=0;i<32;i++){const middle=(low+high)*.5;if(contained(middle))high=middle;else low=middle;}
 return high;
}
