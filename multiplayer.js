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

  const mpStatus = document.getElementById("mp-status");
  const mpHostBtn = document.getElementById("mp-host-btn");
  const mpJoinBtn = document.getElementById("mp-join-btn");
  const mpJoinForm = document.getElementById("mp-join-form");
  const mpRoomInput = document.getElementById("mp-room-input");
  const mpConnectBtn = document.getElementById("mp-connect-btn");
  const mpRoomInfo = document.getElementById("mp-room-info");
  const mpRoomCode = document.getElementById("mp-room-code");
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
    let id = "rr-";
    for (let i = 0; i < 6; i++) id += chars[(Math.random() * chars.length) | 0];
    return id;
  }

  function normalizeRoomId(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
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
      const entry = connections.get(conn.peer);
      if (entry && data) {
        entry.data = Object.assign(entry.data, data);
        rebuildRemotePeers();
      }
    });

    conn.on("close", () => {
      connections.delete(conn.peer);
      rebuildRemotePeers();
      if (connections.size === 0 && isHost) {
        setStatus("Venter på spillere…", "waiting");
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
    const payload = Object.assign({ t: Date.now() }, data);
    connections.forEach((entry) => {
      if (entry.conn.open) {
        try {
          entry.conn.send(payload);
        } catch (_) {}
      }
    });
  }

  function showRoomCode() {
    if (!mpRoomCode || !roomId) return;
    mpRoomCode.textContent = roomId;
    if (mpRoomInfo) mpRoomInfo.classList.remove("hidden");
  }

  function updateUI(mode) {
    const joining = mode === "join";
    const inRoom = roomId !== null;

    mpHostBtn.classList.toggle("hidden", inRoom || joining);
    mpJoinBtn.classList.toggle("hidden", inRoom || joining);
    mpJoinForm.classList.toggle("hidden", !joining);
    mpRoomInfo.classList.toggle("hidden", !(isHost && roomId));
    mpLeaveBtn.classList.toggle("hidden", mode === "idle" && !joining);
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
    if (peer) {
      try {
        peer.destroy();
      } catch (_) {}
      peer = null;
    }
    roomId = null;
    isHost = false;
    updateUI("idle");
    setStatus("Ikke tilkoblet", "");
    if (mpRoomInput) mpRoomInput.value = "";
  }

  function startHost() {
    if (typeof Peer === "undefined") {
      setStatus("Multiplayer utilgjengelig (PeerJS)", "error");
      return;
    }
    cleanup();
    roomId = randomRoomId();
    isHost = true;
    showRoomCode();
    setStatus("Oppretter rom… Kode: " + roomId, "waiting");
    updateUI("host");

    peer = new Peer(roomId, { debug: 0 });

    peer.on("open", () => {
      showRoomCode();
      setStatus("Romklar! Del koden: " + roomId, "waiting");
      updateUI("host");
      const u = new URL(window.location.href);
      u.searchParams.set("room", roomId);
      window.history.replaceState({}, "", u);
    });

    peer.on("connection", bindConnection);

    peer.on("error", (err) => {
      setStatus("Feil: " + (err.message || "kunne ikke opprette rom"), "error");
      cleanup();
    });
  }

  function startJoin(id) {
    if (typeof Peer === "undefined") {
      setStatus("Multiplayer utilgjengelig (PeerJS)", "error");
      return;
    }
    const target = normalizeRoomId(id);
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
    });

    peer.on("error", (err) => {
      setStatus("Kunne ikke koble til. Sjekk romkoden.", "error");
      cleanup();
    });
  }

  function showJoinForm() {
    updateUI("join");
    setStatus("Skriv romkode fra vennen", "");
    if (mpRoomInput) mpRoomInput.focus();
  }

  if (mpHostBtn) mpHostBtn.addEventListener("click", startHost);
  if (mpJoinBtn) mpJoinBtn.addEventListener("click", showJoinForm);
  if (mpConnectBtn) {
    mpConnectBtn.addEventListener("click", () => startJoin(mpRoomInput.value));
  }
  if (mpRoomInput) {
    mpRoomInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") startJoin(mpRoomInput.value);
    });
  }
  if (mpLeaveBtn) mpLeaveBtn.addEventListener("click", () => {
    const u = new URL(window.location.href);
    u.searchParams.delete("room");
    window.history.replaceState({}, "", u);
    cleanup();
  });
  function copyText(text, okMsg) {
    navigator.clipboard.writeText(text).then(
      () => setStatus(okMsg, "connected"),
      () => setStatus(text, "connected")
    );
  }

  if (mpCopyCodeBtn) {
    mpCopyCodeBtn.addEventListener("click", () => {
      if (!roomId) return;
      copyText(roomId, "Romkode kopiert!");
    });
  }
  if (mpCopyBtn) {
    mpCopyBtn.addEventListener("click", () => {
      if (!roomId) return;
      copyText(getShareUrl(roomId), "Lenke kopiert!");
    });
  }

  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room");
  if (roomParam) {
    setTimeout(() => startJoin(roomParam), 400);
  }

  updateUI("idle");

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
    broadcast(state) {
      const now = Date.now();
      if (now - lastSync < SYNC_MS) return;
      lastSync = now;
      if (!peer) return;
      if (isHost) {
        broadcast(state);
      } else {
        const entry = connections.values().next().value;
        if (entry && entry.conn.open) {
          try {
            entry.conn.send(Object.assign({ t: now }, state));
          } catch (_) {}
        }
      }
    },
    onPeersChanged(cb) {
      onUpdate = cb;
    },
  };
})();
