import {BUTTER_ORIGINAL,BUTTER_POSTER,drawButterMotion,selectButterFrame} from './butter-original-motion.js?v=36';
const $=s=>document.querySelector(s),images={};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing=!reduced,walk=0,shot=0,clock=0,last=0;
const labels={idle:'원작 대기',walk:'원작 달리기',shoot:'원작 평타',low:'원작 저학년',high:'원작 고학년',walkShoot:'이동 사격 · 원본 리그 결합'};
function playLabel(){document.body.dataset.playing=String(playing);$('#play').textContent=playing?'Ⅱ 일시 정지':'▶ 동작 재생';$('#play').setAttribute('aria-pressed',String(playing));}
function setPlaying(value){playing=value;if(value)$('#reduced-notice').hidden=true;playLabel();}
try {
  let loaded=0;
  await Promise.all([...Object.entries(BUTTER_ORIGINAL.clips).map(([key,c])=>[key,c.image]),['poster',BUTTER_POSTER]].map(async([key,src])=>{
    const image=images[key]=new Image();image.src=src;
    try{await image.decode();loaded++;$('#status').textContent=`원작 프레임 ${loaded}/7 불러옴`;}catch{image.failed=true;}
  }));
  if(!images.idle.naturalWidth&&!images.poster.naturalWidth)throw Error('대기 이미지도 불러오지 못했어.');
  function render(){
    const mode=$('#motion').value,moving=['walk','walkShoot'].includes(mode),firing=['shoot','walkShoot','low','high'].includes(mode);
    const state={size:112,time:mode==='idle'?walk*BUTTER_ORIGINAL.clips.idle.duration:clock,gait:{phase:walk*Math.PI*2,amount:moving?1:0},action:firing?{type:mode==='high'?'high':mode==='low'?'low':'normal',time:shot,duration:1}:null};
    const frame=selectButterFrame(state),clip=frame.clip;
    for(const target of ['#stage','#small96','#small160']){
      const canvas=$(target),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
      ctx.clearRect(0,0,w,h);
      const pad=target==='#stage'?32:5,scale=Math.min((w-pad*2)/clip.width,(h-pad*2)/clip.height);
      // Fixed camera for the whole selected clip, not per-frame auto-fit.
      ctx.save();ctx.translate((w-clip.width*scale)/2+clip.origin[0]*scale,(h-clip.height*scale)/2+clip.origin[1]*scale-112*.28*scale);ctx.scale(scale,scale);
      drawButterMotion(ctx,images,state);ctx.restore();canvas.dataset.frame=`${frame.key}/${frame.index}`;
    }
    $('#phase').value=String(walk);$('#shot-phase').value=String(shot);$('#timeline').textContent=`걸음 ${Math.round(walk*100)}% · 발사 ${Math.round(shot*100)}%`;
    $('#status').textContent=images[frame.key].naturalWidth?`${labels[frame.key]} · 전체 프레임 ${frame.index+1}/${clip.count} · ${playing?'재생 중':'일시 정지'}`:'선택한 동작을 불러오지 못해서 원작 대기 모습으로 표시 중이야.';
  }
  $('#play').onclick=()=>{setPlaying(!playing);render();};$('#enable-motion').onclick=()=>setPlaying(true);
  $('#step').onclick=()=>{setPlaying(false);walk=(walk+1/24)%1;shot=(shot+1/24)%1;render();};
  $('#phase').oninput=()=>{setPlaying(false);walk=Number($('#phase').value);render();};
  $('#shot-phase').oninput=()=>{setPlaying(false);shot=Number($('#shot-phase').value);render();};
  $('#motion').onchange=()=>{walk=shot=0;render();};
  function tick(t){
    const dt=Math.min(.05,(t-last)/1000)*Number($('#speed').value);last=t;
    if(playing){
      const mode=$('#motion').value,key=mode==='walkShoot'?'shoot':mode,source=BUTTER_ORIGINAL.clips[key].duration;
      const duration=$('#pace').value==='source'?source:mode==='high'?.86:mode==='low'?.56:.414;
      clock+=dt;walk=(walk+dt/(mode==='idle'?BUTTER_ORIGINAL.clips.idle.duration:BUTTER_ORIGINAL.clips.walk.duration))%1;shot=(shot+dt/duration)%1;render();
    }
    requestAnimationFrame(tick);
  }
  $('#reduced-notice').hidden=!reduced;playLabel();render();requestAnimationFrame(tick);
  document.body.dataset.renderer='original36';document.body.dataset.ready='true';
}catch(error){document.body.dataset.ready='error';$('#status').textContent=`불러오기 실패: ${error.message}`;console.error(error);}
