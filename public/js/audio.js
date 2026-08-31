/* ===== audio.js — Web Audio 即時合成的背景音樂與音效（無需任何音檔） ===== */
(function (w) {
  'use strict';

  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var musicOn = true, sfxOn = true;
  var timer = null, step = 0, nextTime = 0, curTrack = 'menu';
  var TEMPO = 108;                       // BPM
  var STEP = 15 / TEMPO;                 // 十六分音符秒數

  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} }
  musicOn = load('fm_music', true);
  sfxOn = load('fm_sfx', true);

  function ensure() {
    if (ctx) return ctx;
    var AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.55 : 0; sfxGain.connect(master);
    return ctx;
  }
  function unlock() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  /* --- 基礎發聲 --- */
  function tone(o) {
    if (!ctx) return;
    var t0 = o.t || ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.dur || 0.2));
    var peak = o.v === undefined ? 0.5 : o.v;
    var atk = o.atk === undefined ? 0.008 : o.atk;
    var dur = o.dur || 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.bus || sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(o) {
    if (!ctx) return;
    var t0 = o.t || ctx.currentTime, dur = o.dur || 0.12;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = o.type || 'bandpass';
    bp.frequency.value = o.f || 2200; bp.Q.value = o.q || 1.1;
    var g = ctx.createGain(); g.gain.value = o.v === undefined ? 0.28 : o.v;
    src.connect(bp); bp.connect(g); g.connect(o.bus || sfxGain);
    src.start(t0);
  }

  /* --- 音效表 --- */
  var SFX = {
    click: function (t) { tone({ t: t, f: 620, f2: 880, dur: 0.09, type: 'square', v: 0.28 }); },
    flip: function (t) {
      tone({ t: t, f: 520, f2: 900, dur: 0.13, type: 'triangle', v: 0.4 });
      noise({ t: t, f: 3400, dur: 0.06, v: 0.12 });
    },
    match: function (t) {
      [0, 0.09, 0.18].forEach(function (d, i) {
        tone({ t: t + d, f: hz(72 + i * 4), dur: 0.26, type: 'triangle', v: 0.4 });
        tone({ t: t + d, f: hz(84 + i * 4), dur: 0.2, type: 'sine', v: 0.16 });
      });
      noise({ t: t + 0.02, f: 5200, dur: 0.22, v: 0.08 });
    },
    wrong: function (t) {
      tone({ t: t, f: 300, f2: 170, dur: 0.26, type: 'sawtooth', v: 0.22 });
      tone({ t: t + 0.02, f: 220, f2: 130, dur: 0.28, type: 'triangle', v: 0.24 });
    },
    hint: function (t) {
      [0, 0.06, 0.12, 0.18].forEach(function (d, i) {
        tone({ t: t + d, f: hz(84 + i * 3), dur: 0.22, type: 'sine', v: 0.26 });
      });
    },
    tick: function (t) { tone({ t: t, f: 1050, dur: 0.055, type: 'square', v: 0.2 }); noise({ t: t, f: 2600, dur: 0.03, v: 0.08 }); },
    tickHot: function (t) { tone({ t: t, f: 1500, f2: 1300, dur: 0.09, type: 'square', v: 0.34 }); },
    timeup: function (t) {
      tone({ t: t, f: 440, f2: 180, dur: 0.5, type: 'sawtooth', v: 0.26 });
      noise({ t: t, f: 900, dur: 0.4, v: 0.14 });
    },
    ready: function (t) { tone({ t: t, f: hz(76), dur: 0.3, type: 'triangle', v: 0.36 }); tone({ t: t + 0.11, f: hz(83), dur: 0.36, type: 'triangle', v: 0.34 }); },
    turn: function (t) { tone({ t: t, f: hz(74), dur: 0.16, type: 'sine', v: 0.3 }); tone({ t: t + 0.1, f: hz(81), dur: 0.24, type: 'sine', v: 0.3 }); },
    win: function (t) {
      [72, 76, 79, 84, 88].forEach(function (n, i) {
        tone({ t: t + i * 0.11, f: hz(n), dur: 0.5, type: 'triangle', v: 0.42 });
        tone({ t: t + i * 0.11, f: hz(n + 12), dur: 0.4, type: 'sine', v: 0.14 });
      });
      noise({ t: t + 0.5, f: 4200, dur: 0.6, v: 0.1 });
    },
    lose: function (t) {
      [72, 68, 65, 60].forEach(function (n, i) { tone({ t: t + i * 0.15, f: hz(n), dur: 0.42, type: 'triangle', v: 0.32 }); });
    },
    draw: function (t) { [72, 76, 72].forEach(function (n, i) { tone({ t: t + i * 0.14, f: hz(n), dur: 0.34, type: 'triangle', v: 0.32 }); }); },
    start: function (t) {
      tone({ t: t, f: 300, f2: 1200, dur: 0.34, type: 'triangle', v: 0.3 });
      noise({ t: t, f: 1800, dur: 0.3, v: 0.1 });
    }
  };

  function play(name, delay) {
    if (!sfxOn) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    var f = SFX[name];
    if (f) f(ctx.currentTime + (delay || 0));
  }

  /* --- 背景音樂：五聲音階循環 --- */
  var MEL = {
    menu: [72, null, 76, null, 79, null, 76, null, 74, null, 79, null, 77, null, null, null,
           72, null, 76, null, 81, null, 79, null, 76, null, 74, null, 72, null, null, null],
    game: [79, null, 76, 79, 81, null, 79, null, 84, null, 81, null, 79, null, 76, null,
           74, null, 76, 79, 81, null, 84, null, 81, null, 79, 76, 74, null, null, null]
  };
  var BASS = [48, null, null, null, 55, null, null, null, 53, null, null, null, 55, null, null, null,
              45, null, null, null, 52, null, null, null, 50, null, null, null, 55, null, null, null];

  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.22) {
      var i = step % 32;
      var m = MEL[curTrack][i];
      if (m !== null && m !== undefined) {
        tone({ t: nextTime, f: hz(m), dur: STEP * 2.4, type: 'triangle', v: 0.5, bus: musicGain, atk: 0.02 });
        tone({ t: nextTime, f: hz(m + 12), dur: STEP * 1.6, type: 'sine', v: 0.12, bus: musicGain, atk: 0.03 });
      }
      var b = BASS[i];
      if (b !== null && b !== undefined) tone({ t: nextTime, f: hz(b), dur: STEP * 3.2, type: 'sine', v: 0.7, bus: musicGain, atk: 0.02 });
      if (i % 8 === 4) noise({ t: nextTime, f: 6200, dur: 0.05, v: 0.05, bus: musicGain });
      if (i % 4 === 0) noise({ t: nextTime, f: 160, q: 2, dur: 0.09, v: 0.16, bus: musicGain });
      nextTime += STEP;
      step++;
    }
  }

  function startBgm(track) {
    if (track && MEL[track]) curTrack = track;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (timer) return;
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(schedule, 30);
  }
  function stopBgm() { if (timer) { clearInterval(timer); timer = null; } }
  function setTrack(t) {
    if (!MEL[t] || curTrack === t) return;
    curTrack = t; step = 0;
  }

  function toggleMusic() {
    musicOn = !musicOn; save('fm_music', musicOn);
    ensure();
    if (musicGain) musicGain.gain.value = musicOn ? 0.16 : 0;
    if (musicOn) startBgm();
    return musicOn;
  }
  function toggleSfx() {
    sfxOn = !sfxOn; save('fm_sfx', sfxOn);
    ensure();
    if (sfxGain) sfxGain.gain.value = sfxOn ? 0.55 : 0;
    if (sfxOn) play('click');
    return sfxOn;
  }

  w.Sound = {
    unlock: unlock, play: play, startBgm: startBgm, stopBgm: stopBgm, setTrack: setTrack,
    toggleMusic: toggleMusic, toggleSfx: toggleSfx,
    isMusicOn: function () { return musicOn; },
    isSfxOn: function () { return sfxOn; }
  };
})(window);
