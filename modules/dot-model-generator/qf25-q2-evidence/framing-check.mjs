import * as THREE from 'three';
import qf from '../../qf25-visual-prop/definition.mjs';import aa from '../../flakzwilling43-visual-prop/definition.mjs';
const report={stage:'I2 final projected close-up framing',started:new Date().toISOString(),checks:[],models:{},errors:[]},ed=window.PGF_ACTIVE,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){const t=performance.now();while(!fn()){if(performance.now()-t>120000)throw Error('Timeout ready');await sleep(50);}}
function check(name,ok,data){report.checks.push({name,ok:!!ok,data});if(!ok)throw Error(name);}
function projection(){const p=new THREE.Vector3(),r={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,vertices:0},preview=ed.preview;preview.object.updateWorldMatrix(true,true);preview.camera.updateMatrixWorld(true);preview.object.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.getAttribute('position');for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(preview.camera);if(!Number.isFinite(p.x)||p.z<-1||p.z>1)throw Error('clipped depth');r.minX=Math.min(r.minX,p.x);r.maxX=Math.max(r.maxX,p.x);r.minY=Math.min(r.minY,p.y);r.maxY=Math.max(r.maxY,p.y);r.vertices++;}});r.widthFraction=(r.maxX-r.minX)/2;r.heightFraction=(r.maxY-r.minY)/2;r.maxEdge=Math.max(Math.abs(r.minX),Math.abs(r.maxX),Math.abs(r.minY),Math.abs(r.maxY));r.distance=preview.camera.position.distanceTo(preview.controls.target);return r;}
const canvas=ed.preview.renderer.domElement;
try{
 for(const [id,definition,width]of[['qf25-visual-prop',qf,'wheelSpacing'],['flakzwilling43-visual-prop',aa,'shieldWidth']]){
  await ed.selectModel(id);await until(()=>ed.diagnostics().phase==='ready'&&!ed.preview.diagnostics().pending);
  await ed.applyRecipe({format:'PGF.ComponentRecipe',version:1,generator:id,seed:'i2-framing',params:{...definition.defaults}});await until(()=>ed.diagnostics().phase==='ready'&&!ed.preview.diagnostics().pending);
  let r=ed.preview.runtime;const before=projection();report.models[id]={default:before};check(id+' default exact vertex fit',before.maxEdge<=.95001&&Math.max(before.widthFraction,before.heightFraction)>=.749&&before.widthFraction>=.70,before);
  const input=document.querySelector('[data-animation-framing]');input.value='presentation';input.dispatchEvent(new Event('change',{bubbles:true}));const full=projection();check(id+' full presentation retains larger independent range',full.distance>before.distance&&r.state().framing==='presentation',full);
  input.value='model';input.dispatchEvent(new Event('change',{bubbles:true}));check(id+' return close-up has no drift',Math.abs(projection().distance-before.distance)<1e-6);
  for(const scale of [.75,1.5]){await ed.applyRecipe({format:'PGF.ComponentRecipe',version:1,generator:id,seed:'i2-framing',params:{...definition.defaults,artScale:scale,[width]:1.1}});await until(()=>ed.diagnostics().phase==='ready'&&!ed.preview.diagnostics().pending);const value=projection();check(id+' rebuilt scale '+scale+' stays contained',value.maxEdge<=.95001&&Math.max(value.widthFraction,value.heightFraction)>=.70,value);}
  check(id+' keeps original canvas',ed.preview.renderer.domElement===canvas&&document.querySelectorAll('#rock-lab canvas').length===1);
 }
 await ed.selectModel('nebelwerfer41-visual-prop');await until(()=>ed.diagnostics().phase==='ready');check('old N41 retains original sphere framing',ed.preview.runtime.framingDistance===undefined);
 await ed.selectModel('qf25-visual-prop');await until(()=>ed.diagnostics().phase==='ready'&&!ed.preview.diagnostics().pending);check('switch back close-up remains fitted',projection().maxEdge<=.95001);
 report.status='passed';
}catch(e){report.status='failed';report.errors.push(e.stack??String(e));}
report.completed=new Date().toISOString();const prior=await(await fetch('/source-audit/evidence/firefox/qf25-browser-report.json')).json();delete prior.visual;prior.framing=report;await fetch('/__dot_qa/report?case=qf25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(prior)});window.I2_FRAMING=report;document.title='I2 fit '+report.status;console.log('I2_FRAMING',report);
