# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

This project uses [Task](https://taskfile.dev) for build automation. Primary commands:

```bash
task install      # Build everything and install to ~/Library/Screen Savers
task run          # Install and launch screensaver for testing
task dev          # Start Vite dev server for browser testing
task logs         # Stream live screensaver logs (run in separate terminal)
task check        # Run diagnostics on installation
task clean        # Remove all build artifacts
task kill-processes  # Clear cached screensaver processes after rebuilding
```

Individual build steps:
```bash
task setup        # Build web assets with Vite (npm install + vite build)
task build        # Build native .saver bundle (runs setup if needed)
```

## Architecture

Two-layer system: JavaScript rendering wrapped in a native macOS screensaver bundle.

**Web Layer** (`src/`):
- `main.js` - Initializes the Earthbound Battle Backgrounds engine, randomly cycles through 327 layer combinations
- Uses `earthbound-battle-backgrounds` npm package for rendering
- Vite bundles everything into a single `screensaver.js` file (IIFE format)

**Native Layer** (`native/EarthboundScreensaver/`):
- `EarthboundScreensaverView.swift` - Main screensaver view, hosts WKWebView
- `ConfigureSheetController.swift` - Settings UI for cycle interval
- Loads bundled HTML/JS via `loadFileURL(_:allowingReadAccessTo:)`

**Build Output**: `dist/EarthboundScreensaver.saver` - self-contained macOS screensaver bundle

## Critical: macOS Sonoma/Sequoia WKWebView Fix

### The Problem
macOS Sonoma (14.x) and Sequoia (15.x) introduced a breaking change for WKWebView in screensavers. The ScreenSaverEngine's view hierarchy causes WKWebView to think it's "occluded" (hidden), which **pauses all JavaScript execution and CSS animations**. This results in a blank/black screen even though the WebView loads successfully.

### The Solution
Disable window occlusion detection using the private API `_setWindowOcclusionDetectionEnabled:`:

```swift
let selector = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
if webView.responds(to: selector) {
    webView.perform(selector, with: false)
}
```

This fix was discovered in the [WebViewScreenSaver project](https://github.com/liquidx/webviewscreensaver/commit/827156642601ac6ce1fbe2b632e8d6d424bcbbd3).

### What Does NOT Work (macOS 15+)
The following private WKPreferences APIs throw `NSUnknownKeyException` and will crash the screensaver:
- `config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")`
- `config.preferences.setValue(true, forKey: "allowUniversalAccessFromFileURLs")`

These were removed or restricted in recent macOS versions. Do NOT use them.

### What DOES Work
Use `loadFileURL(_:allowingReadAccessTo:)` - this is the official public API for loading local files:
```swift
webView.loadFileURL(htmlURL, allowingReadAccessTo: bundleURL)
```
Pass the bundle's root URL to `allowingReadAccessTo:` to enable access to all resources within the bundle.

## Debugging macOS Screensavers

### Log Commands
```bash
task logs                # Stream live logs
task logs-errors         # Show recent errors only
log show --last 5m --predicate 'processImagePath contains "legacyScreenSaver"'
```

### Key Processes
- `legacyScreenSaver` - Hosts third-party .saver bundles
- `WallpaperAgent` - Manages screensaver/wallpaper lifecycle in Sequoia
- `ScreenSaverEngine` - Main screensaver app

### Screensaver Preferences Location
```bash
plutil -p ~/Library/Preferences/ByHost/com.apple.screensaver.*.plist
```

### macOS Sequoia Notes
- Third-party screensavers appear in "Other" section (click "Show All" to see them)
- WKWebView works but requires the occlusion detection fix above

## References
- [WebViewScreenSaver GitHub](https://github.com/liquidx/webviewscreensaver)
- [WebViewScreenSaver Issue #77 - Sonoma black screen](https://github.com/liquidx/webviewscreensaver/issues/77)
- [Apple Developer Forums - legacyScreenSaver with WKWebView](https://developer.apple.com/forums/thread/736716)
