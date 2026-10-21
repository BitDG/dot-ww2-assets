import * as THREE from 'three';
import cameraFit from './assets/reference-camera.json' with {type:'json'};
let cached;
function subdivideLargeFaces(source){
 const g=source.index?source.toNonIndexed():source.clone(),keys=Object.keys(g.attributes),out=Object.fromEntries(keys.map(k=>[k,[]])),prefix=[0];
 const point=i=>Object.fromEntries(keys.map(k=>[k,Array.from({length:g.attributes[k].itemSize},(_,j)=>g.attributes[k].getComponent(i,j))]));
 const mid=(a,b)=>Object.fromEntries(keys.map(k=>[k,a[k].map((v,i)=>(v+b[k][i])/2)]));
 const distance=(a,b)=>a.position.reduce((sum,v,i)=>sum+(v-b.position[i])**2,0);
 function face(a,b,c,level=0){if(level<5&&Math.max(distance(a,b),distance(b,c),distance(c,a))>.32**2){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);face(a,ab,ca,level+1);face(ab,b,bc,level+1);face(ca,bc,c,level+1);face(ab,bc,ca,level+1);}else for(const v of [a,b,c])for(const k of keys)out[k].push(...v[k]);}
 for(let i=0;i<g.attributes.position.count;i+=3){face(point(i),point(i+1),point(i+2));prefix.push(out.position.length/9);}const result=new THREE.BufferGeometry();for(const k of keys)result.setAttribute(k,new THREE.Float32BufferAttribute(out[k],g.attributes[k].itemSize));result.normalizeNormals();result.userData.trianglePrefix=prefix;g.dispose();return result;
}
export async function loadReferenceFinish(){
 if(!cached)cached=(async()=>{
  async function read(url){if(url.protocol==='file:'){const fs=await import(/* @vite-ignore */ 'node:fs/promises');return new Uint8Array(await fs.readFile(url));}const response=await fetch(url);if(!response.ok)throw Error('Reference finish unavailable: '+response.status);return new Uint8Array(await response.arrayBuffer());}
  const [albedo,depth]=await Promise.all([read(new URL('./assets/reference-albedo.rgba',import.meta.url)),read(new URL('./assets/reference-depth.rgba',import.meta.url))]);
  if(albedo.length!==1024*1024*4||depth.length!==960*694*4)throw Error('Invalid reference finish byte length');return {albedo,depth};
 })().catch(e=>{cached=undefined;throw e;});return cached;
}
// UVs are baked in the canonical reference pose, so articulation moves the
// texture with each real 3D part. Hidden and occluded triangles use palette UVs.
export function applyReferenceFinish(root,finish,params){
 const {paint,weathering,markings}=params;
 const a=THREE.MathUtils.degToRad(cameraFit.azimuth),e=THREE.MathUtils.degToRad(cameraFit.elevation),D=cameraFit.distance,k=cameraFit.pixelsPerMetre,[tx,ty]=cameraFit.translation;
 const dir=new THREE.Vector3(Math.cos(a)*Math.cos(e),Math.sin(e),Math.sin(a)*Math.cos(e)),right=new THREE.Vector3(Math.sin(a),0,-Math.cos(a)),up=dir.clone().cross(right);
 const turret=root.getObjectByName('turret-pivot'),gun=root.getObjectByName('gun-elevation-pivot'),savedTurret=turret.quaternion.clone(),savedGun=gun.quaternion.clone();turret.rotation.set(0,THREE.MathUtils.degToRad(-35),0);gun.rotation.set(.025,0,0);root.updateMatrixWorld(true);
 const pixels=finish.albedo.slice(),texture=new THREE.DataTexture(pixels,1024,1024);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 const materials=new Map(),palette=new Map(),tint=new THREE.Color(paint),base=new THREE.Color('#73795b');let projected=0,inferred=0;
 const toSRGB=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055,toLinear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 const tintRGB=[tint.r/base.r,tint.g/base.g,tint.b/base.b];
 function mapped(mat){if(materials.has(mat))return materials.get(mat);const index=materials.size;if(index>=16)throw Error('Reference palette material budget');
  const px=(index%8)*128,py=704+Math.floor(index/8)*128;palette.set(mat,{px,py});const m=mat.clone(),color=mat.color.clone();
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=((py+y)*1024+px+x)*4,hash=Math.sin(x*12.9898+y*78.233)*43758.5453,noise=1-.06*(hash-Math.floor(hash));pixels.set([color.r,color.g,color.b].map(v=>Math.round(255*toSRGB(Math.min(1,v*noise)))).concat(255),i);}
  m.color.set('white');m.map=texture;materials.set(mat,m);return m;
 }
 // Relative paint tint affects only observed painted albedo; metallic hardware
 // and rubber remain photo-colored. Palette tiles already use the requested paint.
 for(let i=0;i<694*1024*4;i+=4)if(pixels[i+3]){const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255,x=(i/4)%1024,y=693-Math.floor(i/4096),star=(x>505&&x<555&&y>215&&y<278)||(x>720&&x<785&&y>185&&y<225);
  if(!markings&&star&&r>.60&&g>.60&&b>.35){pixels.set([tint.r,tint.g,tint.b].map(v=>Math.round(255*toSRGB(v))).concat(pixels[i+3]),i);continue;}
  if(g>=r*.95&&b<g*.93)for(let j=0;j<3;j++){let value=toLinear(pixels[i+j]/255)*tintRGB[j];const clean=Math.max(0,1-weathering/.35)*.45;value=value*(1-clean)+[tint.r,tint.g,tint.b][j]*clean;value*=1-Math.max(0,weathering-.35)*.25;pixels[i+j]=Math.min(255,Math.round(255*toSRGB(value)));}}
 const retired=new Set();
 root.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;if(Array.isArray(mesh.material))throw Error('Reference bake expects a single material');const source=mesh.material,m=mapped(source),tile=palette.get(source),g=subdivideLargeFaces(mesh.geometry),pos=g.attributes.position,uv=new Float32Array(pos.count*2),v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],screen=[];
  for(let i=0;i<pos.count;i+=3){const center=new THREE.Vector3();for(let j=0;j<3;j++){v[j].fromBufferAttribute(pos,i+j).applyMatrix4(mesh.matrixWorld);center.add(v[j]);const f=k*D/(D-v[j].dot(dir));screen[j]=[tx+f*v[j].dot(right),ty-f*v[j].dot(up)];}center.multiplyScalar(1/3);const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),f=k*D/(D-center.dot(dir)),sx=tx+f*center.dot(right),sy=ty-f*center.dot(up),x=Math.floor(sx),y=Math.floor(sy);let observed=false;
   if(normal.dot(dir)>.000001&&x>=0&&x<960&&y>=0&&y<694){const di=((693-y)*960+x)*4,encoded=finish.depth[di]*65536+finish.depth[di+1]*256+finish.depth[di+2],depth=encoded/16777215*100,ai=((693-y)*1024+x)*4;observed=Math.abs(depth-(D-center.dot(dir)))<.25&&finish.albedo[ai+3]>=128;}
   for(let j=0;j<3;j++){if(observed){uv[(i+j)*2]=screen[j][0]/1024;uv[(i+j)*2+1]=(694-screen[j][1])/1024;}else{const old=g.attributes.uv,u=old?old.getX(i+j):pos.getX(i+j),w=old?old.getY(i+j):pos.getY(i+j);uv[(i+j)*2]=(tile.px+2+((u%1+1)%1)*124)/1024;uv[(i+j)*2+1]=(tile.py+2+((w%1+1)%1)*124)/1024;}}
   if(observed)projected++;else inferred++;
  }
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));if(mesh.userData.sourceParts){const prefix=g.userData.trianglePrefix;mesh.userData.sourceParts=mesh.userData.sourceParts.map(r=>({...r,start:prefix[r.start],count:prefix[r.start+r.count]-prefix[r.start]}));}delete g.userData.trianglePrefix;retired.add(mesh.geometry);mesh.geometry=g;mesh.material=m;
 });
 // Source alpha is a measurement-coverage tag, never object transparency.
 // The exported and PGF-rendered albedo must remain opaque on every triangle.
 for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 root.traverse(o=>{if(o.geometry)retired.delete(o.geometry);});retired.forEach(g=>g.dispose());turret.quaternion.copy(savedTurret);gun.quaternion.copy(savedGun);root.updateMatrixWorld(true);root.userData.referenceFinish={projectedTriangles:projected,inferredTriangles:inferred,method:'de-lit source photo UV projection with geometry depth visibility',personExcluded:true,hiddenConfidence:.3};
 const oldMaps=new Set();for(const mat of materials.keys()){if(mat.map)oldMaps.add(mat.map);mat.dispose();}root.traverse(o=>{if(o.isMesh)for(const key of ['map','normalMap','roughnessMap','metalnessMap'])oldMaps.delete(o.material[key]);});oldMaps.forEach(t=>t.dispose());
}
