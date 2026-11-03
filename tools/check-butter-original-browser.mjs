import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4185';
try{
  const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(root+'/butter-2d-motion.html');await page.waitForSelector('body[data-ready="true"]');
  assert.equal(await page.locator('body').getAttribute('data-renderer'),'original36');
  const result=await page.evaluate(async()=>{
    const {BUTTER_ORIGINAL:meta}=await import('./butter-original-motion.js?v=36');
    let frames=0,minGutter=Infinity;const motionHashes={};
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
    for(const [key,c]of Object.entries(meta.clips)){
      const image=new Image();image.src=c.image;await image.decode();
      if(image.width!==c.width*c.columns||image.height!==c.height*c.rows)throw Error(key+': atlas dimensions');
      canvas.width=c.width;canvas.height=c.height;const hashes=new Set();
      for(let i=0;i<c.count;i++){
        ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(image,i%c.columns*c.width,Math.floor(i/c.columns)*c.height,c.width,c.height,0,0,c.width,c.height);
        const data=ctx.getImageData(0,0,c.width,c.height).data;let visible=0,hash=2166136261;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
          const p=(y*c.width+x)*4;if(data[p+3]<24)continue;visible++;
          const gutter=Math.min(x,y,c.width-1-x,c.height-1-y);minGutter=Math.min(gutter,minGutter);
          if(gutter<5)throw Error(`${key}/${i}: silhouette clips the cell`);
          hash=Math.imul(hash^data[p]^data[p+1]^data[p+2]^data[p+3],16777619);
        }
        if(visible<300)throw Error(`${key}/${i}: empty frame`);hashes.add(hash);frames++;
      }
      motionHashes[key]=hashes.size;if(hashes.size<8)throw Error(key+': not animated');
    }
    return {frames,minGutter,motionHashes};
  });console.log(result);
  const before=await page.locator('#stage').evaluate(c=>c.toDataURL());await page.waitForTimeout(170);
  assert.notEqual(await page.locator('#stage').evaluate(c=>c.toDataURL()),before);
  await page.locator('#play').click();const paused=await page.locator('#stage').getAttribute('data-frame');await page.waitForTimeout(120);assert.equal(await page.locator('#stage').getAttribute('data-frame'),paused);
  await page.locator('#step').click();assert.notEqual(await page.locator('#stage').getAttribute('data-frame'),paused);
  const walk=await page.locator('#phase').inputValue();await page.locator('#shot-phase').evaluate(e=>{e.value='.6';e.dispatchEvent(new Event('input'));});assert.equal(await page.locator('#phase').inputValue(),walk);
  for(const key of ['idle','walk','shoot','low','high','walkShoot']){await page.locator('#motion').selectOption(key);assert.match(await page.locator('#stage').getAttribute('data-frame'),new RegExp('^'+key+'/'));}
  await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});reduced.on('pageerror',e=>errors.push(String(e)));
  await reduced.goto(root+'/butter-2d-motion.html');await reduced.waitForSelector('body[data-ready="true"]');assert.equal(await reduced.locator('body').getAttribute('data-playing'),'false');await reduced.locator('#enable-motion').click();assert.equal(await reduced.locator('body').getAttribute('data-playing'),'true');await reduced.close();
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto(root+'/topdown36.html');await page.locator('#start-button').click();await page.waitForSelector('#game-canvas[data-butter-renderer="original36"]');
  await page.waitForFunction(()=>document.querySelector('#start-screen').classList.contains('hidden'));
  await page.keyboard.down('d');await page.keyboard.down('ArrowUp');await page.waitForTimeout(650);await page.keyboard.up('d');await page.keyboard.up('ArrowUp');await page.keyboard.press('e');await page.waitForTimeout(1000);
  await page.locator('#pause-button').click();await page.locator('#resume-button').click();
  assert.equal(requests.some(u=>/butter-2d3[2345]\//.test(u)),false,'rejected cutout assets loaded by game');
  await page.reload();await page.locator('[data-character="komi"]').click();await page.locator('#start-button').click();await page.waitForFunction(()=>document.querySelector('#start-screen').classList.contains('hidden'));await page.keyboard.press('q');
  const missing=await browser.newPage();missing.on('pageerror',e=>errors.push(String(e)));await missing.route('**/assets/butter-original36/*.webp',r=>r.abort());
  await missing.goto(root+'/butter-2d-motion.html');await missing.waitForSelector('body[data-ready="true"]');assert.match(await missing.locator('#status').innerText(),/불러오지 못해서/);
  await missing.goto(root+'/topdown36.html');await missing.locator('#start-button').click();await missing.waitForFunction(()=>document.querySelector('#start-screen').classList.contains('hidden'));await missing.keyboard.press('ArrowLeft');await missing.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({...result,playback:'passed',mobile:'passed',reducedMotion:'passed',gameStart:'Butter and Komi passed',optionalImageFailure:'passed',runtimeErrors:errors},null,2));
}finally{await browser.close();}
