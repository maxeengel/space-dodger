import SwiftUI

struct ContentView: View {
    @State private var engine = GameEngine()
    @State private var shop = ShopStore()
    @State private var language = AppLanguage()
    @State private var controllers = ControllerInputManager()
    @State private var showSettings = false
    @State private var showShop = false
    @State private var pausedForSettings = false
    @State private var bgm = BackgroundMusic.shared

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

            topChrome
        }
        #if os(iOS)
        .statusBarHidden()
        .persistentSystemOverlays(.hidden)
        #endif
        .sheet(isPresented: $showSettings, onDismiss: resumeAfterSettings) {
            SettingsMenuView(engine: engine, language: language, isPresented: $showSettings)
                #if os(iOS)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                #endif
        }
        .sheet(isPresented: $showShop) {
            ShopView(shop: shop, language: language, isPresented: $showShop)
                #if os(iOS)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                #endif
        }
        .onAppear {
            engine.shop = shop
            controllers.engine = engine
            controllers.start()
        }
        .onDisappear {
            controllers.stop()
            bgm.stop()
        }
        .onChange(of: engine.state) { _, newState in
            switch newState {
            case .playing:
                bgm.start()
            case .menu:
                bgm.stop()
            case .paused, .over:
                break
            }
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
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                if !engine.controllerSelectPressed {
                    engine.controllerInput = MoveInput()
                }
            }
        }
        .onExitCommand {
            if showSettings {
                showSettings = false
            } else if engine.state == .playing {
                engine.togglePause()
            } else if engine.state == .paused || engine.state == .over {
                engine.resetToMenu()
            }
        }
        #endif
    }

    private var topChrome: some View {
        VStack {
            HStack(spacing: 10) {
                Button {
                    openSettings()
                } label: {
                    Image(systemName: "gearshape.fill")
                        .font(.system(size: gearIconSize, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: gearButtonSize, height: gearButtonSize)
                        .background(Color.white.opacity(0.18), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(language.t("settings"))

                Spacer()

                #if !os(tvOS)
                if engine.state == .playing || engine.state == .paused {
                    Button(bgm.isMuted ? language.t("musicOff") : language.t("musicOn")) {
                        bgm.toggleMute()
                    }
                    .buttonStyle(CanvasChromeButton())
                    .opacity(bgm.isMuted ? 0.55 : 1)

                    Button(engine.state == .paused ? language.t("resume") : language.t("pause")) {
                        engine.togglePause()
                    }
                    .buttonStyle(CanvasChromeButton())
                }
                #endif
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            Spacer()
        }
    }

    private var menuOverlay: some View {
        VStack(spacing: 20) {
            Text(engine.state == .menu ? language.t("welcome") : language.t("gameOver"))
                .font(.system(size: titleSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(subtitle)
                .font(.system(size: 18))
                .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Text("\(language.t("high")): \(engine.highScore)")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color(red: 0.29, green: 0.87, blue: 0.50))

            Button(action: { engine.startGame() }) {
                Text(engine.state == .over ? language.t("tryAgain") : language.t("start"))
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .padding(.horizontal, 36)
                    .padding(.vertical, 14)
                    .background(Color(red: 0.37, green: 0.92, blue: 0.83), in: Capsule())
            }
            .buttonStyle(.plain)

            if engine.state == .over {
                Button {
                    showShop = true
                } label: {
                    Label(language.t("shopBtn"), systemImage: "cart.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .padding(.horizontal, 28)
                        .padding(.vertical, 12)
                        .background(Color(red: 0.98, green: 0.75, blue: 0.14), in: Capsule())
                }
                .buttonStyle(.plain)
            }

            Button {
                openSettings()
            } label: {
                Label(language.t("guideLink"), systemImage: "gearshape")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color(red: 0.89, green: 0.91, blue: 0.94))
            }
            .buttonStyle(.plain)
            .padding(.top, 4)

            Text(controlsHint)
                .font(.system(size: 14))
                .foregroundStyle(Color(red: 0.45, green: 0.51, blue: 0.58))
                .multilineTextAlignment(.center)
                .padding(.top, 4)
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

    private func openSettings() {
        if engine.state == .playing {
            engine.togglePause()
            pausedForSettings = true
        }
        showSettings = true
    }

    private func resumeAfterSettings() {
        if pausedForSettings && engine.state == .paused {
            engine.togglePause()
        }
        pausedForSettings = false
    }

    private var subtitle: String {
        if engine.state == .over {
            return "\(language.t("score")): \(engine.score)"
        }
        #if os(tvOS)
        return language.t("subtitleTv")
        #else
        return language.t("subtitle")
        #endif
    }

    private var controlsHint: String {
        #if os(tvOS)
        return language.t("hintTv")
        #else
        return language.t("hint")
        #endif
    }

    private var titleSize: CGFloat {
        #if os(tvOS)
        return 56
        #else
        return 36
        #endif
    }

    private var gearIconSize: CGFloat {
        #if os(tvOS)
        return 28
        #else
        return 18
        #endif
    }

    private var gearButtonSize: CGFloat {
        #if os(tvOS)
        return 64
        #else
        return 40
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
