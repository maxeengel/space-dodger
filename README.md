# Ring Runner

Et enkelt romspill i nettleseren der du styrer en ring, samler energi og unngår asteroider. Spillet er laget for **Magicsee R1**-kontrolleren, men fungerer også med tastatur og mus.

**Spill på nett:** [maxeengel.github.io/space-dodger](https://maxeengel.github.io/space-dodger/)

## Spillmål

- Flytt ringen rundt på spillflaten.
- Samle **gule soler** for poeng (+10 per sol).
- Unngå **asteroider** – du har **3 liv**.
- Prøv å slå din egen **rekord** (lagres lokalt i nettleseren).

## Kontroller

### Magicsee R1

| Handling | Knapp |
|----------|--------|
| Flytte ringen | Joystick |
| Pause / fortsett | Rund knapp foran |
| Prøv igjen ved game over | B |
| Start spill fra meny | Joystick + knapp |

R1 må være i **spillmodus** (ikke medie-modus):

1. Slå av kontrolleren.
2. Hold **M + B** inne mens du slår den på.
3. Par på nytt i Bluetooth på Mac om nødvendig (blått lys).

Hvis volum eller medieknapper reagerer på Mac, start R1 på nytt i spillmodus.

### Tastatur

| Handling | Taster |
|----------|--------|
| Flytte | WASD eller piltaster |
| Start / prøv igjen | Mellomrom eller Enter |
| Pause | P eller Esc |

### iPad og mobil

På iPad og mobil vises piler nederst til høyre på spillflaten:

| Plassering | Piler |
|-----------|--------|
| Nedre høyre hjørne | Opp, ned, venstre, høyre |

### På skjermen

- **Pause** – pause og fortsett (musikken fortsetter).
- **Musikk på/av** – slå synthwave-bakgrunnsmusikk av eller på.

## Multiplayer

To eller flere kan spille sammen over nettet (Peer-to-peer via PeerJS).

1. **Verten** trykker **Opprett rom** og får en romkode (f.eks. `rrabc123`).
2. **Gjesten** skriver romkoden i multiplayer-panelet eller i menyen og trykker **Koble til**.
3. **Verten** trykker **Start spill** når alle er klare.

I multiplayer:

- Alle ser **samme brett** – verten styrer asteroider og soler, gjesten følger med.
- **Lagpoeng** er summen av alle spillernes poeng.
- Hver spiller har **egne liv** (3 hver). Du kan bli slått ut og heie på laget mens de andre fortsetter.
- Spillet er over når **alle** på laget er ute.

## QR-kode og mobil

Under spillflaten vises en QR-kode som peker til GitHub Pages-versjonen, så du enkelt kan åpne spillet på mobil eller en annen enhet.

## Kjør lokalt

Du trenger ingen byggesteg – bare en enkel nettserver:

```bash
cd "spill med kontroll"
python3 -m http.server 8011
```

Åpne deretter [http://localhost:8011](http://localhost:8011) i nettleseren.

For multiplayer over nett må begge spillere kunne nå hverandre via PeerJS (fungerer best når begge bruker den publiserte versjonen på GitHub Pages).

## Prosjektstruktur

| Fil | Beskrivelse |
|-----|-------------|
| `index.html` | Spillflate, knappguide, multiplayer og overlay |
| `game.js` | Spilllogikk, kontroller og synkronisering |
| `audio.js` | Bakgrunnsmusikk – spilleliste med ekte spor |
| `music/` | OGG-filer (OpenGameArt, se kreditering under) |
| `multiplayer.js` | Rom, vert/gjest og P2P-synk |
| `qr.js` | QR-kode til spill-URL |
| `style.css` | Utseende |
| `vendor/` | Lokale kopier av QR- og PeerJS-biblioteker |

## Teknologi

- Ren HTML, CSS og JavaScript (ingen rammeverk).
- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Game_Gamepad_API) for Magicsee R1.
- [PeerJS](https://peerjs.com/) for multiplayer.
- [GitHub Pages](https://pages.github.com/) for hosting.

## Musikk

Bakgrunnsmusikken er **ekte spor** (ikke generert i nettleseren). Når ett spor er ferdig, starter neste automatisk:

1. Space Adventure  
2. Space City  
3. The Simplest Synthwave  

Kreditering (OpenGameArt.org):

- [Space Adventure](https://opengameart.org/content/space-adventure) – MintoDog  
- [Space City](https://opengameart.org/content/space-city) – MintoDog  
- [The Simplest Synthwave](https://opengameart.org/content/the-simplest-synthwave) – Spring  

## Lisens og repo

Kildekode: [github.com/maxeengel/space-dodger](https://github.com/maxeengel/space-dodger)
