import adapter from './definition.mjs';
import workerURL from './worker.js?worker&url';
import {mountDataWorkbench} from "../data-workbench/editor.js";
import {createVehiclePreview} from './preview.js';
import './workbench.css';
const presetArtwork=Object.fromEntries(['reference','desert','olive','field','exploded'].map(id=>[id,new URL(`./thumbs/${id}.webp`,import.meta.url).href]));
export function mount(root,initial){root.dataset.armoredVehicle='';return mountDataWorkbench(root,{id:"armored-4x4",label:"装甲越野车 · 图像重建",description:'验收目标 ≥90% · 当前视觉复核未通过 · 可调整设备与零件分解',adapter,workerURL,presetArtwork,previewFactory:createVehiclePreview},initial);}
