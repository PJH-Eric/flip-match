/*
 * 翻牌配對碰 - 遊戲伺服器
 * 零外部套件：只用 Node.js 內建模組實作靜態檔案伺服器 + 原生 WebSocket (RFC 6455)
 * 啟動：node server.js   （或 npm start）
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');

/* ---------------- 靜態檔案 ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('找不到檔案'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

/* ---------------- 原生 WebSocket 實作 ---------------- */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class WSConn {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.fragOp = 0;
    this.alive = true;
    this.handlers = {};
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this._close());
    socket.on('error', () => this._close());
    socket.setTimeout(0);
    socket.setNoDelay(true);
  }
  on(evt, fn) { this.handlers[evt] = fn; return this; }
  _emit(evt, arg) { if (this.handlers[evt]) { try { this.handlers[evt](arg); } catch (e) { console.error(e); } } }
  _close() { if (!this.alive) return; this.alive = false; this._emit('close'); }

  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 4 * 1024 * 1024) { return this.close(1009); }
      let mask = null;
      if (masked) { if (this.buf.length < off + 4) return; mask = this.buf.slice(off, off + 4); off += 4; }
      if (this.buf.length < off + len) return;
      let payload = this.buf.slice(off, off + len);
      if (masked) { const p = Buffer.allocUnsafe(len); for (let i = 0; i < len; i++) p[i] = payload[i] ^ mask[i & 3]; payload = p; }
      this.buf = this.buf.slice(off + len);

      if (opcode === 0x8) { this.close(1000); return; }
      if (opcode === 0x9) { this._send(0xA, payload); continue; }
      if (opcode === 0xA) { continue; }
      if (opcode === 0x0) {
        this.frags.push(payload);
        if (fin) { const full = Buffer.concat(this.frags); this.frags = []; if (this.fragOp === 0x1) this._emit('message', full.toString('utf8')); }
        continue;
      }
      if (opcode === 0x1 || opcode === 0x2) {
        if (!fin) { this.fragOp = opcode; this.frags = [payload]; continue; }
        if (opcode === 0x1) this._emit('message', payload.toString('utf8'));
        continue;
      }
    }
  }

  _send(opcode, payload) {
    if (!this.alive) return;
    const len = payload.length;
    let head;
    if (len < 126) { head = Buffer.allocUnsafe(2); head[1] = len; }
    else if (len < 65536) { head = Buffer.allocUnsafe(4); head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.allocUnsafe(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    head[0] = 0x80 | opcode;
    try { this.socket.write(Buffer.concat([head, payload])); } catch (e) { this._close(); }
  }
  sendText(str) { this._send(0x1, Buffer.from(str, 'utf8')); }
  sendJSON(obj) { this.sendText(JSON.stringify(obj)); }
  ping() { this._send(0x9, Buffer.alloc(0)); }
  close(code) {
    if (!this.alive) return;
    const b = Buffer.allocUnsafe(2); b.writeUInt16BE(code || 1000, 0);
    this._send(0x8, b);
    try { this.socket.end(); } catch (e) {}
    this._close();
  }
}

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  const conn = new WSConn(socket);
  if (head && head.length) conn._onData(head);
  handleClient(conn);
});

/* ---------------- 遊戲大廳邏輯 ---------------- */
const RULES = {
  4: { memory: 10, turn: 10, hints: 1 },
  6: { memory: 20, turn: 20, hints: 2 },
  8: { memory: 30, turn: 30, hints: 3 }
};
const DECK_IDS = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'numbers'];
const SEQ_DECKS = ['numbers'];
const ICONS_PER_DECK = 32;

const clients = new Map();   // id -> client
const rooms = new Map();     // id -> room
let seq = 1;

function uid(p) { return p + (seq++) + Math.random().toString(36).slice(2, 6); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function sample(n, k) { const a = []; for (let i = 0; i < n; i++) a.push(i); shuffle(a); return a.slice(0, k); }

function roomBrief(r) {
  return {
    id: r.id, name: r.name, size: r.size, deck: r.deck,
    host: r.players[0] ? r.players[0].name : '',
    count: r.players.length, state: r.state
  };
}
function roomFull(r) {
  return {
    id: r.id, name: r.name, size: r.size, deck: r.deck, state: r.state,
    hostId: r.players[0] ? r.players[0].id : null,
    players: r.players.map(p => ({ id: p.id, name: p.name, ready: !!p.ready }))
  };
}
function broadcastRooms() {
  const list = [];
  for (const r of rooms.values()) if (r.state !== 'dead') list.push(roomBrief(r));
  list.sort((a, b) => (a.state === 'wait' ? -1 : 1) - (b.state === 'wait' ? -1 : 1));
  const msg = JSON.stringify({ t: 'rooms', rooms: list });
  for (const c of clients.values()) if (!c.room) c.conn.sendText(msg);
}
function sendRoom(r) {
  const msg = JSON.stringify({ t: 'room', room: roomFull(r) });
  r.players.forEach(p => p.conn.sendText(msg));
}
function bcast(r, obj) {
  const msg = JSON.stringify(obj);
  r.players.forEach(p => p.conn.sendText(msg));
}

function clearTimers(r) {
  if (r.turnTimer) { clearTimeout(r.turnTimer); r.turnTimer = null; }
  if (r.memTimer) { clearTimeout(r.memTimer); r.memTimer = null; }
  if (r.flipTimer) { clearTimeout(r.flipTimer); r.flipTimer = null; }
}

function startGame(r) {
  const rule = RULES[r.size];
  const pairs = (r.size * r.size) / 2;
  var picks;
  if (SEQ_DECKS.indexOf(r.deck) >= 0) { picks = []; for (var pi = 0; pi < Math.min(pairs, ICONS_PER_DECK); pi++) picks.push(pi); }
  else picks = sample(ICONS_PER_DECK, Math.min(pairs, ICONS_PER_DECK));
  const cells = [];
  for (let i = 0; i < pairs; i++) cells.push(picks[i % picks.length], picks[i % picks.length]);
  shuffle(cells);
  r.state = 'play';
  r.layout = cells;
  r.matched = new Array(cells.length).fill(false);
  r.open = [];
  r.scores = { };
  r.hintsLeft = {};
  r.players.forEach(p => { r.scores[p.id] = 0; r.hintsLeft[p.id] = rule.hints; });
  r.cur = Math.floor(Math.random() * r.players.length);
  r.busy = true;
  bcast(r, {
    t: 'start', layout: cells, size: r.size, deck: r.deck,
    memorySec: rule.memory, turnSec: rule.turn, hints: rule.hints,
    players: r.players.map(p => ({ id: p.id, name: p.name })),
    cur: r.players[r.cur].id
  });
  clearTimers(r);
  r.memTimer = setTimeout(() => { r.busy = false; beginTurn(r); }, rule.memory * 1000 + 900);
  broadcastRooms();
}

function beginTurn(r) {
  if (r.state !== 'play') return;
  const rule = RULES[r.size];
  r.open = [];
  bcast(r, { t: 'turn', cur: r.players[r.cur].id, turnSec: rule.turn });
  if (r.turnTimer) clearTimeout(r.turnTimer);
  r.turnTimer = setTimeout(() => onTimeout(r), rule.turn * 1000 + 400);
}

function onTimeout(r) {
  if (r.state !== 'play') return;
  const closed = r.open.slice();
  r.open = [];
  r.cur = (r.cur + 1) % r.players.length;
  bcast(r, { t: 'timeout', close: closed, cur: r.players[r.cur].id });
  beginTurn(r);
}

function checkEnd(r) {
  if (r.matched.every(Boolean)) {
    r.state = 'over';
    clearTimers(r);
    let best = -1, winner = null, tie = false;
    r.players.forEach(p => {
      const s = r.scores[p.id];
      if (s > best) { best = s; winner = p.id; tie = false; }
      else if (s === best) tie = true;
    });
    bcast(r, { t: 'end', scores: r.scores, winner: tie ? null : winner });
    r.players.forEach(p => { p.ready = false; });
    broadcastRooms();
    return true;
  }
  return false;
}

function onFlip(cl, i) {
  const r = cl.room;
  if (!r || r.state !== 'play' || r.busy) return;
  if (r.players[r.cur].id !== cl.id) return;
  if (typeof i !== 'number' || i < 0 || i >= r.layout.length) return;
  if (r.matched[i] || r.open.indexOf(i) >= 0) return;
  r.open.push(i);
  bcast(r, { t: 'flip', i: i, sym: r.layout[i], by: cl.id });
  if (r.open.length < 2) return;

  r.busy = true;
  if (r.turnTimer) { clearTimeout(r.turnTimer); r.turnTimer = null; }
  const a = r.open[0], b = r.open[1];
  const isMatch = r.layout[a] === r.layout[b];
  r.flipTimer = setTimeout(() => {
    if (r.state !== 'play') return;
    if (isMatch) { r.matched[a] = true; r.matched[b] = true; r.scores[cl.id] += 1; }
    else { r.cur = (r.cur + 1) % r.players.length; }
    r.open = [];
    r.busy = false;
    bcast(r, { t: 'result', a: a, b: b, match: isMatch, scores: r.scores, by: cl.id });
    if (!checkEnd(r)) beginTurn(r);
  }, isMatch ? 650 : 500);
}

function onHint(cl) {
  const r = cl.room;
  if (!r || r.state !== 'play' || r.busy) return;
  if (r.players[r.cur].id !== cl.id) return;
  if ((r.hintsLeft[cl.id] || 0) <= 0) return;
  // 新規則：必須先自己翻開第一張牌，提示會直接翻出配對的另一張
  if (r.open.length !== 1) return;
  const first = r.open[0];
  const sym = r.layout[first];
  let target = -1;
  for (let i = 0; i < r.layout.length; i++) {
    if (i === first || r.matched[i]) continue;
    if (r.layout[i] === sym) { target = i; break; }
  }
  if (target < 0) return;
  r.hintsLeft[cl.id]--;
  bcast(r, { t: 'hintuse', by: cl.id, left: r.hintsLeft[cl.id] });
  onFlip(cl, target);
}

function leaveRoom(cl, silent) {
  const r = cl.room;
  if (!r) return;
  cl.room = null;
  cl.ready = false;
  const idx = r.players.indexOf(cl);
  if (idx >= 0) r.players.splice(idx, 1);
  if (r.players.length === 0) {
    clearTimers(r);
    rooms.delete(r.id);
  } else {
    if (r.state === 'play') {
      r.state = 'wait';
      clearTimers(r);
      bcast(r, { t: 'oppLeft', name: cl.name });
      r.players.forEach(p => { p.ready = false; });
    } else {
      bcast(r, { t: 'sys', m: cl.name + ' 離開了房間' });
    }
    sendRoom(r);
  }
  if (!silent) cl.conn.sendJSON({ t: 'left' });
  broadcastRooms();
}

function handleClient(conn) {
  const cl = { id: uid('p'), name: '玩家', conn: conn, room: null, ready: false };
  clients.set(cl.id, cl);
  conn.sendJSON({ t: 'welcome', id: cl.id });

  conn.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    switch (m.t) {
      case 'hello':
        cl.name = String(m.name || '玩家').slice(0, 12) || '玩家';
        conn.sendJSON({ t: 'welcome', id: cl.id, name: cl.name });
        if (cl.room) sendRoom(cl.room);
        broadcastRooms();
        break;
      case 'rooms': {
        const list = [];
        for (const r of rooms.values()) list.push(roomBrief(r));
        conn.sendJSON({ t: 'rooms', rooms: list });
        break;
      }
      case 'create': {
        if (cl.room) leaveRoom(cl, true);
        const size = [4, 6, 8].indexOf(+m.size) >= 0 ? +m.size : 4;
        const deck = DECK_IDS.indexOf(m.deck) >= 0 ? m.deck : 'animals';
        const r = {
          id: uid('r'), name: String(m.roomName || (cl.name + ' 的房間')).slice(0, 16),
          size: size, deck: deck, players: [cl], state: 'wait',
          layout: [], matched: [], open: [], scores: {}, hintsLeft: {}, cur: 0, busy: false,
          turnTimer: null, memTimer: null, flipTimer: null
        };
        rooms.set(r.id, r);
        cl.room = r; cl.ready = false;
        conn.sendJSON({ t: 'joined', id: r.id });
        sendRoom(r);
        broadcastRooms();
        break;
      }
      case 'join': {
        const r = rooms.get(m.id);
        if (!r) return conn.sendJSON({ t: 'err', m: '房間不存在' });
        if (r.players.length >= 2) return conn.sendJSON({ t: 'err', m: '房間已滿' });
        if (r.state === 'play') return conn.sendJSON({ t: 'err', m: '對戰進行中' });
        if (cl.room) leaveRoom(cl, true);
        r.players.push(cl); cl.room = r; cl.ready = false;
        conn.sendJSON({ t: 'joined', id: r.id });
        bcast(r, { t: 'sys', m: cl.name + ' 加入了房間' });
        sendRoom(r);
        broadcastRooms();
        break;
      }
      case 'setopt': {
        const r = cl.room;
        if (!r || r.players[0] !== cl || r.state === 'play') return;
        if ([4, 6, 8].indexOf(+m.size) >= 0) r.size = +m.size;
        if (DECK_IDS.indexOf(m.deck) >= 0) r.deck = m.deck;
        r.players.forEach(p => { p.ready = false; });
        sendRoom(r); broadcastRooms();
        break;
      }
      case 'ready': {
        const r = cl.room;
        if (!r || r.state === 'play') return;
        cl.ready = !!m.v;
        sendRoom(r);
        if (r.players.length === 2 && r.players.every(p => p.ready)) startGame(r);
        break;
      }
      case 'flip': onFlip(cl, +m.i); break;
      case 'hint': onHint(cl); break;
      case 'chat': {
        const r = cl.room;
        if (!r) return;
        const message = String(m.m || '').trim().slice(0, 60);
        if (!message) return;
        bcast(r, { t: 'chat', fromId: cl.id, from: cl.name, m: message, ts: Date.now() });
        break;
      }
      case 'leave': leaveRoom(cl); break;
      default: break;
    }
  });

  conn.on('close', () => {
    leaveRoom(cl, true);
    clients.delete(cl.id);
    broadcastRooms();
  });
}

setInterval(() => { for (const c of clients.values()) c.conn.ping(); }, 25000);

/* ---------------- 啟動 ---------------- */
server.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const k of Object.keys(nets)) for (const n of nets[k]) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  console.log('');
  console.log('  🎴 翻牌配對碰 伺服器已啟動！');
  console.log('  ------------------------------------------');
  console.log('  本機開啟：  http://localhost:' + PORT);
  ips.forEach(ip => console.log('  平板連線：  http://' + ip + ':' + PORT));
  console.log('  ------------------------------------------');
  console.log('  （關閉此視窗即停止伺服器）');
  console.log('');
});
