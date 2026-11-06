import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import * as E from '../dungeon84-engine.js';
import * as S from '../dungeon84-save.js';
import {pilot} from './dungeon84-policy.mjs';
const results=[];
// Matched legal deep-room fixtures: starting equipment, no added invulnerability,
// same roster/entry/seed, at most60 simulation seconds. This is not human skill.
for(let seed=0;seed<24;seed++)for(const policy of ['holdRight','aimOnly','evade']){
 const g=E.createGame('pressure84-'+seed),r=g.rooms.find(r=>r.type==='combat'&&r.depth>=4&&r.shape==='normal'),from=g.rooms.find(q=>E.links(g,q).some(l=>l.to===r.id));g.room=from.id;from.cleared=true;g.transition=0;assert(E.enterRoom(g,E.links(g).find(l=>l.to===r.id).dir));const state={};
 for(let i=0;i<600&&!r.cleared&&g.phase!=='dead';i++){if(g.phase==='lesson'){E.chooseLesson(g,'junior');continue;}const q=policy!=='holdRight'?pilot(g,state):{input:{fire:true,aim:{x:1,y:0}}};if(policy==='aimOnly'){q.input.x=0;q.input.y=0;}E.tick(g,.1,q.input);}
 assert(g.phase==='dead'||S.validRun(g));results.push({seed,policy,cleared:r.cleared,dead:g.phase==='dead',seconds:+g.time.toFixed(2),hp:g.player.hp,kills:g.kills,roles:r.encounter.roles});
}
const summary=Object.fromEntries(['holdRight','aimOnly','evade'].map(p=>{const r=results.filter(r=>r.policy===p);return [p,{runs:r.length,clears:r.filter(r=>r.cleared).length,deaths:r.filter(r=>r.dead).length,meanHP:r.reduce((n,x)=>n+x.hp,0)/r.length,medianSeconds:r.map(x=>x.seconds).sort((a,b)=>a-b)[12]}];}));
assert(summary.evade.clears>summary.holdRight.clears);assert(summary.evade.meanHP>summary.holdRight.meanHP);await writeFile('/tmp/dungeon84-pressure.json',JSON.stringify({explicitMatchedFixtures:true,fullInformationController:true,humanDifficultyOrFunClaim:false,summary,results},null,2));console.log(JSON.stringify(summary,null,2));
