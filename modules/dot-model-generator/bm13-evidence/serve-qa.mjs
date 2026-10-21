// Acceptance harness: original PGF entry/config, no alternate generator UI.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const dir=new URL('./',import.meta.url);
const server=await createServer({root,configFile:new URL('../../../vite.config.js',import.meta.url).pathname,server:{host:'127.0.0.1',port:5198,strictPort:true},plugins:[{
 name:'bm13-acceptance-receipts',
 transformIndexHtml(html,ctx){if(ctx.originalUrl?.includes('bm13visual=1'))return html.replace('</body>','<script type="module" src="/modules/dot-model-generator/bm13-evidence/browser-visual.mjs"></script></body>');return ctx.originalUrl?.includes('bm13qa=1')?html.replace('</body>','<script type="module" src="/modules/dot-model-generator/bm13-evidence/browser-check.mjs"></script></body>'):html;},
 configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(!url.pathname.startsWith('/__bm13_qa/'))return next();
  if(req.method!=='POST'){res.statusCode=405;return res.end();}
  try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100_000_000)throw Error('Receipt too large');chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);let name;
   if(url.pathname==='/__bm13_qa/visual'){JSON.parse(bytes);name='visual-report.json';}
   else if(url.pathname==='/__bm13_qa/report'){JSON.parse(bytes);name='browser-report.json';}
   else if(url.pathname==='/__bm13_qa/export')name='BM13-unified-export.glb';
   else if(url.pathname==='/__bm13_qa/canvas')name='BM13-unified-viewport.png';
   else{res.statusCode=404;return res.end();}
   await writeFile(new URL(name,dir),bytes);res.statusCode=200;res.end('saved');
  }catch(error){res.statusCode=400;res.end(error.message);}
 });},
}]});
await server.listen();console.log('BM13_QA_READY http://127.0.0.1:5198/?generator=dot-model-generator&category=machines&bm13qa=1');
