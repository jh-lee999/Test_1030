// Local-only continuation/settings. Storage failure must never stop the game.
import * as E from './poker-engine.js?v=65';
const SAVE_KEY='butter.cards.run.v1',PROFILE_KEY='butter.cards.profile.v1',VERSION=1;
const integer=(n,min=0,max=1e9)=>Number.isInteger(n)&&n>=min&&n<=max;
const number=(n,min=0,max=1e9)=>Number.isFinite(n)&&n>=min&&n<=max;
const unique=a=>new Set(a).size===a.length;
const card=c=>c&&/^c\d{1,5}$/.test(c.id)&&Object.hasOwn(E.SUITS,c.suit)&&integer(c.rank,2,14);
const known=id=>Object.hasOwn(E.RELICS,id);
function validateRun(g) {
  if(!g||typeof g!=='object'||typeof g.seed!=='string'||g.seed.length<1||g.seed.length>48)return false;
  if(!['draft','pick','resolve','paused','shop'].includes(g.phase)||!integer(g.depth,0,5)||!integer(g.turn,1,1000))return false;
  if(g.mode!==undefined&&!Object.hasOwn(E.RUN_MODES,g.mode)||!integer(g.pressure??0,0,4))return false;
  if(g.wardUsed!==undefined&&typeof g.wardUsed!=='boolean')return false;
  if(!Array.isArray(g.deck)||g.deck.length<20||g.deck.length>80||!g.deck.every(card)||!unique(g.deck.map(c=>c.id)))return false;
  if(!integer(g.nextCard,52,99999)||!g.deck.every(c=>Number(c.id.slice(1))<g.nextCard))return false;
  if(!Array.isArray(g.relics)||g.relics.length>4||!g.relics.every(known)||!unique(g.relics))return false;
  if(!g.training||Object.keys(E.PATTERNS).some(id=>!integer(g.training[id],0,8)))return false;
  if(!Array.isArray(g.choices)||g.choices.length>3||g.choices.some(id=>!['echo','paint','ladder'].includes(id)))return false;
  const limits=E.resourceLimits(g);
  if(!integer(g.hands,0,limits.hands)||!integer(g.discards,0,limits.discards)||!number(g.maxHp,1,999)||!number(g.hp,1,g.maxHp)||!integer(g.gold,0,1000000))return false;
  if(!number(g.time)||!integer(g.attacks)||!integer(g.best)||!integer(g.totalDamage)||!integer(g.drawState,0,0xffffffff)||!integer(g.shopState,0,0xffffffff))return false;
  if(!number(g.shield,0,999)||!integer(g.strikes,0,2)||!integer(g.rage,0,3)||!integer(g.maceHits,0,3)||typeof g.komiUsed!=='boolean'||typeof g.armorBroken!=='boolean')return false;
  if(typeof g.notice!=='string'||g.notice.length>1000||!integer(g.stage,0,3))return false;
  if(!g.foe||!['fan','archer','guard','ghost'].includes(g.foe.enemy)||!integer(g.foe.maxHp,1,100000)||!number(g.enemyHp,0,g.foe.maxHp)||typeof g.foe.boss!=='boolean'||typeof g.foe.elite!=='boolean'||typeof g.foe.name!=='string'||g.foe.name.length>100)return false;
  if(!Array.isArray(g.hand)||g.hand.length>8||!g.hand.every(card)||!unique(g.hand.map(c=>c.id)))return false;
  if(!Array.isArray(g.selected)||!unique(g.selected)||g.selected.some(id=>!g.hand.some(c=>c.id===id)))return false;
  if(!Array.isArray(g.drawPile)||!Array.isArray(g.discardPile)||g.drawPile.length>80||g.discardPile.length>80)return false;
  if(!Array.isArray(g.history)||g.history.length>6||g.history.some(h=>!integer(h.depth,0,5)||!number(h.hp,0,999)||!integer(h.hands,0,5)||!integer(h.reward)||!integer(h.interest,0,5)||typeof h.name!=='string'||h.name.length>100))return false;
  const phase=g.phase==='paused'?g.returnPhase:g.phase;
  if(g.phase==='paused'&&!['pick','resolve'].includes(g.returnPhase))return false;
  if(['pick','resolve'].includes(phase)){
    const all=[...g.hand.map(c=>c.id),...g.drawPile,...g.discardPile],ids=new Set(g.deck.map(c=>c.id));
    if(g.hand.length!==8||all.length!==g.deck.length||!unique(all)||all.some(id=>!ids.has(id)))return false;
    if(!g.hand.every(c=>g.deck.some(d=>d.id===c.id&&d.rank===c.rank&&d.suit===c.suit)))return false;
    if(phase==='pick'&&(!g.hands||g.enemyHp<=0))return false;
  }
  if(g.lastPattern!==null&&!Object.hasOwn(E.PATTERNS,g.lastPattern))return false;
  if(phase==='resolve'){
    const p=g.pending,r=p?.result;
    if(!p||!r||!Object.hasOwn(E.PATTERNS,r.id)||r.name!==E.PATTERNS[r.id].name||!integer(r.damage,1)||!number(p.clock,0,10)||!number(p.hitAt,0,10)||!number(p.endAt,p.hitAt,10)||p.clock>p.endAt||typeof p.applied!=='boolean'||!number(p.returnDamage,0,999))return false;
    if(!Array.isArray(r.cardIds)||r.cardIds.length<1||r.cardIds.length>5||!unique(r.cardIds)||r.cardIds.some(id=>!g.hand.some(c=>c.id===id)))return false;
    if(!Array.isArray(r.indices)||r.indices.length!==r.cardIds.length||r.indices.some((n,i)=>!integer(n,0,7)||g.hand[n].id!==r.cardIds[i]))return false;
    if(!number(r.chips)||!number(r.mult)||!number(r.raw)||!number(r.guard,0,g.mode==='deep'?12:8)||!number(r.heal,0,g.maxHp)||!integer(r.strikes,0,2))return false;
    if(['stun','rageSpent','execute','breakArmor','blocked'].some(k=>typeof r[k]!=='boolean'))return false;
    if(!Array.isArray(r.relicOrder)||r.relicOrder.length>4||!r.relicOrder.every(known))return false;
    if(!Array.isArray(r.steps)||r.steps.length>100||r.steps.some(s=>typeof s.label!=='string'||s.label.length>200||/[<>]/.test(s.label)||!number(s.chips)||!number(s.mult)||!number(s.total)||typeof s.source!=='string'||!['pattern','card','exposed','guard','break','ward',...Object.keys(E.RELICS)].includes(s.source)||!['base','card','relic','enemy','impact'].includes(s.phase)||!integer(s.slot,-1,3)))return false;
    if(!g.action||!['normal','high'].includes(g.action.type)||!number(g.action.duration,0,2)||!number(g.action.time,0,g.action.duration))return false;
  }else if(g.pending!==null)return false;
  if(phase==='shop'){
    const s=g.shop;if(!s||!Array.isArray(s.relics)||s.relics.length>3||!s.relics.every(known)||!unique(s.relics)||!Array.isArray(s.booster)||s.booster.length!==3||s.booster.some(c=>!Object.hasOwn(E.SUITS,c.suit)||!integer(c.rank,2,14)))return false;
    if(!integer(s.cuts,0,2)||!integer(s.copies,0,1)||!integer(s.changes,0,2)||!integer(s.lessons,0,2)||typeof s.rested!=='boolean'||typeof s.packBought!=='boolean')return false;
  }
  return true;
}
export function validRun(g){try{return validateRun(g);}catch{return false;}}
export function encodeRun(g,id) {
  if(!validRun(g))return null;
  return JSON.stringify({version:VERSION,id,state:g});
}
export function decodeRun(raw) {
  try{if(typeof raw!=='string'||raw.length>100000)return null;const value=JSON.parse(raw);if(value.version!==VERSION||typeof value.id!=='string'||value.id.length>100||!validRun(value.state))return null;return value;}catch{return null;}
}
export function defaultPreferences(){return {volume:.55,motion:'auto',coach:true};}
export function readProfile(raw) {
  const empty={preferences:defaultPreferences(),records:[]};
  try{
    const p=JSON.parse(raw);if(p?.version!==VERSION)return empty;
    const prefs=p.preferences||{},preferences={volume:number(prefs.volume,0,1)?prefs.volume:.55,motion:['auto','reduce'].includes(prefs.motion)?prefs.motion:'auto',coach:typeof prefs.coach==='boolean'?prefs.coach:true};
    const records=Array.isArray(p.records)?p.records.filter(r=>r&&typeof r.id==='string'&&r.id.length<=100&&typeof r.seed==='string'&&r.seed.length<=48&&['won','dead'].includes(r.phase)&&integer(r.rooms,0,6)&&integer(r.best)&&integer(r.attacks)&&integer(r.deck,20,80)&&integer(r.at,0,Number.MAX_SAFE_INTEGER)).slice(0,20):[];
    return {preferences,records};
  }catch{return empty;}
}
export function createProfile(storage) {
  let available=Boolean(storage),save=null,data={preferences:defaultPreferences(),records:[]},runId='',lastSignature='';
  const read=key=>{try{return storage?.getItem(key)||null;}catch{available=false;return null;}};
  const write=(key,value)=>{try{if(!storage)throw Error('Unavailable');storage.setItem(key,value);return true;}catch{available=false;return false;}};
  data=readProfile(read(PROFILE_KEY));save=decodeRun(read(SAVE_KEY));
  function storeProfile(){return write(PROFILE_KEY,JSON.stringify({version:VERSION,...data}));}
  function begin(){runId=globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+String(globalThis.performance?.now()||0);lastSignature='';save=null;}
  function checkpoint(g) {
    const signature=JSON.stringify([g.seed,g.phase,g.depth,g.turn,g.attacks,g.gold,g.hp,g.discards,g.hands,g.drawState,g.shopState,g.deck.length,g.relics,g.training,g.selected,g.notice,g.pending?.applied]);
    if(signature===lastSignature)return;lastSignature=signature;
    if(['won','dead'].includes(g.phase)){
      if(!data.records.some(r=>r.id===runId)){data.records.unshift({id:runId,seed:g.seed,mode:g.mode||'classic',phase:g.phase,rooms:g.history.length,best:g.best,attacks:g.attacks,deck:g.deck.length,at:Date.now()});data.records=data.records.slice(0,20);storeProfile();}
      save=null;write(SAVE_KEY,'');return;
    }
    const encoded=encodeRun(g,runId);if(encoded){if(write(SAVE_KEY,encoded))save=decodeRun(encoded);}
  }
  function resume(){if(!save)return null;runId=save.id;lastSignature='';return structuredClone(save.state);}
  function preference(key,value){
    if(key==='volume'&&number(value,0,1)||key==='motion'&&['auto','reduce'].includes(value)||key==='coach'&&typeof value==='boolean'){data.preferences[key]=value;storeProfile();return true;}return false;
  }
  return {get available(){return available;},get saved(){return save;},get preferences(){return data.preferences;},get records(){return data.records;},begin,checkpoint,resume,preference};
}
