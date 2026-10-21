import adapter from './definition.mjs';
import workerURL from './worker.js?worker&url';
import {mountDataWorkbench} from '../data-workbench/editor.js';
export function mount(root,initial){return mountDataWorkbench(root,{id:adapter.id,label:adapter.label,description:'Blender 三档外观资产 · 共享 PGF 涂装、艺术比例与部件 · 静态 GLB · 上下双管、三脚部署',adapter,workerURL},initial);}
