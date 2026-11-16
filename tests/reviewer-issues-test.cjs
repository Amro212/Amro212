const assert = require('node:assert/strict');
const { chromium } = require('/workspace/kareer/node_modules/playwright-core');

const baseURL = 'http://127.0.0.1:5173';
const chromePath = '/usr/bin/google-chrome';

async function run() {
  console.log('--- STARTING REVIEWER ISSUES VERIFICATION ---');
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('Browser console error:', msg.text());
  });

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-intro="done"] .slider');

  // Jump to project 0 (Kareer)
  const rail = await page.locator('.slider-rail').boundingBox();
  await page.mouse.click(rail.x + (rail.width * 1) / 4, rail.y + rail.height / 2);
  await page.waitForTimeout(300);

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Escape during opening flight (Issue 1)
  // ─────────────────────────────────────────────────────────────
  console.log('Testing Issue 1: Escape pressed during opening flight (200ms in)...');
  const firstCard = page.locator('[data-card]').nth(0);
  await firstCard.click();

  // Verify opening phase has started
  await page.waitForSelector('.pv[data-phase="opening"]');
  console.log('  -> Project viewer is in data-phase="opening"');

  // Wait 200ms (well within the 1050ms opening flight) and press Escape
  await page.waitForTimeout(200);
  console.log('  -> Pressing Escape at 200ms mid-flight...');
  await page.keyboard.press('Escape');

  // The dialog should complete its accelerated flight and close
  await page.waitForSelector('.pv', { state: 'detached', timeout: 5000 });
  const urlAfterEscape = new URL(page.url()).pathname;
  assert.equal(urlAfterEscape, '/', 'URL should be restored to /');

  // Verify focus returned to card
  const focusedTag = await page.evaluate(() => document.activeElement?.getAttribute('data-card'));
  assert.notEqual(focusedTag, null, 'Active element should be the project card');
  console.log('PASS Issue 1 (Escape during opening): modal detached, URL is /, card focused.');

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Browser Back during opening flight (Issue 1 variant)
  // ─────────────────────────────────────────────────────────────
  console.log('Testing Issue 1: Browser Back during opening flight (180ms in)...');
  await firstCard.click();
  await page.waitForSelector('.pv[data-phase="opening"]');
  await page.waitForTimeout(180);
  console.log('  -> Navigating Back at 180ms mid-flight...');
  await page.goBack();

  await page.waitForSelector('.pv', { state: 'detached', timeout: 5000 });
  assert.equal(new URL(page.url()).pathname, '/');
  console.log('PASS Issue 1 (Back during opening): modal detached, URL is /.');

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Back then Forward within closing window (Issue 2)
  // ─────────────────────────────────────────────────────────────
  console.log('Testing Issue 2: Back then Forward within 950ms closing window...');
  await firstCard.click();
  // Wait until fully open
  await page.waitForSelector('.pv[data-phase="open"]', { timeout: 4000 });
  console.log('  -> Project viewer fully opened.');
  assert.equal(new URL(page.url()).pathname, '/projects/kareer');

  // Navigate Back (starts 950ms closing animation)
  console.log('  -> Navigating Back to initiate closing...');
  await page.goBack();
  await page.waitForSelector('.pv[data-phase="closing"]');
  console.log('  -> Project viewer is now in data-phase="closing"');

  // Wait 150ms (well within the 950ms closing window) and navigate Forward
  await page.waitForTimeout(150);
  console.log('  -> Navigating Forward at 150ms while closing is in-flight...');
  await page.goForward();

  // Wait for it to complete opening and reach 'open' phase
  console.log('  -> Waiting for viewer to finish opening and enter data-phase="open"...');
  await page.waitForSelector('.pv[data-phase="open"]', { timeout: 6000 });

  // Assert viewer is STILL open and NOT dismissed
  const pvExists = await page.evaluate(() => Boolean(document.querySelector('.pv')));
  assert.equal(pvExists, true, 'Project viewer must NOT be dismissed when history reopens');

  const currentPhase = await page.evaluate(() => document.querySelector('.pv')?.getAttribute('data-phase'));
  assert.equal(currentPhase, 'open', 'Project viewer should be in data-phase="open"');
  assert.equal(new URL(page.url()).pathname, '/projects/kareer', 'URL must remain at /projects/kareer');
  console.log('PASS Issue 2: Viewer remained open at /projects/kareer, stale close invalidated.');

  // Now close cleanly with Escape to verify standard exit still works
  console.log('  -> Testing final Escape closure on reopened viewer...');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.pv', { state: 'detached', timeout: 5000 });
  assert.equal(new URL(page.url()).pathname, '/');
  console.log('PASS Final Escape closure: detached cleanly.');

  await browser.close();
  console.log('--- ALL REVIEWER ISSUE TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
