import * as THREE from 'three';
import {bindQf25Visual} from './binding.mjs';
import {createTankShotEffects} from '../combat-fx/runtime/tank-shot-effects.mjs';
import {defaultVisualEffects} from '../combat-fx/runtime/visual-effects-config.mjs';

export const QF25_CAPABILITIES=Object.freeze({tow:true,fire:true,selfPropelled:false,hostTickOnly:true,previewOnly:true,animatedGLB:false,exportedParticles:false,projectileSimulation:false,mechanicalRecoil:false,performanceSimulation:false});
export const ART_DEFAULTS=Object.freeze({towCycle:8,towAmplitude:.7,smokeDuration:4,seed:251942});
function options(input){const out={...ART_DEFAULTS,...input};for(const [key,min,max]of [['towCycle',2,30],['towAmplitude',.05,2],['smokeDuration',3,8],['seed',0,4294967295]])if(!Number.isFinite(out[key])||out[key]<min||out[key]>max)throw RangeError('Invalid QF25 art setting: '+key);if(!Number.isInteger(out.seed))throw RangeError('Integer seed required');return out;}
const delta=v=>{if(!Number.isFinite(v)||v<0)throw RangeError('Nonnegative finite host time required');};
function unavailable(error){const diagnostics=()=>({available:false,playing:false,error,capabilities:{...QF25_CAPABILITIES,tow:false,fire:false}});return {available:false,playing:false,play:()=>false,pause(){},reset(){},stop(){},seek(){},update(){},setActive(){},dispose(){},diagnostics,status:diagnostics};}
/** PGF host owns tick, renderer and borrowed static model. No independent RAF,
 * timers, geometry modifications or asset disposal. All timing is authored art. */
export function createQf25VisualRuntime({object,scene,asset,appearance,radiusArt,config={},invalidate=()=>{},valid=()=>true,effectsFactory=createTankShotEffects}={}){
  const settings=options(config);if(!valid())return unavailable('QF25 stale initial binding');let binding;try{binding=bindQf25Visual({object,scene,asset,appearance,radiusArt});}catch(error){return unavailable(error.message);}
  let dead=false,active=true,running=false,state='idle',mode='tow',time=0,tick=0,remainder=0,root=null,fx=null,emitted=0,lastAnchor=null,error=null;
  const hz=120,totalTicks=Math.round(settings.smokeDuration*hz),cueTick=24;
  function notify(){if(!dead)invalidate();}
  function clearSmoke(){fx?.clear();emitted=0;lastAnchor=null;}
  function reset(){if(dead)return;binding.restore();clearSmoke();time=tick=remainder=0;running=false;state='idle';error=null;notify();}
  function blockFire(){clearSmoke();running=false;state='blocked';error='请先显式选择无罩帽外观；罩帽可见时不能播放开火外观';notify();return false;}
  function ensureFx(){if(fx)return;const nextRoot=new THREE.Group();nextRoot.name='QF25_Owned_Preview_Smoke';nextRoot.userData.previewOnly=true;let nextFx;try{nextFx=effectsFactory(nextRoot);const look=defaultVisualEffects();Object.assign(look.flame,{opacity:0,light:0});Object.assign(look.muzzleSmoke,{count:1,size:.8,opacity:.6,life:1,spread:.5,rise:.5,turbulence:.7,tint:true,color:'#99998e'});nextFx.setPreview(look);nextFx.setSeed(settings.seed);scene.add(nextRoot);root=nextRoot;fx=nextFx;}catch(e){nextFx?.dispose();nextRoot.removeFromParent();throw e;}}
  function emit(){if(!binding.fireAllowed())return blockFire();try{ensureFx();}catch(e){running=false;state='error';error=e.message;notify();return false;}const a=binding.anchor();root.position.copy(a.position);root.scale.setScalar(a.artScale*.65);root.updateMatrix();fx.emit(new THREE.Vector3(),a.direction,42,false,{flashOpacity:0,lightIntensity:0,smokeCount:14,smokeLifeS:2.4,smokeSpread:.45,smokeRise:.2});emitted++;lastAnchor={position:a.position.toArray(),direction:a.direction.toArray(),artScale:a.artScale};return true;}
  function advanceFire(dt){if(!binding.fireAllowed())return blockFire();remainder+=dt*hz;const steps=Math.min(Math.floor(remainder+1e-8),totalTicks-tick);remainder=Math.max(0,remainder-steps);for(let i=0;i<steps;i++){tick++;if(tick===cueTick&&!emit())return;if(emitted)fx?.update(1/hz);}time=tick/hz;if(tick===totalTicks){fx?.clear();running=false;state='complete';remainder=0;}}
  function applyTow(){binding.applyTow(settings.towAmplitude*Math.sin(time/settings.towCycle*Math.PI*2));}
  function diagnostics(){return {available:!dead,playing:!dead&&active&&running,disposed:dead,active,state,mode,time,error,emissions:emitted,lastAnchor,capabilities:{...QF25_CAPABILITIES,fire:!dead&&binding.fireAllowed()},binding:binding.diagnostics(),ownedChildren:root?.children.length??0,fx:dead?null:fx?.snapshot()??null,evidenceScope:'authored cosmetic roll and local smoke; timing, color and tow path are not historical measurements'};}
  const runtime={get available(){return !dead;},get playing(){return !dead&&active&&running;},get duration(){return mode==='fire'?settings.smokeDuration:settings.towCycle;},
    play(name=mode){if(dead||!['tow','fire'].includes(name))return false;if(name==='fire'&&!binding.fireAllowed())return blockFire();if(mode!==name||state!=='paused'){reset();mode=name;fx?.setSeed(settings.seed);}running=true;state='playing';notify();return true;},
    pause(){if(dead)return;running=false;if(state==='playing')state='paused';notify();},reset,stop:reset,
    seek(seconds){delta(seconds);if(dead)return false;const wasRunning=running;reset();if(mode==='fire'){if(!binding.fireAllowed())return blockFire();fx?.setSeed(settings.seed);advanceFire(Math.min(seconds,settings.smokeDuration));}else{time=seconds%settings.towCycle;applyTow();}if(state!=='complete'&&state!=='blocked'){running=wasRunning;state=wasRunning?'playing':'paused';}notify();return true;},
    update(dt){delta(dt);if(dead)return;if(mode==='fire'&&emitted&&!binding.fireAllowed()){blockFire();return;}if(!active||!running)return;if(mode==='fire')advanceFire(dt);else{time=(time+dt)%settings.towCycle;applyTow();}},
    setActive(value){if(dead)return;active=!!value;notify();},
    bounds(){object.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(object);const extent=Math.max(settings.towAmplitude,3)*Math.abs(binding.body.getWorldScale(new THREE.Vector3()).x);return box.expandByScalar(extent);},
    diagnostics,status:diagnostics,
    dispose(){if(dead)return;binding.restore();fx?.clear();fx?.dispose();fx=null;root?.clear();root?.removeFromParent();root=null;dead=true;running=false;state='disposed';},
  };return runtime;
}
