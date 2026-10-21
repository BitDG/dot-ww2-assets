import adapter from './definition.mjs';
import workerURL from './worker.js?worker&url';
import {mountDataWorkbench} from '../data-workbench/editor.js';
export function mount(root,initial){return mountDataWorkbench(root,{id:adapter.id,label:adapter.label,description:'固定 Blender 外观美术资产 · 共享 PGF 涂装与部件可见性 · 静态 GLB · 非在线重新建模',adapter,workerURL},initial);}
