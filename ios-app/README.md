# Astro Dodger Maxe – iOS / iPadOS / tvOS

Native SwiftUI-port av Astro Dodger Maxe.

## Åpne i Xcode

```bash
open ios-app.xcodeproj
```

Velg destination:

| Enhet | Destination |
|-------|-------------|
| iPhone | iPhone-simulator eller fysisk enhet |
| iPad | iPad-simulator eller fysisk enhet |
| Apple TV | Apple TV-simulator eller fysisk enhet |

## Kontroller

| Plattform | Styring |
|-----------|---------|
| iPhone / iPad | Piler nederst til høyre, eller tilkoblet spillkontroll |
| Apple TV | Siri Remote touch-flate / piltaster, A for start, Play/Pause for pause |
| Alle | GameController-kompatible pads (inkl. Magicsee R1 i spillmodus) |

## Spillmål

Samme som nettversjonen: samle gule soler, unngå asteroider (3 liv), power-ups fra 600 poeng, UFO-er fra 900.

## Filer

| Fil | Rolle |
|-----|--------|
| `AstroDodgerApp.swift` | App-entry |
| `ContentView.swift` | Meny, overlay, plattform-input |
| `GameEngine.swift` | Spillogikk |
| `GameRenderer.swift` | Canvas-tegning |
| `ControllerInput.swift` | GameController / Siri Remote |
| `TouchControlsView.swift` | Touch-piler (ikke tvOS) |
