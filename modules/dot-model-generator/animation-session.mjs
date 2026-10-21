/** Compose existing preview runtimes under the host's only render tick. No scheduling. */
export function composeAnimationRuntimes({motion=null,fire=null,invalidate=()=>{},onDispose=()=>{},modelBounds=null}={}) {
  let dead=false,active=true,speed=1,loading=!!fire?.ready,framing='model';
  const notify=()=>{if(!dead)invalidate();};
  const ready=Promise.resolve(fire?.ready).then(value=>{loading=false;notify();return value;},()=>{loading=false;notify();return false;});
  function state(){return {disposed:dead,active,speed,loading,framing,motionAvailable:!dead&&!!motion?.available,fireAvailable:!dead&&!!fire?.available,
    motionPlaying:!dead&&active&&!!motion?.playing,firePlaying:!dead&&active&&!!fire?.playing};}
  function diagnostics(){return {animation:{...state(),motion:motion?.diagnostics?.()??null,fire:fire?.diagnostics?.()??null,hostTickOnly:true,staticGLBUnaffected:true}};}
  const api={ready,
    get playing(){return !dead&&active&&!!(motion?.playing||fire?.playing);},
    get available(){return !dead&&!!(motion?.available||fire?.available);},
    state,diagnostics,
    play(name='drive'){
      if(dead||!active)return false;
      let result=false;
      if(name==='drive'&&motion?.available)result=motion.play('drive');
      if(name==='fire'&&fire?.available){const paused=fire.diagnostics?.().sequence?.state==='paused';result=paused&&fire.resume?fire.resume():fire.play('fire');}
      notify();return result;
    },
    pause(){if(dead)return;motion?.pause();fire?.pause();notify();},
    reset(){if(dead)return;fire?.reset?.();motion?.reset?.();notify();},
    stop(){api.reset();},
    seek(time){if(dead)return;if(!Number.isFinite(time)||time<0)throw Error('演出时间必须为非负有限数');motion?.seek?.(time);fire?.seek?.(time);notify();},
    setSpeed(value){if(!Number.isFinite(value)||value<.1||value>3)throw Error('演出倍率必须在0.1到3之间');if(dead)return;speed=value;notify();},
    setActive(value){if(dead)return;active=!!value;motion?.setActive?.(active);fire?.setActive?.(active);notify();},
    update(dt){if(dead||!active)return;if(!Number.isFinite(dt)||dt<0)throw Error('演出增量必须为非负有限数');motion?.update(dt*speed);fire?.update(dt*speed);},
    setFraming(value){if(!['model','presentation'].includes(value))throw Error('未知取景方式');framing=value;notify();},
    bounds(){if(framing==='model'&&modelBounds)return modelBounds();const boxes=[motion?.bounds?.(),fire?.bounds?.()].filter(Boolean);if(!boxes.length)return undefined;return boxes.slice(1).reduce((box,next)=>box.union(next),boxes[0].clone());},
    dispose(){if(dead)return;dead=true;active=false;fire?.dispose();motion?.dispose();onDispose(diagnostics());},
  };
  return api;
}
