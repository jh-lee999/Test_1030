import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4188',errors=[];
async function open(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/dice57.html?test=1&seed=56');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();await page.locator('[data-relic="bell"]').click();await page.waitForSelector('body[data-phase="pick"]');}
async function expected(page){return page.evaluate(async()=>{const {strongestPattern}=await import('./dice-selection.js?v=57'),{PATTERNS}=await import('./dice-run-engine.js?v=56'),a=window.__dice55;return strongestPattern(Object.keys(PATTERNS).map(id=>a.evaluate(a.game,id)))?.id;});}
async function selected(page){return page.locator('.pattern.selected').getAttribute('data-pattern');}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await open(page);
 assert.equal(await selected(page),'pair');assert.equal(await page.locator('#preview-damage').innerText(),'96');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__dice55.game.attacks),0);await page.locator('#attack').click();assert.equal(await page.evaluate(()=>window.__dice55.game.lastResult.id),'pair');await page.waitForSelector('body[data-phase="pick"]');
 // Explicit hand fixture: valid free attack must not remain selected over a triple.
 await page.evaluate(()=>Object.assign(window.__dice55.game,{dice:[6,6,6,5,1],kept:Array(5).fill(false),held:Array(5).fill(false),relics:[],enemyHp:2000,turn:1,nudges:2,rerolls:2}));await page.waitForFunction(()=>document.querySelector('.pattern.selected')?.dataset.pattern==='kind');assert.equal(await selected(page),await expected(page));
 // Intentional weaker defense selection stays until the hand really changes.
 await page.locator('[data-pattern="free"]').click();await page.waitForTimeout(120);assert.equal(await selected(page),'free');await page.locator('[data-die="3"]').click();assert.equal(await selected(page),'free');await page.locator('#nudge-up').click();assert.equal(await selected(page),'kind');assert.equal(await page.locator('#preview-damage').innerText(),'300');assert.equal(await page.evaluate(()=>window.__dice55.game.attacks),1);await page.screenshot({path:'/tmp/dice57-auto-quad.png'});
 await page.locator('[data-pattern="free"]').click();await page.locator('#unhold').click();await page.locator('#reroll').click();await page.waitForSelector('body[data-phase="pick"]');assert.equal(await selected(page),await expected(page));
 // Boss repeat ban removes even the numerically biggest pattern from eligibility.
 await page.evaluate(async()=>{const {makeFoe}=await import('./dice-run-engine.js?v=56');Object.assign(window.__dice55.game,{phase:'pick',foe:makeFoe(5,3),stage:3,depth:5,dice:[6,6,6,6,6],lastPattern:'kind',enemyHp:1800,turn:1,training:{free:0,pair:0,kind:0,straight:0},rerolls:2,shield:0});});await page.waitForFunction(()=>document.querySelector('.pattern.selected')?.dataset.pattern==='pair');assert.equal(await page.locator('[data-pattern="kind"]').isDisabled(),true);await page.locator('#attack').click();assert.equal(await page.evaluate(()=>window.__dice55.game.lastResult.id),'pair');
 // A genuine no-legal-move state still exposes pass rather than an invalid shot.
 await page.evaluate(()=>Object.assign(window.__dice55.game,{phase:'pick',pending:null,action:null,dice:[1,2,3,4,6],lastPattern:'free',rerolls:0,nudges:0}));await page.waitForSelector('#pass:not([hidden])');assert.equal(await page.locator('#attack').isDisabled(),true);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await open(mobile);assert.equal(await selected(mobile),'pair');await mobile.locator('#attack').tap();assert.equal(await mobile.evaluate(()=>window.__dice55.game.lastResult.id),'pair');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({initialHighest:true,actualButtonThrowsHighest:true,editRecalculates:true,rerollRecalculates:true,manualDefenseUntilHandChanges:true,bossBanExcluded:true,noAutofire:true,noLegalMovePass:true,touch:true,errors},null,2));
}finally{await browser.close();}
