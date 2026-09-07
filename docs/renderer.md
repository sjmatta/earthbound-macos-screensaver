# Renderer and host implementation

The renderer now has explicit simulation state and an original-pairing collection. It is based on the EarthBound disassembly, but has **not been compared with emulator captures**: no reference ROM or captures were available for this implementation. “Authentic pairings” describes the source of the pairings, not a claim of cycle-perfect emulation.

## What is implemented

- All 327 bundled raw background entries remain available in Remix and pinned development URLs.
- Authentic mode shuffles 224 distinct original pairings from the game's battle-group table. Zero is an absent layer in those pairings. A raw zero entry remains selectable in Remix.
- The gallery associates scenes with enemy-group identifiers from the source, displays lazy-loaded thumbnails, supports search, and saves favorites and exclusions. Names are humanized source identifiers; a shared background may name multiple encounters.
- Each scene starts with independent state. Palette cycles, scrolling, effect durations, and distortion parameters advance at a fixed nominal 60 simulation frames per second. Rendering a frame repeatedly has no additional state effects, and a backward seek reconstructs state from initialization.
- Scrolling follows four-entry sequences, unsigned 16-bit positions, and velocity-after-acceleration updates. Distortion sequences load their durations and wrap their 8-bit phase and 16-bit parameters.
- The scanline transform uses the game's 256-byte sine lookup and signed integer multiplication. Type 4 is a compression/interlacing calculation applied through **horizontal DMA**, as in the disassembly; only type 3 targets vertical scrolling.
- When the second background requests it, the two distortion tables refresh on alternating simulation frames. Palette and movement state continue advancing each frame.
- Authentic rendering performs 5-bit channel averaging before RGB8 expansion and recognizes transparent index zero. Transparent subscreen pixels select fixed black without halving the main-screen value. The ordinary backdrop/fixed color is black; transient battle effects are not simulated.
- Authentic scene changes cut. Remix changes crossfade two completed images over 1.2 seconds, with a single final RGB8 rounding step.
- Display choices are 4:3, source pixels (integer scale where possible), or fill. Source pixels and 4:3 preserve their respective proportions; fill intentionally stretches to the display.

## Source receipts

`src/data/reference.json` records the source commit and SHA-256 hashes for the imported tables and implementation references. Refresh it deliberately with:

```sh
python3 scripts/import-reference-data.py /path/to/ebsrc
```

The pinned source is [Herringway/ebsrc at 0197d6c13ef11ad3280e9388e08a646ab1030d15](https://github.com/Herringway/ebsrc/tree/0197d6c13ef11ad3280e9388e08a646ab1030d15). Relevant files:

- [Initialization](https://github.com/Herringway/ebsrc/blob/0197d6c13ef11ad3280e9388e08a646ab1030d15/src/unknown/C2/C2CFE5.asm): initializes sequence indices to zero and duration counters to one. Consequently the first update tries slot 1 and falls back to slot 0 if empty.
- [Frame updates](https://github.com/Herringway/ebsrc/blob/0197d6c13ef11ad3280e9388e08a646ab1030d15/src/misc/battlebgs/generate_frame.asm): sequences, palette updates, wrapping arithmetic, and alternating HDMA updates.
- [Scanline generation](https://github.com/Herringway/ebsrc/blob/0197d6c13ef11ad3280e9388e08a646ab1030d15/src/misc/battlebgs/prepare_bg_offset_tables.asm): integer sine transform and compression.
- [Background loading](https://github.com/Herringway/ebsrc/blob/0197d6c13ef11ad3280e9388e08a646ab1030d15/src/battle/load_battlebg.asm): bit-depth handling and layer/color-math setup. The original table has no 4bpp-first two-layer pairings; arbitrary 4bpp combinations belong in Remix.
- [Color register presets](https://github.com/Herringway/ebsrc/blob/0197d6c13ef11ad3280e9388e08a646ab1030d15/src/data/unknown/C0AFF1.asm): the ordinary two-layer BG3/BG4 configuration uses CGADSUB `$64`.

The existing pinned JavaScript engine still decodes the ROM graphics/arrangements and palette addresses. Local code handles animation, indexed sampling, and composition; it does not modify `node_modules` or depend on the sibling engine checkout.

## Validation and captures

```sh
npm test                         # Node state, renderer, bundle-startup tests
scripts/test-native.sh           # Swift delayed-host-exit tests
node scripts/benchmark.mjs       # CPU-only renderer timing
npm run capture -- 269 270 120 output/capture
node scripts/compare-frames.mjs output/capture.rgba reference.rgba
```

Capture writes a 256×224 RGBA8 file, a portable PPM image, and JSON metadata with scene/frame/source/hash. Frame zero means the first initialization update. These captures are **implementation outputs**, not independent reference evidence. The comparison tool checks RGB bytes and returns a failing status for any differing pixel. Reference images must first be aligned/cropped and converted to 256×224 RGBA8 without filtering. Record emulator, game revision, initial frame alignment, layer visibility, and color-output convention alongside any future reference set.

Tests include hand-calculated sequence, phase, scrolling, palette, scanline, and color-math cases; all raw layers and original pairings; repeat/seek and presentation-rate invariance; exact crossfade endpoints; transparent subscreen behavior; pinned settings; DOM-ready file-URL startup; and loop cancellation. They establish deterministic behavior and guard regressions, not complete SNES PPU equivalence.

Local verification used Node 24.13.0, Xcode 26.6, and macOS 26.5.2. Browser testing exercised the real built page and native WKWebView preview. Representative CPU-only rendering averaged approximately 0.24–0.36 ms/frame; WebKit, display, process startup, and energy costs are excluded. CI now defines macOS 14, 15, and latest build jobs, but those hosted jobs have not been run from this working tree.

## Native targets

`BattleBackgroundView` is shared by three targets:

1. **EarthboundScreensaver.saver**: legacy `ScreenSaverView` wrapper. Uses a correctly typed scalar-BOOL occlusion call, blanks on stop, and retains the delayed legacy-host exit workaround. The exit coordinator is shared across all views, so a restart on any display invalidates pending exits from every display. Repeated stops replace and cancel previous work.
2. **EarthboundStudio.app**: standalone preview and gallery. Loads the exact bundled renderer from a file URL, persists choices to the existing screensaver preferences domain, and stops on close/minimize. It never changes the selected system screensaver.
3. **EarthboundExtension.appex**: experimental private-API host embedded in Studio, with its own options gallery and normal view lifecycle. It does not use the legacy occlusion override or host-termination workaround.

The extension uses [AppexSaverMinimal](https://github.com/AerialScreensaver/AppexSaverMinimal) as an architectural reference; its declaration header and MIT notice are included. The extension is **build-verified, not certified across OS releases**. Private API availability, extension activation, preferences access under its sandbox, rapid unlock/relock, and multiple physical displays still need OS-host integration testing. The options gallery uses a narrowly scoped shared-preferences exception for the existing preferences domain; no network entitlement or broad filesystem exception is requested.

`native/studio.yml` is the XcodeGen source for the committed Studio project. Ordinary builds use the committed project and do not require XcodeGen. Run `task project:studio` after changing the specification. Build does not explicitly register, enable, or install either saver. macOS may discover an embedded extension when its app is opened, so keep one chosen build/install location during extension development.

## Remaining fidelity boundaries

This renderer reproduces background data and its ordinary animation routines, not the entire SNES or battle engine. Giygas scripted phase changes/noise, battle flashes, attack effects, window masks/letterboxing, VRAM corruption peculiarities, global frame-parity alignment at entry, and analog/CRT color response are outside the current model. The clock uses nominal 60 Hz rather than claiming region-specific crystal timing. Do not use self-generated captures to mark those gaps verified.

A Metal rewrite remains deferred: the measured CPU renderer is small, and the shared deterministic interface supplies a reference if native presentation later becomes necessary. Distribution builds are ad-hoc signed locally; Developer ID notarization requires the owner's signing credentials and has not been performed.
