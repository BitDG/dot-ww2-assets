import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readVisualAnchors, syncOwnedRoot, cloneOwnedProjectile, createResourceOwner } from '../binding.mjs';

function fixture() {
  const root = new THREE.Group(), cluster = new THREE.Group(); root.add(cluster);
  cluster.position.set(.1, 1, .2); cluster.rotation.x = -.2;
  for (let i = 0; i < 6; i++) {
    const wrapper = new THREE.Group(); wrapper.name = `N41_Solid_Tube_${i + 1}`;
    wrapper.position.set(i * .2, 0, 0); wrapper.add(new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .8), new THREE.MeshStandardMaterial())); cluster.add(wrapper);
  }
  return root;
}

test('read-only N4 anchors through PGF wrappers are invariant under host transforms', () => {
  const object = fixture(), scene = new THREE.Scene(); scene.add(object);
  const geometries = []; object.traverse(node => { if (node.geometry) geometries.push(node.geometry); });
  const a = readVisualAnchors(object);
  object.position.set(3, 4, 5); object.rotation.set(.3, .8, -.1); object.scale.setScalar(2.5);
  const b = readVisualAnchors(object);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) assert.ok(Math.abs(a[i][k] - b[i][k]) < 1e-12);
  for (const geometry of geometries) assert.equal(geometry.boundingBox, null);
  assert.throws(() => readVisualAnchors(new THREE.Group()), /管束外壳/);
});

test('transient root follows transformed scene and asset without parenting to the asset', () => {
  const scene = new THREE.Group(), object = fixture(), own = new THREE.Group(); scene.add(object, own); own.matrixAutoUpdate = false;
  scene.rotation.y = .4; scene.position.x = 8; object.position.set(2, 3, 4); object.rotation.z = .2;
  syncOwnedRoot(own, object, scene); scene.updateMatrixWorld(true);
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(own.matrixWorld.elements[i] - object.matrixWorld.elements[i]) < 1e-12);
  assert.equal(own.parent, scene); assert.equal(object.children.length, 1);
});

test('borrowed projectile geometry, material and texture survive owned clone disposal', () => {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), material = new THREE.MeshStandardMaterial({ map: texture }), geometry = new THREE.BoxGeometry();
  const original = new THREE.Mesh(geometry, material), owner = createResourceOwner(), copy = cloneOwnedProjectile(original, owner);
  let borrowedReleases = 0; for (const item of [geometry, material, texture]) item.addEventListener('dispose', () => borrowedReleases++);
  assert.notEqual(copy.geometry, geometry); assert.notEqual(copy.material, material); assert.notEqual(copy.material.map, texture);
  owner.dispose(); owner.dispose(); assert.equal(borrowedReleases, 0); assert.equal(owner.diagnostics().owned, owner.diagnostics().released);
  const late = new THREE.BoxGeometry(); let lateReleases = 0; late.addEventListener('dispose', () => lateReleases++); owner.capture(late); owner.capture(late); assert.equal(lateReleases, 1);
});
