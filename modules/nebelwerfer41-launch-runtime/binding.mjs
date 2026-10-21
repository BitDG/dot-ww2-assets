import * as THREE from 'three';

/** Read the original N4 art anchors through the PGF Group -> Mesh wrapper.
 * No geometry bounds cache, host material, transform or hierarchy is edited.
 */
export function readVisualAnchors(object) {
  if (!object?.isObject3D) throw new TypeError('A borrowed Three asset object is required');
  object.updateWorldMatrix(true, true);
  const inverseRoot = object.matrixWorld.clone().invert();
  return Array.from({ length: 6 }, (_, index) => {
    const name = `N41_Solid_Tube_${index + 1}`, node = object.getObjectByName(name);
    if (!node) throw new Error('发射预览需要显示管束外壳：缺少 ' + name);
    const meshes = [];
    node.traverse(child => { if (child.isMesh && child.geometry?.getAttribute('position')) meshes.push(child); });
    if (meshes.length !== 1) throw new Error('Unexpected authored visual anchor geometry: ' + name);
    const mesh = meshes[0], box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position'));
    if (box.isEmpty()) throw new Error('Empty authored visual anchor: ' + name);
    const point = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + .035);
    point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot);
    if (!point.toArray().every(Number.isFinite)) throw new Error('Non-finite authored visual anchor: ' + name);
    return point.toArray();
  });
}

/** Follow the borrowed asset, while keeping all transient objects outside it. */
export function syncOwnedRoot(root, object, scene) {
  object.updateWorldMatrix(true, false);
  scene.updateWorldMatrix(true, false);
  root.matrix.copy(scene.matrixWorld).invert().multiply(object.matrixWorld);
  root.matrixWorldNeedsUpdate = true;
}

/** World bounds without populating a borrowed geometry's mutable bounds cache. */
export function readObjectBounds(object, { visibleOnly = false } = {}) {
  object.updateWorldMatrix(true, true);
  const result = new THREE.Box3(), local = new Map();
  const visit = node => {
    if (!node.isMesh || !node.geometry?.getAttribute('position')) return;
    if (!local.has(node.geometry)) local.set(node.geometry, new THREE.Box3().setFromBufferAttribute(node.geometry.getAttribute('position')));
    result.union(local.get(node.geometry).clone().applyMatrix4(node.matrixWorld));
  };
  if (visibleOnly) object.traverseVisible(visit); else object.traverse(visit);
  return result;
}

export function createResourceOwner() {
  const resources = new Set(), released = new Set();
  let closed = false;
  function capture(value) {
    if (!value) return value;
    if (Array.isArray(value)) { value.forEach(capture); return value; }
    if (value.isObject3D) { value.traverse(node => { capture(node.geometry); capture(node.material); }); return value; }
    if (value.isMaterial) for (const item of Object.values(value)) if (item?.isTexture) capture(item);
    if (value.isBufferGeometry || value.isMaterial || value.isTexture) {
      resources.add(value);
      if (closed && !released.has(value)) { value.dispose(); released.add(value); }
    }
    return value;
  }
  return {
    capture,
    dispose() { closed = true; for (const resource of resources) if (!released.has(resource)) { resource.dispose(); released.add(resource); } },
    diagnostics: () => ({ owned: resources.size, released: released.size, closed }),
  };
}

/** An injected projectile is borrowed too: clone its mutable GPU resources first. */
export function cloneOwnedProjectile(template, owner) {
  if (!template?.isObject3D) throw new TypeError('A Three projectile template is required');
  const root = template.clone(true), geometries = new Map(), materials = new Map(), textures = new Map();
  function material(source) {
    if (materials.has(source)) return materials.get(source);
    const copy = source.clone(); materials.set(source, copy);
    for (const [key, value] of Object.entries(source)) if (value?.isTexture) {
      if (!textures.has(value)) textures.set(value, value.clone());
      copy[key] = textures.get(value);
    }
    return copy;
  }
  root.traverse(node => {
    if (node.geometry) {
      if (!geometries.has(node.geometry)) geometries.set(node.geometry, node.geometry.clone());
      node.geometry = geometries.get(node.geometry);
    }
    if (node.material) node.material = Array.isArray(node.material) ? node.material.map(material) : material(node.material);
  });
  owner.capture(root);
  return root;
}
