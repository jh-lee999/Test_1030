// Small synthesized effects; no external files or gameplay RNG consumption.
export function createGameAudio(){
  let ctx=null,enabled=true;const last=new Map();
  function unlock(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;ctx??=new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{ctx=null;}}
  const presets={charge:[260,520,.18,'sine',.035],overheat:[130,70,.2,'sawtooth',.04],shot:[550,260,.045,'triangle',.045],hit:[180,70,.06,'triangle',.07],critical:[300,80,.1,'square',.035],kill:[650,1100,.13,'sine',.08],dash:[190,650,.09,'triangle',.045],evade:[650,1400,.18,'sine',.08],counter:[1000,300,.12,'triangle',.065],boulder:[160,42,.24,'sawtooth',.04],hurt:[95,40,.17,'sawtooth',.055],shield:[1100,600,.1,'sine',.07]};
  function play(events){
    if(!enabled||!ctx||ctx.state!=='running')return;
    for(const kind of events){const spec=presets[kind];if(!spec)continue;const t=ctx.currentTime;if(t-(last.get(kind)??-1)<(kind==='shot'?.065:.045))continue;last.set(kind,t);
      const [from,to,duration,wave,volume]=spec,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+duration);gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.005);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
  }
  return{unlock,play,toggle(){enabled=!enabled;if(enabled)unlock();return enabled;},get enabled(){return enabled;}};
}
