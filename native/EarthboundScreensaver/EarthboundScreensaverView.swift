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
    private lazy var sheetController: ConfigureSheetController = {
        let controller = ConfigureSheetController()
        controller.onSettingsChanged = { [weak self] in
            self?.applySettings()
        }
        return controller
    }()

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
            os_log("_setWindowOcclusionDetectionEnabled: not available (pre-Sonoma)", log: logger, type: .info)
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
            // Add parameters from user preferences
            let interval = sheetController.interval
            let showLayerNames = sheetController.showLayerNames
            var urlComponents = URLComponents(url: htmlURL, resolvingAgainstBaseURL: false)!
            urlComponents.queryItems = [
                URLQueryItem(name: "interval", value: String(interval)),
                URLQueryItem(name: "showLayerNames", value: String(showLayerNames))
            ]

            guard let urlWithParams = urlComponents.url else {
                os_log("ERROR: Could not create URL with parameters", log: logger, type: .error)
                return
            }

            os_log("Loading URL: %{public}@ (interval: %{public}d, showLayerNames: %{public}@)", log: logger, type: .info, urlWithParams.absoluteString, interval, String(showLayerNames))

            // Allow read access to the entire bundle to ensure all resources can load
            let bundleURL = bundle.bundleURL
            webView.loadFileURL(urlWithParams, allowingReadAccessTo: bundleURL)
        } else {
            os_log("ERROR: Could not find index.html in Resources", log: logger, type: .error)
        }
    }

    private func applySettings() {
        let showLayerNames = sheetController.showLayerNames
        os_log("Applying settings: showLayerNames=%{public}@", log: logger, type: .info, String(showLayerNames))

        // Update JavaScript via exposed function
        let js = "window.setShowLayerNames(\(showLayerNames));"
        webView.evaluateJavaScript(js) { _, error in
            if let error = error {
                os_log("Failed to apply settings: %{public}@", log: logger, type: .error, error.localizedDescription)
            }
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

    // Configuration sheet
    override var hasConfigureSheet: Bool { true }

    override var configureSheet: NSWindow? {
        return sheetController.createConfigureSheet()
    }

    // Capture input to prevent web view from handling it
    override func hitTest(_ point: NSPoint) -> NSView? {
        return self
    }

    // Lifecycle: stop WebView when screensaver stops to prevent resource leaks
    override func stopAnimation() {
        super.stopAnimation()
        webView?.stopLoading()
        os_log("EarthboundScreensaver stopped", log: logger, type: .info)
    }
}
