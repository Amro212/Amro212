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
    console.log('PASS: native touch follows finger within 0.2px, release centers a card, no mobile blur, zero settled style writes');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
