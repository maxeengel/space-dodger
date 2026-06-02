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
  const touchDirs = { up: false, down: false, left: false, right: false };
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
    lives = 3;
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
    state = "over";
    guestPausedLocally = false;
    const finalScore = isMultiplayerSession() ? getCombinedScore() : score;
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem(HIGH_KEY, String(highScore));
    }
    overlay.classList.remove("hidden");
    overlayTitle.textContent = "Game over";
    overlayText.textContent = isMultiplayerSession()
      ? "Lagpoeng: " + finalScore + ". Trykk A eller en knapp for å prøve igjen."
      : "Poeng: " + score + ". Trykk A eller en knapp på R1 for å prøve igjen.";
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

  // Plukker opp energikuler ved (x,y). Kuler er delte: poeng går til lagsummen,
  // og en oppsamlet kule flyttes utenfor brettet så ingen annen spiller tar den.
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

  function updateHUD() {
    if (isMultiplayerSession()) {
      scoreEl.textContent = "Lagpoeng: " + getCombinedScore();
    } else {
      scoreEl.textContent = "Poeng: " + score;
    }
    livesEl.textContent = selfOut ? "Liv: 0 (ute)" : "Liv: " + lives;
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

    // Utslåtte spillere fryser sin egen ring (men ser fortsatt på de andre).
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
    peerState.forEach((st) => {
      if (st.invuln > 0) st.invuln--;
    });

    // Egen spiller (vert/solo): egne liv.
    if (!selfOut) {
      const selfState = { lives, invuln, out: false };
      runPlayerCollisions(player.x, player.y, selfState);
      lives = selfState.lives;
      invuln = selfState.invuln;
      if (selfState.out) selfOut = true;
    }

    // Hver gjest sjekkes mot sine egne liv på verten.
    if (isMpHost()) {
      for (const p of remotePeers) {
        const st = peerState.get(p.id);
        if (st) runPlayerCollisions(p.x, p.y, st);
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

  function drawPeerRing(x, y, color, name, labelOffset) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = color;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(name, x - (labelOffset || 14), y - player.r - 8);
  }

  function drawRemotePeers() {
    if (isMpGuest()) {
      // Som gjest: verten tegnes via hostPlayer, øvrige gjester via otherPeers.
      // Utslåtte spillere tegnes ikke.
      if (hostPlayer && !hostOut) {
        drawPeerRing(hostPlayer.x, hostPlayer.y, hostPlayer.color, hostPlayer.name, 14);
      }
      for (const p of otherPeers) {
        if (p.out) continue;
        drawPeerRing(p.x, p.y, p.color, p.name, 20);
      }
      return;
    }
    // Som vert: tegn hver gjest som fortsatt er med (ikke utslått).
    for (const p of remotePeers) {
      const st = peerState.get(p.id);
      if (st && st.out) continue;
      drawPeerRing(p.x, p.y, p.color, p.name, 20);
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
      ctx.fillText(selfOut ? "Du er ute" : "Liv: " + lives, 16, 44);
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
