import * as E from '../dungeon73-engine.js';
import {pilot,choose} from './dungeon73-policy.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const count=Number(process.argv[2]||4);if(!Number.isInteger(count)||count<1||count>100)throw Error('count1..100');
const files=['dungeon73-engine.js','dungeon73-world.js','dungeon73-content.js','tools/dungeon73-policy.mjs'],sourceSHA256=createHash('sha256').update(files.map(f=>readFileSync(new URL('../'+f,import.meta.url))).join('\n')).digest('hex'),results=[];
for(let seed=0;seed<count;seed++){const g=E.createGame('diagnostic-'+seed),state={};for(let i=0;i<18000&&['playing','choice'].includes(g.phase);i++){if(g.phase==='choice'){E.chooseItem(g,choose(g));continue;}const p=pilot(g,state);if(p.interact)E.interact(g);if(p.ultimate)E.useUltimate(g);E.tick(g,1/30,p.input);}results.push({seed:g.seed,phase:g.phase,time:g.time,hp:g.player.hp,room:g.room,clears:g.clears,kills:g.kills,items:g.items,damageTaken:g.damageTaken,telemetry:g.telemetry});}
console.log(JSON.stringify({version:73,sourceSHA256,sourceFiles:files,limits:'Small full-information automated policy sample, not human difficulty, aesthetics, optimality or evidence of fun. Native DOM run is separate.',results},null,2));
