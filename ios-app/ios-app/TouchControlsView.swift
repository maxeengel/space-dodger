import SwiftUI

#if !os(tvOS)
struct TouchControlsView: View {
    @Bindable var engine: GameEngine

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                VStack(spacing: 8) {
                    axisButton("↑", press: { engine.touchInput = MoveInput(dx: engine.touchInput.dx, dy: -1) },
                               release: { if engine.touchInput.dy < 0 { engine.touchInput = MoveInput(dx: engine.touchInput.dx, dy: 0) } })
                    HStack(spacing: 8) {
                        axisButton("←", press: { engine.touchInput = MoveInput(dx: -1, dy: engine.touchInput.dy) },
                                   release: { if engine.touchInput.dx < 0 { engine.touchInput = MoveInput(dx: 0, dy: engine.touchInput.dy) } })
                        axisButton("→", press: { engine.touchInput = MoveInput(dx: 1, dy: engine.touchInput.dy) },
                                   release: { if engine.touchInput.dx > 0 { engine.touchInput = MoveInput(dx: 0, dy: engine.touchInput.dy) } })
                    }
                    axisButton("↓", press: { engine.touchInput = MoveInput(dx: engine.touchInput.dx, dy: 1) },
                               release: { if engine.touchInput.dy > 0 { engine.touchInput = MoveInput(dx: engine.touchInput.dx, dy: 0) } })
                }
                .padding(16)
            }
        }
    }

    private func axisButton(_ label: String, press: @escaping () -> Void, release: @escaping () -> Void) -> some View {
        Text(label)
            .font(.system(size: 28, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 56, height: 56)
            .background(Color.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 12))
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in press() }
                    .onEnded { _ in release() }
            )
    }
}
#endif
