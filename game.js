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
  const MAX_LIVES = 3;
  const ASTEROID_FAST_SCORE = 300;
  const ASTEROID_FAST_MULT = 1.6;
  const ASTEROID_FAST_SPAWN = 32;
  const ALIEN_PHASE_SCORE = 900;
  const ALIEN_HARD_PHASE_SCORE = 1500;
  const ALIEN_ELITE_PHASE_SCORE = 1800;
  const ASTEROID_HARD_MULT = 1.22;
  const MAX_UFOS = 3;
  const MAX_UFOS_ELITE = 5;
  const GAME_TITLE = "Space Dodger";
  const HIGH_KEY = "romrakettRunnerHigh";
  const LEGACY_HIGH_KEY = "ringRunnerHigh";
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
  function loadHighScore() {
    const cur = localStorage.getItem(HIGH_KEY);
    if (cur != null) return Number(cur) || 0;
    const old = localStorage.getItem(LEGACY_HIGH_KEY);
    return old != null ? Number(old) || 0 : 0;
  }

  let highScore = loadHighScore();
  let activePadIndex = null;
  let padDisplayName = "";

  const keys = {};
  const touchDirs = { up: false, down: false, left: false, right: false };
  const PLAYER_HIT_RADIUS = 22; // samme som ring-spilleren
  const ROCKET_VISUAL_SCALE = 26 / 22; // tegnet størrelse uendret
  const player = { x: 400, y: 250, r: PLAYER_HIT_RADIUS, vx: 0, vy: 0, speed: 4.2 };
  let orbs = [];
  let asteroids = [];
  let ufos = [];
  let lasers = [];
  let stars = [];
  let spawnOrbTimer = 0;
  let spawnAstTimer = 0;
  let spawnUfoTimer = 0;
  let alienPhaseWasActive = false;
  let alienHardPhaseWasActive = false;
  let invuln = 0;
  let frontBtnWasDown = false;
  let prevPressedBtns = [];
  let remotePeers = [];
  let hostPlayer = null;
  let worldSyncTick = 0;
  let pendingWorld = null;
  let lastAppliedTick = -1;
  let hostTick = 0;
  let guestPausedLocally = false;
  let selfOut = false;
  let hostOut = false;
  let otherPeers = [];
  const peerState = new Map();
  const PEER_PALETTE = ["#fb923c", "#a78bfa", "#4ade80", "#f472b6"];

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
    // Alltid registrer at en tast slippes – også når et skjemafelt er i fokus.
    // Ellers kan en tast som ble holdt nede før fokus byttet bli "hengende" og
    // fortsette å bevege spilleren.
    keys[e.code] = false;
  });

  function clearKeys() {
    for (const k in keys) keys[k] = false;
  }

  // Når brukeren begynner å skrive i et felt (f.eks. romkode), nullstill alle
  // taster slik at spilleren aldri beveger seg mens man skriver. Window-blur
  // (alt-tab e.l.) håndteres likt for å unngå hengende taster.
  window.addEventListener("focusin", () => {
    if (isTypingInForm()) clearKeys();
  });
  window.addEventListener("blur", clearKeys);

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

  function touchMove() {
    let dx = 0;
    let dy = 0;
    if (touchDirs.left) dx -= 1;
    if (touchDirs.right) dx += 1;
    if (touchDirs.up) dy -= 1;
    if (touchDirs.down) dy += 1;
    return { dx, dy };
  }

  function clearTouchDirs() {
    touchDirs.up = false;
    touchDirs.down = false;
    touchDirs.left = false;
    touchDirs.right = false;
    document.querySelectorAll(".touch-btn.is-pressed").forEach((btn) => {
      btn.classList.remove("is-pressed");
    });
  }

  function shouldUseTouchUI() {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const noHover = window.matchMedia("(hover: none)").matches;
    const narrow = window.matchMedia("(max-width: 1024px)").matches;
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator.msMaxTouchPoints != null && navigator.msMaxTouchPoints > 0);
    return hasTouch || coarse || noHover || narrow;
  }

  function enableTouchUI() {
    if (!shouldUseTouchUI()) return;
    document.documentElement.classList.add("touch-ui");
  }

  function initTouchControls() {
    enableTouchUI();
    const root = document.getElementById("touch-controls");
    if (!root) return;

    root.querySelectorAll(".touch-btn").forEach((btn) => {
      const dir = btn.dataset.dir;
      if (!dir || touchDirs[dir] === undefined) return;

      const press = (e) => {
        e.preventDefault();
        touchDirs[dir] = true;
        btn.classList.add("is-pressed");
        if (e.pointerId != null && btn.setPointerCapture) {
          try {
            btn.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
      };

      const release = () => {
        touchDirs[dir] = false;
        btn.classList.remove("is-pressed");
      };

      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointercancel", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("lostpointercapture", release);
    });

    window.addEventListener("blur", clearTouchDirs);
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
    const speed = asteroidSpeedMultiplier();
    const r = 16 + Math.random() * 22;
    asteroids.push({
      x: Math.random() * (canvas.width - r * 2) + r,
      y: -r,
      r,
      vy: (1.8 + Math.random() * 2.5) * speed,
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
    ufos = [];
    lasers = [];
    spawnOrbTimer = 0;
    spawnAstTimer = 60;
    spawnUfoTimer = 0;
    alienPhaseWasActive = false;
    alienHardPhaseWasActive = false;
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
      // En gjest får ellers verdensoppdateringer fra verten som umiddelbart
      // tvinger den ut av pause. Marker at pausen er lokalt valgt.
      if (isMpGuest()) guestPausedLocally = true;
    } else if (state === "paused") {
      state = "playing";
      guestPausedLocally = false;
    }
    updatePauseBtn();
    if (isMpHost()) Multiplayer.sendWorld(packWorld());
  }

  function startGame() {
    state = "playing";
    score = 0;
    const bonusLife =
      window.SpaceDodgerShop && SpaceDodgerShop.consumeBonusLife
        ? SpaceDodgerShop.consumeBonusLife()
        : 0;
    lives = Math.min(4, 3 + bonusLife);
    resetGameEntities();
    hostPlayer = null;
    worldSyncTick = 0;
    pendingWorld = null;
    lastAppliedTick = -1;
    hostTick = 0;
    guestPausedLocally = false;
    selfOut = false;
    hostOut = false;
    otherPeers = [];
    // Gi alle tilkoblede spillere fulle liv ved (om)start.
    peerState.forEach((st) => {
      st.lives = 3;
      st.invuln = 90;
      st.out = false;
    });
    overlay.classList.add("hidden");
    updateHUD();
    updatePauseBtn();
    if (window.Bgm) Bgm.start();
    if (isMpHost()) Multiplayer.sendWorld(packWorld());
  }

  function gameOver() {
    if (state === "over") return;
    state = "over";
    guestPausedLocally = false;
    const finalScore = isMultiplayerSession() ? getCombinedScore() : score;
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem(HIGH_KEY, String(highScore));
    }
    let moneyMsg = "";
    if (window.SpaceDodgerShop) {
      if (finalScore > 0) {
        const total = window.SpaceDodgerShop.addCoins(finalScore);
        moneyMsg =
          " Poengene ble til " +
          finalScore +
          " penger (du har " +
          total +
          " totalt).";
      } else {
        moneyMsg = " Ingen penger denne runden.";
      }
    }
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "Game over";
    const retryHint = " Trykk A eller en knapp for å prøve igjen.";
    overlayText.textContent = isMultiplayerSession()
      ? "Lagpoeng: " + finalScore + "." + moneyMsg + retryHint
      : "Poeng: " + finalScore + "." + moneyMsg + retryHint;
    startBtn.textContent = "Prøv igjen";
    updateHUD();
    updatePauseBtn();
    if (isMpHost()) Multiplayer.sendWorld(packWorld());
  }

  function resetToMenu() {
    state = "menu";
    selfOut = false;
    hostOut = false;
    otherPeers = [];
    if (window.Bgm) Bgm.stop();
    overlay.classList.remove("hidden");
    overlayTitle.textContent = GAME_TITLE;
    overlayText.textContent =
      "Fly gjennom rommet, samle gule soler og unngå asteroider. Poeng ved game over blir penger i butikken.";
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
    return window.Multiplayer && Multiplayer.isGuest();
  }

  function packWorld() {
    return {
      tick: hostTick,
      gameState: state,
      score: score,
      lives: lives,
      invuln: invuln,
      px: Math.round(player.x),
      py: Math.round(player.y),
      selfOut: selfOut,
      peers: remotePeers.map((p) => {
        const st = peerState.get(p.id) || {};
        return {
          id: p.id,
          x: Math.round(p.x),
          y: Math.round(p.y),
          lives: st.lives != null ? st.lives : 3,
          invuln: st.invuln != null ? st.invuln : 0,
          out: !!st.out,
        };
      }),
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
      ufos: ufos.map((u) => ({
        x: Math.round(u.x),
        y: Math.round(u.y),
        vx: u.vx,
        type: u.type || "orange",
        shootFlash: u.shootFlash || 0,
      })),
      lasers: lasers.map((l) => ({
        x: Math.round(l.x),
        y: Math.round(l.y),
        vx: l.vx,
        vy: l.vy,
        r: l.r,
      })),
    };
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
      selfOut = false;
      hostOut = false;
      otherPeers = [];
      overlay.classList.add("hidden");
      updatePauseBtn();
      if (window.Bgm) Bgm.start();
    }
    if (w.gameState === "paused" && state === "playing") {
      state = "paused";
      updatePauseBtn();
    }
    if (w.gameState === "playing" && state === "paused" && !guestPausedLocally) {
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
    if (w.tick != null && w.tick <= lastAppliedTick) return;
    pendingWorld = w;
  }

  function applyWorldSnapshot(w) {
    if (!w) return;
    if (w.tick != null && w.tick <= lastAppliedTick) return;
    if (w.tick != null) lastAppliedTick = w.tick;

    if (applyWorldMeta(w)) return;

    if (state !== "playing" && state !== "paused") return;

    score = w.score ?? score;

    // Egen status hentes fra min oppføring i peers-listen (verten er autoritativ
    // for liv og utslått-status). Slik vet en gjest om den selv er ute.
    const myId =
      window.Multiplayer && Multiplayer.getMyId ? Multiplayer.getMyId() : null;
    const meEntry = (w.peers || []).find((p) => p.id === myId);
    if (meEntry) {
      lives = meEntry.lives != null ? meEntry.lives : lives;
      invuln = meEntry.invuln != null ? meEntry.invuln : invuln;
      selfOut = !!meEntry.out;
    }
    hostOut = !!w.selfOut;

    const newOrbs = mapOrbsFromWorld(w.orbs);
    for (let i = 0; i < newOrbs.length; i++) {
      if (orbs[i]) newOrbs[i].pulse = orbs[i].pulse + 0.1;
    }
    orbs = newOrbs;

    const newAst = mapAsteroidsFromWorld(w.asteroids);
    for (let i = 0; i < newAst.length; i++) {
      if (asteroids[i]) {
        newAst[i].rot = asteroids[i].rot;
      }
    }
    asteroids = newAst;
    ufos = mapUfosFromWorld(w.ufos);
    lasers = mapLasersFromWorld(w.lasers);

    if (w.px != null && w.py != null) {
      hostPlayer = {
        x: w.px,
        y: w.py,
        color: "#f472b6",
        name: "Vert",
      };
    }

    // Øvrige gjester (ikke meg selv, ikke verten) – tegnes så alle ser hverandre.
    otherPeers = (w.peers || [])
      .filter((p) => p.id !== myId)
      .map((p, i) => ({
        x: p.x,
        y: p.y,
        out: !!p.out,
        color: PEER_PALETTE[i % PEER_PALETTE.length],
        name: "Spiller " + (i + 2),
      }));
  }

  // Plukker opp soler ved (x,y). Soler er delte: poeng går til lagsummen,
  // og en oppsamlet sol flyttes utenfor brettet så ingen annen spiller tar den.
  function consumeOrbsAt(x, y) {
    const r = player.r;
    for (const o of orbs) {
      if (o.y < canvas.height + 900 && circleHit(x, y, r, o.x, o.y, o.r)) {
        score += 10;
        o.y = canvas.height + 999;
      }
    }
  }

  // Returnerer true hvis (x,y) treffer en asteroide (og fjerner den). Selve
  // livstapet håndteres per spiller av kalleren.
  function asteroidHitAt(x, y) {
    const r = player.r * 0.85;
    for (const a of asteroids) {
      if (a.y < canvas.height + 900 && circleHit(x, y, r, a.x, a.y, a.r)) {
        a.y = canvas.height + 999;
        return true;
      }
    }
    return false;
  }

  // Kjør kollisjoner for én spiller med egne liv/usårbarhet. st = {lives, invuln, out}.
  // Returnerer true hvis spilleren nettopp ble slått ut.
  function runPlayerCollisions(x, y, st) {
    if (st.out) return false;
    consumeOrbsAt(x, y);
    if (st.invuln <= 0 && asteroidHitAt(x, y)) {
      st.lives--;
      st.invuln = 120;
      if (st.lives <= 0) {
        st.out = true;
        return true;
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

  function getDifficultyScore() {
    return isMultiplayerSession() ? getCombinedScore() : score;
  }

  function isAsteroidFastPhase() {
    return getDifficultyScore() >= ASTEROID_FAST_SCORE;
  }

  function asteroidSpeedMultiplier() {
    const s = getDifficultyScore();
    let m = 1;
    if (isAsteroidFastPhase()) m = ASTEROID_FAST_MULT;
    if (s >= ALIEN_HARD_PHASE_SCORE) m *= ASTEROID_HARD_MULT;
    return m;
  }

  function getAstSpawnInterval() {
    const s = getDifficultyScore();
    if (s >= ALIEN_ELITE_PHASE_SCORE) return 20;
    if (isAlienHardPhase()) return 24;
    if (isAsteroidFastPhase()) return ASTEROID_FAST_SPAWN;
    // Under 300: roligere spawn – tydelig hopp ved 300 poeng
    return Math.max(50, 72 - s * 0.07);
  }

  function isAlienPhase() {
    return getDifficultyScore() >= ALIEN_PHASE_SCORE;
  }

  function isAlienHardPhase() {
    return getDifficultyScore() >= ALIEN_HARD_PHASE_SCORE;
  }

  function isAlienElitePhase() {
    return getDifficultyScore() >= ALIEN_ELITE_PHASE_SCORE;
  }

  function maxUfoCount() {
    return isAlienElitePhase() ? MAX_UFOS_ELITE : MAX_UFOS;
  }

  function mapUfosFromWorld(list) {
    return (list || []).map((u) => ({
      x: u.x,
      y: u.y,
      vx: u.vx,
      type: u.type === "blue" ? "blue" : "orange",
      shootCd: 0,
      shootFlash: u.shootFlash || 0,
    }));
  }

  function mapLasersFromWorld(list) {
    return (list || []).map((l) => ({
      x: l.x,
      y: l.y,
      vx: l.vx,
      vy: l.vy,
      r: l.r != null ? l.r : 5,
    }));
  }

  function spawnUfo(forceType) {
    const margin = 55;
    const hard = isAlienHardPhase();
    const type =
      forceType ||
      (hard && Math.random() < 0.5 ? "blue" : "orange");
    const speedBase = hard ? 1.35 : 1.1;
    ufos.push({
      x: margin + Math.random() * (canvas.width - margin * 2),
      y: type === "blue" ? 26 + Math.random() * 28 : 32 + Math.random() * 36,
      vx: (Math.random() < 0.5 ? -1 : 1) * (speedBase + Math.random() * 0.9),
      type: type,
      shootCd: 25 + Math.floor(Math.random() * 35),
      shootFlash: 0,
    });
  }

  function pickLaserTarget(u) {
    let target = null;
    let bestD = Infinity;

    if (!selfOut) {
      const d = Math.hypot(player.x - u.x, player.y - u.y);
      if (d < bestD) {
        bestD = d;
        target = { x: player.x, y: player.y };
      }
    }

    for (const p of remotePeers) {
      const st = peerState.get(p.id);
      if (!st || st.out) continue;
      const d = Math.hypot(p.x - u.x, p.y - u.y);
      if (d < bestD) {
        bestD = d;
        target = { x: p.x, y: p.y };
      }
    }

    return target;
  }

  function fireLaser(fromX, fromY, targetX, targetY, ufoType) {
    const isBlue = ufoType === "blue";
    const originY = fromY - (isBlue ? 28 : 20);
    const dx = targetX - fromX;
    const dy = targetY - originY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = isBlue ? 6.4 : isAlienHardPhase() ? 5.9 : 5.4;
    lasers.push({
      x: fromX,
      y: originY,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      r: isBlue ? 6 : 5,
    });
  }

  function updateUfosAndLasers() {
    if (!isAlienPhase()) {
      alienPhaseWasActive = false;
      alienHardPhaseWasActive = false;
      ufos = [];
      lasers = [];
      return;
    }

    if (!alienPhaseWasActive) {
      alienPhaseWasActive = true;
      spawnUfo("orange");
    }

    if (isAlienHardPhase() && !alienHardPhaseWasActive) {
      alienHardPhaseWasActive = true;
      spawnUfo("blue");
    }

    const ufoCap = maxUfoCount();
    const spawnInterval = isAlienElitePhase() ? 120 : isAlienHardPhase() ? 145 : 190;

    spawnUfoTimer++;
    if (spawnUfoTimer > spawnInterval && ufos.length < ufoCap) {
      spawnUfoTimer = 0;
      spawnUfo();
    }

    for (const u of ufos) {
      const edge = u.type === "blue" ? 62 : 48;
      u.x += u.vx;
      if (u.x < edge || u.x > canvas.width - edge) u.vx *= -1;
      if (u.shootFlash > 0) u.shootFlash--;

      u.shootCd--;
      if (u.shootCd > 0) continue;

      const target = pickLaserTarget(u);
      if (!target) continue;

      fireLaser(u.x, u.y, target.x, target.y, u.type);
      const cdBase = u.type === "blue" ? 50 : 65;
      u.shootCd = cdBase + Math.floor(Math.random() * (isAlienHardPhase() ? 40 : 55));
      u.shootFlash = 10;
    }

    for (const l of lasers) {
      l.x += l.vx;
      l.y += l.vy;
    }
    lasers = lasers.filter(
      (l) =>
        l.x > -30 &&
        l.x < canvas.width + 30 &&
        l.y > -30 &&
        l.y < canvas.height + 30
    );
  }

  function laserHitPlayerAt(px, py, st) {
    if (st.out || st.invuln > 0) return false;
    const r = player.r * 0.85;
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      if (circleHit(px, py, r, l.x, l.y, l.r)) {
        lasers.splice(i, 1);
        st.lives--;
        st.invuln = 120;
        if (st.lives <= 0) st.out = true;
        return true;
      }
    }
    return false;
  }

  function updateHUD() {
    if (isMultiplayerSession()) {
      scoreEl.textContent = "Lagpoeng: " + getCombinedScore();
    } else {
      scoreEl.textContent = "Poeng: " + score;
    }
    const heart = "♥";
    const empty = "♡";
    let hearts = "";
    const n = selfOut ? 0 : Math.max(0, Math.min(MAX_LIVES, lives));
    for (let i = 0; i < MAX_LIVES; i++) hearts += i < n ? heart : empty;
    livesEl.textContent = selfOut ? hearts + " (ute)" : hearts;
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
      if (isMpGuest()) {
        if (pendingWorld) {
          applyWorldSnapshot(pendingWorld);
          pendingWorld = null;
        }
        Multiplayer.sendPlayer({ x: player.x, y: player.y });
      } else if (isMpHost()) {
        Multiplayer.sendWorld(packWorld());
      }
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

    // Utslåtte spillere fryser sin egen rakett (men ser fortsatt på de andre).
    if (!selfOut) {
      let dx = 0;
      let dy = 0;
      if (pad) {
        const m = readMovement(pad);
        dx = m.dx;
        dy = m.dy;
      }
      const touch = touchMove();
      const kb = keyboardMove();
      if (touch.dx || touch.dy) {
        dx = touch.dx;
        dy = touch.dy;
      } else if (kb.dx || kb.dy) {
        dx = kb.dx;
        dy = kb.dy;
      }
      applyMovement(dx, dy);
    }

    if (isMpGuest()) {
      if (pendingWorld) {
        applyWorldSnapshot(pendingWorld);
        pendingWorld = null;
      }
      // Send egen posisjon (verten ignorerer utslåtte spillere).
      Multiplayer.sendPlayer({ x: player.x, y: player.y });
      updateHUD();
      return;
    }

    hostTick++;
    spawnOrbTimer++;
    if (spawnOrbTimer > 45) {
      spawnOrbTimer = 0;
      spawnOrb();
    }

    spawnAstTimer--;
    if (spawnAstTimer <= 0) {
      spawnAsteroid();
      spawnAstTimer = getAstSpawnInterval();
    }

    const orbMult = isAlienHardPhase() ? 1.15 : isAsteroidFastPhase() ? 1.2 : 1;
    for (const o of orbs) {
      o.y += o.vy * orbMult;
      o.pulse += 0.1;
    }
    orbs = orbs.filter((o) => o.y < canvas.height + 30);

    const astSpeed = asteroidSpeedMultiplier();
    for (const a of asteroids) {
      a.y += a.vy * astSpeed;
      a.rot += a.vr;
    }
    asteroids = asteroids.filter((a) => a.y < canvas.height + 50);

    updateUfosAndLasers();

    if (invuln > 0) invuln--;
    peerState.forEach((st) => {
      if (st.invuln > 0) st.invuln--;
    });

    // Egen spiller (vert/solo): egne liv.
    if (!selfOut) {
      const selfState = { lives, invuln, out: false };
      runPlayerCollisions(player.x, player.y, selfState);
      laserHitPlayerAt(player.x, player.y, selfState);
      lives = selfState.lives;
      invuln = selfState.invuln;
      if (selfState.out) selfOut = true;
    }

    // Hver gjest sjekkes mot sine egne liv på verten.
    if (isMpHost()) {
      for (const p of remotePeers) {
        const st = peerState.get(p.id);
        if (st) {
          runPlayerCollisions(p.x, p.y, st);
          laserHitPlayerAt(p.x, p.y, st);
        }
      }
    }

    // Game over først når ALLE er ute. Da fortsetter en gjenlevende spiller
    // mens de utslåtte ser på.
    const anyPeerAlive = isMpHost()
      ? remotePeers.some((p) => {
          const st = peerState.get(p.id);
          return st && !st.out;
        })
      : false;
    if (selfOut && !anyPeerAlive) {
      gameOver();
    } else if (isMpHost() && hostTick % 2 === 0) {
      Multiplayer.sendWorld(packWorld());
    }

    updateHUD();
  }

  /** Tegner rakett med nese oppover (–Y). Roter med ctx.rotate før kall. */
  function drawRocketShip(scale, bodyColor, accentColor, showFlame) {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = 16;

    // Motorflamme (bakenden, +Y)
    if (showFlame) {
      const flicker = 0.9 + Math.sin(performance.now() * 0.014) * 0.1;
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(-7 * flicker, 14);
      ctx.lineTo(0, 30 * flicker);
      ctx.lineTo(7 * flicker, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.moveTo(-4, 14);
      ctx.lineTo(0, 22);
      ctx.lineTo(4, 14);
      ctx.closePath();
      ctx.fill();
    }

    // Finner
    ctx.fillStyle = accentColor;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(-18, 18);
    ctx.lineTo(-8, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 8);
    ctx.lineTo(18, 18);
    ctx.lineTo(8, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Kropp (rektangel + avrundet – ikke sirkel)
    const bodyGrad = ctx.createLinearGradient(0, -28, 0, 14);
    bodyGrad.addColorStop(0, "#f1f5f9");
    bodyGrad.addColorStop(0.35, bodyColor);
    bodyGrad.addColorStop(1, accentColor);
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 12);
    ctx.lineTo(-9, -8);
    ctx.quadraticCurveTo(-9, -18, 0, -18);
    ctx.quadraticCurveTo(9, -18, 9, -8);
    ctx.lineTo(9, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nese/konespiss
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-7, -16);
    ctx.lineTo(7, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit (oval vindu – ikke hele ringen)
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(0, -4, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0c4a6e";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Vinger på siden av kroppen
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(-14, 10);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.lineTo(14, 10);
    ctx.lineTo(9, 10);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function getPlayerAngle() {
    if (Math.hypot(player.vx, player.vy) > 0.25) {
      return Math.atan2(player.vy, player.vx) + Math.PI / 2;
    }
    return 0;
  }

  function drawPeerRocket(x, y, color, name, labelOffset, angle) {
    const scale = ROCKET_VISUAL_SCALE;
    ctx.save();
    ctx.translate(x, y);
    if (angle != null) ctx.rotate(angle);
    drawRocketShip(scale, color, color, false);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(name, x - (labelOffset || 14), y - player.r - 10);
  }

  function drawRemotePeers() {
    if (isMpGuest()) {
      // Som gjest: verten tegnes via hostPlayer, øvrige gjester via otherPeers.
      // Utslåtte spillere tegnes ikke.
      if (hostPlayer && !hostOut) {
        drawPeerRocket(hostPlayer.x, hostPlayer.y, hostPlayer.color, hostPlayer.name, 14);
      }
      for (const p of otherPeers) {
        if (p.out) continue;
        drawPeerRocket(p.x, p.y, p.color, p.name, 20);
      }
      return;
    }
    // Som vert: tegn hver gjest som fortsatt er med (ikke utslått).
    for (const p of remotePeers) {
      const st = peerState.get(p.id);
      if (st && st.out) continue;
      drawPeerRocket(p.x, p.y, p.color, p.name, 20);
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
    if (selfOut) return; // utslått spiller tegnes ikke – ser bare på
    const blink = invuln > 0 && Math.floor(invuln / 8) % 2 === 0;
    if (blink) return;

    const scale = ROCKET_VISUAL_SCALE;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(getPlayerAngle());
    const rocket =
      window.SpaceDodgerShop && SpaceDodgerShop.getRocketColors
        ? SpaceDodgerShop.getRocketColors()
        : { body: "#5eead4", accent: "#38bdf8" };
    drawRocketShip(scale, rocket.body, rocket.accent, true);
    ctx.restore();
  }

  function drawOrb(o) {
    const pulse = 0.88 + Math.sin(o.pulse) * 0.12;
    const r = o.r * pulse;
    const rayRot = o.pulse * 0.35;
    const rays = 8;

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 20;

    ctx.fillStyle = "rgba(253, 224, 71, 0.8)";
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + rayRot;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.4);
      ctx.lineTo(r * 0.12, r * 1.4);
      ctx.lineTo(-r * 0.12, r * 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, "#fffbeb");
    grad.addColorStop(0.3, "#fef08a");
    grad.addColorStop(0.65, "#fbbf24");
    grad.addColorStop(1, "#f59e0b");
    ctx.shadowBlur = 0;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 230, 0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawUfo(u) {
    const blue = u.type === "blue";
    const rw = blue ? 40 : 30;
    const rh = blue ? 14 : 10;
    const domeW = blue ? 18 : 14;
    const domeH = blue ? 11 : 9;
    const alienY = blue ? -26 : -20;
    const alienR = blue ? 9 : 7;

    ctx.save();
    ctx.translate(u.x, u.y);

    if (blue) {
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.ellipse(0, 5, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(191, 219, 254, 0.65)";
      ctx.beginPath();
      ctx.ellipse(0, -8, domeW, domeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.ellipse(0, 4, rw, rh - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fb923c";
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh - 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
      ctx.beginPath();
      ctx.ellipse(0, -6, domeW, domeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fdba74";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = blue ? "#86efac" : "#4ade80";
    ctx.beginPath();
    ctx.ellipse(0, alienY, alienR, alienR + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#14532d";
    ctx.beginPath();
    ctx.arc(-4, alienY - 1, 2.2, 0, Math.PI * 2);
    ctx.arc(4, alienY - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    const shooting = u.shootFlash > 0;
    const armY = alienY + 2;
    const gunX = blue ? 18 : 14;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, armY);
    ctx.lineTo(gunX, armY + 2);
    ctx.stroke();
    ctx.fillStyle = "#334155";
    ctx.fillRect(gunX - 2, armY - 2, blue ? 10 : 8, 3);

    if (shooting) {
      ctx.strokeStyle = blue ? "#93c5fd" : "#f87171";
      ctx.shadowColor = blue ? "#3b82f6" : "#ef4444";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gunX + 8, armY + 1);
      ctx.lineTo(gunX + (blue ? 20 : 16), armY + 1);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function drawLaser(l) {
    ctx.save();
    ctx.fillStyle = "#fca5a5";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
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

  function drawSpectatorBanner() {
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 16, 0.65)";
    ctx.fillRect(canvas.width / 2 - 150, 56, 300, 40);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Du er ute – heier på laget", canvas.width / 2, 82);
    ctx.textAlign = "left";
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

  function drawHeartIcon(x, y, size, filled) {
    const s = size * 0.5;
    ctx.save();
    ctx.translate(x + s, y + s * 0.9);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.25);
    ctx.bezierCurveTo(0, -s * 0.55, -s, -s * 0.55, -s, s * 0.05);
    ctx.bezierCurveTo(-s, s * 0.55, 0, s * 0.85, 0, s);
    ctx.bezierCurveTo(0, s * 0.85, s, s * 0.55, s, s * 0.05);
    ctx.bezierCurveTo(s, -s * 0.55, 0, -s * 0.55, 0, s * 0.25);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = "#f472b6";
      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 8;
      ctx.fill();
    } else {
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLivesHearts() {
    if (state !== "playing" && state !== "paused") return;

    const heartSize = 22;
    const gap = 8;
    const startX = 10;
    const startY = 10;
    const remaining = selfOut ? 0 : Math.max(0, Math.min(MAX_LIVES, lives));

    for (let i = 0; i < MAX_LIVES; i++) {
      drawHeartIcon(startX + i * (heartSize + gap), startY, heartSize, i < remaining);
    }
  }

  function drawHUD() {
    if (state !== "playing" && state !== "paused") return;

    const hudTop = 42;
    const hudH = isMultiplayerSession() ? 44 : 28;

    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.fillRect(8, hudTop, isMultiplayerSession() ? 200 : 180, hudH);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px system-ui, sans-serif";
    if (isMultiplayerSession()) {
      ctx.fillText("Lagpoeng: " + getCombinedScore(), 16, hudTop + 20);
      if (selfOut) {
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Du er ute", 16, hudTop + 36);
      }
    } else {
      ctx.fillText("Poeng: " + score, 16, hudTop + 20);
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
    if (isAsteroidFastPhase() && !isAlienPhase() && (state === "playing" || state === "paused")) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("RASKERE!", canvas.width - 88, 58);
    }
    if (isAlienPhase() && (state === "playing" || state === "paused")) {
      ctx.font = "11px system-ui, sans-serif";
      if (isAlienElitePhase()) {
        ctx.fillStyle = "#93c5fd";
        ctx.fillText("5 ROMVESENER!", canvas.width - 118, 58);
      } else if (isAlienHardPhase()) {
        ctx.fillStyle = "#60a5fa";
        ctx.fillText("BLÅ UFO!", canvas.width - 88, 58);
      } else {
        ctx.fillStyle = "#fb923c";
        ctx.fillText("ROMVESENER!", canvas.width - 118, 58);
      }
    }
  }

  function render() {
    const animate = state === "playing";
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStarfield(animate);

    for (const o of orbs) drawOrb(o);
    for (const a of asteroids) drawAsteroid(a);
    for (const u of ufos) drawUfo(u);
    for (const l of lasers) drawLaser(l);
    drawRemotePeers();
    drawPlayer();
    drawLivesHearts();
    drawHUD();
    if (selfOut && (state === "playing" || state === "paused")) drawSpectatorBanner();
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
      // Verten holder liv per gjest. Nye gjester får fulle liv; frakoblede fjernes.
      const ids = new Set(peers.map((p) => p.id));
      peers.forEach((p) => {
        if (!peerState.has(p.id)) {
          peerState.set(p.id, { lives: 3, invuln: 90, out: false });
        }
      });
      peerState.forEach((_, id) => {
        if (!ids.has(id)) peerState.delete(id);
      });
      updateHUD();
    });
    Multiplayer.onWorldState(queueWorldState);
  }

  initTouchControls();
  initStars();
  highEl.textContent = "Rekord: " + highScore;
  updatePauseBtn();
  updatePadUI(getActiveGamepad());
  loop();
})();
