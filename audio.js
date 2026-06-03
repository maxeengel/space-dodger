(function () {
  "use strict";

  const TRACKS = [
    {
      name: "Neon Drift",
      bpm: 118,
      root: 55,
      bars: 4,
      progression: [
        [0, 3, 7],
        [5, 8, 12],
        [7, 11, 14],
        [0, 3, 7],
      ],
      leadPattern: [0, 3, 7, 12, 15, 12, 7, 3, 0, 7, 10, 15, 19, 15, 10, 7],
      bassPattern: [0, 0, 7, 0, 3, 3, 7, 5, 0, 0, 7, 12, 3, 3, 5, 0],
    },
    {
      name: "Cyber Chase",
      bpm: 124,
      root: 58,
      bars: 4,
      progression: [
        [0, 4, 7],
        [5, 9, 12],
        [3, 7, 10],
        [8, 12, 15],
      ],
      leadPattern: [0, 5, 7, 12, 17, 12, 7, 5, 3, 7, 10, 14, 19, 14, 10, 7],
      bassPattern: [0, 0, 5, 7, 3, 3, 10, 5, 0, 7, 5, 12, 8, 8, 5, 3],
    },
    {
      name: "Starport",
      bpm: 112,
      root: 52,
      bars: 4,
      progression: [
        [0, 3, 7],
        [8, 11, 15],
        [5, 8, 12],
        [3, 7, 10],
      ],
      leadPattern: [0, 3, 5, 10, 12, 10, 5, 3, 0, 5, 8, 12, 15, 12, 8, 5],
      bassPattern: [0, 0, 0, 5, 3, 3, 3, 8, 0, 0, 5, 10, 5, 5, 8, 3],
    },
    {
      name: "Hyper Run",
      bpm: 128,
      root: 60,
      bars: 4,
      progression: [
        [0, 3, 7],
        [7, 10, 14],
        [5, 8, 12],
        [10, 14, 17],
      ],
      leadPattern: [7, 10, 12, 17, 19, 17, 12, 10, 7, 12, 15, 19, 22, 19, 15, 12],
      bassPattern: [0, 7, 0, 7, 5, 5, 12, 7, 0, 7, 12, 17, 5, 5, 7, 0],
    },
  ];

  let trackIndex = 0;
  let BPM = TRACKS[0].bpm;
  let ROOT = TRACKS[0].root;
  let BEAT = 60 / BPM;
  let S16 = BEAT / 4;
  let STEPS_IN_TRACK = TRACKS[0].bars * 16;
  let PROGRESSION = TRACKS[0].progression;
  let LEAD_PATTERN = TRACKS[0].leadPattern;
  let BASS_PATTERN = TRACKS[0].bassPattern;

  let ctx = null;
  let master = null;
  let schedulerId = null;
  let closeTimer = null;
  let nextNoteTime = 0;
  let step = 0;
  let started = false;
  let muted = false;
  let targetVol = 0.34;

  function applyTrack(index) {
    const t = TRACKS[index];
    trackIndex = index;
    BPM = t.bpm;
    ROOT = t.root;
    PROGRESSION = t.progression;
    LEAD_PATTERN = t.leadPattern;
    BASS_PATTERN = t.bassPattern;
    STEPS_IN_TRACK = t.bars * 16;
    BEAT = 60 / BPM;
    S16 = BEAT / 4;
  }

  function nextTrack() {
    applyTrack((trackIndex + 1) % TRACKS.length);
    step = 0;
    if (master && ctx && !muted) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(targetVol * 0.5, t + 0.08);
      master.gain.linearRampToValueAtTime(targetVol, t + 0.35);
    }
  }

  function cancelClose() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function initContext() {
    if (ctx && ctx.state !== "closed") return;
    ctx = null;
    master = null;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    master.connect(comp);
  }

  function fadeTo(vol, dur) {
    if (!master || !ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(muted ? 0 : vol, t + dur);
  }

  function ensureScheduler() {
    if (schedulerId || !ctx) return;
    nextNoteTime = ctx.currentTime + 0.05;
    schedulerId = setInterval(scheduler, 25);
  }

  function semiToHz(semi) {
    return ROOT * 2 * Math.pow(2, semi / 12);
  }

  function playKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  function playSnare(t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 900;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + 0.12);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = "triangle";
    tone.frequency.value = 180;
    tg.gain.setValueAtTime(0.08, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    tone.connect(tg);
    tg.connect(master);
    tone.start(t);
    tone.stop(t + 0.07);
  }

  function playHat(t, accent) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.07 : 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + 0.05);
  }

  function playBass(t, semi) {
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    const hz = semiToHz(semi);
    osc.type = "sawtooth";
    osc.frequency.value = hz;
    sub.type = "sine";
    sub.frequency.value = hz / 2;
    f.type = "lowpass";
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.1);
    f.Q.value = 4;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(f);
    sub.connect(f);
    f.connect(g);
    g.connect(master);
    osc.start(t);
    sub.start(t);
    osc.stop(t + 0.16);
    sub.stop(t + 0.16);
  }

  function playLead(t, semi) {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    const hz = semiToHz(semi + 12);
    o1.type = "sawtooth";
    o2.type = "sawtooth";
    o1.frequency.value = hz;
    o2.frequency.value = hz * 1.007;
    f.type = "lowpass";
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    f.Q.value = 6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o1.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(master);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 0.2);
    o2.stop(t + 0.2);
  }

  function playPad(t, chord) {
    chord.forEach((semi, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const hz = semiToHz(semi);
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = hz;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.35);
      g.gain.linearRampToValueAtTime(0.035, t + BEAT * 3.5);
      g.gain.linearRampToValueAtTime(0.001, t + BEAT * 4);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + BEAT * 4.1);
    });
  }

  function scheduleStep(s, t) {
    const s16 = s % 16;
    const bar = Math.floor(s / 16) % PROGRESSION.length;
    const chord = PROGRESSION[bar];
    const root = chord[0];

    if (s16 === 0) playKick(t);
    if (s16 === 8) playKick(t);
    if (s16 === 4 || s16 === 12) playSnare(t);
    if (s16 % 2 === 1) playHat(t, s16 === 3 || s16 === 11);
    if (s16 % 2 === 0) playHat(t, false);

    playBass(t, root + BASS_PATTERN[s16]);

    if (s16 % 2 === 0) {
      playLead(t, root + LEAD_PATTERN[s % LEAD_PATTERN.length]);
    }

    if (s16 === 0) playPad(t, chord);
  }

  function scheduler() {
    if (!ctx || ctx.state === "closed" || muted) return;
    while (nextNoteTime < ctx.currentTime + 0.12) {
      if (step >= STEPS_IN_TRACK) {
        nextTrack();
      }
      scheduleStep(step, nextNoteTime);
      nextNoteTime += S16;
      step++;
    }
  }

  async function start() {
    cancelClose();
    initContext();
    if (ctx.state === "suspended") await ctx.resume();

    const wasPlaying = started && schedulerId;
    if (!wasPlaying) {
      applyTrack(0);
      step = 0;
    }
    started = true;
    ensureScheduler();
    fadeTo(targetVol, wasPlaying ? 0.2 : 0.8);
  }

  async function stop() {
    cancelClose();
    if (schedulerId) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
    fadeTo(0, 0.4);
    started = false;
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (started || !ctx) return;
      try {
        ctx.close();
      } catch (_) {}
      ctx = null;
      master = null;
      applyTrack(0);
      step = 0;
    }, 800);
  }

  async function setPaused(paused) {
    if (!ctx) return;
    if (paused) {
      if (schedulerId) {
        clearInterval(schedulerId);
        schedulerId = null;
      }
      fadeTo(0, 0.1);
      await ctx.suspend();
    } else {
      await ctx.resume();
      ensureScheduler();
      fadeTo(targetVol, 0.25);
    }
  }

  function toggleMute() {
    muted = !muted;
    if (!ctx) return muted;
    fadeTo(muted ? 0 : targetVol, 0.15);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function getTrackName() {
    return TRACKS[trackIndex].name;
  }

  window.Bgm = { start, stop, setPaused, toggleMute, isMuted, getTrackName };
})();
