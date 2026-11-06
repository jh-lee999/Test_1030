// Original synthesized game feedback; no remotely loaded/borrowed sound files.
export function createDungeonAudio(initial=.5){
 let ctx=null,volume=initial,ambient=false,lastChord=-10,voices=0;
 const notes={shot:[740,460,.045],beam:[520,1040,.1],swing:[180,95,.08],kill:[380,160,.11],pickup:[680,1020,.13],door:[260,390,.13],clear:[520,780,.22],boss:[660,1320,.35],hurt:[160,70,.16],ultimate:[150,750,.3],portal:[440,880,.2],hazard:[230,180,.08]};
 function unlock(){try{ctx||=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();}catch{}}
 function tone(a,b,length,gain=.12,type='sine'){if(!ctx||ctx.state!=='running'||volume<=0||voices>=12)return;voices++;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+length);g.gain.setValueAtTime(Math.max(.0001,gain*volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g);g.connect(ctx.destination);o.start();o.stop(t+length+.01);o.onended=()=>{voices--;o.disconnect();g.disconnect();};}
 return {get volume(){return volume;},unlock,toggle(){volume=volume>0?0:initial||.5;},play(kind){if(notes[kind])tone(...notes[kind]);},get ambient(){return ambient;},toggleAmbient(){ambient=!ambient;unlock();return ambient;},update(g){if(!ambient||g.phase!=='playing')return;if(g.time<lastChord)lastChord=-10;if(g.time-lastChord<4)return;lastChord=g.time;const n=[196,220,174.61][g.floorIndex];tone(n,n,2.5,.025);tone(n*1.5,n*1.5,2.3,.018);}};
}
