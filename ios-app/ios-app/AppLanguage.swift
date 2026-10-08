import Foundation

enum AppLang: String, CaseIterable {
    case no, en, el

    var shortCode: String {
        switch self {
        case .no: return "NO"
        case .en: return "EN"
        case .el: return "EL"
        }
    }

    var label: String {
        switch self {
        case .no: return "Norsk"
        case .en: return "English"
        case .el: return "Ελληνικά"
        }
    }

    var next: AppLang {
        let all = AppLang.allCases
        return all[(all.firstIndex(of: self)! + 1) % all.count]
    }
}

@Observable
final class AppLanguage {
    private static let key = "spaceDodgerLang"

    var lang: AppLang {
        didSet { UserDefaults.standard.set(lang.rawValue, forKey: Self.key) }
    }

    init() {
        let raw = UserDefaults.standard.string(forKey: Self.key) ?? "no"
        lang = AppLang(rawValue: raw) ?? .no
    }

    func cycle() {
        lang = lang.next
    }

    func t(_ key: String) -> String {
        Self.table[lang]?[key] ?? Self.table[.no]?[key] ?? key
    }

    private static let table: [AppLang: [String: String]] = [
        .no: [
            "settings": "Innstillinger",
            "close": "Lukk",
            "guideTitle": "Knappguide",
            "guideScreen": "På skjermen",
            "guideArrows": "Flytt raketten (nedre høyre hjørne)",
            "guidePause": "Pause og fortsett",
            "guideGear": "Åpne denne menyen",
            "guideArrowsKey": "Piler",
            "guidePauseKey": "Pause",
            "guideGearKey": "Gir ⚙️",
            "guidePad": "Spillkontroll / Magicsee R1",
            "guideJoy": "Flytt raketten",
            "guideStart": "Start og prøv igjen",
            "guidePadPause": "Pause og fortsett",
            "guideJoyKey": "Joystick",
            "guideStartKey": "A / knapper",
            "guideMenuKey": "Menu",
            "guideTv": "Apple TV / Siri Remote",
            "guideTvMove": "Flytt raketten",
            "guideTvStart": "Start og prøv igjen",
            "guideTvPause": "Pause og fortsett",
            "guideTvBack": "Pause eller tilbake til meny",
            "guideTvMoveKey": "Touch-flate / piltaster",
            "guideTvStartKey": "A / klikk",
            "guideTvPauseKey": "Play/Pause",
            "guideTvBackKey": "Menu / Tilbake",
            "goalTitle": "Spillmål",
            "goalSuns": "Samle for +10 poeng",
            "goalAst": "Unngå dem – du har 3 liv",
            "goal600": "Power-ups: skjold, pistol og magnet",
            "goal900": "Romvesener på oransje UFO skyter laser",
            "goal1500": "Alt går raskere + større blå UFO-er",
            "goal1800": "Opptil 5 romvesener om gangen",
            "goalSunsKey": "Gule soler",
            "goalAstKey": "Asteroider",
            "goal600Key": "600 poeng",
            "goal900Key": "900 poeng",
            "goal1500Key": "1500 poeng",
            "goal1800Key": "1800 poeng",
            "r1Note": "Magicsee R1 må være i spillmodus: slå av, hold M+B, slå på. Hvis volum endres på Mac/iPhone, start R1 på nytt i spillmodus.",
            "high": "Rekord",
            "globeTitle": "Språk",
            "welcome": "Velkommen til Space-dodger",
            "title": "Space Dodger",
            "start": "Start spill",
            "tryAgain": "Prøv igjen",
            "guideLink": "Guide og innstillinger",
            "score": "Poeng",
            "subtitle": "Samle soler, unngå asteroider",
            "subtitleTv": "Styr raketten med Siri Remote eller spillkontroll",
            "hint": "Piler nederst til høyre · Spillkontroll støttes",
            "hintTv": "Touch-flate: flytt · A / klikk: start · Play/Pause: pause",
            "pause": "Pause",
            "resume": "Fortsett",
        ],
        .en: [
            "settings": "Settings",
            "close": "Close",
            "guideTitle": "Controls guide",
            "guideScreen": "On screen",
            "guideArrows": "Move the rocket (bottom-right corner)",
            "guidePause": "Pause and resume",
            "guideGear": "Open this menu",
            "guideArrowsKey": "Arrows",
            "guidePauseKey": "Pause",
            "guideGearKey": "Gear ⚙️",
            "guidePad": "Game controller / Magicsee R1",
            "guideJoy": "Move the rocket",
            "guideStart": "Start and retry",
            "guidePadPause": "Pause and resume",
            "guideJoyKey": "Joystick",
            "guideStartKey": "A / buttons",
            "guideMenuKey": "Menu",
            "guideTv": "Apple TV / Siri Remote",
            "guideTvMove": "Move the rocket",
            "guideTvStart": "Start and retry",
            "guideTvPause": "Pause and resume",
            "guideTvBack": "Pause or back to menu",
            "guideTvMoveKey": "Touch surface / D-pad",
            "guideTvStartKey": "A / click",
            "guideTvPauseKey": "Play/Pause",
            "guideTvBackKey": "Menu / Back",
            "goalTitle": "Goals",
            "goalSuns": "Collect for +10 points",
            "goalAst": "Avoid them – you have 3 lives",
            "goal600": "Power-ups: shield, gun and magnet",
            "goal900": "Aliens on orange UFOs fire lasers",
            "goal1500": "Everything faster + larger blue UFOs",
            "goal1800": "Up to 5 aliens at once",
            "goalSunsKey": "Yellow suns",
            "goalAstKey": "Asteroids",
            "goal600Key": "600 points",
            "goal900Key": "900 points",
            "goal1500Key": "1500 points",
            "goal1800Key": "1800 points",
            "r1Note": "Magicsee R1 must be in game mode: power off, hold M+B, power on. If volume changes on Mac/iPhone, restart R1 in game mode.",
            "high": "High score",
            "globeTitle": "Language",
            "welcome": "Welcome to Space-dodger",
            "title": "Space Dodger",
            "start": "Start game",
            "tryAgain": "Try again",
            "guideLink": "Guide and settings",
            "score": "Score",
            "subtitle": "Collect suns, dodge asteroids",
            "subtitleTv": "Control the rocket with Siri Remote or a gamepad",
            "hint": "Arrows bottom-right · Gamepad supported",
            "hintTv": "Touch surface: move · A / click: start · Play/Pause: pause",
            "pause": "Pause",
            "resume": "Resume",
        ],
        .el: [
            "settings": "Ρυθμίσεις",
            "close": "Κλείσιμο",
            "guideTitle": "Οδηγός κουμπιών",
            "guideScreen": "Στην οθόνη",
            "guideArrows": "Μετακίνησε τον πύραυλο (κάτω δεξιά)",
            "guidePause": "Παύση και συνέχεια",
            "guideGear": "Άνοιξε αυτό το μενού",
            "guideArrowsKey": "Βέλη",
            "guidePauseKey": "Παύση",
            "guideGearKey": "Γρανάζι ⚙️",
            "guidePad": "Χειριστήριο / Magicsee R1",
            "guideJoy": "Μετακίνησε τον πύραυλο",
            "guideStart": "Έναρξη και επανάληψη",
            "guidePadPause": "Παύση και συνέχεια",
            "guideJoyKey": "Joystick",
            "guideStartKey": "A / κουμπιά",
            "guideMenuKey": "Menu",
            "guideTv": "Apple TV / Siri Remote",
            "guideTvMove": "Μετακίνησε τον πύραυλο",
            "guideTvStart": "Έναρξη και επανάληψη",
            "guideTvPause": "Παύση και συνέχεια",
            "guideTvBack": "Παύση ή πίσω στο μενού",
            "guideTvMoveKey": "Επιφάνεια αφής / βελάκια",
            "guideTvStartKey": "A / κλικ",
            "guideTvPauseKey": "Play/Pause",
            "guideTvBackKey": "Menu / Πίσω",
            "goalTitle": "Στόχοι",
            "goalSuns": "Μάζεψε για +10 πόντους",
            "goalAst": "Απόφυγέ τους – έχεις 3 ζωές",
            "goal600": "Power-ups: ασπίδα, όπλο και μαγνήτης",
            "goal900": "Εξωγήινοι σε πορτοκαλί UFO πυροβολούν",
            "goal1500": "Όλα πιο γρήγορα + μεγαλύτερα μπλε UFO",
            "goal1800": "Έως 5 εξωγήινοι μαζί",
            "goalSunsKey": "Κίτρινοι ήλιοι",
            "goalAstKey": "Αστεροειδείς",
            "goal600Key": "600 πόντοι",
            "goal900Key": "900 πόντοι",
            "goal1500Key": "1500 πόντοι",
            "goal1800Key": "1800 πόντοι",
            "r1Note": "Το Magicsee R1 πρέπει να είναι σε λειτουργία παιχνιδιού: σβήσε, κράτα M+B, άναψε. Αν αλλάζει η ένταση σε Mac/iPhone, επανεκκίνησε το R1 σε λειτουργία παιχνιδιού.",
            "high": "Ρεκόρ",
            "globeTitle": "Γλώσσα",
            "welcome": "Καλώς ήρθες στο Space-dodger",
            "title": "Space Dodger",
            "start": "Έναρξη",
            "tryAgain": "Ξανά",
            "guideLink": "Οδηγός και ρυθμίσεις",
            "score": "Πόντοι",
            "subtitle": "Μάζεψε ήλιους, απόφυγε αστεροειδείς",
            "subtitleTv": "Έλεγξε τον πύραυλο με Siri Remote ή χειριστήριο",
            "hint": "Βέλη κάτω δεξιά · Υποστήριξη χειριστηρίου",
            "hintTv": "Επιφάνεια αφής: κίνηση · A / κλικ: έναρξη · Play/Pause: παύση",
            "pause": "Παύση",
            "resume": "Συνέχεια",
        ],
    ]
}
