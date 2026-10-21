import * as THREE from 'three';
import {bindFlakzwillingVisual} from './binding.mjs';
import {createTankShotEffects} from '../combat-fx/runtime/tank-shot-effects.mjs';
import {defaultVisualEffects} from '../combat-fx/runtime/visual-effects-config.mjs';
export const FZ43_CAPABILITIES=Object.freeze({display:true,smoke:true,drive:false,tow:false,hostTickOnly:true,previewOnly:true,animatedGLB:false,exportedParticles:false,projectileSimulation:false,mechanicalRecoil:false,performanceSimulation:false,label:'游戏美术演出'});
export const ART_DEFAULTS=Object.freeze({displayCycle:10,yawAmplitude:.24,smokeDuration:4,seed:431944});
function settings(input){const out={...ART_DEFAULTS,...input};if(Object.keys(input).some(k=>!(k in ART_DEFAULTS)))throw RangeError('Unknown FZ43 art setting');for(const [k,min,max]of [['displayCycle',4,30],['yawAmplitude',0,.6],['smokeDuration',3,8],['seed',0,4294967295]])if(!Number.isFinite(out[k])||out[k]<min||out[k]>max)throw RangeError('Invalid FZ43 art setting: '+k);if(!Number.isInteger(out.seed))throw RangeError('Integer seed required');return out;}
const delta=v=>{if(!Number.isFinite(v)||v<0)throw RangeError('Nonnegative finite host time required');};
function unavailable(error){const diagnostics=()=>({available:false,playing:false,error,capabilities:{...FZ43_CAPABILITIES,display:false,smoke:false}});return {available:false,playing:false,play:()=>false,pause(){},reset(){},stop(){},seek(){},update(){},setActive(){},dispose(){},diagnostics,status:diagnostics};}
/** Borrowed model transforms only; host owns renderer, canvas and tick. All
 * timing is an invented game-art cue, never firing order or measured behavior. */
export function createFlakzwillingVisualRuntime({object,scene,asset,config={},invalidate=()=>{},valid=()=>true,effectsFactory=createTankShotEffects}={}){
 const options=settings(config);if(!valid())return unavailable('Stale initial FZ43 binding');let binding;try{binding=bindFlakzwillingVisual({object,scene});}catch(e){return unavailable(e.message);}
 let dead=false,active=true,running=false,state='idle',mode='display',time=0,tick=0,remainder=0,leases=[],emitted=0,lastAnchors=null,error=null;
 const hz=120,totalTicks=Math.round(options.smokeDuration*hz),cueTick=24;
 const notify=()=>{if(!dead)invalidate();};
 function clear(){leases.forEach(l=>l.fx.clear());emitted=0;lastAnchors=null;}
 function reset(){if(dead)return;binding.restore();clear();time=tick=remainder=0;running=false;state='idle';error=null;notify();}
 function block(){clear();running=false;state='blocked';error='上下外观管、封口与锚点必须可见';notify();return false;}
 function ensureFx(){if(leases.length)return;const pending=[];try{for(let i=0;i<2;i++){const root=new THREE.Group();root.name='FZ43_Owned_Preview_Smoke_'+i;root.userData.previewOnly=true;root.visible=active;const lease={root,fx:null};pending.push(lease);lease.fx=effectsFactory(root);const look=defaultVisualEffects();Object.assign(look.flame,{opacity:0,light:0});Object.assign(look.muzzleSmoke,{count:1,size:.6,opacity:.45,life:1,spread:.5,rise:.5,turbulence:.7,tint:true,color:'#99998e'});lease.fx.setPreview(look);lease.fx.setSeed((options.seed+i)>>>0);}pending.forEach(l=>scene.add(l.root));leases=pending;}catch(e){for(const l of pending){l.fx?.dispose();l.root.removeFromParent();}throw e;}}
 function emit(){if(!binding.allowed())return block();try{ensureFx();const anchors=binding.read();anchors.forEach((a,i)=>{const {root,fx}=leases[i];root.position.copy(a.position);root.scale.setScalar(a.artScale*.5);root.updateMatrix();fx.emit(new THREE.Vector3(),a.direction,42,false,{flashOpacity:0,lightIntensity:0,smokeCount:8,smokeLifeS:2.1,smokeSpread:.4,smokeRise:.2});});lastAnchors=anchors.map(a=>({position:a.position.toArray(),direction:a.direction.toArray(),artScale:a.artScale}));emitted++;return true;}catch(e){clear();running=false;state='error';error=e.message;notify();return false;}}
 function advance(dt){if(!binding.allowed())return block();remainder+=dt*hz;const steps=Math.min(Math.floor(remainder+1e-8),totalTicks-tick);remainder=Math.max(0,remainder-steps);for(let i=0;i<steps;i++){tick++;if(tick===cueTick&&!emit())return;if(emitted)leases.forEach(l=>l.fx.update(1/hz));}time=tick/hz;if(tick===totalTicks){leases.forEach(l=>l.fx.clear());running=false;state='complete';remainder=0;}}
 const apply=()=>binding.apply(options.yawAmplitude*Math.sin(time/options.displayCycle*Math.PI*2));
 function diagnostics(){return {available:!dead,playing:!dead&&active&&running,disposed:dead,active,state,mode,time,error,emissions:emitted,lastAnchors,capabilities:{...FZ43_CAPABILITIES,smoke:!dead&&binding.allowed()},binding:binding.diagnostics(),ownedChildren:leases.reduce((n,l)=>n+l.root.children.length,0),fx:dead?null:leases.map(l=>l.fx.snapshot()),evidenceScope:'游戏美术演出；无本型实射影片确证；展示朝向与同时烟云均为艺术设计，无真实发射顺序或时序'};}
 return {get available(){return !dead;},get playing(){return !dead&&active&&running;},get duration(){return mode==='smoke'?options.smokeDuration:options.displayCycle;},
 play(name=mode){if(dead||!['display','smoke'].includes(name))return false;if(name==='smoke'&&!binding.allowed())return block();if(mode!==name||state!=='paused'){reset();mode=name;leases.forEach((l,i)=>l.fx.setSeed((options.seed+i)>>>0));}running=true;state='playing';notify();return true;},
 pause(){if(dead)return;running=false;if(state==='playing')state='paused';notify();},reset,stop:reset,
 seek(seconds){delta(seconds);if(dead)return false;const wasRunning=running;reset();if(mode==='smoke'){leases.forEach((l,i)=>l.fx.setSeed((options.seed+i)>>>0));advance(Math.min(seconds,options.smokeDuration));}else{time=seconds%options.displayCycle;apply();}if(!['complete','blocked','error'].includes(state)){running=wasRunning;state=wasRunning?'playing':'paused';}notify();return !['blocked','error'].includes(state);},
 update(dt){delta(dt);if(dead)return;if(mode==='smoke'&&emitted&&!binding.allowed()){block();return;}if(!active||!running)return;if(mode==='smoke')advance(dt);else{time=(time+dt)%options.displayCycle;apply();}},
 setActive(v){if(dead)return;active=!!v;leases.forEach(l=>l.root.visible=active);notify();},
 bounds(){object.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(object).expandByScalar(3*Math.abs(binding.body.getWorldScale(new THREE.Vector3()).x));},diagnostics,status:diagnostics,
 dispose(){if(dead)return;binding.restore();for(const l of leases){l.fx.clear();l.fx.dispose();l.root.clear();l.root.removeFromParent();}leases=[];dead=true;running=false;state='disposed';}
 };
}
