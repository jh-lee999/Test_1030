import * as E from '../dungeon77-engine.js';
import * as S from '../dungeon77-save.js';
import {pilot,choose} from './dungeon77-policy.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const count=Number(process.argv[2]||4),results=[];
const files=['dungeon77-engine.js','dungeon76-world.js','dungeon77-content.js','dungeon77-build.js','dungeon77-shots.js','dungeon76-biome.js','dungeon76-bosses.js','dungeon76-encounters.js','dungeon77-economy.js','dungeon77-save.js','dungeon76-build.js','dungeon76-content.js','tools/dungeon77-policy.mjs'];
if(!Number.isInteger(count)||count<1||count>100)throw Error('count1..100');
for(let seed=0;seed<count;seed++){
 const g=E.createGame('diagnostic77-'+seed),state={};let savedChecks=0;
 for(let i=0;i<36000&&['playing','augment','trial','event'].includes(g.phase);i++){
  if(g.phase==='augment'){E.chooseAugment(g,choose(g));continue;}
  if(g.phase==='trial'){E.acceptTrial(g);continue;}
  if(g.phase==='event'){if(!E.chooseEvent(g,'heal')&&!E.chooseEvent(g,'trade')&&!E.chooseEvent(g,'rush'))E.cancelEvent(g);continue;}
  const p=pilot(g,state);if(p.interact)E.interact(g);if(p.ultimate)E.useUltimate(g);E.tick(g,1/30,p.input);
  if(i%300===0&&g.phase!=='dead'&&g.phase!=='won'){if(!S.validRun(g))throw Error('Invalid snapshot seed '+seed+' at '+g.time);savedChecks++;}
 }
 results.push({seed:g.seed,phase:g.phase,time:g.time,hp:g.player.hp,floor:g.floorIndex+1,clears:g.clears,kills:g.kills,items:g.items,damageTaken:g.damageTaken,lastHit:g.lastHit,telemetry:g.telemetry,savedChecks,unfinished:g.phase==='playing'?{room:g.room,type:E.current(g).type,player:{x:g.player.x,y:g.player.y},enemies:E.current(g).enemies.map(e=>({role:e.role,state:e.state,hp:e.hp,x:e.x,y:e.y})),pickups:E.current(g).pickups,policy:pilot(g,state)}:null});
}
console.log(JSON.stringify({version:77,sourceFiles:files,sourceSHA256:createHash('sha256').update(files.map(f=>readFileSync(new URL('../'+f,import.meta.url))).join('\n')).digest('hex'),limits:'Full-information automated policy diagnostics; not human win rate, difficulty, aesthetics, optimality or proof of fun. Native DOM input and explicit fixtures are reported separately.',results},null,2));
