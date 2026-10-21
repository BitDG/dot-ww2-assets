import * as THREE from 'three';
/** Only optional camouflage: common world-art-unit texel density, not per-door 0..1 stretching.
 * Box projection has deliberate axis seams on corners; this is not a continuous geodesic unwrap.
 */
export function projectCamouflageUV(root,{scale=1,tileSize=4}={}){
 if(!(scale>0&&tileSize>0))throw Error('Invalid camouflage UV scale');
 root.updateMatrixWorld(true);const old=new Set(),position=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();let vertices=0,meshes=0;
 root.traverse(o=>{if(!o.isMesh||o.material?.userData?.appearanceRole!=='armorPaint')return;
  const geometry=o.geometry.clone(),p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);normalMatrix.getNormalMatrix(o.matrixWorld);
  for(let i=0;i<p.count;i++){position.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);normal.fromBufferAttribute(n,i).applyNormalMatrix(normalMatrix);const x=Math.abs(normal.x),y=Math.abs(normal.y),z=Math.abs(normal.z);let u,v;
   if(z>=x&&z>=y){u=position.x;v=position.y;}else if(y>=x){u=position.x;v=position.z;}else{u=position.z;v=position.y;}
   uv[i*2]=u*scale/tileSize;uv[i*2+1]=v*scale/tileSize;
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));old.add(o.geometry);o.geometry=geometry;vertices+=p.count;meshes++;
 });
 const retained=new Set();root.traverse(o=>{if(o.isMesh)retained.add(o.geometry);});for(const g of old)if(!retained.has(g))g.dispose();
 return {type:'World-art-unit box projection',tileSize,scale,effectiveTileSize:tileSize/scale,vertices,meshes,scope:'armorPaint only; original appearance UV and bare-material UV are untouched',seams:'Axis seams at projection transitions; not a geodesic unwrap'};
}
