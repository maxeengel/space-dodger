import Foundation
import GameController

@MainActor
final class ControllerInputManager {
    weak var engine: GameEngine?

    private var observers: [Any] = []

    func start() {
        stop()
        let connect = NotificationCenter.default.addObserver(
            forName: .GCControllerDidConnect,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.bindControllers() }
        }
        let disconnect = NotificationCenter.default.addObserver(
            forName: .GCControllerDidDisconnect,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.bindControllers() }
        }
        observers = [connect, disconnect]
        GCController.startWirelessControllerDiscovery {}
        bindControllers()
    }

    func stop() {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers = []
        for controller in GCController.controllers() {
            controller.extendedGamepad?.valueChangedHandler = nil
            controller.microGamepad?.valueChangedHandler = nil
        }
    }

    private func bindControllers() {
        guard let engine else { return }
        let controllers = GCController.controllers()
        if controllers.isEmpty {
            engine.padDisplayName = ""
            engine.controllerInput = MoveInput()
            engine.controllerSelectPressed = false
            engine.controllerPausePressed = false
            return
        }

        for controller in controllers {
            let name = shortName(for: controller)
            engine.padDisplayName = name

            if let pad = controller.extendedGamepad {
                pad.valueChangedHandler = { [weak engine] pad, _ in
                    guard let engine else { return }
                    var dx = CGFloat(pad.leftThumbstick.xAxis.value)
                    var dy = CGFloat(-pad.leftThumbstick.yAxis.value)
                    if abs(dx) < GameConfig.deadzone { dx = 0 }
                    if abs(dy) < GameConfig.deadzone { dy = 0 }

                    if pad.dpad.left.isPressed { dx = -1 }
                    if pad.dpad.right.isPressed { dx = 1 }
                    if pad.dpad.up.isPressed { dy = -1 }
                    if pad.dpad.down.isPressed { dy = 1 }

                    engine.controllerInput = MoveInput(dx: dx, dy: dy)
                    engine.controllerSelectPressed =
                        pad.buttonA.isPressed || pad.buttonB.isPressed || pad.buttonX.isPressed
                    engine.controllerPausePressed =
                        pad.buttonMenu.isPressed || pad.buttonOptions?.isPressed == true
                }
            } else if let micro = controller.microGamepad {
                // Siri Remote / Apple TV remote
                micro.reportsAbsoluteDpadValues = true
                micro.allowsRotation = true
                micro.valueChangedHandler = { [weak engine] pad, _ in
                    guard let engine else { return }
                    var dx = CGFloat(pad.dpad.xAxis.value)
                    var dy = CGFloat(-pad.dpad.yAxis.value)
                    if abs(dx) < GameConfig.deadzone { dx = 0 }
                    if abs(dy) < GameConfig.deadzone { dy = 0 }
                    engine.controllerInput = MoveInput(dx: dx, dy: dy)
                    engine.controllerSelectPressed = pad.buttonA.isPressed
                    engine.controllerPausePressed = pad.buttonMenu.isPressed
                }
            }
        }
    }

    private func shortName(for controller: GCController) -> String {
        let raw = controller.vendorName ?? controller.productCategory
        if raw.localizedCaseInsensitiveContains("magicsee") || raw.localizedCaseInsensitiveContains("r1") {
            return "Magicsee R1"
        }
        if raw.localizedCaseInsensitiveContains("siri") || raw.localizedCaseInsensitiveContains("remote") {
            return "Siri Remote"
        }
        return String(raw.prefix(22))
    }
}
