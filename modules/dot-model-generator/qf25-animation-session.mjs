/** Adapt one QF25 presentation runtime to the unified viewport controls.
 * Tow and smoke are mutually exclusive modes of the same borrowed-model lease.
 * The host remains the sole clock, renderer and static AssetIR owner.
 */
export function createQf25AnimationSession({runtime,modelBounds,modelFramingDistance,invalidate=()=>{},onDispose=()=>{},motionMode='tow',fireMode='fire',motionCapability='tow',fireCapability='fire',diagnosticKey='qf25'}={}) {
  let dead=false,active=true,speed=1,framing='model';
  const notify=()=>{if(!dead)invalidate();};
  function state(){
    const d=runtime.diagnostics();
    return {disposed:dead,active,speed,loading:false,framing,
      motionAvailable:!dead&&!!runtime.available&&d.capabilities?.[motionCapability]===true,
      fireAvailable:!dead&&!!runtime.available&&d.capabilities?.[fireCapability]===true,
      motionPlaying:!dead&&active&&runtime.playing&&d.mode===motionMode,
      firePlaying:!dead&&active&&runtime.playing&&d.mode===fireMode};
  }
  function diagnostics(){const d=runtime.diagnostics();return {animation:{...state(),[diagnosticKey]:d,
    motion:{...d,playing:d.mode===motionMode&&d.playing},fire:{...d,playing:d.mode===fireMode&&d.playing},
    hostTickOnly:true,staticGLBUnaffected:true}};}
  const api={ready:Promise.resolve(true),state,diagnostics,
    get available(){return !dead&&runtime.available;},
    get playing(){return !dead&&active&&runtime.playing;},
    play(name='drive'){
      if(dead||!active||!['drive','fire'].includes(name))return false;
      const result=runtime.play(name==='drive'?motionMode:fireMode);notify();return result;
    },
    pause(){if(dead)return;runtime.pause();notify();},
    reset(){if(dead)return;runtime.reset();notify();},stop(){api.reset();},
    seek(time){if(dead)return;const result=runtime.seek(time);notify();return result;},
    setSpeed(value){if(!Number.isFinite(value)||value<.1||value>3)throw Error('演出倍率必须在0.1到3之间');if(dead)return;speed=value;notify();},
    setActive(value){if(dead)return;active=!!value;runtime.setActive(active);notify();},
    update(dt){if(dead||!active)return;if(!Number.isFinite(dt)||dt<0)throw Error('演出增量必须为非负有限数');runtime.update(dt*speed);},
    setFraming(value){if(!['model','presentation'].includes(value))throw Error('未知取景方式');if(dead)return;framing=value;notify();},
    framingDistance(camera,sphere,direction){return framing==='model'?modelFramingDistance?.(camera,sphere,direction):undefined;},
    bounds(){return framing==='model'&&modelBounds?modelBounds():runtime.bounds();},
    dispose(){if(dead)return;dead=true;active=false;runtime.dispose();onDispose(diagnostics());},
  };
  return api;
}

// Other fixed-art assets may reuse the same single-lease host control mapping.
export const createArtPreviewSession=createQf25AnimationSession;
