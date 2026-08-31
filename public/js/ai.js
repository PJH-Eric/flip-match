/* ===== ai.js — 電腦對手（簡單 / 普通 / 困難） ===== */
(function (w) {
  'use strict';

  var CONF = {
    easy:   { name: '電腦（簡單）', avatar: '🐣', remember: 0.34, mistake: 0.34, decay: 0.10, think: [900, 1500] },
    normal: { name: '電腦（普通）', avatar: '🐰', remember: 0.70, mistake: 0.12, decay: 0.03, think: [700, 1200] },
    hard:   { name: '電腦（困難）', avatar: '🦊', remember: 1.00, mistake: 0.00, decay: 0.00, think: [500, 900] }
  };

  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

  function create(level) {
    var cf = CONF[level] || CONF.normal;
    var mem = {};            // index -> symbol
    return {
      level: level,
      name: cf.name,
      avatar: cf.avatar,

      /* 任何一張牌被掀開時呼叫（含對手翻的、記憶時間全開的） */
      observe: function (index, sym, sure) {
        if (sure || Math.random() < cf.remember) mem[index] = sym;
        else if (mem[index] === undefined && Math.random() < cf.remember * 0.5) mem[index] = sym;
      },

      /* 記憶時間：一次看到整個牌面 */
      observeAll: function (layout) {
        for (var i = 0; i < layout.length; i++) {
          if (Math.random() < cf.remember) mem[i] = layout[i];
        }
      },

      /* 配對成功後把牌從記憶中移除 */
      remove: function (a, b) { delete mem[a]; delete mem[b]; },

      /* 每回合結束時輕微遺忘（簡單電腦特別健忘） */
      decay: function () {
        if (!cf.decay) return;
        for (var k in mem) if (Math.random() < cf.decay) delete mem[k];
      },

      thinkTime: function () { return cf.think[0] + Math.random() * (cf.think[1] - cf.think[0]); },

      /* 選第一張：avail = 尚未配對成功的索引陣列 */
      first: function (avail) {
        var byS = {}, pair = null;
        for (var i = 0; i < avail.length; i++) {
          var idx = avail[i], s = mem[idx];
          if (s === undefined) continue;
          if (byS[s] !== undefined) { pair = [byS[s], idx]; break; }
          byS[s] = idx;
        }
        if (pair && Math.random() >= cf.mistake) { this._plan = pair[1]; return pair[0]; }
        this._plan = null;
        var unknown = avail.filter(function (i) { return mem[i] === undefined; });
        return unknown.length ? rnd(unknown) : rnd(avail);
      },

      /* 選第二張：firstIdx 已翻開且知道其花色 firstSym */
      second: function (avail, firstIdx, firstSym) {
        if (this._plan !== null && this._plan !== undefined && avail.indexOf(this._plan) >= 0 && this._plan !== firstIdx) {
          var p = this._plan; this._plan = null; return p;
        }
        var cand = [];
        for (var i = 0; i < avail.length; i++) {
          var idx = avail[i];
          if (idx === firstIdx) continue;
          if (mem[idx] === firstSym) cand.push(idx);
        }
        if (cand.length && Math.random() >= cf.mistake) return rnd(cand);
        var unknown = avail.filter(function (i) { return i !== firstIdx && mem[i] === undefined; });
        if (unknown.length) return rnd(unknown);
        var other = avail.filter(function (i) { return i !== firstIdx; });
        return rnd(other);
      }
    };
  }

  w.AI = { create: create, CONF: CONF };
})(window);
