import * as THREE from 'three';
import {GLTFExporter} from '../../generator-sdk/gltf-exporter.mjs';
import {createAssetHandle} from './asset.js';
self.onmessage=async({data:{id,args:[asset,recipe]}})=>{
 let handle;
 try{handle=await createAssetHandle(asset,THREE);handle.object.userData.pgfRecipe=recipe;const result=new Uint8Array(await new GLTFExporter().parseAsync(handle.object,{binary:true,onlyVisible:false,animations:handle.animations}));postMessage({id,result},[result.buffer]);}
 catch(error){postMessage({id,error:{name:error.name,message:error.message}});}
 finally{handle?.dispose();}
};
