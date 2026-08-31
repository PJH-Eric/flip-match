/* ===== online.js — 線上大廳 / 房間 / 對戰的 WebSocket 用戶端 ===== */
(function (w) {
  'use strict';

  var ws = null, myId = null, myName = '玩家', connected = false;
  var handlers = {}, retry = 0, retryTimer = null, wantOpen = false;

  function on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); }
  function emit(evt, a, b) { (handlers[evt] || []).forEach(function (f) { try { f(a, b); } catch (e) { console.error(e); } }); }

  function url() {
    // config.js 有指定伺服器（例如部署在 Render）就連過去，否則連同一台主機
    var cfg = (w.FLIP_MATCH_SERVER || '').trim();
    if (cfg) {
      var base = cfg.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      return base.replace(/\/+$/, '') + '/';
    }
    var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return proto + location.host + '/';
  }

  function connect() {
    wantOpen = true;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    try { ws = new WebSocket(url()); } catch (e) { emit('status', 'bad'); return; }
    emit('status', 'connecting');
    ws.onopen = function () {
      connected = true; retry = 0;
      emit('status', 'ok');
      send({ t: 'hello', name: myName });
      send({ t: 'rooms' });
    };
    ws.onclose = function () {
      connected = false;
      emit('status', 'bad');
      if (wantOpen) {
        clearTimeout(retryTimer);
        retry++;
        retryTimer = setTimeout(connect, Math.min(8000, 800 * retry));
      }
    };
    ws.onerror = function () { emit('status', 'bad'); };
    ws.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'welcome') { myId = m.id; if (m.name) myName = m.name; }
      emit(m.t, m);
    };
  }
  function disconnect() { wantOpen = false; clearTimeout(retryTimer); if (ws) { try { ws.close(); } catch (e) {} } ws = null; connected = false; }

  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

  function setName(n) {
    myName = String(n || '玩家').slice(0, 12) || '玩家';
    try { localStorage.setItem('fm_nick', myName); } catch (e) {}
    send({ t: 'hello', name: myName });
  }
  function savedName() {
    try { return localStorage.getItem('fm_nick') || ''; } catch (e) { return ''; }
  }

  w.Net = {
    connect: connect, disconnect: disconnect, on: on, send: send,
    setName: setName, savedName: savedName,
    id: function () { return myId; },
    name: function () { return myName; },
    isOpen: function () { return connected; },
    rooms: function () { send({ t: 'rooms' }); },
    create: function (roomName, size, deck, first) { send({ t: 'create', roomName: roomName, size: size, deck: deck, first: first }); },
    join: function (id) { send({ t: 'join', id: id }); },
    leave: function () { send({ t: 'leave' }); },
    setopt: function (size, deck, first) { send({ t: 'setopt', size: size, deck: deck, first: first }); },
    ready: function (v) { send({ t: 'ready', v: v }); },
    flip: function (i) { send({ t: 'flip', i: i }); },
    hint: function () { send({ t: 'hint' }); },
    chat: function (message) { send({ t: 'chat', m: String(message || '').slice(0, 60) }); }
  };
})(window);
