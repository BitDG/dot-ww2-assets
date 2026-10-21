import {validateAsset,writeSceneGLB} from '../../src/plugins/scatter/io.js';
import {validateAsset as validatePreview} from '../../src/plugins/asset.js';
import {prepareGenerator} from '../../generator-sdk/validation.mjs';
import {BUDGET} from '../../generator-sdk/index.mjs';

const identity={position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]};
export function installGeneratorWorker(adapter,{maxTriangles=1000000}={}){let prepared;self.onmessage=async({data})=>{
  try {
    if(data.op==='export') {
      const asset=validateAsset(data.asset);
      const bytes=writeSceneGLB([{contentHash:'generated',asset}], [{id:asset.id,assetContentHash:'generated',transform:identity,tags:[]}], {preserveSemantics:true});
      self.postMessage({ok:true,bytes},[bytes.buffer]);
      return;
    }
    prepared??=prepareGenerator(adapter);
    const result=await prepared.generate(data.request,{budget:{...BUDGET,maxTriangles:Math.min(maxTriangles,BUDGET.maxTriangles),maxMaterialSlots:256}});
    const asset=validateAsset(result.asset);
    const stats=validatePreview({...asset,schemaVersion:'pgf.asset/1',roots:asset.rootNodeIds});
    self.postMessage({ok:true,result:{...result,asset},stats});
  }catch(error){self.postMessage({ok:false,error:error.message||String(error)});}
};}
