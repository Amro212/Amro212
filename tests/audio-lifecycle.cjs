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
const sources = [];
let allowed = false;
let rejectResume = false;
let envelopes = 0;
const param = () => ({ value: 0, setTargetAtTime() { envelopes++; }, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ gain: param(), frequency: param(), pan: param(), Q: param(), threshold: param(), playbackRate: param(), connect() {}, disconnect() {}, start() {}, stop() {} });
class Context {
  state = 'suspended';
  sampleRate = 8000;
  currentTime = 0;
  destination = node();
  silentFrames = 0;
  constructor() { contexts.push(this); }
  createBuffer(channels, length) {
    if (length === 1) this.silentFrames++;
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: (ch) => data[ch] };
  }
  createGain = node;
  createDynamicsCompressor = node;
  createConvolver = node;
  createBufferSource() { const source = node(); sources.push(source); return source; }
  createBiquadFilter = node;
  createStereoPanner = node;
  resume() {
    if (rejectResume) return Promise.reject(new Error('NotAllowedError'));
    if (allowed) this.state = 'running';
    return Promise.resolve();
  }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
const window = new Events();
window.AudioContext = Context;
const document = new Events();
document.hidden = false;
const sandbox = { exports: {}, require: () => ({ QUACK_MP3: '' }), window, document, navigator: {}, performance: { now: () => 100 }, fetch: () => Promise.reject(new Error('offline')) };
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../src/audio.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(compiled, sandbox);
const audio = sandbox.exports;
(async () => {
  let notifications = 0;
  const unsubscribe = audio.subscribeAudioState(() => notifications++);
  const remove = audio.installAudioUnlock();
  assert.equal(audio.isAudioReady(), false);
  window.emit('focus');
  window.emit('pageshow');
  assert.equal(contexts.length, 0, 'no unsolicited audio before interaction');
  window.emit('wheel');
  assert.equal(audio.audioState(), 'suspended', 'wheel alone cannot bypass autoplay');
  audio.scrollAmbience(800);
  assert.equal(envelopes, 0, 'no queued scroll sounds while blocked');
  allowed = true;
  contexts[0].state = 'running'; // Safari may report running before gesture-based output unlock.
  const framesBeforeSwipe = contexts[0].silentFrames;
  window.emit('touchstart', true);
  assert(contexts[0].silentFrames > framesBeforeSwipe, 'a running state must not skip gesture output priming');
  assert.equal(audio.audioState(), 'running', 'capture unlocks the first swipe even if bubbling stops');
  assert(contexts[0].silentFrames > 0);
  const primer = sources.at(-1);
  assert.equal(audio.isAudioReady(), false, "running is not yet confirmed output");
  primer.onended();
  assert.equal(audio.isAudioReady(), true);
  assert(notifications > 0);
  const framesAfterPlayback = contexts[0].silentFrames;
  window.emit('touchend', true);
  assert.equal(contexts[0].silentFrames, framesAfterPlayback, 'confirmed output does not re-prime on every event');
  audio.scrollAmbience(800);
  assert(envelopes > 0);
  for (const state of ['interrupted', 'running', 'suspended']) {
    const old = contexts.at(-1);
    old.state = state; // "running" models Safari's silent/frozen output.
    document.hidden = true;
    document.emit('visibilitychange');
    document.hidden = false;
    document.emit('visibilitychange');
    assert.equal(old.state, 'closed');
    assert.notEqual(contexts.at(-1), old);
    assert.equal(audio.audioState(), 'running', `${state} recovers on return without reload`);
    assert.equal(audio.isAudioReady(), false, "the enable-sound control returns for a new graph");
    primer.onended(); // A late callback from the old graph cannot unlock its replacement.
    const framesBeforeReturnSwipe = contexts.at(-1).silentFrames;
    window.emit('touchstart', true);
    assert(contexts.at(-1).silentFrames > framesBeforeReturnSwipe, 'the first swipe after return primes the replacement output');
    const count = contexts.length;
    window.emit('focus');
    window.emit('pageshow');
    assert.equal(contexts.length, count, 'one replacement per background visit');
  }
  const old = contexts.at(-1);
  window.emit('pagehide');
  window.emit('pageshow');
  assert.equal(old.state, 'closed', 'BFCache restore also replaces stale audio');
  contexts.at(-1).state = 'interrupted';
  window.emit('click', true);
  assert.equal(audio.audioState(), 'running', 'any captured tap recovers late interruptions');
  contexts.at(-1).state = 'closed';
  window.emit('keydown');
  assert.equal(audio.audioState(), 'running', 'closed contexts rebuild');
  contexts.at(-1).state = 'suspended';
  rejectResume = true;
  window.emit('click');
  await new Promise(setImmediate);
  rejectResume = false;
  window.emit('click');
  assert.equal(audio.audioState(), 'running', 'resume rejection does not prevent the next gesture');
  remove();
  for (const target of [window, document]) assert([...target.listeners.values()].every((entries) => entries.length === 0), 'cleanup removes every listener');
  const removeAgain = audio.installAudioUnlock();
  assert.equal(window.listeners.get('touchstart').length, 1, 'StrictMode remount has one handler');
  removeAgain();
  unsubscribe();
  console.log('PASS: first swipe/tap, autoplay blocking, suspended/interrupted/frozen/closed recovery, BFCache, rejection retry, and listener cleanup');
})().catch((error) => { console.error(error); process.exitCode = 1; });
