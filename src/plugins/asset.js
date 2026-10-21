import { check, record, LIMITS, shortText } from './contract.js';
import {validateCharacterAsset,characterClips} from '../character-asset.mjs';
const vector = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
export function encodedTextureSize(bytes, mime) {
  check(bytes instanceof Uint8Array && bytes.length >= 24, '贴图编码无效');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mime === 'image/png') {
    check(view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && view.getUint32(8) === 13 && view.getUint32(12) === 0x49484452, 'PNG 文件头无效');
    return [view.getUint32(16), view.getUint32(20)];
  }
  check(mime === 'image/jpeg' && view.getUint16(0) === 0xffd8, 'JPEG 文件头无效');
  let pos = 2;
  while (pos + 3 < bytes.length) {
    check(bytes[pos++] === 255, 'JPEG 标记无效'); while (bytes[pos] === 255) pos++;
    const marker = bytes[pos++]; if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 1 || marker >= 0xd0 && marker <= 0xd7) continue;
    check(pos + 2 <= bytes.length, 'JPEG 数据截断'); const length = view.getUint16(pos);
    check(length >= 2 && pos + length <= bytes.length, 'JPEG 段越界');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) { check(length >= 8, 'JPEG 尺寸段无效'); return [view.getUint16(pos + 5), view.getUint16(pos + 3)]; }
    pos += length;
  }
  throw new Error('不支持或缺少尺寸的 JPEG');
}
export function validateAsset(a) {
  check(record(a) && a.schemaVersion === 'pgf.asset/1', '输出必须是 pgf.asset/1');
  for (const k of ['meshes', 'materials', 'nodes', 'roots', 'textures']) check(Array.isArray(a[k]), `输出缺少 ${k}`);
  check(a.meshes.length > 0 && a.meshes.length <= 4096 && a.nodes.length > 0 && a.nodes.length <= 4096 && a.materials.length > 0 && a.materials.length <= 256 && a.textures.length <= 64, '资产数量超出限制');
  let bytes = 0, triangles = 0, texturePixels = 0, renderedTriangles = 0, primitives = 0, drawCalls = 0;
  const maps = {};
  for (const kind of ['meshes', 'materials', 'nodes', 'textures']) {
    maps[kind] = new Map();
    for (const item of a[kind]) { check(record(item) && shortText(item.id, 100) && !maps[kind].has(item.id), `${kind} 包含非法或重复 ID`); maps[kind].set(item.id, item); }
  }
  for (const t of a.textures) {
    check(['image/png', 'image/jpeg'].includes(t.mimeType) && ['srgb', 'linear-data'].includes(t.colorSpace) && t.bytes instanceof Uint8Array, '贴图必须为 PNG/JPEG 字节和明确色彩空间');
    check(Number.isInteger(t.width) && Number.isInteger(t.height) && t.width > 0 && t.height > 0 && t.width <= 4096 && t.height <= 4096, '贴图尺寸必须在 1..4096');
    const [encodedWidth, encodedHeight] = encodedTextureSize(t.bytes, t.mimeType);
    check(encodedWidth === t.width && encodedHeight === t.height, '贴图编码尺寸与声明不一致');
    bytes += t.bytes.byteLength; texturePixels += t.width * t.height;
  }
  check(texturePixels <= LIMITS.texturePixels, '贴图总像素超过 16777216');
  for (const m of a.materials) {
    check(vector(m.baseColor, 4) && m.baseColor.every(v => v >= 0 && v <= 1), 'baseColor 必须是线性 RGBA 0..1');
    if (m.emissive !== undefined) check(vector(m.emissive, 3) && m.emissive.every(v => v >= 0 && v <= 1), 'emissive 必须是线性 RGB 0..1');
    check([m.metallic, m.roughness].every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'PBR 参数无效');
    check(['OPAQUE', 'MASK', 'BLEND'].includes(m.alphaMode) && typeof m.doubleSided === 'boolean', '材质 alphaMode/doubleSided 无效');
    if (m.alphaMode === 'MASK') check(Number.isFinite(m.alphaCutoff) && m.alphaCutoff >= 0 && m.alphaCutoff <= 1, 'MASK 材质必须声明 alphaCutoff');
    for (const [key, colorSpace] of [['baseColorTextureId', 'srgb'], ['normalTextureId', 'linear-data'], ['metallicRoughnessTextureId', 'linear-data'], ['emissiveTextureId', 'srgb']]) if (m[key] !== undefined) check(maps.textures.get(m[key])?.colorSpace === colorSpace, `材质 ${key} 引用或色彩空间错误`);
  }
  for (const mesh of a.meshes) {
    check(Array.isArray(mesh.primitives) && mesh.primitives.length > 0 && mesh.primitives.length <= 256, 'mesh.primitives 无效');
    primitives += mesh.primitives.length; check(primitives <= 4096, '原型 primitive 总数超过 4096');
    for (const p of mesh.primitives) {
      check(p.positions instanceof Float32Array && p.positions.length >= 9 && p.positions.length % 3 === 0 && p.positions.every(v => Number.isFinite(v) && Math.abs(v) <= 10000000), 'positions 必须是有限米制 Float32Array');
      check(p.normals instanceof Float32Array && p.normals.length === p.positions.length && p.normals.every(Number.isFinite), 'normals 长度或值无效');
      for (let i = 0; i < p.normals.length; i += 3) check(Math.abs(Math.hypot(p.normals[i], p.normals[i + 1], p.normals[i + 2]) - 1) < .02, '法线必须归一化');
      check((p.indices instanceof Uint16Array || p.indices instanceof Uint32Array) && p.indices.length >= 3 && p.indices.length % 3 === 0 && p.indices.every(v => v < p.positions.length / 3), 'indices 越界或类型错误');
      check(maps.materials.has(p.materialId), '网格引用不存在的材质');
      for (const [key, components] of [['uv0', 2], ['colors', 4], ['tangents', 4]]) if (p[key] !== undefined) check(p[key] instanceof Float32Array && p[key].length === p.positions.length / 3 * components && p[key].every(Number.isFinite), `${key} 长度或值无效`);
      const material = maps.materials.get(p.materialId);
      if (material.baseColorTextureId || material.normalTextureId || material.metallicRoughnessTextureId || material.emissiveTextureId) check(p.uv0, '贴图材质必须提供 uv0');
      for (const key of ['positions', 'normals', 'indices', 'uv0', 'colors', 'tangents']) bytes += p[key]?.byteLength ?? 0;
      triangles += p.indices.length / 3;
      check(triangles <= LIMITS.triangles && bytes <= LIMITS.bytes, '资产超过 100 万三角面或 128 MiB 数据预算');
    }
  }
  const parents = new Set();
  for (const n of a.nodes) {
    check(shortText(n.name, 100) && record(n.transform) && vector(n.transform.position, 3) && vector(n.transform.rotation, 4) && vector(n.transform.scale, 3), '节点变换无效');
    check(Math.abs(Math.hypot(...n.transform.rotation) - 1) < .001 && n.transform.scale.every(v => v > 0 && v <= 100000) && n.transform.position.every(v => Math.abs(v) <= 10000000), '节点旋转必须归一化、缩放为有限正数');
    check(n.meshId === undefined || maps.meshes.has(n.meshId), '节点网格引用不存在');
    if (n.meshId) { const mesh = maps.meshes.get(n.meshId); renderedTriangles += mesh.primitives.reduce((sum, p) => sum + p.indices.length / 3, 0); drawCalls += mesh.primitives.length; check(renderedTriangles <= 2000000, '实例三角面超过 200 万预算'); check(drawCalls <= 8192, '实例绘制调用超过 8192'); }
    check(Array.isArray(n.children), '节点缺少 children');
    for (const child of n.children) { check(maps.nodes.has(child) && !parents.has(child), '节点子引用错误或多父节点'); parents.add(child); }
  }
  check(a.roots.length > 0 && new Set(a.roots).size === a.roots.length && a.roots.every(id => maps.nodes.has(id) && !parents.has(id)), '根节点无效');
  const visited = new Set(), stack = a.roots.map(id => [id, 0]);
  while (stack.length) { const [id, depth] = stack.pop(); check(!visited.has(id) && depth <= 64, '节点包含环或深度超过 64'); visited.add(id); for (const child of maps.nodes.get(id).children) stack.push([child, depth + 1]); }
  check(visited.size === a.nodes.length, '存在不可达节点或节点环');
  bytes += validateCharacterAsset(a);
  check(bytes <= LIMITS.bytes, '输出字节数超出预算');
  return { triangles, renderedTriangles, drawCalls, bytes, texturePixels, meshes: a.meshes.length, nodes: a.nodes.length };
}

/** Every handle owns its materials, geometries and decoded images. */
export async function createAssetHandle(asset, THREE, valid = () => true) {
  const root = new THREE.Group(), materials = new Map(), textures = new Map(), geometries = [], bitmaps = [], skeletons = [];
  let disposed = false;
  const handle = { object: root, animations: [], dispose() { if (disposed) return; disposed = true; root.removeFromParent(); skeletons.forEach(s=>s.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); bitmaps.forEach(b => b.close()); root.clear(); } };
  const live = () => { if (!valid()) throw new DOMException('旧资产上传已取消', 'AbortError'); };
  try {
    live();
    for (const t of asset.textures) {
      const bitmap = await createImageBitmap(new Blob([t.bytes], { type: t.mimeType })); bitmaps.push(bitmap); live();
      check(bitmap.width === t.width && bitmap.height === t.height, '贴图实际尺寸与声明不一致');
      const texture = new THREE.Texture(bitmap); texture.flipY = false; texture.colorSpace = t.colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.needsUpdate = true; textures.set(t.id, texture);
    }
    for (const m of asset.materials) {
      const material = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...m.baseColor.slice(0, 3), THREE.LinearSRGBColorSpace), opacity: m.baseColor[3], metalness: m.metallic, roughness: m.roughness, emissive: new THREE.Color().setRGB(...(m.emissive??[0,0,0]), THREE.LinearSRGBColorSpace), transparent: m.alphaMode === 'BLEND', alphaTest: m.alphaMode === 'MASK' ? m.alphaCutoff : 0, side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide, map: (textures.get(m.baseColorTextureId)??null), normalMap: (textures.get(m.normalTextureId)??null), emissiveMap: (textures.get(m.emissiveTextureId)??null), metalnessMap: (textures.get(m.metallicRoughnessTextureId)??null), roughnessMap: (textures.get(m.metallicRoughnessTextureId)??null) });
      material.name = m.id; materials.set(m.id, material);
    }
    const meshes = new Map(), nodes = new Map();
    // Upload each immutable mesh prototype once; instances share geometry within this handle.
    for (const m of asset.meshes) {
      meshes.set(m.id, m.primitives.map(p => {
        const geo = new THREE.BufferGeometry(); geometries.push(geo);
        for (const [source, attr, count] of [['positions', 'position', 3], ['normals', 'normal', 3], ['uv0', 'uv', 2], ['colors', 'color', 4], ['tangents', 'tangent', 4]]) if (p[source]) geo.setAttribute(attr, new THREE.BufferAttribute(p[source], count));
        geo.setIndex(new THREE.BufferAttribute(p.indices, 1));
        if(p.joints)geo.setAttribute('skinIndex',new THREE.BufferAttribute(p.joints,4));
        if(p.weights)geo.setAttribute('skinWeight',new THREE.BufferAttribute(p.weights,4));
        if(p.morphTargets){geo.morphTargetsRelative=true;geo.morphAttributes.position=p.morphTargets.map(t=>{const a=new THREE.BufferAttribute(t.positions,3);a.name=t.name;return a;});if(p.morphTargets.some(t=>t.normals))geo.morphAttributes.normal=p.morphTargets.map(t=>new THREE.BufferAttribute(t.normals??new Float32Array(p.positions.length),3));}
        geo.computeBoundingSphere();
        let material = materials.get(p.materialId);
        if (p.colors) { material = material.clone(); material.vertexColors = true; materials.set(Symbol(), material); }
        return { geo, material };
      }));
    }
    for (const n of asset.nodes) {
      const object = n.kind==='bone'||asset.skins?.some(s=>s.joints.includes(n.id))?new THREE.Bone():new THREE.Group(); object.name = n.name; object.userData.pgfNodeId = n.id; object.position.fromArray(n.transform.position); object.quaternion.fromArray(n.transform.rotation); object.scale.fromArray(n.transform.scale);
      if (n.meshId) for (const { geo, material } of meshes.get(n.meshId)) {
        const mesh = n.skinId?new THREE.SkinnedMesh(geo,material):new THREE.Mesh(geo, material); mesh.castShadow = mesh.receiveShadow = true; if(!mesh.isSkinnedMesh){mesh.updateMatrix();mesh.matrixAutoUpdate=false;mesh.pgfStaticTransform=true;}object.add(mesh);
      }
      nodes.set(n.id, object);
    }
    for (const n of asset.nodes) for (const child of n.children) nodes.get(n.id).add(nodes.get(child));
    for (const id of asset.roots) root.add(nodes.get(id));
    root.updateMatrixWorld(true);
    for(const s of asset.skins??[]){
      const skeleton=new THREE.Skeleton(s.joints.map(id=>nodes.get(id)),s.joints.map((_,i)=>new THREE.Matrix4().fromArray(s.inverseBindMatrices,i*16)));skeletons.push(skeleton);
      for(const n of asset.nodes)if(n.skinId===s.id)for(const mesh of nodes.get(n.id).children)if(mesh.isSkinnedMesh){mesh.bind(skeleton,new THREE.Matrix4());mesh.computeBoundingBox();mesh.computeBoundingSphere();}
    }
    handle.animations=characterClips(asset,nodes,THREE);root.animations=handle.animations;
    live(); return handle;
  } catch (error) { handle.dispose(); throw error; }
}
