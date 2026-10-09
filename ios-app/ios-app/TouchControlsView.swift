import SwiftUI

#if !os(tvOS)
import UIKit

/// On-screen D-pad. Uses UIKit buttons so presses survive SwiftUI re-renders
/// from the 60fps `@Observable` game tick (DragGesture gets cancelled otherwise).
struct TouchControlsView: View {
    let engine: GameEngine

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                TouchDPadRepresentable { input in
                    engine.touchInput = input
                }
                .frame(width: TouchDPadView.totalWidth, height: TouchDPadView.totalHeight)
                .padding(.trailing, 18)
                .padding(.bottom, 28)
            }
        }
        .onDisappear {
            engine.touchInput = MoveInput()
        }
    }
}

private struct TouchDPadRepresentable: UIViewRepresentable {
    var onChange: (MoveInput) -> Void

    func makeUIView(context: Context) -> TouchDPadView {
        let view = TouchDPadView()
        view.onChange = onChange
        return view
    }

    func updateUIView(_ uiView: TouchDPadView, context: Context) {
        uiView.onChange = onChange
    }
}

private final class TouchDPadView: UIView {
    static let buttonSize: CGFloat = 72
    static let spacing: CGFloat = 10
    static var totalWidth: CGFloat { buttonSize * 2 + spacing }
    static var totalHeight: CGFloat { buttonSize * 3 + spacing * 2 }

    var onChange: ((MoveInput) -> Void)?

    private enum Axis: Int {
        case up, down, left, right
    }

    private var held: Set<Axis> = []

    override init(frame: CGRect) {
        super.init(frame: frame)
        isMultipleTouchEnabled = true
        backgroundColor = .clear

        let size = Self.buttonSize
        let gap = Self.spacing
        let midX = (Self.totalWidth - size) / 2

        addSubview(makeButton(title: "↑", axis: .up, frame: CGRect(x: midX, y: 0, width: size, height: size)))
        addSubview(makeButton(title: "←", axis: .left, frame: CGRect(x: 0, y: size + gap, width: size, height: size)))
        addSubview(makeButton(title: "→", axis: .right, frame: CGRect(x: size + gap, y: size + gap, width: size, height: size)))
        addSubview(makeButton(title: "↓", axis: .down, frame: CGRect(x: midX, y: (size + gap) * 2, width: size, height: size)))
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func makeButton(title: String, axis: Axis, frame: CGRect) -> UIButton {
        var config = UIButton.Configuration.plain()
        config.title = title
        config.baseForegroundColor = .white
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = .systemFont(ofSize: 30, weight: .bold)
            return outgoing
        }
        config.background.backgroundColor = UIColor.white.withAlphaComponent(0.2)
        config.background.cornerRadius = 14

        let button = UIButton(configuration: config)
        button.frame = frame
        button.tag = axis.rawValue
        button.addTarget(self, action: #selector(pressDown(_:)), for: .touchDown)
        button.addTarget(self, action: #selector(pressDown(_:)), for: .touchDragEnter)
        button.addTarget(self, action: #selector(pressUp(_:)), for: .touchUpInside)
        button.addTarget(self, action: #selector(pressUp(_:)), for: .touchUpOutside)
        button.addTarget(self, action: #selector(pressUp(_:)), for: .touchCancel)
        button.addTarget(self, action: #selector(pressUp(_:)), for: .touchDragExit)
        button.accessibilityLabel = title
        return button
    }

    @objc private func pressDown(_ sender: UIButton) {
        guard let axis = Axis(rawValue: sender.tag) else { return }
        held.insert(axis)
        refreshAppearance(sender, pressed: true)
        emit()
    }

    @objc private func pressUp(_ sender: UIButton) {
        guard let axis = Axis(rawValue: sender.tag) else { return }
        held.remove(axis)
        refreshAppearance(sender, pressed: false)
        emit()
    }

    private func refreshAppearance(_ button: UIButton, pressed: Bool) {
        button.configuration?.background.backgroundColor =
            UIColor.white.withAlphaComponent(pressed ? 0.32 : 0.2)
    }

    private func emit() {
        var dx: CGFloat = 0
        var dy: CGFloat = 0
        if held.contains(.left) { dx -= 1 }
        if held.contains(.right) { dx += 1 }
        if held.contains(.up) { dy -= 1 }
        if held.contains(.down) { dy += 1 }
        onChange?(MoveInput(dx: dx, dy: dy))
    }
}
#endif
