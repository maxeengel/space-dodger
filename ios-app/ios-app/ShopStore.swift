import Foundation
import SwiftUI

struct RocketItem: Identifiable {
    let id: String
    let nameKey: String
    let price: Int
    let body: String
    let accent: String
}

@Observable
final class ShopStore {
    private static let moneyKey = "spaceDodgerMoney"
    private static let ownedKey = "spaceDodgerOwned"
    private static let equippedRocketKey = "spaceDodgerEquippedRocket"
    private static let equippedPilotKey = "spaceDodgerEquippedPilot"
    private static let bonusLifeKey = "spaceDodgerBonusLife"

    static let rockets: [RocketItem] = [
        .init(id: "rocket-default", nameKey: "rocketDefault", price: 0, body: "#5eead4", accent: "#38bdf8"),
        .init(id: "rocket-pink", nameKey: "rocketPink", price: 40, body: "#f472b6", accent: "#ec4899"),
        .init(id: "rocket-gold", nameKey: "rocketGold", price: 80, body: "#fbbf24", accent: "#f59e0b"),
        .init(id: "rocket-purple", nameKey: "rocketPurple", price: 60, body: "#a78bfa", accent: "#8b5cf6"),
        .init(id: "rocket-lime", nameKey: "rocketLime", price: 50, body: "#a3e635", accent: "#65a30d"),
        .init(id: "rocket-red", nameKey: "rocketRed", price: 70, body: "#f87171", accent: "#dc2626"),
        .init(id: "rocket-ice", nameKey: "rocketIce", price: 55, body: "#bae6fd", accent: "#0ea5e9"),
    ]

    static let pilotId = "pilot-astronaut"
    static let pilotPrice = 25000
    static let bonusLifePrice = 120

    var money: Int
    var owned: Set<String>
    var equippedRocketId: String
    var pilotEquipped: Bool
    var bonusLifeQueued: Bool
    var message: String = ""
    var messageIsError = false

    init() {
        money = max(0, UserDefaults.standard.integer(forKey: Self.moneyKey))
        var ownedSet = Set(UserDefaults.standard.array(forKey: Self.ownedKey) as? [String] ?? [])
        ownedSet.insert("rocket-default")
        owned = ownedSet
        let rocket = UserDefaults.standard.string(forKey: Self.equippedRocketKey) ?? "rocket-default"
        equippedRocketId = ownedSet.contains(rocket) ? rocket : "rocket-default"
        pilotEquipped = ownedSet.contains(Self.pilotId)
            && UserDefaults.standard.string(forKey: Self.equippedPilotKey) == Self.pilotId
        bonusLifeQueued = UserDefaults.standard.string(forKey: Self.bonusLifeKey) == "1"
    }

    var rocketColors: (body: Color, accent: Color) {
        let item = Self.rockets.first { $0.id == equippedRocketId } ?? Self.rockets[0]
        return (Color(hex: item.body), Color(hex: item.accent))
    }

    var orbPoints: Int { pilotEquipped ? 20 : 10 }

    @discardableResult
    func addCoins(_ amount: Int) -> Int {
        let add = max(0, amount)
        guard add > 0 else { return money }
        money += add
        persistMoney()
        return money
    }

    func consumeBonusLife() -> Int {
        guard bonusLifeQueued else { return 0 }
        bonusLifeQueued = false
        UserDefaults.standard.removeObject(forKey: Self.bonusLifeKey)
        return 1
    }

    func buyOrEquipRocket(_ item: RocketItem, language: AppLanguage) {
        if owned.contains(item.id) {
            equipRocket(item.id)
            message = language.t("shopEquippedMsg").replacingOccurrences(of: "{name}", with: language.t(item.nameKey))
            messageIsError = false
            return
        }
        guard money >= item.price else {
            message = language.t("shopNoMoney")
            messageIsError = true
            return
        }
        money -= item.price
        persistMoney()
        owned.insert(item.id)
        persistOwned()
        equipRocket(item.id)
        message = language.t("shopBought").replacingOccurrences(of: "{name}", with: language.t(item.nameKey))
        messageIsError = false
    }

    func buyOrEquipPilot(language: AppLanguage) {
        if owned.contains(Self.pilotId) {
            setPilotEquipped(true)
            message = language.t("shopEquippedMsg").replacingOccurrences(of: "{name}", with: language.t("pilotName"))
            messageIsError = false
            return
        }
        guard money >= Self.pilotPrice else {
            message = language.t("shopNoMoney")
            messageIsError = true
            return
        }
        money -= Self.pilotPrice
        persistMoney()
        owned.insert(Self.pilotId)
        persistOwned()
        setPilotEquipped(true)
        message = language.t("shopBought").replacingOccurrences(of: "{name}", with: language.t("pilotName"))
        messageIsError = false
    }

    func buyBonusLife(language: AppLanguage) {
        if bonusLifeQueued {
            message = language.t("shopBonusOwned")
            messageIsError = true
            return
        }
        guard money >= Self.bonusLifePrice else {
            message = language.t("shopNoMoney")
            messageIsError = true
            return
        }
        money -= Self.bonusLifePrice
        persistMoney()
        bonusLifeQueued = true
        UserDefaults.standard.set("1", forKey: Self.bonusLifeKey)
        message = language.t("shopBonusBought")
        messageIsError = false
    }

    private func equipRocket(_ id: String) {
        equippedRocketId = id
        UserDefaults.standard.set(id, forKey: Self.equippedRocketKey)
    }

    private func setPilotEquipped(_ on: Bool) {
        guard owned.contains(Self.pilotId) else { return }
        pilotEquipped = on
        if on {
            UserDefaults.standard.set(Self.pilotId, forKey: Self.equippedPilotKey)
        } else {
            UserDefaults.standard.removeObject(forKey: Self.equippedPilotKey)
        }
    }

    private func persistMoney() {
        UserDefaults.standard.set(money, forKey: Self.moneyKey)
    }

    private func persistOwned() {
        UserDefaults.standard.set(Array(owned), forKey: Self.ownedKey)
    }
}

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
