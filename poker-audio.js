// Short, user-gesture-unlocked UI/game cues; no external requests or game RNG.
export function createCardAudio(initialVolume=.55) {
  let ctx=null,volume=initialVolume,lastVolume=initialVolume||.55;const last=new Map();
  const cues={ui:[620,740,.035,'sine',.025],select:[430,570,.04,'sine',.025],shot:[650,240,.07,'triangle',.07],hit:[190,65,.09,'triangle',.09],charge:[360,680,.12,'sine',.045],buy:[700,1050,.12,'sine',.05],kill:[660,1320,.19,'sine',.05],hurt:[140,65,.13,'triangle',.06]};
  function unlock(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;ctx??=new Audio();if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{ctx=null;}}
  function play(events){
    if(!ctx||ctx.state!=='running'||!volume)return;
    for(const key of events){const spec=cues[key];if(!spec)continue;const now=ctx.currentTime;if(now-(last.get(key)??-1)<.045)continue;last.set(key,now);
      const [from,to,duration,type,loudness]=spec,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(loudness*volume,now+.005);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
  }
  function setVolume(value){if(!Number.isFinite(value)||value<0||value>1)return false;volume=value;if(value)lastVolume=value;return true;}
  return {unlock,play,setVolume,get volume(){return volume;},get enabled(){return volume>0;},toggle(){setVolume(volume?0:lastVolume);if(volume)unlock();return volume>0;}};
}
export function createMotionPreference(media,mode='auto',body=null) {
  const listeners=new Set();let preference=mode;
  const matches=()=>preference==='reduce'||media.matches;
  function update(){if(body)body.dataset.motion=matches()?'reduce':'full';for(const fn of listeners)fn({matches:matches()});}
  media.addEventListener('change',update);update();
  return {get matches(){return matches();},addEventListener(type,fn){if(type==='change')listeners.add(fn);},setMode(value){if(!['auto','reduce'].includes(value))return false;preference=value;update();return true;}};
}
