# Claude Code Notes - Earthbound Screensaver

## Project Overview
A native macOS screensaver that displays Earthbound battle backgrounds using WKWebView to render JavaScript-based animations.

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

### Log Locations
Screensaver logs can be found using:
```bash
log show --last 5m --predicate 'processImagePath contains "legacyScreenSaver"'
log show --last 5m --predicate 'eventMessage contains "YourScreensaverName"'
```

### Screensaver Preferences
Stored in: `~/Library/Preferences/ByHost/com.apple.screensaver.<MACHINE-UUID>.plist`

View with:
```bash
plutil -p ~/Library/Preferences/ByHost/com.apple.screensaver.*.plist
```

### Key Processes
- `ScreenSaverEngine` - Main screensaver app
- `legacyScreenSaver` - Hosts third-party .saver bundles
- `WallpaperAgent` - Manages screensaver/wallpaper lifecycle in Sequoia

### Clearing Cached Processes
After rebuilding, kill cached processes:
```bash
killall legacyScreenSaver 2>/dev/null
killall WallpaperAgent 2>/dev/null
killall ScreenSaverEngine 2>/dev/null
```

## macOS Sequoia (15.x) Screensaver Behavior
- Third-party screensavers are in the "Other" section (click "Show All" to see them)
- The UI is more restrictive toward third-party screensavers
- WKWebView works but requires the occlusion detection fix

## Build & Install

### Build
```bash
npm run build:saver
```

### Install
```bash
cp -R dist/EarthboundScreensaver.saver ~/Library/Screen\ Savers/
```

### Code Signing
Ad-hoc signing (`CODE_SIGN_IDENTITY="-"`) works for local development. For distribution, use a proper Developer ID.

## References
- [WebViewScreenSaver GitHub](https://github.com/liquidx/webviewscreensaver)
- [WebViewScreenSaver Issue #77 - Sonoma black screen](https://github.com/liquidx/webviewscreensaver/issues/77)
- [Apple Developer Forums - legacyScreenSaver with WKWebView](https://developer.apple.com/forums/thread/736716)
