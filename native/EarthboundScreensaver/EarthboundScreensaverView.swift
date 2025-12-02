//
//  EarthboundScreensaverView.swift
//  EarthboundScreensaver
//
//  A macOS screensaver displaying Earthbound battle backgrounds
//

import ScreenSaver
import WebKit

class EarthboundScreensaverView: ScreenSaverView {
    private var webView: WKWebView!

    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        setupWebView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupWebView()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        // Allow file:// access for loading local assets
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        webView = WKWebView(frame: bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]

        // Disable scrolling and bouncing
        webView.enclosingScrollView?.hasVerticalScroller = false
        webView.enclosingScrollView?.hasHorizontalScroller = false

        addSubview(webView)

        loadScreensaver()
    }

    private func loadScreensaver() {
        let bundle = Bundle(for: type(of: self))
        // Resources are in a subdirectory due to how Xcode copies folder references
        if let htmlURL = bundle.url(forResource: "index", withExtension: "html", subdirectory: "Resources") {
            let resourceDir = htmlURL.deletingLastPathComponent()
            webView.loadFileURL(htmlURL, allowingReadAccessTo: resourceDir)
        }
    }

    // No configuration sheet
    override var hasConfigureSheet: Bool { false }
    override var configureSheet: NSWindow? { nil }

    // Capture input to prevent web view from handling it
    override func hitTest(_ point: NSPoint) -> NSView? {
        return self
    }
}
