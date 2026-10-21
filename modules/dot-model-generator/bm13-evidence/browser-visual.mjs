import * as THREE from 'three';
const ID='bm13-us6-visual-prop',report={stage:'B6 visible Firefox UI and resize',userAgent:navigator.userAgent,started:new Date().toISOString(),samples:[],status:'running'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
while(!(window.__PGF_READY__&&window.PGF_ACTIVE?.selectModel))await sleep(100);
const editor=window.PGF_ACTIVE;await editor.selectModel(ID);
while(editor.diagnostics().phase!=='ready')await sleep(100);
async function sample(){
 if(!editor.currentAsset()||editor.diagnostics().phase!=='ready')return;
 await sleep(350);const p=editor.preview,b=new THREE.Box3().setFromObject(p.object),a=[];p.camera.updateMatrixWorld();
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])a.push(new THREE.Vector3(x,y,z).project(p.camera));
 const canvas=document.querySelector('#rock-lab canvas'),rect=canvas.getBoundingClientRect();
 const value={at:new Date().toISOString(),window:[innerWidth,innerHeight],canvas:[rect.width,rect.height],maxX:Math.max(...a.map(v=>Math.abs(v.x))),maxY:Math.max(...a.map(v=>Math.abs(v.y))),finite:a.every(v=>[v.x,v.y,v.z].every(Number.isFinite)),pageOverflow:document.documentElement.scrollWidth>innerWidth,canvasCount:document.querySelectorAll('#rock-lab canvas').length,diagnostics:editor.diagnostics()};
 value.pass=value.finite&&value.maxX<=1&&value.maxY<=1&&!value.pageOverflow&&value.canvasCount===1;
 report.samples.push(value);report.status=report.samples.every(x=>x.pass)?'passed':'failed';
 await fetch('/__bm13_qa/visual',{method:'POST',body:JSON.stringify(report)});
}
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(sample,650);});
await sample();window.BM13_VISUAL_QA={report,sample};document.title='BM13 visible UI ready';
