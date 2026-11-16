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

## November 16 follow-up: diagonal gestures and iPhone audio return

The user reproduced audio loss in iPhone Safari and Brave. These fixes target the
shared WebKit engine. The reference's current carousel/audio chunk was fetched
again and has the same SHA-256 listed above. A fresh REA load completed all 39
network transactions with no failures:
`ev_8136e27587fe90484ab9dadf31bb6c71c79df409b6d156a7d6358d51eef0b2a3`.
The capture was checkpointed at
`/tmp/portfolio-scroll-audio-2026-11-16-rea.json`.

| Question | Evidence and result |
| --- | --- |
| Why did diagonal swipes fail? | Before the fix, native Chromium touch at 390×650 produced `pointercancel`, 67px of intro vertical scroll, and zero carousel movement. The page and intro allowed native `pan-y`, so the browser took over before horizontal capture. Both now allow pinch zoom without single-finger native panning. |
| Why could the first wheel gesture fail? | The intro's overflow branch returned before carousel navigation. Removed that branch and the intro scroll container. The complete intro fits above the slider using a ResizeObserver; short landscape screens use two columns. |
| Does the reference categorically prohibit vertical scrolling? | No. Its shipped CSS also has `.intro-layer { touch-action: pan-y pinch-zoom; overflow-y: auto }`, and `eu()` yields to intro scrolling when it overflows. Its content fits normal viewports. The stricter no-scroll requirement is an intentional correction for our content, rather than a claim that those reference CSS rules solve this bug. Project detail/resume scrolling remains separate, matching the reference. |
| Can a swipe start on a project? | Reference `ep()` accepts touch starts on cards. Our handler excluded all anchors, including every card. Removed that exclusion; pointer capture and existing swipe suppression protect against accidental project opens. |
| Why was audio state alone insufficient? | Existing tests resumed an explicitly suspended context; they did not model a `running` context whose `currentTime` is frozen. WebKit reports this failure in [263627](https://bugs.webkit.org/show_bug.cgi?id=263627) and [276016](https://bugs.webkit.org/show_bug.cgi?id=276016). |
| What changed in audio recovery? | Preserve the reference's single activated graph. After gestures or foreground return, check clock progress once after 250ms. If frozen, suspend then resume the same graph; do not rebuild it. Observe state changes to catch OS suspension that arrives after foreground events. Cancel checks while hidden and on cleanup. An unresolved resume promise does not keep the recovery guard locked. |

Verification adds steep diagonal gestures after an initially vertical move at
three phone heights, swipes beginning on card links, zero vertical movement,
no accidental project opens, immediate wheel navigation from the intro, and
fitting every expanded experience row across seven viewport sizes. Audio unit
checks cover a frozen running clock, late suspension, rejected/pending resume,
context identity, closed-context replacement and listener/timer cleanup.
Chromium and desktop WebKit output probes verify nonzero synthesized samples
after normal restoration and the injected frozen-clock failure, retaining one
context. Build and existing navigation/history/menu tests pass.

These are source observations and controlled reproductions, not a physical
Safari/Brave app-switch recording. A real iPhone must still confirm OS-level
speaker output after switching apps or locking/unlocking the phone.
