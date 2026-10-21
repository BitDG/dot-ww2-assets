import adapter from './definition.mjs';
import './workbench.css';
import workerURL from './worker.js?worker&url';
import {mountDataWorkbench} from "../data-workbench/editor.js";
const presetArtwork=Object.fromEntries(['reference','inspection','exploded'].map(id=>[id,new URL(`./thumbnails/${id}.png`,import.meta.url).href]));
export function mount(root,initial){
 let editor,selector;const labels={chassis:'车体', 'running-gear':'履带轮组',engine:'发动机舱',platform:'平台与栏杆',carriage:'炮架底座',cradle:'展示支架',barrel:'空心炮管',mechanisms:'外部框架与附件'};
 editor=mountDataWorkbench(root,{id:'tracked-mortar',label:'履带重型臼炮',description:'Blender MCP 外观重建 · 十一对负重轮 · 低位参考姿态',adapter,workerURL,presetArtwork,onResult(asset){if(!selector)return;selector.replaceChildren(new Option('全部组件',''));for(const [key,label]of Object.entries(labels)){const node=asset.nodes.find(n=>n.name==='mortar-'+key);if(node)selector.add(new Option(label,node.id));}}},initial);
 root.classList.add('tracked-mortar-workbench');
 const panel=root.querySelector('aside'),label=document.createElement('label');label.className='panel-hint';label.textContent='部件检查';selector=document.createElement('select');selector.setAttribute('aria-label','部件检查');selector.style.cssText='width:100%;margin:8px 0 16px;padding:8px;background:var(--panel);color:inherit;border:1px solid var(--border);border-radius:6px';label.append(selector);panel.append(label);
 selector.add(new Option('全部组件',''));const select=()=>editor.preview.selectNode(selector.value);selector.addEventListener('change',select);const dispose=editor.dispose;editor.dispose=()=>{selector.removeEventListener('change',select);dispose();};return editor;
}
