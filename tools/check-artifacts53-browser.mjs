import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4187',errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(root+'/?test=1&seed=53');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();
 assert.equal(await page.locator('.relic-choice .original-note').count(),2);assert.equal(await page.locator('.relic-choice .source-note').count(),3);
 await page.locator('.relic-choice img').first().evaluate(img=>img.decode());await page.screenshot({path:'/tmp/artifacts53-draft.png'});
 await page.locator('[data-relic]').first().click();await page.waitForSelector('body[data-phase="pick"]');
 // Explicit full-inventory fixture, separate from genuine resource run in v52 check.
 await page.evaluate(async()=>{const {TRICKCAL_ARTIFACTS}=await import('./trickcal-artifacts.js?v=53');Object.assign(window.__dice52.game,{relics:Object.keys(TRICKCAL_ARTIFACTS),hp:18,shield:8,rage:3,maceHits:3,strikes:2,dice:[1,1,1,4,5],enemyHp:1000});});
 await page.waitForSelector('.relic-icon img');await page.locator('#relics img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));assert.equal(await page.locator('#relics img').count(),8);
 assert.equal(await page.locator('#artifact-state').innerText(),'분노 3/3 · 번개 2/3 · 참회 3/3 · 베개 위기 회복 준비');assert.match(await page.locator('#hp').innerText(),/방패 8/);
 await page.locator('[data-pattern="free"]').click();assert.match(await page.locator('#incoming').innerText(),/기절/);assert.match(await page.locator('#attack-effect').innerText(),/흡혈/);
 const before=await page.evaluate(()=>window.__dice52.game.hp);await page.locator('#attack').click();await page.evaluate(()=>{const a=window.__dice52;for(let i=0;i<300;i++)a.tick(a.game,1/120);});await page.waitForSelector('body[data-phase="pick"]');
 assert.ok(await page.evaluate(()=>window.__dice52.game.hp)>before);assert.equal(await page.evaluate(()=>window.__dice52.game.maceHits),0);await page.screenshot({path:'/tmp/artifacts53-table.png',fullPage:true});
 for(const width of [320,390,760,844]){await page.setViewportSize({width,height:width===844?390:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/artifacts53-mobile.png',fullPage:true});
 await page.evaluate(()=>window.__dice52.start('53'));await page.screenshot({path:'/tmp/artifacts53-draft-mobile.png'});await page.locator('[data-relic]').last().click();await page.waitForSelector('body[data-phase="pick"]');
 const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/trickcal-artifacts53/*.png',r=>r.abort());await fallback.goto(root+'/?test=1&seed=53');await fallback.waitForSelector('body[data-ready="true"]');await fallback.locator('#start').click();await fallback.locator('[data-relic]').first().click();await fallback.waitForSelector('body[data-phase="pick"]');await fallback.locator('#attack').click();assert.equal(await fallback.evaluate(()=>window.__dice52.game.attacks),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({originalIcons:8,sourceVsAdaptation:true,shieldAndCharges:true,stunAndLifestealFixture:true,widths:[320,390,760,844],missingArtifactFallback:true,errors},null,2));
}finally{await browser.close();}
