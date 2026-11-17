// Run against npm run dev with playwright-core available via NODE_PATH.
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright-core');

(async () => {
  const engine = process.env.BROWSER === 'webkit' ? webkit : chromium;
  const browser = await engine.launch({
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
    ...(engine === chromium ? { args: ['--no-sandbox', '--disable-webgl'] } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 690 }, hasTouch: true, reducedMotion: 'reduce' });
    // Simulate Safari declining autoplay, including when a card becomes visible.
    await page.addInitScript(() => {
      window.blockPreviewPlayback = true;
      document.addEventListener('play', (e) => {
        if (window.blockPreviewPlayback && e.target.closest('.loop-video')) e.target.pause();
      }, true);
    });
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:5173');
    await page.waitForSelector('html[data-intro="done"] .slider');
    await page.locator('.slider-stop').nth(1).click();
    const card = page.locator('[data-card]').first();
    const play = card.getByRole('button', { name: 'Play Kareer preview' });
    await play.waitFor();
    for (const [width, height] of [[320, 568], [390, 690], [430, 932], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(() => {
        const r = document.querySelector('.card-media').getBoundingClientRect();
        return Math.abs(r.x + r.width / 2 - innerWidth / 2) < 0.3;
      });
      const mediaRect = await card.locator('.card-media').boundingBox();
      const playRect = await play.boundingBox();
      assert(Math.abs(playRect.x + playRect.width / 2 - mediaRect.x - mediaRect.width / 2) < 0.5, 'play button centered horizontally');
      assert(Math.abs(playRect.y + playRect.height / 2 - mediaRect.y - mediaRect.height / 2) < 0.5, 'play button centered vertically');
      console.log(`PASS ${engine.name()} ${width}x${height}: play button centered`);
    }
    await page.setViewportSize({ width: 390, height: 690 });
    await page.waitForTimeout(1000);
    await card.locator('video').evaluate((video) => {
      video.play = () => Promise.reject(new DOMException('Playback blocked', 'NotAllowedError'));
    });
    await play.click();
    await play.waitFor();
    assert.equal(await page.locator('.pv').count(), 0, 'play must not open the case study');
    await card.locator('video').evaluate((video) => { delete video.play; window.blockPreviewPlayback = false; });
    await play.focus();
    await page.keyboard.press('Enter');
    await play.waitFor({ state: 'detached' });
    assert.equal(await card.locator('video').evaluate((video) => video.paused), false, 'keyboard starts playback');
    assert.equal(await page.locator('.pv').count(), 0, 'keyboard play must not open the case study');
    await card.locator('video').evaluate((video) => video.pause());
    await play.waitFor();
    await play.click();
    await play.waitFor({ state: 'detached' });
    assert.equal(await card.locator('video').evaluate((video) => video.paused), false, 'tap starts playback');
    await card.locator('.card-title').click();
    await page.waitForSelector('.pv[data-phase="open"]');
    console.log('PASS: blocked playback remains retryable, pause restores button, keyboard/tap plays, card opens case study');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
