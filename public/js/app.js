/* ===== app.js — 畫面切換與整體流程 ===== */
(function (w) {
  'use strict';
  var D = document;
  function q(id) { return D.getElementById(id); }
  function qa(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }

  var DECK_IDS = ['animals', 'vehicles', 'fruits', 'characters', 'stationery'];
  var AVATARS = ['🐱', '🐻', '🐰', '🐼', '🦊', '🐧'];

  var opt = { size: 4, deck: 'animals', ai: 'normal' };
  try {
    var saved = JSON.parse(localStorage.getItem('fm_opt') || '{}');
    if ([4, 6, 8].indexOf(saved.size) >= 0) opt.size = saved.size;
    if (DECK_IDS.indexOf(saved.deck) >= 0) opt.deck = saved.deck;
    if (['easy', 'normal', 'hard'].indexOf(saved.ai) >= 0) opt.ai = saved.ai;
  } catch (e) {}
  function saveOpt() { try { localStorage.setItem('fm_opt', JSON.stringify(opt)); } catch (e) {} }

  var cur = 's-home';
  var pendingMode = 'solo';
  var room = null;
  var lastCfg = null;

  /* ---------- 畫面切換 ---------- */
  function go(id) {
    if (cur === 's-game' && id !== 's-game') w.Game.stop();
    qa('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    cur = id;
    w.Sound.setTrack(id === 's-game' ? 'game' : 'menu');
    if (id === 's-game') setTimeout(w.Game.resize, 60);
    if (id === 's-rank') renderRank();
    setTimeout(function () { qa('.btn3d', q(id)).forEach(w.UI.paint); }, 30);
  }

  /* ---------- 牌組選項 ---------- */
  function deckPreview(d) {
    var h = '<span class="dpv">';
    for (var i = 0; i < 3; i++) {
      var ic = d.icons[Math.floor(d.icons.length / 3 * i)];
      h += '<svg viewBox="0 0 100 100">' + ic.svg + '</svg>';
    }
    return h + '</span>';
  }
  function buildDeckRow(host, onPick) {
    var h = '';
    DECK_IDS.forEach(function (id) {
      var d = w.DECKS[id];
      if (!d) return;
      h += '<button class="optcard" data-v="' + id + '"><b>' + d.name + '</b>' + deckPreview(d) + '</button>';
    });
    host.innerHTML = h;
    host.onclick = function (e) {
      var b = e.target.closest('.optcard');
      if (!b) return;
      w.Sound.play('click');
      onPick(b.getAttribute('data-v'));
    };
  }
  function markRow(host, val) {
    qa('.optcard', host).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === String(val)); });
  }

  /* ---------- 設定畫面 ---------- */
  function openSetup(mode) {
    pendingMode = mode;
    q('setup-title').textContent = mode === 'solo' ? '單機挑戰' : '對戰電腦';
    q('ai-block').style.display = mode === 'ai' ? '' : 'none';
    markRow(q('opt-size'), opt.size);
    markRow(q('opt-deck'), opt.deck);
    markRow(q('opt-ai'), opt.ai);
    go('s-setup');
  }

  function startLocal() {
    var players, aiLevel = null;
    var meId = 'me';
    if (pendingMode === 'solo') {
      players = [{ id: 'me', name: '你', avatar: AVATARS[0], type: 'me' }];
    } else {
      aiLevel = opt.ai;
      var conf = w.AI.CONF[aiLevel];
      players = [
        { id: 'me', name: '你', avatar: AVATARS[0], type: 'me' },
        { id: 'cpu', name: conf.name, avatar: conf.avatar, type: 'ai' }
      ];
    }
    lastCfg = { mode: pendingMode, size: opt.size, deck: opt.deck, aiLevel: aiLevel, players: players, meId: meId };
    go('s-game');
    w.Sound.startBgm('game');
    w.Game.start({
      mode: pendingMode, size: opt.size, deck: opt.deck,
      players: players, meId: meId, aiLevel: aiLevel,
      cur: 0, onEnd: showResult
    });
  }

  /* ---------- 結算 ---------- */
  function showResult(res) {
    var crown = '🎉', title = '全部配對完成！';
    var rows = '';
    if (res.mode === 'solo') {
      crown = res.best ? '🏆' : '🎉';
      title = res.best ? '新紀錄！太厲害了' : '全部配對完成！';
      rows += row('得分', res.score + ' 分', res.best);
      rows += row('用時', w.Game.fmt(res.ms));
      rows += row('翻牌次數', res.moves + ' 次');
      rows += row('逾時次數', res.timeouts + ' 次');
      rows += row('時間加分', '+' + res.timeBonus);
    } else {
      var meId = res.meId || 'me';
      var me = res.players.filter(function (p) { return p.id === meId; })[0];
      crown = res.draw ? '🤝' : (res.win ? '🏆' : '😿');
      title = res.draw ? '平手！' : (res.win ? '你贏了！' : '這次輸了…再來一場？');
      res.players.forEach(function (p) {
        rows += row(p.avatar + ' ' + p.name, (res.scores[p.id] || 0) + ' 組', res.win && p === me);
      });
      rows += row('用時', w.Game.fmt(res.ms));
    }
    q('res-crown').textContent = crown;
    q('res-title').textContent = title;
    q('res-stats').innerHTML = rows;
    setTimeout(function () { go('s-result'); }, 900);
  }
  function row(k, v, best) {
    return '<div class="row' + (best ? ' best' : '') + '"><span>' + k + '</span><b>' + v + '</b></div>';
  }

  /* ---------- 排行榜 ---------- */
  function renderRank() {
    var db = w.Records.all();
    var h = '';
    [4, 6, 8].forEach(function (s) {
      var r = db['s' + s];
      h += '<div class="rankgrp"><h4>' + w.Game.DIFF_NAME[s] + '（' + s + '×' + s + '）</h4>';
      if (!r) h += '<div class="r"><span>還沒有紀錄</span><b>—</b></div>';
      else {
        h += '<div class="r"><span>最高分</span><b>' + (r.score || 0) + ' 分</b></div>';
        h += '<div class="r"><span>最快完成</span><b>' + (r.ms ? w.Game.fmt(r.ms) : '—') + '</b></div>';
        h += '<div class="r"><span>最少翻牌</span><b>' + (r.moves || '—') + ' 次</b></div>';
        h += '<div class="r"><span>遊玩次數</span><b>' + (r.plays || 0) + ' 場</b></div>';
      }
      h += '</div>';
    });
    q('ranklist').innerHTML = h;
  }

  /* ---------- 大廳 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function renderRooms(list) {
    var host = q('roomlist');
    if (!list || !list.length) { host.innerHTML = '<div class="empty">目前沒有房間<br>按「建立房間」開一間吧！</div>'; return; }
    var h = '';
    list.forEach(function (r) {
      var playing = r.state === 'play';
      h += '<div class="roomrow' + (playing ? ' playing' : '') + '">' +
        '<span class="rname">' + esc(r.name) + '</span>' +
        '<span class="rtag">' + w.Game.DIFF_NAME[r.size] + ' ' + r.size + '×' + r.size + '</span>' +
        '<span class="rtag">' + (w.DECKS[r.deck] ? w.DECKS[r.deck].name : r.deck) + '</span>' +
        '<span class="rtag">' + r.count + '/2</span>' +
        (playing || r.count >= 2
          ? '<button class="btn3d small" data-color="gray" disabled>' + (playing ? '進行中' : '已滿') + '</button>'
          : '<button class="btn3d small joinbtn" data-color="mint" data-id="' + r.id + '">加入</button>') +
        '</div>';
    });
    host.innerHTML = h;
    qa('.btn3d', host).forEach(w.UI.decorate);
    host.onclick = function (e) {
      var b = e.target.closest('.joinbtn');
      if (!b) return;
      w.Sound.play('click');
      w.Net.join(b.getAttribute('data-id'));
    };
  }

  /* ---------- 房間 ---------- */
  function renderRoom() {
    if (!room) return;
    q('room-title').textContent = room.name;
    var isHost = room.hostId === w.Net.id();
    q('host-opts').style.display = isHost ? '' : 'none';
    markRow(q('ropt-size'), room.size);
    markRow(q('ropt-deck'), room.deck);
    for (var i = 0; i < 2; i++) {
      var p = room.players[i], seat = q('seat' + i);
      if (p) {
        seat.querySelector('.ava').textContent = AVATARS[i];
        seat.querySelector('b').textContent = p.name + (p.id === room.hostId ? '（房主）' : '');
        seat.querySelector('.rdy').textContent = p.ready ? '已準備 ✔' : '尚未準備';
        seat.classList.toggle('ready', !!p.ready);
      } else {
        seat.querySelector('.ava').textContent = '⏳';
        seat.querySelector('b').textContent = '等待玩家加入…';
        seat.querySelector('.rdy').textContent = '—';
        seat.classList.remove('ready');
      }
    }
    var mine = room.players.filter(function (p) { return p.id === w.Net.id(); })[0];
    var btn = q('b-ready');
    w.UI.setLabel(btn, mine && mine.ready ? '取消準備 ✖' : '我準備好了 ✔');
    w.UI.setColor(btn, mine && mine.ready ? 'cream' : 'pink');
    btn.disabled = room.players.length < 2;
    if (room.players.length < 2) q('sysline').textContent = '等待另一位玩家加入…';
  }

  function syncSoundBtns() {
    [q('b-music'), q('b-music2')].forEach(function (b) { if (b) b.classList.toggle('off', !w.Sound.isMusicOn()); });
    [q('b-sfx'), q('b-sfx2')].forEach(function (b) { if (b) b.classList.toggle('off', !w.Sound.isSfxOn()); });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    w.UI.bgDeco(q('bgdeco'));
    q('logo').innerHTML = w.UI.logo();
    w.UI.decorateAll();
    buildDeckRow(q('opt-deck'), function (v) { opt.deck = v; saveOpt(); markRow(q('opt-deck'), v); });
    buildDeckRow(q('ropt-deck'), function (v) { if (room && room.hostId === w.Net.id()) w.Net.setopt(room.size, v); });
    markRow(q('opt-size'), opt.size);
    markRow(q('opt-deck'), opt.deck);
    markRow(q('opt-ai'), opt.ai);

    D.addEventListener('pointerdown', function once() {
      w.Sound.unlock();
      if (w.Sound.isMusicOn()) w.Sound.startBgm(cur === 's-game' ? 'game' : 'menu');
      D.removeEventListener('pointerdown', once);
    });

    qa('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () { w.Sound.play('click'); go(b.getAttribute('data-back')); });
    });

    q('opt-size').onclick = function (e) {
      var b = e.target.closest('.optcard'); if (!b) return;
      w.Sound.play('click'); opt.size = +b.getAttribute('data-v'); saveOpt(); markRow(q('opt-size'), opt.size);
    };
    q('opt-ai').onclick = function (e) {
      var b = e.target.closest('.optcard'); if (!b) return;
      w.Sound.play('click'); opt.ai = b.getAttribute('data-v'); saveOpt(); markRow(q('opt-ai'), opt.ai);
    };
    q('ropt-size').onclick = function (e) {
      var b = e.target.closest('.optcard'); if (!b || !room || room.hostId !== w.Net.id()) return;
      w.Sound.play('click'); w.Net.setopt(+b.getAttribute('data-v'), room.deck);
    };

    q('b-solo').onclick = function () { w.Sound.play('click'); openSetup('solo'); };
    q('b-ai').onclick = function () { w.Sound.play('click'); openSetup('ai'); };
    q('b-rank').onclick = function () { w.Sound.play('click'); go('s-rank'); };
    q('b-help').onclick = function () { w.Sound.play('click'); go('s-help'); };
    q('b-start').onclick = function () { w.Sound.play('start'); startLocal(); };
    q('b-clearrank').onclick = function () { w.Sound.play('click'); w.Records.clear(); renderRank(); };
    q('b-home2').onclick = function () { w.Sound.play('click'); if (room) { w.Net.leave(); room = null; } go('s-home'); };
    q('b-again').onclick = function () {
      w.Sound.play('click');
      if (lastCfg && lastCfg.mode !== 'online') { pendingMode = lastCfg.mode; startLocal(); }
      else if (room) { go('s-room'); w.Net.ready(false); }
      else go('s-home');
    };
    q('b-quit').onclick = function () {
      w.Sound.play('click');
      w.Game.stop();
      if (room) { w.Net.leave(); room = null; }
      go('s-home');
    };
    [['b-music', 'b-music2'], ['b-sfx', 'b-sfx2']].forEach(function (pair, k) {
      pair.forEach(function (id) {
        var b = q(id); if (!b) return;
        b.onclick = function () {
          if (k === 0) { w.Sound.toggleMusic(); if (!w.Sound.isMusicOn()) w.Sound.stopBgm(); }
          else w.Sound.toggleSfx();
          syncSoundBtns();
        };
      });
    });
    syncSoundBtns();

    q('b-online').onclick = function () {
      w.Sound.play('click');
      var n = w.Net.savedName();
      if (n) q('nickname').value = n;
      go('s-lobby');
      w.Net.connect();
    };
    q('b-refresh').onclick = function () { w.Sound.play('click'); w.Net.rooms(); };
    q('nickname').onchange = function () { w.Net.setName(q('nickname').value); };
    q('b-create').onclick = function () {
      w.Sound.play('click');
      if (!w.Net.isOpen()) { w.Game.toast('尚未連上伺服器'); return; }
      var nick = q('nickname').value || ('玩家' + Math.floor(Math.random() * 90 + 10));
      w.Net.setName(nick);
      w.Net.create(nick + ' 的房間', opt.size, opt.deck);
    };
    q('b-leaveroom').onclick = function () { w.Sound.play('click'); w.Net.leave(); room = null; go('s-lobby'); };
    q('b-ready').onclick = function () {
      w.Sound.play('ready');
      var mine = room && room.players.filter(function (p) { return p.id === w.Net.id(); })[0];
      w.Net.ready(!(mine && mine.ready));
    };

    /* ----- 伺服器事件 ----- */
    w.Net.on('status', function (s) {
      var d = q('conn-dot');
      d.className = 'conn' + (s === 'ok' ? ' ok' : s === 'bad' ? ' bad' : '');
      q('conn-txt').textContent = s === 'ok' ? '已連線' : s === 'bad' ? '連線中斷' : '連線中…';
    });
    w.Net.on('rooms', function (m) { if (cur === 's-lobby') renderRooms(m.rooms); });
    w.Net.on('joined', function () { q('sysline').textContent = ''; go('s-room'); });
    w.Net.on('room', function (m) {
      room = m.room;
      if (cur === 's-room') renderRoom();
      else if (cur === 's-lobby' && room.players.some(function (p) { return p.id === w.Net.id(); })) { go('s-room'); renderRoom(); }
    });
    w.Net.on('left', function () { room = null; go('s-lobby'); w.Net.rooms(); });
    w.Net.on('sys', function (m) { q('sysline').textContent = m.m; });
    w.Net.on('err', function (m) { w.Game.toast(m.m); q('sysline').textContent = m.m; });
    w.Net.on('chat', function (m) { q('sysline').textContent = m.from + '：' + m.m; });

    w.Net.on('start', function (m) {
      var players = m.players.map(function (p, i) {
        return { id: p.id, name: p.name, avatar: AVATARS[i], type: p.id === w.Net.id() ? 'me' : 'remote' };
      });
      lastCfg = { mode: 'online' };
      go('s-game');
      if (w.Sound.isMusicOn()) w.Sound.startBgm('game');
      var curIdx = 0;
      players.forEach(function (p, i) { if (p.id === m.cur) curIdx = i; });
      w.Game.start({
        mode: 'online', size: m.size, deck: m.deck, layout: m.layout,
        players: players, meId: w.Net.id(), cur: curIdx,
        onEnd: function (res) { res.meId = w.Net.id(); showResult(res); }
      });
    });
    w.Net.on('turn', function (m) { w.Game.net.turn(m.cur); });
    w.Net.on('flip', function (m) { w.Game.net.flip(m.i, m.sym); });
    w.Net.on('result', function (m) { w.Game.net.result(m.a, m.b, m.match, m.scores, m.by); });
    w.Net.on('timeout', function (m) { w.Game.net.timeout(m.close); });
    w.Net.on('hint', function (m) { w.Game.net.hint(m.a, m.b, m.by, m.left); });
    w.Net.on('end', function (m) { w.Game.net.end(m.scores, m.winner); });
    w.Net.on('oppLeft', function (m) {
      w.Game.stop();
      w.Game.toast('對手離開了遊戲', 2200);
      q('sysline').textContent = (m.name || '對手') + ' 離開了，回到房間等待。';
      go('s-room');
    });

    go('s-home');
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
