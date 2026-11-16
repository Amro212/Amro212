// Requires playwright-core. Run against npm run dev with CHROME_PATH if needed.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-sandbox', '--disable-webgl'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-intro="done"] .slider');
    const session = await context.newCDPSession(page);
    await page.evaluate(() => {
      window.cancelledSwipes = 0;
      document.querySelector('.page').addEventListener('pointercancel', () => window.cancelledSwipes++);
    });
    // Vertical movement first, then a steep diagonal: native pan-y used to cancel this.
    for (const height of [844, 650, 568]) {
      await page.setViewportSize({ width: 390, height });
      await page.locator('.slider-stop').first().click();
      await page.waitForFunction(() => Math.abs(new DOMMatrix(document.querySelector('.projects').style.transform).m41) < 0.1);
      const y = Math.min(420, height - 180);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 310, y }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 310, y: y - 15 }] });
      for (let i = 1; i <= 4; i++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 310 - i * 40, y: y - 15 - i * 55 }] });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const px = await page.locator('.projects').evaluate((el) => -new DOMMatrix(el.style.transform).m41);
        assert(Math.abs(px - i * 40) < 0.2, `diagonal swipe follows finger on first attempt: ${px}`);
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal(await page.evaluate(() => window.cancelledSwipes), 0, 'browser must not steal diagonal gestures');
      assert.equal(await page.locator('.intro-layer').evaluate((el) => el.scrollTop), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.slider-stop').first().click();
    await page.waitForFunction(() => Math.abs(new DOMMatrix(document.querySelector('.projects').style.transform).m41) < 0.1);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y: 350 }] });
    for (const x of [280, 230, 180, 130, 80]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 350 }] });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const px = await page.locator('.projects').evaluate((el) => -new DOMMatrix(el.style.transform).m41);
      assert(Math.abs(px - (330 - x)) < 0.2, `held track must follow finger directly: ${px} vs ${330 - x}`);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => {
      const index = Number(document.querySelector('.slider-stop[data-on]').textContent);
      const card = document.querySelectorAll('[data-card]')[index - 1];
      if (!card) return false;
      const rect = card.getBoundingClientRect();
      return Math.abs(rect.x + rect.width / 2 - innerWidth / 2) < 0.1;
    });
    await page.waitForTimeout(1200);
    // Start on the project's anchor itself, which must still accept a swipe.
    const card = await page.locator('[data-card]').first().boundingBox();
    const start = card.x + card.width / 2;
    const before = await page.locator('.projects').evaluate((el) => -new DOMMatrix(el.style.transform).m41);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y: 350 }] });
    for (const dx of [40, 80, 120]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start - dx, y: 350 + dx / 2 }] });
      await page.waitForTimeout(30);
    }
    const after = await page.locator('.projects').evaluate((el) => -new DOMMatrix(el.style.transform).m41);
    assert(Math.abs(after - before - 120) < 0.2, 'swipes starting on a project link follow the finger');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('.pv').count(), 0, 'swiping a card must not open it');
    const settledTrack = await page.locator('.projects').evaluate((el) => el.style.transform);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 350 }] });
    for (const y of [300, 250, 200]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.locator('.projects').evaluate((el) => el.style.transform), settledTrack, 'a vertical gesture must not move the track');
    assert.equal(await page.evaluate(() => scrollY), 0);
    assert.equal(await page.locator('.intro-layer').evaluate((el) => el.scrollTop), 0);
    const mobileBlur = await page.locator('.card-body').evaluateAll((els) => els.some((el) => el.style.filter));
    assert.equal(mobileBlur, false, 'no expensive card blur on coarse/mobile path');
    const writes = await page.evaluate(async () => {
      let count = 0;
      const observer = new MutationObserver((records) => { count += records.length; });
      for (const el of document.querySelectorAll('.projects, .slider-knob, .card-body')) observer.observe(el, { attributes: true, attributeFilter: ['style'] });
      await new Promise((resolve) => setTimeout(resolve, 500));
      observer.disconnect();
      return count;
    });
    assert.equal(writes, 0, 'settled carousel must stop frame/style work');
    console.log('PASS: diagonal swipes on first attempt, no vertical scroll/cancellation, card-link swipes, finger tracking, release centering, zero settled style writes');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
