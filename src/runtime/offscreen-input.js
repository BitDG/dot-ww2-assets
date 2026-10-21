/** Small data messages only: no DOM nodes or event objects cross the boundary. */
export function bindOffscreenInput(canvas, send) {
  const abort=new AbortController();let queued=null,frame=null;
  const flush=()=>{frame=null;if(queued){send('input',[queued]);queued=null;}};
  const properties=event=>{
    const rect=canvas.getBoundingClientRect(),result={type:event.type};
    for(const key of ['pointerId','pointerType','button','buttons','ctrlKey','metaKey','shiftKey','altKey','deltaY','deltaX','deltaMode','key','code'])if(event[key]!==undefined)result[key]=event[key];
    if(event.clientX!==undefined){result.clientX=event.clientX-rect.left;result.clientY=event.clientY-rect.top;result.pageX=result.clientX;result.pageY=result.clientY;}
    return result;
  };
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','wheel','contextmenu'])canvas.addEventListener(type,event=>{
    if(type==='wheel'||type==='contextmenu')event.preventDefault();
    if(type==='pointerdown'){canvas.focus();canvas.setPointerCapture(event.pointerId);}
    if(type==='pointermove'){queued=properties(event);if(frame===null)frame=requestAnimationFrame(flush);return;}
    if(queued)flush();send('input',[properties(event)]);
  },{signal:abort.signal,passive:false});
  for(const type of ['keydown','keyup'])window.addEventListener(type,event=>{if(event.composedPath()[0]!==canvas)return;send('input',[properties(event)]);},{signal:abort.signal});
  window.addEventListener('blur',()=>send('input',[{type:'blur'}]),{signal:abort.signal});
  return ()=>{abort.abort();if(frame!==null)cancelAnimationFrame(frame);queued=null;};
}

/** Give OrbitControls its documented event surface without installing a DOM. */
export function offscreenSurface(canvas,initialSize) {
  let size=initialSize;const root=new EventTarget();
  canvas.style={};canvas.getRootNode=()=>root;canvas.ownerDocument=root;
  canvas.setPointerCapture=canvas.releasePointerCapture=canvas.focus=()=>{};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:size.width,height:size.height});
  for(const [key,source]of [['clientWidth','width'],['clientHeight','height']])Object.defineProperty(canvas,key,{get:()=>size[source],configurable:true});
  return {canvas,root,resize(next){size=next;},dispatch(data){const event=new Event(data.type,{cancelable:true});for(const [key,value]of Object.entries(data))if(key!=='type')Object.defineProperty(event,key,{value});(data.type.startsWith('key')?root:canvas).dispatchEvent(event);}};
}
