import * as E from '../survivor71-engine.js';
import {choose,pilot} from './survivor71-policy.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const seeds=Number(process.argv[2]||4),map=process.argv[3]||'forest',tier=Number(process.argv[4]||0),results=[];
if(!Number.isInteger(seeds)||seeds<1||seeds>100||!Object.hasOwn(E.MAPS,map)||![0,1,2].includes(tier))throw Error('Use 1..100 seeds, forest/night/ember, tier0..2');
const sourceSHA256=createHash('sha256').update(['survivor71-engine.js','survivor71-world.js','survivor71-content.js'].map(f=>readFileSync(new URL('../'+f,import.meta.url))).join('\n')).digest('hex');
const percentile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*q)];
for(const mode of ['idle','kite','objective'])for(const meta of ['new','max'])for(let seed=0;seed<seeds;seed++){
 const family=seed%3,g=E.createGame('balance-'+seed,{map,tier,goal:['thunderweb','dreamoven','tempest'][family],runId:'diagnostic-'+mode+'-'+meta+'-'+seed,studies:meta==='max'?{vitality:3,stride:3,pocket:3,insight:2}:{}}),state={};let iterations=0;
 while(['playing','upgrade'].includes(g.phase)&&g.time<420&&iterations++<40000){if(g.phase==='upgrade'){E.chooseUpgrade(g,choose(g,family));continue;}const p=pilot(g,state,{mode});if(p.interact)E.interact(g);if(p.ultimate)E.useUltimate(g);E.tick(g,1/30,p.input);}
 const r={mode,meta,seed,family,phase:g.phase,time:Math.round(g.time),level:g.level,kills:g.kills,seals:g.seals,fusions:g.fusions,hp:Math.round(g.player.hp),damageTaken:Math.round(g.telemetry.damageTaken),firstLevelAt:g.telemetry.firstLevelAt,damageBy:g.telemetry.damageBy,procs:g.telemetry.procs,samples:g.telemetry.samples};results.push(r);console.log(JSON.stringify({progress:results.length,mode,meta,seed,phase:r.phase,time:r.time,seals:r.seals,fusions:r.fusions,level:r.level}));
}
const groups=[];for(const mode of ['idle','kite','objective'])for(const meta of ['new','max']){const rs=results.filter(r=>r.mode===mode&&r.meta===meta);groups.push({mode,meta,n:rs.length,wins:rs.filter(r=>r.phase==='won').length,sealedBoth:rs.filter(r=>r.seals===2).length,medianSeconds:percentile(rs.map(r=>r.time),.5),medianDamageTaken:percentile(rs.map(r=>r.damageTaken),.5),medianLevel:percentile(rs.map(r=>r.level),.5),fusionRuns:rs.filter(r=>r.fusions.length>0).length});}
console.log(JSON.stringify({version:71,sourceSHA256,map,tier,limits:'Full-information automation, fixed policy/seed sample, not humans or evidence of fun. Kite does not interact, so cannot win by design.',groups,results},null,2));
