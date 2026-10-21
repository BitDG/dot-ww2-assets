import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {ArtifactService} from '../../../mcp/service.mjs';
import {validateAsset,readGLB} from '../../../src/plugins/scatter/io.js';
const out=new URL('../evidence/mcp-output/',import.meta.url),service=new ArtifactService({outputDir:fileURLToPath(out)});
try{
 const listed=await service.list();const found=JSON.stringify(listed).includes('flakzwilling43-visual-prop');assert(found);
 const descriptor=await service.describe('flakzwilling43-visual-prop');assert.equal(descriptor.status,'adapter-ready');
 const artifact=await service.model({generator:'flakzwilling43-visual-prop',seed:'flakzwilling43-mcp-worker',params:{detail:'low',weathering:.45}});
 const bytes=new Uint8Array(await readFile(artifact.files.glb));const asset=validateAsset(readGLB(bytes.buffer,'flakzwilling43-mcp-export'));assert(asset.nodes.some(n=>n.name==='FZ43_upper_Sealed_Front'));assert(!asset.nodes.some(n=>/Canvas|Pouch/.test(n.name)));
 await writeFile(new URL('../evidence/mcp-worker-static.glb',import.meta.url),bytes);
 await writeFile(new URL('../evidence/mcp-worker-report.json',import.meta.url),JSON.stringify({discovery:found,descriptorStatus:descriptor.status,version:descriptor.version,export:artifact,scope:'Actual shared PGF ArtifactService and isolated Worker; transport server not run because restored tree lacks its pinned SDK package. Blender authoring separately passed genuine MCP stdio.'},null,2));
 console.log('PGF discovery/describe/isolated-worker/generate/readback passed',bytes.length);
}finally{await service.close();}
