# Reference interaction audit

Date: 2026-11-15. Branch: `redesign/designengineer-fyi`.
Reference: https://www.designengineer.fyi/ . Scope: fish appearance, unwanted ripple bursts, scroll sound, project dragging, landing entrance. The reference's computer/3D introduction is excluded.

## Current navigation policy (latest user clarification)

Wheel scrolling and the bottom slider both navigate projects. Direct card/page dragging remains disabled, and navigation never pauses the pond or film light. The user clarified that the bottom knob must retain its reference behavior; the earlier wheel-only slider policy and its inert-slider tests below are superseded.

Restored the reference slider's off-centre grab offset (within one knob width), 14px magnetic attraction with quadratic 0.7 strength, last-100ms pointer velocity from at most 12 samples, 120ms release projection and nearest measured project stop. The knob uses the reference held spring (k=1400, c=75) and free spring (k=420, c=41), with 1/240s substeps and the final remainder. The track keeps its existing k=170/c=26 spring while scrubbing. Stop labels now use the actual measured card centres and follow the knob's nearest stop. Keyboard directions match the reference; pointer capture, touch, blur/cancel recovery and accessible value updates are supported. Foreground input remains separate from the pond.

The live reference slider bundle was re-downloaded and SHA-256 matched the source recorded below. REA exercised a live reference track click: `ev_4fbc6f978fa3be559ded262d81245f2505b198af2f64dbf1d8cd3b0248ae87fd`. All declared actions completed; the event capture was incomplete, so this is not a complete execution trace. Checkpoint: `/tmp/portfolio-knob-rea-evidence-2026-11-15.json`.

Verification: `/tmp/verify-portfolio-knob-input.cjs` compares 33 actual component-handler scenarios against extracted reference handlers, including magnetic attraction, grab offset, velocity windows and release decisions. `/tmp/verify-portfolio-springs.cjs` compares 64 held/free, fractional-time, boundary and reduced-motion cases. `/tmp/portfolio-knob-browser-check.cjs` exercises the live reference and production local site, including track clicks, grabs, snapping, releases outside the rail, stop alignment and reference keyboard directions, plus local blur recovery, inert card dragging and mobile touch. `/tmp/portfolio-knob-pond-check.cjs` checks normal-motion dragging with real WebGL pond draws continuing while held. Build and whitespace validation pass. Earlier investigation records below remain historical evidence of the prior implementations.

## Follow-up entrance, fish-head and accessibility repairs

The fresh-load browser trace confirmed a second entrance: card/contact effective opacity reached about 0.91 during the page fade, then returned to 0 when `data-intro` became `done`. Removed those separate completion-triggered animations so both elements share the page fade. The signature now stays paused while the landing is hidden and uses a slower 2.2s wipe with a balanced easing curve. `/tmp/portfolio-intro-check.cjs --verify` records one landing reveal, one signature reveal after the hidden phase, monotonically increasing card/contact opacity, and reduced-motion behavior. Before/after captures are `/tmp/portfolio-intro-before.json` and `/tmp/portfolio-intro-after.json`.

The missing half-head was caused by spine self-overlap, not missing triangles: the port combined tailward vectors with a headward heading limit, placing the neck ahead of the head. Restored the reference's headward-angle constraint and backward segment placement. Earlier fish checks covered mesh attributes and pose upload; the new `/tmp/verify-portfolio-fish-head.cjs` also covers complete index buffers and spine reconstruction across 2,160 curved-spine frames and straight headings. A real software-WebGL render of five deterministic koi shows intact heads (`/tmp/portfolio-fish-heads-after.png`).

Removed the project-card accessible-name override so names include the visible title and company, including “AI Agent Builder Sense” and “Quote Builder Freshworks”. Changed the expandable experience list from an image role to a group, retaining its keyboard-focusable row controls. axe-core 4.14.0 checks the reported `label-content-name-mismatch` rule in the project states and WCAG 2 A/AA + 2.1 AA automated rules on the landing (`/tmp/portfolio-a11y-check.cjs --verify`). Automated checks do not establish complete accessibility conformance. Reports are `/tmp/portfolio-a11y-before.json` and `/tmp/portfolio-a11y-after.json`.

## Evidence index

REA was used for live scenario capture, network inventory, passive source inspection, screenshots, static pond-bundle analysis, and a local keyboard-navigation scenario. Source comparisons and fixes used ordinary repository tools.

| Evidence | Scope |
| --- | --- |
| `ev_c002bf58ffe4a0d2e2eb550d751f7c46c626e81374e679f62568b6ee9dffac73` | Reference initial navigation and network capture; 42 transactions, one still unfinished at capture end. |
| `ev_48433628661218f6e8dbbc1557e85a587af43f8683f6ca9c11d44c82b150ed5f` | Longer reference scenario with DOM, accessibility, network and screenshot; 57 transactions. The 3D intro was still present at this snapshot. |
| `ev_c37112d4abaf6a52dd676fe8988842eb78cfe26959dcbc3e682f8daf268328f9` | Passive reference inspection with loaded script sources. Prior network execution is outside its observation window. |
| `ev_50f39b7135d853f7b270626d03ba6af0691d4b7d5efc34805b0861dc8d2d0d2d` | Static analysis of the downloaded pond chunk; other inventoried bundles excluded from source analysis. Semantic graph is partial and bounded at 1,000 nodes/unknowns per file. |
| `ev_b0e70be1e5b31d2b65e12c60cc67258ff397a239ada4e79ac326eb5273fafdd8` | Reference landing screenshot after using its inspection-user-agent bypass for the excluded 3D intro. Confirms rendered koi/fry appearance; this does not observe normal intro timing. |
| `ev_999c6f71d5bf97c1edf9cdf08a36fca506b4f8877fb7829e80dab89952b9c024` | REA local scenario: load, press ArrowRight on the project slider, settle, capture accessibility. All actions completed. Reduced motion enabled. |

Complete session checkpoint: `/tmp/portfolio-rea-evidence-2026-11-15.json` (REA export, outside the repository). Original downloaded scripts: `/tmp/portfolio-reference/`. These paths are session artifacts; retain them separately if moving the investigation to another machine.

## Source identity

Reference chunk paths are relative to `https://www.designengineer.fyi/_next/static/immutable/chunks/`.

| Chunk | SHA-256 | Relevant module |
| --- | --- | --- |
| `0ywo28f84jehr.js` | `e2c5e083cbc2b2f68e0d9bd87e31135d25e5906d94528bfb5aa6304c057b43b4` | Audio `83847`, carousel integration and deferred pond loader `70367`. |
| `1dvth-ke6hh4n.js` | `2fdc00964db827812b1877bad569c8e0f11a489057fcb587c69fbb2b85b6218a` | Flat intro transition, including its final fade. |
| `3yq8kzo7w-hce.js` | `f712c4edd87ef76ff751ae407dc94fcceda3a804e9fa9cc497304f80da48c1b6` | Deferred pond geometry, shaders, simulation and input. |

## Findings and implementation

| Question | Evidence-backed finding | Change and status |
| --- | --- | --- |
| Why do fish look different? | Fish shaders match. The port supplied tailward spine tangents where the shader expects headward tangents, reversing tail extrusion and its lighting basis. It also differed in tail geometry/tint, body coat base, patch distributions and tail spring calculation. | Corrected the pose upload, original tail spring/phase, tail z/root tint, white sanke coat and rounded patch generation. Steering and swimming decisions retained. Answered through source comparison and rendered inspection. |
| Why do ripple bursts appear after tab changes? | The original port could mount twice: immediate mount followed by the intro-attribute mutation, leaking a renderer/RAF loop on one canvas. Window drag state could also survive a missed pointer release. These are source-supported causes; no captured trace proves which one caused a particular historical burst. | Guarded the mount; cancel/reset RAF, pending drops and input on hide; cancel stale drag on blur/leave/released buttons; reject secondary input; reset timing on resume. Restore water targets and resume correctly after WebGL context restoration. Answered and regression-tested. |
| Are all non-click ripples bugs? | The reference explicitly has fish wakes, fry ambient drops every 1.2–4s, koi drops every 7–14s, and six satellite drops/echoes around a click. Its wave shader matches the port. | Retained these intentional effects. No speculative shader rewrite. Answered from exact shipped source. |
| What produces the paper-like sound? | The reference synthesizes it with a seven-state pink-noise filter, separate 2.5s ambience/1.7s modulation buffers, filtered bursts and sine transients. The port used white noise for both loops. Its knob motion also differed. | Restored original noise/filter/envelope values. Restored knob spring target at the track destination, reference held/free spring constants, fixed 1/240s substeps with final remainder, boundary clamps, tick cooldown and reduced-motion handling. Answered numerically; physical-speaker listening remains unverified. |
| How should project dragging affect the background? | The reference pond excludes UI targets from pointer effects. The requested stronger still-background behavior is a product requirement. | Mark carousel gestures, pause pond simulation/rendering and film sweep while held, clear pending water input, resume without reviving a pond drag. Handle pointer cancellation, lost capture and blur on track/slider. Verified by unchanged WebGL draw count while held and resumed draws afterward. |
| How should the landing enter? | The reference ends its intro with a fade into its landing. Its complete intro centers on the excluded computer model. | Added a 900ms eased landing fade after font readiness (600ms maximum font wait), initialized before React paint. Reduced motion and direct project routes skip it. This duration is a deliberate adaptation, not a claim of exact full-intro parity. |

## Verification

- `npm run build`: passed. Existing warnings remain for an old gradient declaration, Browserslist data age and bundle size.
- `git diff --check`: passed.
- Actual Pond effect/input handler harness: single mount/disposal, primary input, hidden-queue clearing, stale-drag cancellation, carousel pause/resume, context loss and restoration, reduced-motion restoration and disposed-handler guards.
- Audio harness: 120,000 generated pink-noise samples exactly equal the extracted reference under the same random input; independent loop durations/rate, velocity gain and envelope assertions pass.
- Spring harness: 64 deterministic cases match the extracted reference solver, including fractional frame times, fast boundary reversals, both held states and reduced motion.
- Fish harness: exact shader/body/tail comparison, 120 pose/tail-spring frames, and 2,000 seeded koi coat/patch layouts match the extracted reference.
- Chromium browser checks: entrance states, desktop carousel drag, zero additional pond draws during hold, resumed draws on release, drag does not open a project, slider blur cancellation, return to Intro, mobile viewport, reduced-motion entrance skip, and real `WEBGL_lose_context` loss/restoration. No page exceptions observed.
- REA independently exercised local keyboard navigation and captured the resulting accessible UI.

Verification harnesses used for this session are `/tmp/pond-regression.cjs`, `/tmp/verify-portfolio-audio.cjs`, `/tmp/verify-portfolio-fish.cjs`, `/tmp/verify-portfolio-springs.cjs`, and `/tmp/portfolio-browser-check.cjs`. The reference-dependent checks require the source files with the hashes above. Local render snapshots are `/tmp/portfolio-landing-after.png` and `/tmp/portfolio-mobile-after.png`.

## Limits

This is a focused interaction comparison, not an audit of every branch feature. Static equality checks establish the tested formulas/assets, not every possible runtime state. Fish layouts and noise are randomized. Hardware-dependent rendering and audible playback can differ from the software-WebGL/headless test host. The omitted 3D model was neither reproduced nor changed.
