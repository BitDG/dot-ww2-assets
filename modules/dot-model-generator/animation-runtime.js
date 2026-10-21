import {projectedModelFitDistance} from './model-framing.mjs';
import * as THREE from 'three';
import {createVehicleMotionAdapter,vehicleMotionCapabilities} from './vehicle-motion.mjs';
import {createVehicleFirePreview,vehicleFireCapabilities} from '../vehicle-fire-preview/index.mjs';
import {createHostedLaunchRuntime} from '../nebelwerfer41-launch-runtime/index.mjs';
import {composeAnimationRuntimes} from './animation-session.mjs';
import {createQf25VisualRuntime} from '../qf25-visual-runtime/index.mjs';
import {createQf25AnimationSession,createArtPreviewSession} from './qf25-animation-session.mjs';
import {createFlakzwillingVisualRuntime} from '../flakzwilling43-visual-runtime/index.mjs';

export function animationCapabilities(assetId){
 if(assetId==='flakzwilling43-visual-prop')return {drive:false,motion:true,fire:true,selfPropelled:false,motionLabel:'朝向展示',fireLabel:'艺术烟云',previewOnly:true,animatedGLB:false};
 if(assetId==='qf25-visual-prop')return {drive:true,fire:true,motionLabel:'牵引滚动展示',fireLabel:'开火外观烟云',previewOnly:true,animatedGLB:false};
 const motion=vehicleMotionCapabilities(assetId),fire=vehicleFireCapabilities(assetId),launch=assetId==='nebelwerfer41-visual-prop';
 return {drive:motion.drive,fire:fire.fire||launch,motionLabel:motion.label,fireLabel:launch?'六管发射演出':'开火外观演出',previewOnly:true,animatedGLB:false};
}
export function createModelAnimationRuntime(args,{onChange=()=>{},onDispose=()=>{}}={}){
 const id=args.asset.generator?.id??args.asset.id,notify=()=>{args.invalidate();onChange();};
 const options={...args,assetId:id,invalidate:notify};
 if(id==='qf25-visual-prop')return createQf25AnimationSession({runtime:createQf25VisualRuntime(options),invalidate:notify,onDispose,modelBounds:()=>new THREE.Box3().setFromObject(args.object),modelFramingDistance:(camera,sphere,direction)=>projectedModelFitDistance(args.object,camera,sphere.center,direction)});
 if(id==='flakzwilling43-visual-prop')return createArtPreviewSession({runtime:createFlakzwillingVisualRuntime(options),invalidate:notify,onDispose,modelBounds:()=>new THREE.Box3().setFromObject(args.object),modelFramingDistance:(camera,sphere,direction)=>projectedModelFitDistance(args.object,camera,sphere.center,direction),motionMode:'display',fireMode:'smoke',motionCapability:'display',fireCapability:'smoke',diagnosticKey:'flakzwilling'});
 const motion=createVehicleMotionAdapter(options);
 let fire=null;
 try{fire=id==='nebelwerfer41-visual-prop'?createHostedLaunchRuntime(options):createVehicleFirePreview(options);}
 catch(error){fire={available:false,playing:false,diagnostics:()=>({error:error.message,available:false}),dispose(){},pause(){},update(){}};}
 return composeAnimationRuntimes({motion,fire,invalidate:notify,onDispose,modelBounds:()=>motion.available?motion.bounds():new THREE.Box3().setFromObject(args.object)});
}
