import { drawButterMotion, prepareButterMotion, butterMuzzleOffset, BUTTER_2D_LAYOUT, BUTTER_MOTION } from './butter-motion.js?v=34';
const directions = {down:[0,1,'아래 · 정면'],left:[-1,0,'왼쪽'],up:[0,-1,'위 · 후면'],right:[1,0,'오른쪽']};
const $ = selector => document.querySelector(selector);
const atlas = new Image(); atlas.src = BUTTER_2D_LAYOUT.image;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduced, phase = 0, previous = 0;
const cards = [];

function playLabel() {
  $('#play').textContent = playing ? 'Ⅱ 일시 정지' : '▶ 동작 재생';
  $('#play').setAttribute('aria-pressed', String(playing));
  document.body.dataset.playing = String(playing);
  $('#playback-state').textContent = playing ? ($('#motion').value === 'idle' ? '정지 포즈 표시 중' : '● 재생 중 · 아래 네 방향 모두 동작') : '일시 정지 · 재생 버튼을 눌러줘';
}

try {
  await atlas.decode(); prepareButterMotion(atlas);
  for (const [direction, [x,y,label]] of Object.entries(directions)) {
    const card = document.createElement('article'), title = document.createElement('h2');
    title.textContent = label; card.append(title);
    const canvases = [false, true].map(reference => {
      const figure = document.createElement('figure'), canvas = document.createElement('canvas'), caption = document.createElement('figcaption');
      canvas.dataset.view = direction; canvas.dataset.reference = String(reference);
      canvas.setAttribute('role','img'); canvas.setAttribute('aria-label', `${label} ${reference ? '고정 원본' : '게임 동작'}`);
      caption.textContent = reference ? '비교용 원본 · 움직이지 않음' : '게임 동작';
      figure.className = reference ? 'reference' : 'live-motion';
      figure.hidden = reference;
      if (!reference) caption.className = 'motion-caption';
      figure.append(canvas,caption); card.append(figure); return canvas;
    });
    $('#views').append(card); cards.push({direction,x,y,canvases});
  }

  function render() {
    const logical = Number($('#size').value), factor = logical / 160;
    const dpr = Math.min(devicePixelRatio || 1, 3), mode = $('#motion').value;
    for (const {x,y,canvases} of cards) {
      const moving = ['walk','walkShoot','low'].includes(mode);
      const firing = ['shoot','walkShoot','low','high'].includes(mode);
      const action = firing ? {type:mode === 'low' ? 'low' : mode === 'high' ? 'high' : 'normal',time:phase,duration:1,dx:x,dy:y} : null;
      const state = {size:112,facingX:x,facingY:y,gait:{phase:phase*Math.PI*2,amount:moving?1:0,dx:x,dy:y},action};
      for (let i = 0; i < 2; i++) {
        const canvas = canvases[i], width = Math.round(logical*dpr);
        if (canvas.width !== width) { canvas.width=canvas.height=width; canvas.style.width=`${logical}px`; }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(factor*dpr,0,0,factor*dpr,0,0); ctx.clearRect(0,0,160,160);
        ctx.translate(80,148-112*.28);
        const reference = canvas.dataset.reference === 'true';
        drawButterMotion(ctx,{atlas},{...state,reference});
        if ($('#guides').checked) {
          ctx.strokeStyle='#9d6b8199'; ctx.lineWidth=.65; ctx.setLineDash([2,3]);
          ctx.beginPath();ctx.moveTo(-76,112*.28);ctx.lineTo(76,112*.28);ctx.stroke();ctx.setLineDash([]);
          if(!reference) { const p=butterMuzzleOffset(state);ctx.fillStyle='#4f879a';ctx.beginPath();ctx.arc(p.x,p.y,1.7,0,Math.PI*2);ctx.fill(); }
        }
      }
    }
    $('#phase').value=String(phase);$('#timeline').value=`${Math.min(8,Math.floor(phase*8)+1)} / 8 · ${Math.round(phase*100)}%`;
  }
  function setPlaying(value) { playing=value;if(playing)$('#reduced-notice').hidden=true;playLabel(); }
  $('#play').addEventListener('click',()=>setPlaying(!playing));
  $('#enable-motion').addEventListener('click',()=>setPlaying(true));
  $('#step').addEventListener('click',()=>{setPlaying(false);phase=(Math.floor(phase*BUTTER_MOTION.previewFrames+1.00001)%BUTTER_MOTION.previewFrames)/BUTTER_MOTION.previewFrames;render();});
  $('#phase').addEventListener('input',()=>{playing=false;phase=Number($('#phase').value);playLabel();render();});
  $('#show-source').addEventListener('change',()=>{for(const ref of document.querySelectorAll('.reference'))ref.hidden=!$('#show-source').checked;render();});
  for(const id of ['#motion','#size','#guides'])$(id).addEventListener('change',()=>{playLabel();render();});
  function tick(time) { if(playing){phase=(phase+Math.min(.05,(time-previous)/1000)*Number($('#speed').value)/BUTTER_MOTION.previewCycleSeconds)%1;render();}previous=time;requestAnimationFrame(tick); }
  $('#reduced-notice').hidden=!reduced;
  playLabel();render();requestAnimationFrame(tick);
  $('#status').textContent='v34 · 양발 교대 보행 + 독립 사격 반동 · 게임과 같은 렌더러 · 원본 PNG 변경 없음';
  document.body.dataset.ready='true';
} catch(error) {
  document.body.dataset.ready='error';$('#status').textContent='에셋을 불러오지 못했어. 원본 PNG 링크를 확인하거나 새로고침해줘.';console.error(error);
}
