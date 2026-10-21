// Acceptance hooks only: original PGF entry, shared host, no replacement UI.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const dir=new URL('./',import.meta.url),ids=['qf17-visual-prop','land-mattress-visual-prop'];
const server=await createServer({root,configFile:new URL('../../../vite.config.js',import.meta.url).pathname,server:{host:'127.0.0.1',port:5199,strictPort:true},plugins:[{
 name:'towed-pair-acceptance-receipts',
 transformIndexHtml(html,ctx){const url=new URL(ctx.originalUrl??'/', 'http://127.0.0.1');const mode=url.searchParams.get('towed');if(!['visual','check'].includes(mode))return html;return html.replace('</body>','<script type="module" src="/modules/dot-model-generator/towed-pair-evidence/browser-'+mode+'.mjs"></script></body>');},
 configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://127.0.0.1');if(!url.pathname.startsWith('/__towed_qa/'))return next();
  const id=url.searchParams.get('asset');if(req.method!=='POST'||!ids.includes(id)){res.statusCode=400;return res.end('Invalid receipt');}
  try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100_000_000)throw Error('Receipt too large');chunks.push(chunk);}const bytes=Buffer.concat(chunks);let name;
   if(url.pathname==='/__towed_qa/visual'){JSON.parse(bytes);name='visual-report.json';}
   else if(url.pathname==='/__towed_qa/report'){JSON.parse(bytes);name='browser-report.json';}
   else if(url.pathname==='/__towed_qa/export')name='unified-export.glb';
   else{res.statusCode=404;return res.end();}
   await mkdir(new URL(id+'/',dir),{recursive:true});await writeFile(new URL(id+'/'+name,dir),bytes);res.statusCode=200;res.end('saved');
  }catch(error){res.statusCode=400;res.end(error.message);}
 });},
}]});await server.listen();console.log('TOWED_QA_READY on loopback 5199');
