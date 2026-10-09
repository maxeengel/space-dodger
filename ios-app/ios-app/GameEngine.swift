import Foundation
import CoreGraphics

@Observable
final class GameEngine {
    private(set) var state: GameState = .menu
    private(set) var score = 0
    private(set) var lives = GameConfig.baseLives
    private(set) var highScore: Int
    private(set) var roundMaxLives = GameConfig.baseLives

    private(set) var player = Player(
        x: GameConfig.worldWidth / 2,
        y: GameConfig.worldHeight / 2,
        r: GameConfig.playerHitRadius,
        vx: 0,
        vy: 0,
        speed: GameConfig.playerSpeed
    )

    private(set) var orbs: [Orb] = []
    private(set) var asteroids: [Asteroid] = []
    private(set) var powerUps: [PowerUp] = []
    private(set) var ufos: [Ufo] = []
    private(set) var lasers: [Laser] = []
    private(set) var bullets: [Bullet] = []
    private(set) var stars: [Star] = []

    private(set) var invuln = 0
    private(set) var shieldTimer = 0
    private(set) var gunTimer = 0
    private(set) var magnetTimer = 0
    var padDisplayName = ""
    var touchInput = MoveInput()
    var controllerInput = MoveInput()
    var controllerSelectPressed = false
    var controllerPausePressed = false
    var shop: ShopStore?

    private var spawnOrbTimer = 0
    private var spawnAstTimer = 60
    private var spawnUfoTimer = 0
    private var spawnPowerUpTimer = 90
    private var gunCd = 0
    private var alienPhaseWasActive = false
    private var alienHardPhaseWasActive = false
    private var prevSelect = false
    private var prevPause = false
    private var frameTime: TimeInterval = 0

    var now: TimeInterval { frameTime }

    init() {
        highScore = UserDefaults.standard.integer(forKey: GameConfig.highScoreKey)
        initStars()
        resetEntities()
    }

    func startGame() {
        state = .playing
        score = 0
        let bonus = shop?.consumeBonusLife() ?? 0
        roundMaxLives = bonus > 0 ? GameConfig.maxLivesCap : GameConfig.baseLives
        lives = roundMaxLives
        resetEntities()
    }

    func togglePause() {
        if state == .playing {
            state = .paused
        } else if state == .paused {
            state = .playing
        }
    }

    func resetToMenu() {
        state = .menu
        resetEntities()
    }

    func tick(date: Date) {
        frameTime = date.timeIntervalSinceReferenceDate
        handleMenuButtons()

        guard state == .playing else { return }

        applyMovement(currentMove())

        spawnOrbTimer += 1
        if spawnOrbTimer > 45 {
            spawnOrbTimer = 0
            spawnOrb()
        }

        spawnAstTimer -= 1
        if spawnAstTimer <= 0 {
            spawnAsteroid()
            spawnAstTimer = Int(getAstSpawnInterval())
        }

        if isPowerUpPhase {
            spawnPowerUpTimer += 1
            if spawnPowerUpTimer > GameConfig.powerUpSpawnInterval && powerUps.count < 3 {
                spawnPowerUpTimer = 0
                spawnPowerUp()
            }
        } else {
            spawnPowerUpTimer = 0
        }

        let orbMult: CGFloat = isAlienHardPhase ? 1.15 : (isAsteroidFastPhase ? 1.2 : 1)
        for i in orbs.indices {
            orbs[i].y += orbs[i].vy * orbMult
            orbs[i].pulse += 0.1
        }
        orbs.removeAll { $0.y >= GameConfig.worldHeight + 30 }

        for i in powerUps.indices {
            powerUps[i].y += powerUps[i].vy * (isAsteroidFastPhase ? 1.15 : 1)
            powerUps[i].pulse += 0.12
        }
        powerUps.removeAll { $0.y >= GameConfig.worldHeight + 40 }

        let astSpeed = asteroidSpeedMultiplier
        for i in asteroids.indices {
            asteroids[i].y += asteroids[i].vy * astSpeed
            asteroids[i].rot += asteroids[i].vr
        }
        asteroids.removeAll { $0.y >= GameConfig.worldHeight + 50 }

        updateUfosAndLasers()
        updateBullets()

        if invuln > 0 { invuln -= 1 }
        if shieldTimer > 0 { shieldTimer -= 1 }
        if gunTimer > 0 { gunTimer -= 1 }
        if magnetTimer > 0 { magnetTimer -= 1 }

        if magnetTimer > 0 {
            applyMagnetPull(x: player.x, y: player.y)
        }

        runCollisions()
        laserHitPlayer()
        tickGunFire()

        if lives <= 0 {
            gameOver()
        }
    }

    // MARK: - Phases

    var isAsteroidFastPhase: Bool { score >= GameConfig.asteroidFastScore }
    var isPowerUpPhase: Bool { score >= GameConfig.powerUpScore }
    var isAlienPhase: Bool { score >= GameConfig.alienPhaseScore }
    var isAlienHardPhase: Bool { score >= GameConfig.alienHardPhaseScore }
    var isAlienElitePhase: Bool { score >= GameConfig.alienElitePhaseScore }

    var asteroidSpeedMultiplier: CGFloat {
        var m: CGFloat = 1
        if isAsteroidFastPhase { m = GameConfig.asteroidFastMult }
        if score >= GameConfig.alienHardPhaseScore { m *= GameConfig.asteroidHardMult }
        return m
    }

    var playerAngle: CGFloat {
        if hypot(player.vx, player.vy) > 0.25 {
            return atan2(player.vy, player.vx) + .pi / 2
        }
        return 0
    }

    // MARK: - Private

    private func handleMenuButtons() {
        let selectEdge = controllerSelectPressed && !prevSelect
        let pauseEdge = controllerPausePressed && !prevPause
        prevSelect = controllerSelectPressed
        prevPause = controllerPausePressed

        if pauseEdge && (state == .playing || state == .paused) {
            togglePause()
        }

        if selectEdge || (state == .menu && controllerInput.isActive) {
            if state == .menu || state == .over {
                startGame()
            }
        }
    }

    private func currentMove() -> MoveInput {
        // Prefer on-screen arrows while held — otherwise a connected/idle pad
        // (or stick noise) can swallow touch input.
        if touchInput.isActive { return touchInput }
        if controllerInput.isActive { return controllerInput }
        return MoveInput()
    }

    private func applyMovement(_ move: MoveInput) {
        var dx = move.dx
        var dy = move.dy
        let len = hypot(dx, dy)
        if len > 0.001 {
            dx /= len
            dy /= len
            player.vx = dx * player.speed
            player.vy = dy * player.speed
        } else {
            player.vx *= 0.85
            player.vy *= 0.85
        }
        player.x = min(max(player.r, player.x + player.vx), GameConfig.worldWidth - player.r)
        player.y = min(max(player.r, player.y + player.vy), GameConfig.worldHeight - player.r)
    }

    private func resetEntities() {
        player.x = GameConfig.worldWidth / 2
        player.y = GameConfig.worldHeight / 2
        player.vx = 0
        player.vy = 0
        orbs = []
        asteroids = []
        ufos = []
        lasers = []
        powerUps = []
        bullets = []
        spawnOrbTimer = 0
        spawnAstTimer = 60
        spawnUfoTimer = 0
        spawnPowerUpTimer = 90
        alienPhaseWasActive = false
        alienHardPhaseWasActive = false
        invuln = 90
        shieldTimer = 0
        gunTimer = 0
        magnetTimer = 0
        gunCd = 0
    }

    private func initStars() {
        stars = (0..<80).map { _ in
            Star(
                x: CGFloat.random(in: 0..<GameConfig.worldWidth),
                y: CGFloat.random(in: 0..<GameConfig.worldHeight),
                size: CGFloat.random(in: 0.5...2.5),
                speed: CGFloat.random(in: 0.2...0.8)
            )
        }
    }

    func advanceStars() {
        for i in stars.indices {
            stars[i].y += stars[i].speed
            if stars[i].y > GameConfig.worldHeight {
                stars[i].y = 0
                stars[i].x = CGFloat.random(in: 0..<GameConfig.worldWidth)
            }
        }
    }

    private func spawnOrb() {
        orbs.append(Orb(
            x: CGFloat.random(in: 30...(GameConfig.worldWidth - 30)),
            y: -20,
            r: 14,
            vy: 2 + CGFloat.random(in: 0...1.5),
            pulse: CGFloat.random(in: 0...(CGFloat.pi * 2))
        ))
    }

    private func spawnAsteroid() {
        let speed = asteroidSpeedMultiplier
        let r = 16 + CGFloat.random(in: 0...22)
        asteroids.append(Asteroid(
            x: CGFloat.random(in: r...(GameConfig.worldWidth - r)),
            y: -r,
            r: r,
            vy: (1.8 + CGFloat.random(in: 0...2.5)) * speed,
            rot: CGFloat.random(in: 0...(CGFloat.pi * 2)),
            vr: CGFloat.random(in: -0.04...0.04),
            verts: 7 + Int.random(in: 0...3)
        ))
    }

    private func spawnPowerUp() {
        let type = PowerUpType.allCases.randomElement()!
        powerUps.append(PowerUp(
            x: CGFloat.random(in: 40...(GameConfig.worldWidth - 40)),
            y: -24,
            r: 16,
            vy: 1.7 + CGFloat.random(in: 0...1.1),
            type: type,
            pulse: CGFloat.random(in: 0...(CGFloat.pi * 2))
        ))
    }

    private func getAstSpawnInterval() -> CGFloat {
        if score >= GameConfig.alienElitePhaseScore { return 20 }
        if isAlienHardPhase { return 24 }
        if isAsteroidFastPhase { return CGFloat(GameConfig.asteroidFastSpawn) }
        return max(50, 72 - CGFloat(score) * 0.07)
    }

    private func maxUfoCount() -> Int {
        isAlienElitePhase ? GameConfig.maxUfosElite : GameConfig.maxUfos
    }

    private func spawnUfo(forceType: UfoType? = nil) {
        let margin: CGFloat = 55
        let hard = isAlienHardPhase
        let type = forceType ?? (hard && Bool.random() ? .blue : .orange)
        let speedBase: CGFloat = hard ? 1.35 : 1.1
        ufos.append(Ufo(
            x: CGFloat.random(in: margin...(GameConfig.worldWidth - margin)),
            y: type == .blue ? -48 - CGFloat.random(in: 0...24) : -36 - CGFloat.random(in: 0...28),
            vx: (Bool.random() ? -1 : 1) * (speedBase + CGFloat.random(in: 0...0.9)),
            vy: 0.75 + CGFloat.random(in: 0...0.55),
            type: type,
            shootCd: 25 + Int.random(in: 0...35),
            shootFlash: 0
        ))
    }

    private func fireLaser(fromX: CGFloat, fromY: CGFloat, targetX: CGFloat, targetY: CGFloat, ufoType: UfoType) {
        let isBlue = ufoType == .blue
        let originY = fromY - (isBlue ? 28 : 20)
        let dx = targetX - fromX
        let dy = targetY - originY
        let len = max(hypot(dx, dy), 1)
        let speed: CGFloat = isBlue ? 6.4 : (isAlienHardPhase ? 5.9 : 5.4)
        lasers.append(Laser(
            x: fromX,
            y: originY,
            vx: (dx / len) * speed,
            vy: (dy / len) * speed,
            r: isBlue ? 6 : 5
        ))
    }

    private func updateUfosAndLasers() {
        guard isAlienPhase else {
            alienPhaseWasActive = false
            alienHardPhaseWasActive = false
            ufos = []
            lasers = []
            return
        }

        if !alienPhaseWasActive {
            alienPhaseWasActive = true
            spawnUfo(forceType: .orange)
        }
        if isAlienHardPhase && !alienHardPhaseWasActive {
            alienHardPhaseWasActive = true
            spawnUfo(forceType: .blue)
        }

        let spawnInterval = isAlienElitePhase ? 120 : (isAlienHardPhase ? 145 : 190)
        spawnUfoTimer += 1
        if spawnUfoTimer > spawnInterval && ufos.count < maxUfoCount() {
            spawnUfoTimer = 0
            spawnUfo()
        }

        let fallMult = asteroidSpeedMultiplier
        for i in ufos.indices {
            let edge: CGFloat = ufos[i].type == .blue ? 62 : 48
            ufos[i].x += ufos[i].vx
            ufos[i].y += ufos[i].vy * fallMult
            if ufos[i].x < edge || ufos[i].x > GameConfig.worldWidth - edge {
                ufos[i].vx *= -1
            }
            if ufos[i].shootFlash > 0 { ufos[i].shootFlash -= 1 }
            ufos[i].shootCd -= 1
            if ufos[i].shootCd > 0 { continue }

            fireLaser(fromX: ufos[i].x, fromY: ufos[i].y, targetX: player.x, targetY: player.y, ufoType: ufos[i].type)
            let cdBase = ufos[i].type == .blue ? 50 : 65
            ufos[i].shootCd = cdBase + Int.random(in: 0...(isAlienHardPhase ? 40 : 55))
            ufos[i].shootFlash = 10
        }
        ufos.removeAll { $0.y >= GameConfig.worldHeight + 60 }

        for i in lasers.indices {
            lasers[i].x += lasers[i].vx
            lasers[i].y += lasers[i].vy
        }
        lasers.removeAll {
            $0.x < -30 || $0.x > GameConfig.worldWidth + 30 ||
            $0.y < -30 || $0.y > GameConfig.worldHeight + 30
        }
    }

    private func updateBullets() {
        for i in bullets.indices {
            bullets[i].x += bullets[i].vx
            bullets[i].y += bullets[i].vy
        }
        bullets.removeAll { b in
            for i in asteroids.indices where asteroids[i].y < GameConfig.worldHeight + 50 {
                if circleHit(b.x, b.y, b.r, asteroids[i].x, asteroids[i].y, asteroids[i].r) {
                    asteroids[i].y = GameConfig.worldHeight + 999
                    return true
                }
            }
            return b.x < -40 || b.x > GameConfig.worldWidth + 40 ||
                b.y < -40 || b.y > GameConfig.worldHeight + 40
        }
        asteroids.removeAll { $0.y >= GameConfig.worldHeight + 900 }
    }

    private func applyMagnetPull(x: CGFloat, y: CGFloat) {
        for i in orbs.indices {
            if orbs[i].y > GameConfig.worldHeight + 50 { continue }
            let d = hypot(orbs[i].x - x, orbs[i].y - y)
            if d < GameConfig.magnetRadius && d > 4 {
                let pull: CGFloat = 3.4
                orbs[i].x += ((x - orbs[i].x) / d) * pull
                orbs[i].y += ((y - orbs[i].y) / d) * pull
            }
        }
    }

    private func runCollisions() {
        for i in powerUps.indices {
            if powerUps[i].y < GameConfig.worldHeight + 900,
               circleHit(player.x, player.y, player.r + 4, powerUps[i].x, powerUps[i].y, powerUps[i].r) {
                grantPowerUp(powerUps[i].type)
                powerUps[i].y = GameConfig.worldHeight + 999
            }
        }
        powerUps.removeAll { $0.y >= GameConfig.worldHeight + 900 }

        for i in orbs.indices {
            if orbs[i].y < GameConfig.worldHeight + 900,
               circleHit(player.x, player.y, player.r, orbs[i].x, orbs[i].y, orbs[i].r) {
                score += shop?.orbPoints ?? 10
                orbs[i].y = GameConfig.worldHeight + 999
            }
        }
        orbs.removeAll { $0.y >= GameConfig.worldHeight + 900 }

        guard invuln <= 0 else { return }
        let hitR = player.r * 0.85
        for i in asteroids.indices {
            if asteroids[i].y < GameConfig.worldHeight + 900,
               circleHit(player.x, player.y, hitR, asteroids[i].x, asteroids[i].y, asteroids[i].r) {
                asteroids[i].y = GameConfig.worldHeight + 999
                if shieldTimer > 0 {
                    invuln = 40
                } else {
                    lives -= 1
                    invuln = 120
                }
                break
            }
        }
        asteroids.removeAll { $0.y >= GameConfig.worldHeight + 900 }
    }

    private func laserHitPlayer() {
        guard invuln <= 0 else { return }
        let hitR = player.r * 0.85
        for i in lasers.indices.reversed() {
            if circleHit(player.x, player.y, hitR, lasers[i].x, lasers[i].y, lasers[i].r) {
                lasers.remove(at: i)
                if shieldTimer > 0 {
                    invuln = 40
                } else {
                    lives -= 1
                    invuln = 120
                }
                return
            }
        }
    }

    private func tickGunFire() {
        guard gunTimer > 0 else { return }
        gunCd -= 1
        guard gunCd <= 0 else { return }
        gunCd = GameConfig.gunFireCd
        let aim: CGFloat
        if hypot(player.vx, player.vy) > 0.25 {
            aim = atan2(player.vy, player.vx)
        } else {
            aim = -.pi / 2
        }
        let speed: CGFloat = 9.5
        bullets.append(Bullet(
            x: player.x,
            y: player.y,
            vx: cos(aim) * speed,
            vy: sin(aim) * speed,
            r: 4
        ))
    }

    private func grantPowerUp(_ type: PowerUpType) {
        switch type {
        case .shield: shieldTimer = GameConfig.powerUpDuration
        case .gun: gunTimer = GameConfig.powerUpDuration
        case .magnet: magnetTimer = GameConfig.powerUpDuration
        }
    }

    private func gameOver() {
        guard state != .over else { return }
        state = .over
        if score > 0 {
            _ = shop?.addCoins(score)
        }
        if score > highScore {
            highScore = score
            UserDefaults.standard.set(highScore, forKey: GameConfig.highScoreKey)
        }
    }

    private func circleHit(_ ax: CGFloat, _ ay: CGFloat, _ ar: CGFloat,
                           _ bx: CGFloat, _ by: CGFloat, _ br: CGFloat) -> Bool {
        hypot(ax - bx, ay - by) < ar + br
    }
}
