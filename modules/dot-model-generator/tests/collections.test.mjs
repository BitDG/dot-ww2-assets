import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectGeneratorCollections} from '../../../src/runtime/generator-collections.mjs';
const entry=(id,label=id,collectionId)=>({id,label,collectionId});
test('generic collection collapses navigation without mutating registry or IDs',()=>{
 const entries=[entry('parent','模型合集'),entry('child','柴油机车','parent'),entry('other')];
 const output=projectGeneratorCollections(entries);assert.deepEqual(output.map(x=>x.id),['parent','other']);assert.equal(entries.length,3);assert.equal(entries[1].id,'child');
 assert.match(output[0].searchTerms,/柴油机车/);assert.ok(output[0].memberIds.includes('child'));
});
test('future metadata-only members automatically join parent search and count once',()=>{
 const result=projectGeneratorCollections([entry('parent'),entry('new-dot-model','后续模型','parent')]);assert.equal(result.length,1);assert.match(result[0].searchTerms,/后续模型/);
});
test('missing parent, cycles and self-reference do not hide inaccessible tools',()=>{
 for(const entries of [[entry('a','a','missing')],[entry('a','a','a')],[entry('a','a','b'),entry('b','b','a')]])assert.equal(projectGeneratorCollections(entries).length,entries.length);
});
test('nested valid collections project to the outermost visible parent',()=>{
 const result=projectGeneratorCollections([entry('a'),entry('b','b','a'),entry('c','c','b')]);assert.equal(result.length,1);assert.deepEqual(result[0].memberIds,['a','b','c']);
});
test('five already registered model manifests declare the same collection without deleting routes',async()=>{
 for(const id of ['reference-armored-car','tracked-mortar','gustav-visual-prop','diesel-locomotive','armored-4x4']){
  const m=JSON.parse(await readFile(new URL(`../../${id}/${id}.generator.json`,import.meta.url)));assert.equal(m.id,id);assert.equal(m.workbench.collectionId,'dot-model-generator');assert.equal(m.workbench.entry,'./workbench.js');
 }
 const source=await readFile(new URL('../../../src/generator-registry.js',import.meta.url),'utf8');assert.match(source,/entry.collectionId=definition.workbench.collectionId/);assert.match(source,/generators.push\(entry\)/);
});
test('single workbench uses one shared preview, one schema inspector, no nested mounts',async()=>{
 const source=await readFile(new URL('../workbench.js',import.meta.url),'utf8');assert.equal((source.match(/createPluginPreview\(/g)||[]).length,1);assert.doesNotMatch(source,/attachShadow|mountWorkspaceShell|\.module\.mount|workbench\.js'\)/);assert.match(source,/mountSchemaControls/);
});
test('animation panel avoids the host automatic section wrapping and tab arrows skip hidden groups',async()=>{
 const source=await readFile(new URL('../workbench.js',import.meta.url),'utf8');assert.match(source,/<div class="dot-animation" hidden>/);assert.doesNotMatch(source,/<section class="dot-animation"/);assert.match(source,/filter\(button=>!button.hidden\)/);assert.match(source,/stopImmediatePropagation/);
});


test('shared color enhancement stays compact inside the unified inspector',async()=>{
 const css=await readFile(new URL('../workbench.css',import.meta.url),'utf8');
 assert.match(css,/\.pgf-color-control>input\[type=color\]\{width:36px;flex:0 0 36px/);
 assert.match(css,/\.pgf-color-control>input:not\(\[type=color\]\)\{width:0;min-width:0;flex:1/);
});
