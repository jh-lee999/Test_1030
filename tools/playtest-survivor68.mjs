// Native real-time diagnostic, never a human fun/quality rating. No state writes.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4194',seed=process.argv[3]||'3',errors=[],held=new Set(),priority=['awake:stone','awake:chain','awake:pillow','awake:storm','move:stone','move:chain','move:pillow','move:storm','passive:power','passive:haste','passive:heart'];
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/?test=1&seed='+encodeURIComponent(seed));await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();let lastReport=-30,iterations=0;
 while(iterations++<2600){
  const s=await page.evaluate(()=>{const g=window.__survivor68.game;return {time:g.time,phase:g.phase,p:g.player,level:g.level,kills:g.kills,offers:g.offers.map(o=>o.id),gems:g.gems,enemies:g.enemies.map(e=>({x:e.x,y:e.y,boss:e.boss}))};});
  if(s.time-lastReport>=30){lastReport=s.time;console.log(JSON.stringify({time:Math.round(s.time),phase:s.phase,hp:s.p.hp,level:s.level,kills:s.kills}));}
  if(['won','dead'].includes(s.phase))break;
  if(s.phase==='upgrade'){
   for(const k of held)await page.keyboard.up(k);held.clear();const score=id=>priority.includes(id)?priority.indexOf(id):99,id=[...s.offers].sort((a,b)=>score(a)-score(b))[0];await page.locator('[data-upgrade="'+id+'"]').click();continue;
  }
  if(s.phase==='paused')throw Error('Unexpected pause in native diagnostic');
  let target={x:1300+430*Math.cos(s.time*.13),y:1000+430*Math.sin(s.time*.13)};
  const gem=s.gems.filter(j=>Math.hypot(j.x-s.p.x,j.y-s.p.y)<280).sort((a,b)=>Math.hypot(a.x-s.p.x,a.y-s.p.y)-Math.hypot(b.x-s.p.x,b.y-s.p.y))[0];if(gem)target=gem;
  const want=new Set();if(Math.abs(target.x-s.p.x)>12)want.add(target.x>s.p.x?'d':'a');if(Math.abs(target.y-s.p.y)>12)want.add(target.y>s.p.y?'s':'w');
  for(const k of held)if(!want.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
  if(s.p.ultCooldown<=0&&s.enemies.some(e=>e.boss||Math.hypot(e.x-s.p.x,e.y-s.p.y)<120))await page.keyboard.press('e');
  if(s.time>420)throw Error('Native diagnostic exceeded 7 game minutes');await page.waitForTimeout(180);
 }
 const report=await page.evaluate(()=>{const g=window.__survivor68.game;return {seed:g.seed,phase:g.phase,time:g.time,hp:g.player.hp,level:g.level,kills:g.kills,moves:g.moves,finalSpawned:g.finalSpawned};});
 assert(['won','dead'].includes(report.phase));assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/survivor68-native-end.png'});console.log(JSON.stringify({nativeOnly:true,report,errors},null,2));
}finally{await browser.close();}
