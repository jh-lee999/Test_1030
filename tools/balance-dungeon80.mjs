// Read-only full-information controller, NOT human difficulty/fun evidence.
import {writeFile} from 'node:fs/promises';
import * as E from '../dungeon80-engine.js';
import * as S from '../dungeon80-save.js';
import {pilot,choose} from './dungeon80-policy.mjs';
const results=[];
for(const seed of process.argv.slice(2).length?process.argv.slice(2):['balance80-0','balance80-1','balance80-2','balance80-3']){
 const g=E.createGame(seed),state={};let invalid=null;for(let i=0;i<12000&&!['won','dead'].includes(g.phase);i++){
  if(g.phase==='lesson'){E.chooseLesson(g,g.school.junior<4?'junior':'senior');continue;}
  if(g.phase==='augment'){E.chooseAugment(g,choose(g));continue;}if(g.phase==='trial'){E.acceptTrial(g);continue;}if(g.phase==='event'){E.cancelEvent(g);continue;}
  const q=pilot(g,state);if(q.ultimate)E.useUltimate(g);if(q.interact)E.interact(g);E.tick(g,.1,q.input);
  if(i%100===0&&!['won','dead'].includes(g.phase)&&!S.validRun(g)){invalid={step:i,room:g.room,phase:g.phase};break;}
 }
 const result={seed,phase:g.phase,time:g.time,hp:g.player.hp,floor:g.floorIndex+1,clears:g.clears,kills:g.kills,damageTaken:g.damageTaken,school:g.school,items:g.items,invalid,rooms:g.combatLog};results.push(result);console.log(JSON.stringify(result));
}
await writeFile('/tmp/dungeon80-balance.json',JSON.stringify({fullInformationPolicy:true,humanBalanceClaim:false,results},null,2));if(results.some(r=>r.invalid))process.exitCode=1;
