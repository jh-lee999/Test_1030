import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox']});
const root = process.argv[2] || 'http://127.0.0.1:4192', errors = [];
async function open(page) {
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(root + '/?test=1&seed=61');
  await page.waitForSelector('body[data-ready="true"]');
  await page.locator('#start').click(); await page.locator('[data-starter="echo"]').click();
  await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running'));
}
const state = page => page.evaluate(() => {const {time, ...g} = window.__poker58.game; return JSON.stringify(g);});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1100}}); await open(page);
  const before = await state(page);
  await page.evaluate(() => {window.originalCard = document.querySelector('[data-card]');});
  await page.locator('[data-card]').first().click();
  assert(await page.evaluate(() => window.originalCard === document.querySelector('[data-card]')), 'selection retains actual card node');
  assert(await page.evaluate(() => window.originalCard.getAnimations().length > 0), 'selection has a real transition');
  await page.locator('[data-card]').first().click(); assert.equal(await state(page), before);
  await page.locator('#select-all').click();
  assert(await page.evaluate(() => document.querySelector('#select-all').getAnimations().length > 0), 'button click has feedback');
  await page.screenshot({path: '/tmp/poker64-desktop.png'});
  await page.locator('#discard').click();
  assert.equal(await page.evaluate(() => window.__poker58.game.discards), 2);
  assert.equal(await page.locator('#hand [data-card]').count(), 8);
  assert(await page.evaluate(() => document.querySelectorAll('.discard-ghost').length > 0), 'outgoing cards animate');
  assert(await page.evaluate(() => [...document.querySelectorAll('.discard-ghost')].every(e => e.inert && e.getAttribute('aria-hidden') === 'true' && getComputedStyle(e).pointerEvents === 'none')));
  const afterDiscard = await state(page);
  await page.waitForFunction(() => document.querySelectorAll('.discard-ghost').length === 0);
  assert.equal(await state(page), afterDiscard, 'animations cannot draw or change resources');
  await page.locator('#attack').click();
  assert.equal(await page.locator('#attack').getAttribute('aria-busy'), 'true');
  assert(await page.evaluate(() => document.querySelector('#attack').getAnimations().length > 0));
  await page.waitForFunction(() => window.__poker58.game.pending?.applied);
  assert.equal(await page.locator('#attack').innerText(), '적중! · ' + await page.evaluate(() => window.__poker58.game.pending.result.damage) + ' 피해');
  assert.equal(await page.locator('.combat-callout').count(), 0, 'do not duplicate existing canvas damage text');
  await page.screenshot({path: '/tmp/poker64-hit.png'});
  await page.waitForSelector('body[data-phase="pick"]');
  assert.equal(await page.locator('#attack').getAttribute('aria-busy'), 'false');
  assert.equal(await page.evaluate(() => window.__poker58.game.hands), 3);
  assert.equal(await page.evaluate(() => window.__poker58.game.discards), 3);
  await page.locator('#help').click();
  const paused = await state(page);
  await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running'));
  assert.equal(await state(page), paused, 'help freezes combat without action timers');
  await page.keyboard.press('Escape');
  // Changing OS preference cancels live UI motion, not just future animations.
  await page.locator('#select-all').click(); await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running'));
  assert.equal(await page.locator('.discard-ghost,.combat-callout').count(), 0);
  await page.close();
  const mobile = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, reducedMotion: 'reduce'}); await open(mobile);
  for (const width of [320, 390, 760, 844]) {
    await mobile.setViewportSize({width, height: 844}); await mobile.locator('#select-all').tap();
    assert.equal(await mobile.locator('#hand [aria-pressed="true"]').count(), 8);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.locator('#clear-selection').tap();
  }
  await mobile.setViewportSize({width: 390, height: 844}); await mobile.locator('#select-all').tap();
  await mobile.screenshot({path: '/tmp/poker64-mobile.png'}); await mobile.locator('#discard').tap();
  assert.equal(await mobile.evaluate(() => window.__poker58.game.discards), 2);
  assert.equal(await mobile.locator('.discard-ghost').count(), 0);
  assert.equal(await mobile.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
  await mobile.locator('#attack').tap(); await mobile.waitForSelector('body[data-phase="pick"]');
  assert.equal(await mobile.locator('.combat-callout').count(), 0);
  assert.equal(await mobile.evaluate(() => window.__poker58.game.attacks), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({buttonFeedback: true,stableCardNodes: true,selectionTransition: true,discardAndDeal: true,actualImpactDamage: true,noAnimationGameWrites: true,pause: true,reducedMotionAndLiveChange: true,mobileWidths: [320,390,760,844],errors}, null, 2));
} finally {await browser.close();}
