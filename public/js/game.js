/* ===== game.js — 遊戲核心：牌面、記憶時間、回合限時、提示、計分 ===== */
(function (w) {
  'use strict';

  var RULES = { 4: { memory: 10, turn: 10, hints: 1 }, 6: { memory: 20, turn: 20, hints: 2 }, 8: { memory: 30, turn: 30, hints: 3 } };
  var DIFF_NAME = { 4: '簡單', 6: '普通', 8: '困難' };
  var GAPS = { 4: 12, 6: 9, 8: 6 };

  var S = null;
  var el = {};
  var timerRAF = null, tickShown = -1, memInt = null;

  function q(id) { return document.getElementById(id); }
  function cache() {
    el.board = q('board'); el.wrap = document.querySelector('.boardwrap');
    el.scorebar = q('scorebar'); el.fill = q('timer-fill'); el.tnum = q('timer-num');
    el.tbar = document.querySelector('.timerbar'); el.overlay = q('overlay');
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
    var picks;
    if (SEQ_DECKS.indexOf(deckId) >= 0) { picks = []; for (var k = 0; k < Math.min(pairs, 32); k++) picks.push(k); }
    else picks = sample(32, Math.min(pairs, 32));
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
      '<span class="card-label">' + esc(ic.label || '') + '</span>';
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
        '<span class="pn">' + esc(p.name) + '</span><span class="ps">' + (S.scores[p.id] || 0) + '</span></div>';
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
    mark.title = '配對成功';
    if (S.players.length > 1 && player) {
      mark.classList.add('show-owner', 'owner-' + (playerIndex % 2));
      mark.querySelector('.matchowner').textContent = player.avatar;
      mark.title = player.name + ' 配對成功';
    }
  }

  function playerName(id) {
    if (!S || !id) return '玩家';
    for (var i = 0; i < S.players.length; i++) if (S.players[i].id === id) return S.players[i].name;
    return '玩家';
  }

  function renderOnlineSummary() {
    if (!S || S.mode !== 'online' || !el.summaryPlayers || !el.summaryProgress) return;
    el.summaryProgress.textContent = '配對 ' + (S.matchedCount / 2) + '／' + (S.layout.length / 2);
    var h = '';
    for (var i = 0; i < S.players.length; i++) {
      var p = S.players[i];
      var turn = S.phase === 'play' && S.players[S.cur] === p;
      h += '<div class="summary-player' + (turn ? ' turn' : '') + (p.id === S.meId ? ' me' : '') + '">';
      h += '<span class="sp-avatar">' + p.avatar + '</span><span class="sp-name">' + esc(p.name) + '</span>';
      h += '<span class="sp-turn">' + (turn ? '回合中' : '') + '</span><span class="sp-score">' + (S.scores[p.id] || 0) + '</span></div>';
    }
    el.summaryPlayers.innerHTML = h;
  }

  function summaryEvent(msg) {
    if (!S || S.mode !== 'online' || !el.summaryFeed) return;
    S.summaryFeed.unshift(String(msg));
    S.summaryFeed = S.summaryFeed.slice(0, 6);
    el.summaryFeed.innerHTML = S.summaryFeed.map(function (item) { return '<p>' + esc(item) + '</p>'; }).join('');
  }

  function updateStat() {
    if (S.mode === 'solo') {
      el.stat.textContent = '配對 ' + (S.matchedCount / 2) + '／' + (S.layout.length / 2) + '　翻牌 ' + S.moves + ' 次　' + fmt(S.elapsed());
    } else {
      var me = S.me();
      el.stat.textContent = me && S.players[S.cur] === me ? '輪到你了！' : '對手回合…';
    }
    var hl = S.hints[S.meId] || 0;
    el.hintLeft.textContent = hl;
    var canHint = hl > 0 && S.phase === 'play' && !S.busy && S.open.length === 1 &&
      S.players[S.cur] && S.players[S.cur].id === S.meId;
    el.hintBtn.disabled = !canHint;
    el.hintBtn.title = hl <= 0 ? '提示已用完' : (S.open.length === 1 ? '直接翻出配對的另一張' : '先翻開第一張牌才能使用提示');
  }
  function fmt(ms) { var s = Math.floor(ms / 1000); return (Math.floor(s / 60)) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------------- 記憶時間 ---------------- */
  function beginMemory() {
    S.phase = 'memory';
    summaryEvent('記憶時間開始，請記住牌面');
    for (var i = 0; i < S.cards.length; i++) S.cards[i].classList.add('open');
    if (S.ai) S.ai.observeAll(S.layout);
    var left = S.rule.memory;
    el.overlay.classList.add('on');
    el.overlay.classList.add('peek');
    el.ovtxt.textContent = '記住牌面！';
    el.ovnum.classList.remove('small');
    el.ovnum.textContent = left;
    w.Sound.play('tick');
    memInt = setInterval(function () {
      left--;
      if (left > 0) {
        el.ovnum.textContent = left;
        w.Sound.play(left <= 3 ? 'tickHot' : 'tick');
      } else {
        clearInterval(memInt); memInt = null;
        el.ovnum.textContent = '0';
        w.Sound.play('start');
        for (var j = 0; j < S.cards.length; j++) S.cards[j].classList.remove('open');
        el.overlay.classList.remove('peek');
        el.ovtxt.textContent = '開始！';
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
    function frame() {
      if (!S || S.phase !== 'play') return;
      var used = S.busy ? (S.pausedAt - S.turnStart) : (Date.now() - S.turnStart);
      var left = Math.max(0, total - used);
      var ratio = left / total;
      el.fill.style.transform = 'scaleX(' + ratio + ')';
      var secs = Math.ceil(left / 1000);
      el.tnum.textContent = secs + ' 秒';
      el.tbar.classList.toggle('warn', ratio <= 0.5 && ratio > 0.25);
      el.tbar.classList.toggle('danger', ratio <= 0.25);
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
      if (cp.id === S.meId) { w.Sound.play('turn'); toast('輪到你了！'); }
      else toast(cp.name + ' 的回合');
      summaryEvent(cp.id === S.meId ? '輪到你，快翻兩張牌' : '輪到 ' + cp.name + ' 翻牌');
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
      toast('⏰ 時間到！重新開始這一回合', 1600);
      setTimeout(function () { if (S.phase !== 'over') beginTurn(); }, 900);
    } else if (S.mode === 'ai') {
      toast('⏰ 時間到，換人！', 1600);
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
    } else {
      S.cards[a].classList.add('wrong'); S.cards[b].classList.add('wrong');
      w.Sound.play('wrong');
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
    if (S.open.length !== 1) { toast('先翻開第一張牌，再按提示', 1600); return; }
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

    el.mode.textContent = cfg.modeLabel || (cfg.mode === 'solo' ? '單機' : cfg.mode === 'ai' ? '對戰電腦' : '線上對戰');
    el.diff.textContent = DIFF_NAME[S.size] + '（' + S.size + '×' + S.size + '）';
    el.deckName.textContent = w.DECKS[S.deck].name;
    el.tbar.classList.remove('warn', 'danger');
    el.fill.style.transform = 'scaleX(1)';
    el.tnum.textContent = S.rule.turn + ' 秒';
    q('s-game').classList.toggle('online-mode', S.mode === 'online');

    buildBoard();
    renderScores();
    summaryEvent('對戰開始，先記住所有牌面');
    updateStat();
    el.board.onclick = cardClick;
    el.hintBtn.onclick = function () { w.Sound.play('click'); useHint(); };
    setTimeout(function () { resize(); beginMemory(); }, 120);
  }

  function stop() {
    stopTimer();
    if (memInt) { clearInterval(memInt); memInt = null; }
    if (el.overlay) el.overlay.classList.remove('on', 'peek');
    if (q('s-game')) q('s-game').classList.remove('online-mode');
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
      if (S.open.length === 2) { S.busy = true; S.pausedAt = Date.now(); }
      summaryEvent(playerName(byId || (S.players[S.cur] && S.players[S.cur].id)) + ' 翻開第 ' + (i + 1) + ' 張牌');
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
        summaryEvent(playerName(byId) + ' 配對成功！');
      } else {
        S.cards[a].classList.add('wrong'); S.cards[b].classList.add('wrong');
        w.Sound.play('wrong');
        (function (x, y) { setTimeout(function () { x.classList.remove('open', 'wrong'); y.classList.remove('open', 'wrong'); }, 220); })(S.cards[a], S.cards[b]);
        summaryEvent(playerName(byId) + ' 配對失敗，換回合');
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
      (closeArr || []).forEach(function (i) { S.cards[i].classList.remove('open'); });
      S.open = [];
      toast('⏰ 時間到，換人！', 1500);
      summaryEvent('回合時間到，換人');
    },
    hintUsed: function (byId, left) { hintUsed(byId, left); summaryEvent(playerName(byId) + ' 使用提示（剩 ' + left + ' 次）'); },
    end: function (scores, winnerId) {
      if (!S) return;
      S.scores = scores;
      renderScores();
      summaryEvent('對戰結束');
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
  w.Game = { start: start, stop: stop, net: net, RULES: RULES, DIFF_NAME: DIFF_NAME, makeLayout: makeLayout, toast: toast, resize: resize, fmt: fmt };
})(window);
