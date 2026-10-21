export function enforceBudget(asset, budget) {
  if (budget === undefined) return;
  if (!budget || typeof budget !== 'object' || Array.isArray(budget)) throw Error('资源预算无效');
  const allowed = new Set(['maxTriangles', 'maxOutputBytes', 'maxMaterialSlots', 'maxDraws', 'maxNodes']);
  for (const [key, value] of Object.entries(budget)) {
    if (!allowed.has(key) || typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw Error('资源预算无效：' + key);
  }
  const meshTriangles=new Map(asset.meshes.map(mesh=>[mesh.id,mesh.primitives.reduce((sum,p)=>sum+p.indices.length/3,0)]));
  const triangles=asset.nodes.reduce((sum,node)=>sum+(meshTriangles.get(node.meshId)||0),0);
  const outputBytes = asset.meshes.reduce((total, mesh) => total + mesh.primitives.reduce((sum, primitive) => sum + Object.values(primitive).reduce((bytes, value) => bytes + (ArrayBuffer.isView(value) ? value.byteLength : 0), 0), 0), 0);
  const draws = asset.nodes.filter(node => node.meshId).length;
  for (const [key, actual] of Object.entries({maxTriangles: triangles, maxOutputBytes: outputBytes, maxMaterialSlots: asset.materials.length, maxDraws: draws, maxNodes: asset.nodes.length})) {
    if (budget[key] !== undefined && actual > budget[key]) throw Error(`${key} 超出预算：${actual} > ${budget[key]}`);
  }
}
