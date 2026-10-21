import {MODEL_CATALOG, getModel, canMount, capabilitySummary} from './catalog.mjs';
import {createUnifiedController} from './controller.mjs';
import {readWorkspaceRecipe, readNativeRecipe} from './recipes.mjs';
import {loadBackend, runModelJob} from './backends.js';
import {mountSchemaControls} from './schema-controls.mjs';
import {createModelAnimationRuntime,animationCapabilities} from './animation-runtime.js';
import {createPluginPreview} from '../../src/plugins/preview.js';
import {PARAMETER_TABS} from '../../generator-sdk/parameter-ui.mjs';
import '../../src/plugins/plugins.css';
import '../data-workbench/workbench.css';
import './workbench.css';

export function mount(root, initial) {
  root.className='plugin-shell data-workbench dot-model-generator';
  root.innerHTML='<header><div class="brand"><div class="brand-name">PGF</div></div><div class="header-actions"><button data-dot-save>保存工作区</button><button data-save disabled>保存配方</button><button data-export class="primary" disabled>导出 GLB</button></div></header><main class="workspace"><aside><h2 class="panel-title">模型 / 装备</h2><label class="dot-model-picker" data-pgf-tab-persistent>选择模型<select data-dot-model aria-label="选择 dot 模型"></select></label><p class="dot-capabilities" data-capabilities></p><div class="preset-grid"></div><p class="panel-hint">全部 dot 模型集中在这里。制作中的模型会明确显示未开放能力。</p></aside><section class="center plugin-preview"><div class="plugin-heading"><span>DOT / MODEL GENERATOR</span><h1></h1><p data-description></p></div><div class="viewport-tools"><button data-frame>适应</button><button data-generate disabled>生成</button><button data-cancel disabled>取消</button><button data-explode hidden>分解查看</button><select data-part aria-label="查看模型部件" hidden></select></div><div class="dot-unavailable" hidden><h2>尚未开放生成</h2><p data-unavailable></p></div><div class="component-metrics" data-metrics></div></section><aside><h2 class="panel-title">参数 / 材质 / 动画</h2><div class="dot-tabs" role="tablist" aria-label="参数页签"></div><label class="pgf-update-mode" data-pgf-tab-persistent><input type="checkbox" data-auto-generate checked>自动生成</label><div class="plugin-fields"></div><div class="dot-animation" hidden><h3>动画预览</h3><p data-animation-description></p><div class="dot-animation-actions"><button data-animation-drive disabled>行走</button><button data-animation-fire disabled>开火演出</button><button data-animation-pause disabled>暂停</button><button data-animation-reset disabled>停止并复位</button></div><label class="dot-animation-rate">演出倍率<select data-animation-speed><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label class="dot-animation-rate">取景<select data-animation-framing><option value="model">模型近景</option><option value="presentation">完整演出范围</option></select></label><p data-animation-state role="status"></p><p>动画仅在当前预览播放；GLB 导出保留原静态资产，不含粒子或时间轴动画。</p></div><div class="plugin-recipe-actions" data-pgf-tab-persistent><button data-load>导入工作区 / 配方</button><input data-file type="file" accept=".json" hidden></div></aside></main><footer><span data-status role="status">正在加载模型…</span><span>米 · Y-up · 静态 GLB</span></footer>';
  const q=selector=>root.querySelector(selector),abort=new AbortController(),events={signal:abort.signal},urls=new Map();
  let dead=false,io=0,controls=null,activeTab='basic',currentDraft=null,exploded=false,controller,lastAnimationReport=null,lastAnimationUI=0;
  const selector=q('[data-dot-model]');for(const model of MODEL_CATALOG)selector.add(new Option(model.label,model.assetId));
  const tabButtons=new Map();
  for(const tab of [...PARAMETER_TABS,{id:'animation',label:'动画'}]){const button=document.createElement('button');button.type='button';button.dataset.dotTab=tab.id;button.textContent=tab.label;button.classList.toggle('active',tab.id===activeTab);q('.dot-tabs').append(button);tabButtons.set(tab.id,button);}
  function applyTab(id){activeTab=id;for(const [key,button]of tabButtons){button.classList.toggle('active',key===id);button.setAttribute('aria-selected',String(key===id));button.tabIndex=key===id?0:-1;}
    q('.plugin-fields').hidden=id==='animation';q('.dot-animation').hidden=id!=='animation';q('.pgf-update-mode').hidden=id==='animation'||!controls;controls?.tab(id);}
  const preview=createPluginPreview(q('.center'),()=>{controller?.frameRendered();if(performance.now()-lastAnimationUI>150)syncAnimation();},{animated:true,runtimeFactory:args=>createModelAnimationRuntime(args,{onChange:()=>syncAnimation(),onDispose:report=>{lastAnimationReport=report;}})});
  function syncAnimation(){if(dead)return;lastAnimationUI=performance.now();const runtime=preview.runtime,state=runtime?.state(),model=controller?.model(),caps=model?animationCapabilities(model.assetId):{drive:false,fire:false},ready=controller?.state().exportable;
    q('[data-animation-drive]').disabled=!ready||!(caps.motion??caps.drive)||!state?.motionAvailable;q('[data-animation-fire]').disabled=!ready||!caps.fire||!state?.fireAvailable;q('[data-animation-pause]').disabled=!runtime?.playing;q('[data-animation-reset]').disabled=!runtime?.available;
    q('[data-animation-drive]').textContent=caps.motionLabel??'行走';q('[data-animation-fire]').textContent=caps.fireLabel??'开火演出';
    q('[data-animation-state]').textContent=state?.loading?'正在加载演出资源…':runtime?.playing?'正在播放 · 演出倍率不是物理速度':runtime?.available?'已暂停 / 就绪 · 播放按钮可继续或重播':'此模型当前没有可播放的预览动画';
  }
  preview.renderer.domElement.setAttribute('aria-label','dot 模型统一三维视图');
  function status(text,failure=false){if(dead)return;q('[data-status]').textContent=text;q('[data-status]').dataset.error=String(failure);}
  function download(bytes,name,type){if(dead)return;const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();urls.set(url,setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},5000));}
  function showSchema(adapter,model,recipe){
    controls=null;currentDraft=recipe;exploded=false;selector.value=model.assetId;q('h1').textContent=model.label;q('[data-description]').textContent=model.description;
    q('.plugin-fields').replaceChildren();q('.preset-grid').replaceChildren();q('[data-part]').replaceChildren();q('[data-part]').hidden=true;q('[data-explode]').hidden=true;q('[data-metrics]').textContent='';
    q('[data-capabilities]').textContent=capabilitySummary(model);
    q('[data-animation-description]').textContent=model.assetId==='bm13-us6-visual-prop'?'本模型仅提供静态外观；三轴十轮保持装配姿态，尚未提供已验证的轮滚或发射演出。':model.capabilities.animation==='none'?'本模型仅提供静态外观；没有可播放的牵引、行走或发射预览动画。':model.assetId==='flakzwilling43-visual-prop'?'游戏美术演出：固定底架上的朝向展示与同时艺术烟云；没有本型实射影像确证，不表示真实发射顺序、时序或性能。':model.assetId==='qf25-visual-prop'?'固定外观的牵引滚动展示与局部烟云；采用艺术比例，没有自行行走、弹道、火球或机械后坐。':model.assetId==='nebelwerfer41-visual-prop'?'固定外观资产上的 N4 美术发射演出；没有自行行走动作。':model.assetId==='gustav-visual-prop'?'轨道移动为牵引展示；开火为影像参考外观烟云，不包含炮弹飞行或性能模拟。':'行走仅为当前模型轮组 / 履带的直线往返展示；未提供开火演出。';
    q('[data-animation-speed]').value='1';q('[data-animation-framing]').value='model';
    q('.dot-unavailable').hidden=canMount(model);q('[data-unavailable]').textContent=model.backend.reason??'';
    q('[data-auto-generate]').disabled=!adapter;
    if(adapter){controls=mountSchemaControls(q('.plugin-fields'),adapter,recipe);
      for(const preset of adapter.presets??[]){const button=document.createElement('button');button.dataset.preset=preset.id;button.textContent=preset.name??preset.id;q('.preset-grid').append(button);}}
    for(const [id,button]of tabButtons)button.hidden=!['basic','advanced','animation'].includes(id)&&!controls?.tabs.some(tab=>tab.id===id);
    if(tabButtons.get(activeTab)?.hidden)activeTab='basic';applyTab(activeTab);
  }
  function showAsset(asset,recipe){
    exploded=false;q('[data-explode]').textContent='分解查看';q('[data-part]').replaceChildren(new Option('选择部件',''));
    if(!asset)return;currentDraft=recipe;controls?.paint(recipe);
    const id=controller.model().assetId;
    q('[data-explode]').hidden=id!=='reference-armored-car';
    q('[data-part]').hidden=false;
    for(const node of asset.nodes)q('[data-part]').add(new Option(node.name??node.id,node.id));
  }
  controller=createUnifiedController({initial:readWorkspaceRecipe(initial),preview,loadBackend,runJob:runModelJob,onSchema:showSchema,onAsset:showAsset,
    onState(state){
      q('[data-export]').disabled=!state.exportable;q('[data-save]').disabled=!state.exportable;q('[data-dot-save]').disabled=state.busy;
      q('[data-cancel]').disabled=!state.busy&&!state.dirty&&!state.exporting;q('[data-generate]').disabled=!controls||!state.active;
      q('[data-part]').disabled=!state.exportable;q('[data-explode]').disabled=!state.exportable;q('[data-frame]').disabled=!state.hasAsset;
      if(state.stats)q('[data-metrics]').textContent=`${(state.stats.renderedTriangles??0).toLocaleString()} 三角面 · ${state.stats.generationMs} ms`;
      const messages={loading:'正在切换模型…',generating:'正在生成模型…',ready:'已生成 · 可保存配方与导出静态 GLB',editing:'参数已更改，等待应用',paused:'已暂停，重新显示后继续',idle:'已取消，点击生成重新加载', 'source-only':controller.model().backend.reason};
      status(state.error||messages[state.phase]||'',state.phase==='error');syncAnimation();
    }});
  q('.dot-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-dot-tab]');if(button)applyTab(button.dataset.dotTab);},events);
  q('.dot-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const visible=[...tabButtons.values()].filter(button=>!button.hidden),index=visible.indexOf(event.target);if(index<0)return;event.preventDefault();event.stopImmediatePropagation();const next=event.key==='Home'?0:event.key==='End'?visible.length-1:(index+(event.key==='ArrowRight'?1:-1)+visible.length)%visible.length;visible[next].click();visible[next].focus();},events);
  q('.plugin-fields').addEventListener('input',()=>{io++;try{currentDraft=controls.read(currentDraft);controller.updateDraft(currentDraft,{automatic:q('[data-auto-generate]').checked});}catch(error){controller.invalidDraft('参数需要有效的数值或 JSON：'+error.message);}},events);
  q('[data-auto-generate]').addEventListener('change',()=>{if(q('[data-auto-generate]').checked&&controller.state().dirty)void controller.generate();},events);
  q('.preset-grid').addEventListener('click',event=>{const button=event.target.closest('[data-preset]');if(!button)return;io++;const adapter=controller.adapter(),preset=adapter.presets.find(p=>p.id===button.dataset.preset);if(preset)void controller.generate({...currentDraft,params:{...adapter.defaults,...preset.params}});},events);
  selector.addEventListener('change',()=>{io++;void controller.select(selector.value);},events);
  q('[data-animation-drive]').addEventListener('click',()=>{preview.play('drive');syncAnimation();},events);
  q('[data-animation-fire]').addEventListener('click',()=>{preview.play('fire');syncAnimation();},events);
  q('[data-animation-pause]').addEventListener('click',()=>{preview.pause();syncAnimation();},events);
  q('[data-animation-reset]').addEventListener('click',()=>{preview.runtime?.reset();preview.invalidate();syncAnimation();},events);
  q('[data-animation-speed]').addEventListener('change',()=>{preview.runtime?.setSpeed(Number(q('[data-animation-speed]').value));syncAnimation();},events);
  q('[data-animation-framing]').addEventListener('change',()=>{preview.runtime?.setFraming(q('[data-animation-framing]').value);preview.frame();},events);
  q('[data-frame]').addEventListener('click',()=>preview.frame(),events);
  q('[data-generate]').addEventListener('click',()=>{io++;try{currentDraft=controls.read(currentDraft);void controller.generate(currentDraft);}catch(error){controller.invalidDraft(error.message);}},events);
  q('[data-cancel]').addEventListener('click',()=>{io++;controller.cancel();},events);
  q('[data-part]').addEventListener('change',()=>preview.selectNode(q('[data-part]').value||null),events);
  q('[data-explode]').addEventListener('click',()=>{
    const asset=controller.currentAsset();if(!asset)return;exploded=!exploded;q('[data-explode]').textContent=exploded?'恢复装配':'分解查看';
    const centers={hull:[0,1.24,.15],'turret-pivot':[0,2.10,-.15]},updates=[];
    for(const node of asset.nodes){const center=centers[node.name]??(node.name?.startsWith('wheel-')?node.transform.position:null);if(!center)continue;const transform=structuredClone(node.transform);if(exploded)for(let i=0;i<3;i++)transform.position[i]+=.55*(center[i]-[0,1.35,.15][i]);updates.push({id:node.id,transform});}
    preview.selectNode(null);q('[data-part]').value='';preview.setTransforms(updates);preview.frame();
  },events);
  async function exportAsset(){const ticket=++io,result=await controller.exportAsset();if(!dead&&ticket===io&&result)download(result.bytes,result.filename,'model/gltf-binary');return result;}
  q('[data-export]').addEventListener('click',()=>void exportAsset(),events);
  q('[data-save]').addEventListener('click',()=>{const recipe=controller.snapshot().models[controller.model().assetId];if(recipe)download(JSON.stringify(recipe,null,2),recipe.generator+'.recipe.json','application/json');},events);
  q('[data-dot-save]').addEventListener('click',()=>download(JSON.stringify(controller.snapshot(),null,2),'dot-model-generator.workspace.json','application/json'),events);
  q('[data-load]').addEventListener('click',()=>q('[data-file]').click(),events);
  async function applyRecipe(value){io++;if(value?.format==='PGF.ComponentRecipe'){
    getModel(value.generator);const native=readNativeRecipe(value.generator,value),workspace=controller.snapshot();workspace.assetId=value.generator;workspace.models[value.generator]=native;return controller.restore(workspace);
  }return controller.restore(readWorkspaceRecipe(value));}
  q('[data-file]').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const ticket=++io;
    try{if(file.size>2_000_000)throw Error('配方超过 2 MB');const text=await file.text();if(!dead&&ticket===io)await applyRecipe(JSON.parse(text));}catch(error){if(!dead&&ticket===io)status(error.message,true);}},events);
  void controller.select(controller.model().assetId);
  return {ready:controller.ready,preview,elements:{workspace:q('.workspace'),center:q('.center')},snapshot:controller.snapshot,
    applyRecipe,exportAsset,currentAsset:controller.currentAsset,currentModel:()=>controller.model().assetId,
    selectModel(id){io++;return controller.select(id);},setActive(value){preview.runtime?.setActive(!!value);controller.setActive(value);syncAnimation();},catalog:()=>structuredClone(MODEL_CATALOG),
    diagnostics:()=>({...controller.diagnostics(),preview:preview.diagnostics(),canvasCount:q('.center').querySelectorAll('canvas').length,ownedObjectURLs:urls.size,exploded,animation:preview.runtime?.diagnostics().animation??lastAnimationReport?.animation??null}),
    dispose(){if(dead)return;dead=true;io++;abort.abort();controller.dispose();for(const [url,timer]of urls){clearTimeout(timer);URL.revokeObjectURL(url);}urls.clear();}};
}
