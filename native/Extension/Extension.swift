import AppKit
import ScreenSaver
// Experimental: these framework classes are private. See docs/renderer.md.
@objc(EarthboundExtension)
class EarthboundExtension: ScreenSaverExtension {}
@objc(EarthboundExtensionViewController)
class EarthboundExtensionViewController: ScreenSaverViewController {
    override func loadView() {
        view = ExtensionView(frame: NSRect(x:0,y:0,width:800,height:600), isPreview: false)!
    }
}
final class ExtensionView: ScreenSaverView {
    private var renderer: BattleBackgroundView!
    override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame:frame,isPreview:isPreview)
        renderer = BattleBackgroundView(frame:bounds)
        renderer.autoresizingMask = [.width,.height]; addSubview(renderer)
    }
    required init?(coder: NSCoder) { return nil }
    override func startAnimation() { super.startAnimation(); renderer.start() }
    override func stopAnimation() { renderer.stop(); super.stopAnimation() }
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window == nil { renderer.stop() } else { renderer.start() }
    }
    override func hitTest(_ point: NSPoint) -> NSView? { self }
}
@objc(EarthboundConfigurationViewController)
class EarthboundConfigurationViewController: NSViewController {
    private var renderer: BattleBackgroundView!
    override func loadView() {
        renderer = BattleBackgroundView(frame:NSRect(x:0,y:0,width:900,height:700),controls:true)
        let container = NSView(frame: NSRect(x:0,y:0,width:900,height:744))
        renderer.frame = NSRect(x:0,y:44,width:900,height:700)
        renderer.autoresizingMask = [.width,.height]
        container.addSubview(renderer)
        let done = NSButton(title: "Done", target:self, action:#selector(done))
        done.frame = NSRect(x:796,y:8,width:90,height:28)
        done.bezelStyle = .rounded; done.keyEquivalent = "\r"
        done.autoresizingMask = [.minXMargin]
        container.addSubview(done)
        view = container
        preferredContentSize = NSSize(width:900,height:744)
    }
    @objc private func done() {
        renderer.stop()
        if let window = view.window, let parent = window.sheetParent { parent.endSheet(window) }
        else { dismiss(nil) }
    }
    override func viewDidAppear() { super.viewDidAppear(); renderer.start() }
    override func viewDidDisappear() { renderer.stop(); super.viewDidDisappear() }
}
