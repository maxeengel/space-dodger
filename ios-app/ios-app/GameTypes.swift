import Foundation
import CoreGraphics

enum GameState: Equatable {
    case menu
    case playing
    case paused
    case over
}

enum PowerUpType: CaseIterable {
    case shield, gun, magnet
}

enum UfoType {
    case orange, blue
}

struct Star {
    var x: CGFloat
    var y: CGFloat
    var size: CGFloat
    var speed: CGFloat
}

struct Orb {
    var x: CGFloat
    var y: CGFloat
    var r: CGFloat
    var vy: CGFloat
    var pulse: CGFloat
}

struct Asteroid {
    var x: CGFloat
    var y: CGFloat
    var r: CGFloat
    var vy: CGFloat
    var rot: CGFloat
    var vr: CGFloat
    var verts: Int
}

struct PowerUp {
    var x: CGFloat
    var y: CGFloat
    var r: CGFloat
    var vy: CGFloat
    var type: PowerUpType
    var pulse: CGFloat
}

struct Ufo {
    var x: CGFloat
    var y: CGFloat
    var vx: CGFloat
    var vy: CGFloat
    var type: UfoType
    var shootCd: Int
    var shootFlash: Int
}

struct Laser {
    var x: CGFloat
    var y: CGFloat
    var vx: CGFloat
    var vy: CGFloat
    var r: CGFloat
}

struct Bullet {
    var x: CGFloat
    var y: CGFloat
    var vx: CGFloat
    var vy: CGFloat
    var r: CGFloat
}

struct Player {
    var x: CGFloat
    var y: CGFloat
    var r: CGFloat
    var vx: CGFloat
    var vy: CGFloat
    var speed: CGFloat
}

struct MoveInput: Equatable {
    var dx: CGFloat = 0
    var dy: CGFloat = 0

    var magnitude: CGFloat { hypot(dx, dy) }
    var isActive: Bool { magnitude > 0.12 }
}

enum GameConfig {
    static let worldWidth: CGFloat = 800
    static let worldHeight: CGFloat = 500
    static let baseLives = 3
    static let playerHitRadius: CGFloat = 22
    static let rocketVisualScale: CGFloat = 26 / 22
    static let playerSpeed: CGFloat = 4.2
    static let asteroidFastScore = 300
    static let asteroidFastMult: CGFloat = 1.6
    static let asteroidFastSpawn = 32
    static let powerUpScore = 600
    static let powerUpDuration = 480
    static let powerUpSpawnInterval = 260
    static let magnetRadius: CGFloat = 150
    static let gunFireCd = 14
    static let alienPhaseScore = 900
    static let alienHardPhaseScore = 1500
    static let alienElitePhaseScore = 1800
    static let asteroidHardMult: CGFloat = 1.22
    static let maxUfos = 3
    static let maxUfosElite = 5
    static let highScoreKey = "romrakettRunnerHigh"
    static let deadzone: CGFloat = 0.1
}
