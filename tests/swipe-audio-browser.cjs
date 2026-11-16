// Requires playwright-core and installed Chromium/WebKit browsers.
// Chromium uses native touch; WebKit uses a slider pointer drag, not physical iOS.
const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright-core');
async function instrumentation() {
  window.audioProbe = { contexts: [], peak: 0, bursts: 0 };
  const AC = window.AudioContext;
  window.AudioContext = new Proxy(AC, { construct(T, args) {
    const t = new T(...args); audioProbe.contexts.push(t);
    const create = t.createDynamicsCompressor.bind(t);
    t.createDynamicsCompressor = () => {
      const node = create(), connect = node.connect.bind(node), analyser = t.createAnalyser();
      analyser.fftSize = 256;
      node.connect = (out) => { connect(analyser); analyser.connect(out); };
      const data = new Float32Array(analyser.fftSize);
      setInterval(() => { analyser.getFloatTimeDomainData(data); for (const v of data) audioProbe.peak = Math.max(audioProbe.peak, Math.abs(v)); }, 5);
      return node;
    };
    const source = t.createBufferSource.bind(t);
    t.createBufferSource = () => { const s=source(), start=s.start.bind(s); s.start=(...args)=>{if(s.buffer?.length>1 && !s.loop) audioProbe.bursts++;return start(...args)};return s;};
    return t;
  }});
  // Omit background GPU work; this test measures carousel audio, not pond rendering.
  const context = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : context.call(this, type, ...args); };
}
(async()=>{for(const engine of ['chromium','webkit']) {
 const b = await (engine==='chromium'?chromium.launch({...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args:['--no-sandbox']}):webkit.launch());
 try{const c=await b.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844},reducedMotion:'no-preference'});await c.addInitScript(instrumentation);const p=await c.newPage();await p.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});await p.waitForSelector('html[data-intro="done"] .slider');assert.equal(await p.locator('.enable-sound').count(),0);await p.mouse.click(300,80);
 async function read(){return p.evaluate(()=>({peak:audioProbe.peak,bursts:audioProbe.bursts,state:audioProbe.contexts.at(-1)?.state,contact:document.querySelector('.contact-head').getAttribute('aria-expanded')}))}
 async function swipe(){if(engine==='chromium'){const session=await c.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:350}]});for(const x of [280,230,180,130,80]){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:350}]});await p.waitForTimeout(40)}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();}else{const r=await p.locator('.slider-rail').boundingBox();await p.mouse.move(r.x+2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width*.65,r.y+r.height/2,{steps:10});await p.mouse.up();}await p.waitForTimeout(1000)}
 await swipe();let result=await read();assert(result.peak>0.0001 && result.bursts>0,JSON.stringify(result));assert.equal(result.contact,'false');console.log(engine,'first navigation output',result);
 await p.evaluate(async()=>{await audioProbe.contexts[0].suspend();window.dispatchEvent(new Event('pageshow'));audioProbe.peak=0;audioProbe.bursts=0});await p.waitForTimeout(100);await swipe();result=await read();assert(result.peak>0.0001&&result.bursts>0,JSON.stringify(result));assert.equal(result.contact,'false');assert.equal(await p.evaluate(()=>audioProbe.contexts.length),1,'the activated audio graph survives restoration');console.log(engine,'restored navigation output',result);
 }finally{await b.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
