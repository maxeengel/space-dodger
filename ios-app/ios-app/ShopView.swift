import SwiftUI

struct ShopView: View {
    @Bindable var shop: ShopStore
    @Bindable var language: AppLanguage
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(language.t("shopIntro"))
                        .font(.subheadline)
                        .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))

                    Text("\(language.t("shopBalance")) \(shop.money)")
                        .font(.headline)
                        .foregroundStyle(Color(red: 0.37, green: 0.92, blue: 0.83))

                    if !shop.message.isEmpty {
                        Text(shop.message)
                            .font(.footnote)
                            .foregroundStyle(shop.messageIsError
                                             ? Color(red: 0.97, green: 0.44, blue: 0.44)
                                             : Color(red: 0.29, green: 0.87, blue: 0.50))
                    }

                    sectionLabel(language.t("shopColors"))
                    ForEach(ShopStore.rockets) { item in
                        rocketRow(item)
                    }

                    sectionLabel(language.t("shopUpgrades"))
                    pilotRow

                    sectionLabel(language.t("shopConsumables"))
                    bonusLifeRow
                }
                .padding(20)
                .frame(maxWidth: 720, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.04, green: 0.06, blue: 0.12).ignoresSafeArea())
            .navigationTitle(language.t("shopTitle"))
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.t("shopClose")) {
                        shop.message = ""
                        isPresented = false
                    }
                }
            }
        }
        #if os(tvOS)
        .frame(maxWidth: 900)
        #endif
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.title3.weight(.bold))
            .foregroundStyle(.white)
            .padding(.top, 8)
    }

    private func rocketRow(_ item: RocketItem) -> some View {
        let owned = shop.owned.contains(item.id)
        let equipped = shop.equippedRocketId == item.id
        return HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: item.body), Color(hex: item.accent)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(language.t(item.nameKey))
                    .foregroundStyle(.white)
                    .font(.subheadline.weight(.semibold))
                Text(priceText(item.price, owned: owned))
                    .font(.caption)
                    .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                Text(equipped ? language.t("shopEquippedNow") : (owned ? language.t("shopOwnedHint") : language.t("shopColorTag")))
                    .font(.caption2)
                    .foregroundStyle(Color(red: 0.45, green: 0.51, blue: 0.58))
            }

            Spacer()

            Button(equipped ? language.t("shopEquipped") : (owned ? language.t("shopUse") : language.t("shopBuy"))) {
                shop.buyOrEquipRocket(item, language: language)
            }
            .disabled(equipped)
            .buttonStyle(ShopActionButton(primary: !owned && !equipped))
        }
        .padding(12)
        .background(rowBackground(equipped: equipped))
    }

    private var pilotRow: some View {
        let owned = shop.owned.contains(ShopStore.pilotId)
        let equipped = shop.pilotEquipped
        return HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(red: 0.12, green: 0.29, blue: 0.43))
                    .frame(width: 36, height: 36)
                Text("🧑‍🚀")
                    .font(.system(size: 18))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(language.t("pilotName"))
                    .foregroundStyle(.white)
                    .font(.subheadline.weight(.semibold))
                Text(priceText(ShopStore.pilotPrice, owned: owned))
                    .font(.caption)
                    .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                Text(equipped ? language.t("shopPilotActive") : (owned ? language.t("shopPilotOwned") : language.t("pilotDesc")))
                    .font(.caption2)
                    .foregroundStyle(Color(red: 0.45, green: 0.51, blue: 0.58))
                    .lineLimit(2)
            }

            Spacer()

            Button(equipped ? language.t("shopEquipped") : (owned ? language.t("shopUse") : language.t("shopBuy"))) {
                shop.buyOrEquipPilot(language: language)
            }
            .disabled(equipped)
            .buttonStyle(ShopActionButton(primary: !owned && !equipped))
        }
        .padding(12)
        .background(rowBackground(equipped: equipped))
    }

    private var bonusLifeRow: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(red: 0.96, green: 0.45, blue: 0.71).opacity(0.3))
                    .frame(width: 36, height: 36)
                Text("♥")
                    .foregroundStyle(Color(red: 0.96, green: 0.45, blue: 0.71))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(language.t("bonusLifeName"))
                    .foregroundStyle(.white)
                    .font(.subheadline.weight(.semibold))
                Text("\(ShopStore.bonusLifePrice) \(language.t("shopMoney"))")
                    .font(.caption)
                    .foregroundStyle(Color(red: 0.58, green: 0.64, blue: 0.72))
                Text(shop.bonusLifeQueued ? language.t("shopBonusQueued") : language.t("bonusLifeDesc"))
                    .font(.caption2)
                    .foregroundStyle(Color(red: 0.45, green: 0.51, blue: 0.58))
                    .lineLimit(2)
            }

            Spacer()

            Button(shop.bonusLifeQueued ? language.t("shopQueued") : language.t("shopBuy")) {
                shop.buyBonusLife(language: language)
            }
            .disabled(shop.bonusLifeQueued)
            .buttonStyle(ShopActionButton(primary: !shop.bonusLifeQueued))
        }
        .padding(12)
        .background(rowBackground(equipped: shop.bonusLifeQueued))
    }

    private func priceText(_ price: Int, owned: Bool) -> String {
        if owned { return language.t("shopOwned") }
        if price == 0 { return language.t("shopFree") }
        return "\(price) \(language.t("shopMoney"))"
    }

    private func rowBackground(equipped: Bool) -> some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.white.opacity(equipped ? 0.1 : 0.06))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(equipped ? 0.22 : 0.1), lineWidth: 1)
            )
    }
}

private struct ShopActionButton: ButtonStyle {
    var primary: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(primary ? Color(red: 0.06, green: 0.09, blue: 0.16) : .white)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                primary
                    ? Color(red: 0.37, green: 0.92, blue: 0.83)
                    : Color.white.opacity(configuration.isPressed ? 0.28 : 0.18),
                in: Capsule()
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
