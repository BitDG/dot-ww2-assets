import {getModel, canMount} from './catalog.mjs';
import {copyJSON, readNativeRecipe, readWorkspaceRecipe} from './recipes.mjs';
const canceled = () => new DOMException('操作已取消', 'AbortError');

/** One preview owner; original model Workers retain schema/material/export authority. */
export function createUnifiedController({initial, preview, loadBackend, runJob,
  onSchema=()=>{}, onState=()=>{}, onAsset=()=>{}, delayMs=180}) {
  let workspace=readWorkspaceRecipe(initial), model=getModel(workspace.assetId), backend=null;
  let dead=false, active=true, epoch=0, selection=0, timer=null, job=null, exporting=null;
  let phase='idle', error='', asset=null, completed=null, draft=null, stats=null, dirty=false, frameSeen=false;
  let resolveReady, rejectReady, readyDone=false;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});ready.catch(()=>{});
  const emit=()=>{if(!dead)onState(state());};
  function state(){return {assetId:model.assetId,phase,error,active,disposed:dead,dirty,
    busy:phase==='loading'||phase==='generating',exporting:!!exporting,hasAsset:!!asset,
    exportable:!!asset&&phase==='ready'&&!dirty&&!exporting,stats};}
  function invalidate(){epoch++;clearTimeout(timer);timer=null;job?.abort();job=null;
    exporting?.abort();exporting=null;preview.cancelPending?.();}
  function fail(e){error=e.message??String(e);phase='error';dirty=true;emit();if(!readyDone&&!asset){readyDone=true;rejectReady(e);}}
  function normalize(recipe){const value=readNativeRecipe(model.assetId,recipe);
    value.params={...copyJSON(backend.adapter.defaults),...value.params};return value;}
  function maybeReady(){if(!readyDone&&phase==='ready'&&frameSeen){readyDone=true;resolveReady();}}
  function frameRendered(){frameSeen=true;maybeReady();}
  async function generate(value=draft??completed) {
    if(dead||!active||!backend)return false;
    invalidate();const ticket=epoch, id=model.assetId;
    let next;try{next=normalize(value);}catch(e){fail(e);return false;}
    draft=next;dirty=true;phase='generating';error='';frameSeen=false;emit();
    const controller=job=new AbortController();
    const valid=()=>!dead&&active&&ticket===epoch&&id===model.assetId;
    const started=performance.now();
    try {
      const request={seed:next.seed,params:next.params,...(next.input!==undefined?{input:next.input}:{}),...(next.quality?{quality:next.quality}:{})};
      const data=await runJob(backend,{request},{signal:controller.signal});
      if(!valid())return false;
      if(data.result.asset.generator?.id!==model.backend.moduleId)throw Error('生成结果与所选模型不匹配');
      const visible=data.result.asset;
      await preview.setAsset({...visible,schemaVersion:'pgf.asset/1',roots:visible.rootNodeIds},valid);
      if(!valid())return false;
      asset=visible;completed=normalize({...next,params:data.result.recipe.params??next.params});
      workspace.models[id]=copyJSON(completed);draft=null;dirty=false;phase='ready';
      stats={...data.stats,generationMs:Math.round(performance.now()-started)};
      onAsset(asset,copyJSON(completed));emit();maybeReady();return true;
    }catch(e){if(valid()&&e.name!=='AbortError')fail(e);return false;}
    finally{if(job===controller)job=null;}
  }
  async function select(assetId) {
    if(dead)throw canceled();
    const next=getModel(assetId);invalidate();const ticket=++selection;
    model=next;workspace.assetId=assetId;backend=null;asset=null;completed=null;draft=null;stats=null;dirty=false;error='';
    phase='loading';frameSeen=false;onSchema(null,model,null);onAsset(null,null);emit();
    // Clear synchronously invalidates pending uploads; renderer and camera controls are retained.
    try {
      await preview.clearAsset();
      if(dead||ticket!==selection)return false;
      if(!canMount(model)){phase='source-only';emit();if(!readyDone){readyDone=true;resolveReady();}return true;}
      const loaded=await loadBackend(model);
      if(dead||ticket!==selection)return false;
      backend=loaded;
      const saved=workspace.models[assetId];
      draft=normalize(saved??{format:'PGF.ComponentRecipe',version:1,generator:assetId,seed:'pgf-components-1',
        params:{...loaded.adapter.defaults,...loaded.adapter.presets?.[0]?.params}});
      onSchema(loaded.adapter,model,copyJSON(draft));
      if(!active){phase='paused';emit();return true;}
      return generate(draft);
    }catch(e){if(!dead&&ticket===selection&&e.name!=='AbortError')fail(e);return false;}
  }
  function updateDraft(value,{automatic=true,delay=delayMs}={}) {
    if(dead||!backend)return;
    invalidate();dirty=true;phase='editing';error='';
    try{draft=normalize(value);}catch(e){draft=null;fail(e);return;}
    emit();if(automatic&&active)timer=setTimeout(()=>{timer=null;void generate();},delay);
  }
  function invalidDraft(message){if(dead)return;invalidate();draft=null;dirty=true;phase='error';error=message;emit();}
  function cancel(){if(dead)return;selection++;invalidate();draft=null;dirty=false;error='';phase=asset?'ready':canMount(model)?'idle':'source-only';
    if(completed)onAsset(asset,copyJSON(completed));emit();}
  async function exportAsset() {
    if(!state().exportable)return null;
    const ticket=epoch,id=model.assetId,controller=exporting=new AbortController();emit();
    try{const result=await runJob(backend,{op:'export',asset},{signal:controller.signal});
      if(dead||!active||ticket!==epoch||id!==model.assetId||controller.signal.aborted)return null;
      return {bytes:result.bytes,filename:id+'.glb'};
    }catch(e){if(!dead&&ticket===epoch&&e.name!=='AbortError'){error=e.message;emit();}return null;}
    finally{if(exporting===controller){exporting=null;emit();}}
  }
  function setActive(value) {
    if(dead)return;active=!!value;preview.setActive(active);
    if(!active){const interrupted=phase==='generating';invalidate();if(interrupted)phase='paused';emit();}
    else if(phase==='paused'&&draft)void generate();
  }
  async function restore(value){const next=readWorkspaceRecipe(value);invalidate();workspace=next;return select(next.assetId);}
  function dispose(){if(dead)return;dead=true;selection++;invalidate();preview.dispose();asset=null;backend=null;draft=null;completed=null;
    if(!readyDone){readyDone=true;rejectReady(canceled());}}
  return {ready,select,generate,updateDraft,invalidDraft,cancel,exportAsset,setActive,restore,dispose,frameRendered,
    state,model:()=>model,adapter:()=>backend?.adapter,currentAsset:()=>asset,
    currentRecipe:()=>copyJSON(draft??completed??workspace.models[model.assetId]??null),
    snapshot:()=>copyJSON(workspace),diagnostics:()=>({...state(),epoch,selection,worker:!!job,exportWorker:!!exporting,debouncePending:timer!==null})};
}
