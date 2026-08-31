const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const read = (file) => fs.readFileSync(file, 'utf8');

const html = read(path.join(publicDir, 'index.html'));
const scriptSources = Array.from(html.matchAll(/<script src="([^"]+)"/g), (match) => match[1]);
scriptSources.forEach((source) => {
  assert.ok(fs.existsSync(path.join(publicDir, source)), `找不到 index.html 引用的程式：${source}`);
});

const sandbox = {
  console,
  document: {},
  localStorage: {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame() {},
  cancelAnimationFrame() {}
};
sandbox.window = sandbox;
sandbox.addEventListener = function () {};
vm.createContext(sandbox);

const deckFiles = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'flags', 'numbers'];
deckFiles.forEach((deck) => {
  vm.runInContext(read(path.join(publicDir, 'js', 'decks', `${deck}.js`)), sandbox, { filename: `${deck}.js` });
  assert.strictEqual(sandbox.DECKS[deck].icons.length, 32, `${deck} 牌組必須有 32 種牌面`);
  assert.ok(sandbox.DECKS[deck].icons.every((icon) => icon.label && icon.label.trim()), `${deck} 每張牌都必須有中文名稱`);
});
assert.strictEqual(new Set(sandbox.DECKS.flags.icons.map((icon) => icon.svg)).size, 32, '各國國旗牌組必須有 32 種不同旗幟');
assert.strictEqual(new Set(sandbox.DECKS.flags.icons.map((icon) => icon.label)).size, 32, '各國國旗牌組的國家名稱不可重複');

const realisticSource = read(path.join(publicDir, 'js', 'decks', 'realistic.js'));
vm.runInContext(realisticSource, sandbox, { filename: 'realistic.js' });
['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food'].forEach((deck) => {
  assert.ok(sandbox.DECKS[deck].icons.some((icon) => icon.svg.includes('assets/noto/emoji_u')), `${deck} 必須使用本地百科式 SVG 圖示`);
  const byVisual = new Map();
  sandbox.DECKS[deck].icons.forEach((icon) => {
    const list = byVisual.get(icon.svg) || [];
    list.push(icon.id);
    byVisual.set(icon.svg, list);
  });
  const duplicateVisuals = Array.from(byVisual.values()).filter((ids) => ids.length > 1);
  assert.strictEqual(duplicateVisuals.length, 0, `${deck} 牌組不可有不同牌面共用同一個圖示：${JSON.stringify(duplicateVisuals)}`);
});
assert.ok(realisticSource.includes('assets/noto/emoji_u'), '百科式圖示必須由本地資源載入');
assert.ok(!realisticSource.includes('raw.githubusercontent.com'), '遊戲執行時不可依賴外部圖示網址');
assert.ok(fs.existsSync(path.join(publicDir, 'assets', 'noto', 'LICENSE')), 'Noto Emoji 資源必須附帶授權檔');
assert.ok(fs.readdirSync(path.join(publicDir, 'assets', 'noto')).filter((file) => file.endsWith('.svg')).length >= 170, '本地百科式圖示資源不完整');
Object.values(sandbox.REALISTIC_CODEPOINTS).flat().filter((code) => code !== '-').forEach((code) => {
  assert.ok(fs.existsSync(path.join(publicDir, 'assets', 'noto', `emoji_u${code}.svg`)), `找不到百科式圖示資源：${code}`);
});

const realisticAsset = (deckId, iconId) => {
  const index = sandbox.DECKS[deckId].icons.findIndex((icon) => icon.id === iconId);
  assert.notStrictEqual(index, -1, `找不到 ${deckId} 牌面：${iconId}`);
  return sandbox.REALISTIC_CODEPOINTS[deckId][index];
};
[
  ['vehicles', 'motorbike', '1f3cd'],
  ['vehicles', 'scooter', '1f6f5'],
  ['vehicles', 'skateboard', '1f6f9'],
  ['vehicles', 'train', '1f686'],
  ['vehicles', 'steamtrain', '1f682'],
  ['vehicles', 'tram', '1f68a'],
  ['vehicles', 'subway', '1f687'],
  ['vehicles', 'hsr', '1f684'],
  ['vehicles', 'airplane', '2708'],
  ['vehicles', 'helicopter', '1f681'],
  ['vehicles', 'rocket', '1f680'],
  ['vehicles', 'ufo', '1f6f8'],
  ['vehicles', 'balloon', '1f388'],
  ['vehicles', 'sailboat', '26f5'],
  ['vehicles', 'ship', '1f6a2'],
  ['vehicles', 'submarine', '-'],
  ['stationery', 'ruler', '1f4d0'],
  ['stationery', 'triangle', '1f4cf'],
  ['stationery', 'compass', '1f9ed'],
  ['stationery', 'scissors', '2702'],
  ['stationery', 'clip', '1f4ce'],
  ['stationery', 'pushpin', '1f4cc'],
  ['stationery', 'notebook', '1f4d3'],
  ['stationery', 'book', '1f4d6'],
  ['stationery', 'folder', '1f4c1'],
  ['stationery', 'stickynote', '1f4dd'],
  ['stationery', 'envelope', '2709'],
  ['stationery', 'backpack', '1f392'],
  ['stationery', 'palette', '1f3a8'],
  ['stationery', 'globe', '1f30e']
].forEach(([deckId, iconId, expected]) => {
  assert.strictEqual(realisticAsset(deckId, iconId), expected, `${deckId}/${iconId} 的百科圖示對應錯誤`);
});

vm.runInContext(read(path.join(publicDir, 'js', 'game.js')), sandbox, { filename: 'game.js' });
[
  [4, 8],
  [6, 18],
  [8, 32]
].forEach(([size, pairs]) => {
  const layout = sandbox.Game.makeLayout(size, 'numbers');
  const symbols = Array.from(new Set(layout)).sort((a, b) => a - b);
  assert.deepStrictEqual(symbols, Array.from({ length: pairs }, (_, index) => index));
  symbols.forEach((symbol) => {
    assert.strictEqual(layout.filter((value) => value === symbol).length, 2, `數字 ${symbol + 1} 必須正好出現兩次`);
  });
});

assert.ok(!html.includes('id="b-ai"'), '首頁不應再顯示電腦對戰');
assert.ok(!html.includes('id="opt-ai"'), '設定畫面不應再顯示電腦強度');

const appSource = read(path.join(publicDir, 'js', 'app.js'));
const joinHandler = appSource.slice(appSource.indexOf('host.onclick'), appSource.indexOf('function renderRoom()'));
const serverSource = read(path.join(root, 'server.js'));
assert.ok(joinHandler.includes('w.Net.setName(nick);'), '加入房間前必須先同步暱稱');
assert.ok(appSource.includes("'flags'"), '前端牌組選單必須包含各國國旗');
assert.ok(serverSource.includes("'flags'"), '伺服器必須允許各國國旗牌組');
assert.ok(html.includes('id="invite-url"') && html.includes('id="b-copyinvite"'), '房間必須提供邀請連結與複製按鈕');
assert.ok(html.includes('id="b-shareinvite"'), '房間必須提供系統分享按鈕');
assert.ok(html.includes('id="summary-progress"') && html.includes('id="summary-feed"'), '對戰畫面必須提供即時摘要');
assert.ok(html.includes('id="room-chatform"') && html.includes('id="game-chatform"'), '房間與對戰畫面都必須提供聊天室輸入');
assert.ok(html.includes('id="ropt-first"') && html.includes('data-v="host"') && html.includes('data-v="guest"'), '房間設定必須提供先手玩家選項');
assert.ok(appSource.includes('readInviteRoom') && appSource.includes('w.Net.join(inviteRoomId)'), '邀請連結開啟頁面後必須自動嘗試加入房間');
assert.ok(appSource.includes('appendChat') && appSource.includes('navigator.share'), '用戶端必須同步顯示聊天室並支援分享連結');
assert.ok(appSource.includes("markRow(q('ropt-first')") && appSource.includes("w.Net.setopt(room.size, room.deck, b.getAttribute('data-v'))"), '房主先手選項必須同步到伺服器');
assert.ok(appSource.includes('對手離開了遊戲，對戰即將結束') && appSource.includes('renderRoom();'), '對手離開時必須提醒並自動結束對戰');
const onlineSource = read(path.join(publicDir, 'js', 'online.js'));
assert.ok(onlineSource.includes('chat: function'), 'WebSocket 用戶端必須提供聊天室訊息方法');
assert.ok(onlineSource.includes('setopt: function (size, deck, first)'), 'WebSocket 用戶端必須傳送先手設定');

const gameSource = read(path.join(publicDir, 'js', 'game.js'));
const styleSource = read(path.join(publicDir, 'css', 'style.css'));
assert.ok(gameSource.includes('renderOnlineSummary') && gameSource.includes('summaryEvent'), '線上對戰必須即時更新摘要與行動紀錄');
assert.ok(gameSource.includes("classList.toggle('online-mode'"), '線上對戰必須顯示摘要與聊天室側欄');
assert.ok(gameSource.includes('cardFront(ic)') && gameSource.includes('class="card-label"'), '翻開牌面時必須顯示中文名稱');
assert.ok(gameSource.includes('data-size'), '棋盤必須標示尺寸以調整小牌面的文字');
assert.ok(styleSource.includes('.card-label{') && styleSource.includes('.board[data-size="8"] .card-label{'), '牌面中文名稱必須有響應式樣式');
const onlineFlip = gameSource.slice(gameSource.indexOf('flip: function (i, sym'), gameSource.indexOf('result: function (a, b'));
assert.ok(onlineFlip.includes('cardFront(ic)') && onlineFlip.includes('updateStat();'), '線上翻牌時必須同步更新圖案與中文名稱');

const keptOpenMatches = gameSource.match(/classList\.add\('open', 'matched'\)/g) || [];
assert.strictEqual(keptOpenMatches.length, 4, '單機與線上成功配對後兩張牌都必須保持翻開');
assert.ok(gameSource.includes('class="matchmark"'), '每張牌必須包含右上角成功標記');
const matchedOwnerMarks = gameSource.match(/markMatched\([ab], byId\)/g) || [];
assert.strictEqual(matchedOwnerMarks.length, 4, '單機與線上配對成功時都必須標記兩張牌的玩家歸屬');
assert.ok(styleSource.includes('.card.matched .fc.back{visibility:hidden}'), '已配對牌必須隱藏牌背');
assert.ok(styleSource.includes('.card.matched .fc.front{z-index:2;transform:none}'), '已配對牌必須固定顯示正面');
assert.ok(styleSource.includes('.online-tools{display:none;position:absolute;inset:0;'), '線上資訊區必須改為浮動版面以放大棋盤');
assert.ok(styleSource.includes('.summary-card{position:absolute;top:8px;right:10px;'), '即時戰況必須固定在右上角');
assert.ok(styleSource.includes('.game-chat{position:absolute;left:10px;bottom:8px;'), '對戰聊天室必須固定在左下角');

assert.ok(gameSource.includes('}, match ? 620 : 480);'), '單機配對失敗後必須在 480 毫秒內恢復操作');
assert.ok(serverSource.includes('}, isMatch ? 650 : 500);'), '線上配對失敗後必須在 500 毫秒內切換回合');
assert.ok(serverSource.includes('fromId: cl.id') && serverSource.includes('Date.now()'), '伺服器聊天室訊息必須帶有發送者與時間');
assert.ok(serverSource.includes('function pruneEmptyRooms') && serverSource.includes('r.players.length > 0'), '空房間不得出現在房間列表');
assert.ok(serverSource.includes("r.cur = r.first === 'guest'"), '伺服器必須依房主設定決定先手');

console.log('PASS：頁面資源、八套牌組、數字範圍與單機入口均正確');
