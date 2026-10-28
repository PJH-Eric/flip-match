/* ===== app.js — 畫面切換與整體流程 ===== */
(function (w) {
  'use strict';
  var D = document;
  function q(id) { return D.getElementById(id); }
  function qa(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }

  function T(k, p, f) { return w.I18N.t(k, p, f); }
  function deckName(id) { var d = w.DECKS[id]; return T('deck.' + id, null, d ? d.name : id); }
  function diffName(size) { return T('diff.' + size); }
  /* 伺服器回傳的中文訊息 → 字典 key（協定維持不變，由前端翻譯） */
  function srvState(msg) {
    var codes = { roomNotFound: 'err.roomNotFound', roomFull: 'err.roomFull', roomPlaying: 'err.roomPlaying' };
    if (msg && msg.code) {
      if (codes[msg.code]) return { k: codes[msg.code] };
      if (msg.code === 'left' || msg.code === 'joined') return { k: 'sys.' + msg.code, p: { name: msg.name || '' } };
    }
    /* 舊版伺服器只送中文文字：退回以文字比對 */
    var map = { '房間不存在': 'err.roomNotFound', '房間已滿': 'err.roomFull', '對戰進行中': 'err.roomPlaying' };
    var text = String((msg && msg.m) || '');
    if (map[text]) return { k: map[text] };
    var m = /^(.*) 離開了房間$/.exec(text);
    if (m) return { k: 'sys.left', p: { name: m[1] } };
    m = /^(.*) 加入了房間$/.exec(text);
    if (m) return { k: 'sys.joined', p: { name: m[1] } };
    return { raw: text };
  }
  function stateText(st) { return !st ? '' : st.raw !== undefined ? st.raw : T(st.k, st.p); }
  function roomLabel(name) {
    var m = /^(.*) 的房間$/.exec(String(name || '')) || /^(.*)'s room$/.exec(String(name || ''));
    return m ? T('lobby.roomOf', { name: m[1] }) : String(name || '');
  }
  var noteState = { k: 'lobby.note' }, sysState = null, connState = 'connecting', lastRooms = null, lastRes = null;
  function renderNote() { var el = q('lobby-note'); if (el) el.textContent = stateText(noteState); }
  function setNote(st) { noteState = st; renderNote(); }
  function renderSys() { var el = q('sysline'); if (el) el.textContent = stateText(sysState); }
  function setSys(st) { sysState = st; renderSys(); }
  function renderConn() {
    var k = connState === 'ok' ? 'lobby.connected' : connState === 'bad' ? 'lobby.disconnected' : 'lobby.connecting';
    q('conn-txt').textContent = T(k);
  }

  var DECK_IDS = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'flags', 'numbers', 'phonetics', 'sports', 'mixed'];
  var AVATARS = ['🐱', '🐻', '🐰', '🐼', '🦊', '🐧'];

  var opt = { size: 4, deck: 'animals' };
  try {
    var saved = JSON.parse(localStorage.getItem('fm_opt') || '{}');
    if ([4, 6, 8].indexOf(saved.size) >= 0) opt.size = saved.size;
    if (DECK_IDS.indexOf(saved.deck) >= 0) opt.deck = saved.deck;
  } catch (e) {}
  function saveOpt() { try { localStorage.setItem('fm_opt', JSON.stringify(opt)); } catch (e) {} }

  var motionOn = true;
  try { motionOn = localStorage.getItem('fm_motion') !== '0'; } catch (e) {}
  function saveMotion() { try { localStorage.setItem('fm_motion', motionOn ? '1' : '0'); } catch (e) {} }

  var cur = 's-home';
  var pendingMode = 'solo';
  var room = null;
  var lastCfg = null;
  var inviteRoomId = readInviteRoom();
  var settingsLastFocus = null, settingsHistory = false;

  function readInviteRoom() {
    var source = (location.search || '') + '&' + (location.hash || '');
    var found = source.match(/[?&#]room=([^&#]+)/i);
    if (!found) return '';
    try { return decodeURIComponent(found[1]).slice(0, 32); } catch (e) { return ''; }
  }

  function inviteUrl(roomId) {
    var base = location.href.split(/[?#]/)[0];
    return base + '?room=' + encodeURIComponent(roomId);
  }

  function clearChatLogs() {
    ['room-chatlog', 'game-chatlog'].forEach(function (id) { var host = q(id); if (host) host.innerHTML = ''; });
  }

  function appendChat(m) {
    var targetId = cur === 's-game' ? 'game-chatlog' : 'room-chatlog';
    var host = q(targetId);
    if (!host) return;
    var item = D.createElement('div');
    item.className = 'chatmsg' + (m.fromId && m.fromId === w.Net.id() ? ' mine' : '');
    var name = D.createElement('b');
    name.textContent = m.from || T('common.player');
    var body = D.createElement('span');
    body.textContent = String(m.m || '');
    item.appendChild(name);
    item.appendChild(body);
    host.appendChild(item);
    while (host.children.length > 30) host.removeChild(host.firstChild);
    host.scrollTop = host.scrollHeight;
  }

  function submitChat(inputId) {
    var input = q(inputId);
    if (!input) return;
    var message = input.value.trim();
    if (!message) return;
    w.Net.chat(message);
    input.value = '';
  }

  function showRoomNotice(st) { setSys(typeof st === 'string' ? { raw: st } : st); }

  function openOnline() {
    w.Sound.play('click');
    var n = w.Net.savedName();
    if (n) q('nickname').value = n;
    q('invite-join').hidden = !inviteRoomId;
    setNote({ k: inviteRoomId ? 'lobby.noteInvite' : 'lobby.note' });
    go('s-lobby');
    w.Net.connect();
  }

  function joinInviteRoom() {
    if (!inviteRoomId) return;
    var nick = (q('nickname').value || '').trim();
    if (!nick) {
      setNote({ k: 'lobby.needNick' });
      q('nickname').focus();
      return;
    }
    w.Sound.play('click');
    w.Net.setName(nick);
    w.Net.join(inviteRoomId);
  }

  /* ---------- 畫面切換 ---------- */
  function go(id) {
    if (id === 's-home' || id === 's-setup') w.Net.disconnect();
    if (w.ServerOutage) w.ServerOutage.setScreen(id);
    if (cur === 's-game' && id !== 's-game') w.Game.stop();
    if (id !== 's-game' && w.NetworkLatency) w.NetworkLatency.setActive(false);
    qa('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    cur = id;
    w.Sound.setTrack(id === 's-game' ? 'game' : 'menu');
    if (id === 's-game') setTimeout(w.Game.resize, 60);
    if (id === 's-rank') renderRank();
    setTimeout(function () { qa('.btn3d', q(id)).forEach(w.UI.paint); }, 30);
  }

  function applyMotion() {
    D.documentElement.classList.toggle('reduced-motion', !motionOn);
  }

  function syncSettings() {
    var musicOn = w.Sound.isMusicOn(), sfxOn = w.Sound.isSfxOn();
    var musicVolume = Math.round(w.Sound.getMusicVolume() * 100);
    var sfxVolume = Math.round(w.Sound.getSfxVolume() * 100);
    q('settings-music').checked = musicOn;
    q('settings-sfx').checked = sfxOn;
    q('settings-music-volume').value = musicVolume;
    q('settings-sfx-volume').value = sfxVolume;
    q('settings-music-volume-value').textContent = musicVolume + '%';
    q('settings-sfx-volume-value').textContent = sfxVolume + '%';
    q('settings-music-status').textContent = T(musicOn ? 'common.on' : 'common.off');
    q('settings-sfx-status').textContent = T(sfxOn ? 'common.on' : 'common.off');
    q('settings-haptic').checked = w.Sound.isHapticOn();
    q('settings-motion').checked = motionOn;
  }

  function setSettingsOpen(open, fromHistory) {
    var modal = q('settings-modal');
    if (!modal) return;
    if (open) {
      settingsLastFocus = D.activeElement;
      if (!settingsHistory && !fromHistory) {
        try { history.pushState({ fmSettings: true }, '', location.href); settingsHistory = true; } catch (e) {}
      }
    }
    modal.classList.toggle('open', !!open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    q('b-settings').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      syncSettings();
      q('settings-panel').focus();
    } else if (settingsLastFocus && typeof settingsLastFocus.focus === 'function') {
      settingsLastFocus.focus();
      settingsLastFocus = null;
      if (settingsHistory && !fromHistory) {
        settingsHistory = false;
        try { history.back(); } catch (e) {}
      }
    }
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
      h += '<button class="optcard" data-v="' + id + '"><b>' + esc(deckName(id)) + '</b>' + deckPreview(d) + '</button>';
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
  function openSetup() {
    pendingMode = 'solo';
    q('setup-title').textContent = T('setup.title');
    markRow(q('opt-size'), opt.size);
    markRow(q('opt-deck'), opt.deck);
    go('s-setup');
  }

  function startLocal() {
    GameAnalytics.start({ mode: 'solo', difficulty: String(opt.size), players: 1 });
    var meId = 'me';
    var players = [{ id: 'me', name: T('common.you'), nameKey: 'common.you', avatar: AVATARS[0], type: 'me' }];
    lastCfg = { mode: 'solo', size: opt.size, deck: opt.deck, players: players, meId: meId };
    go('s-game');
    if (w.Sound.isMusicOn()) w.Sound.startBgm('game');
    w.Game.start({
      mode: 'solo', size: opt.size, deck: opt.deck,
      players: players, meId: meId,
      cur: 0, onEnd: showResult
    });
  }

  /* ---------- 結算 ---------- */
  function renderResult() {
    var res = lastRes;
    if (!res) return;
    var crown = '🎉', title = T('res.allDone');
    var rows = '';
    if (res.mode === 'solo') {
      crown = res.best ? '🏆' : '🎉';
      title = res.best ? T('res.newRecord') : T('res.allDone');
      rows += row(T('res.score'), T('res.points', { n: res.score }), res.best);
      rows += row(T('res.time'), w.Game.fmt(res.ms));
      rows += row(T('res.flips'), T('res.times', { n: res.moves }));
      rows += row(T('res.timeouts'), T('res.times', { n: res.timeouts }));
      rows += row(T('res.timeBonus'), '+' + res.timeBonus);
    } else {
      var meId = res.meId || 'me';
      var me = res.players.filter(function (p) { return p.id === meId; })[0];
      crown = res.draw ? '🤝' : (res.win ? '🏆' : '😿');
      title = res.draw ? T('res.draw') : (res.win ? T('res.win') : T('res.lose'));
      res.players.forEach(function (p) {
        rows += row(p.avatar + ' ' + esc(p.nameKey ? T(p.nameKey) : p.name), T('res.pairs', { n: res.scores[p.id] || 0 }), res.win && p === me);
      });
      rows += row(T('res.time'), w.Game.fmt(res.ms));
    }
    q('res-crown').textContent = crown;
    q('res-title').textContent = title;
    q('res-stats').innerHTML = rows;
  }
  function showResult(res) {
    GameAnalytics.end({ result: res.mode === 'solo' ? 'complete' : (res.draw ? 'draw' : (res.win ? 'win' : 'lose')) });
    lastRes = res;
    renderResult();
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
      h += '<div class="rankgrp"><h4>' + T('rank.group', { diff: diffName(s), s: s }) + '</h4>';
      if (!r) h += '<div class="r"><span>' + T('rank.none') + '</span><b>—</b></div>';
      else {
        h += '<div class="r"><span>' + T('rank.best') + '</span><b>' + T('res.points', { n: r.score || 0 }) + '</b></div>';
        h += '<div class="r"><span>' + T('rank.fastest') + '</span><b>' + (r.ms ? w.Game.fmt(r.ms) : '—') + '</b></div>';
        h += '<div class="r"><span>' + T('rank.fewest') + '</span><b>' + (r.moves ? T('res.times', { n: r.moves }) : '—') + '</b></div>';
        h += '<div class="r"><span>' + T('rank.plays') + '</span><b>' + T('rank.games', { n: r.plays || 0 }) + '</b></div>';
      }
      h += '</div>';
    });
    q('ranklist').innerHTML = h;
  }

  /* ---------- 大廳 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var lobbyOnlineCount = null;
  function paintOnlineCount() {
    var el = q('online-count');
    var valid = Number.isInteger(lobbyOnlineCount);
    el.hidden = !valid;
    el.textContent = valid ? T('lobby.onlineCount', { n: lobbyOnlineCount }) : '';
  }

  function renderRooms(list) {
    paintOnlineCount();
    var host = q('roomlist');
    lastRooms = list;
    if (!list || !list.length) { host.innerHTML = '<div class="empty">' + T('lobby.empty') + '</div>'; return; }
    var h = '';
    list.forEach(function (r) {
      var playing = r.state === 'play';
      h += '<div class="roomrow' + (playing ? ' playing' : '') + '">' +
        '<span class="rname">' + esc(roomLabel(r.name)) + '</span>' +
        '<span class="rtag">' + diffName(r.size) + ' ' + r.size + '×' + r.size + '</span>' +
        '<span class="rtag">' + esc(deckName(r.deck)) + '</span>' +
        '<span class="rtag">' + r.count + '/2</span>' +
        (playing || r.count >= 2
          ? '<button class="btn3d small" data-color="gray" disabled>' + T(playing ? 'lobby.playing' : 'lobby.full') + '</button>'
          : '<button class="btn3d small joinbtn" data-color="mint" data-id="' + r.id + '">' + T('lobby.join') + '</button>') +
        '</div>';
    });
    host.innerHTML = h;
    qa('.btn3d', host).forEach(w.UI.decorate);
    host.onclick = function (e) {
      var b = e.target.closest('.joinbtn');
      if (!b) return;
      w.Sound.play('click');
      var nick = q('nickname').value || T('lobby.defaultNick', { n: Math.floor(Math.random() * 90 + 10) });
      w.Net.setName(nick);
      w.Net.join(b.getAttribute('data-id'));
    };
  }

  /* ---------- 房間 ---------- */
  function renderRoom() {
    if (!room) return;
    q('room-title').textContent = roomLabel(room.name);
    q('invite-url').value = inviteUrl(room.id);
    var isHost = room.hostId === w.Net.id();
    q('host-opts').style.display = isHost ? '' : 'none';
    markRow(q('ropt-size'), room.size);
    markRow(q('ropt-deck'), room.deck);
    markRow(q('ropt-first'), room.first || 'host');
    for (var i = 0; i < 2; i++) {
      var p = room.players[i], seat = q('seat' + i);
      if (p) {
        seat.querySelector('.ava').textContent = AVATARS[i];
        seat.querySelector('b').textContent = p.name + (p.id === room.hostId ? T('room.host') : '');
        seat.querySelector('.rdy').textContent = T(p.ready ? 'room.ready' : 'room.notReady');
        seat.classList.toggle('ready', !!p.ready);
      } else {
        seat.querySelector('.ava').textContent = '⏳';
        seat.querySelector('b').textContent = T('room.waitSeat');
        seat.querySelector('.rdy').textContent = '—';
        seat.classList.remove('ready');
      }
    }
    var mine = room.players.filter(function (p) { return p.id === w.Net.id(); })[0];
    var btn = q('b-ready');
    if (isHost) {
      var opponentReady = room.players[1] && room.players[1].ready;
      var canStart = room.players.length >= 2 && opponentReady;
      w.UI.setLabel(btn, T(room.players.length < 2 ? 'room.waitPlayer' : canStart ? 'room.start' : 'room.waitReady'));
      w.UI.setColor(btn, canStart ? 'pink' : 'cream');
      btn.disabled = !canStart;
    } else {
      w.UI.setLabel(btn, T(mine && mine.ready ? 'room.cancelReady' : 'room.imReady'));
      w.UI.setColor(btn, mine && mine.ready ? 'cream' : 'pink');
      btn.disabled = room.players.length < 2;
    }
    if (room.players.length < 2) setSys({ k: 'room.waitOther' });
  }

  function syncLobbyLink() {
    var a = q('lobby-link');
    if (a) a.href = w.I18N.withLang('https://pjh-eric.github.io/game-lobby/');
  }

  /* ---------- 初始化 ---------- */
  function init() {
    w.UI.bgDeco(q('bgdeco'));
    q('logo').innerHTML = w.UI.logo();
    syncLobbyLink();
    applyMotion();
    w.UI.decorateAll();
    buildDeckRow(q('opt-deck'), function (v) { opt.deck = v; saveOpt(); markRow(q('opt-deck'), v); });
    buildDeckRow(q('ropt-deck'), function (v) { if (room && room.hostId === w.Net.id()) w.Net.setopt(room.size, v, room.first); });
    markRow(q('opt-size'), opt.size);
    markRow(q('opt-deck'), opt.deck);

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
    q('ropt-size').onclick = function (e) {
      var b = e.target.closest('.optcard'); if (!b || !room || room.hostId !== w.Net.id()) return;
      w.Sound.play('click'); w.Net.setopt(+b.getAttribute('data-v'), room.deck, room.first);
    };
    q('ropt-first').onclick = function (e) {
      var b = e.target.closest('.optcard'); if (!b || !room || room.hostId !== w.Net.id()) return;
      w.Sound.play('click'); w.Net.setopt(room.size, room.deck, b.getAttribute('data-v'));
    };

    q('b-solo').onclick = function () { w.Sound.play('click'); openSetup(); };
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
    q('b-gamechat').onclick = function () {
      if (cur !== 's-game' || !q('s-game').classList.contains('online-mode')) return;
      w.Sound.play('click');
      var open = q('s-game').classList.toggle('chat-open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
      q('game-chatbox').setAttribute('aria-hidden', open ? 'false' : 'true');
    };
    q('b-settings').onclick = function () {
      w.Sound.play('click');
      setSettingsOpen(!q('settings-modal').classList.contains('open'));
    };
    q('settings-close').onclick = function () { w.Sound.play('click'); setSettingsOpen(false); };
    q('settings-done').onclick = function () { w.Sound.play('click'); setSettingsOpen(false); };
    qa('[data-settings-close]').forEach(function (b) {
      b.addEventListener('click', function () { setSettingsOpen(false); });
    });
    D.addEventListener('keydown', function (e) {
      var modal = q('settings-modal');
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { setSettingsOpen(false); return; }
      if (e.key !== 'Tab') return;
      var focusable = Array.prototype.slice.call(modal.querySelectorAll('button,input,select,textarea,[href],[tabindex]:not([tabindex="-1"])')).filter(function (node) {
        return !node.disabled && node.offsetParent !== null;
      });
      if (!focusable.length) { e.preventDefault(); return; }
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    w.addEventListener('popstate', function () {
      if (settingsHistory) { settingsHistory = false; setSettingsOpen(false, true); }
    });
    q('settings-music').onchange = function () {
      if (this.checked !== w.Sound.isMusicOn()) {
        w.Sound.toggleMusic();
        if (this.checked) w.Sound.startBgm(cur === 's-game' ? 'game' : 'menu');
        else w.Sound.stopBgm();
      }
      syncSettings();
    };
    q('settings-sfx').onchange = function () {
      if (this.checked !== w.Sound.isSfxOn()) w.Sound.toggleSfx();
      syncSettings();
    };
    q('settings-music-volume').oninput = function () {
      var value = Math.max(0, Math.min(100, +this.value || 0));
      w.Sound.setMusicVolume(value / 100);
      q('settings-music-volume-value').textContent = value + '%';
    };
    q('settings-sfx-volume').oninput = function () {
      var value = Math.max(0, Math.min(100, +this.value || 0));
      w.Sound.setSfxVolume(value / 100);
      q('settings-sfx-volume-value').textContent = value + '%';
    };
    q('settings-haptic').onchange = function () { w.Sound.setHaptic(this.checked); syncSettings(); };
    q('settings-motion').onchange = function () {
      motionOn = this.checked;
      saveMotion();
      applyMotion();
      syncSettings();
    };
    q('settings-reset').onclick = function () {
      w.Sound.play('click');
      if (!w.Sound.isMusicOn()) w.Sound.toggleMusic();
      if (!w.Sound.isSfxOn()) w.Sound.toggleSfx();
      w.Sound.setMusicVolume(1);
      w.Sound.setSfxVolume(1);
      w.Sound.setHaptic(true);
      motionOn = true;
      saveMotion();
      applyMotion();
      syncSettings();
    };
    syncSettings();

    q('b-online').onclick = openOnline;
    q('b-invite-join').onclick = joinInviteRoom;
    q('b-refresh').onclick = function () { w.Sound.play('click'); w.Net.rooms(); };
    q('nickname').onchange = function () { w.Net.setName(q('nickname').value); };
    q('b-copyinvite').onclick = function () {
      var input = q('invite-url');
      if (!input.value) return;
      input.focus();
      input.select();
      var done = function () { showRoomNotice({ k: 'room.copied' }); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done, function () { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    };
    q('b-shareinvite').onclick = function () {
      var link = q('invite-url').value;
      if (!link) return;
      if (navigator.share) {
        navigator.share({ title: T('room.shareTitle'), text: T('room.shareText'), url: link }).catch(function () {});
      } else {
        q('b-copyinvite').click();
      }
    };
    q('room-chatform').addEventListener('submit', function (e) { e.preventDefault(); submitChat('room-chatinput'); });
    q('game-chatform').addEventListener('submit', function (e) { e.preventDefault(); submitChat('game-chatinput'); });
    q('b-create').onclick = function () {
      w.Sound.play('click');
      if (!w.Net.isOpen()) { w.Game.toast(T('lobby.notConnected')); return; }
      var nick = q('nickname').value || T('lobby.defaultNick', { n: Math.floor(Math.random() * 90 + 10) });
      w.Net.setName(nick);
      w.Net.create(nick + ' 的房間', opt.size, opt.deck, 'host');
    };
    q('b-leaveroom').onclick = function () { w.Sound.play('click'); w.Net.leave(); room = null; go('s-lobby'); };
    q('b-ready').onclick = function () {
      if (room && room.hostId === w.Net.id()) {
        w.Sound.play('start');
        w.Net.start();
        return;
      }
      w.Sound.play('ready');
      var mine = room && room.players.filter(function (p) { return p.id === w.Net.id(); })[0];
      w.Net.ready(!(mine && mine.ready));
    };

    /* ----- 伺服器事件 ----- */
    w.Net.on('status', function (s) {
      var d = q('conn-dot');
      connState = s;
      if (s !== 'ok') lobbyOnlineCount = null;
      paintOnlineCount();
      d.className = 'conn' + (s === 'ok' ? ' ok' : s === 'bad' ? ' bad' : '');
      renderConn();
    });
    w.Net.on('rooms', function (m) {
      lobbyOnlineCount = Number.isInteger(m.online) && m.online >= 0 ? m.online : null;
      if (cur === 's-lobby') renderRooms(m.rooms);
    });
    w.Net.on('joined', function () {
      inviteRoomId = '';
      q('invite-join').hidden = true;
      clearChatLogs();
      setSys(null);
      go('s-room');
    });
    w.Net.on('room', function (m) {
      room = m.room;
      if (cur === 's-room') renderRoom();
      else if (cur === 's-lobby' && room.players.some(function (p) { return p.id === w.Net.id(); })) { go('s-room'); renderRoom(); }
    });
    w.Net.on('left', function () { room = null; go('s-lobby'); w.Net.rooms(); });
    w.Net.on('sys', function (m) { setSys(srvState(m)); });
    w.Net.on('err', function (m) {
      var inviteError = !!inviteRoomId;
      if (inviteError) {
        inviteRoomId = '';
        q('invite-join').hidden = true;
        setNote({ k: 'lobby.inviteFailed' });
      }
      showRoomNotice(srvState(m));
      if (!inviteError) setNote(srvState(m));
    });
    w.Net.on('chat', appendChat);

    w.Net.on('start', function (m) {
      GameAnalytics.start({ mode: 'online', difficulty: String(m.size), players: m.players.length });
      var players = m.players.map(function (p, i) {
        return { id: p.id, name: p.name, avatar: AVATARS[i], type: p.id === w.Net.id() ? 'me' : 'remote' };
      });
      lastCfg = { mode: 'online' };
      if (w.NetworkLatency) w.NetworkLatency.setActive(true);
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
    w.Net.on('flip', function (m) { w.Game.net.flip(m.i, m.sym, m.by); });
    w.Net.on('result', function (m) { w.Game.net.result(m.a, m.b, m.match, m.scores, m.by); });
    w.Net.on('timeout', function (m) { w.Game.net.timeout(m.close); });
    w.Net.on('hintuse', function (m) { w.Game.net.hintUsed(m.by, m.left); });
    w.Net.on('end', function (m) { if (w.NetworkLatency) w.NetworkLatency.setActive(false); w.Game.net.end(m.scores, m.winner); });
    w.Net.on('oppLeft', function (m) {
      if (w.NetworkLatency) w.NetworkLatency.setActive(false);
      w.Game.stop();
      w.Game.toast(T('game.oppLeftToast'), 1800);
      setTimeout(function () {
        if (cur !== 's-game') return;
        go('s-room');
        renderRoom();
        setSys({ k: 'room.oppLeftEnded', p: { name: m.name || T('common.opponent') } });
      }, 1800);
    });

    /* ----- 語言切換：重繪動態文字（不重置遊戲狀態） ----- */
    w.I18N.mountToggle({ after: q('b-settings') });
    w.I18N.onChange(function () {
      q('logo').innerHTML = w.UI.logo();
      syncLobbyLink();
      buildDeckRow(q('opt-deck'), function (v) { opt.deck = v; saveOpt(); markRow(q('opt-deck'), v); });
      buildDeckRow(q('ropt-deck'), function (v) { if (room && room.hostId === w.Net.id()) w.Net.setopt(room.size, v, room.first); });
      markRow(q('opt-deck'), opt.deck);
      if (room) markRow(q('ropt-deck'), room.deck);
      syncSettings();
      renderConn();
      renderNote();
      renderSys();
      if (cur === 's-rank') renderRank();
      if (lastRes) renderResult();
      if (lastRooms && cur === 's-lobby') renderRooms(lastRooms);
      if (room && cur === 's-room') renderRoom();
      if (w.Game.relocalize) w.Game.relocalize();
      setTimeout(function () { qa('.btn3d').forEach(w.UI.paint); }, 30);
    });

    if (inviteRoomId) openOnline();
    else go('s-home');
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
