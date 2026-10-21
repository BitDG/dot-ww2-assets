import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadImage} from '@napi-rs/canvas';
import {assetStatistics} from '../../../generator-sdk/statistics.mjs';
import {readGLB,validateAsset} from '../../../src/plugins/scatter/io.js';
const id=process.argv[2],path=process.argv[3];assert.ok(['qf17-visual-prop','land-mattress-visual-prop'].includes(id));assert.ok(path);
const bytes=new Uint8Array(await readFile(path)),asset=validateAsset(readGLB(bytes.buffer,id));assert.equal(asset.generator.id,id);assert.equal(asset.metadata.recipe.seed,'pgf-components-1');
const {PARTS}=await import('../../'+id+'/params.mjs'),{SOURCES}=await import('../../'+id+'/sources.mjs');
assert.ok(Object.values(PARTS).every(name=>asset.nodes.some(n=>n.name===name)));assert.equal(asset.metadata.source.sha256,SOURCES.medium.sha256);
let decodedImages=0;globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>{const image=await loadImage(Buffer.from(await blob.arrayBuffer()));assert.ok(image.width>0&&image.height>0);decodedImages++;return image;};
const loaded=await new GLTFLoader().parseAsync(bytes.buffer,'');let meshes=0,triangles=0;const geometries=new Set(),materials=new Set(),textures=new Set();
loaded.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;geometries.add(o.geometry);for(const m of [o.material].flat()){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}}});
assert.equal(loaded.animations.length,0);assert.ok(decodedImages>=3);assert.equal(triangles,assetStatistics(asset).triangles);
const report={status:'passed',source:'Actual Firefox visible Export GLB button download',originalFilename:path.split('/').pop(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),generator:asset.generator,sourceAsset:asset.metadata.source,recipe:asset.metadata.recipe,statistics:assetStatistics(asset),independentGLTFLoader:{meshes,triangles,decodedImages,animations:loaded.animations.length}};
for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.image?.close?.();t.dispose();}
await copyFile(path,new URL(id+'/visible-button-download.glb',import.meta.url));await writeFile(new URL(id+'/visible-download-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
