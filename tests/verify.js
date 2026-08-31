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

const deckFiles = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'numbers'];
deckFiles.forEach((deck) => {
  vm.runInContext(read(path.join(publicDir, 'js', 'decks', `${deck}.js`)), sandbox, { filename: `${deck}.js` });
  assert.strictEqual(sandbox.DECKS[deck].icons.length, 32, `${deck} 牌組必須有 32 種牌面`);
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
assert.ok(joinHandler.includes('w.Net.setName(nick);'), '加入房間前必須先同步暱稱');

const gameSource = read(path.join(publicDir, 'js', 'game.js'));
const styleSource = read(path.join(publicDir, 'css', 'style.css'));
const onlineFlip = gameSource.slice(gameSource.indexOf('flip: function (i, sym)'), gameSource.indexOf('result: function (a, b'));
assert.ok(onlineFlip.includes('updateStat();'), '線上翻第一張牌後必須刷新提示按鈕狀態');

const keptOpenMatches = gameSource.match(/classList\.add\('open', 'matched'\)/g) || [];
assert.strictEqual(keptOpenMatches.length, 4, '單機與線上成功配對後兩張牌都必須保持翻開');
assert.ok(gameSource.includes('class="matchmark"'), '每張牌必須包含右上角成功標記');
const matchedOwnerMarks = gameSource.match(/markMatched\([ab], byId\)/g) || [];
assert.strictEqual(matchedOwnerMarks.length, 4, '單機與線上配對成功時都必須標記兩張牌的玩家歸屬');
assert.ok(styleSource.includes('.card.matched .fc.back{visibility:hidden}'), '已配對牌必須隱藏牌背');
assert.ok(styleSource.includes('.card.matched .fc.front{z-index:2;transform:none}'), '已配對牌必須固定顯示正面');

assert.ok(gameSource.includes('}, match ? 620 : 480);'), '單機配對失敗後必須在 480 毫秒內恢復操作');
const serverSource = read(path.join(root, 'server.js'));
assert.ok(serverSource.includes('}, isMatch ? 650 : 500);'), '線上配對失敗後必須在 500 毫秒內切換回合');

console.log('PASS：頁面資源、七套牌組、數字範圍與單機入口均正確');
