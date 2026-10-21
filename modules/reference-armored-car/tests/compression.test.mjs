import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {unzlibSync} from 'fflate';
import low from '../assets/blender-kit-low.mjs';
import medium from '../assets/blender-kit-medium.mjs';
import high from '../assets/blender-kit-high.mjs';

test('browser/Worker fflate decoder restores exact normalized Blender geometry bytes',()=>{
 for(const kit of [low,medium,high]){
  const hash=createHash('sha256');let bytes=0;
  for(const mesh of kit.meshes)for(const p of mesh.primitives)for(const key of ['indices','positions','normals','uv'])if(p[key]){const raw=unzlibSync(Buffer.from(p[key],'base64'));hash.update(raw);bytes+=raw.length;}
  assert.equal(hash.digest('hex'),kit.normalizedGeometrySha256,kit.tier);assert.equal(bytes,kit.rawBufferBytes);assert.ok(kit.compressedBufferBytes<kit.rawBufferBytes);
 }
});
