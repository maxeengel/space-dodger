import SwiftUI

struct GameCanvas: View {
    @Bindable var engine: GameEngine

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 60.0, paused: false)) { timeline in
            Canvas { context, size in
                let sx = size.width / GameConfig.worldWidth
                let sy = size.height / GameConfig.worldHeight
                let scale = min(sx, sy)
                let offsetX = (size.width - GameConfig.worldWidth * scale) / 2
                let offsetY = (size.height - GameConfig.worldHeight * scale) / 2

                context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(red: 0.02, green: 0.03, blue: 0.06)))

                context.translateBy(x: offsetX, y: offsetY)
                context.scaleBy(x: scale, y: scale)

                drawStarfield(&context)
                for o in engine.orbs { drawOrb(&context, o) }
                for p in engine.powerUps { drawPowerUp(&context, p) }
                for a in engine.asteroids { drawAsteroid(&context, a) }
                for u in engine.ufos { drawUfo(&context, u) }
                for l in engine.lasers { drawLaser(&context, l) }
                for b in engine.bullets { drawBullet(&context, b) }
                drawPlayer(&context)
                drawLives(&context)
                drawHUD(&context)

                if engine.state == .paused {
                    drawPause(&context)
                }
            }
            .onChange(of: timeline.date) { _, date in
                engine.tick(date: date)
                if engine.state == .playing {
                    engine.advanceStars()
                }
            }
        }
        .allowsHitTesting(false)
    }

    // MARK: - Drawing

    private func drawStarfield(_ context: inout GraphicsContext) {
        for s in engine.stars {
            let alpha = Double(s.size / 3)
            var c = context
            c.opacity = alpha
            c.fill(
                Path(CGRect(x: s.x, y: s.y, width: s.size, height: s.size)),
                with: .color(.white)
            )
        }
    }

    private func drawOrb(_ context: inout GraphicsContext, _ o: Orb) {
        let pulse = 0.88 + sin(o.pulse) * 0.12
        let r = o.r * pulse
        let rayRot = o.pulse * 0.35
        var ctx = context
        ctx.translateBy(x: o.x, y: o.y)

        for i in 0..<8 {
            let a = (CGFloat(i) / 8) * .pi * 2 + rayRot
            var ray = Path()
            ray.move(to: CGPoint(x: 0, y: r * 0.4))
            ray.addLine(to: CGPoint(x: r * 0.12, y: r * 1.4))
            ray.addLine(to: CGPoint(x: -r * 0.12, y: r * 1.4))
            ray.closeSubpath()
            var rotated = ctx
            rotated.rotate(by: .radians(Double(a)))
            rotated.fill(ray, with: .color(Color(red: 0.99, green: 0.88, blue: 0.28).opacity(0.8)))
        }

        ctx.fill(
            Path(ellipseIn: CGRect(x: -r * 0.9, y: -r * 0.9, width: r * 1.8, height: r * 1.8)),
            with: .color(Color(red: 0.98, green: 0.75, blue: 0.14))
        )
        ctx.fill(
            Path(ellipseIn: CGRect(x: -r * 0.32, y: -r * 0.32, width: r * 0.64, height: r * 0.64)),
            with: .color(Color(red: 1, green: 1, blue: 0.9).opacity(0.95))
        )
    }

    private func drawPowerUp(_ context: inout GraphicsContext, _ p: PowerUp) {
        let pulse = 0.9 + sin(p.pulse) * 0.1
        let r = p.r * pulse
        let color: Color
        let icon: String
        switch p.type {
        case .shield: color = Color(red: 0.22, green: 0.74, blue: 0.97); icon = "🛡️"
        case .gun: color = Color(red: 0.98, green: 0.45, blue: 0.09); icon = "🔫"
        case .magnet: color = Color(red: 0.65, green: 0.55, blue: 0.98); icon = "🧲"
        }
        var ctx = context
        ctx.translateBy(x: p.x, y: p.y)
        ctx.fill(Path(ellipseIn: CGRect(x: -r, y: -r, width: r * 2, height: r * 2)), with: .color(color))
        ctx.fill(
            Path(ellipseIn: CGRect(x: -r * 0.72, y: -r * 0.72, width: r * 1.44, height: r * 1.44)),
            with: .color(Color(red: 0.06, green: 0.09, blue: 0.16).opacity(0.85))
        )
        ctx.draw(
            Text(icon).font(.system(size: 16)),
            at: CGPoint(x: 0, y: 1),
            anchor: .center
        )
    }

    private func drawAsteroid(_ context: inout GraphicsContext, _ a: Asteroid) {
        var ctx = context
        ctx.translateBy(x: a.x, y: a.y)
        ctx.rotate(by: .radians(Double(a.rot)))
        var path = Path()
        for i in 0..<a.verts {
            let ang = (CGFloat(i) / CGFloat(a.verts)) * .pi * 2
            let rad = a.r * (0.75 + CGFloat(i % 3) * 0.08)
            let pt = CGPoint(x: cos(ang) * rad, y: sin(ang) * rad)
            if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
        }
        path.closeSubpath()
        ctx.fill(path, with: .color(Color(red: 0.28, green: 0.33, blue: 0.41)))
        ctx.stroke(path, with: .color(Color(red: 0.58, green: 0.64, blue: 0.72)), lineWidth: 2)
    }

    private func drawUfo(_ context: inout GraphicsContext, _ u: Ufo) {
        let blue = u.type == .blue
        let rw: CGFloat = blue ? 40 : 30
        let rh: CGFloat = blue ? 14 : 10
        let alienY: CGFloat = blue ? -26 : -20
        let alienR: CGFloat = blue ? 9 : 7
        var ctx = context
        ctx.translateBy(x: u.x, y: u.y)

        if blue {
            ctx.fill(Path(ellipseIn: CGRect(x: -rw, y: 5 - rh, width: rw * 2, height: rh * 2)), with: .color(Color(red: 0.11, green: 0.31, blue: 0.85)))
            ctx.fill(Path(ellipseIn: CGRect(x: -rw, y: -rh + 1, width: rw * 2, height: (rh - 1) * 2)), with: .color(Color(red: 0.23, green: 0.51, blue: 0.96)))
            ctx.fill(Path(ellipseIn: CGRect(x: -18, y: -8 - 11, width: 36, height: 22)), with: .color(Color(red: 0.75, green: 0.86, blue: 1).opacity(0.65)))
        } else {
            ctx.fill(Path(ellipseIn: CGRect(x: -rw, y: 4 - (rh - 1), width: rw * 2, height: (rh - 1) * 2)), with: .color(Color(red: 0.92, green: 0.35, blue: 0.05)))
            ctx.fill(Path(ellipseIn: CGRect(x: -rw, y: -(rh - 2), width: rw * 2, height: (rh - 2) * 2)), with: .color(Color(red: 0.98, green: 0.57, blue: 0.24)))
            ctx.fill(Path(ellipseIn: CGRect(x: -14, y: -6 - 9, width: 28, height: 18)), with: .color(Color(red: 0.73, green: 0.90, blue: 0.99).opacity(0.55)))
        }

        ctx.fill(
            Path(ellipseIn: CGRect(x: -alienR, y: alienY - alienR - 1, width: alienR * 2, height: (alienR + 1) * 2)),
            with: .color(blue ? Color(red: 0.53, green: 0.94, blue: 0.67) : Color(red: 0.29, green: 0.87, blue: 0.50))
        )
        ctx.fill(Path(ellipseIn: CGRect(x: -5.2, y: alienY - 3.2, width: 4.4, height: 4.4)), with: .color(Color(red: 0.08, green: 0.33, blue: 0.18)))
        ctx.fill(Path(ellipseIn: CGRect(x: 0.8, y: alienY - 3.2, width: 4.4, height: 4.4)), with: .color(Color(red: 0.08, green: 0.33, blue: 0.18)))

        if u.shootFlash > 0 {
            let gunX: CGFloat = blue ? 18 : 14
            var flash = Path()
            flash.move(to: CGPoint(x: gunX + 8, y: alienY + 3))
            flash.addLine(to: CGPoint(x: gunX + (blue ? 20 : 16), y: alienY + 3))
            ctx.stroke(flash, with: .color(blue ? Color(red: 0.58, green: 0.77, blue: 0.99) : Color(red: 0.97, green: 0.44, blue: 0.44)), lineWidth: 3)
        }
    }

    private func drawLaser(_ context: inout GraphicsContext, _ l: Laser) {
        context.fill(
            Path(ellipseIn: CGRect(x: l.x - l.r, y: l.y - l.r, width: l.r * 2, height: l.r * 2)),
            with: .color(Color(red: 0.99, green: 0.65, blue: 0.65))
        )
        context.fill(
            Path(ellipseIn: CGRect(x: l.x - l.r * 0.45, y: l.y - l.r * 0.45, width: l.r * 0.9, height: l.r * 0.9)),
            with: .color(.white)
        )
    }

    private func drawBullet(_ context: inout GraphicsContext, _ b: Bullet) {
        context.fill(
            Path(ellipseIn: CGRect(x: b.x - b.r, y: b.y - b.r, width: b.r * 2, height: b.r * 2)),
            with: .color(Color(red: 0.99, green: 0.88, blue: 0.28))
        )
    }

    private func drawPlayer(_ context: inout GraphicsContext) {
        if engine.invuln > 0 && (engine.invuln / 8) % 2 == 0 { return }

        if engine.shieldTimer > 0 {
            let pulse = 0.85 + sin(engine.now * 10) * 0.15
            let r = engine.player.r * 1.55 * CGFloat(pulse)
            context.stroke(
                Path(ellipseIn: CGRect(x: engine.player.x - r, y: engine.player.y - r, width: r * 2, height: r * 2)),
                with: .color(Color(red: 0.22, green: 0.74, blue: 0.97).opacity(0.7)),
                lineWidth: 3
            )
        }
        if engine.magnetTimer > 0 {
            let r = GameConfig.magnetRadius * 0.55
            context.stroke(
                Path(ellipseIn: CGRect(x: engine.player.x - r, y: engine.player.y - r, width: r * 2, height: r * 2)),
                with: .color(Color(red: 0.65, green: 0.55, blue: 0.98).opacity(0.28)),
                style: StrokeStyle(lineWidth: 1.5, dash: [4, 6])
            )
        }

        var ctx = context
        ctx.translateBy(x: engine.player.x, y: engine.player.y)
        ctx.rotate(by: .radians(Double(engine.playerAngle)))
        let s = GameConfig.rocketVisualScale
        ctx.scaleBy(x: s, y: s)

        // Flame
        var flame = Path()
        flame.move(to: CGPoint(x: -7, y: 14))
        flame.addLine(to: CGPoint(x: 0, y: 30))
        flame.addLine(to: CGPoint(x: 7, y: 14))
        flame.closeSubpath()
        ctx.fill(flame, with: .color(Color(red: 0.98, green: 0.45, blue: 0.09)))
        var core = Path()
        core.move(to: CGPoint(x: -4, y: 14))
        core.addLine(to: CGPoint(x: 0, y: 22))
        core.addLine(to: CGPoint(x: 4, y: 14))
        core.closeSubpath()
        ctx.fill(core, with: .color(Color(red: 0.99, green: 0.88, blue: 0.28)))

        let colors = engine.shop?.rocketColors ?? (body: Color(red: 0.37, green: 0.92, blue: 0.83), accent: Color(red: 0.22, green: 0.74, blue: 0.97))
        let bodyColor = colors.body
        let accent = colors.accent

        // Fins
        var finL = Path()
        finL.move(to: CGPoint(x: -10, y: 8))
        finL.addLine(to: CGPoint(x: -18, y: 18))
        finL.addLine(to: CGPoint(x: -8, y: 14))
        finL.closeSubpath()
        ctx.fill(finL, with: .color(accent))
        var finR = Path()
        finR.move(to: CGPoint(x: 10, y: 8))
        finR.addLine(to: CGPoint(x: 18, y: 18))
        finR.addLine(to: CGPoint(x: 8, y: 14))
        finR.closeSubpath()
        ctx.fill(finR, with: .color(accent))

        // Body
        var body = Path()
        body.move(to: CGPoint(x: -9, y: 12))
        body.addLine(to: CGPoint(x: -9, y: -8))
        body.addQuadCurve(to: CGPoint(x: 0, y: -18), control: CGPoint(x: -9, y: -18))
        body.addQuadCurve(to: CGPoint(x: 9, y: -8), control: CGPoint(x: 9, y: -18))
        body.addLine(to: CGPoint(x: 9, y: 12))
        body.closeSubpath()
        ctx.fill(body, with: .color(bodyColor))
        ctx.stroke(body, with: .color(Color(red: 0.06, green: 0.09, blue: 0.16)), lineWidth: 2)

        // Nose
        var nose = Path()
        nose.move(to: CGPoint(x: 0, y: -28))
        nose.addLine(to: CGPoint(x: -7, y: -16))
        nose.addLine(to: CGPoint(x: 7, y: -16))
        nose.closeSubpath()
        ctx.fill(nose, with: .color(Color(red: 0.89, green: 0.91, blue: 0.94)))
        ctx.stroke(nose, with: .color(Color(red: 0.06, green: 0.09, blue: 0.16)), lineWidth: 2)

        // Cockpit (+ optional pilot)
        if engine.shop?.pilotEquipped == true {
            ctx.fill(
                Path(ellipseIn: CGRect(x: -5, y: -11, width: 10, height: 14)),
                with: .color(Color(red: 0.05, green: 0.29, blue: 0.43))
            )
            ctx.fill(
                Path(ellipseIn: CGRect(x: -3.2, y: -8.5, width: 6.4, height: 8)),
                with: .color(Color(red: 0.99, green: 0.85, blue: 0.71))
            )
            ctx.fill(
                Path(ellipseIn: CGRect(x: -5, y: -11, width: 10, height: 14)),
                with: .color(Color(red: 0.22, green: 0.74, blue: 0.97).opacity(0.35))
            )
        } else {
            ctx.fill(
                Path(ellipseIn: CGRect(x: -5, y: -11, width: 10, height: 14)),
                with: .color(Color(red: 0.22, green: 0.74, blue: 0.97))
            )
        }
    }

    private func drawLives(_ context: inout GraphicsContext) {
        guard engine.state == .playing || engine.state == .paused else { return }
        let heartSize: CGFloat = 22
        let gap: CGFloat = 8
        for i in 0..<engine.roundMaxLives {
            let x = 10 + CGFloat(i) * (heartSize + gap)
            let filled = i < engine.lives
            let color = filled ? Color(red: 0.96, green: 0.45, blue: 0.71) : Color(red: 0.39, green: 0.45, blue: 0.55)
            context.draw(
                Text(filled ? "♥" : "♡")
                    .font(.system(size: heartSize))
                    .foregroundColor(color),
                at: CGPoint(x: x + heartSize / 2, y: 18),
                anchor: .center
            )
        }
    }

    private func drawHUD(_ context: inout GraphicsContext) {
        guard engine.state == .playing || engine.state == .paused else { return }
        let hudTop: CGFloat = 42
        context.fill(
            Path(roundedRect: CGRect(x: 8, y: hudTop, width: 180, height: 28), cornerRadius: 6),
            with: .color(Color(red: 0.06, green: 0.09, blue: 0.16).opacity(0.6))
        )
        context.draw(
            Text("Poeng: \(engine.score)")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(red: 0.89, green: 0.91, blue: 0.94)),
            at: CGPoint(x: 16, y: hudTop + 14),
            anchor: .leading
        )

        if engine.shieldTimer > 0 || engine.gunTimer > 0 || engine.magnetTimer > 0 {
            var bits: [String] = []
            if engine.shieldTimer > 0 { bits.append("🛡️") }
            if engine.gunTimer > 0 { bits.append("🔫") }
            if engine.magnetTimer > 0 { bits.append("🧲") }
            context.draw(
                Text(bits.joined(separator: " "))
                    .font(.system(size: 14)),
                at: CGPoint(x: 16, y: hudTop + 40),
                anchor: .leading
            )
        }

        if !engine.padDisplayName.isEmpty {
            context.draw(
                Text(engine.padDisplayName)
                    .font(.system(size: 12))
                    .foregroundColor(Color(red: 0.29, green: 0.87, blue: 0.50)),
                at: CGPoint(x: GameConfig.worldWidth - 16, y: 24),
                anchor: .trailing
            )
        }

        let phaseY: CGFloat = 58
        if engine.isAlienElitePhase {
            context.draw(Text("5 romvesener").font(.system(size: 11)).foregroundColor(Color(red: 0.58, green: 0.77, blue: 0.99)),
                         at: CGPoint(x: GameConfig.worldWidth - 16, y: phaseY), anchor: .trailing)
        } else if engine.isAlienHardPhase {
            context.draw(Text("Blå UFO").font(.system(size: 11)).foregroundColor(Color(red: 0.38, green: 0.65, blue: 0.98)),
                         at: CGPoint(x: GameConfig.worldWidth - 16, y: phaseY), anchor: .trailing)
        } else if engine.isAlienPhase {
            context.draw(Text("Romvesener!").font(.system(size: 11)).foregroundColor(Color(red: 0.98, green: 0.57, blue: 0.24)),
                         at: CGPoint(x: GameConfig.worldWidth - 16, y: phaseY), anchor: .trailing)
        } else if engine.isAsteroidFastPhase {
            context.draw(Text("Raskere!").font(.system(size: 11)).foregroundColor(Color(red: 0.98, green: 0.75, blue: 0.14)),
                         at: CGPoint(x: GameConfig.worldWidth - 16, y: phaseY), anchor: .trailing)
        } else if engine.isPowerUpPhase {
            context.draw(Text("Power-ups").font(.system(size: 11)).foregroundColor(Color(red: 0.40, green: 0.91, blue: 0.98)),
                         at: CGPoint(x: GameConfig.worldWidth - 16, y: phaseY), anchor: .trailing)
        }
    }

    private func drawPause(_ context: inout GraphicsContext) {
        context.fill(
            Path(CGRect(x: 0, y: 0, width: GameConfig.worldWidth, height: GameConfig.worldHeight)),
            with: .color(Color(red: 0.02, green: 0.03, blue: 0.06).opacity(0.55))
        )
        context.draw(
            Text("PAUSE")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(Color(red: 0.89, green: 0.91, blue: 0.94)),
            at: CGPoint(x: GameConfig.worldWidth / 2, y: GameConfig.worldHeight / 2),
            anchor: .center
        )
    }
}
