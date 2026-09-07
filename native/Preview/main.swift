import AppKit
final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var renderer: BattleBackgroundView!
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu(), item = NSMenuItem(), appMenu = NSMenu()
        appMenu.addItem(withTitle: "Quit EarthBound", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        item.submenu = appMenu; menu.addItem(item); NSApp.mainMenu = menu
        window = NSWindow(contentRect: NSRect(x:0,y:0,width:1100,height:850),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
        window.title = "EarthBound — Background Studio"
        window.minSize = NSSize(width:700,height:550)
        renderer = BattleBackgroundView(frame:window.contentView!.bounds,controls:true)
        renderer.autoresizingMask = [.width,.height]
        window.contentView!.addSubview(renderer); window.delegate = self
        window.center(); window.makeKeyAndOrderFront(nil); renderer.start()
        NSApp.activate(ignoringOtherApps:true)
    }
    func windowDidMiniaturize(_ notification: Notification) { renderer.stop() }
    func windowDidDeminiaturize(_ notification: Notification) { renderer.start() }
    func windowWillClose(_ notification: Notification) { renderer.stop() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
