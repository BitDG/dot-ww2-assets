// Actual PGF viewport captures, using the existing renderer and paused host runtime.
const ID='qf25-visual-prop',sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const start=performance.now();while(!fn()){if(performance.now()-start>120000)throw Error(label);await sleep(50);}}
const ed=window.PGF_ACTIVE,root=document.querySelector('#rock-lab');await until(()=>ed?.selectModel,'PGF owner');await ed.selectModel(ID);await until(()=>ed.diagnostics().phase==='ready','QF25 generation');
const recipe=structuredClone(ed.snapshot().models[ID]);recipe.seed='qf25-q2-visual-evidence';recipe.params={};await ed.applyRecipe(recipe);await until(()=>ed.diagnostics().phase==='ready','default QF25');
root.querySelector('[data-dot-tab=animation]').click();const preview=ed.preview,r=preview.runtime,renderer=preview.renderer,scene=preview.object.parent;
const report=await(await fetch('/source-audit/evidence/firefox/qf25-browser-report.json')).json();
const baseRender=renderer.render;let pending=null;renderer.render=function(...args){const value=baseRender.apply(this,args);if(pending){const resolve=pending;pending=null;resolve(renderer.domElement.toDataURL('image/png'));}return value;};
async function capture(){const p=new Promise(resolve=>{pending=resolve;});preview.invalidate();return p;}
const visual={scope:'actual original PGF canvas, same renderer, paused deterministic art-time sampling',viewport:{width:innerWidth,height:innerHeight,canvasWidth:renderer.domElement.width,canvasHeight:renderer.domElement.height},frames:{tow:[],smoke:[]},spritePixels:[]};
try{
 preview.frame();r.reset();visual.static=await capture();
 r.play('drive');r.pause();for(let i=0;i<8;i++){const t=i*1;r.seek(t);visual.frames.tow.push({time:t,png:await capture()});}
 r.reset();r.play('fire');r.pause();for(let i=0;i<10;i++){const t=i*.4;r.seek(t);let smoke=0,flame=0;scene.traverseVisible(o=>{if(o.isSprite&&o.material.opacity>0){if(o.userData.thermalKind==='fire')flame++;else smoke++;}});if(flame)throw Error('Unexpected positive-opacity flame');visual.spritePixels.push({time:t,smoke,flame});visual.frames.smoke.push({time:t,png:await capture()});}
 if(!visual.spritePixels.some(x=>x.smoke>0))throw Error('No visible smoke sprites');
 r.reset();preview.frame();visual.status='passed';visual.completed=new Date().toISOString();
}catch(error){visual.status='failed';visual.error=error.stack??String(error);}
finally{renderer.render=baseRender;report.visual=visual;await fetch('/__dot_qa/report?case=qf25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});console.log('QF25_VISUAL_CAPTURE',visual.status);document.title='QF25 visual capture '+visual.status;}
