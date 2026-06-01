(function () {
  "use strict";

  const BPM = 118;
  const ROOT = 55;
  const BEAT = 60 / BPM;
  const S16 = BEAT / 4;

  const PROGRESSION = [
    [0, 3, 7],
    [5, 8, 12],
    [7, 11, 14],
    [0, 3, 7],
  ];

  const LEAD_PATTERN = [0, 3, 7, 12, 15, 12, 7, 3, 0, 7, 10, 15, 19, 15, 10, 7];
  const BASS_PATTERN = [0, 0, 7, 0, 3, 3, 7, 5, 0, 0, 7, 12, 3, 3, 5, 0];

  let ctx = null;
  let master = null;
  let schedulerId = null;
  let closeTimer = null;
  let nextNoteTime = 0;
  let step = 0;
  let started = false;
  let muted = false;
  let targetVol = 0.34;

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

  window.Bgm = { start, stop, setPaused, toggleMute, isMuted };
})();
