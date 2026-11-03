import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[],external=[];
const phase=(page,name)=>page.waitForSelector(`body[data-phase="${name}"]`);
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(root)&&!r.url().startsWith('data:'))external.push(r.url());});};
async function ready(page){watch(page);await page.goto(root+'/side-scroll47.html?test=1&path=classic&seed=MARKET-41');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start-button').click();await phase(page,'playing');}
async function merchant(page){await page.evaluate(()=>{const a=window.__platformer37,g=a.game;g.room.enemies.forEach(e=>e.hp=0);g.room.cleared=g.room.rewardTaken=true;Object.assign(g.player,{x:g.room.merchant.x,y:g.room.merchant.y,vx:0,vy:0,grounded:true});g.coins=200;g.stats.hp=20;g.room.shop={stock:[{id:'lower_book',sold:false,sale:true},{id:'lower_book',sold:false},{id:'lower_book',sold:false}],rerolls:0};});}
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});await ready(page);
  await page.keyboard.press('b');assert.equal(await page.evaluate(()=>window.__platformer37.game.phase),'playing');
  await merchant(page);await page.waitForTimeout(650);await page.screenshot({path:'/tmp/market41-stall.png'});await page.keyboard.press('f');await phase(page,'shop');
  const time=await page.evaluate(()=>window.__platformer37.game.time);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__platformer37.game.time),time);
  assert.match(await page.locator('#shop-cards .reward-card').first().innerText(),/25% 특가/);
  for(let i=0;i<3;i++)await page.locator('#shop-cards .reward-card').nth(i).click();
  assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.inventory.lower_book),3);assert.equal(await page.evaluate(()=>window.__platformer37.game.coins),134);assert.match(await page.locator('#shop-coins').innerText(),/할인권 1장/);
  await page.locator('#shop-heal').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.hp),47);assert.equal(await page.locator('#shop-heal').isDisabled(),true);
  await page.locator('#shop-bag').click();assert.equal(await page.locator('#shop-bag').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.itemsTaken),4);assert.equal(await page.evaluate(()=>window.__platformer37.game.coins),104);
  await page.locator('#shop-reroll').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.coins),94);assert.match(await page.locator('#shop-reroll').innerText(),/14 G/);
  await page.screenshot({path:'/tmp/market41-shop.png'});
  await page.locator('[data-shop-tab="sell"]').click();await page.locator('[data-sell="lower_book"]').click();assert.match(await page.locator('#sell-description').innerText(),/×3 → ×2/);assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.inventory.lower_book),3);
  await page.locator('#sell-cancel').click();assert.equal(await page.locator('#sell-preview').isHidden(),true);await page.locator('[data-sell="lower_book"]').click();await page.locator('#sell-confirm').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.inventory.lower_book),2);assert.equal(await page.evaluate(()=>window.__platformer37.game.coins),102);
  await page.locator('[data-shop-tab="contracts"]').click();await page.locator('[data-contract="flawless"]').click();assert.equal(await page.locator('[data-contract="haste"]').isDisabled(),true);assert.match(await page.locator('#contract-status').innerText(),/다음 전투 대기/);await page.screenshot({path:'/tmp/market41-contract.png'});
  await page.keyboard.press('i');await phase(page,'build');assert.match(await page.locator('#build-contract').innerText(),/대기/);await page.keyboard.press('Escape');await phase(page,'shop');await page.keyboard.press('Escape');await phase(page,'playing');
  await page.evaluate(()=>{const g=window.__platformer37.game;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,vx:0,vy:0,grounded:true});});await page.keyboard.press('f');await phase(page,'route');
  const combat=await page.evaluate(()=>window.__platformer37.game.world.nodes.find(n=>n.depth===1&&n.type==='combat').id);await page.locator(`[data-node="${combat}"]`).click();await phase(page,'playing');assert.match(await page.locator('#contract-hud').innerText(),/체력 손실 없음/);
  await page.evaluate(()=>window.__platformer37.game.room.enemies.forEach(e=>e.hp=0));await phase(page,'reward');assert.match(await page.locator('#reward-info').innerText(),/말끔한 거래 성공/);assert.equal(await page.evaluate(()=>window.__platformer37.game.economy.contractsWon),1);assert.equal(await page.evaluate(()=>window.__platformer37.game.economy.coupons),2);
  // A dedicated shop route is optional even with an empty wallet.
  await page.evaluate(()=>window.__platformer37.start('MARKET-41'));await phase(page,'playing');
  await page.evaluate(()=>window.__platformer37.game.room.enemies.forEach(e=>e.hp=0));await phase(page,'reward');await page.locator('#reward-cards .reward-card').first().click();
  await page.evaluate(()=>{const g=window.__platformer37.game;g.coins=0;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,vx:0,vy:0,grounded:true});});await page.keyboard.press('f');await phase(page,'route');await page.screenshot({path:'/tmp/market41-map.png'});
  const shopNode=await page.evaluate(()=>window.__platformer37.game.world.nodes.find(n=>n.depth===1&&n.type==='shop').id);await page.locator(`[data-node="${shopNode}"]`).click();await phase(page,'playing');assert.equal(await page.evaluate(()=>window.__platformer37.game.room.type),'shop');assert.equal(await page.evaluate(()=>window.__platformer37.game.coins),0);
  await page.evaluate(()=>{const g=window.__platformer37.game;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,vx:0,vy:0,grounded:true});});await page.keyboard.press('f');await phase(page,'route');assert.equal(await page.evaluate(()=>window.__platformer37.game.room.shop),undefined);
  // Touch access, scrollability, sale confirmation and contract controls at all sizes.
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ready(mobile);await merchant(mobile);
  await mobile.locator('[data-control="interact"]').tap();await phase(mobile,'shop');
  for(const width of [320,390,844]){
    await mobile.setViewportSize({width,height:width===844?390:844});
    for(const tab of ['goods','sell','contracts']){await mobile.locator(`[data-shop-tab="${tab}"]`).tap();assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const panel=await mobile.locator('.market-panel').evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth}));assert.ok(panel.scroll<=panel.w+1);}
    const b=await mobile.locator('#shop-close').boundingBox();assert.ok(b.y>=0&&b.y+b.height<= (width===844?390:844));
  }
  await mobile.setViewportSize({width:390,height:844});await mobile.locator('[data-shop-tab="goods"]').tap();await mobile.locator('#shop-cards .reward-card').first().tap();await mobile.locator('[data-shop-tab="sell"]').tap();await mobile.locator('[data-sell="lower_book"]').tap();await mobile.locator('#sell-confirm').scrollIntoViewIfNeeded();await mobile.screenshot({path:'/tmp/market41-mobile-sale.png'});await mobile.locator('#sell-confirm').tap();assert.equal(await mobile.evaluate(()=>window.__platformer37.game.stats.inventory.lower_book),undefined);
  await mobile.locator('[data-shop-tab="contracts"]').tap();await mobile.locator('[data-contract="haste"]').tap();assert.equal(await mobile.evaluate(()=>window.__platformer37.game.contract.id),'haste');await mobile.locator('#shop-close').tap();await phase(mobile,'playing');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({physicalMerchant:true,discountsAndCoupon:true,salePreviewAndConfirmation:true,healingAndBag:true,contractAcceptedAndSettled:true,mobileWidths:[320,390,844],errors,externalRequests:external},null,2));
}finally{await browser.close();}
