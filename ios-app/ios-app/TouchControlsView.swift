import SwiftUI

#if !os(tvOS)
struct TouchControlsView: View {
    @Bindable var engine: GameEngine
    @State private var held: Set<Axis> = []

    private enum Axis: Hashable {
        case up, down, left, right
    }

    private let buttonSize: CGFloat = 72

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                VStack(spacing: 10) {
                    axisButton("↑", .up)
                    HStack(spacing: 10) {
                        axisButton("←", .left)
                        axisButton("→", .right)
                    }
                    axisButton("↓", .down)
                }
                .padding(.trailing, 18)
                .padding(.bottom, 28)
            }
        }
        // Empty areas must not steal touches from the game / chrome.
        .allowsHitTesting(true)
        .onDisappear {
            held.removeAll()
            engine.touchInput = MoveInput()
        }
    }

    private func axisButton(_ label: String, _ axis: Axis) -> some View {
        Text(label)
            .font(.system(size: 30, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: buttonSize, height: buttonSize)
            .background(Color.white.opacity(held.contains(axis) ? 0.32 : 0.2), in: RoundedRectangle(cornerRadius: 14))
            // Critical: without this, only the glyph is tappable — not the full button.
            .contentShape(Rectangle())
            .highPriorityGesture(
                DragGesture(minimumDistance: 0, coordinateSpace: .local)
                    .onChanged { _ in setHeld(axis, true) }
                    .onEnded { _ in setHeld(axis, false) }
            )
            .accessibilityLabel(label)
    }

    private func setHeld(_ axis: Axis, _ down: Bool) {
        if down {
            held.insert(axis)
        } else {
            held.remove(axis)
        }
        var dx: CGFloat = 0
        var dy: CGFloat = 0
        if held.contains(.left) { dx -= 1 }
        if held.contains(.right) { dx += 1 }
        if held.contains(.up) { dy -= 1 }
        if held.contains(.down) { dy += 1 }
        engine.touchInput = MoveInput(dx: dx, dy: dy)
    }
}
#endif
