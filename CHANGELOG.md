# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Layer indicator now shows a real description (index + distortion style, e.g.
  `#019 Interlaced`) instead of always falling back to `Layer N`. `layerNames.json`
  still overrides the fallback for any index listed in it.
- Backgrounds using layer index 0 no longer collapse the layer blend. The engine's
  `animate()` treats a falsy `entry` index as a missing layer, which left affected
  sessions rendering a single layer at full opacity permanently.
- The render loop can now be stopped. `main.js` drives `renderLayers()` directly instead
  of `Engine.animate()`, which keeps a module-private frame ID with no cancel API.
- Changing the cycle interval in the configure sheet now applies immediately instead of
  waiting for the next activation.
- `task dev` works again. The `file://` compatibility plugin was stripping `type="module"`
  from the dev server's HTML as well as the build's, breaking the dev server outright.
- Dismissing the screensaver no longer risks killing a session that re-engages within the
  2-second host-exit window (fast unlock-then-relock).

### Changed
- Layers pinned with `?layer1=&layer2=` no longer cycle away after the interval.
- `?debug=true` keeps the layer indicator on screen instead of logging a data URL per frame.
- Builds are reproducible: the engine dependency is pinned to a commit and `task setup`
  uses `npm ci`.

### Added
- `task verify-web-assets` asserts the built HTML still loads from a `file://` URL; CI runs
  the same check against the shipped bundle so a Vite upgrade can't silently blank the screen.
- `window.setCycleInterval(seconds)` and `window.stopScreensaver()` native bridge functions.

## [1.0.0] - 2025-01-08

### Added
- Native macOS screensaver displaying Earthbound battle backgrounds
- Randomly cycles through 52,650 two-layer background combinations
- Configurable cycle interval (5-300 seconds) via screensaver options
- macOS Sonoma (14.x) and Sequoia (15.x) compatibility with WKWebView occlusion fix
- Support for macOS Monterey 12.0 and later
- Universal binary supporting both Intel and Apple Silicon Macs
- Task-based build system for easy development
- GitHub Actions CI/CD for automated builds and releases
