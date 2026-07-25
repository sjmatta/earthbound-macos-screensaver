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
    private var isPreviewInstance: Bool = false
    private var isContentLoaded: Bool = false
    private var pendingExit: DispatchWorkItem?
    private lazy var sheetController: ConfigureSheetController = {
        let controller = ConfigureSheetController()
        controller.onSettingsChanged = { [weak self] in
            self?.applySettings()
        }
        return controller
    }()

    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        self.isPreviewInstance = isPreview
        os_log("EarthboundScreensaver init - isPreview: %{public}@", log: logger, type: .default, String(isPreview))
        setupWebView()
        registerScreensaverLifecycleObservers()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        os_log("EarthboundScreensaver init from coder", log: logger, type: .default)
        setupWebView()
        registerScreensaverLifecycleObservers()
    }

    deinit {
        DistributedNotificationCenter.default().removeObserver(self)
        pendingExit?.cancel()
    }

    // macOS Sonoma+ FRAMEWORK BUG: stopAnimation() is only called for the System
    // Settings preview thumbnail, NEVER when the user dismisses the real screensaver.
    // The framework leaves the view alive, so with occlusion detection disabled the
    // WKWebView render loop runs forever, pinning WindowServer and breaking system-wide
    // hover/mouse-event delivery. The reliable dismissal signal is the distributed
    // notification com.apple.screensaver.willstop (same approach Aerial uses).
    // Refs: wadetregaskis.com/how-to-make-a-macos-screen-saver, Apple DevForums 738547.
    private func registerScreensaverLifecycleObservers() {
        // The preview thumbnail uses normal start/stopAnimation, so skip this there.
        guard !isPreviewInstance else { return }
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(screensaverWillStop(_:)),
            name: Notification.Name("com.apple.screensaver.willstop"),
            object: nil
        )
    }

    @objc private func screensaverWillStop(_ notification: Notification) {
        os_log("com.apple.screensaver.willstop received — blanking WebView, exiting host in 2s", log: logger, type: .default)
        // Blank immediately so the render loop stops right now (instant CPU relief).
        blankWebView()
        // Then terminate the legacyScreenSaver host so nothing can linger. Aerial found
        // that an IMMEDIATE exit(0) can crash the screensaver engine on macOS 14+; a
        // short delay lets the engine finish its own teardown first. macOS relaunches
        // the host fresh on the next activation. Ref: JohnCoates/Aerial issue #1341.
        //
        // The exit is cancellable: if the screensaver re-engages inside that window
        // (fast unlock-then-relock, or one display waking while another sleeps),
        // startAnimation() cancels it so we don't kill the fresh session.
        let exitWork = DispatchWorkItem {
            os_log("Exiting legacyScreenSaver host now", log: logger, type: .default)
            exit(0)
        }
        pendingExit = exitWork
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: exitWork)
    }

    private func blankWebView() {
        isContentLoaded = false
        webView?.stopLoading()
        webView?.loadHTMLString("", baseURL: nil)
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

        // Content is loaded in startAnimation() so the render loop only runs
        // while the screensaver is actually on screen. See stopAnimation().
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
            isContentLoaded = false
            webView.loadFileURL(urlWithParams, allowingReadAccessTo: bundleURL)
        } else {
            os_log("ERROR: Could not find index.html in Resources", log: logger, type: .error)
        }
    }

    private func applySettings() {
        // Content is loaded in startAnimation(), so the configure sheet can be dismissed
        // before there is any page to talk to. The new values are picked up from the
        // query string on the next load, so there is nothing to do yet.
        guard isContentLoaded else {
            os_log("Settings changed before content loaded; will apply on next load", log: logger, type: .info)
            return
        }

        let showLayerNames = sheetController.showLayerNames
        let interval = sheetController.interval
        os_log("Applying settings: showLayerNames=%{public}@, interval=%{public}d", log: logger, type: .info, String(showLayerNames), interval)

        // Update JavaScript via exposed functions
        let js = """
        window.setShowLayerNames(\(showLayerNames));
        window.setCycleInterval(\(interval));
        """
        webView.evaluateJavaScript(js) { _, error in
            if let error = error {
                os_log("Failed to apply settings: %{public}@", log: logger, type: .error, error.localizedDescription)
            }
        }
    }

    // WKNavigationDelegate methods
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // about:blank from blankWebView() also lands here; it has no bridge to call.
        isContentLoaded = webView.url?.isFileURL == true
        os_log("WebView finished loading (contentLoaded: %{public}@)", log: logger, type: .info, String(isContentLoaded))
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

    // Lifecycle: (re)load content when the screensaver becomes active so the
    // animation loop starts fresh each session.
    override func startAnimation() {
        super.startAnimation()
        // A dismissal may have scheduled a host exit that hasn't fired yet; this
        // session supersedes it. See screensaverWillStop.
        if pendingExit != nil {
            os_log("Screensaver re-engaged — cancelling pending host exit", log: logger, type: .default)
            pendingExit?.cancel()
            pendingExit = nil
        }
        loadScreensaver()
        os_log("EarthboundScreensaver started", log: logger, type: .default)
    }

    // NOTE: On macOS Sonoma+ this is only called for the System Settings preview
    // thumbnail — never on real dismissal (see registerScreensaverLifecycleObservers
    // / screensaverWillStop, which handle the real screensaver). Blanking here keeps
    // the preview from rendering in the background after the settings pane closes.
    override func stopAnimation() {
        super.stopAnimation()
        blankWebView()
        os_log("EarthboundScreensaver stopAnimation (preview) — WebView blanked", log: logger, type: .default)
    }
}
