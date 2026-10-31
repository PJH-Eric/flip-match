/* ===== game.js — 遊戲核心：牌面、記憶時間、回合限時、提示、計分 ===== */
(function (w) {
  'use strict';

  var RULES = { 4: { memory: 10, turn: 10, hints: 1 }, 6: { memory: 20, turn: 20, hints: 2 }, 8: { memory: 30, turn: 30, hints: 3 } };
  var DIFF_FALLBACK = { 4: '簡單', 6: '普通', 8: '困難' };
  function T(k, p, f) { return w.I18N ? w.I18N.t(k, p, f) : (f !== undefined ? f : k); }
  function diffName(size) { return T('diff.' + size, null, DIFF_FALLBACK[size]); }
  var DIFF_NAME = { get 4() { return diffName(4); }, get 6() { return diffName(6); }, get 8() { return diffName(8); } };
  function deckLabel(id) { var d = w.DECKS[id]; return T('deck.' + id, null, d ? d.name : id); }
  function pname(p) { return p.nameKey ? T(p.nameKey) : p.name; }
  var GAPS = { 4: 12, 6: 9, 8: 6 };

  var S = null;
  var el = {};
  var timerRAF = null, tickShown = -1, memInt = null, memoryLeft = 0;

  function q(id) { return document.getElementById(id); }
  function cache() {
    el.board = q('board'); el.wrap = document.querySelector('.boardwrap');
    el.scorebar = q('scorebar'); el.fill = q('timer-fill'); el.tnum = q('timer-num');
    el.tbar = q('timerbar'); el.tlabel = q('timer-label'); el.overlay = q('overlay');
    el.ovtxt = q('ov-txt'); el.ovnum = q('ov-num'); el.toast = q('toast');
    el.hintBtn = q('b-hint'); el.hintLeft = q('hint-left'); el.stat = q('statline');
    el.mode = q('g-mode'); el.diff = q('g-diff'); el.deckName = q('g-deck');
    el.onlineTools = q('online-tools'); el.summaryProgress = q('summary-progress');
    el.summaryPlayers = q('summary-players'); el.summaryFeed = q('summary-feed');
  }

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(n, k) { var a = []; for (var i = 0; i < n; i++) a.push(i); shuffle(a); return a.slice(0, k); }

  var SEQ_DECKS = ['numbers'];
  function makeLayout(size, deckId) {
    var pairs = size * size / 2;
    var deck = w.DECKS && w.DECKS[deckId];
    var iconCount = deck && deck.icons ? deck.icons.length : 32;
    var picks;
    if (SEQ_DECKS.indexOf(deckId) >= 0) { picks = []; for (var k = 0; k < Math.min(pairs, iconCount); k++) picks.push(k); }
    else picks = sample(iconCount, Math.min(pairs, iconCount));
    var cells = [];
    for (var i = 0; i < pairs; i++) { var s = picks[i % picks.length]; cells.push(s, s); }
    return shuffle(cells);
  }

  var toastTimer = null;
  function toast(msg, ms) {
    el.toast.textContent = msg;
    el.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('on'); }, ms || 1400);
  }

  /* ---------------- 版面 ---------------- */
  function resize() {
    if (!S) return;
    var w2 = el.wrap.clientWidth, h2 = el.wrap.clientHeight;
    var bs = Math.floor(Math.max(120, Math.min(w2, h2)));
    el.board.style.setProperty('--bs', bs + 'px');
    el.board.style.setProperty('--cols', S.size);
    el.board.style.setProperty('--gap', GAPS[S.size] + 'px');
  }
  w.addEventListener('resize', resize);
  w.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  function cardFront(ic) {
    return '<svg viewBox="0 0 100 100">' + ic.svg + '</svg>' +
      '<span class="card-label" data-label="' + esc(ic.label || '') + '">' + esc(T('card.' + (ic.label || ''), null, ic.label || '')) + '</span>';
  }

  function buildBoard() {
    var deck = w.DECKS[S.deck];
    var html = '';
    for (var i = 0; i < S.layout.length; i++) {
      var ic = deck.icons[S.layout[i] % deck.icons.length];
      html += '<div class="card" data-i="' + i + '"><div class="in">' +
        '<div class="fc back">' + w.UI.cardBack() + '</div>' +
        '<div class="fc front" style="--cardbg:' + (deck.bg || '#fff') + '">' + cardFront(ic) + '</div>' +
        '</div><span class="matchmark"><span class="matchcheck">✓</span><span class="matchowner"></span></span></div>';
    }
    el.board.innerHTML = html;
    el.board.setAttribute('data-size', S.size);
    S.cards = el.board.querySelectorAll('.card');
    resize();
  }

  function renderScores() {
    var h = '';
    for (var i = 0; i < S.players.length; i++) {
      var p = S.players[i];
      var isTurn = (S.phase === 'play' && S.players[S.cur] === p);
      h += '<div class="pcard' + (isTurn ? ' turn' : '') + '"><span class="pav">' + p.avatar + '</span>' +
        '<span class="pn">' + esc(pname(p)) + '</span><span class="ps">' + (S.scores[p.id] || 0) + '</span></div>';
    }
    el.scorebar.innerHTML = h;
    renderOnlineSummary();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function markMatched(index, byId) {
    var card = S.cards[index], player = null, playerIndex = -1;
    for (var i = 0; i < S.players.length; i++) {
      if (S.players[i].id === byId) { player = S.players[i]; playerIndex = i; break; }
    }
    var mark = card.querySelector('.matchmark');
    mark.className = 'matchmark';
    mark.querySelector('.matchowner').textContent = '';
    mark.setAttribute('data-by', byId || '');
    mark.title = T('game.matched');
    if (S.players.length > 1 && player) {
      mark.classList.add('show-owner', 'owner-' + (playerIndex % 2));
      mark.querySelector('.matchowner').textContent = player.avatar;
      mark.title = T('game.matchedBy', { name: pname(player) });
    }
  }

  function playerName(id) {
    if (!S || !id) return T('common.player');
    for (var i = 0; i < S.players.length; i++) if (S.players[i].id === id) return pname(S.players[i]);
    return T('common.player');
  }

  function renderOnlineSummary() {
    if (!S || S.mode !== 'online' || !el.summaryPlayers || !el.summaryProgress) return;
    el.summaryProgress.textContent = T('game.progress', { a: S.matchedCount / 2, b: S.layout.length / 2 });
    var h = '';
    for (var i = 0; i < S.players.length; i++) {
      var p = S.players[i];
      var turn = S.phase === 'play' && S.players[S.cur] === p;
      h += '<div class="summary-player' + (turn ? ' turn' : '') + (p.id === S.meId ? ' me' : '') + '">';
      h += '<span class="sp-avatar">' + p.avatar + '</span><span class="sp-name">' + esc(pname(p)) + '</span>';
      h += '<span class="sp-turn">' + (turn ? T('game.turnTag') : '') + '</span><span class="sp-score">' + (S.scores[p.id] || 0) + '</span></div>';
    }
    el.summaryPlayers.innerHTML = h;
  }

  function renderFeed() {
    if (!S || !el.summaryFeed) return;
    el.summaryFeed.innerHTML = S.summaryFeed.map(function (item) { return '<p>' + esc(T(item.k, item.p)) + '</p>'; }).join('');
  }
  function summaryEvent(key, params) {
    if (!S || S.mode !== 'online' || !el.summaryFeed) return;
    S.summaryFeed.unshift({ k: key, p: params });
    S.summaryFeed = S.summaryFeed.slice(0, 6);
    renderFeed();
  }

  function updateStat() {
    if (S.mode === 'solo') {
      el.stat.textContent = T('game.stat', { a: S.matchedCount / 2, b: S.layout.length / 2, moves: S.moves, time: fmt(S.elapsed()) });
    } else {
      var me = S.me();
      el.stat.textContent = T(me && S.players[S.cur] === me ? 'game.yourTurn' : 'game.oppTurn');
    }
    var hl = S.hints[S.meId] || 0;
    el.hintLeft.textContent = hl;
    var canHint = hl > 0 && S.phase === 'play' && !S.busy && S.open.length === 1 &&
      S.players[S.cur] && S.players[S.cur].id === S.meId;
    el.hintBtn.disabled = !canHint;
    el.hintBtn.title = T(hl <= 0 ? 'game.hintNone' : (S.open.length === 1 ? 'game.hintReady' : 'game.hintNeedFirst'));
  }
  function fmt(ms) { var s = Math.floor(ms / 1000); return (Math.floor(s / 60)) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------------- 記憶時間 ---------------- */
  function updateCountdown(labelKey, seconds, ratio, total) {
    var label = T(labelKey), value = T('game.secs', { n: seconds });
    var maxValue = String(total), secondsValue = String(seconds);
    if (el.tlabel.textContent !== label) el.tlabel.textContent = label;
    if (el.tnum.textContent !== value) el.tnum.textContent = value;
    el.fill.style.transform = 'scaleX(' + ratio + ')';
    if (el.tbar.getAttribute('aria-label') !== label) el.tbar.setAttribute('aria-label', label);
    if (el.tbar.getAttribute('aria-valuemax') !== maxValue) el.tbar.setAttribute('aria-valuemax', maxValue);
    if (el.tbar.getAttribute('aria-valuenow') !== secondsValue) el.tbar.setAttribute('aria-valuenow', secondsValue);
    if (el.tbar.getAttribute('aria-valuetext') !== value) el.tbar.setAttribute('aria-valuetext', value);
    el.tbar.classList.toggle('warn', ratio <= 0.5 && ratio > 0.25);
    el.tbar.classList.toggle('danger', ratio <= 0.25);
  }

  function beginMemory() {
    S.phase = 'memory';
    summaryEvent('game.ev.memory');
    for (var i = 0; i < S.cards.length; i++) S.cards[i].classList.add('open');
    if (S.ai) S.ai.observeAll(S.layout);
    memoryLeft = S.rule.memory;
    el.overlay.classList.remove('on');
    S.ovKey = null;
    el.tbar.classList.add('active', 'memory');
    updateCountdown('game.memorize', memoryLeft, 1, S.rule.memory);
    w.Sound.play('tick');
    memInt = setInterval(function () {
      memoryLeft--;
      if (memoryLeft > 0) {
        updateCountdown('game.memorize', memoryLeft, memoryLeft / S.rule.memory, S.rule.memory);
        w.Sound.play(memoryLeft <= 3 ? 'tickHot' : 'tick');
      } else {
        clearInterval(memInt); memInt = null;
        updateCountdown('game.memorize', 0, 0, S.rule.memory);
        el.tbar.classList.remove('active', 'memory', 'warn', 'danger');
        w.Sound.play('start');
        for (var j = 0; j < S.cards.length; j++) S.cards[j].classList.remove('open');
        el.overlay.classList.add('on');
        S.ovKey = 'game.go';
        el.ovtxt.textContent = T('game.go');
        el.ovnum.classList.add('small');
        el.ovnum.textContent = '🎴';
        setTimeout(function () {
          el.overlay.classList.remove('on');
          if (S.mode !== 'online') beginTurn();
        }, 700);
      }
    }, 1000);
  }

  /* ---------------- 回合與計時 ---------------- */
  function stopTimer() { if (timerRAF) { cancelAnimationFrame(timerRAF); timerRAF = null; } }

  function runTimer() {
    stopTimer();
    tickShown = -1;
    var total = S.rule.turn * 1000;
    el.tbar.classList.add('active');
    el.tbar.classList.remove('memory');
    function frame() {
      if (!S || S.phase !== 'play') return;
      var used = S.busy ? (S.pausedAt - S.turnStart) : (Date.now() - S.turnStart);
      var left = Math.max(0, total - used);
      var ratio = left / total;
      var secs = Math.ceil(left / 1000);
      updateCountdown('game.turnCountdown', secs, ratio, S.rule.turn);
      if (!S.busy && secs !== tickShown && secs <= 5 && secs > 0) {
        tickShown = secs;
        w.Sound.play(secs <= 3 ? 'tickHot' : 'tick');
      }
      if (S.mode === 'solo' && S.phase === 'play') updateStat();
      if (left <= 0 && !S.busy) { onTimeout(); return; }
      timerRAF = requestAnimationFrame(frame);
    }
    timerRAF = requestAnimationFrame(frame);
  }

  function beginTurn() {
    if (S.phase === 'over') return;
    S.phase = 'play';
    S.busy = false;
    S.open = [];
    S.turnStart = Date.now();
    if (!S.playStart) S.playStart = Date.now();
    renderScores(); updateStat();
    if (S.mode !== 'solo') {
      var cp = S.players[S.cur];
      if (cp.id === S.meId) { w.Sound.play('turn'); toast(T('game.yourTurn')); }
      else toast(T('game.turnOf', { name: pname(cp) }));
      if (cp.id === S.meId) summaryEvent('game.ev.yourTurn'); else summaryEvent('game.ev.turnOf', { name: pname(cp) });
    }
    runTimer();
    if (S.mode === 'ai' && S.players[S.cur].type === 'ai') setTimeout(aiMove, S.ai.thinkTime());
  }

  function onTimeout() {
    if (S.phase !== 'play') return;
    stopTimer();
    S.busy = true; S.pausedAt = Date.now();
    w.Sound.play('timeup');
    closeOpen();
    if (S.mode === 'solo') {
      S.timeouts++;
      toast(T('game.timeoutSolo'), 1600);
      setTimeout(function () { if (S.phase !== 'over') beginTurn(); }, 900);
    } else if (S.mode === 'ai') {
      toast(T('game.timeoutNext'), 1600);
      nextPlayer();
      setTimeout(function () { if (S.phase !== 'over') beginTurn(); }, 900);
    }
  }

  function closeOpen() {
    for (var i = 0; i < S.open.length; i++) S.cards[S.open[i]].classList.remove('open');
    S.open = [];
  }
  function nextPlayer() { S.cur = (S.cur + 1) % S.players.length; renderScores(); }

  /* ---------------- 翻牌 ---------------- */
  function cardClick(e) {
    var c = e.target.closest ? e.target.closest('.card') : null;
    if (!c || !S || S.phase !== 'play' || S.busy) return;
    var i = +c.getAttribute('data-i');
    if (S.matched[i] || S.open.indexOf(i) >= 0) return;
    if (S.players[S.cur].id !== S.meId) return;
    if (S.mode === 'online') { w.Net.flip(i); return; }
    doFlip(i);
    if (S.open.length === 2) resolveLocal();
  }

  function doFlip(i) {
    S.open.push(i);
    S.cards[i].classList.add('open');
    w.Sound.play('flip');
    w.Sound.vibrate(8);
    if (S.ai) S.ai.observe(i, S.layout[i]);
    if (S.open.length === 2 && S.mode === 'solo') S.moves++;
    if (S.open.length === 2 && S.mode === 'ai') S.moves++;
  }

  function resolveLocal() {
    S.busy = true; S.pausedAt = Date.now();
    var a = S.open[0], b = S.open[1];
    var match = S.layout[a] === S.layout[b];
    setTimeout(function () {
      if (!S || S.phase === 'over') return;
      applyResult(a, b, match, S.players[S.cur].id);
      if (allMatched()) { endGame(); return; }
      if (!match && S.players.length > 1) nextPlayer();
      beginTurn();
    }, match ? 620 : 480);
  }

  function applyResult(a, b, match, byId) {
    if (match) {
      S.matched[a] = true; S.matched[b] = true; S.matchedCount += 2;
      S.cards[a].classList.add('open', 'matched'); S.cards[b].classList.add('open', 'matched');
      markMatched(a, byId); markMatched(b, byId);
      S.scores[byId] = (S.scores[byId] || 0) + 1;
      if (S.ai) S.ai.remove(a, b);
      w.Sound.play('match');
      w.Sound.vibrate([12, 35, 12]);
    } else {
      S.cards[a].classList.add('wrong'); S.cards[b].classList.add('wrong');
      w.Sound.play('wrong');
      w.Sound.vibrate(35);
      (function (x, y) {
        setTimeout(function () {
          x.classList.remove('open', 'wrong'); y.classList.remove('open', 'wrong');
        }, 220);
      })(S.cards[a], S.cards[b]);
      if (S.ai) S.ai.decay();
    }
    S.open = [];
    renderScores(); updateStat();
  }

  function allMatched() { return S.matchedCount >= S.layout.length; }

  /* ---------------- 電腦出手 ---------------- */
  function aiMove() {
    if (!S || S.phase !== 'play' || S.players[S.cur].type !== 'ai') return;
    var avail = [];
    for (var i = 0; i < S.layout.length; i++) if (!S.matched[i]) avail.push(i);
    if (!avail.length) return;
    var a = S.ai.first(avail);
    doFlip(a);
    setTimeout(function () {
      if (!S || S.phase !== 'play' || S.players[S.cur].type !== 'ai') return;
      var av2 = [];
      for (var j = 0; j < S.layout.length; j++) if (!S.matched[j] && j !== a) av2.push(j);
      var b = S.ai.second(av2.concat([a]), a, S.layout[a]);
      if (b === a || b === undefined) b = av2[Math.floor(Math.random() * av2.length)];
      doFlip(b);
      resolveLocal();
    }, 620 + Math.random() * 400);
  }

  /* ---------------- 提示 ---------------- */
  /* 提示規則：玩家必須先自己翻開第一張牌，按下提示後直接翻出配對的另一張 */
  function useHint() {
    if (!S || S.phase !== 'play' || S.busy) return;
    if ((S.hints[S.meId] || 0) <= 0) return;
    if (!S.players[S.cur] || S.players[S.cur].id !== S.meId) return;
    if (S.open.length !== 1) { toast(T('game.needFirst'), 1600); return; }
    if (S.mode === 'online') { w.Net.hint(); return; }

    var first = S.open[0], sym = S.layout[first], target = -1;
    for (var i = 0; i < S.layout.length; i++) {
      if (i === first || S.matched[i]) continue;
      if (S.layout[i] === sym) { target = i; break; }
    }
    if (target < 0) return;
    S.hints[S.meId]--;
    w.Sound.play('hint');
    S.cards[target].classList.add('hint');
    updateStat();
    setTimeout(function () {
      if (!S || S.phase !== 'play') return;
      S.cards[target].classList.remove('hint');
      doFlip(target);
      resolveLocal();
    }, 620);
  }

  function hintUsed(byId, left) {
    if (!S) return;
    S.hints[byId] = left;
    w.Sound.play('hint');
    updateStat();
  }

  /* ---------------- 結束 ---------------- */
  function endGame(winnerIdFromNet) {
    S.phase = 'over';
    stopTimer();
    el.tbar.classList.remove('active', 'memory', 'warn', 'danger');
    if (memInt) { clearInterval(memInt); memInt = null; }
    var total = Date.now() - (S.playStart || Date.now());
    var res = { mode: S.mode, size: S.size, deck: S.deck, ms: total, moves: S.moves, timeouts: S.timeouts, scores: S.scores, players: S.players };

    if (S.mode === 'solo') {
      var pairs = S.layout.length / 2;
      var extra = Math.max(0, S.moves - pairs);
      var par = pairs * S.rule.turn * 0.55 * 1000;
      var timeBonus = Math.max(0, Math.round((par - total) / 1000) * 3);
      var score = pairs * 100 - extra * 8 - S.timeouts * 25 + (S.hints[S.meId] || 0) * 40 + timeBonus;
      res.score = Math.max(0, score);
      res.timeBonus = timeBonus;
      res.best = w.Records.save(S.size, res);
      w.Sound.play('win');
    } else {
      var meScore = S.scores[S.meId] || 0;
      var opp = S.players.filter(function (p) { return p.id !== S.meId; })[0];
      var oppScore = opp ? (S.scores[opp.id] || 0) : 0;
      res.win = meScore > oppScore; res.draw = meScore === oppScore;
      if (winnerIdFromNet !== undefined) { res.win = winnerIdFromNet === S.meId; res.draw = winnerIdFromNet === null; }
      w.Sound.play(res.draw ? 'draw' : (res.win ? 'win' : 'lose'));
    }
    if (S.onEnd) S.onEnd(res);
  }

  /* ---------------- 對外 ---------------- */
  function start(cfg) {
    cache();
    S = {
      mode: cfg.mode, size: cfg.size, deck: cfg.deck,
      rule: RULES[cfg.size],
      layout: cfg.layout || makeLayout(cfg.size, cfg.deck),
      matched: [], matchedCount: 0, open: [], cur: cfg.cur || 0,
      players: cfg.players, meId: cfg.meId, scores: {}, hints: {},
      moves: 0, timeouts: 0, phase: 'init', busy: false,
      turnStart: 0, pausedAt: 0, playStart: 0,
      ai: null,
      summaryFeed: [],
      onEnd: cfg.onEnd,
      elapsed: function () { return this.playStart ? Date.now() - this.playStart : 0; },
      me: function () { var m = null; this.players.forEach(function (p) { if (p.id === S.meId) m = p; }); return m; }
    };
    for (var i = 0; i < S.layout.length; i++) S.matched.push(false);
    S.players.forEach(function (p) { S.scores[p.id] = 0; S.hints[p.id] = S.rule.hints; });

    S.modeLabel = cfg.modeLabel || null;
    renderHeader();
    el.tbar.classList.remove('active', 'memory', 'warn', 'danger');
    el.fill.style.transform = 'scaleX(1)';
    el.tnum.textContent = T('game.secs', { n: S.rule.turn });
    memoryLeft = 0;
    q('s-game').classList.toggle('online-mode', S.mode === 'online');

    buildBoard();
    renderScores();
    summaryEvent('game.ev.start');
    updateStat();
    el.board.onclick = cardClick;
    el.hintBtn.onclick = function () { w.Sound.play('click'); useHint(); };
    setTimeout(function () { resize(); beginMemory(); }, 120);
  }

  function renderHeader() {
    if (!S) return;
    el.mode.textContent = S.modeLabel || T(S.mode === 'solo' ? 'game.modeSolo' : S.mode === 'ai' ? 'game.modeAi' : 'game.modeOnline');
    el.diff.textContent = T('rank.group', { diff: diffName(S.size), s: S.size });
    el.deckName.textContent = deckLabel(S.deck);
  }

  /* 語言切換：只重繪文字，不動遊戲狀態 */
  function relocalize() {
    if (!S) return;
    renderHeader();
    renderScores();
    renderFeed();
    updateStat();
    if (S.ovKey) el.ovtxt.textContent = T(S.ovKey);
    if (S.phase === 'memory') updateCountdown('game.memorize', memoryLeft, memoryLeft / S.rule.memory, S.rule.memory);
    else if (S.phase === 'play') {
      var total = S.rule.turn * 1000;
      var used = S.busy ? (S.pausedAt - S.turnStart) : (Date.now() - S.turnStart);
      var left = Math.max(0, total - used);
      updateCountdown('game.turnCountdown', Math.ceil(left / 1000), left / total, S.rule.turn);
    }
    var i, labels = el.board.querySelectorAll('.card-label');
    for (i = 0; i < labels.length; i++) {
      var raw = labels[i].getAttribute('data-label') || '';
      labels[i].textContent = T('card.' + raw, null, raw);
    }
    var marks = el.board.querySelectorAll('.card.matched .matchmark');
    for (i = 0; i < marks.length; i++) {
      var by = marks[i].getAttribute('data-by'), pl = null;
      for (var k = 0; k < S.players.length; k++) if (S.players[k].id === by) pl = S.players[k];
      marks[i].title = S.players.length > 1 && pl ? T('game.matchedBy', { name: pname(pl) }) : T('game.matched');
    }
  }

  function stop() {
    stopTimer();
    if (memInt) { clearInterval(memInt); memInt = null; }
    if (el.tbar) el.tbar.classList.remove('active', 'memory', 'warn', 'danger');
    if (el.overlay) el.overlay.classList.remove('on');
    if (q('s-game')) q('s-game').classList.remove('online-mode', 'chat-open');
    var chatToggle = q('b-gamechat'), chatbox = q('game-chatbox');
    if (chatToggle) chatToggle.setAttribute('aria-expanded', 'false');
    if (chatbox) chatbox.setAttribute('aria-hidden', 'true');
    if (S) S.phase = 'over';
    S = null;
  }

  /* ---- 線上模式：由伺服器事件驅動 ---- */
  var net = {
    flip: function (i, sym, byId) {
      if (!S) return;
      S.layout[i] = sym;
      var deck = w.DECKS[S.deck];
      var ic = deck.icons[sym % deck.icons.length];
      var front = S.cards[i].querySelector('.front svg');
      var frontBox = S.cards[i].querySelector('.front');
      if (frontBox) frontBox.innerHTML = cardFront(ic);
      else if (front) front.innerHTML = ic.svg;
      S.open.push(i);
      S.cards[i].classList.add('open');
      w.Sound.play('flip');
      w.Sound.vibrate(8);
      if (S.open.length === 2) { S.busy = true; S.pausedAt = Date.now(); }
      summaryEvent('game.ev.flip', { name: playerName(byId || (S.players[S.cur] && S.players[S.cur].id)), n: i + 1 });
      updateStat();
    },
    result: function (a, b, match, scores, byId) {
      if (!S) return;
      S.scores = scores;
      if (match) {
        S.matched[a] = true; S.matched[b] = true; S.matchedCount += 2;
        S.cards[a].classList.add('open', 'matched'); S.cards[b].classList.add('open', 'matched');
        markMatched(a, byId); markMatched(b, byId);
        w.Sound.play('match');
        w.Sound.vibrate([12, 35, 12]);
        summaryEvent('game.ev.match', { name: playerName(byId) });
      } else {
        S.cards[a].classList.add('wrong'); S.cards[b].classList.add('wrong');
        w.Sound.play('wrong');
        w.Sound.vibrate(35);
        (function (x, y) { setTimeout(function () { x.classList.remove('open', 'wrong'); y.classList.remove('open', 'wrong'); }, 220); })(S.cards[a], S.cards[b]);
        summaryEvent('game.ev.miss', { name: playerName(byId) });
      }
      S.open = [];
      renderScores(); updateStat();
    },
    turn: function (curId) {
      if (!S) return;
      for (var i = 0; i < S.players.length; i++) if (S.players[i].id === curId) S.cur = i;
      beginTurn();
    },
    timeout: function (closeArr) {
      if (!S) return;
      w.Sound.play('timeup');
      w.Sound.vibrate([30, 40, 30]);
      (closeArr || []).forEach(function (i) { S.cards[i].classList.remove('open'); });
      S.open = [];
      toast(T('game.timeoutNext'), 1500);
      summaryEvent('game.ev.timeout');
    },
    hintUsed: function (byId, left) { hintUsed(byId, left); summaryEvent('game.ev.hint', { name: playerName(byId), left: left }); },
    end: function (scores, winnerId) {
      if (!S) return;
      S.scores = scores;
      renderScores();
      summaryEvent('game.ev.end');
      endGame(winnerId === undefined ? undefined : winnerId);
    },
    startMemory: function () { if (S) beginMemory(); }
  };

  /* ---------------- 紀錄 ---------------- */
  var Records = {
    key: 'fm_records',
    all: function () { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return {}; } },
    save: function (size, res) {
      var db = this.all();
      var k = 's' + size;
      var cur = db[k] || { score: 0, ms: 0, moves: 0, plays: 0 };
      var isBest = false;
      cur.plays = (cur.plays || 0) + 1;
      if (res.score > (cur.score || 0)) { cur.score = res.score; isBest = true; }
      if (!cur.ms || res.ms < cur.ms) { cur.ms = res.ms; isBest = true; }
      if (!cur.moves || res.moves < cur.moves) { cur.moves = res.moves; isBest = true; }
      cur.last = { score: res.score, ms: res.ms, moves: res.moves, at: Date.now() };
      db[k] = cur;
      try { localStorage.setItem(this.key, JSON.stringify(db)); } catch (e) {}
      return isBest;
    },
    clear: function () { try { localStorage.removeItem(this.key); } catch (e) {} }
  };

  w.Records = Records;
  w.Game = { relocalize: relocalize, start: start, stop: stop, net: net, RULES: RULES, DIFF_NAME: DIFF_NAME, makeLayout: makeLayout, toast: toast, resize: resize, fmt: fmt };
})(window);
