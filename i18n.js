/**
 * Språk: no → en → el → no (🌍-knappen)
 */
(function () {
  "use strict";

  const LANG_KEY = "spaceDodgerLang";
  const LANGS = ["no", "en", "el"];
  const LANG_LABEL = { no: "Norsk", en: "English", el: "Ελληνικά" };

  const T = {
    no: {
      docTitle: "Astro Dodger – Magicsee R1",
      tagline: "Styr romraketten med Magicsee R1",
      musicOn: "Musikk på",
      musicOff: "Musikk av",
      musicAriaOn: "Slå av musikk",
      musicAriaOff: "Slå på musikk",
      pause: "Pause",
      resume: "Fortsett",
      pauseAria: "Pause spill",
      resumeAria: "Fortsett spill",
      qrTitle: "Åpne spillet på mobil",
      qrAlt: "QR-kode til spillet",
      guideTitle: "Knappguide",
      guideR1: "Magicsee R1",
      guideR1Joy: '<span class="key">Joystick</span> Flytt raketten',
      guideR1Front: '<span class="key">Rund knapp foran</span> Pause og fortsett',
      guideR1Retry: '<span class="key">A / andre knapper</span> Prøv igjen ved game over',
      guideR1Start: '<span class="key">Joystick + knapp</span> Start spill fra meny',
      guideScreen: "På skjermen",
      guideScreenPause: '<span class="key">Pause</span> Pause og fortsett (musikk fortsetter)',
      guideScreenMusic: '<span class="key">Musikk på/av</span> Slå bakgrunnsmusikk av eller på',
      guideKb: "Tastatur",
      guideKbMove: '<span class="key">WASD / piltaster</span> Flytt raketten',
      guideKbStart: '<span class="key">Mellomrom / Enter</span> Start og prøv igjen',
      guideKbPause: '<span class="key">P / Esc</span> Pause og fortsett',
      guideTouch: "iPad og mobil",
      guideTouchArrows: '<span class="key">Nedre høyre hjørne</span> Fire piler (↑ ← → ↓)',
      guideTouchAuto: "Vises automatisk på touch-skjerm",
      guideTouchSwap: '<span class="key">Bytte</span> Slå piler på/av på skjermen',
      guideGoal: "Spillmål",
      guideGoalSuns: "Samle <strong>gule soler</strong> (+10 poeng, +20 med romfarer)",
      guideGoalAst: "Unngå <strong>asteroider</strong> (3 liv)",
      guideGoal600: "Ved <strong>600 poeng</strong>: power-ups – skjold, pistol og magnet",
      guideGoal900: "Ved <strong>900 poeng</strong>: romvesener på oransje UFO skyter laser",
      guideGoal1500: "Ved <strong>1500 poeng</strong>: alt går raskere + større blå UFO-er",
      guideGoal1800: "Ved <strong>1800 poeng</strong>: opptil 5 romvesener om gangen",
      guideNote:
        'R1 må være i <strong>spillmodus</strong> (slå av, hold M+B, slå på). Hvis volum endres på Mac, start R1 på nytt i spillmodus.',
      mpTitle: "Multiplayer",
      mpStatusIdle: "Ikke tilkoblet",
      mpHost: "Opprett rom",
      mpJoinLabel: "Bli med i rom",
      mpRoomPlaceholder: "Skriv romkode (f.eks. rrabc123)",
      mpConnect: "Koble til",
      mpYourCode: "Din romkode:",
      mpCopyCode: "Kopier romkode",
      mpCopyLink: "Kopier invitasjonslenke",
      mpLeave: "Forlat rom",
      mpHint:
        "Samme brett: verten styrer asteroider og soler. Lagpoeng summeres – hvert spill har egne liv. Verten deler romkode.",
      shopBtn: "Butikk",
      ctrlTitle: "Kontroller",
      padDisconnected: "Ikke tilkoblet",
      padHint:
        '<strong>Spillmodus:</strong> Slå av R1, hold <strong>M + B</strong> inne, slå på. Blått lys = par på nytt i macOS Bluetooth. Klikk i spillet først.',
      padWarningMedia:
        "R1 ser ut til å være i medie-modus (volum). Bruk spillmodus: slå av, hold M+B, slå på.",
      swapBtn: "Bytte",
      swapOn: "Slå av piltaster på spillskjermen",
      swapOff: "Slå på piltaster på spillskjermen",
      shopTitle: "Butikk",
      shopIntro:
        "Kjøp rakettfarger og andre ting med penger fra dine egne poeng (i multiplayer telles kun det du samler).",
      shopBalance: "Dine penger:",
      shopClose: "Lukk",
      shopOwned: "Eid",
      shopMoney: "penger",
      shopFree: "Gratis",
      shopEquipped: "Utstyrt",
      shopUse: "Bruk",
      shopBuy: "Kjøp",
      shopQueued: "I kø",
      shopColors: "Rakettfarger",
      shopUpgrades: "Oppgraderinger",
      shopConsumables: "Forbruksvarer",
      shopColorTag: "Rakettfarge",
      shopOwnedHint: "Eid – klikk Bruk for å utstyre",
      shopEquippedNow: "Utstyrt nå",
      shopPilotActive: "Utstyrt – fjes i vinduet + dobbelt sol-poeng",
      shopPilotOwned: "Eid – klikk Bruk for å utstyre",
      shopBonusQueued: "I kø til neste runde",
      shopNoMoney: "Du har ikke nok penger.",
      shopBought: "Kjøpt! {name} er utstyrt.",
      shopEquippedMsg: "{name} er utstyrt.",
      shopBonusOwned: "Du har allerede et ekstra liv i kø.",
      shopBonusBought:
        "Ekstra liv er kjøpt – neste runde starter du med 4 liv (maks én gang i kø).",
      rocketDefault: "Turkis (standard)",
      rocketPink: "Rosa rakett",
      rocketGold: "Gullrakett",
      rocketPurple: "Lilla rakett",
      rocketLime: "Limegrønn rakett",
      rocketRed: "Rød rakett",
      rocketIce: "Isblå rakett",
      pilotName: "Romfarer i cockpit",
      pilotDesc: "Fjes i vinduet + dobbelt poeng (+20) per sol du samler (kun deg i MP)",
      bonusLifeName: "Ekstra liv",
      bonusLifeDesc: "Neste runde: 4 liv for deg (3 for andre i MP) – kun den som kjøpte",
      overlayMenu:
        "Fly gjennom rommet, samle gule soler og unngå asteroider. Poeng ved game over blir penger i butikken.",
      overlayR1:
        "<strong>Magicsee R1:</strong> joystick = beveg, rund knapp = pause, ved game over: trykk en knapp",
      overlayMode:
        "<strong>Feil modus?</strong> Hvis lyd endres: start R1 på nytt med M+B.",
      overlayKb: "<strong>Tastatur:</strong> WASD eller piltaster, mellomrom",
      startGame: "Start spill",
      tryAgain: "Prøv igjen",
      overlayMpTitle: "Multiplayer",
      overlayMpPlaceholder: "Romkode (rrabc123)",
      overlayMpJoin: "Bli med i rom",
      score: "Poeng",
      teamScore: "Lagpoeng",
      yourScore: "Dine poeng",
      team: "Lag",
      high: "Rekord",
      out: "ute",
      gameOver: "Game over",
      gameOverSolo: "Poeng: {score}.{money} Trykk A eller en knapp for å prøve igjen.",
      gameOverMp:
        "Lagpoeng: {team}. Dine poeng: {score}.{money} Trykk A eller en knapp for å prøve igjen.",
      moneyEarned: " Dine {score} poeng ble til penger (du har {total} totalt).",
      moneyNone: " Ingen penger denne runden.",
      spectator: "Du er ute – heier på laget",
      youAreOut: "Du er ute",
      pauseHud: "PAUSE",
      powerUps: "POWER-UPS!",
      faster: "RASKERE!",
      aliens5: "5 ROMVESENER!",
      blueUfo: "BLÅ UFO!",
      aliens: "ROMVESENER!",
      hostName: "Vert",
      playerName: "Spiller {n}",
      mpHostBoard: "MP: vertens brett",
      mpPlayers: "MP: {n} spillere",
      globeTitle: "Språk: {lang} (klikk for å bytte)",
      mpWaiting: "Venter på spillere. Romkode: {code}",
      mpDisconnected: "Frakoblet",
      mpPlayersInRoom: "{n} spillere i rommet",
      mpReady: "Romklar! Del koden: {code}",
      mpRetryCode: "Prøver ny kode: {code}",
      mpSlow: "Romkode: {code} (nettverk tregt – del koden likevel)",
      mpFail: "Kunne ikke koble til. Sjekk romkoden.",
      mpUnavailable: "Multiplayer utilgjengelig – last siden på nytt",
      mpCreating: "Oppretter rom… Kode: {code}",
      mpInvalid: "Skriv inn en gyldig romkode",
      mpConnecting: "Kobler til {code}…",
      mpJoined: "Koblet til rom! Start spillet.",
      mpJoinFail: "Kunne ikke koble til {code}",
      mpCopyManual: "Kopier manuelt: {text}",
      mpCopied: "Kopiert!",
      ariaGame: "Spillflate",
      ariaTouch: "Touch-kontroller",
      ariaUp: "Opp",
      ariaDown: "Ned",
      ariaLeft: "Venstre",
      ariaRight: "Høyre",
      ariaQr: "QR-kode til spillet",
      ariaGuide: "Knappforklaring",
      ariaShop: "Butikk",
      ariaCtrl: "Kontroller",
      ariaSwap: "Piler på skjerm",
      ariaWorld: "Språk",
      ariaRoomCode: "Romkode",
      ariaItems: "Varer",
    },
    en: {
      docTitle: "Astro Dodger – Magicsee R1",
      tagline: "Steer the rocket with Magicsee R1",
      musicOn: "Music on",
      musicOff: "Music off",
      musicAriaOn: "Mute music",
      musicAriaOff: "Unmute music",
      pause: "Pause",
      resume: "Resume",
      pauseAria: "Pause game",
      resumeAria: "Resume game",
      qrTitle: "Open the game on mobile",
      qrAlt: "QR code for the game",
      guideTitle: "Controls guide",
      guideR1: "Magicsee R1",
      guideR1Joy: '<span class="key">Joystick</span> Move the rocket',
      guideR1Front: '<span class="key">Front round button</span> Pause and resume',
      guideR1Retry: '<span class="key">A / other buttons</span> Retry on game over',
      guideR1Start: '<span class="key">Joystick + button</span> Start from menu',
      guideScreen: "On screen",
      guideScreenPause: '<span class="key">Pause</span> Pause and resume (music keeps playing)',
      guideScreenMusic: '<span class="key">Music on/off</span> Toggle background music',
      guideKb: "Keyboard",
      guideKbMove: '<span class="key">WASD / arrows</span> Move the rocket',
      guideKbStart: '<span class="key">Space / Enter</span> Start and retry',
      guideKbPause: '<span class="key">P / Esc</span> Pause and resume',
      guideTouch: "iPad and mobile",
      guideTouchArrows: '<span class="key">Bottom right</span> Four arrows (↑ ← → ↓)',
      guideTouchAuto: "Shown automatically on touch screens",
      guideTouchSwap: '<span class="key">Swap</span> Toggle on-screen arrows',
      guideGoal: "Goals",
      guideGoalSuns: "Collect <strong>yellow suns</strong> (+10 points, +20 with astronaut)",
      guideGoalAst: "Avoid <strong>asteroids</strong> (3 lives)",
      guideGoal600: "At <strong>600 points</strong>: power-ups – shield, gun and magnet",
      guideGoal900: "At <strong>900 points</strong>: aliens on orange UFOs shoot lasers",
      guideGoal1500: "At <strong>1500 points</strong>: everything faster + larger blue UFOs",
      guideGoal1800: "At <strong>1800 points</strong>: up to 5 aliens at once",
      guideNote:
        'R1 must be in <strong>game mode</strong> (power off, hold M+B, power on). If Mac volume changes, restart R1 in game mode.',
      mpTitle: "Multiplayer",
      mpStatusIdle: "Not connected",
      mpHost: "Create room",
      mpJoinLabel: "Join a room",
      mpRoomPlaceholder: "Enter room code (e.g. rrabc123)",
      mpConnect: "Connect",
      mpYourCode: "Your room code:",
      mpCopyCode: "Copy room code",
      mpCopyLink: "Copy invite link",
      mpLeave: "Leave room",
      mpHint:
        "Same board: the host controls asteroids and suns. Team score is summed – each player has their own lives. Host shares the room code.",
      shopBtn: "Shop",
      ctrlTitle: "Controller",
      padDisconnected: "Not connected",
      padHint:
        '<strong>Game mode:</strong> Power off R1, hold <strong>M + B</strong>, power on. Blue light = re-pair in macOS Bluetooth. Click the game first.',
      padWarningMedia:
        "R1 seems to be in media mode (volume). Use game mode: power off, hold M+B, power on.",
      swapBtn: "Swap",
      swapOn: "Hide on-screen arrows",
      swapOff: "Show on-screen arrows",
      shopTitle: "Shop",
      shopIntro:
        "Buy rocket colors and more with money from your own points (in multiplayer only what you collect counts).",
      shopBalance: "Your money:",
      shopClose: "Close",
      shopOwned: "Owned",
      shopMoney: "money",
      shopFree: "Free",
      shopEquipped: "Equipped",
      shopUse: "Use",
      shopBuy: "Buy",
      shopQueued: "Queued",
      shopColors: "Rocket colors",
      shopUpgrades: "Upgrades",
      shopConsumables: "Consumables",
      shopColorTag: "Rocket color",
      shopOwnedHint: "Owned – click Use to equip",
      shopEquippedNow: "Equipped now",
      shopPilotActive: "Equipped – face in window + double sun points",
      shopPilotOwned: "Owned – click Use to equip",
      shopBonusQueued: "Queued for next round",
      shopNoMoney: "You don't have enough money.",
      shopBought: "Bought! {name} is equipped.",
      shopEquippedMsg: "{name} is equipped.",
      shopBonusOwned: "You already have a bonus life queued.",
      shopBonusBought:
        "Bonus life bought – next round you start with 4 lives (one in queue max).",
      rocketDefault: "Turquoise (default)",
      rocketPink: "Pink rocket",
      rocketGold: "Gold rocket",
      rocketPurple: "Purple rocket",
      rocketLime: "Lime rocket",
      rocketRed: "Red rocket",
      rocketIce: "Ice-blue rocket",
      pilotName: "Astronaut in cockpit",
      pilotDesc: "Face in the window + double points (+20) per sun you collect (only you in MP)",
      bonusLifeName: "Extra life",
      bonusLifeDesc: "Next round: 4 lives for you (3 for others in MP) – buyer only",
      overlayMenu:
        "Fly through space, collect yellow suns and dodge asteroids. Points at game over become shop money.",
      overlayR1:
        "<strong>Magicsee R1:</strong> joystick = move, front button = pause, on game over: press a button",
      overlayMode:
        "<strong>Wrong mode?</strong> If volume changes: restart R1 with M+B.",
      overlayKb: "<strong>Keyboard:</strong> WASD or arrows, space",
      startGame: "Start game",
      tryAgain: "Try again",
      overlayMpTitle: "Multiplayer",
      overlayMpPlaceholder: "Room code (rrabc123)",
      overlayMpJoin: "Join room",
      score: "Score",
      teamScore: "Team score",
      yourScore: "Your score",
      team: "Team",
      high: "High",
      out: "out",
      gameOver: "Game over",
      gameOverSolo: "Score: {score}.{money} Press A or a button to try again.",
      gameOverMp:
        "Team score: {team}. Your score: {score}.{money} Press A or a button to try again.",
      moneyEarned: " Your {score} points became money (you have {total} total).",
      moneyNone: " No money this round.",
      spectator: "You're out – cheering the team",
      youAreOut: "You're out",
      pauseHud: "PAUSE",
      powerUps: "POWER-UPS!",
      faster: "FASTER!",
      aliens5: "5 ALIENS!",
      blueUfo: "BLUE UFO!",
      aliens: "ALIENS!",
      hostName: "Host",
      playerName: "Player {n}",
      mpHostBoard: "MP: host board",
      mpPlayers: "MP: {n} players",
      globeTitle: "Language: {lang} (click to switch)",
      mpWaiting: "Waiting for players. Room code: {code}",
      mpDisconnected: "Disconnected",
      mpPlayersInRoom: "{n} players in room",
      mpReady: "Room ready! Share code: {code}",
      mpRetryCode: "Trying new code: {code}",
      mpSlow: "Room code: {code} (network slow – share code anyway)",
      mpFail: "Could not connect. Check the room code.",
      mpUnavailable: "Multiplayer unavailable – reload the page",
      mpCreating: "Creating room… Code: {code}",
      mpInvalid: "Enter a valid room code",
      mpConnecting: "Connecting to {code}…",
      mpJoined: "Joined room! Start the game.",
      mpJoinFail: "Could not connect to {code}",
      mpCopyManual: "Copy manually: {text}",
      mpCopied: "Copied!",
      ariaGame: "Game canvas",
      ariaTouch: "Touch controls",
      ariaUp: "Up",
      ariaDown: "Down",
      ariaLeft: "Left",
      ariaRight: "Right",
      ariaQr: "QR code for the game",
      ariaGuide: "Controls guide",
      ariaShop: "Shop",
      ariaCtrl: "Controller",
      ariaSwap: "On-screen arrows",
      ariaWorld: "Language",
      ariaRoomCode: "Room code",
      ariaItems: "Items",
    },
    el: {
      docTitle: "Astro Dodger – Magicsee R1",
      tagline: "Οδήγησε τον πύραυλο με Magicsee R1",
      musicOn: "Μουσική ανοιχτή",
      musicOff: "Μουσική κλειστή",
      musicAriaOn: "Σίγαση μουσικής",
      musicAriaOff: "Ενεργοποίηση μουσικής",
      pause: "Παύση",
      resume: "Συνέχεια",
      pauseAria: "Παύση παιχνιδιού",
      resumeAria: "Συνέχεια παιχνιδιού",
      qrTitle: "Άνοιξε το παιχνίδι στο κινητό",
      qrAlt: "QR κωδικός για το παιχνίδι",
      guideTitle: "Οδηγός κουμπιών",
      guideR1: "Magicsee R1",
      guideR1Joy: '<span class="key">Joystick</span> Κίνησε τον πύραυλο',
      guideR1Front: '<span class="key">Στρογγυλό μπροστά</span> Παύση και συνέχεια',
      guideR1Retry: '<span class="key">A / άλλα κουμπιά</span> Ξανά στο game over',
      guideR1Start: '<span class="key">Joystick + κουμπί</span> Έναρξη από το μενού',
      guideScreen: "Στην οθόνη",
      guideScreenPause: '<span class="key">Παύση</span> Παύση και συνέχεια (η μουσική συνεχίζει)',
      guideScreenMusic: '<span class="key">Μουσική on/off</span> Ενεργοποίηση/απενεργοποίηση',
      guideKb: "Πληκτρολόγιο",
      guideKbMove: '<span class="key">WASD / βέλη</span> Κίνησε τον πύραυλο',
      guideKbStart: '<span class="key">Διάστημα / Enter</span> Έναρξη και ξανά',
      guideKbPause: '<span class="key">P / Esc</span> Παύση και συνέχεια',
      guideTouch: "iPad και κινητό",
      guideTouchArrows: '<span class="key">Κάτω δεξιά</span> Τέσσερα βέλη (↑ ← → ↓)',
      guideTouchAuto: "Εμφανίζονται αυτόματα σε οθόνη αφής",
      guideTouchSwap: '<span class="key">Αλλαγή</span> Εμφάνιση/απόκρυψη βελών',
      guideGoal: "Στόχοι",
      guideGoalSuns: "Μάζεψε <strong>κίτρινους ήλιους</strong> (+10 πόντοι, +20 με αστροναύτη)",
      guideGoalAst: "Απέφυγε <strong>αστεροειδείς</strong> (3 ζωές)",
      guideGoal600: "Στους <strong>600 πόντους</strong>: power-ups – ασπίδα, όπλο και μαγνήτης",
      guideGoal900: "Στους <strong>900 πόντους</strong>: εξωγήινοι σε πορτοκαλί UFO ρίχνουν λέιζερ",
      guideGoal1500: "Στους <strong>1500 πόντους</strong>: όλα πιο γρήγορα + μεγαλύτερα μπλε UFO",
      guideGoal1800: "Στους <strong>1800 πόντους</strong>: έως 5 εξωγήινοι μαζί",
      guideNote:
        'Το R1 πρέπει να είναι σε <strong>λειτουργία παιχνιδιού</strong> (κλείσιμο, κράτα M+B, άνοιγμα). Αν αλλάζει η ένταση στο Mac, επανεκκίνησε το R1.',
      mpTitle: "Πολλοί παίκτες",
      mpStatusIdle: "Μη συνδεδεμένο",
      mpHost: "Δημιουργία δωματίου",
      mpJoinLabel: "Μπες σε δωμάτιο",
      mpRoomPlaceholder: "Γράψε κωδικό (π.χ. rrabc123)",
      mpConnect: "Σύνδεση",
      mpYourCode: "Ο κωδικός σου:",
      mpCopyCode: "Αντιγραφή κωδικού",
      mpCopyLink: "Αντιγραφή συνδέσμου",
      mpLeave: "Αποχώρηση",
      mpHint:
        "Ίδιο ταμπλό: ο οικοδεσπότης ελέγχει αστεροειδείς και ήλιους. Ομαδικοί πόντοι αθροίζονται – κάθε παίκτης έχει δικές του ζωές.",
      shopBtn: "Κατάστημα",
      ctrlTitle: "Χειριστήριο",
      padDisconnected: "Μη συνδεδεμένο",
      padHint:
        '<strong>Λειτουργία παιχνιδιού:</strong> Κλείσε το R1, κράτα <strong>M + B</strong>, άνοιξε. Μπλε φως = νέο pairing στο Bluetooth. Κάνε κλικ στο παιχνίδι πρώτα.',
      padWarningMedia:
        "Το R1 φαίνεται σε λειτουργία πολυμέσων (ένταση). Χρησιμοποίησε λειτουργία παιχνιδιού: κλείσε, κράτα M+B, άνοιξε.",
      swapBtn: "Αλλαγή",
      swapOn: "Απόκρυψη βελών στην οθόνη",
      swapOff: "Εμφάνιση βελών στην οθόνη",
      shopTitle: "Κατάστημα",
      shopIntro:
        "Αγόρασε χρώματα πυραύλου και άλλα με χρήματα από τους δικούς σου πόντους (στο MP μετράει μόνο ό,τι μαζεύεις εσύ).",
      shopBalance: "Τα χρήματά σου:",
      shopClose: "Κλείσιμο",
      shopOwned: "Ιδιοκτησία",
      shopMoney: "χρήματα",
      shopFree: "Δωρεάν",
      shopEquipped: "Εξοπλισμένο",
      shopUse: "Χρήση",
      shopBuy: "Αγορά",
      shopQueued: "Σε ουρά",
      shopColors: "Χρώματα πυραύλου",
      shopUpgrades: "Αναβαθμίσεις",
      shopConsumables: "Καταναλωτικά",
      shopColorTag: "Χρώμα πυραύλου",
      shopOwnedHint: "Ιδιοκτησία – πάτα Χρήση για εξοπλισμό",
      shopEquippedNow: "Εξοπλισμένο τώρα",
      shopPilotActive: "Εξοπλισμένο – πρόσωπο στο παράθυρο + διπλοί ήλιοι",
      shopPilotOwned: "Ιδιοκτησία – πάτα Χρήση για εξοπλισμό",
      shopBonusQueued: "Σε ουρά για τον επόμενο γύρο",
      shopNoMoney: "Δεν έχεις αρκετά χρήματα.",
      shopBought: "Αγοράστηκε! Το {name} είναι εξοπλισμένο.",
      shopEquippedMsg: "Το {name} είναι εξοπλισμένο.",
      shopBonusOwned: "Έχεις ήδη επιπλέον ζωή σε ουρά.",
      shopBonusBought:
        "Επιπλέον ζωή αγοράστηκε – στον επόμενο γύρο ξεκινάς με 4 ζωές (μέγ. μία σε ουρά).",
      rocketDefault: "Τυρκουάζ (προεπιλογή)",
      rocketPink: "Ροζ πύραυλος",
      rocketGold: "Χρυσός πύραυλος",
      rocketPurple: "Μωβ πύραυλος",
      rocketLime: "Λαχανί πύραυλος",
      rocketRed: "Κόκκινος πύραυλος",
      rocketIce: "Παγωμένος μπλε πύραυλος",
      pilotName: "Αστροναύτης στο κόκπιτ",
      pilotDesc: "Πρόσωπο στο παράθυρο + διπλοί πόντοι (+20) ανά ήλιο (μόνο εσύ στο MP)",
      bonusLifeName: "Επιπλέον ζωή",
      bonusLifeDesc: "Επόμενος γύρος: 4 ζωές για εσένα (3 για άλλους στο MP) – μόνο αγοραστής",
      overlayMenu:
        "Πέτα στο διάστημα, μάζεψε κίτρινους ήλιους και απόφυγε αστεροειδείς. Οι πόντοι στο τέλος γίνονται χρήματα στο κατάστημα.",
      overlayR1:
        "<strong>Magicsee R1:</strong> joystick = κίνηση, μπροστινό κουμπί = παύση, στο game over: πάτα κουμπί",
      overlayMode:
        "<strong>Λάθος λειτουργία;</strong> Αν αλλάζει η ένταση: επανεκκίνησε το R1 με M+B.",
      overlayKb: "<strong>Πληκτρολόγιο:</strong> WASD ή βέλη, διάστημα",
      startGame: "Έναρξη",
      tryAgain: "Ξανά",
      overlayMpTitle: "Πολλοί παίκτες",
      overlayMpPlaceholder: "Κωδικός (rrabc123)",
      overlayMpJoin: "Μπες σε δωμάτιο",
      score: "Πόντοι",
      teamScore: "Ομαδικοί πόντοι",
      yourScore: "Οι πόντοι σου",
      team: "Ομάδα",
      high: "Ρεκόρ",
      out: "εκτός",
      gameOver: "Game over",
      gameOverSolo: "Πόντοι: {score}.{money} Πάτα A ή κουμπί για ξανά.",
      gameOverMp:
        "Ομάδα: {team}. Οι πόντοι σου: {score}.{money} Πάτα A ή κουμπί για ξανά.",
      moneyEarned: " Οι {score} πόντοι σου έγιναν χρήματα (σύνολο {total}).",
      moneyNone: " Χωρίς χρήματα αυτόν τον γύρο.",
      spectator: "Είσαι εκτός – στηρίζεις την ομάδα",
      youAreOut: "Είσαι εκτός",
      pauseHud: "ΠΑΥΣΗ",
      powerUps: "POWER-UPS!",
      faster: "ΓΡΗΓΟΡΑ!",
      aliens5: "5 ΕΞΩΓΗΙΝΟΙ!",
      blueUfo: "ΜΠΛΕ UFO!",
      aliens: "ΕΞΩΓΗΙΝΟΙ!",
      hostName: "Οικοδεσπότης",
      playerName: "Παίκτης {n}",
      mpHostBoard: "MP: ταμπλό οικοδεσπότη",
      mpPlayers: "MP: {n} παίκτες",
      globeTitle: "Γλώσσα: {lang} (κλικ για αλλαγή)",
      mpWaiting: "Αναμονή παικτών. Κωδικός: {code}",
      mpDisconnected: "Αποσυνδεδεμένο",
      mpPlayersInRoom: "{n} παίκτες στο δωμάτιο",
      mpReady: "Έτοιμο! Μοιράσου τον κωδικό: {code}",
      mpRetryCode: "Νέος κωδικός: {code}",
      mpSlow: "Κωδικός: {code} (αργό δίκτυο – μοιράσου τον)",
      mpFail: "Αποτυχία σύνδεσης. Έλεγξε τον κωδικό.",
      mpUnavailable: "Το multiplayer δεν είναι διαθέσιμο – ανανέωσε τη σελίδα",
      mpCreating: "Δημιουργία δωματίου… Κωδικός: {code}",
      mpInvalid: "Γράψε έγκυρο κωδικό",
      mpConnecting: "Σύνδεση στο {code}…",
      mpJoined: "Συνδέθηκες! Ξεκίνα το παιχνίδι.",
      mpJoinFail: "Αποτυχία σύνδεσης στο {code}",
      mpCopyManual: "Αντίγραψε χειροκίνητα: {text}",
      mpCopied: "Αντιγράφηκε!",
      ariaGame: "Περιοχή παιχνιδιού",
      ariaTouch: "Χειριστήρια αφής",
      ariaUp: "Πάνω",
      ariaDown: "Κάτω",
      ariaLeft: "Αριστερά",
      ariaRight: "Δεξιά",
      ariaQr: "QR κωδικός παιχνιδιού",
      ariaGuide: "Οδηγός κουμπιών",
      ariaShop: "Κατάστημα",
      ariaCtrl: "Χειριστήριο",
      ariaSwap: "Βέλη στην οθόνη",
      ariaWorld: "Γλώσσα",
      ariaRoomCode: "Κωδικός δωματίου",
      ariaItems: "Αντικείμενα",
    },
  };

  function loadLang() {
    const saved = localStorage.getItem(LANG_KEY);
    return LANGS.includes(saved) ? saved : "no";
  }

  let lang = loadLang();

  function t(key, vars) {
    const table = T[lang] || T.no;
    let s = table[key];
    if (s == null) s = (T.no[key] != null ? T.no[key] : key);
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = String(s).split("{" + k + "}").join(String(vars[k]));
      });
    }
    return s;
  }

  function applyDom() {
    document.documentElement.lang = lang === "el" ? "el" : lang;
    document.title = t("docTitle");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
    });

    const globe = document.getElementById("globe-btn");
    if (globe) {
      const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
      const label = t("globeTitle", { lang: LANG_LABEL[lang] });
      const short = { no: "NO", en: "EN", el: "EL" }[lang] || "NO";
      globe.textContent = "🌍 " + short;
      globe.title = label;
      globe.setAttribute("aria-label", label);
      globe.dataset.nextLang = next;
      globe.dataset.lang = lang;
    }
  }

  function setLang(next) {
    if (!LANGS.includes(next)) return;
    lang = next;
    localStorage.setItem(LANG_KEY, lang);
    applyDom();
    window.dispatchEvent(new CustomEvent("spacedodger:lang", { detail: { lang } }));
  }

  function cycleLang() {
    const i = LANGS.indexOf(lang);
    setLang(LANGS[(i < 0 ? 0 : i + 1) % LANGS.length]);
    return lang;
  }

  function bindGlobe() {
    const globe = document.getElementById("globe-btn");
    if (!globe || globe.dataset.i18nBound === "1") return;
    globe.dataset.i18nBound = "1";
    globe.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cycleLang();
    });
  }

  window.I18n = {
    t,
    getLang: () => lang,
    setLang,
    cycleLang,
    applyDom,
    LANG_LABEL,
  };

  function boot() {
    applyDom();
    bindGlobe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
