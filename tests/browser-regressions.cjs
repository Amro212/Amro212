// Run against `npm run dev` with playwright-core available via NODE_PATH.
// CHROME_PATH may select a system browser; otherwise use Playwright's Chromium.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const baseURL = process.env.PORTFOLIO_URL || 'http://127.0.0.1:5173';

async function settled(page, index) {
  await page.waitForFunction((i) => {
    const stop = document.querySelectorAll('.slider-stop')[i];
    const knob = document.querySelector('.slider-knob');
    if (!stop?.hasAttribute('data-on') || !knob) return false;
    const s = stop.getBoundingClientRect();
    const k = knob.getBoundingClientRect();
    if (Math.abs(k.left + k.width / 2 - s.left - s.width / 2) > 0.2) return false;
    if (!i) return true;
    const card = document.querySelectorAll('[data-card]')[i - 1].getBoundingClientRect();
    return Math.abs(card.left + card.width / 2 - innerWidth / 2) < 0.3;
  }, index, { timeout: 60000 }).catch(async (error) => {
    console.error('Failed stop', index, await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      selected: document.querySelector('.slider-stop[data-on]')?.textContent,
      knob: document.querySelector('.slider-knob')?.style.left,
      track: document.querySelector('.projects')?.style.transform,
      centers: [...document.querySelectorAll('[data-card]')].map((el) => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; }),
    })));
    throw error;
  });
}

async function jump(page, index) {
  await page.locator('.slider-stop').nth(index).click();
  await settled(page, index);
}

async function checkFooter(page) {
  const layer = page.locator('.intro-layer');
  const footer = page.locator('.tree-static').last();
  // Every screen fits the entire intro; native vertical panning stays disabled.
  await layer.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  assert.equal(await layer.evaluate((el) => el.scrollTop), 0, 'intro cannot scroll vertically');
  const f = await footer.boundingBox();
  const l = await layer.boundingBox();
  const s = await page.locator('.slider').boundingBox();
  assert(f.y >= l.y && f.y + f.height <= l.y + l.height, 'footer fully visible in fixed intro');
  assert(f.y + f.height <= s.y - 24, 'footer clears the slider');
}

(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ['--no-sandbox', '--disable-webgl'],
  });
  const newContext = async (options) => {
    const context = await browser.newContext(options);
    // This suite checks UI geometry/navigation. Pond GPU rendering has separate checks.
    await context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith('webgl') ? null : getContext.call(this, type, ...args);
      };
    });
    return context;
  };
  try {
    const context = await newContext({ reducedMotion: 'reduce' });
    context.setDefaultTimeout(30000);
    context.setDefaultNavigationTimeout(30000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-intro="done"] .slider');
    for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      for (let i = 0; i < 5; i++) await jump(page, i);
      // Resize while on the last project, then reverse direction.
      await page.setViewportSize({ width: 360, height: 640 });
      await settled(page, 4);
      await page.setViewportSize({ width, height });
      await settled(page, 4);
      await jump(page, 0);
      await checkFooter(page);
      for (let i = 0; i < 5; i++) {
        await page.locator('.tree-row').nth(i).evaluate((el) => el.click());
        await checkFooter(page);
      }
      console.log(`PASS ${width}x${height}: stops, card centering, resize, experience footer`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await jump(page, 0);
    // Vertical wheel input navigates immediately, including from a short intro.
    await page.setViewportSize({ width: 1024, height: 600 });
    const firstStep = await page.locator('[data-card]').first().evaluate((card) => {
      const r = card.getBoundingClientRect();
      return r.left + r.width / 2 - innerWidth / 2;
    });
    await page.mouse.move(512, 250);
    await page.mouse.wheel(0, firstStep);
    await settled(page, 1);
    const pitch = await page.locator('[data-card]').evaluateAll((cards) => cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left);
    await page.mouse.move(512, 250);
    await page.mouse.wheel(0, pitch);
    await settled(page, 2);
    await page.setViewportSize({ width: 1440, height: 900 });
    await jump(page, 0);
    // Scrubbing uses the same logical spacing as the stop labels.
    const rail = await page.locator('.slider-rail').boundingBox();
    for (const i of [1, 2, 3, 4]) {
      await page.mouse.click(rail.x + rail.width * i / 4, rail.y + rail.height / 2);
      await settled(page, i);
    }
    console.log('PASS mouse scrubbing');
    await jump(page, 1);
    await page.locator('[data-card]').nth(0).click();
    await page.waitForSelector('.pv');
    assert.equal(new URL(page.url()).pathname, '/projects/kareer');
    await page.goBack();
    await page.waitForSelector('.pv', { state: 'detached' });
    await page.goForward();
    await page.waitForSelector('.pv');
    assert.equal(new URL(page.url()).pathname, '/projects/kareer');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.pv', { state: 'detached' });
    await page.waitForURL(`${baseURL}/`);
    console.log('PASS history Back/Forward and Escape');
    // A fresh deep link closes locally without leaving the site or adding history.
    const deep = await context.newPage();
    await deep.goto(`${baseURL}/projects/sahara`, { waitUntil: 'domcontentloaded' });
    await deep.waitForSelector('.pv');
    const historyLength = await deep.evaluate(() => history.length);
    await deep.locator('.pv-topbar button').click();
    await deep.waitForSelector('.pv', { state: 'detached' });
    assert.equal(new URL(deep.url()).pathname, '/');
    assert.equal(await deep.evaluate(() => history.length), historyLength);
    await deep.close();
    for (const path of ['/project-previews/syllabus/syllabus1.png', '/project-previews/sahara/sahara1.png']) {
      const response = await page.evaluate(async (url) => {
        const result = await fetch(url);
        return { status: result.status, type: result.headers.get('content-type'), bytes: (await result.arrayBuffer()).byteLength };
      }, `${baseURL}${path}`);
      assert.equal(response.status, 200);
      assert.match(response.type, /image\/png/);
      assert(response.bytes > 1000);
    }
    assert.deepEqual(errors, []);
    console.log('PASS deep links and preview assets');
    await context.close();
    // Normal animations expose stale opening-phase dismissal closures.
    const animated = await newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'no-preference' });
    animated.setDefaultTimeout(30000);
    animated.setDefaultNavigationTimeout(30000);
    const menuPage = await animated.newPage();
    await menuPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await menuPage.waitForSelector('html[data-intro="done"] .contact');
    for (const action of ['escape', 'outside']) {
      await menuPage.locator('.contact-head').click();
      await menuPage.waitForSelector('.contact-cap[data-phase="open"]');
      if (action === 'escape') await menuPage.keyboard.press('Escape');
      else await menuPage.mouse.click(900, 100);
      await menuPage.waitForSelector('.contact-cap[data-phase="closed"]');
    }
    for (let i = 0; i < 5; i++) await jump(menuPage, i);
    await menuPage.keyboard.press('r');
    await menuPage.waitForSelector('html[data-resume="open"] .rs-window');
    // Wait for the page's scale transition before measuring during resize.
    await menuPage.waitForTimeout(550);
    await menuPage.setViewportSize({ width: 800, height: 600 });
    await menuPage.keyboard.press('Escape');
    await menuPage.waitForSelector('.rs-window', { state: 'detached' });
    await menuPage.waitForTimeout(550);
    await settled(menuPage, 4);
    console.log('PASS animated menu dismissal and stops');
    await animated.close();
    // Native touch input must snap to the same numbered stops.
    const touch = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    touch.setDefaultTimeout(30000);
    touch.setDefaultNavigationTimeout(30000);
    const touchPage = await touch.newPage();
    await touchPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await touchPage.waitForSelector('html[data-intro="done"] .slider');
    const cdp = await touch.newCDPSession(touchPage);
    const r = await touchPage.locator('.slider-rail').boundingBox();
    for (const index of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y + r.height / 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + r.width * index / 4, y: r.y + r.height / 2 }] });
      await touchPage.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await settled(touchPage, index);
      await jump(touchPage, 0);
    }
    await touch.close();
    console.log('PASS: mouse/touch scrubbing, history Back/Forward, direct links, preview assets, animated menu dismissal and alignment');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
