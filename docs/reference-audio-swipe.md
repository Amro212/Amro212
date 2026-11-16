# Reference audio lifecycle and swipe mechanics

## Source and evidence

Compared https://www.designengineer.fyi/ with the portfolio. The live reference still serves `/_next/static/immutable/chunks/0ywo28f84jehr.js`, 115,930 bytes, SHA-256 `e2c5e083cbc2b2f68e0d9bd87e31135d25e5906d94528bfb5aa6304c057b43b4`, identical to the previously retained source.

REA records:
- `ev_6c1cfb2750b2dfe52ed0490103050fc0c2c466531fb8ccf0ab04c85f4e27b5d5`: fresh live reference navigation and network capture (39 successful transactions).
- `ev_d825c35f8b983993a3b35f5fcd482bfab3a43481c7bc1e5447180cd2b4e71bf7`: static JavaScript application analysis of the selected carousel/audio chunk. Its syntax parsed completely; the semantic graph is bounded and partial. Other chunks were not analyzed in this pass.
- `ev_85683ecbc8f05192c9541f28300bc264002d04ae0b1f7ec63437bc1726a8dd03`: REA executed reference load, slider ArrowRight navigation and settling. This is a controlled desktop replay, not an iPhone app switch.

Session checkpoint: `/tmp/portfolio-audio-swipe-rea.json` (outside the repository).

## Findings and corrections

| Question | Shipped-source observation | Correction |
| --- | --- | --- |
| Does the reference replace audio on foreground return? | Audio module 83847 (byte 74069) keeps one module-level context. Initializer at byte 74555 constructs once and resumes a suspended context. There are no context close/suspend calls in this chunk. | Removed the new readiness/primer/subscription system and Enable sound button. Preserve the activated graph on visibility/pageshow/focus; replace only a genuinely closed context. |
| How do later swipes resume sound? | Touch pointerdown `ep` invokes the initializer on every gesture, retaining the existing context. | Resume the same context from touch pointerdown and foreground return. Keep loop sounds gated while suspended to avoid queued sound bursts. |
| How does a held swipe move? | `ep` stores the actual current track position. `eh` captures the pointer after horizontal movement exceeds 8px and writes a target derived from finger displacement. The frame loop directly applies this position while held. | Use touch pointer capture and direct finger tracking rather than a spring chasing the finger. |
| How does release work? | Last 12 target-position samples, velocity from samples younger than 100ms, destination `target + .18 * velocity`, clamped and snapped to the nearest physical stop. Release velocity becomes track spring velocity. | Removed the one-slide distance/velocity threshold and restored the reference projection. |
| What are the numerical motion rules? | Edge resistance `excess * 160 * .55 / (160 + .55 * excess)`; track k=170/c=26; free knob k=420/c=41; Euler steps <=1/240s, frame delta <=1/30s. | Retained these values and the existing equal-number knob mapping. Cancellation safely snaps without throw momentum. |
| What work is avoided on mobile? | `(max-width:640px), (pointer:coarse)` skips per-card blur and dynamic light variables. DOM nodes and style values are cached; transforms use translate3d; settled carousel stops requesting frames. | Restored the inexpensive mobile card path, cached card/knob nodes and style writes, removed per-frame stop-set allocation, switched knob layout updates to transforms, and stopped idle carousel frames. Pond rendering remains independent. |

## Verification and limits

- Production build passes.
- `tests/audio-lifecycle.cjs` asserts context identity survives interrupted, suspended and running background/foreground transitions; closed-context recovery and listener cleanup also pass.
- `tests/swipe-audio-browser.cjs` performs one initial tap, then measures nonzero compressor-output samples and sound bursts during navigation before Contact is opened. After suspending and restoring, it repeats navigation without another tap and asserts exactly one context. Chromium uses native touch; desktop WebKit uses slider pointer dragging.
- `tests/touch-motion-browser.cjs` checks native touch tracking within 0.2px after frame presentation, release centering, absence of mobile card blur, and zero carousel style mutations during a settled 500ms window.

Static source establishes the reference algorithms; controlled browser probes establish the tested runtime results. Desktop WebKit is not physical iOS Safari. Simulated restoration does not reproduce every OS audio interruption. No physical-phone FPS number or exact full-site rendering parity is claimed; frame pacing on actual phones still requires device verification.
