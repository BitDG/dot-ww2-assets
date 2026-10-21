import * as THREE from 'three';
import { ART_FORWARD } from './sequence-core.mjs';

/** Shallow, still-sealed appearance only. Never cuts a bore or models internals. */
export function applySourceInformedExterior(launcher) {
  let tubes = 0, pinsHidden = 0, capsHidden = 0, frontRims = 0, changedVertices = 0;
  launcher.traverse(object => {
    if (/^N41_Cap_Cosmetic_Pin_[1-6]_-1$/.test(object.name)) {
      object.visible = false; pinsHidden++;
    }
    if (/^N41_Shallow_Dark_End_[1-6]_-1$/.test(object.name)) { object.visible = false; capsHidden++; }
    if (/^N41_Cosmetic_Collar_[1-6]_-1$/.test(object.name)) {
      // The original cosmetic collar is capped and covers the shallow face.
      // A rounded external lip reveals the sealed dark surface behind it.
      object.geometry = new THREE.TorusGeometry(.169, .0085, 8, 48);
      object.position.z = .806;
      object.userData.n4Appearance = 'External rounded lip over a shallow sealed face';
      frontRims++;
    }
    if (!/^N41_Solid_Tube_[1-6]$/.test(object.name)) return;
    const geometry = object.geometry.clone(); geometry.computeBoundingBox();
    const z = geometry.boundingBox.max.z, radius = geometry.boundingBox.max.x;
    const position = geometry.getAttribute('position');
    const colors = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const r = Math.hypot(position.getX(i), position.getY(i));
      const face = position.getZ(i) > z - .00001 && r < radius * .985;
      const shade = face ? .025 + .13 * (r / radius) ** 6 : 1;
      colors.set([shade, shade, shade], i * 3);
      if (face) {
        position.setZ(i, z - .022 * Math.max(0, 1 - (r / radius) ** 4));
        changedVertices++;
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    object.geometry = geometry; object.material = object.material.clone();
    object.material.vertexColors = true; object.material.roughness = .88;
    object.userData.n4Appearance = 'Shallow dark sealed front face; no interior or through-hole';
    tubes++;
  });
  if (tubes !== 6 || pinsHidden !== 6) throw new Error('Unexpected N2 exterior nodes');
  // Static art staging only; no elevating mechanism or user fire-control model.
  const cluster = launcher.getObjectByName('N41_Tube_Cluster');
  if (!cluster) throw new Error('Missing exterior cluster');
  const pivot = new THREE.Vector3(0, 1.285, .08);
  for (const child of cluster.children) child.position.sub(pivot);
  cluster.position.copy(pivot);
  cluster.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(...ART_FORWARD));
  launcher.updateMatrixWorld(true);
  return { tubes, pinsHidden, capsHidden, frontRims, changedVertices, remainsSealed: true, scope: 'runtime appearance only; original N2 GLB unchanged' };
}
