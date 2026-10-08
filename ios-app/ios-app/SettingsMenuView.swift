import SwiftUI

struct SettingsMenuView: View {
    @Bindable var engine: GameEngine
    @Bindable var language: AppLanguage
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    guideSection
                    goalSection
                    noteSection
                }
                .padding(20)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.04, green: 0.06, blue: 0.12).ignoresSafeArea())
            .navigationTitle(language.t("settings"))
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.t("close")) { close() }
                }
            }
        }
        #if os(tvOS)
        .frame(maxWidth: 900)
        #endif
    }

    private var guideSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionTitle(language.t("guideTitle"))

            #if os(tvOS)
            guideBlock(title: language.t("guideTv"), rows: [
                (language.t("guideTvMoveKey"), language.t("guideTvMove")),
                (language.t("guideTvStartKey"), language.t("guideTvStart")),
                (language.t("guideTvPauseKey"), language.t("guideTvPause")),
                (language.t("guideTvBackKey"), language.t("guideTvBack")),
            ])
            #else
            guideBlock(title: language.t("guideScreen"), rows: [
                (language.t("guideArrowsKey"), language.t("guideArrows")),
                (language.t("guidePauseKey"), language.t("guidePause")),
                (language.t("guideGearKey"), language.t("guideGear")),
            ])
            #endif

            guideBlock(title: language.t("guidePad"), rows: [
                (language.t("guideJoyKey"), language.t("guideJoy")),
                (language.t("guideStartKey"), language.t("guideStart")),
                (language.t("guideMenuKey"), language.t("guidePadPause")),
            ])
        }
    }

    private var goalSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionTitle(language.t("goalTitle"))
            guideBlock(title: nil, rows: [
                (language.t("goalSunsKey"), language.t("goalSuns")),
                (language.t("goalAstKey"), language.t("goalAst")),
                (language.t("goal600Key"), language.t("goal600")),
                (language.t("goal900Key"), language.t("goal900")),
                (language.t("goal1500Key"), language.t("goal1500")),
                (language.t("goal1800Key"), language.t("goal1800")),
            ])
        }
    }

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(language.t("r1Note"))
                .font(.footnote)
                .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(panelBackground)

            Button {
                language.cycle()
            } label: {
                HStack {
                    Text("🌍 \(language.lang.shortCode)")
                        .font(.system(size: 22, weight: .semibold))
                    Text(language.t("globeTitle") + ": " + language.lang.label)
                        .font(.subheadline.weight(.medium))
                    Spacer()
                }
                .foregroundStyle(.white)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(panelBackground)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(language.t("globeTitle"))

            Text("\(language.t("high")): \(engine.highScore)")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color(red: 0.29, green: 0.87, blue: 0.50))
                .padding(.horizontal, 4)
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.title3.weight(.bold))
            .foregroundStyle(.white)
    }

    private func guideBlock(title: String?, rows: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if let title {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Color(red: 0.37, green: 0.92, blue: 0.83))
            }
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(alignment: .top, spacing: 12) {
                    Text(row.0)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.37, green: 0.92, blue: 0.83).opacity(0.9), in: RoundedRectangle(cornerRadius: 6))
                    Text(row.1)
                        .font(.subheadline)
                        .foregroundStyle(Color(red: 0.89, green: 0.91, blue: 0.94))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(panelBackground)
    }

    private var panelBackground: some View {
        RoundedRectangle(cornerRadius: 14)
            .fill(Color.white.opacity(0.06))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }

    private func close() {
        isPresented = false
    }
}
