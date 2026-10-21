import adapter from './definition.mjs';
import workerURL from './worker.js?worker&url';
import {mountDataWorkbench} from "../data-workbench/editor.js";
import './workbench.css';
const presetArtwork={
 reference:new URL('./presets/reference.png',import.meta.url).href,
 forward:new URL('./presets/forward.png',import.meta.url).href,
 clean:new URL('./presets/clean.png',import.meta.url).href,
 dusty:new URL('./presets/dusty.png',import.meta.url).href
};
export function mount(root,initial){
 let editor,exploded=false,button,select;
 const controller=new AbortController(),events={signal:controller.signal};
 editor=mountDataWorkbench(root,{id:'reference-armored-car',label:'参考图四轮装甲车',description:'Blender 制作的外观部件库 · 可调视觉姿态、漆面与三档细节。尺寸和隐藏面为推定；分解只用于预览，导出保留装配姿态。',adapter,workerURL,presetArtwork,
  onResult(asset){exploded=false;if(button)button.textContent='分解查看';if(select){select.replaceChildren(new Option('选择部件',''));for(const node of asset.nodes.filter(n=>['hull','turret-pivot','gun-elevation-pivot','front-fenders','rear-fenders','side-boxes','rear-boxes','hatch','tools'].includes(n.name)||n.name.startsWith('wheel-'))){const labels={'hull':'车体','turret-pivot':'炮塔','gun-elevation-pivot':'炮管','front-fenders':'前挡泥板','rear-fenders':'后挡泥板','side-boxes':'侧储物箱','rear-boxes':'后储物箱','hatch':'舱盖','tools':'车侧工具'};select.add(new Option(labels[node.name]??node.name,node.id));}}},
  onState(s){if(button)button.disabled=s.busy||s.exporting||!s.hasAsset;if(select)select.disabled=s.busy||!s.hasAsset;}
 },initial);
 root.classList.add('reference-armored-workbench');
 const toolbar=root.querySelector('.viewport-tools');button=document.createElement('button');button.dataset.explode='';button.textContent='分解查看';button.title='分解只影响预览，导出保留装配姿态';button.disabled=true;toolbar.append(button);
 select=document.createElement('select');select.dataset.partSelect='';select.setAttribute('aria-label','选择装甲车部件');select.add(new Option('选择部件',''));toolbar.append(select);
 select.addEventListener('change',()=>editor.preview.selectNode(select.value||null),events);
 button.addEventListener('click',()=>{
  const asset=editor.currentAsset();if(!asset)return;exploded=!exploded;button.textContent=exploded?'恢复装配':'分解查看';
  const centers={'hull':[0,1.24,.15],'turret-pivot':[0,2.10,-.15]},updates=[];
  for(const node of asset.nodes){let c=centers[node.name];if(node.name.startsWith('wheel-'))c=node.transform.position;if(!c)continue;const t=structuredClone(node.transform);if(exploded)for(let i=0;i<3;i++)t.position[i]+=.55*(c[i]-[0,1.35,.15][i]);updates.push({id:node.id,transform:t});}
  editor.preview.selectNode(null);select.value='';editor.preview.setTransforms(updates);editor.preview.frame();
 },events);
 const dispose=editor.dispose;editor.dispose=()=>{controller.abort();dispose();};editor.isExploded=()=>exploded;return editor;
}
