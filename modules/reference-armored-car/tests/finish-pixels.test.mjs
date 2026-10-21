import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinishPixels} from '../finish-pixels.mjs';

test('portable finish pixels are deterministic, encoded separately and change with weathering',()=>{
 const a=createFinishPixels(.35,'reference'),b=createFinishPixels(.35,'reference'),clean=createFinishPixels(0,'reference'),dusty=createFinishPixels(.8,'reference');
 for(const channel of ['albedo','normal','orm']){assert.equal(a[channel].length,a.size*a.size*4);assert.deepEqual(a[channel],b[channel]);}
 assert.notDeepEqual(a.albedo,clean.albedo);assert.notDeepEqual(a.albedo,dusty.albedo);assert.notDeepEqual(a.normal,clean.normal);
 for(let i=0;i<a.orm.length;i+=4){assert.equal(a.orm[i],255);assert.equal(a.orm[i+2],255);assert.equal(a.normal[i+2],255);assert.equal(a.albedo[i+3],255);}
});
