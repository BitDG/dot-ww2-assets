import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('four genuine reviewed preset PNGs are distinct and statically addressable by Vite',async()=>{
 const base=new URL('../',import.meta.url),code=await fs.readFile(new URL('workbench.js',base),'utf8'),report=JSON.parse(await fs.readFile(new URL('evidence/preset-artwork.json',base),'utf8')),hashes=[];
 for(const id of ['reference','forward','clean','dusty']){
  assert.ok(code.includes("new URL('./presets/"+id+".png',import.meta.url)"),id+' needs a literal build-resolvable URL');
  const png=await fs.readFile(new URL('presets/'+id+'.png',base));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),500);assert.equal(png.readUInt32BE(20),380);
  const hash=createHash('sha256').update(png).digest('hex');assert.equal(hash,report.images.find(r=>r.preset===id).sha256);hashes.push(hash);
 }
 assert.equal(new Set(hashes).size,4);
});
