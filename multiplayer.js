(function () {
  "use strict";

  const PEER_COLORS = ["#f472b6", "#fb923c", "#a78bfa", "#4ade80"];
  const SYNC_MS = 50;

  let peer = null;
  let roomId = null;
  let isHost = false;
  let connections = new Map();
  let remotePeers = [];
  let lastSync = 0;
  let onUpdate = null;
  let onWorldState = null;
  let hostAttempts = 0;

  const mpStatus = document.getElementById("mp-status");
  const mpHostBtn = document.getElementById("mp-host-btn");
  const mpJoinForm = document.getElementById("mp-join-form");
  const mpRoomInput = document.getElementById("mp-room-input");
  const mpRoomInputOverlay = document.getElementById("mp-room-input-overlay");
  const mpConnectBtnOverlay = document.getElementById("mp-connect-btn-overlay");
  const mpConnectBtn = document.getElementById("mp-connect-btn");
  const mpRoomBox = document.getElementById("mp-room-box");
  const mpRoomCode = document.getElementById("mp-room-code");
  const mpRoomCodeInput = document.getElementById("mp-room-code-input");
  const mpCopyBtn = document.getElementById("mp-copy-btn");
  const mpCopyCodeBtn = document.getElementById("mp-copy-code-btn");
  const mpLeaveBtn = document.getElementById("mp-leave-btn");

  function setStatus(text, type) {
    if (!mpStatus) return;
    mpStatus.textContent = text;
    mpStatus.className = "mp-status" + (type ? " " + type : "");
  }

  function randomRoomId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "rr";
    for (let i = 0; i < 6; i++) id += chars[(Math.random() * chars.length) | 0];
    return id;
  }

  function normalizeRoomId(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function getShareUrl(id) {
    const u = new URL(window.location.href);
    u.searchParams.set("room", id);
    return u.toString();
  }

  function notify() {
    if (onUpdate) onUpdate(remotePeers);
  }

  function rebuildRemotePeers() {
    remotePeers = [];
    let i = 0;
    connections.forEach((entry, id) => {
      remotePeers.push({
        id,
        x: entry.data.x ?? 400,
        y: entry.data.y ?? 250,
        score: entry.data.score ?? 0,
        lives: entry.data.lives ?? 3,
        startWithBonusLife: !!entry.data.startWithBonusLife,
        color: PEER_COLORS[i % PEER_COLORS.length],
        name: "Spiller " + (i + 2),
      });
      i++;
    });
    notify();
  }

  function bindConnection(conn) {
    if (connections.has(conn.peer)) return;
    connections.set(conn.peer, { conn, data: { x: 400, y: 250 } });

    conn.on("data", (data) => {
      if (!data) return;
      if (data.type === "world") {
        if (!isHost && onWorldState) onWorldState(data);
        return;
      }
      const entry = connections.get(conn.peer);
      if (entry) {
        entry.data = Object.assign(entry.data, data);
        rebuildRemotePeers();
      }
    });

    conn.on("close", () => {
      connections.delete(conn.peer);
      rebuildRemotePeers();
      if (connections.size === 0 && isHost) {
        setStatus("Venter på spillere. Romkode: " + roomId, "waiting");
      } else if (connections.size === 0) {
        setStatus("Frakoblet", "");
      } else {
        setStatus(connections.size + 1 + " spillere i rommet", "connected");
      }
    });

    rebuildRemotePeers();
    setStatus(connections.size + 1 + " spillere i rommet", "connected");
  }

  function broadcast(data) {
    connections.forEach((entry) => {
      if (entry.conn.open) {
        try {
          entry.conn.send(Object.assign({ t: Date.now() }, data));
        } catch (_) {}
      }
    });
  }

  function showRoomCode() {
    if (!roomId) {
      hideRoomCode();
      return;
    }
    if (mpRoomBox) mpRoomBox.style.display = "flex";
    if (mpRoomCodeInput) {
      mpRoomCodeInput.value = roomId;
      mpRoomCodeInput.style.display = "block";
    }
    if (mpRoomCode) mpRoomCode.textContent = roomId;
  }

  function hideRoomCode() {
    if (mpRoomBox) mpRoomBox.style.display = "none";
    if (mpRoomCodeInput) mpRoomCodeInput.value = "";
  }

  function updateUI(mode) {
    const inRoom = roomId !== null;
    const showJoin = !isHost && !inRoom;

    mpHostBtn.classList.toggle("hidden", inRoom);
    if (mpJoinForm) mpJoinForm.style.display = showJoin ? "flex" : "none";
    mpLeaveBtn.classList.toggle("hidden", !inRoom);

    if (isHost && roomId) {
      showRoomCode();
    } else {
      hideRoomCode();
    }
  }

  function destroyPeer() {
    if (peer) {
      try {
        peer.destroy();
      } catch (_) {}
      peer = null;
    }
  }

  function cleanup() {
    connections.forEach((entry) => {
      try {
        entry.conn.close();
      } catch (_) {}
    });
    connections.clear();
    remotePeers = [];
    notify();
    destroyPeer();
    roomId = null;
    isHost = false;
    hostAttempts = 0;
    hideRoomCode();
    updateUI("idle");
    setStatus("Ikke tilkoblet", "");
    syncRoomInputs("");
    try {
      sessionStorage.removeItem("mp-host-id");
    } catch (_) {}
  }

  function createHostPeer() {
    destroyPeer();
    peer = new Peer(roomId, { debug: 0 });

    peer.on("open", () => {
      showRoomCode();
      setStatus("Romklar! Del koden: " + roomId, "waiting");
      updateUI("host");
      try {
        sessionStorage.setItem("mp-host-id", roomId);
      } catch (_) {}
      const u = new URL(window.location.href);
      u.searchParams.set("room", roomId);
      window.history.replaceState({}, "", u);
    });

    peer.on("connection", bindConnection);

    peer.on("error", (err) => {
      const msg = err.message || err.type || "ukjent feil";
      if (isHost && hostAttempts < 5 && /unavailable|taken|exist/i.test(msg)) {
        hostAttempts++;
        roomId = randomRoomId();
        showRoomCode();
        setStatus("Prøver ny kode: " + roomId, "waiting");
        createHostPeer();
        return;
      }
      if (isHost) {
        showRoomCode();
        setStatus("Romkode: " + roomId + " (nettverk tregt – del koden likevel)", "waiting");
        return;
      }
      setStatus("Kunne ikke koble til. Sjekk romkoden.", "error");
      cleanup();
    });
  }

  function startHost() {
    if (typeof Peer === "undefined") {
      setStatus("Multiplayer utilgjengelig – last siden på nytt", "error");
      return;
    }

    destroyPeer();
    connections.clear();
    remotePeers = [];
    notify();

    roomId = randomRoomId();
    isHost = true;
    hostAttempts = 0;
    showRoomCode();
    setStatus("Oppretter rom… Kode: " + roomId, "waiting");
    updateUI("host");
    createHostPeer();
  }

  function syncRoomInputs(value) {
    const v = value || "";
    if (mpRoomInput) mpRoomInput.value = v;
    if (mpRoomInputOverlay) mpRoomInputOverlay.value = v;
  }

  function getRoomInputValue() {
    if (mpRoomInput && mpRoomInput.value.trim()) return mpRoomInput.value;
    if (mpRoomInputOverlay && mpRoomInputOverlay.value.trim()) return mpRoomInputOverlay.value;
    return "";
  }

  function startJoin(id) {
    if (typeof Peer === "undefined") {
      setStatus("Multiplayer utilgjengelig – last siden på nytt", "error");
      return;
    }
    const target = normalizeRoomId(id || getRoomInputValue());
    if (!target || target.length < 4) {
      setStatus("Skriv inn en gyldig romkode", "error");
      return;
    }
    cleanup();
    roomId = target;
    isHost = false;
    setStatus("Kobler til " + target + "…", "waiting");
    updateUI("active");

    peer = new Peer({ debug: 0 });

    peer.on("open", () => {
      const conn = peer.connect(target, { reliable: false });
      conn.on("open", () => {
        bindConnection(conn);
        setStatus("Koblet til rom! Start spillet.", "connected");
      });
      conn.on("error", () => {
        setStatus("Kunne ikke koble til " + target, "error");
      });
    });

    peer.on("error", () => {
      setStatus("Kunne ikke koble til. Sjekk romkoden.", "error");
      cleanup();
    });
  }

  function copyText(text, okMsg) {
    navigator.clipboard.writeText(text).then(
      () => setStatus(okMsg, "connected"),
      () => setStatus("Kopier manuelt: " + text, "connected")
    );
  }

  if (mpHostBtn) mpHostBtn.addEventListener("click", startHost);
  function wireJoinInput(input) {
    if (!input) return;
    input.addEventListener("input", () => syncRoomInputs(input.value));
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        startJoin(getRoomInputValue());
      }
    });
  }

  if (mpConnectBtn) {
    mpConnectBtn.addEventListener("click", () => startJoin(getRoomInputValue()));
  }
  if (mpConnectBtnOverlay) {
    mpConnectBtnOverlay.addEventListener("click", () => startJoin(getRoomInputValue()));
  }
  wireJoinInput(mpRoomInput);
  wireJoinInput(mpRoomInputOverlay);
  if (mpLeaveBtn) {
    mpLeaveBtn.addEventListener("click", () => {
      const u = new URL(window.location.href);
      u.searchParams.delete("room");
      window.history.replaceState({}, "", u);
      cleanup();
    });
  }
  if (mpCopyCodeBtn) {
    mpCopyCodeBtn.addEventListener("click", () => {
      if (!roomId) return;
      copyText(roomId, "Romkode kopiert!");
    });
  }
  if (mpRoomCodeInput) {
    mpRoomCodeInput.addEventListener("click", () => mpRoomCodeInput.select());
  }
  if (mpCopyBtn) {
    mpCopyBtn.addEventListener("click", () => {
      if (!roomId) return;
      copyText(getShareUrl(roomId), "Lenke kopiert!");
    });
  }

  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room");
  let skipAutoJoin = false;
  try {
    skipAutoJoin = sessionStorage.getItem("mp-host-id") === normalizeRoomId(roomParam);
  } catch (_) {}
  if (roomParam) {
    syncRoomInputs(normalizeRoomId(roomParam));
  }
  if (roomParam && !skipAutoJoin) {
    setTimeout(() => startJoin(normalizeRoomId(roomParam)), 800);
  }

  hideRoomCode();
  updateUI("idle");
  if (mpRoomInput && !roomParam) {
    mpRoomInput.focus();
  }

  window.Multiplayer = {
    isActive() {
      return roomId !== null && peer !== null;
    },
    hasPeers() {
      return remotePeers.length > 0;
    },
    getPeers() {
      return remotePeers;
    },
    getRoomId() {
      return roomId;
    },
    getMyId() {
      return peer ? peer.id : null;
    },
    isHost() {
      return isHost && peer !== null;
    },
    isGuest() {
      return !isHost && peer !== null && connections.size > 0;
    },
    sendPlayer(data) {
      const now = Date.now();
      if (now - lastSync < SYNC_MS) return;
      lastSync = now;
      if (!peer) return;
      const msg = Object.assign({ type: "player", t: now }, data);
      if (isHost) {
        broadcast(msg);
      } else {
        const entry = connections.values().next().value;
        if (entry && entry.conn.open) {
          try {
            entry.conn.send(msg);
          } catch (_) {}
        }
      }
    },
    sendWorld(world) {
      if (!isHost) return;
      broadcast(Object.assign({ type: "world", t: Date.now() }, world));
    },
    onPeersChanged(cb) {
      onUpdate = cb;
    },
    onWorldState(cb) {
      onWorldState = cb;
    },
  };
})();
