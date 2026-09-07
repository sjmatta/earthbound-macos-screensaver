# Development guide

## Commands

Requires Node 24+ and Xcode. Task orchestrates builds. XcodeGen is only needed when changing `native/studio.yml`.

```sh
npm test                    # deterministic state, renderer, and real bundle startup
scripts/test-native.sh      # Swift delayed-exit coordinator tests
task build                  # web + universal legacy .saver
task build:studio           # shared preview app + experimental extension
task preview                # build/open Studio, without changing system selection
task install                # explicitly install legacy .saver
task verify-web-assets      # classic file-URL script checks
npm run capture -- 269 270 120 output/capture
```

The npm engine dependency is pinned to a commit. Keep that pin and the lockfile; `npm ci` supplies reproducibility. Do not edit `node_modules` or the sibling engine checkout to change the shipped renderer.

## Architecture and fidelity

`src/renderer/state.js` contains the integer simulation; `renderer.js` supplies ROM decoding/indexed graphics and `SceneRenderer.render(frame, destination)`. Simulation is fixed at nominal 60 Hz. Rendering the same frame twice must not advance palettes, scrolling, or effects. Each new scene owns its own timeline. Read [docs/renderer.md](docs/renderer.md) before changing semantics: it links disassembly routines, timing conventions, and known limitations.

`src/data/reference.json` records 224 original pairings and names, scrolling and sine tables, and source hashes. Regenerate using `scripts/import-reference-data.py` against the intended ebsrc checkout; never invent pair names. The source constants are humanized identifiers, not a transcription of every in-game name.

Authentic uses original pairings and zero as absent; Remix can select raw layer zero and arbitrary pairs. Preserve that distinction. Authentic uses 5-bit color math and transparency. Remix crossfades completed images, not partially accumulated 8-bit layer contributions.

`src/main.js` owns the cancellable animation loop, scene selection, gallery, aspect handling, and bridge. Classic scripts may run from the HTML head, so initialization must wait for DOM readiness. URL options: `preview=true`, `mode=authentic|remix`, `scale=4:3|pixels|fill`, `interval`, `showLayerNames`, `layer1`/`layer2`, `frame`, and `debug`. Pins survive interval/settings updates.

Native bridge: `setScreensaverSettings(object)`, `setCycleInterval(seconds)`, `setShowLayerNames(bool)`, `stopScreensaver()`. Preview choices post to `settingsChanged`; native persists them through `SettingsStore` and reapplies idempotently. The diagnostic `earthbound.capture(pair, frame, mode)` returns raw pixels without changing live state.

## Native lifecycle

`BattleBackgroundView` is shared by the legacy saver, Studio, and extension. Start is idempotent, stop blanks the page, and unexpected WebKit process termination gets one retry. `DelayedHostExit` is a process-wide legacy coordinator: any display restart cancels every pending exit, and repeated stops supersede previous requests. Never call exit in the preview or extension.

The legacy occlusion selector takes a scalar BOOL. Do not replace the typed function call with `perform(_:with:)`, which passes an object. The extension is private API and stays experimental until host-level testing supports broader claims. Its source is `native/Extension`; XcodeGen source and committed project must agree.

## File-URL invariant

Vite produces one classic IIFE script. Keep `type="module"` and `crossorigin` out of shipped HTML. The compatibility transform is build-only: Vite's HTTP dev server needs modules. Use `WKWebView.loadFileURL(_:allowingReadAccessTo:)` with the bundled resource directory. Do not add private WKPreferences file-access keys.

## Evidence

Build/signature success does not prove activation, multi-monitor behavior, or game fidelity. No reference ROM/captures were available in the implementation session. State tests and implementation captures must never be labeled emulator-verified. See `docs/renderer.md` for validation scope and remaining SNES-specific effects.
