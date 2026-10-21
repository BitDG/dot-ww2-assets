import './workbench.css';
import adapter from './definition.mjs';
import workerURL from './worker.js?worker&url';
import {mountDataWorkbench} from '../data-workbench/editor.js';
const art=import.meta.glob('./presets/*.png',{eager:true,query:'?url',import:'default'});
const presetArtwork=Object.fromEntries(Object.entries(art).map(([path,url])=>[path.split('/').at(-1).slice(0,-4),url]));
export function mount(root,initial){const editor=mountDataWorkbench(root,{id:adapter.id,label:adapter.label,description:'非功能性游戏外观 · 未测量艺术比例 · Blender MCP 外壳与 PGF 规则件组合 · 隐藏面为艺术推测',adapter,workerURL,presetArtwork},initial);root.classList.add('gustav-visual-workbench');root.querySelector('footer span:last-child').textContent='艺术比例 · Y-up · 静态 GLB';const title=root.querySelector('.workspace > aside:last-child > .panel-title');if(title)title.textContent='外观与涂装';return editor;}
