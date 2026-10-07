import SwiftUI

struct SettingsMenuView: View {
    @Bindable var engine: GameEngine
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    settingsSection
                    guideSection
                    goalSection
                    noteSection
                }
                .padding(20)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.04, green: 0.06, blue: 0.12).ignoresSafeArea())
            .navigationTitle("Innstillinger")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Lukk") { close() }
                }
            }
        }
        #if os(tvOS)
        .frame(maxWidth: 900)
        #endif
    }

    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionTitle("Kontroller")

            HStack(spacing: 10) {
                Circle()
                    .fill(engine.padDisplayName.isEmpty
                          ? Color(red: 0.39, green: 0.45, blue: 0.55)
                          : Color(red: 0.29, green: 0.87, blue: 0.50))
                    .frame(width: 10, height: 10)
                Text(engine.padDisplayName.isEmpty ? "Ingen spillkontroll tilkoblet" : engine.padDisplayName)
                    .foregroundStyle(Color(red: 0.89, green: 0.91, blue: 0.94))
                Spacer()
            }
            .padding(14)
            .background(panelBackground)

            #if !os(tvOS)
            Toggle(isOn: $engine.showTouchArrows) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Piler på skjermen")
                        .foregroundStyle(.white)
                    Text("Vis styringspiler nederst til høyre under spill")
                        .font(.caption)
                        .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                }
            }
            .tint(Color(red: 0.37, green: 0.92, blue: 0.83))
            .padding(14)
            .background(panelBackground)
            #endif
        }
    }

    private var guideSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionTitle("Knappguide")

            #if os(tvOS)
            guideBlock(title: "Apple TV / Siri Remote", rows: [
                ("Touch-flate / piltaster", "Flytt raketten"),
                ("A / klikk", "Start og prøv igjen"),
                ("Play/Pause", "Pause og fortsett"),
                ("Menu / Tilbake", "Pause eller tilbake til meny"),
            ])
            #else
            guideBlock(title: "På skjermen", rows: [
                ("Piler", "Flytt raketten (nedre høyre hjørne)"),
                ("Pause", "Pause og fortsett"),
                ("Gir ⚙️", "Åpne denne menyen"),
            ])
            #endif

            guideBlock(title: "Spillkontroll / Magicsee R1", rows: [
                ("Joystick", "Flytt raketten"),
                ("A / knapper", "Start og prøv igjen"),
                ("Menu", "Pause og fortsett"),
            ])
        }
    }

    private var goalSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            sectionTitle("Spillmål")
            guideBlock(title: nil, rows: [
                ("Gule soler", "Samle for +10 poeng"),
                ("Asteroider", "Unngå dem – du har 3 liv"),
                ("600 poeng", "Power-ups: skjold, pistol og magnet"),
                ("900 poeng", "Romvesener på oransje UFO skyter laser"),
                ("1500 poeng", "Alt går raskere + større blå UFO-er"),
                ("1800 poeng", "Opptil 5 romvesener om gangen"),
            ])
        }
    }

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Magicsee R1 må være i spillmodus: slå av, hold M+B, slå på. Hvis volum endres på Mac/iPhone, start R1 på nytt i spillmodus.")
                .font(.footnote)
                .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(panelBackground)

            Text("Rekord: \(engine.highScore)")
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
