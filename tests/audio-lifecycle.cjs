const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

class Events {
  listeners = new Map();
  addEventListener(type, fn, options) {
    const entries = this.listeners.get(type) || [];
    entries.push({ fn, capture: options === true || !!options?.capture });
    this.listeners.set(type, entries);
  }
  removeEventListener(type, fn, capture) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry.fn !== fn || entry.capture !== !!capture));
  }
  emit(type, stopped = false) {
    for (const entry of this.listeners.get(type) || []) if (!stopped || entry.capture) entry.fn();
  }
}
const contexts = [];
let allowed = false;
let rejectResume = false;
let pendingResume = false;
let envelopes = 0;
let now = 0;
const timers = new Map();
let timerId = 0;
async function advance() {
  now += 300;
  const pending = [...timers.values()];
  timers.clear();
  for (const fn of pending) fn();
  await new Promise(setImmediate);
}
const param = () => ({ value: 0, setTargetAtTime() { envelopes++; }, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ gain: param(), frequency: param(), pan: param(), Q: param(), threshold: param(), playbackRate: param(), connect() {}, disconnect() {}, start() {}, stop() {} });
class Context extends Events {
  state = 'suspended';
  sampleRate = 8000;
  stalled = false;
  get currentTime() { return this.state === 'running' && !this.stalled ? now / 1000 : 0; }
  destination = node();
  constructor() { super(); contexts.push(this); }
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: (ch) => data[ch] };
  }
  createGain = node;
  createDynamicsCompressor = node;
  createConvolver = node;
  createBufferSource = node;
  createBiquadFilter = node;
  createStereoPanner = node;
  resume() {
    if (rejectResume) return Promise.reject(new Error('NotAllowedError'));
    if (pendingResume) return new Promise(() => {});
    if (allowed) this.state = 'running';
    return Promise.resolve();
  }
  suspend() { this.stalled = false; this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
const window = new Events();
window.AudioContext = Context;
const document = new Events();
document.hidden = false;
window.setTimeout = (fn) => { timers.set(++timerId, fn); return timerId; };
window.clearTimeout = (id) => timers.delete(id);
const sandbox = { exports: {}, require: () => ({ QUACK_MP3: '' }), window, document, navigator: {}, performance: { now: () => now }, fetch: () => Promise.reject(new Error('offline')) };
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../src/audio.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(compiled, sandbox);
const audio = sandbox.exports;
(async () => {
  const remove = audio.installAudioUnlock();
  window.emit('focus');
  window.emit('pageshow');
  assert.equal(contexts.length, 0);
  window.emit('touchstart', true);
  const activated = contexts[0];
  assert.equal(audio.audioState(), 'suspended');
  allowed = true;
  window.emit('click', true);
  assert.equal(audio.audioState(), 'running');
  audio.scrollAmbience(800);
  assert(envelopes > 0);
  for (const state of ['interrupted', 'running', 'suspended']) {
    activated.state = state;
    document.hidden = true;
    document.emit('visibilitychange');
    document.hidden = false;
    document.emit('visibilitychange');
    window.emit('pageshow');
    window.emit('focus');
    window.emit('touchstart', true);
    assert.equal(contexts.length, 1, 'returning must preserve the originally activated graph');
    assert.equal(contexts[0], activated);
    assert.equal(audio.audioState(), 'running');
    await advance();
  }
  // WebKit can report running while its clock stays frozen; resume alone is a no-op.
  document.hidden = true;
  document.emit('visibilitychange');
  activated.stalled = true;
  document.hidden = false;
  document.emit('visibilitychange');
  window.emit('pageshow');
  window.emit('focus');
  await advance();
  assert.equal(activated.stalled, false, 'a frozen running context recovers without a reload or another tap');
  assert.equal(contexts.length, 1, 'clock recovery preserves the activated graph');
  // The OS may suspend audio after visibilitychange/pageshow/focus have already fired.
  activated.state = 'suspended';
  activated.emit('statechange');
  assert.equal(audio.audioState(), 'running', 'late suspension recovers while visible');
  pendingResume = true;
  activated.stalled = true;
  window.emit('pageshow');
  await advance();
  pendingResume = false;
  window.emit('touchstart');
  await advance();
  activated.stalled = true;
  window.emit('pageshow');
  await advance();
  assert.equal(activated.stalled, false, 'an unresolved resume must not lock out later recovery');
  activated.state = 'closed';
  window.emit('touchstart', true);
  assert.equal(contexts.length, 2, 'only a genuinely closed graph is replaced');
  contexts.at(-1).state = 'suspended';
  rejectResume = true;
  window.emit('click');
  await new Promise(setImmediate);
  rejectResume = false;
  window.emit('touchstart');
  assert.equal(audio.audioState(), 'running');
  remove();
  for (const target of [window, document, ...contexts]) assert([...target.listeners.values()].every((entries) => entries.length === 0));
  assert.equal(timers.size, 0);
  const removeAgain = audio.installAudioUnlock();
  assert.equal(window.listeners.get('touchstart').length, 1);
  removeAgain();
  console.log('PASS: same-graph restoration, frozen running clock, late suspension, closed recovery, rejected retry, cleanup');
})().catch((error) => { console.error(error); process.exitCode = 1; });
