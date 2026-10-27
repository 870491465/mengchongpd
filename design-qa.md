# Success settlement QA — latest update

Performance update: static6400-bead rendering is now shared through one exact baked matrix texture. Game uses two static picture layers plus80 live current-row beads; settlement uses one picture Sprite. `tools/test-picture-texture.py` verifies all6400 cells against the original matrix and tinted source bead. `temp/performance/game-comparison.png` pairs CPU layout before/after; opened and compared with the same initial state. No material composition change was observed. The full production-presentation harness completed75914 frames/6400 landings/79 row reveals, with peak701 nodes at row transitions; idle UI Graphics rebuild count is zero. These are structural/CPU checks, not device FPS. Actual Creator/GPU verification remains blocked as below.

final result: blocked

Source: `docs/success_ui_fixed/success_ui/reference/success_approved.png` (941×1672) normalized to864×1536. State: completed picture, successful local save. Implementation: `temp/success-ui/success.png`; paired full comparison: `temp/success-ui/comparison.png`; focused header/buttons: `header-comparison.png`, `buttons-comparison.png`. Opened and compared full and focused views. These implementation images are production-code CPU compositions, not Creator/GPU screenshots.

Iteration1: the continue button was too tall and a rectangular frame created broad blank bands around the square artwork. Iteration2: reduced the button height, fitted the fine frame to the square image, and changed level/status/share text to regular weight. Regenerated and reopened focused evidence. No further code-layout blocker was identified in this comparison; actual rendered visual QA remains unavailable.

Required fidelity surfaces: fonts are system Microsoft YaHei with dynamic shrinking Labels; the fixed title uses the supplied redraw (its extra cream outline is documented by the asset supplier). Spacing follows the supplied864×1536 rectangles, with artwork frame adapted to preserve the actual square level proportions. Text greens/creams follow reference colors; original asset colors are preserved. Asset fidelity uses the9 byte-identical supplied PNGs plus the game bead SpriteFrame. Actual artwork intentionally differs from the reference example because the guide explicitly requires this round's own80×80 matrix. Copy uses the actual level name and save-success state. Buttons, title and framing were compared at readable scale. Native font antialiasing, touch and device safe areas remain unverified.

Functional evidence: `tools/test-success.cjs` completes6400 actual simulated shots before entering settlement, verifies all6400 result colors, no UI contamination, one persisted record, retry on failure, press/cancel, continue/home/new-round paths and share/export/cancel API contracts. Type checking, homepage,4381 UI frames and full-auto regression pass. The share API test uses mocks; no actual external share or download occurred.

Blocking requirement: [design-qa skill](C:/Users/baoji/.codex/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md) states “If either artifact cannot be opened, captured, or compared, write `design-qa.md` with `final result: blocked` and name the blocker.” Native capture remains unavailable and prior browser origin denial is respected. Actual Creator/device-rendered evidence, mobile performance and system sharing must still be verified. Do not interpret CPU evidence or passing tests as a runtime visual pass.

---

# Previous homepage design QA

Latest level-data update: cat garden is now 80×80 (6400 beads), sampled again from the preserved original image with the same 20-color palette. Board display area remains 800×800, giving 10 design pixels per cell. `temp/cat-garden/comparison-50-80.png` compares decoded chart samples at equal display size (left 50, right 80); it is not a runtime screenshot. Full-picture and auto simulations passed at normal/half simulation speed and double firing cadence; UI harness passed 4381 frames and homepage navigation passed. Actual Creator/device visual and performance verification remains pending. Homepage hero artwork is unchanged.

final result: blocked

Source: `docs/bead_home_ui/bead_home_ui/reference/home_approved.png` (941×1672), normalized to the production 864×1536 design canvas. State: fresh homepage, settings closed. Implementation evidence: `temp/home-ui/home.png`; paired full view `temp/home-ui/comparison.png`; focused header and button comparisons `header-comparison.png`, `buttons-comparison.png`. These are CPU scene-tree compositions, not engine screenshots.

Iteration 1 found the supplied Logo at native dimensions crowded the tagline and the primary button was too large. Iteration 2 reduced/repositioned the Logo and fitted the button to the supplied guide; focused comparisons were reopened after the fixes. The hero crop, location, level name, background and footer follow the supplied document. The gallery is intentionally hidden as the guide requires for unimplemented functionality. Optional scattered beads were not separately supplied and are omitted.

Fidelity surfaces: typography uses system Microsoft YaHei bold and dynamic Labels, with bounded/shrinking level title; reference has a rounder display face and more text relief. Spacing follows the 864×1536 source guide, with corrected header clearance. Colors use original PNGs and sampled green/cream text colors. Image fidelity preserves the supplied independent PNGs, including their documented redraw differences from the approved screenshot. Copy matches the guide and reads the actual cat level name. No assets were approximated with code drawings. Settings popup is a functional extension, not part of the supplied homepage comparison.

Functional evidence: `tools/test-home.cjs` covers initial homepage, simulation pause, original sprite loading, press/cancel, start, sound toggle, return and progress retention. Type checking, 2993 presentation frames, 17 state-machine scenarios, full-picture and full-auto regression tests passed. Actual engine font rendering, safe areas, GPU import and touch/background behavior remain unverified. Existing native capture is unavailable; the earlier browser origin denial remains respected.

Blocking requirement: [design-qa skill](C:/Users/baoji/.codex/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md) says: “If either artifact cannot be opened, captured, or compared, write `design-qa.md` with `final result: blocked` and name the blocker.” We have source and CPU layout evidence, but lack a Creator/device-rendered capture; visual acceptance is therefore pending. Next check: preview `assets/scenes/RowPrototype.scene` in Creator and on a portrait phone, then compare the actual homepage against the source at matching dimensions.

---

# Previous V3 design QA

Latest functional update: the user explicitly requested **20 distinct compact palette beads on one line**. The strip now contains IDs1–20, each about26.7×26.7 design pixels, with actual grayscale/disabled input for unused/loaded colors. Palette geometry and visibility are covered by the production-code harness. Art data is resampled from the V3 source matrix with related shade variants and base36 color IDs. New strip-only code captures: `temp/v3-ui/palette20-all.png` and `palette20-current-row.png`. Earlier five-color layout notes below are historical. Runtime visual result remains blocked as recorded below.

final result: blocked

## Evidence and normalization

- Source visual truth: `docs/bead_cocos_v3/bead_cocos_v3/reference/approved_ui.png`.
- Source pixels: 941×1672, normalized to 864×1536 for comparison.
- Production UI design resolution: 864×1536, SHOW_ALL. No device/browser chrome.
- Code-rendered implementation: `temp/v3-ui/reference-state.png`, `start-state.png`, `settings-state.png`.
- Full-view comparison: `temp/v3-ui/comparison.png` (reference left, production code rendering right).
- Focused dock comparison: `temp/v3-ui/dock-comparison.png`.
- State: 40% completed, active yellow clip and waiting colors. Normal application initialization is 0%.
- These are recorded production scene-tree renders, **not** Creator/GPU/browser screenshots. Native capture failed with `Computer Use native pipe is unavailable: failed to connect native pipe (os error 2)`, including retry and session reset. A browser-origin refusal from the earlier session was not bypassed.

## Intentional scope differences

Current 50×50/five-color gameplay is preserved. Reference is 40×44/ten colors. The square board is centered inside the reference board region. Per the user's latest clarification, all five palette choices now fill the entire 614-pixel selection row; unused choices remain visible in grayscale and cannot be tapped. The artwork's natural colors are preserved exactly, with no test colors inserted at its edges. The image colors/content therefore differ from the reference. The supplied V3 level is not silently substituted.

## Comparison history

1. Initial recorded rendering: [P1] flat board did not reproduce bead texture; [P2] five swatches were stretched horizontally; [P1] active magazine beads intersected the opaque glass rim.
2. Replaced flat board with pooled original `bead_white` SpriteFrames; made swatches square/compact; sampled the original empty-shell alpha and fitted the real beans to the actual clear interior. Normalized full-view and focused dock evidence recaptured afterward.
3. [P2] unfilled cells had excessive bevel contrast. Reduced unfilled cell opacity to ~10% and current-row opacity to ~27%, retaining source texture and full colors for seated cells. Re-rendered the same state and inspected the combined comparison.
4. Queue advancement now compacts with a short slide; missing main text behind settings/speed menus is deliberately hidden to prevent labels leaking through the modal.

## Required fidelity surfaces

- Fonts/typography: system Microsoft YaHei, ordinary bold labels for title/progress; readable current-row numbers; no baked UI text. Code-rendered font hierarchy compared at 864×1536. Mobile fallback requires a real device check.
- Spacing/layout rhythm: header, board, palette, five queue slots, dock, right-hand fire and speed controls use V3 layout ranges. Square cells preserve the existing 50×50 requirement. Modal has separate touch groups and blocks firing behind it.
- Colors/tokens: original background, mint/cream controls, V3 palette colors. Actual unfilled cells are lightly revealed; full color appears only on seating. Frame opacity and gamma still require a GPU check.
- Image quality: all device/button/bead sprites are original source PNGs, copied unchanged, loaded as SpriteFrames. Body, muzzle, active magazine and queued magazine remain independent. Source art has a cream body collar unlike the reference's fully green neck; connection overlap is present in layout, but real runtime seams remain to be checked.
- Copy/content: title and prompt follow reference; progress and current row are dynamic; normal initial progress remains 0%. Extra debugging copy stays inside settings.

## Open findings / runtime gate

- [P1, verification] No real Creator/phone capture is available. Do not claim pixel-perfect restoration or runtime visual QA passed from the CPU images or type checks.
- [P2, verification] Check actual glass masks, grain spacing/alpha, independent muzzle/body overlap, mobile font fallback and 2500-Sprite performance in the editor/phone.

## Implementation checklist

- [x] Original V3 asset import and stable SpriteFrame metadata.
- [x] Current-row labels embedded into the board.
- [x] Real inventory sprites, empty ejection, FIFO advancement and feed/chamber isolation.
- [x] Independent muzzle, FirePoint world-coordinate capture, fixed body.
- [x] Three firing cadence settings, settings panel, input blocking and reset controls.
- [x] Production-code layout captures, normalized full/dock comparisons, two correction iterations.
- [ ] Actual Creator/phone visual capture and runtime interaction/console inspection.

Build/type/model checks are recorded separately and do not change this blocked visual result.

The isolated 3.8.8 build in `temp/v3-engine-check/` reached script packaging, then failed in the editor's `buildPolyfillsCommand` worker launch with `spawn UNKNOWN`. Log's final "Finished" line is not treated as a successful build. No incomplete build output was copied to the main project. The user's open editor was not closed.

This gate follows [product-design:design-qa](C:/Users/baoji/.codex/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md): "If either artifact cannot be opened, captured, or compared, write `design-qa.md` with `final result: blocked` and name the blocker." The missing artifact is a real Creator/device rendering, not the supplied reference.
