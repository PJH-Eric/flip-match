/* ===== app.js — 畫面切換與整體流程 ===== */
(function (w) {
  'use strict';
  var D = document;
  function q(id) { return D.getElementById(id); }
  function qa(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }

  var DECK_IDS = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'flags', 'numbers', 'phonetics', 'sports'];
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
  var inviteAttempted = false;
  var settingsLastFocus = null;

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
    name.textContent = m.from || '玩家';
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

  function showRoomNotice(message) {
    var target = q('sysline');
    if (target) target.textContent = message;
  }

  function openOnline() {
    w.Sound.play('click');
    var n = w.Net.savedName();
    if (n) q('nickname').value = n;
    q('lobby-note').textContent = inviteRoomId
      ? '正在透過邀請連結加入房間…'
      : '同一個 Wi-Fi 底下，另一台平板打開伺服器顯示的網址就能一起玩。';
    go('s-lobby');
    w.Net.connect();
  }

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
    q('settings-music-status').textContent = musicOn ? '開啟' : '關閉';
    q('settings-sfx-status').textContent = sfxOn ? '開啟' : '關閉';
    q('settings-haptic').checked = w.Sound.isHapticOn();
    q('settings-motion').checked = motionOn;
  }

  function setSettingsOpen(open) {
    var modal = q('settings-modal');
    if (!modal) return;
    if (open) settingsLastFocus = D.activeElement;
    modal.classList.toggle('open', !!open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    q('b-settings').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      syncSettings();
      q('settings-panel').focus();
    } else if (settingsLastFocus && typeof settingsLastFocus.focus === 'function') {
      settingsLastFocus.focus();
      settingsLastFocus = null;
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
  function openSetup() {
    pendingMode = 'solo';
    q('setup-title').textContent = '單機挑戰';
    markRow(q('opt-size'), opt.size);
    markRow(q('opt-deck'), opt.deck);
    go('s-setup');
  }

  function startLocal() {
    var meId = 'me';
    var players = [{ id: 'me', name: '你', avatar: AVATARS[0], type: 'me' }];
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
      var nick = q('nickname').value || ('玩家' + Math.floor(Math.random() * 90 + 10));
      w.Net.setName(nick);
      w.Net.join(b.getAttribute('data-id'));
    };
  }

  /* ---------- 房間 ---------- */
  function renderRoom() {
    if (!room) return;
    q('room-title').textContent = room.name;
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
    if (isHost) {
      var opponentReady = room.players[1] && room.players[1].ready;
      var canStart = room.players.length >= 2 && opponentReady;
      w.UI.setLabel(btn, room.players.length < 2 ? '等待玩家加入…' : canStart ? '開始遊戲 ▶' : '等待對手準備…');
      w.UI.setColor(btn, canStart ? 'pink' : 'cream');
      btn.disabled = !canStart;
    } else {
      w.UI.setLabel(btn, mine && mine.ready ? '取消準備 ✖' : '我準備好了 ✔');
      w.UI.setColor(btn, mine && mine.ready ? 'cream' : 'pink');
      btn.disabled = room.players.length < 2;
    }
    if (room.players.length < 2) q('sysline').textContent = '等待另一位玩家加入…';
  }

  /* ---------- 初始化 ---------- */
  function init() {
    w.UI.bgDeco(q('bgdeco'));
    q('logo').innerHTML = w.UI.logo();
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
      if (e.key === 'Escape' && q('settings-modal').classList.contains('open')) setSettingsOpen(false);
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
    q('b-refresh').onclick = function () { w.Sound.play('click'); w.Net.rooms(); };
    q('nickname').onchange = function () { w.Net.setName(q('nickname').value); };
    q('b-copyinvite').onclick = function () {
      var input = q('invite-url');
      if (!input.value) return;
      input.focus();
      input.select();
      var done = function () { showRoomNotice('邀請連結已複製，可以傳給對手！'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done, function () { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    };
    q('b-shareinvite').onclick = function () {
      var link = q('invite-url').value;
      if (!link) return;
      if (navigator.share) {
        navigator.share({ title: '翻牌配對碰房間邀請', text: '一起來玩翻牌配對碰！', url: link }).catch(function () {});
      } else {
        q('b-copyinvite').click();
      }
    };
    q('room-chatform').addEventListener('submit', function (e) { e.preventDefault(); submitChat('room-chatinput'); });
    q('game-chatform').addEventListener('submit', function (e) { e.preventDefault(); submitChat('game-chatinput'); });
    q('b-create').onclick = function () {
      w.Sound.play('click');
      if (!w.Net.isOpen()) { w.Game.toast('尚未連上伺服器'); return; }
      var nick = q('nickname').value || ('玩家' + Math.floor(Math.random() * 90 + 10));
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
      d.className = 'conn' + (s === 'ok' ? ' ok' : s === 'bad' ? ' bad' : '');
      q('conn-txt').textContent = s === 'ok' ? '已連線' : s === 'bad' ? '連線中斷' : '連線中…';
      if (s === 'ok' && inviteRoomId && !inviteAttempted) {
        inviteAttempted = true;
        setTimeout(function () { w.Net.join(inviteRoomId); }, 120);
      }
    });
    w.Net.on('rooms', function (m) { if (cur === 's-lobby') renderRooms(m.rooms); });
    w.Net.on('joined', function () { inviteAttempted = true; clearChatLogs(); q('sysline').textContent = ''; go('s-room'); });
    w.Net.on('room', function (m) {
      room = m.room;
      if (cur === 's-room') renderRoom();
      else if (cur === 's-lobby' && room.players.some(function (p) { return p.id === w.Net.id(); })) { go('s-room'); renderRoom(); }
    });
    w.Net.on('left', function () { room = null; go('s-lobby'); w.Net.rooms(); });
    w.Net.on('sys', function (m) { q('sysline').textContent = m.m; });
    w.Net.on('err', function (m) {
      var inviteError = !!inviteRoomId;
      if (inviteError) { inviteRoomId = ''; q('lobby-note').textContent = '邀請連結無法加入，請從大廳選擇房間。'; }
      showRoomNotice(m.m);
      if (!inviteError) q('lobby-note').textContent = m.m;
    });
    w.Net.on('chat', appendChat);

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
    w.Net.on('flip', function (m) { w.Game.net.flip(m.i, m.sym, m.by); });
    w.Net.on('result', function (m) { w.Game.net.result(m.a, m.b, m.match, m.scores, m.by); });
    w.Net.on('timeout', function (m) { w.Game.net.timeout(m.close); });
    w.Net.on('hintuse', function (m) { w.Game.net.hintUsed(m.by, m.left); });
    w.Net.on('end', function (m) { w.Game.net.end(m.scores, m.winner); });
    w.Net.on('oppLeft', function (m) {
      w.Game.stop();
      w.Game.toast('對手離開了遊戲，對戰即將結束', 1800);
      setTimeout(function () {
        if (cur !== 's-game') return;
        go('s-room');
        renderRoom();
        q('sysline').textContent = (m.name || '對手') + ' 離開了，對戰已結束。';
      }, 1800);
    });

    if (inviteRoomId) openOnline();
    else go('s-home');
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
