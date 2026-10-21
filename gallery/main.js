import {MODEL_CATALOG,canMount} from '../modules/dot-model-generator/catalog.mjs';
import './style.css';
const images={
 'nebelwerfer41-visual-prop':new URL('./n41-render.png',import.meta.url).href,
'reference-armored-car':new URL('../modules/reference-armored-car/evidence/10-runtime-tank-reference-pbr.png',import.meta.url).href,
 'tracked-mortar':new URL('../modules/tracked-mortar/blender/evidence/pgf-glb-reimport-hero.png',import.meta.url).href,
 'gustav-visual-prop':new URL('../modules/gustav-visual-prop/evidence/final-hero.png',import.meta.url).href,
 'diesel-locomotive':new URL('../modules/diesel-locomotive/evidence/D6-hero.png',import.meta.url).href,
 'armored-4x4':new URL('../modules/armored-4x4/thumbs/reference.png',import.meta.url).href,
 'qf25-visual-prop':new URL('../modules/dot-model-generator/qf25-q2-evidence/QF25-Q2-static-viewport.png',import.meta.url).href,
 'flakzwilling43-visual-prop':new URL('../modules/dot-model-generator/flakzwilling-evidence/Flakzwilling-F2-static-viewport.png',import.meta.url).href,
 'bm13-us6-visual-prop':new URL('../modules/bm13-us6-visual-prop/evidence/renders/BM13-B6-PGF-hero.png',import.meta.url).href,
 'qf17-visual-prop':new URL('../modules/qf17-visual-prop/evidence/Q6-final/QF17-Q6-PGF-three-view.png',import.meta.url).href,
 'land-mattress-visual-prop':new URL('../modules/land-mattress-visual-prop/evidence/final/LM-L3-PGF-three-view.png',import.meta.url).href,
};
const gallery=document.querySelector('#gallery'),viewer=document.querySelector('#viewer'),root=document.querySelector('#rock-lab');let workbench=null,revision=0;
gallery.innerHTML=`<header class="masthead"><a class="wordmark" href="#">DOT <span>ASSET COLLECTION</span></a><a href="https://github.com/BitDG/dot-ww2-assets">源码与文档 ↗</a></header><main class="collection"><div class="eyebrow">游戏美术 / 装备外观档案</div><h1>模型展厅<span>11 件可运行资产</span></h1><p class="intro">查看真实模型，调整原生参数与材质，下载静态 GLB。已有演出沿用原模型；艺术比例与外观推测均保留说明。</p><section class="notice"><strong>Kar98k · 优先制作 / WIP</strong><p>当前仅完成参考与美术准备。Blender MCP 未接通，没有已生成模型、GLB 或模型实渲。未将概念设计计入模型。</p><a href="https://github.com/BitDG/dot-ww2-assets/tree/main/preparation/kar98k">查看准备与阻塞记录 ↗</a></section><div class="filters"><label>检索模型 <input id="search" type="search" placeholder="名称 / 型号" /></label><span id="count"></span></div><section id="cards" class="cards" aria-label="真实资产目录"></section><section class="archive"><h2>未开放资产</h2><p>K5：暂停，恢复的资料仅归档，不开放生成。Long Tom：暂停，已检查分支中未找到可恢复模型。Flak18/36 F6：未迁入，既有下载限制未解除。PaK40、75 mm M1A1：尚未建模。</p></section><footer>缩略图为实际模型渲染 / 历史浏览器预览；N41 为本次固定 GLB 的 Blender 实渲。均非本次 Firefox 验收。新展示页的验证边界见仓库 README。</footer></main>`;
const cards=document.querySelector('#cards');
function render(query=''){
 cards.replaceChildren();const items=MODEL_CATALOG.filter(canMount).filter(m=>(m.label+' '+m.assetId).toLowerCase().includes(query.toLowerCase()));
 document.querySelector('#count').textContent=items.length+' 件资产';
 for(const model of items){const card=document.createElement('article');card.className='card';
 const image=images[model.assetId];if(image){const img=document.createElement('img');img.src=image;img.alt=model.label+' · 历史真实模型渲染';img.loading='lazy';card.append(img);}else {const note=document.createElement('div');note.className='no-image';note.textContent='可运行模型 · 尚无独立缩略图';card.append(note);}
 const body=document.createElement('div');body.className='card-body';const tag=document.createElement('span');tag.className='tag';tag.textContent=model.capabilities.animation==='none'?'静态资产':'静态资产 + 预览演出';const title=document.createElement('h2');title.textContent=model.label;const desc=document.createElement('p');desc.textContent=model.description;const actions=document.createElement('div');actions.className='card-actions';const open=document.createElement('button');open.textContent='打开三维展示';open.onclick=()=>{location.hash=encodeURIComponent(model.assetId);};const download=document.createElement('a');download.textContent='下载 GLB ↓';download.href='./models/'+model.assetId+'.glb';download.download=model.assetId+'.glb';actions.append(open,download);body.append(tag,title,desc,actions);card.append(body);cards.append(card);}
}
render();document.querySelector('#search').oninput=e=>render(e.target.value);
async function route(){const id=decodeURIComponent(location.hash.slice(1)),model=MODEL_CATALOG.find(m=>m.assetId===id&&canMount(m)),ticket=++revision;workbench?.dispose();workbench=null;root.replaceChildren();gallery.hidden=!!model;viewer.hidden=!model;if(!model)return;
 root.innerHTML='<p class="loading">正在加载真实模型…</p>';
 try{const {mount}=await import('../modules/dot-model-generator/workbench.js');if(ticket!==revision)return;workbench=mount(root,{format:'PGF.DotModelRecipe',version:1,generator:'dot-model-generator',assetId:id,models:{}});await workbench.ready;}catch(error){if(ticket!==revision)return;const p=document.createElement('p');p.className='load-error';p.textContent='模型加载失败：'+error.message;root.append(p);}
}
document.querySelector('#back').onclick=()=>{location.hash='';};window.addEventListener('hashchange',route);document.addEventListener('visibilitychange',()=>workbench?.setActive(!document.hidden));window.addEventListener('pagehide',()=>workbench?.dispose());route();
