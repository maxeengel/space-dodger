(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");
  const padStatus = document.getElementById("pad-status");
  const padLabel = document.getElementById("pad-label");
  const padHint = document.getElementById("pad-hint");
  const padWarning = document.getElementById("pad-warning");
  const padDebug = document.getElementById("pad-debug");
  const padInput = document.getElementById("pad-input");
  const stickDot = document.getElementById("stick-dot");
  const btnRow = document.getElementById("btn-row");
  const scoreEl = document.getElementById("score-display");
  const livesEl = document.getElementById("lives-display");
  const highEl = document.getElementById("high-display");
  const pauseBtn = document.getElementById("pause-btn");
  const musicBtn = document.getElementById("music-btn");

  const DEADZONE = 0.12;
  const HIGH_KEY = "ringRunnerHigh";
  const MEDIA_KEY_CODES = new Set([
    "AudioVolumeUp",
    "AudioVolumeDown",
    "AudioVolumeMute",
    "MediaTrackNext",
    "MediaTrackPrevious",
  ]);

  let state = "menu";
  let score = 0;
  let lives = 3;
  let highScore = Number(localStorage.getItem(HIGH_KEY)) || 0;
  let activePadIndex = null;
  let padDisplayName = "";

  const keys = {};
  const player = { x: 400, y: 250, r: 22, vx: 0, vy: 0, speed: 4.2 };
  let orbs = [];
  let asteroids = [];
  let stars = [];
  let spawnOrbTimer = 0;
  let spawnAstTimer = 0;
  let invuln = 0;
  let frontBtnWasDown = false;
  let prevPressedBtns = [];
  let remotePeers = [];
  let hostPlayer = null;
  let worldSyncTick = 0;
  let pendingWorld = null;
  let worldTarget = null;
  let guestBlend = 1;
  let lastWorldTime = 0;
  const GUEST_BLEND_SPEED = 0.18;

  // Magicsee R1: rund OK-knapp foran = knapp 6
  const FRONT_BTN = [6];

  function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: Math.random() * 2 + 0.5,
        sp: Math.random() * 0.6 + 0.2,
      });
    }
  }

  function getActiveGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (activePadIndex != null && pads[activePadIndex]) {
      return pads[activePadIndex];
    }
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p && p.connected) {
        activePadIndex = i;
        return p;
      }
    }
    return null;
  }

  function axisVal(pad, i) {
    const v = pad.axes[i];
    if (v == null || Number.isNaN(v)) return 0;
    return Math.abs(v) < DEADZONE ? 0 : v;
  }

  function btnOn(pad, i) {
    const b = pad.buttons[i];
    return !!(b && (b.pressed || b.value > 0.45));
  }

  function readStick(pad) {
    let ax = 0;
    let ay = 0;
    let best = 0;

    for (let i = 0; i < pad.axes.length; i += 2) {
      const x = axisVal(pad, i);
      const y = axisVal(pad, i + 1);
      const mag = Math.hypot(x, y);
      if (mag > best) {
        best = mag;
        ax = x;
        ay = y;
      }
    }

    if (Math.abs(ax) < DEADZONE && Math.abs(ay) < DEADZONE) {
      ax = 0;
      ay = 0;
    }
    return { ax, ay };
  }

  function readDPadButtons(pad) {
    let dx = 0;
    let dy = 0;

    const left = [14, 2];
    const right = [15, 7, 3];
    const up = [12, 4];
    const down = [13, 5];

    if (left.some((i) => btnOn(pad, i))) dx -= 1;
    if (right.some((i) => btnOn(pad, i))) dx += 1;
    if (up.some((i) => btnOn(pad, i))) dy -= 1;
    if (down.some((i) => btnOn(pad, i))) dy += 1;

    return { dx, dy };
  }

  function readMovement(pad) {
    const stick = readStick(pad);
    let dx = stick.ax;
    let dy = stick.ay;

    const dpad = readDPadButtons(pad);
    if (dpad.dx) dx = dpad.dx;
    if (dpad.dy) dy = dpad.dy;

    return { dx, dy };
  }

  function padButtonPressed(pad, indices) {
    return indices.some((i) => btnOn(pad, i));
  }

  function frontButtonDown(pad) {
    return FRONT_BTN.some((i) => btnOn(pad, i));
  }

  function getPressedButtonIndices(pad) {
    const pressed = [];
    for (let i = 0; i < pad.buttons.length; i++) {
      if (btnOn(pad, i)) pressed.push(i);
    }
    return pressed;
  }

  function handleGamepadRetry(pad) {
    if (!pad) {
      prevPressedBtns = [];
      return;
    }
    const now = getPressedButtonIndices(pad);
    if (state === "over") {
      const newlyPressed = now.some((i) => !prevPressedBtns.includes(i));
      if (newlyPressed) {
        startGame();
      }
    }
    prevPressedBtns = now;
  }

  function handleGamepadPause(pad) {
    if (!pad) {
      frontBtnWasDown = false;
      return;
    }
    const down = frontButtonDown(pad);
    if (down && !frontBtnWasDown && (state === "playing" || state === "paused")) {
      togglePause();
    }
    frontBtnWasDown = down;
  }

  function showMediaModeWarning() {
    padWarning.textContent =
      "R1 er i medie-modus (lydknapper). Slå av, hold M+B, slå på, og par på nytt.";
    padWarning.classList.remove("hidden");
  }

  function formatPadDebug(pad) {
    const axes = pad.axes.map((v, i) => i + ":" + (v || 0).toFixed(2)).join(" ");
    const btns = [];
    for (let i = 0; i < pad.buttons.length; i++) {
      if (btnOn(pad, i)) btns.push(i);
    }
    return (pad.id || "?").slice(0, 40) + "\n" + axes + "\nKnapp: " + (btns.join(",") || "–");
  }

  function updatePadUI(pad) {
    if (!pad) {
      padStatus.className = "status disconnected";
      padLabel.textContent = "Ikke tilkoblet";
      padInput.classList.add("hidden");
      padHint.style.display = "block";
      return;
    }

    const name = pad.id || "Spillkontroll";
    const isMagicsee = /magicsee|r1|vr|remote/i.test(name);
    padDisplayName = isMagicsee ? "Magicsee R1" : name.slice(0, 28);

    padStatus.className = "status connected";
    padLabel.textContent = padDisplayName + " ✓";
    padHint.style.display = "none";
    padInput.classList.remove("hidden");

    const move = readMovement(pad);
    if (Math.hypot(move.dx, move.dy) > 0.2) {
      padWarning.classList.add("hidden");
    }

    const cx = 50 + move.dx * 38;
    const cy = 50 + move.dy * 38;
    stickDot.style.left = cx + "%";
    stickDot.style.top = cy + "%";

    btnRow.innerHTML = "";
    const showCount = Math.min(pad.buttons.length, 12);
    for (let i = 0; i < showCount; i++) {
      const el = document.createElement("span");
      el.className = "btn-pill" + (btnOn(pad, i) ? " active" : "");
      el.textContent = i;
      btnRow.appendChild(el);
    }

    if (padDebug) padDebug.textContent = formatPadDebug(pad);
  }

  function onPadConnected(e) {
    activePadIndex = e.gamepad.index;
    updatePadUI(e.gamepad);
  }

  function onPadDisconnected(e) {
    if (activePadIndex === e.gamepad.index) {
      activePadIndex = null;
    }
    updatePadUI(getActiveGamepad());
  }

  window.addEventListener("gamepadconnected", onPadConnected);
  window.addEventListener("gamepaddisconnected", onPadDisconnected);

  function isTypingInForm() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  window.addEventListener("keydown", (e) => {
    if (isTypingInForm()) return;

    if (MEDIA_KEY_CODES.has(e.code)) {
      showMediaModeWarning();
      e.preventDefault();
      return;
    }

    keys[e.code] = true;
    if (
      e.code.startsWith("Arrow") ||
      e.code.startsWith("Key") ||
      e.code === "Space"
    ) {
      e.preventDefault();
    }
    if (state === "menu" && (e.code === "Space" || e.code === "Enter")) {
      startGame();
    }
    if (state === "over" && (e.code === "Space" || e.code === "Enter" || e.code === "KeyA")) {
      startGame();
    }
    if ((e.code === "Escape" || e.code === "KeyP") && (state === "playing" || state === "paused")) {
      e.preventDefault();
      togglePause();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (isTypingInForm()) return;
    keys[e.code] = false;
  });

  startBtn.addEventListener("click", () => {
    if (state === "menu") startGame();
    else if (state === "over") startGame();
  });

  function keyboardMove() {
    let dx = 0;
    let dy = 0;
    if (keys.ArrowLeft || keys.KeyA || keys.KeyJ) dx -= 1;
    if (keys.ArrowRight || keys.KeyD || keys.KeyL) dx += 1;
    if (keys.ArrowUp || keys.KeyW || keys.KeyI) dy -= 1;
    if (keys.ArrowDown || keys.KeyS || keys.KeyK) dy += 1;
    return { dx, dy };
  }

  function applyMovement(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    player.vx = (dx / len) * player.speed;
    player.vy = (dy / len) * player.speed;
    if (dx === 0 && dy === 0) {
      player.vx *= 0.85;
      player.vy *= 0.85;
    }
    player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x + player.vx));
    player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y + player.vy));
  }

  function spawnOrb() {
    orbs.push({
      x: Math.random() * (canvas.width - 60) + 30,
      y: -20,
      r: 14,
      vy: 2 + Math.random() * 1.5,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function spawnAsteroid() {
    const r = 16 + Math.random() * 22;
    asteroids.push({
      x: Math.random() * (canvas.width - r * 2) + r,
      y: -r,
      r,
      vy: 1.8 + Math.random() * 2.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.08,
      verts: 7 + Math.floor(Math.random() * 4),
    });
  }

  function resetGameEntities() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.vx = 0;
    player.vy = 0;
    orbs = [];
    asteroids = [];
    spawnOrbTimer = 0;
    spawnAstTimer = 60;
    invuln = 90;
  }

  function updateMusicBtn() {
    const active = state === "playing" || state === "paused";
    musicBtn.classList.toggle("hidden", !active);
    const muted = window.Bgm && Bgm.isMuted();
    musicBtn.textContent = muted ? "Musikk av" : "Musikk på";
    musicBtn.classList.toggle("muted", muted);
    musicBtn.setAttribute("aria-label", muted ? "Slå på musikk" : "Slå av musikk");
  }

  function updatePauseBtn() {
    const active = state === "playing" || state === "paused";
    pauseBtn.classList.toggle("hidden", !active);
    pauseBtn.textContent = state === "paused" ? "Fortsett" : "Pause";
    pauseBtn.setAttribute("aria-label", state === "paused" ? "Fortsett spill" : "Pause spill");
    updateMusicBtn();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
    } else if (state === "paused") {
      state = "playing";
    }
    updatePauseBtn();
    if (isMpHost()) Multiplayer.sendWorld(packWorld());
  }

  function startGame() {
    state = "playing";
    score = 0;
    lives = 3;
    resetGameEntities();
    hostPlayer = null;
    worldSyncTick = 0;
    pendingWorld = null;
    worldTarget = null;
    guestBlend = 1;
    lastWorldTime = 0;
    overlay.classList.add("hidden");
    updateHUD();
    updatePauseBtn();
    if (window.Bgm) Bgm.start();
    if (isMpHost()) Multiplayer.sendWorld(packWorld());
  }

  function gameOver() {
    state = "over";
    const finalScore = isMultiplayerSession() ? getCombinedScore() : score;
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem(HIGH_KEY, String(highScore));
    }
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "Game over";
    overlayText.textContent = isMultiplayerSession()
      ? "Lagpoeng: " + finalScore + " (dine: " + score + "). Trykk A eller en knapp for å prøve igjen."
      : "Poeng: " + score + ". Trykk A eller en knapp på R1 for å prøve igjen.";
    startBtn.textContent = "Prøv igjen";
    updateHUD();
    updatePauseBtn();
    if (isMpHost()) Multiplayer.sendWorld(packWorld());
  }

  function resetToMenu() {
    state = "menu";
    if (window.Bgm) Bgm.stop();
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "Ring Runner";
    overlayText.textContent = "Fly gjennom rommet, samle energi og unngå asteroider.";
    startBtn.textContent = "Start spill";
    resetGameEntities();
    updateHUD();
    updatePauseBtn();
  }

  pauseBtn.addEventListener("click", togglePause);

  musicBtn.addEventListener("click", () => {
    if (!window.Bgm) return;
    Bgm.toggleMute();
    updateMusicBtn();
  });

  function isMultiplayerSession() {
    return (
      window.Multiplayer &&
      Multiplayer.isActive() &&
      remotePeers.length > 0
    );
  }

  function isMpHost() {
    return isMultiplayerSession() && Multiplayer.isHost();
  }

  function isMpGuest() {
    return isMultiplayerSession() && Multiplayer.isGuest();
  }

  function packWorld() {
    return {
      gameState: state,
      score: score,
      lives: lives,
      invuln: invuln,
      px: Math.round(player.x),
      py: Math.round(player.y),
      orbs: orbs.map((o) => ({
        x: Math.round(o.x),
        y: Math.round(o.y),
        r: o.r,
        vy: o.vy,
      })),
      asteroids: asteroids.map((a) => ({
        x: Math.round(a.x),
        y: Math.round(a.y),
        r: a.r,
        vy: a.vy,
        rot: a.rot,
        vr: a.vr,
        verts: a.verts,
      })),
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function mapOrbsFromWorld(list) {
    return (list || []).map((o) => ({
      x: o.x,
      y: o.y,
      r: o.r,
      vy: o.vy,
      pulse: o.pulse != null ? o.pulse : Math.random() * Math.PI * 2,
    }));
  }

  function mapAsteroidsFromWorld(list) {
    return (list || []).map((a) => ({
      x: a.x,
      y: a.y,
      r: a.r,
      vy: a.vy,
      rot: a.rot,
      vr: a.vr,
      verts: a.verts,
    }));
  }

  function applyWorldMeta(w) {
    if (w.gameState === "playing" && (state === "menu" || state === "over")) {
      state = "playing";
      overlay.classList.add("hidden");
      updatePauseBtn();
      if (window.Bgm) Bgm.start();
    }
    if (w.gameState === "paused" && state === "playing") {
      state = "paused";
      updatePauseBtn();
    }
    if (w.gameState === "playing" && state === "paused") {
      state = "playing";
      updatePauseBtn();
    }
    if (w.gameState === "over" && state !== "over") {
      score = w.score ?? score;
      lives = w.lives ?? lives;
      gameOver();
      return true;
    }
    return false;
  }

  function queueWorldState(w) {
    if (!w) return;
    if (w.t && w.t <= lastWorldTime) return;
    pendingWorld = w;
  }

  function acceptWorldTarget(w) {
    if (!w) return;
    if (w.t) lastWorldTime = w.t;
    if (applyWorldMeta(w)) return;

    score = w.score ?? score;
    lives = w.lives ?? lives;
    invuln = w.invuln ?? invuln;

    if (!worldTarget) {
      orbs = mapOrbsFromWorld(w.orbs);
      asteroids = mapAsteroidsFromWorld(w.asteroids);
      guestBlend = 1;
    } else {
      guestBlend = 0;
    }

    worldTarget = w;

    if (w.px != null && w.py != null) {
      if (!hostPlayer) {
        hostPlayer = { x: w.px, y: w.py, color: "#f472b6", name: "Vert" };
      }
    }
  }

  function stepGuestWorldBlend() {
    if (!worldTarget || state === "over") return;

    const targetOrbs = mapOrbsFromWorld(worldTarget.orbs);
    const targetAst = mapAsteroidsFromWorld(worldTarget.asteroids);

    if (guestBlend < 1) {
      guestBlend = Math.min(1, guestBlend + GUEST_BLEND_SPEED);
    }

    const t = guestBlend;

    const newOrbs = [];
    for (let i = 0; i < targetOrbs.length; i++) {
      const to = targetOrbs[i];
      const from = orbs[i];
      if (from) {
        newOrbs.push({
          x: lerp(from.x, to.x, t),
          y: lerp(from.y, to.y, t),
          r: to.r,
          vy: to.vy,
          pulse: from.pulse + 0.1,
        });
      } else {
        newOrbs.push({ ...to });
      }
    }
    orbs = newOrbs;

    const newAst = [];
    for (let i = 0; i < targetAst.length; i++) {
      const to = targetAst[i];
      const from = asteroids[i];
      if (from) {
        newAst.push({
          x: lerp(from.x, to.x, t),
          y: lerp(from.y, to.y, t),
          r: to.r,
          vy: to.vy,
          rot: lerp(from.rot, to.rot, t),
          vr: to.vr,
          verts: to.verts,
        });
      } else {
        newAst.push({ ...to });
      }
    }
    asteroids = newAst;

    if (hostPlayer && worldTarget.px != null) {
      hostPlayer.x = lerp(hostPlayer.x, worldTarget.px, t);
      hostPlayer.y = lerp(hostPlayer.y, worldTarget.py, t);
    }
  }

  function checkCollisionsAt(x, y, rScale) {
    const r = player.r * (rScale || 1);
    for (const o of orbs) {
      if (circleHit(x, y, r, o.x, o.y, o.r)) {
        score += 10;
        o.y = canvas.height + 999;
      }
    }
    if (invuln <= 0) {
      for (const a of asteroids) {
        if (circleHit(x, y, r * 0.85, a.x, a.y, a.r)) {
          lives--;
          invuln = 120;
          a.y = canvas.height + 999;
          if (lives <= 0) {
            gameOver();
          }
          return true;
        }
      }
    }
    return false;
  }

  function getCombinedScore() {
    let total = score;
    for (const p of remotePeers) {
      total += p.score || 0;
    }
    return total;
  }

  function updateHUD() {
    if (isMultiplayerSession()) {
      const team = getCombinedScore();
      scoreEl.textContent = "Lagpoeng: " + team + " (dine: " + score + ")";
    } else {
      scoreEl.textContent = "Poeng: " + score;
    }
    livesEl.textContent = "Liv: " + lives;
    highEl.textContent = "Rekord: " + highScore;
  }

  function circleHit(ax, ay, ar, bx, by, br) {
    const d = Math.hypot(ax - bx, ay - by);
    return d < ar + br;
  }

  function update() {
    const pad = getActiveGamepad();
    updatePadUI(pad);
    handleGamepadPause(pad);
    handleGamepadRetry(pad);

    if (state === "paused") {
      if (isMpHost()) Multiplayer.sendWorld(packWorld());
      else if (isMpGuest()) Multiplayer.sendPlayer({ x: player.x, y: player.y });
      return;
    }

    if (state !== "playing") {
      if (state === "menu" && pad) {
        const m = readMovement(pad);
        if (Math.hypot(m.dx, m.dy) > 0.35 || frontButtonDown(pad) || padButtonPressed(pad, [1, 2, 3, 4, 5])) {
          startGame();
        }
      }
      return;
    }

    let dx = 0;
    let dy = 0;
    if (pad) {
      const m = readMovement(pad);
      dx = m.dx;
      dy = m.dy;
    }
    const kb = keyboardMove();
    if (kb.dx || kb.dy) {
      dx = kb.dx;
      dy = kb.dy;
    }
    applyMovement(dx, dy);

    if (isMpGuest()) {
      if (pendingWorld) {
        acceptWorldTarget(pendingWorld);
        pendingWorld = null;
      }
      stepGuestWorldBlend();
      Multiplayer.sendPlayer({ x: player.x, y: player.y });
      updateHUD();
      return;
    }

    spawnOrbTimer++;
    if (spawnOrbTimer > 45) {
      spawnOrbTimer = 0;
      spawnOrb();
    }

    spawnAstTimer--;
    if (spawnAstTimer <= 0) {
      spawnAsteroid();
      spawnAstTimer = Math.max(25, 70 - score * 0.5);
    }

    for (const o of orbs) {
      o.y += o.vy;
      o.pulse += 0.1;
    }
    orbs = orbs.filter((o) => o.y < canvas.height + 30);

    for (const a of asteroids) {
      a.y += a.vy;
      a.rot += a.vr;
    }
    asteroids = asteroids.filter((a) => a.y < canvas.height + 50);

    if (invuln > 0) invuln--;

    checkCollisionsAt(player.x, player.y, 1);

    if (isMpHost()) {
      for (const p of remotePeers) {
        if (checkCollisionsAt(p.x, p.y, 1)) break;
      }
      Multiplayer.sendWorld(packWorld());
    } else if (isMultiplayerSession()) {
      Multiplayer.sendPlayer({ x: player.x, y: player.y, score: score, lives: lives });
    }

    updateHUD();
  }

  function drawRemotePeers() {
    if (hostPlayer) {
      ctx.save();
      ctx.translate(hostPlayer.x, hostPlayer.y);
      ctx.strokeStyle = hostPlayer.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = hostPlayer.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = hostPlayer.color;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(hostPlayer.name, hostPlayer.x - 14, hostPlayer.y - player.r - 8);
    }
    for (const p of remotePeers) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = p.color;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(p.name, p.x - 20, p.y - player.r - 8);
    }
  }

  function drawStarfield(animate) {
    for (const s of stars) {
      ctx.fillStyle = "rgba(255,255,255," + (s.s / 3) + ")";
      ctx.fillRect(s.x, s.y, s.s, s.s);
      if (!animate) continue;
      s.y += s.sp;
      if (s.y > canvas.height) {
        s.y = 0;
        s.x = Math.random() * canvas.width;
      }
    }
  }

  function drawPlayer() {
    const blink = invuln > 0 && Math.floor(invuln / 8) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#5eead4";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#818cf8";
    ctx.beginPath();
    ctx.arc(0, 0, player.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawOrb(o) {
    const g = 0.6 + Math.sin(o.pulse) * 0.4;
    ctx.fillStyle = "rgba(250, 204, 21, " + g + ")";
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.fillStyle = "#475569";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < a.verts; i++) {
      const ang = (i / a.verts) * Math.PI * 2;
      const rad = a.r * (0.75 + (i % 3) * 0.08);
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPauseOverlay() {
    ctx.fillStyle = "rgba(5, 8, 16, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "left";
  }

  function drawHUD() {
    if (state !== "playing" && state !== "paused") return;
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.fillRect(8, 8, isMultiplayerSession() ? 200 : 180, isMultiplayerSession() ? 44 : 28);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px system-ui, sans-serif";
    if (isMultiplayerSession()) {
      ctx.fillText("Lagpoeng: " + getCombinedScore(), 16, 28);
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Dine: " + score, 16, 44);
    } else {
      ctx.fillText("Poeng: " + score, 16, 28);
    }
    if (padDisplayName) {
      ctx.fillStyle = "#4ade80";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(padDisplayName, canvas.width - 140, 24);
    }
    if (remotePeers.length > 0) {
      ctx.fillStyle = "#f472b6";
      const mpLabel = isMpGuest() ? "MP: vertens brett" : "MP: " + (remotePeers.length + 1) + " spillere";
      ctx.fillText(mpLabel, canvas.width - 130, 42);
    }
  }

  function render() {
    const animate = state === "playing";
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStarfield(animate);

    for (const o of orbs) drawOrb(o);
    for (const a of asteroids) drawAsteroid(a);
    drawRemotePeers();
    drawPlayer();
    drawHUD();
    if (state === "paused") drawPauseOverlay();
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  if (window.Multiplayer) {
    Multiplayer.onPeersChanged((peers) => {
      remotePeers = peers;
      updateHUD();
    });
    Multiplayer.onWorldState(queueWorldState);
  }

  initStars();
  highEl.textContent = "Rekord: " + highScore;
  updatePauseBtn();
  updatePadUI(getActiveGamepad());
  loop();
})();
