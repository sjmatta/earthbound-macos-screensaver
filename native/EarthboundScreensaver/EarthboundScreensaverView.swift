import ScreenSaver
import WebKit
import os.log

private let log = OSLog(subsystem: "com.sjmatta.earthbound-screensaver", category: "Renderer")
private let settingsNotification = Notification.Name("com.sjmatta.earthbound-screensaver.settingsChanged")

final class WeakSettingsHandler: NSObject, WKScriptMessageHandler {
    weak var owner: BattleBackgroundView?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let value = message.body as? [String: Any] else { return }
        SettingsStore.save(value)
        owner?.applySettings()
    }
}

// Shared by the legacy saver, preview app, and experimental extension.
final class BattleBackgroundView: NSView, WKNavigationDelegate {
    private var webView: WKWebView!
    private let settingsHandler = WeakSettingsHandler()
    private var active = false
    private var loaded = false
    private var recoveryAttempts = 0
    private let controls: Bool
    private let legacy: Bool
    private let errorLabel = NSTextField(wrappingLabelWithString: "")

    init(frame: NSRect, controls: Bool = false, legacy: Bool = false) {
        self.controls = controls; self.legacy = legacy
        super.init(frame: frame)
        let config = WKWebViewConfiguration()
        settingsHandler.owner = self
        config.userContentController.add(settingsHandler, name: "settingsChanged")
        webView = WKWebView(frame: bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        if legacy {
            // The selector takes a scalar BOOL; perform(_:with:) passes an object.
            let selector = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
            if webView.responds(to: selector) {
                typealias SetOcclusion = @convention(c) (AnyObject, Selector, Bool) -> Void
                let call = unsafeBitCast(webView.method(for: selector), to: SetOcclusion.self)
                call(webView, selector, false)
            }
        }
        addSubview(webView)
        errorLabel.textColor = .white
        errorLabel.isHidden = true
        errorLabel.frame = NSRect(x: 24, y: 24, width: 500, height: 70)
        errorLabel.autoresizingMask = [.width]
        addSubview(errorLabel)
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(settingsChanged), name: settingsNotification, object: nil)
    }
    required init?(coder: NSCoder) { fatalError("Use init(frame:controls:legacy:)") }
    deinit { DistributedNotificationCenter.default().removeObserver(self) }

    func start() {
        guard !active else { return }
        active = true; recoveryAttempts = 0
        loadContent()
    }
    func stop() {
        active = false; loaded = false
        webView.stopLoading()
        webView.loadHTMLString("", baseURL: nil)
    }
    private func loadContent() {
        let bundle = Bundle(for: BattleBackgroundView.self)
        guard let html = bundle.url(forResource: "index", withExtension: "html", subdirectory: "Resources") else {
            showError("The bundled backgrounds could not be found. Rebuild or reinstall EarthBound.")
            return
        }
        var url = URLComponents(url: html, resolvingAgainstBaseURL: false)!
        url.queryItems = [URLQueryItem(name: "settings", value: SettingsStore.json), URLQueryItem(name: "preview", value: String(controls))]
        loaded = false
        webView.loadFileURL(url.url!, allowingReadAccessTo: html.deletingLastPathComponent())
    }
    @objc private func settingsChanged() { applySettings() }
    func applySettings() {
        guard active && loaded else { return }
        webView.evaluateJavaScript("window.setScreensaverSettings(\(SettingsStore.json))") { _, error in
            if let error = error { os_log("Settings failed: %{public}@", log: log, type: .error, error.localizedDescription) }
        }
    }
    private func showError(_ message: String) {
        errorLabel.stringValue = message; errorLabel.isHidden = false
        os_log("%{public}@", log: log, type: .error, message)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = active && webView.url?.isFileURL == true
        guard loaded else { return }
        errorLabel.isHidden = true
        applySettings()
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if active { showError(error.localizedDescription) }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if active && (error as NSError).code != NSURLErrorCancelled { showError(error.localizedDescription) }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        guard active else { return }
        if recoveryAttempts < 1 { recoveryAttempts += 1; loadContent() }
        else { showError("The renderer stopped. Close and reopen the preview or screensaver to retry.") }
    }
}

class EarthboundScreensaverView: ScreenSaverView {
    private var renderer: BattleBackgroundView!
    private static let hostExit = DelayedHostExit(
        schedule: { DispatchQueue.main.asyncAfter(deadline: .now() + 2, execute: $0) },
        action: { if ProcessInfo.processInfo.processName == "legacyScreenSaver" { exit(0) } }
    )
    private let sheet = ConfigureSheetController()
    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        renderer = BattleBackgroundView(frame: bounds, legacy: true)
        renderer.autoresizingMask = [.width, .height]
        addSubview(renderer)
        sheet.onSettingsChanged = { [weak self] in self?.renderer.applySettings() }
        if !isPreview {
            DistributedNotificationCenter.default().addObserver(self, selector: #selector(willStop), name: Notification.Name("com.apple.screensaver.willstop"), object: nil)
        }
    }
    required init?(coder: NSCoder) { return nil }
    deinit { DistributedNotificationCenter.default().removeObserver(self) }
    @objc private func willStop() {
        renderer.stop()
        Self.hostExit.request()
    }
    override func startAnimation() {
        super.startAnimation()
        Self.hostExit.cancel()
        renderer.start()
    }
    override func stopAnimation() { renderer.stop(); super.stopAnimation() }
    override func hitTest(_ point: NSPoint) -> NSView? { self }
    override var hasConfigureSheet: Bool { true }
    override var configureSheet: NSWindow? { sheet.createConfigureSheet() }
}
