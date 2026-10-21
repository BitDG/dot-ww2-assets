import * as THREE from 'three';

/** Animate exact retained source triangle ranges, not guessed vertex regions.
 * The SDK compactor guarantees unchanged triangle order. */
export function bindGustavWheelFaces(model,asset,centers){
  const changes=[];let count=0,dead=false;
  const dispose=()=>{if(dead)return;dead=true;for(const c of changes){c.mesh.geometry=c.original;c.geometry.dispose();}};
  try{
    const components=asset?.metadata?.components;if(!Array.isArray(components))throw Error('缺少古斯塔夫组件绑定');
    for(const component of components){const parts=component.sourceParts?.filter(p=>/^wheel-face-(paint|cap)-/.test(p.name))??[];if(!parts.length)continue;
      const node=model.getObjectByName(component.name),mesh=node?.isMesh?node:node?.children.find(n=>n.isMesh);
      if(!mesh||Array.isArray(mesh.material))throw Error('轮面合批节点缺失');
      const original=mesh.geometry,total=(original.index?.count??original.attributes.position.count)/3;
      // Reject incomplete, overlapping or out-of-range provenance before writes.
      let end=0;for(const p of [...component.sourceParts].sort((a,b)=>a.start-b.start)){if(!Number.isInteger(p.start)||!Number.isInteger(p.count)||p.start!==end||p.count<1)throw Error('轮面三角形范围无效');end=p.start+p.count;}if(end!==total)throw Error('轮面三角形数量不匹配');
      const ranges=parts.map(p=>{const name=p.name.replace(/^wheel-face-(paint|cap)-/,'wheel-'),wheel=centers.get(name);if(!wheel)throw Error('轮面轮心缺失');count++;return {start:p.start*3,end:(p.start+p.count)*3,center:wheel.center,radius:wheel.radius};});
      const geometry=original.index?original.toNonIndexed():original.clone();const positions=geometry.attributes.position.array.slice(),normals=geometry.attributes.normal?.array.slice();
      changes.push({mesh,original,geometry,positions,normals,ranges});
    }
    if(asset.metadata.recipe.params.detail!=='low'&&count!==112)throw Error('古斯塔夫轮面装饰不完整');
    for(const c of changes)c.mesh.geometry=c.geometry;
    const apply=distance=>{if(dead)return;for(const c of changes){const a=c.geometry.attributes.position,n=c.geometry.attributes.normal;
      if(distance===0){a.array.set(c.positions);if(n)n.array.set(c.normals);a.needsUpdate=true;if(n)n.needsUpdate=true;continue;}
      for(const r of c.ranges){const angle=-distance/r.radius,co=Math.cos(angle),si=Math.sin(angle),[cx,cy]=r.center;
        for(let i=r.start;i<r.end;i++){const j=i*3,x=c.positions[j]-cx,y=c.positions[j+1]-cy;a.setXYZ(i,cx+x*co-y*si,cy+x*si+y*co,c.positions[j+2]);if(n){const nx=c.normals[j],ny=c.normals[j+1];n.setXYZ(i,nx*co-ny*si,nx*si+ny*co,c.normals[j+2]);}}}
      a.needsUpdate=true;if(n)n.needsUpdate=true;c.geometry.computeBoundingBox();c.geometry.computeBoundingSphere();}};
    return {apply,dispose,diagnostics:()=>({wheelFaceParts:count,ownedGeometries:changes.length})};
  }catch(error){dispose();throw error;}
}
