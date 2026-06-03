(function () {
  "use strict";

  /** Ekte spor (OpenGameArt) – spilles etter hverandre, ikke loop av samme type */
  const PLAYLIST = [
    {
      name: "Space Adventure",
      src: "music/space_adventure.ogg",
      credit: "MintoDog / OpenGameArt",
    },
    {
      name: "Space City",
      src: "music/space_city.ogg",
      credit: "MintoDog / OpenGameArt",
    },
    {
      name: "The Simplest Synthwave",
      src: "music/simplest_synthwave.ogg",
      credit: "Spring / OpenGameArt",
    },
  ];

  let trackIndex = 0;
  let audioEl = null;
  let started = false;
  let muted = false;
  const targetVol = 0.55;
  let fadeTimer = null;

  function getTrack() {
    return PLAYLIST[trackIndex];
  }

  function createAudio() {
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
    }
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.volume = muted ? 0 : targetVol;
    audioEl.addEventListener("ended", onTrackEnded);
    audioEl.addEventListener("error", onTrackError);
  }

  function setVolume(vol) {
    if (!audioEl) return;
    audioEl.volume = Math.max(0, Math.min(1, vol));
  }

  function fadeVolume(to, ms, done) {
    if (!audioEl) {
      if (done) done();
      return;
    }
    if (fadeTimer) clearInterval(fadeTimer);
    const from = audioEl.volume;
    const steps = Math.max(8, Math.floor(ms / 40));
    let n = 0;
    fadeTimer = setInterval(() => {
      n++;
      const t = n / steps;
      setVolume(from + (to - from) * t);
      if (n >= steps) {
        clearInterval(fadeTimer);
        fadeTimer = null;
        if (done) done();
      }
    }, ms / steps);
  }

  function loadTrack(index, autoplay) {
    const t = PLAYLIST[index];
    if (!t) return;
    trackIndex = index;
    if (!audioEl) createAudio();
    audioEl.src = t.src;
    audioEl.load();
    if (autoplay) {
      const p = audioEl.play();
      if (p && p.catch) {
        p.catch(() => {});
      }
    }
  }

  function onTrackEnded() {
    if (!started) return;
    const next = (trackIndex + 1) % PLAYLIST.length;
    fadeVolume(0, 280, () => {
      loadTrack(next, false);
      if (muted) {
        setVolume(0);
        audioEl.play().catch(() => {});
        return;
      }
      fadeVolume(targetVol, 400, () => {
        audioEl.play().catch(() => {});
      });
    });
  }

  function onTrackError() {
    const next = (trackIndex + 1) % PLAYLIST.length;
    if (next === trackIndex) return;
    loadTrack(next, started && !muted);
  }

  async function start() {
    if (!audioEl) createAudio();
    const wasPlaying = started && audioEl && !audioEl.paused;
    started = true;
    if (!audioEl.src || audioEl.error) {
      loadTrack(trackIndex, false);
    }
    setVolume(muted ? 0 : wasPlaying ? audioEl.volume : 0);
    try {
      await audioEl.play();
    } catch (_) {
      return;
    }
    if (!muted && !wasPlaying) {
      fadeVolume(targetVol, 600);
    }
  }

  async function stop() {
    started = false;
    if (fadeTimer) clearInterval(fadeTimer);
    if (!audioEl) return;
    fadeVolume(0, 350, () => {
      audioEl.pause();
      audioEl.currentTime = 0;
      trackIndex = 0;
      loadTrack(0, false);
    });
  }

  async function setPaused(paused) {
    if (!audioEl) return;
    if (paused) {
      audioEl.pause();
    } else if (started) {
      try {
        await audioEl.play();
      } catch (_) {}
      setVolume(muted ? 0 : targetVol);
    }
  }

  function toggleMute() {
    muted = !muted;
    if (!audioEl) return muted;
    setVolume(muted ? 0 : targetVol);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function getTrackName() {
    return getTrack().name;
  }

  window.Bgm = { start, stop, setPaused, toggleMute, isMuted, getTrackName };
})();
