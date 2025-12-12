//
//  EarthboundScreensaverView.swift
//  EarthboundScreensaver
//
//  A macOS screensaver displaying Earthbound battle backgrounds
//

import ScreenSaver
import WebKit
import os.log

private let logger = OSLog(subsystem: "com.sjmatta.earthbound-screensaver", category: "ScreenSaver")

class EarthboundScreensaverView: ScreenSaverView, WKNavigationDelegate {
    private var webView: WKWebView!

    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        os_log("EarthboundScreensaver init - isPreview: %{public}@", log: logger, type: .info, String(isPreview))
        setupWebView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        os_log("EarthboundScreensaver init from coder", log: logger, type: .info)
        setupWebView()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()

        webView = WKWebView(frame: bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self

        // CRITICAL: Disable window occlusion detection to prevent macOS Sonoma/Sequoia
        // from pausing WKWebView animations and JavaScript when running as a screensaver.
        // The ScreenSaverEngine's view hierarchy causes WKWebView to think it's occluded.
        let selector = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
        if webView.responds(to: selector) {
            webView.perform(selector, with: false)
            os_log("Disabled window occlusion detection", log: logger, type: .info)
        } else {
            os_log("Warning: _setWindowOcclusionDetectionEnabled: not available", log: logger, type: .error)
        }

        // Disable scrolling and bouncing
        webView.enclosingScrollView?.hasVerticalScroller = false
        webView.enclosingScrollView?.hasHorizontalScroller = false

        addSubview(webView)

        loadScreensaver()
    }

    private func loadScreensaver() {
        let bundle = Bundle(for: type(of: self))
        os_log("Bundle path: %{public}@", log: logger, type: .info, bundle.bundlePath)

        // Resources are in a subdirectory due to how Xcode copies folder references
        if let htmlURL = bundle.url(forResource: "index", withExtension: "html", subdirectory: "Resources") {
            os_log("HTML URL: %{public}@", log: logger, type: .info, htmlURL.absoluteString)
            // Allow read access to the entire bundle to ensure all resources can load
            let bundleURL = bundle.bundleURL
            os_log("Allowing read access to: %{public}@", log: logger, type: .info, bundleURL.absoluteString)
            webView.loadFileURL(htmlURL, allowingReadAccessTo: bundleURL)
        } else {
            os_log("ERROR: Could not find index.html in Resources", log: logger, type: .error)
        }
    }

    // WKNavigationDelegate methods
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        os_log("WebView finished loading", log: logger, type: .info)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        os_log("WebView navigation failed: %{public}@", log: logger, type: .error, error.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        os_log("WebView provisional navigation failed: %{public}@", log: logger, type: .error, error.localizedDescription)
    }

    // No configuration sheet
    override var hasConfigureSheet: Bool { false }
    override var configureSheet: NSWindow? { nil }

    // Capture input to prevent web view from handling it
    override func hitTest(_ point: NSPoint) -> NSView? {
        return self
    }
}
