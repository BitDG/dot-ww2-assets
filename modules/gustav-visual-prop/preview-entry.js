// Independent acceptance entry; runs the actual shared PGF shell and module.
// The preview build limits registry metadata to the two vehicle entries only.
import '../../src/workbench.css';
import '../../src/module-surface.css';
import '../../src/runtime/workbench-runtime.css';
import {mountWorkspaceShell} from '../../src/workspace-shell.js';
import {validateWorkbench} from '../../generator-sdk/workbench.mjs';
import {mount} from './workbench.js';
const root=document.getElementById('rock-lab');
const editor=validateWorkbench(mount(root));
const disposeShell=mountWorkspaceShell(root,'gustav-visual-prop',editor);
window.PGF_ACTIVE=editor;
window.__PGF_PREVIEW_SCOPE__='Actual PGF shell/workbench/Worker/renderer, restricted single-entry preview registry; not a complete application build';
editor.ready.then(()=>{window.__PGF_ROUTE__={id:'gustav-visual-prop'};window.__PGF_READY__=true;}).catch(error=>{window.__PGF_ERROR__=error.message;});
addEventListener('pagehide',()=>{disposeShell();editor.dispose();},{once:true});
// Visible QA actions for native-browser acceptance; no script-console injection required.
const auditButton=document.createElement('button');auditButton.textContent='验收状态';root.querySelector('.header-actions').append(auditButton);
const auditDialog=document.createElement('dialog');auditDialog.style.cssText='max-width:80vw;max-height:82vh;background:#edf0eb;color:#243029;border:1px solid #869187;border-radius:10px;padding:18px';
const auditText=document.createElement('pre');auditText.style.cssText='white-space:pre-wrap;max-height:55vh;overflow:auto;font:12px monospace';auditDialog.append(auditText);
let auditReport;
const saveAudit=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(auditReport,null,2)],{type:'application/json'}));a.href=url;a.download='gustav-visual-prop-browser-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
async function collectAudit(){const asset=editor.currentAsset();return {recipe:editor.snapshot(),diagnostics:editor.diagnostics(),renderer:await editor.preview.inspect?.(),asset:asset?{bounds:asset.bounds,materials:asset.materials.length,textures:asset.textures.length,sockets:asset.sockets.length,source:asset.metadata.visualOnly}:null,viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},scope:window.__PGF_PREVIEW_SCOPE__};}
for(const [label,run]of [['刷新状态',async()=>{auditReport=await collectAudit();auditText.textContent=JSON.stringify(auditReport,null,2);}],['测量静置 2 秒',async()=>{const before=await collectAudit();auditText.textContent='测量中，请勿操作模型…';await new Promise(resolve=>setTimeout(resolve,2000));const after=await collectAudit();auditReport={before,after,idleFramesDelta:after.diagnostics.frames-before.diagnostics.frames};auditText.textContent=JSON.stringify(auditReport,null,2);}],['保存验收 JSON',saveAudit],['释放并保存（刷新恢复）',async()=>{const before=await collectAudit();disposeShell();editor.dispose();await new Promise(resolve=>setTimeout(resolve,100));auditReport={before,after:editor.diagnostics(),action:'explicit preview disposal'};auditText.textContent=JSON.stringify(auditReport,null,2);saveAudit();}],['关闭',()=>auditDialog.close()]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>Promise.resolve(run()).catch(e=>{auditText.textContent=e.message;});auditDialog.append(b);}
document.body.append(auditDialog);auditButton.onclick=async()=>{auditDialog.showModal();auditReport=await collectAudit();auditText.textContent=JSON.stringify(auditReport,null,2);};
