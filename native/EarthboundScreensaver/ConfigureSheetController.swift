//
//  ConfigureSheetController.swift
//  EarthboundScreensaver
//
//  Configuration sheet for screensaver options
//

import AppKit
import ScreenSaver

class ConfigureSheetController: NSObject {

    // MARK: - Properties

    private var window: NSWindow!
    private var intervalTextField: NSTextField!
    private var intervalStepper: NSStepper!

    private let defaults = ScreenSaverDefaults(forModuleWithName: "com.sjmatta.earthbound-screensaver")!

    // Default values
    static let defaultInterval: Int = 60
    static let minInterval: Int = 5
    static let maxInterval: Int = 300

    // MARK: - Public Interface

    var interval: Int {
        get {
            let value = defaults.integer(forKey: "interval")
            return value > 0 ? value : ConfigureSheetController.defaultInterval
        }
        set {
            defaults.set(newValue, forKey: "interval")
            defaults.synchronize()
        }
    }

    // MARK: - Window Creation

    func createConfigureSheet() -> NSWindow {
        // Create window
        let contentRect = NSRect(x: 0, y: 0, width: 320, height: 120)
        window = NSWindow(
            contentRect: contentRect,
            styleMask: [.titled],
            backing: .buffered,
            defer: false
        )
        window.title = "Earthbound Screensaver Options"

        guard let contentView = window.contentView else { return window }

        // Create UI elements
        let margin: CGFloat = 20
        let labelWidth: CGFloat = 140
        let controlWidth: CGFloat = 80
        let rowHeight: CGFloat = 24

        // Interval label
        let intervalLabel = NSTextField(labelWithString: "Change interval:")
        intervalLabel.frame = NSRect(x: margin, y: 70, width: labelWidth, height: rowHeight)
        intervalLabel.alignment = .right
        contentView.addSubview(intervalLabel)

        // Interval text field
        intervalTextField = NSTextField(frame: NSRect(x: margin + labelWidth + 10, y: 70, width: 50, height: rowHeight))
        intervalTextField.integerValue = interval
        intervalTextField.formatter = createNumberFormatter()
        intervalTextField.target = self
        intervalTextField.action = #selector(intervalTextChanged(_:))
        contentView.addSubview(intervalTextField)

        // Interval stepper
        intervalStepper = NSStepper(frame: NSRect(x: margin + labelWidth + 65, y: 70, width: 19, height: rowHeight))
        intervalStepper.minValue = Double(ConfigureSheetController.minInterval)
        intervalStepper.maxValue = Double(ConfigureSheetController.maxInterval)
        intervalStepper.increment = 5
        intervalStepper.integerValue = interval
        intervalStepper.target = self
        intervalStepper.action = #selector(intervalStepperChanged(_:))
        contentView.addSubview(intervalStepper)

        // Seconds label
        let secondsLabel = NSTextField(labelWithString: "seconds")
        secondsLabel.frame = NSRect(x: margin + labelWidth + 90, y: 70, width: 60, height: rowHeight)
        contentView.addSubview(secondsLabel)

        // Buttons
        let buttonWidth: CGFloat = 80
        let buttonHeight: CGFloat = 32
        let buttonY: CGFloat = 15

        // Cancel button
        let cancelButton = NSButton(frame: NSRect(x: contentRect.width - margin - buttonWidth * 2 - 10, y: buttonY, width: buttonWidth, height: buttonHeight))
        cancelButton.title = "Cancel"
        cancelButton.bezelStyle = .rounded
        cancelButton.target = self
        cancelButton.action = #selector(cancelClicked(_:))
        cancelButton.keyEquivalent = "\u{1b}" // Escape key
        contentView.addSubview(cancelButton)

        // OK button
        let okButton = NSButton(frame: NSRect(x: contentRect.width - margin - buttonWidth, y: buttonY, width: buttonWidth, height: buttonHeight))
        okButton.title = "OK"
        okButton.bezelStyle = .rounded
        okButton.target = self
        okButton.action = #selector(okClicked(_:))
        okButton.keyEquivalent = "\r" // Return key
        contentView.addSubview(okButton)

        return window
    }

    // MARK: - Private Helpers

    private func createNumberFormatter() -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .none
        formatter.minimum = NSNumber(value: ConfigureSheetController.minInterval)
        formatter.maximum = NSNumber(value: ConfigureSheetController.maxInterval)
        return formatter
    }

    // MARK: - Actions

    @objc private func intervalTextChanged(_ sender: NSTextField) {
        var value = sender.integerValue
        value = max(ConfigureSheetController.minInterval, min(ConfigureSheetController.maxInterval, value))
        intervalStepper.integerValue = value
    }

    @objc private func intervalStepperChanged(_ sender: NSStepper) {
        intervalTextField.integerValue = sender.integerValue
    }

    @objc private func cancelClicked(_ sender: NSButton) {
        // Reset to saved values
        intervalTextField.integerValue = interval
        intervalStepper.integerValue = interval

        // Close sheet
        if let sheetParent = window.sheetParent {
            sheetParent.endSheet(window)
        }
    }

    @objc private func okClicked(_ sender: NSButton) {
        // Save values
        interval = intervalTextField.integerValue

        // Close sheet
        if let sheetParent = window.sheetParent {
            sheetParent.endSheet(window)
        }
    }
}
