import SwiftUI

struct ContentView: View {
    @State private var engine = GameEngine()
    @State private var controllers = ControllerInputManager()

    var body: some View {
        ZStack {
            Color(red: 0.02, green: 0.03, blue: 0.06)
                .ignoresSafeArea()

            GameCanvas(engine: engine)
                .ignoresSafeArea(edges: .bottom)

            #if !os(tvOS)
            if engine.state == .playing || engine.state == .paused {
                TouchControlsView(engine: engine)
            }
            #endif

            if engine.state == .menu || engine.state == .over {
                menuOverlay
            }

            #if !os(tvOS)
            if engine.state == .playing || engine.state == .paused {
                topButtons
            }
            #endif
        }
        #if os(iOS)
        .statusBarHidden()
        .persistentSystemOverlays(.hidden)
        #endif
        .onAppear {
            controllers.engine = engine
            controllers.start()
        }
        .onDisappear {
            controllers.stop()
        }
        #if os(tvOS)
        .onPlayPauseCommand {
            if engine.state == .playing || engine.state == .paused {
                engine.togglePause()
            } else if engine.state == .menu || engine.state == .over {
                engine.startGame()
            }
        }
        .onMoveCommand { direction in
            guard engine.state == .playing else { return }
            switch direction {
            case .up: engine.controllerInput = MoveInput(dx: 0, dy: -1)
            case .down: engine.controllerInput = MoveInput(dx: 0, dy: 1)
            case .left: engine.controllerInput = MoveInput(dx: -1, dy: 0)
            case .right: engine.controllerInput = MoveInput(dx: 1, dy: 0)
            @unknown default: break
            }
            // Clear after a short hold so continuous remote nudges don't stick forever
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                if !engine.controllerSelectPressed {
                    engine.controllerInput = MoveInput()
                }
            }
        }
        .onExitCommand {
            if engine.state == .playing {
                engine.togglePause()
            } else if engine.state == .paused || engine.state == .over {
                engine.resetToMenu()
            }
        }
        #endif
    }

    private var menuOverlay: some View {
        VStack(spacing: 20) {
            Text("Space Dodger")
                .font(.system(size: titleSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            Text(subtitle)
                .font(.system(size: 18))
                .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Text("Rekord: \(engine.highScore)")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color(red: 0.29, green: 0.87, blue: 0.50))

            Button(action: { engine.startGame() }) {
                Text(engine.state == .over ? "Prøv igjen" : "Start spill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .padding(.horizontal, 36)
                    .padding(.vertical, 14)
                    .background(Color(red: 0.37, green: 0.92, blue: 0.83), in: Capsule())
            }
            .buttonStyle(.plain)

            Text(controlsHint)
                .font(.system(size: 14))
                .foregroundStyle(Color(red: 0.45, green: 0.51, blue: 0.58))
                .multilineTextAlignment(.center)
                .padding(.top, 8)
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(red: 0.06, green: 0.09, blue: 0.16).opacity(0.92))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
        )
        .padding(24)
    }

    #if !os(tvOS)
    private var topButtons: some View {
        VStack {
            HStack {
                Spacer()
                Button(engine.state == .paused ? "Fortsett" : "Pause") {
                    engine.togglePause()
                }
                .buttonStyle(CanvasChromeButton())
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            Spacer()
        }
    }
    #endif

    private var subtitle: String {
        if engine.state == .over {
            return "Poeng: \(engine.score)"
        }
        #if os(tvOS)
        return "Styr raketten med Siri Remote eller spillkontroll"
        #else
        return "Samle soler, unngå asteroider"
        #endif
    }

    private var controlsHint: String {
        #if os(tvOS)
        return "Touch-flate: flytt · A / klikk: start · Play/Pause: pause"
        #else
        return "Piler nederst til høyre · Spillkontroll støttes"
        #endif
    }

    private var titleSize: CGFloat {
        #if os(tvOS)
        return 56
        #else
        return 36
        #endif
    }
}

#if !os(tvOS)
private struct CanvasChromeButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color.white.opacity(configuration.isPressed ? 0.28 : 0.18), in: Capsule())
    }
}
#endif

#Preview {
    ContentView()
}
