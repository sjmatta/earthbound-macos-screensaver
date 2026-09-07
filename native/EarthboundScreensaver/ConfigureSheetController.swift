import AppKit
import ScreenSaver

// The extension entitlements allow this explicit preferences domain. No global
// preferences changes or extension registration occur during build or preview.
enum SettingsStore {
    static let domain = "com.sjmatta.earthbound-screensaver"
    static var defaults: ScreenSaverDefaults { ScreenSaverDefaults(forModuleWithName: domain)! }
    static var values: [String: Any] {
        var result = defaults.dictionary(forKey: "rendererSettings") ?? [:]
        if result["interval"] == nil { result["interval"] = defaults.object(forKey: "interval") ?? 60 }
        if result["showLayerNames"] == nil { result["showLayerNames"] = defaults.object(forKey: "showLayerNames") ?? true }
        return result
    }
    static var json: String {
        guard let data = try? JSONSerialization.data(withJSONObject: values, options: [.sortedKeys]), let text = String(data: data, encoding: .utf8) else { return "{}" }
        return text
    }
    static func save(_ input: [String: Any]) {
        let keys = Set(["mode", "scale", "interval", "showLayerNames", "favoritesOnly", "favorites", "excluded"])
        var clean = input.filter { keys.contains($0.key) }
        clean["interval"] = min(300, max(5, (input["interval"] as? NSNumber)?.intValue ?? 60))
        defaults.set(clean, forKey: "rendererSettings")
        defaults.synchronize()
        DistributedNotificationCenter.default().postNotificationName(Notification.Name("com.sjmatta.earthbound-screensaver.settingsChanged"), object: nil, userInfo: nil, deliverImmediately: true)
    }
}

class ConfigureSheetController: NSObject {
    private var window: NSWindow!
    private var mode: NSPopUpButton!
    private var scale: NSPopUpButton!
    private var interval: NSTextField!
    private var names: NSButton!
    private var favorites: NSButton!
    var onSettingsChanged: (() -> Void)?
    func createConfigureSheet() -> NSWindow {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 440, height: 290), styleMask: [.titled], backing: .buffered, defer: false)
        window.title = "EarthBound Backgrounds"
        let content = window.contentView!, settings = SettingsStore.values
        func label(_ text: String, _ y: CGFloat) {
            let view = NSTextField(labelWithString: text); view.frame = NSRect(x: 24, y: y, width: 145, height: 24); content.addSubview(view)
        }
        label("Collection", 240)
        mode = NSPopUpButton(frame: NSRect(x: 170, y: 236, width: 240, height: 30)); mode.addItems(withTitles: ["Authentic pairings", "Remix"])
        mode.selectItem(at: settings["mode"] as? String == "remix" ? 1 : 0); content.addSubview(mode)
        label("Display", 202)
        scale = NSPopUpButton(frame: NSRect(x: 170, y: 198, width: 240, height: 30)); scale.addItems(withTitles: ["4:3 display", "Source pixels", "Fill screen"])
        scale.selectItem(at: ["4:3", "pixels", "fill"].firstIndex(of: settings["scale"] as? String ?? "4:3") ?? 0); content.addSubview(scale)
        label("Change interval (sec)", 160)
        interval = NSTextField(frame: NSRect(x: 170, y: 158, width: 80, height: 24)); interval.integerValue = (settings["interval"] as? NSNumber)?.intValue ?? 60; content.addSubview(interval)
        names = NSButton(checkboxWithTitle: "Show background names", target: nil, action: nil); names.frame = NSRect(x: 24, y: 115, width: 280, height: 24); names.state = settings["showLayerNames"] as? Bool == false ? .off : .on; content.addSubview(names)
        favorites = NSButton(checkboxWithTitle: "Favorites only (choose in the preview app)", target: nil, action: nil); favorites.frame = NSRect(x: 24, y: 82, width: 390, height: 24); favorites.state = settings["favoritesOnly"] as? Bool == true ? .on : .off; content.addSubview(favorites)
        let cancel = NSButton(title: "Cancel", target: self, action: #selector(cancel)); cancel.frame = NSRect(x: 245, y: 20, width: 80, height: 32); cancel.bezelStyle = .rounded; cancel.keyEquivalent = "\u{1b}"; content.addSubview(cancel)
        let save = NSButton(title: "Save", target: self, action: #selector(save)); save.frame = NSRect(x: 335, y: 20, width: 80, height: 32); save.bezelStyle = .rounded; save.keyEquivalent = "\r"; content.addSubview(save)
        return window
    }
    @objc private func cancel() { if let parent = window.sheetParent { parent.endSheet(window) } else { window.close() } }
    @objc private func save() {
        var settings = SettingsStore.values
        settings["mode"] = mode.indexOfSelectedItem == 1 ? "remix" : "authentic"
        settings["scale"] = ["4:3", "pixels", "fill"][scale.indexOfSelectedItem]
        settings["interval"] = min(300,max(5,interval.integerValue))
        settings["showLayerNames"] = names.state == .on
        settings["favoritesOnly"] = favorites.state == .on
        SettingsStore.save(settings); onSettingsChanged?(); cancel()
    }
}
