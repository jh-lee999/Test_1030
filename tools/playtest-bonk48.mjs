// An input-only, full-information aiming solver. This is NOT a human fun test.
import {createGame,aimAt,fire,tick,chooseUpgrade,nextStage,toggleKing,hasFusion} from '../bonk-engine.js';
export function settle(g){for(let i=0;i<500&&['flight','enemy'].includes(g.phase);i++)tick(g,1/60);}
export function bestAim(g){
  const candidates=[];for(let x=65;x<750;x+=55)for(const y of [150,420,650])candidates.push({x,y});for(const e of g.enemies)if(!e.dead)candidates.push({x:e.x,y:e.y});
  let best={score:-Infinity,point:candidates[0]};
  for(const point of candidates){const s={...JSON.parse(JSON.stringify(g)),rng:()=>.5,lootRng:()=>.5};aimAt(s,point.x,point.y);fire(s);settle(s);const score=s.turnDamage+(s.kills-g.kills)*18+(s.hp-g.hp)*2;if(score>best.score)best={score,point};}
  return best.point;
}
export function play(seed,mode='solver'){
  const g=createGame(seed),trace=[];
  for(let n=0;n<100&&!['won','dead'].includes(g.phase);n++){
    if(g.phase==='aim'){if(g.charge>=100)toggleKing(g);const p=mode==='solver'?bestAim(g):{x:400,y:150};aimAt(g,p.x,p.y);fire(g);settle(g);trace.push({stage:g.stage+1,turn:g.turn,hp:g.hp,damage:Math.ceil(g.turnDamage),combo:g.combo,phase:g.phase});}
    else if(g.phase==='reward'){const rank=id=>id==='snack'&&g.hp<20?20:({split:7,mark:6,pouch:5,bomb:4,lower:3,upper:2,rubber:1,snack:0}[id])+(id==='mark'&&g.inventory.split>=2||id==='split'&&g.inventory.mark>=2?5:0);chooseUpgrade(g,[...g.choices].sort((a,b)=>rank(b)-rank(a))[0]);settle(g);}
    else if(g.phase==='next')nextStage(g);else break;
  }return {seed,mode,phase:g.phase,hp:g.hp,shots:g.shots,level:g.level,inventory:g.inventory,fusion:hasFusion(g,'fireworks'),best:g.bestCombo,trace};
}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`)for(const seed of ['48','1793686699326','BUTTER'])for(const mode of ['straight','solver'])console.log(JSON.stringify(play(seed,mode)));
