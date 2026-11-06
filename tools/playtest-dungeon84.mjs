import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pilot,choose} from './dungeon84-policy.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4196',seed=process.argv[3]||'native80-0',errors=[],held=new Set(),state={};let firing=false;
try{
 const p=await browser.newPage({viewport:{width:1366,height:850}});p.on('pageerror',e=>errors.push(e.message));await p.goto(root+'/dungeon84.html?test=1&persist=1&seed='+encodeURIComponent(seed));await p.waitForSelector('body[data-ready="true"]');await p.locator('#start').click();let last=-30,seen=new Set();
 for(let i=0;i<2000;i++){
  const g=await p.evaluate(()=>window.__dungeon84.game);if(g.time-last>=30){last=g.time;await writeFile('/tmp/dungeon84-native-progress.json',JSON.stringify({game:g,policy:pilot(g,state)},null,2));console.log(JSON.stringify({time:Math.round(g.time),hp:g.player.hp,floor:g.floorIndex+1,room:g.room,clears:g.clears,items:g.items}));}
  if(['won','dead'].includes(g.phase)||g.clears>=3)break;
  if(g.phase==='lesson'){for(const k of held)await p.keyboard.up(k);held.clear();if(firing){await p.mouse.up();firing=false;}await p.locator('[data-lesson]:not(:disabled)').first().click();continue;}
  if(g.phase==='augment'){for(const k of held)await p.keyboard.up(k);held.clear();if(firing){await p.mouse.up();firing=false;}await p.locator('[data-augment="'+choose(g)+'"]').click();continue;}
  if(g.phase==='trial'){for(const k of held)await p.keyboard.up(k);held.clear();if(firing){await p.mouse.up();firing=false;}await p.locator('[data-trial-start]').click();continue;}
  const q=pilot(g,state),want=new Set();if(q.input.x>.12)want.add('d');if(q.input.x<-.12)want.add('a');if(q.input.y>.12)want.add('s');if(q.input.y<-.12)want.add('w');for(const k of held)if(!want.has(k)){await p.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await p.keyboard.down(k);held.add(k);}
  if(q.input.target){const v=g.rooms[g.room].view,z=Math.min(1366/v.width,850/v.height),ox=(1366-v.width*z)/2,oy=(850-v.height*z)/2;await p.mouse.move(ox+q.input.target.x*z,oy+q.input.target.y*z);}
  if(q.input.fire&&!firing){await p.mouse.down();firing=true;}if(!q.input.fire&&firing){await p.mouse.up();firing=false;}
  if(q.ultimate)await p.keyboard.press('e');if(q.interact)await p.keyboard.press('f');if(!seen.has(g.floorIndex+':'+g.room)){seen.add(g.floorIndex+':'+g.room);await p.screenshot({path:'/tmp/dungeon84-native-room-'+g.floorIndex+'-'+g.room+'.png'});}await p.waitForTimeout(65);
 }
 for(const k of held)await p.keyboard.up(k);if(firing)await p.mouse.up();const result=await p.evaluate(()=>({game:window.__dungeon84.game,profile:window.__dungeon84.profile}));assert(result.game.clears>=3||result.game.phase==='dead','native input must complete3 fights or die');await p.screenshot({path:'/tmp/dungeon84-native-end.png'});await p.reload();await p.waitForSelector('body[data-ready="true"]');assert.equal(await p.evaluate(()=>window.__dungeon84.profile.records.length),result.game.phase==='dead'?1:0);assert.equal(await p.locator('[data-continue]').count(),result.game.phase==='dead'?0:1);assert.deepEqual(errors,[]);await writeFile('/tmp/dungeon84-native-report.json',JSON.stringify({nativeOnly:true,fullInformationPolicy:true,seed,result,errors},null,2));console.log(JSON.stringify({nativeOnly:true,phase:result.game.phase,time:result.game.time,clears:result.game.clears,hp:result.game.player.hp,items:result.game.items,kills:result.game.kills,errors},null,2));
}finally{await browser.close();}
