const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { execSync } = require('node:child_process');

const baseURL = process.env.PORTFOLIO_URL || 'http://127.0.0.1:5173';
const ARTIFACT_DIR = '/home/antigravity/.gemini/antigravity-cli/brain/9f367683-ca4e-4989-85c1-adbf8af358ab/qa-recording';

fs.mkdirSync(path.join(ARTIFACT_DIR, 'desktop_raw'), { recursive: true });
fs.mkdirSync(path.join(ARTIFACT_DIR, 'mobile_raw'), { recursive: true });
fs.mkdirSync(path.join(ARTIFACT_DIR, 'frames'), { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('--- Starting Comprehensive Transition QA Session ---');
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-webgl'],
  });

  const edgeCaseMatrix = {
    typography: [],
    spacingSymmetry: [],
    touchTargets: [],
    ariaAttributes: [],
    horizontalOverflow: [],
    motionPacing: [],
  };

  try {
    // ==========================================
    // 1. DESKTOP QA SESSION (1440 x 900 @ 1x)
    // ==========================================
    console.log('\n>>> Starting Desktop QA Recording (1440x900 @ 1x)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      recordVideo: {
        dir: path.join(ARTIFACT_DIR, 'desktop_raw'),
        size: { width: 1440, height: 900 },
      },
    });

    const dPage = await desktopContext.newPage();
    await dPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await dPage.waitForSelector('html[data-intro="done"] .projects');
    await sleep(400); // let intro settle

    // Screenshot 1: Desktop Carousel at Rest
    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '01_desktop_carousel_rest.png') });
    console.log('Captured 01_desktop_carousel_rest.png');

    // TEST 1: Open Project 0 (Kareer) via Click
    console.log('Testing Project 0 (Kareer) opening transition...');
    const card0 = dPage.locator('[data-card]').nth(0);
    const card0Media = card0.locator('.card-media');
    const card0BoxInitial = await card0Media.boundingBox();

    // Click card to start 1050ms slow smooth transition
    await card0.click();

    // Sample mid-flight at ~400ms (during flyer flight)
    await sleep(400);
    const midFlightState = await dPage.evaluate(() => {
      const flyer = document.querySelector('.pv-flyer');
      const hero = document.querySelector('.pv-hero');
      const page = document.querySelector('.page');
      const html = document.documentElement;
      const flyerStyle = flyer ? getComputedStyle(flyer) : null;
      const pageStyle = page ? getComputedStyle(page) : null;
      return {
        hasProjectOpenAttr: html.dataset.project === 'open',
        hasProjectMotionAttr: html.hasAttribute('data-project-motion'),
        flyerVisibility: flyerStyle?.visibility,
        flyerTransform: flyerStyle?.transform,
        heroVisibility: hero ? getComputedStyle(hero).visibility : null,
        pageScale: pageStyle?.transform,
        pageFilter: pageStyle?.filter,
        pageOpacity: pageStyle?.opacity,
      };
    });

    console.log('Mid-flight Desktop sample:', midFlightState);
    assert.equal(midFlightState.hasProjectOpenAttr, true);
    assert.equal(midFlightState.flyerVisibility, 'visible');
    assert.equal(midFlightState.heroVisibility, 'hidden');

    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '02_desktop_opening_midflight.png') });
    console.log('Captured 02_desktop_opening_midflight.png');

    // Wait for flyer animation to complete (1050ms total + buffer)
    await sleep(800);

    const landedState = await dPage.evaluate(() => {
      const flyer = document.querySelector('.pv-flyer');
      const hero = document.querySelector('.pv-hero');
      const topbar = document.querySelector('.pv-topbar');
      const pv = document.querySelector('.pv');
      const heroRect = hero?.getBoundingClientRect();
      const heroComputed = hero ? getComputedStyle(hero) : null;
      const topbarComputed = topbar ? getComputedStyle(topbar) : null;
      return {
        phase: pv?.getAttribute('data-phase'),
        revealed: pv?.hasAttribute('data-revealed'),
        flyerLanded: flyer?.hasAttribute('data-landed'),
        flyerVisibility: flyer ? getComputedStyle(flyer).visibility : null,
        heroLanded: hero?.hasAttribute('data-landed'),
        heroVisibility: heroComputed?.visibility,
        topbarOpacity: topbarComputed?.opacity,
        topbarPointerEvents: topbarComputed?.pointerEvents,
        heroBox: heroRect ? { x: heroRect.x, y: heroRect.y, w: heroRect.width, h: heroRect.height } : null,
      };
    });

    console.log('Landed Desktop state:', landedState);
    assert.equal(landedState.phase, 'open');
    assert.equal(landedState.revealed, true);
    assert.equal(landedState.heroLanded, true);
    assert.equal(landedState.heroVisibility, 'visible');
    assert.equal(landedState.flyerVisibility, 'hidden');
    assert.equal(landedState.topbarOpacity, '1');

    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '03_desktop_landed_hero.png') });
    console.log('Captured 03_desktop_landed_hero.png');

    // Audit Edge Case Matrix for Project 0
    const edgeAudit = await dPage.evaluate(() => {
      const scroll = document.querySelector('.pv-scroll');
      const column = document.querySelector('.pv-column');
      const h1 = document.querySelector('.pv-head h1');
      const summary = document.querySelector('.pv-summary');
      const topbarBtn = document.querySelector('.pv-topbar button');
      const footBtn = document.querySelector('.pv-foot button');
      const h1Style = h1 ? getComputedStyle(h1) : null;
      const summaryStyle = summary ? getComputedStyle(summary) : null;
      const topbarBtnRect = topbarBtn?.getBoundingClientRect();
      const footBtnRect = footBtn?.getBoundingClientRect();
      const colRect = column?.getBoundingClientRect();

      return {
        h1Font: h1Style?.fontFamily,
        h1Size: h1Style?.fontSize,
        h1LineHeight: h1Style?.lineHeight,
        summaryFont: summaryStyle?.fontFamily,
        summarySize: summaryStyle?.fontSize,
        columnMarginLeft: colRect ? colRect.left : 0,
        columnMarginRight: colRect ? window.innerWidth - colRect.right : 0,
        topbarBtnTargetWidth: topbarBtnRect?.width,
        topbarBtnTargetHeight: topbarBtnRect?.height,
        footBtnTargetWidth: footBtnRect?.width,
        footBtnTargetHeight: footBtnRect?.height,
        scrollHasOverflow: scroll ? scroll.scrollWidth > scroll.clientWidth : false,
      };
    });

    edgeCaseMatrix.typography.push({
      element: 'pv-head h1 (Desktop)',
      fontFamily: edgeAudit.h1Font,
      fontSize: edgeAudit.h1Size,
      lineHeight: edgeAudit.h1LineHeight,
    });
    edgeCaseMatrix.spacingSymmetry.push({
      view: 'Desktop 1440x900',
      left: edgeAudit.columnMarginLeft,
      right: edgeAudit.columnMarginRight,
      symmetryDeltaPx: Math.abs(edgeAudit.columnMarginLeft - edgeAudit.columnMarginRight),
    });
    edgeCaseMatrix.touchTargets.push({
      button: 'pv-topbar close (Desktop)',
      width: edgeAudit.topbarBtnTargetWidth,
      height: edgeAudit.topbarBtnTargetHeight,
      wcagPass: edgeAudit.topbarBtnTargetHeight >= 44, // WCAG 2.5.8 target size / 2.5.5
    });
    edgeCaseMatrix.horizontalOverflow.push({
      view: 'Desktop 1440x900 Case Study',
      overflow: edgeAudit.scrollHasOverflow,
    });

    // Scroll through the case study article
    console.log('Scrolling through case study...');
    await dPage.evaluate(() => {
      const scroll = document.querySelector('.pv-scroll');
      if (scroll) scroll.scrollTop = 500;
    });
    await sleep(300);
    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '04_desktop_story_scrolled.png') });
    console.log('Captured 04_desktop_story_scrolled.png');

    await dPage.evaluate(() => {
      const scroll = document.querySelector('.pv-scroll');
      if (scroll) scroll.scrollTop = 0;
    });
    await sleep(200);

    // TEST 2: Close via Backdrop Click (clicking .pv-scroll outside .pv-column)
    console.log('Testing backdrop click close transition...');
    await dPage.mouse.click(100, 400); // click in left margin

    // Sample mid-closing flight at ~400ms (130ms delay + 270ms flight)
    await sleep(350);
    const midCloseState = await dPage.evaluate(() => {
      const flyer = document.querySelector('.pv-flyer');
      const hero = document.querySelector('.pv-hero');
      const page = document.querySelector('.page');
      const html = document.documentElement;
      const pv = document.querySelector('.pv');
      return {
        phase: pv?.getAttribute('data-phase'),
        htmlHasProject: html.hasAttribute('data-project'),
        flyerVisibility: flyer ? getComputedStyle(flyer).visibility : null,
        heroVisibility: hero ? getComputedStyle(hero).visibility : null,
        pageTransform: page ? getComputedStyle(page).transform : null,
      };
    });

    console.log('Mid-closing Desktop sample:', midCloseState);
    assert.equal(midCloseState.phase, 'closing');
    assert.equal(midCloseState.htmlHasProject, false); // .page starts unblurring immediately!
    assert.equal(midCloseState.flyerVisibility, 'visible');
    assert.equal(midCloseState.heroVisibility, 'hidden');

    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '05_desktop_closing_midflight.png') });
    console.log('Captured 05_desktop_closing_midflight.png');

    // Wait for closing flight to finish (820ms + 130ms delay = 950ms + buffer)
    await sleep(700);
    await dPage.waitForSelector('.pv', { state: 'detached' });

    const settledClosedState = await dPage.evaluate(() => {
      const html = document.documentElement;
      const card0 = document.querySelectorAll('[data-card]')[0];
      const media = card0?.querySelector('.card-media');
      return {
        htmlHasMotion: html.hasAttribute('data-project-motion'),
        mediaVisibility: media ? getComputedStyle(media).visibility : null,
        focusedIsCard: document.activeElement === card0,
      };
    });

    console.log('Settled Desktop closed state:', settledClosedState);
    assert.equal(settledClosedState.htmlHasMotion, false);
    assert.equal(settledClosedState.mediaVisibility, 'visible');
    assert.equal(settledClosedState.focusedIsCard, true);

    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '06_desktop_closed_restored.png') });
    console.log('Captured 06_desktop_closed_restored.png');

    // TEST 3: Keyboard Interaction (Tab, Enter, Escape)
    console.log('Testing Keyboard Navigation: Tab to card, Enter to open, Escape to close...');
    await dPage.keyboard.press('ArrowRight');
    await sleep(400);
    const card1 = dPage.locator('[data-card]').nth(1);
    await card1.focus();
    await dPage.keyboard.press('Enter');

    await dPage.waitForSelector('.pv[data-phase="open"]', { timeout: 3000 });
    console.log('Project 1 (Syllabus Sync) opened via Enter key.');
    await sleep(200);

    // Close via Escape key
    await dPage.keyboard.press('Escape');
    await dPage.waitForSelector('.pv', { state: 'detached', timeout: 3000 });
    console.log('Project 1 closed smoothly via Escape key.');
    await sleep(400);

    // TEST 4: Video Project 3 (LEGEND) Transition & Playback
    console.log('Testing Project 3 (LEGEND) Video Transition...');
    const card3 = dPage.locator('[data-card]').nth(3);
    await card3.click();

    await sleep(1200); // let transition complete
    const videoLanded = await dPage.evaluate(() => {
      const pv = document.querySelector('.pv');
      const video = document.querySelector('.pv-hero video');
      return {
        phase: pv?.getAttribute('data-phase'),
        hasVideo: !!video,
        videoSrc: video?.getAttribute('src'),
        isPaused: video?.paused,
      };
    });
    console.log('LEGEND Video state:', videoLanded);
    assert.equal(videoLanded.hasVideo, true);

    await dPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '07_desktop_legend_video.png') });
    console.log('Captured 07_desktop_legend_video.png');

    // Close via topbar close button
    const closeBtn = dPage.locator('.pv-topbar button');
    await closeBtn.click();
    await dPage.waitForSelector('.pv', { state: 'detached', timeout: 3000 });
    console.log('LEGEND closed smoothly.');

    await sleep(400);
    await dPage.close();
    await desktopContext.close();
    console.log('Desktop QA recording completed.');

    // ==========================================
    // 2. MOBILE QA SESSION (390 x 844 @ 3x, touch)
    // ==========================================
    console.log('\n>>> Starting Mobile QA Recording (390x844 @ 3x, Touch)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
      recordVideo: {
        dir: path.join(ARTIFACT_DIR, 'mobile_raw'),
        size: { width: 390, height: 844 },
      },
    });

    const mPage = await mobileContext.newPage();
    await mPage.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await mPage.waitForSelector('html[data-intro="done"] .projects');
    await sleep(400);

    await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '08_mobile_carousel_rest.png') });
    console.log('Captured 08_mobile_carousel_rest.png');

    // Tap on Project 0 (Kareer)
    console.log('Mobile: tapping Project 0 card...');
    const mCard0 = mPage.locator('[data-card]').nth(0);
    await mCard0.tap();

    // Sample mid-flight on mobile
    await sleep(400);
    await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '09_mobile_opening_midflight.png') });
    console.log('Captured 09_mobile_opening_midflight.png');

    await sleep(800); // let land
    await mPage.waitForSelector('.pv[data-phase="open"]');

    const mEdgeAudit = await mPage.evaluate(() => {
      const scroll = document.querySelector('.pv-scroll');
      const column = document.querySelector('.pv-column');
      const topbarBtn = document.querySelector('.pv-topbar button');
      const h1 = document.querySelector('.pv-head h1');
      const h1Style = h1 ? getComputedStyle(h1) : null;
      const topbarBtnRect = topbarBtn?.getBoundingClientRect();

      return {
        h1Font: h1Style?.fontFamily,
        h1Size: h1Style?.fontSize,
        h1LineHeight: h1Style?.lineHeight,
        columnWidth: column?.getBoundingClientRect().width,
        topbarBtnWidth: topbarBtnRect?.width,
        topbarBtnHeight: topbarBtnRect?.height,
        hasHorizontalOverflow: scroll ? scroll.scrollWidth > scroll.clientWidth : false,
      };
    });

    edgeCaseMatrix.typography.push({
      element: 'pv-head h1 (Mobile 390px)',
      fontFamily: mEdgeAudit.h1Font,
      fontSize: mEdgeAudit.h1Size,
      lineHeight: mEdgeAudit.h1LineHeight,
    });
    edgeCaseMatrix.touchTargets.push({
      button: 'pv-topbar close (Mobile)',
      width: mEdgeAudit.topbarBtnWidth,
      height: mEdgeAudit.topbarBtnHeight,
      wcagPass: mEdgeAudit.topbarBtnHeight >= 44,
    });
    edgeCaseMatrix.horizontalOverflow.push({
      view: 'Mobile 390x844 Case Study',
      overflow: mEdgeAudit.hasHorizontalOverflow,
    });

    await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '10_mobile_landed_hero.png') });
    console.log('Captured 10_mobile_landed_hero.png');

    // Scroll case study on mobile
    await mPage.evaluate(() => {
      const scroll = document.querySelector('.pv-scroll');
      if (scroll) scroll.scrollTop = 380;
    });
    await sleep(300);
    await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '11_mobile_story_scrolled.png') });
    console.log('Captured 11_mobile_story_scrolled.png');

    // Tap topbar close button
    console.log('Mobile: tapping close button...');
    const mCloseBtn = mPage.locator('.pv-topbar button');
    await mCloseBtn.tap();

    await sleep(350);
    await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '12_mobile_closing_midflight.png') });
    console.log('Captured 12_mobile_closing_midflight.png');

    await sleep(700);
    await mPage.waitForSelector('.pv', { state: 'detached', timeout: 3000 });

    await mPage.screenshot({ path: path.join(ARTIFACT_DIR, 'frames', '13_mobile_closed_restored.png') });
    console.log('Captured 13_mobile_closed_restored.png');

    await mPage.close();
    await mobileContext.close();
    console.log('Mobile QA recording completed.');

    // Save Edge Case Matrix JSON
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'edge_case_matrix.json'),
      JSON.stringify(edgeCaseMatrix, null, 2)
    );
    console.log('Saved edge_case_matrix.json');

  } finally {
    await browser.close();
  }

  // ==========================================
  // 3. VIDEO PROCESSING & TRANSCODING
  // ==========================================
  console.log('\n>>> Processing video files with ffmpeg...');
  const desktopVideos = fs.readdirSync(path.join(ARTIFACT_DIR, 'desktop_raw')).filter((f) => f.endsWith('.webm'));
  const mobileVideos = fs.readdirSync(path.join(ARTIFACT_DIR, 'mobile_raw')).filter((f) => f.endsWith('.webm'));

  if (desktopVideos.length > 0) {
    const rawDesktop = path.join(ARTIFACT_DIR, 'desktop_raw', desktopVideos[0]);
    const mp4Desktop = path.join(ARTIFACT_DIR, 'desktop_qa_session.mp4');
    const webmDesktop = path.join(ARTIFACT_DIR, 'desktop_qa_session.webm');
    fs.copyFileSync(rawDesktop, webmDesktop);
    console.log('Converting Desktop QA recording to MP4...');
    execSync(`ffmpeg -y -i "${rawDesktop}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${mp4Desktop}"`);
    console.log(`Saved: ${mp4Desktop}`);
  }

  if (mobileVideos.length > 0) {
    const rawMobile = path.join(ARTIFACT_DIR, 'mobile_raw', mobileVideos[0]);
    const mp4Mobile = path.join(ARTIFACT_DIR, 'mobile_qa_session.mp4');
    const webmMobile = path.join(ARTIFACT_DIR, 'mobile_qa_session.webm');
    fs.copyFileSync(rawMobile, webmMobile);
    console.log('Converting Mobile QA recording to MP4...');
    execSync(`ffmpeg -y -i "${rawMobile}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${mp4Mobile}"`);
    console.log(`Saved: ${mp4Mobile}`);
  }

  // Create an animated GIF showing the smooth slow transition
  console.log('Generating transition animation GIF...');
  const gifPath = path.join(ARTIFACT_DIR, 'smooth_transition_qa.gif');
  execSync(
    `ffmpeg -y -ss 00:00:01.8 -t 4.5 -i "${path.join(ARTIFACT_DIR, 'desktop_qa_session.mp4')}" -vf "fps=15,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gifPath}"`
  );
  console.log(`Saved: ${gifPath}`);

  console.log('\n--- QA Session Complete! All artifacts generated. ---');
})().catch((err) => {
  console.error('QA Harness Error:', err);
  process.exit(1);
});
