import {createGame,tick,chooseReward,enterNextRoom,chooseRoute,routeOptions,interactRoom,grantItem,rerollReward,rewardRerollCost,openShop,buyShopItem,rerollShop,notifyGame,STAGES} from './platformer-engine.js?v=39';
import {renderGame} from './platformer-renderer.js?v=39';
import {BIOMES,ROOM_TYPES} from './platformer-world.js?v=38';
import {BUTTER_ORIGINAL,BUTTER_POSTER} from './butter-original-motion.js';
import {STAGE_ART} from './assets/trickcal-stage37/atlas.js';
import {ITEMS,INSCRIPTIONS,RARITIES,statRows,itemChanges,gradeSources,lowerPower,upperPower,applyBuildItem} from './platformer-build.js?v=39';
const $=id=>document.getElementById(id),canvas=$('game-canvas'),ctx=canvas.getContext('2d');
let game=createGame(),started=false,ready=false,last=0,accumulator=0,shownPhase='',shownRoom=-1,buildReturnPhase='playing';
const urlSeed=new URLSearchParams(location.search).get('seed');if(urlSeed)$('seed-input').value=urlSeed.slice(0,48);
const keys=new Set(),touch=new Map(),pending=new Set(),images={butter:{},monsters:{fan:{},archer:{},ghost:{}},backgrounds:{}},reduced=matchMedia('(prefers-reduced-motion: reduce)');
const bindings={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',KeyW:'jump',ArrowUp:'jump',KeyJ:'attack',KeyX:'attack',ShiftLeft:'dash',ShiftRight:'dash',KeyK:'dash',KeyE:'skill',KeyF:'interact',ArrowDown:'interact',KeyS:'interact'};
function input(){const value={};for(const key of keys){const action=bindings[key]||key;value[action]=true;}for(const action of touch.values())value[action]=true;for(const action of pending)value[action+'Pressed']=true;value.jumpReleased=pending.has('jumpRelease');return value;}
function clearInput(){keys.clear();touch.clear();pending.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));if(game)game.previous={};}
function focusGame(){canvas.focus({preventScroll:true});}
function start(seed=$('seed-input').value.trim()||Date.now()){if(!ready)return;clearInput();game=createGame(seed);started=true;shownPhase='';shownRoom=-1;accumulator=0;const url=new URL(location.href);url.searchParams.set('seed',game.seedLabel);history.replaceState(null,'',url);syncUI();focusGame();}
function pause(){if(!started||game.phase!=='playing')return;game.phase='paused';clearInput();syncUI();$('resume-button').focus({preventScroll:true});}
function resume(){if(game.phase!=='paused')return;game.phase='playing';clearInput();syncUI();focusGame();}
$('start-button').addEventListener('click',()=>start());$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);
document.querySelectorAll('.restart').forEach(b=>b.addEventListener('click',()=>{$('seed-input').value='';start();}));
document.querySelectorAll('.replay').forEach(b=>b.addEventListener('click',()=>start(game.seedLabel)));
function toggleMap(){if(!started)return;if(game.phase==='map'){game.phase='playing';syncUI();focusGame();}else if(game.phase==='playing'){game.phase='map';clearInput();syncUI();$('map-close').focus({preventScroll:true});}}
$('map-button').addEventListener('click',toggleMap);$('map-close').addEventListener('click',toggleMap);
function closeBuild(){if(!['build','shop'].includes(game.phase))return;game.phase=game.phase==='build'?buildReturnPhase:'playing';clearInput();syncUI();if(game.phase==='playing')focusGame();else document.querySelector('.overlay:not([hidden]) button:not(:disabled)')?.focus({preventScroll:true});}
function toggleBuild(){if(!started)return;if(game.phase==='build')closeBuild();else if(['playing','reward','shop'].includes(game.phase)){buildReturnPhase=game.phase;game.phase='build';clearInput();syncUI();$('build-close').focus({preventScroll:true});}}
function shop(){if(!started)return;if(game.phase==='shop'){closeBuild();return;}if(openShop(game)){clearInput();syncUI();$('shop-close').focus({preventScroll:true});}else notifyGame(game,'상점은 이 방의 전투와 보물·쉼터 이용을 마친 뒤 열려요.');}
$('build-button').addEventListener('click',toggleBuild);$('build-close').addEventListener('click',closeBuild);$('shop-open').addEventListener('click',shop);$('shop-close').addEventListener('click',closeBuild);
$('reward-build').addEventListener('click',toggleBuild);
$('reward-reroll').addEventListener('click',()=>{if(rerollReward(game))drawRewards();});
$('shop-reroll').addEventListener('click',()=>{if(rerollShop(game))drawShop();});
$('touch-toggle').addEventListener('click',()=>{const show=document.body.classList.toggle('show-touch');$('touch-toggle').setAttribute('aria-pressed',String(show));});
window.addEventListener('keydown',e=>{
  if(['KeyM','KeyI','KeyB','Escape'].includes(e.code)&&started){e.preventDefault();if(e.repeat)return;if(e.code==='KeyM')toggleMap();else if(e.code==='KeyI')toggleBuild();else if(e.code==='KeyB')shop();else if(['build','shop'].includes(game.phase))closeBuild();else game.phase==='map'?toggleMap():game.phase==='paused'?resume():pause();return;}
  if(bindings[e.code]&&started&&game.phase==='playing'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();keys.add(e.code);if(!e.repeat)pending.add(bindings[e.code]);}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(bindings[e.code]==='jump')pending.add('jumpRelease');});
window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!started||game.phase!=='playing')return;e.preventDefault();focusGame();canvas.setPointerCapture(e.pointerId);touch.set(e.pointerId,'attack');pending.add('attack');});
function releasePointer(e){if(touch.get(e.pointerId)==='jump')pending.add('jumpRelease');touch.delete(e.pointerId);for(const b of document.querySelectorAll('[data-control]'))b.classList.toggle('pressed',[...touch.values()].includes(b.dataset.control));}
for(const event of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,releasePointer);
for(const button of document.querySelectorAll('[data-control]'))button.addEventListener('pointerdown',e=>{if(!started||game.phase!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.control);pending.add(button.dataset.control);button.classList.add('pressed');});
function syncUI(){
  $('start-screen').hidden=started;$('hud').hidden=!started;$('skill-hud').hidden=!started;
  $('pause-screen').hidden=game.phase!=='paused';$('reward-screen').hidden=game.phase!=='reward';$('end-screen').hidden=!['dead','won'].includes(game.phase);
  $('map-screen').hidden=!['map','route'].includes(game.phase);
  $('build-screen').hidden=game.phase!=='build';$('shop-screen').hidden=game.phase!=='shop';
  $('hp-text').textContent=`${Math.ceil(game.stats.hp)} / ${game.stats.maxHp}`;$('hp-fill').style.width=`${game.stats.hp/game.stats.maxHp*100}%`;
  $('grades').textContent=`저학년 Lv.${game.stats.lowerGrade} · 고학년 Lv.${game.stats.upperGrade}`;$('coins').textContent=game.coins;
  $('shield-label').textContent=game.stats.shieldMax?`보호막 ${Math.ceil(game.player.shield)} / ${game.stats.shieldMax}`:'';
  $('low-label').textContent=`${Math.round(lowerPower(game.stats).chance*100)}% · ${game.lowerProcs}회 발동`;
  $('build-button').disabled=!['playing','build','reward','shop'].includes(game.phase);
  $('enemy-count').textContent=game.room.rewardTaken?'출구 개방':game.room.shrine?`${ROOM_TYPES[game.room.type].name} · F로 이용`:`남은 적 ${game.room.enemies.filter(e=>e.hp>0).length}`;
  $('dash-label').textContent=game.player.dashCooldown>0?`${game.player.dashCooldown.toFixed(1)}s`:'준비';
  $('skill-label').textContent=game.player.skillTime>0?'무적':game.player.skillCooldown>0?`${Math.ceil(game.player.skillCooldown)}s`:'준비';
  $('toast').textContent=game.noticeTime>0?game.notice:'';
  if(shownRoom!==game.room.index){shownRoom=game.room.index;$('room-label').textContent=`0${shownRoom+1} / 0${STAGES}`;$('route').replaceChildren(...Array.from({length:STAGES},(_,i)=>{const dot=document.createElement('i');dot.className='route-dot '+(i===shownRoom?'active':i<shownRoom?'done':'');return dot;}));}
  if(shownPhase!==game.phase){shownPhase=game.phase;document.body.dataset.phase=game.phase;
    if(game.phase==='map'||game.phase==='route'){clearInput();drawWorldMap();if(game.phase==='route')$('world-map').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
    if(game.phase==='reward'){clearInput();drawRewards();$('reward-cards').firstElementChild?.focus({preventScroll:true});}
    if(game.phase==='build'){clearInput();drawBuild();}
    if(game.phase==='shop'){clearInput();drawShop();}
    if(game.phase==='dead'||game.phase==='won'){clearInput();const won=game.phase==='won';$('end-kicker').textContent=won?'ESCAPED!':'ONE MORE TRY';$('end-title').textContent=won?'버터, 탈출 성공!':'조금만 더 가면 되는데…';$('end-summary').textContent=`${game.room.index+1}구역 · ${game.stats.kills}마리 처치 · 아이템 ${game.stats.itemsTaken}개 · ${Math.floor(game.elapsed/60)}분 ${Math.floor(game.elapsed%60)}초`;$('end-screen').querySelector('button').focus({preventScroll:true});}
  }
  canvas.dataset.x=game.player.x.toFixed(2);canvas.dataset.y=game.player.y.toFixed(2);canvas.dataset.facing=game.player.facing;canvas.dataset.butterRenderer='original36-mirrored37';
}
// Only static item definitions go into markup; seeds/user input use textContent.
function itemCard(id,onSelect,{price=null,sold=false}={}){
  const item=ITEMS[id],rarity=RARITIES[item.rarity],owned=game.stats.inventory[id]||0,next=applyBuildItem(game.stats,id),changes=itemChanges(game.stats,id),button=document.createElement('button');
  button.className='reward-card';button.dataset.item=id;button.style.setProperty('--rarity',rarity.color);button.disabled=sold||(price!==null&&game.coins<price);
  const tags=item.tags.map(t=>{const before=game.stats.inscriptions[t],after=next.inscriptions[t],unlocks=sold?[]:[2,4].filter(n=>before<n&&after>=n);return `<span class="item-tag${unlocks.length?' unlock':''}">${INSCRIPTIONS[t].name} ${before}${sold?'':'→'+after}${unlocks.length?' · '+unlocks.join('/')+'세트 활성':''}</span>`;}).join('');
  button.innerHTML=`<small class="rarity">${rarity.name} · ${sold?'구매 완료':price!==null?price+' G':'하나 선택'}</small><svg aria-hidden="true"><use href="./assets/ui-icons.svg#${item.icon}"></use></svg><b>${item.name}</b><strong class="owned">보유 ×${owned}${sold?'':' → ×'+(owned+1)}</strong><span>${item.description}</span><div class="item-tags">${tags}</div><div class="item-deltas">${sold?'<span>이 진열에서 이미 구매한 물건이에요.</span>':changes.slice(0,3).map(t=>`<span>${t}</span>`).join('')||'<span>현재 효과 상한 도달 · 보유 개수는 누적</span>'}${!sold&&changes.length>3?`<small>그 외 ${changes.length-3}개 변화 · 능력치 창에서 확인</small>`:''}</div>`;
  if(!sold)button.title=changes.join('\n');
  button.addEventListener('click',onSelect);return button;
}
function drawRewards(){
  $('reward-cards').replaceChildren(...game.choices.map(id=>itemCard(id,()=>{if(chooseReward(game,id)){clearInput();syncUI();focusGame();}})));
  $('reward-info').textContent=game.room.cleanBonus?'체력 손실 없이 클리어! +8 G · 왕새총 쿨타임 3초 회복':'같은 아이템도 누적돼요. 학년 아이템은 항상 한 종류 이상 등장해요.';
  const n=game.room.rewardRerolls||0;$('reward-reroll').textContent=`다시 뽑기 ${rewardRerollCost(game)} G (${n}/2)`;$('reward-reroll').disabled=n>=2||game.coins<rewardRerollCost(game);$('reward-coins').textContent=`보유 ${game.coins} G · 선택 후 상점 B 이용 가능`;
}
function drawBuild(){
  const s=game.stats,low=lowerPower(s),high=upperPower(s);
  $('build-count').textContent=`이번 여정 · 아이템 ${s.itemsTaken}개 / ${Object.keys(s.inventory).length}종 · ${game.coins} G`;
  $('build-last').textContent=game.lastPickup||'보상과 상점에서 같은 아이템을 다시 얻어도 효과가 쌓여요.';
  $('grade-details').innerHTML=`<article><small>자동 발동 · 저학년</small><h3>추적 새총 <b>Lv.${s.lowerGrade}</b></h3><p>${gradeSources(s,'lowerGrade')}</p><strong>발동 ${(low.chance*100).toFixed(1)}% · 추가 도약 ${low.bounces}회</strong><p>피해 ${low.damage.toFixed(1)} · 유도 성능 ${low.homing.toFixed(1)}<br>최대 ${low.pity}회 사격마다 발동 보장 · 발동 누적 ${game.lowerProcs}회<br>다른 살아 있는 적에게 도약하며 같은 적은 재타격하지 않아요.</p><div class="milestones"><span class="${s.lowerGrade>=3?'active':''}">Lv.3 추적탄 +1발</span><span class="${s.lowerGrade>=5?'active':''}">Lv.5 추적탄 총 +2발</span></div></article><article><small>E · 고학년</small><h3>왕새총 <b>Lv.${s.upperGrade}</b></h3><p>${gradeSources(s,'upperGrade')}</p><strong>피해 ${high.damage.toFixed(1)} · ${high.duration.toFixed(1)}초 지속</strong><p>재사용 ${s.skillCooldown.toFixed(2)}초 · 반경 ${high.radius}px<br>추가 탄환은 55%, 반대편 왕짱돌은 65% 피해.<br>왕새총 사용 중 무적, 방 이동 시 종료돼요.</p><div class="milestones"><span class="${s.upperGrade>=3?'active':''}">Lv.3 반대 방향 왕짱돌 +1</span><span class="active">매 레벨 피해 · 크기 · 지속 증가</span></div></article>`;
  $('stat-grid').innerHTML=statRows(s).map(([id,label,value])=>`<div data-stat="${id}"><span>${label}</span><b>${value}</b></div>`).join('');
  $('inscriptions').innerHTML=Object.entries(INSCRIPTIONS).map(([id,v])=>{const n=s.inscriptions[id];return `<article style="--tag-color:${v.color}"><h4>${v.name} <b>${n}</b></h4><p class="${n>=2?'active':''}">② ${v.two}</p><p class="${n>=4?'active':''}">④ ${v.four}</p></article>`;}).join('');
  $('inventory').innerHTML=Object.entries(s.inventory).map(([id,n])=>`<div data-owned="${id}"><svg aria-hidden="true"><use href="./assets/ui-icons.svg#${ITEMS[id].icon}"></use></svg><span><b>${ITEMS[id].name} <em>×${n}</em></b><small>${ITEMS[id].tags.map(t=>INSCRIPTIONS[t].name).join(' · ')}</small></span></div>`).join('')||'<p>아직 가방이 비어 있어요.</p>';
  $('shop-open').disabled=!game.room.cleared||!game.room.rewardTaken;$('shop-open').textContent=$('shop-open').disabled?'상점 · 이 방 완료 후 개방':'상점 열기 B';
}
function drawShop(){
  $('shop-coins').textContent=`보유 ${game.coins} G · 이 방에서만 판매하는 세 가지 물건`;
  $('shop-cards').replaceChildren(...game.room.shop.stock.map((o,i)=>itemCard(o.id,()=>{if(buyShopItem(game,i)){drawShop();notifyGame(game,game.lastPickup);}},{price:RARITIES[ITEMS[o.id].rarity].price,sold:o.sold})));
  $('shop-last').textContent=game.lastPickup;$('shop-reroll').textContent=`진열 바꾸기 10 G (${game.room.shop.rerolls}/3)`;$('shop-reroll').disabled=game.coins<10||game.room.shop.rerolls>=3;
}
function drawWorldMap(){
  const selecting=game.phase==='route',available=new Set(selecting?routeOptions(game).map(n=>n.id):[]),world=game.world;
  $('map-title').textContent=selecting?'다음에는 어디로 갈까?':'아공간 지도';$('map-instruction').textContent=selecting?'빛나는 방을 선택하세요. 선택하지 않은 갈래는 이번 여정에서 지나갑니다.':'출구에서 다음 갈림길을 선택할 수 있어요. 지도 확인 중에는 전투가 멈춰요.';
  $('map-close').hidden=selecting;$('seed-label').textContent=`SEED ${game.seedLabel} · 생성 규칙 v38`;
  const positions=new Map(world.nodes.map(n=>{const layer=world.nodes.filter(v=>v.depth===n.depth);return[n.id,{x:6+n.depth/(STAGES-1)*88,y:layer.length===1?50:18+n.lane/(layer.length-1)*64}];}));
  const map=$('world-map');map.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 300');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  for(const node of world.nodes)for(const id of node.next){const a=positions.get(node.id),b=positions.get(id),line=document.createElementNS(svg.namespaceURI,'line');for(const [key,value]of Object.entries({x1:a.x*10,y1:a.y*3,x2:b.x*10,y2:b.y*3}))line.setAttribute(key,value);line.setAttribute('class',node.id===game.currentNodeId&&available.has(id)?'available-edge':node.completed&&world.nodes.find(n=>n.id===id).visited?'visited-edge':'');svg.append(line);}map.append(svg);
  for(const node of world.nodes){const pos=positions.get(node.id),type=ROOM_TYPES[node.type],button=document.createElement('button');button.className='map-node'+(node.visited?' visited':'')+(node.id===game.currentNodeId?' current':'')+(available.has(node.id)?' available':'');button.style.left=`${pos.x}%`;button.style.top=`${pos.y}%`;button.style.setProperty('--node-color',type.color);button.disabled=!available.has(node.id);button.dataset.node=node.id;button.setAttribute('aria-label',`${node.depth+1}단계 ${type.name}, ${BIOMES[node.biome].name}, ${type.reward}`);button.title=`${BIOMES[node.biome].name} · ${type.reward}`;button.innerHTML=`<b>${type.symbol} ${type.name}</b><small>${BIOMES[node.biome].name}</small>`;button.addEventListener('click',()=>{if(chooseRoute(game,node.id)){clearInput();syncUI();focusGame();}});map.append(button);}
}
function frame(ms){
  const dt=Math.min(.1,(ms-(last||ms))/1000);last=ms;
  if(started&&game.phase==='playing'){accumulator+=dt;while(accumulator>=1/120){tick(game,input(),1/120);pending.clear();accumulator-=1/120;if(game.phase!=='playing'){accumulator=0;break;}}}
  else{accumulator=0;if(!started&&!reduced.matches){game.time+=dt;game.player.gait.clock+=dt;}}
  renderGame(ctx,game,images,{started,reducedMotion:reduced.matches});syncUI();requestAnimationFrame(frame);
}
function loadImage(src,target,key){return new Promise(resolve=>{const image=new Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);if(ok)target[key]=image;resolve(ok);};const timeout=setTimeout(()=>finish(false),12000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=src;});}
async function boot(){
  let completed=0;const tasks=[];const add=(src,target,key)=>tasks.push(()=>loadImage(src,target,key).then(ok=>{completed++;$('load-status').textContent=`원작 에셋 ${completed} / ${tasks.length}`;return ok;}));
  add(BUTTER_POSTER,images.butter,'poster');for(const [key,c]of Object.entries(BUTTER_ORIGINAL.clips))add(c.image,images.butter,key);
  for(const [key,m]of Object.entries(STAGE_ART.monsters)){for(const [clip,c]of Object.entries(m.clips))add(c.image,images.monsters[key],clip);add(`./assets/trickcal-stage37/${key}-poster.png`,images.monsters[key],'poster');}
  for(const [key,b]of Object.entries(STAGE_ART.backgrounds))add(b.image,images.backgrounds,key);
  const results=await Promise.all(tasks.map(t=>t())),failed=results.filter(x=>!x).length;ready=true;document.body.dataset.ready='true';$('start-button').disabled=false;$('start-button').textContent='아공간으로 출발 →';$('load-status').textContent=failed?`${failed}개 이미지를 불러오지 못했어요. 기본 표시로 플레이할 수 있어요.`:'준비 완료 · 새총은 공격 버튼을 누르고 있으면 계속 발사해요.';
}
requestAnimationFrame(frame);boot().catch(error=>{$('load-status').textContent='준비 중 오류가 났어요. 새로고침해 주세요.';console.error(error);});
// Only the explicit local test URL exposes fixtures; normal play has no debug UI.
if(new URLSearchParams(location.search).get('test')==='1')window.__platformer37={get game(){return game;},start,tick,chooseReward,enterNextRoom,chooseRoute,interactRoom,grantItem,rerollReward,openShop,buyShopItem,rerollShop,images,render:()=>renderGame(ctx,game,images,{started:true,reducedMotion:true})};
