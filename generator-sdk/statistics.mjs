/** Count actual exported node instances, not only prototype meshes. */
export function assetStatistics(asset){
  const nodes=new Map(asset.nodes.map(n=>[n.id,n])),counts=new Map(),seen=new Set();
  function visit(id,depth){if(depth>128||seen.has(id))throw Error('Repeated node or excessive depth');seen.add(id);const node=nodes.get(id);if(!node)throw Error('Missing node');if(node.meshId)counts.set(node.meshId,(counts.get(node.meshId)||0)+1);for(const child of node.children||[])visit(child,depth+1);}
  for(const root of asset.rootNodeIds)visit(root,0);
  let triangles=0,renderedTriangles=0,vertices=0,instances=0,bytes=0,draws=0;
  for(const mesh of asset.meshes){const n=counts.get(mesh.id)||0;instances+=n;for(const p of mesh.primitives){triangles+=p.indices.length/3;renderedTriangles+=p.indices.length/3*n;vertices+=p.positions.length/3;draws+=n;for(const key of ['positions','normals','colors','uv0','uv1','tangents','indices','joints','weights'])bytes+=p[key]?.byteLength||0;for(const t of p.morphTargets||[])bytes+=t.positions.byteLength+(t.normals?.byteLength||0);}}
  for(const skin of asset.skins||[])bytes+=skin.inverseBindMatrices.byteLength;
  for(const clip of asset.animations||[])for(const track of clip.tracks)bytes+=track.times.byteLength+track.values.byteLength;
  for(const t of asset.textures||[])bytes+=t.bytes.byteLength;
  return {triangles,renderedTriangles,vertices,instances,draws,bytes,nodes:asset.nodes.length,meshes:asset.meshes.length,textures:asset.textures?.length||0,materials:asset.materials.length,dimensions:asset.bounds.max.map((v,i)=>v-asset.bounds.min[i])};
}
