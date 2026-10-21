import {readdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){const out=[];for(const f of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;out.push(...(f.isDirectory()?await walk(p):[p]));}return out;}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'});let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
try{
 let ready=false;for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:4173/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,log);
 const files=await walk('dist'),results=[];for(const file of files){const url='http://127.0.0.1:4173/'+file.slice(5);const r=await fetch(url);assert.equal(r.status,200,file);const actual=Buffer.from(await r.arrayBuffer()),expected=await readFile(file);assert.equal(sha(actual),sha(expected),file);results.push({file:file.slice(5),bytes:actual.length,sha256:sha(actual)});}
 for(const id of ['qf17-visual-prop','bm13-us6-visual-prop','land-mattress-visual-prop']){const {SOURCES}=await import('../modules/'+id+'/sources.mjs');for(const s of Object.values(SOURCES))assert(results.some(r=>r.sha256===s.sha256),'Missing frozen source '+s.file);}
 assert.equal(results.filter(r=>/^models\/.*\.glb$/.test(r.file)).length,11);
 const js=await Promise.all(files.filter(x=>x.endsWith('.js')).map(x=>readFile(x,'utf8')));assert(!js.some(s=>s.includes('file:///workspace/')),'workspace dependency in production JS');
 await writeFile('evidence/production-resource-report.json',JSON.stringify({status:'passed',browser:false,checks:['Every built file HTTP 200 and byte hash equal','11 actual default GLB downloads','All 9 BM13/QF17/LM source tier hashes present','No file:///workspace dependency in bundled JS'],files:results},null,2));console.log('PASS',results.length,'production resources; no browser execution claimed');
}finally{server.kill('SIGTERM');}
