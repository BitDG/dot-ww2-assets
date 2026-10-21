import * as THREE from 'three';
import {createTankShotEffects} from '../combat-fx/runtime/tank-shot-effects.mjs';
import {defaultVisualEffects} from '../combat-fx/runtime/visual-effects-config.mjs';
import {bindGustavVisualMouth} from './binding.mjs';

export const VEHICLE_FIRE_IDS=Object.freeze(['gustav-visual-prop']);
export const FIRE_DEFAULTS=Object.freeze({seed:8137,duration:6,intensity:1,quality:'medium'});
const ART_PLUME_SCALE=1.8; // Visual staging only, not a measured blast dimension.
export function vehicleFireCapabilities(id){return Object.freeze({fire:VEHICLE_FIRE_IDS.includes(id),previewOnly:true,hostTickOnly:true,animatedGLB:false,projectileSimulation:false,mechanicalRecoil:false,label:VEHICLE_FIRE_IDS.includes(id)?'影像参考开火外观':'开火外观未接入'});}
function settings(input={}){
  const v={...FIRE_DEFAULTS,...input};
  for(const [key,min,max]of [['seed',0,4294967295],['duration',5,12],['intensity',0,2]])if(!Number.isFinite(v[key])||v[key]<min||v[key]>max)throw new RangeError('Invalid art preview '+key);
  if(!Number.isInteger(v.seed)||!['low','medium','high'].includes(v.quality))throw new RangeError('Invalid art preview seed or quality');return v;
}
function unavailable(id,reason){const diagnostics=()=>({fireAvailable:false,fireAssetId:id,fireReason:reason,firePlaying:false,capabilities:{...vehicleFireCapabilities(id),fire:false}});return {available:false,playing:false,play:()=>false,pause(){},seek(){},update(){},reset(){},stop(){},setActive(){},setSpeed(){},dispose(){},diagnostics,status:diagnostics};}

/** Borrow the PGF preview. Own only the transient FX group and PGF particle lease.
 * No renderer, RAF, timers, listeners, projectile, recoil or static-asset edits.
 * All durations and shape controls are authored art settings, not weapon data.
 */
export function createVehicleFirePreview({scene,object,asset,assetId=asset?.generator?.id??asset?.id,invalidate=()=>{},valid=()=>true,config={},effectsFactory=createTankShotEffects}={}){
  if(!VEHICLE_FIRE_IDS.includes(assetId))return unavailable(assetId,'此模型没有已核验的开火外观适配');
  if(!valid())return unavailable(assetId,'预览绑定已过期');
  const options=settings(config);let binding;
  try{binding=bindGustavVisualMouth(object,scene);}catch(error){return unavailable(assetId,error.message);}
  const root=new THREE.Group();root.name='dot-owned-gustav-fire-preview';scene.add(root);
  let fx;try{fx=effectsFactory(root);}catch(error){root.removeFromParent();throw error;}
  const look=defaultVisualEffects();
  // Monochrome films establish values and shapes, not historical colors.
  Object.assign(look.flame,{tint:true,color:'#eee9dc'});
  Object.assign(look.muzzleSmoke,{count:options.intensity,size:2.5,opacity:1.05,life:1,spread:1.5,rise:.8,turbulence:1.4,tint:true,color:'#696e69'});
  try{fx.setPreview(look);}catch(error){fx.dispose();root.removeFromParent();throw error;}
  let dead=false,active=true,running=false,state='idle',tick=0,remainder=0,speed=1,emitted=0,lastOrigin=null,cloudLayers=[];
  const hz=120,totalTicks=Math.round(options.duration*hz),cueTick=Math.round(totalTicks*.07);
  function reset(){if(dead)return;fx.clear();fx.setSeed(options.seed);tick=0;remainder=0;emitted=0;lastOrigin=null;cloudLayers=[];running=false;state='idle';invalidate();}
  function emit(){
    const anchor=binding.read();root.position.copy(anchor.position);root.scale.setScalar(anchor.artScale*ART_PLUME_SCALE);root.updateMatrix();
    // This legacy API slot is a fixed visual-size scaler, not caliber data.
    const count={low:[18,11,8],medium:[23,15,11],high:[28,19,15]}[options.quality];
    const side=new THREE.Vector3().crossVectors(anchor.direction,new THREE.Vector3(0,1,0)).normalize();
    // Three overlapping decorative cloud layers belong to ONE authored cue.
    // Irregular offsets create a broken outline rather than one uniform sphere.
    const layers=[
      {origin:new THREE.Vector3(),size:2.2,opacity:1.1},
      {origin:anchor.direction.clone().multiplyScalar(-.4).addScaledVector(side,1.5).add(new THREE.Vector3(0,1.7,0)),size:1.85,opacity:1.25},
      {origin:anchor.direction.clone().multiplyScalar(1.8).addScaledVector(side,-1.4).add(new THREE.Vector3(0,.3,0)),size:1.45,opacity:.95},
    ];
    layers.forEach((layer,index)=>{
      const layerLook=structuredClone(look);Object.assign(layerLook.muzzleSmoke,{size:layer.size,opacity:layer.opacity});fx.setPreview(layerLook);
      const existing=new Set(root.children);
      // Each layer starts at the same visual anchor. The owned PGF shot Group
      // gradually opens into its authored offset as the smoke grows.
      fx.emit(new THREE.Vector3(),anchor.direction,42,false,{flashLength:.65,flashWidth:4.5,flashDurationS:.075,flashOpacity:index===0?.85:0,lightIntensity:index===0?1.8:0,smokeCount:count[index],smokeLifeS:3.5-index*.2,smokeSpread:.95,smokeRise:.3});
      for(const group of root.children)if(group.isGroup&&!existing.has(group))cloudLayers.push({group,offset:layer.origin.clone()});
    });
    fx.setPreview(look);
    emitted++;lastOrigin={position:anchor.position.toArray(),direction:anchor.direction.toArray(),artScale:anchor.artScale};
  }
  function advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw new RangeError('演出时间增量必须是非负有限数');
    remainder+=dt*hz;const count=Math.min(Math.floor(remainder+1e-8),totalTicks-tick);remainder=Math.max(0,remainder-count);
    for(let i=0;i<count;i++){
      tick++;if(tick===cueTick)emit();fx.update(1/hz);
      const u=THREE.MathUtils.clamp((tick-cueTick+1)/(hz*1.2),0,1),opening=u*u*(3-2*u);
      for(const layer of cloudLayers)if(layer.group.parent===root)layer.group.position.copy(layer.offset).multiplyScalar(opening);
    }
    if(tick===totalTicks){fx.clear();cloudLayers=[];running=false;state='complete';remainder=0;}
  }
  function diagnostics(){return {fireAvailable:!dead,fireAssetId:assetId,firePlaying:!dead&&active&&running,fireState:state,fireTime:tick/hz,fireDuration:options.duration,fireSpeed:speed,fireEmissions:emitted,fireCloudLayers:emitted?3:0,fireLive:dead?0:fx.count,fireAnchor:lastOrigin,fireSettings:{...options},fireUpstream:dead?null:fx.snapshot(),fireOwnedChildren:root.children.length,disposed:dead,capabilities:vehicleFireCapabilities(assetId),evidenceScope:'catalog-attributed railway-gun visible plume reference; no shot-by-shot model or color certification'};}
  const api={
    get available(){return !dead;},get playing(){return !dead&&active&&running;},
    play(name='fire'){if(dead||!['fire','开火'].includes(name))return false;if(state!=='paused')reset();running=true;state='playing';invalidate();return true;},
    pause(){if(dead)return;running=false;if(state==='playing')state='paused';invalidate();},
    reset,stop:reset,
    seek(seconds){if(dead)return;if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('演出时间必须是非负有限数');const resume=running;reset();advance(Math.min(seconds,options.duration));if(tick<totalTicks){running=resume;state=resume?'playing':'paused';}invalidate();},
    setActive(value){if(dead)return;active=!!value;invalidate();},
    setSpeed(value){if(dead)return;if(!Number.isFinite(value)||value<.1||value>3)throw new RangeError('美术演出倍率必须在0.1到3之间');speed=value;invalidate();},
    update(dt){if(dead||!active||!running)return;advance(dt*speed);},
    bounds(){const a=binding.read(),box=new THREE.Box3().setFromObject(object),center=a.position.clone().addScaledVector(a.direction,2*a.artScale*ART_PLUME_SCALE);const plume=new THREE.Box3().setFromCenterAndSize(center,new THREE.Vector3(10,10,10).multiplyScalar(a.artScale*ART_PLUME_SCALE));return box.union(plume.applyMatrix4(scene.matrixWorld));},
    diagnostics,status:diagnostics,
    dispose(){if(dead)return;dead=true;running=false;state='disposed';fx.clear();cloudLayers=[];fx.dispose();root.clear();root.removeFromParent();},
  };
  reset();return api;
}
