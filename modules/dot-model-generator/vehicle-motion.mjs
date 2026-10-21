import * as THREE from 'three';
import {createMortarRunningGear} from './vehicle-motion-tracked.mjs';
import {bindGustavWheelFaces} from './vehicle-motion-batch.mjs';

export const VEHICLE_MOTION_IDS=Object.freeze(['reference-armored-car','tracked-mortar','gustav-visual-prop','diesel-locomotive','armored-4x4']);
export function vehicleMotionCapabilities(assetId){
  const supported=VEHICLE_MOTION_IDS.includes(assetId),tracked=assetId==='tracked-mortar',rail=['gustav-visual-prop','diesel-locomotive'].includes(assetId);
  return Object.freeze({drive:supported,track:supported&&tracked,wheel:supported,rail:supported&&rail,fire:false,previewOnly:true,animatedGLB:false,label:!supported?'运动未接入':tracked?'履带行走':assetId==='gustav-visual-prop'?'轨道移动（牵引展示）':rail?'轨道行走':'车轮行走'});
}
const ROOT_NAMES={'armored-4x4':'Armored 4x4'};
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
const finite=v=>Number.isFinite(v);
function named(root,name){let found=null,count=0;root.traverse(n=>{if(n.name===name){found=n;count++;}});if(count!==1)throw Error('运动部件缺失或重复：'+name);return found;}
function snapshot(node){return {node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),matrixAutoUpdate:node.matrixAutoUpdate};}
function restore(s){s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);s.node.updateMatrix();s.node.matrixAutoUpdate=s.matrixAutoUpdate;}
function wheelBinding(node,axis,radius,direction){
  if(!(radius>0)||!finite(radius))throw Error('轮半径无效');const base=snapshot(node),q=new THREE.Quaternion();
  return {base,radius,apply(distance){q.setFromAxisAngle(axis,direction*distance/radius);node.quaternion.copy(q).multiply(base.quaternion);node.updateMatrix();},restore(){restore(base);}};
}
function stopped(reason,id){
  const diagnostics=()=>({motionAvailable:false,motionAssetId:id,motionReason:reason,motionPlaying:false,motionTime:0,motionDistance:0,previewOnly:true,capabilities:{...vehicleMotionCapabilities(id),drive:false,track:false,wheel:false,rail:false}});
  return {get playing(){return false;},get available(){return false;},play:()=>false,pause(){},seek(){},stop(){},reset(){},setActive(){},setSpeed(){},update(){},dispose(){},diagnostics,status:diagnostics};
}

/** Compatible with createPluginPreview({animated:true,runtimeFactory}).
 * One owner tick; no timers, RAF, DOM listeners or independently-owned renderer.
 * Input AssetIR remains immutable and static GLB export remains unchanged. */
export function createVehicleMotionAdapter({object,root=object,asset,assetId=asset?.generator?.id??asset?.id,params=asset?.metadata?.recipe?.params,invalidate=()=>{},valid=()=>true}={}){
  if(!VEHICLE_MOTION_IDS.includes(assetId))return stopped(assetId==='nebelwerfer41-visual-prop'?'牵引式设备没有自行行走动作':'此模型尚无已验证运动绑定',assetId);
  if(!root?.isObject3D||!params||typeof params!=='object')return stopped('预览模型或参数缺失',assetId);
  if(!valid())return stopped('预览已失效',assetId);
  const cleanup=[],wheels=[];let runtimeParts=null,faces=null,model,rails,railBase,modelBase,dead=false;
  try{
    model=named(root,ROOT_NAMES[assetId]??assetId);modelBase=snapshot(model);cleanup.push(()=>restore(modelBase));
    root.updateMatrixWorld(true);
    let forward=Z,localScale=model.scale.z,mode='wheeled',amplitude=.7;
    const addWheel=(node,axis,radius,sign)=>{const b=wheelBinding(node,axis,radius,sign);wheels.push(b);cleanup.push(()=>b.restore());};
    if(assetId==='reference-armored-car'){
      for(const side of ['left','right'])for(const end of ['front','rear'])addWheel(named(model,'wheel-'+side+'-'+end),X,.594,1);
      amplitude=.65*Math.abs(model.scale.z);
    }else if(assetId==='armored-4x4'){
      forward=X;localScale=model.scale.x;
      if(!finite(params.tireScale)||params.tireScale<=0)throw Error('旧悍马轮胎比例缺失');
      for(const end of ['Front','Rear'])for(const side of ['left','right']){const node=named(model,end+' '+side+' wheel'),axis=X.clone().applyQuaternion(node.quaternion).normalize(),contact=axis.clone().cross(Y.clone().negate());const sign=contact.dot(forward)>0?-1:1;addWheel(node,axis,(26*.0254/2+.420*.703)*params.tireScale,sign);}
      amplitude=.7*Math.abs(localScale);
    }else if(assetId==='tracked-mortar'){
      mode='tracked';runtimeParts=createMortarRunningGear(model,asset,params);cleanup.push(()=>runtimeParts.dispose());amplitude=.8;
    }else{
      mode='rail';forward=X;localScale=model.scale.x;const centers=asset?.metadata?.visualOnly?.wheelCenters;
      const expected=assetId==='gustav-visual-prop'?56:12;if(!Array.isArray(centers)||centers.length!==expected)throw Error('轨道轮心元数据缺失或数量不匹配');
      const unique=new Map();for(const w of centers){if(!w||typeof w.name!=='string'||unique.has(w.name)||!Array.isArray(w.center)||w.center.length!==3||!w.center.every(finite)||!finite(w.radius)||w.radius<=0)throw Error('轨道轮心元数据无效');const node=named(model,w.name);if(node.position.distanceTo(new THREE.Vector3(...w.center))>1e-5)throw Error('轨道轮心与模型不一致');unique.set(w.name,w);addWheel(node,Z,w.radius,-1);}
      if(assetId==='gustav-visual-prop'){faces=bindGustavWheelFaces(model,asset,unique);cleanup.push(()=>faces.dispose());}
      rails=named(model,'display-rails');railBase=snapshot(rails);cleanup.push(()=>restore(railBase));
      // Railways shuttle on their existing fixed display track. Limit the course
      // against actual wheel extents, not the (possibly overhanging) gun/body.
      if(params.showRails){const box=new THREE.Box3().setFromObject(rails),left=Math.min(...centers.map(w=>w.center[0]-w.radius)),right=Math.max(...centers.map(w=>w.center[0]+w.radius));amplitude=Math.min(.65,Math.max(0,Math.min(left-box.min.x,box.max.x-right)-.1));if(amplitude<.03)throw Error('展示轨道没有足够往返空间');}
      else amplitude=.65;
    }
    if(!finite(localScale)||localScale<=0)throw Error('运动根节点缩放无效');
    const initialBox=new THREE.Box3().setFromObject(root),motionDirection=forward.clone().applyQuaternion(modelBase.quaternion),boundOffset=motionDirection.clone().multiplyScalar(amplitude);
    const bound=initialBox.clone().union(initialBox.clone().translate(boundOffset)).union(initialBox.clone().translate(boundOffset.clone().negate()));
    let playing=false,active=true,time=0,speed=1,distance=0;
    const cycle=8; // Eight presentation seconds, deliberately not vehicle performance.
    function apply(){
      distance=amplitude*Math.sin(time/cycle*Math.PI*2);
      model.position.copy(modelBase.position).addScaledVector(motionDirection,distance);model.updateMatrix();
      const localDistance=distance/localScale;
      if(rails){rails.position.copy(railBase.position).addScaledVector(forward,-localDistance);rails.updateMatrix();}
      for(const w of wheels)w.apply(localDistance);runtimeParts?.apply(localDistance);faces?.apply(localDistance);root.updateMatrixWorld(true);
    }
    function reset(){if(dead)return;playing=false;time=0;apply();invalidate();}
    function diagnostics(){return {motionAvailable:!dead,motionAssetId:assetId,motionMode:mode,motionPlaying:playing&&active,motionTime:time,motionDistance:distance,motionSpeed:speed,motionCourse:'straight-shuttle',motionCycleSeconds:cycle,motionAmplitude:amplitude,motionWheels:runtimeParts?46:wheels.length,previewOnly:true,animationExported:false,capabilities:vehicleMotionCapabilities(assetId),motionParts:runtimeParts?.diagnostics()??faces?.diagnostics()??null,disposed:dead};}
    const runtime={
      get available(){return !dead;},get playing(){return !dead&&active&&playing;},
      // valid belongs to the upload ticket, not the mounted asset's lifetime.
      // Parameter edits invalidate that ticket while the last successful asset
      // remains mounted. Only this runtime's host may dispose it after binding.
      play(name='drive'){if(dead||!['drive','walk','move','行走'].includes(name))return false;playing=true;invalidate();return true;},
      pause(){if(dead)return;playing=false;invalidate();},
      stop:reset,reset,
      seek(value){if(dead)return;if(!finite(value)||value<0)throw Error('演出时间必须是非负有限数');time=value;apply();invalidate();},
      setSpeed(value){if(dead)return;if(!finite(value)||value<.1||value>3)throw Error('演出倍率必须在 0.1 到 3 之间');speed=value;invalidate();},
      setActive(value){if(dead)return;active=!!value;invalidate();},
      update(dt){if(dead||!active||!playing)return;if(!finite(dt)||dt<0)throw Error('运动增量时间无效');time+=dt*speed;apply();},
      bounds(){return bound.clone();},diagnostics,status:diagnostics,
      dispose(){if(dead)return;dead=true;playing=false;for(const restore of cleanup.reverse())restore();root.updateMatrixWorld(true);},
    };
    apply();return runtime;
  }catch(error){for(const restore of cleanup.reverse())restore();root.updateMatrixWorld(true);return stopped(error.message,assetId);}
}
