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

const deckFiles = ['animals', 'vehicles', 'fruits', 'characters', 'stationery', 'food', 'flags', 'numbers', 'phonetics', 'sports'];
const deckExpectedCounts = { phonetics: 37 };
deckFiles.forEach((deck) => {
  vm.runInContext(read(path.join(publicDir, 'js', 'decks', `${deck}.js`)), sandbox, { filename: `${deck}.js` });
  assert.strictEqual(sandbox.DECKS[deck].icons.length, deckExpectedCounts[deck] || 32, `${deck} 牌組牌面數量不正確`);
  assert.ok(sandbox.DECKS[deck].icons.every((icon) => icon.label && icon.label.trim()), `${deck} 每張牌都必須有中文名稱`);
});
assert.strictEqual(new Set(sandbox.DECKS.flags.icons.map((icon) => icon.svg)).size, 32, '各國國旗牌組必須有 32 種不同旗幟');
assert.strictEqual(new Set(sandbox.DECKS.flags.icons.map((icon) => icon.label)).size, 32, '各國國旗牌組的國家名稱不可重複');
assert.strictEqual(new Set(sandbox.DECKS.sports.icons.map((icon) => icon.svg)).size, 32, '運動牌組必須有 32 種不同圖案');
assert.strictEqual(new Set(sandbox.DECKS.sports.icons.map((icon) => icon.label)).size, 32, '運動牌組的運動名稱不可重複');

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
const audioSource = read(path.join(publicDir, 'js', 'audio.js'));
const joinHandler = appSource.slice(appSource.indexOf('host.onclick'), appSource.indexOf('function renderRoom()'));
const serverSource = read(path.join(root, 'server.js'));
assert.ok(joinHandler.includes('w.Net.setName(nick);'), '加入房間前必須先同步暱稱');
assert.ok(appSource.includes("'flags'"), '前端牌組選單必須包含各國國旗');
assert.ok(serverSource.includes("'flags'"), '伺服器必須允許各國國旗牌組');
assert.ok(scriptSources.includes('js/decks/phonetics.js'), '頁面必須載入注音符號牌組');
assert.ok(appSource.includes("'phonetics'"), '前端牌組選單必須包含注音符號');
assert.ok(serverSource.includes("'phonetics'"), '伺服器必須允許注音符號牌組');
assert.ok(scriptSources.includes('js/decks/sports.js'), '頁面必須載入運動牌組');
assert.ok(appSource.includes("'sports'"), '前端牌組選單必須包含運動');
assert.ok(serverSource.includes("'sports'"), '伺服器必須允許運動牌組');
assert.ok(html.includes('id="invite-url"') && html.includes('id="b-copyinvite"'), '房間必須提供邀請連結與複製按鈕');
assert.ok(html.includes('id="b-shareinvite"'), '房間必須提供系統分享按鈕');
assert.ok(html.includes('id="summary-progress"') && html.includes('id="summary-feed"'), '對戰畫面必須提供即時摘要');
assert.ok(html.includes('id="room-chatform"') && html.includes('id="game-chatform"'), '房間與對戰畫面都必須提供聊天室輸入');
assert.ok(html.includes('id="b-gamechat"') && html.includes('aria-controls="game-chatbox"'), '對戰聊天室必須提供可展開的控制按鈕');
assert.ok(html.includes('id="b-settings"') && html.includes('aria-controls="settings-modal"'), '每個畫面必須共用遊戲設定入口');
assert.ok(!html.includes('id="b-music"') && !html.includes('id="b-sfx"') && !html.includes('id="b-music2"') && !html.includes('id="b-sfx2"'), '頁面不應再分散放置音樂與音效按鈕');
assert.ok(html.includes('id="settings-modal"') && html.includes('id="settings-music"') && html.includes('id="settings-sfx"'), '設定彈窗必須提供音樂與音效開關');
assert.ok(html.includes('id="settings-music-volume"') && html.includes('id="settings-sfx-volume"'), '設定彈窗必須提供音樂與音效音量控制');
assert.ok(html.includes('id="ropt-first"') && html.includes('data-v="host"') && html.includes('data-v="guest"'), '房間設定必須提供先手玩家選項');
assert.ok(appSource.includes('readInviteRoom') && appSource.includes('w.Net.join(inviteRoomId)'), '邀請連結開啟頁面後必須自動嘗試加入房間');
assert.ok(appSource.includes('appendChat') && appSource.includes('navigator.share'), '用戶端必須同步顯示聊天室並支援分享連結');
assert.ok(appSource.includes("var targetId = cur === 's-game' ? 'game-chatlog' : 'room-chatlog'") && appSource.includes('var host = q(targetId)'), '房間與對戰聊天室訊息不得互相混入');
assert.ok(appSource.includes("markRow(q('ropt-first')") && appSource.includes("w.Net.setopt(room.size, room.deck, b.getAttribute('data-v'))"), '房主先手選項必須同步到伺服器');
assert.ok(appSource.includes('開始遊戲 ▶') && appSource.includes('w.Net.start()') && appSource.includes('opponentReady') && appSource.includes('等待對手準備…'), '房主必須在對手 ready 後顯示開始遊戲');
assert.ok(appSource.includes('對手離開了遊戲，對戰即將結束') && appSource.includes('renderRoom();'), '對手離開時必須提醒並自動結束對戰');
assert.ok(appSource.includes("classList.toggle('chat-open')") && appSource.includes("setAttribute('aria-expanded'"), '聊天室必須點擊後才展開並同步可及性狀態');
assert.ok(appSource.includes('setSettingsOpen') && appSource.includes('syncSettings') && appSource.includes('settings-music-volume'), '設定彈窗必須同步音訊狀態與音量');
assert.ok(appSource.includes('history.pushState') && appSource.includes("e.key !== 'Tab'") && appSource.includes("setSettingsOpen(false, true)"), '設定彈窗必須支援返回鍵與鍵盤焦點循環');
assert.ok(audioSource.includes('setMusicVolume') && audioSource.includes('setSfxVolume') && audioSource.includes('getMusicVolume') && audioSource.includes('getSfxVolume'), '音訊模組必須支援獨立音量');
assert.ok(audioSource.includes('setHaptic') && audioSource.includes('vibrate'), '音訊模組必須提供可關閉的觸控震動');
const onlineSource = read(path.join(publicDir, 'js', 'online.js'));
assert.ok(onlineSource.includes('chat: function'), 'WebSocket 用戶端必須提供聊天室訊息方法');
assert.ok(onlineSource.includes('setopt: function (size, deck, first)'), 'WebSocket 用戶端必須傳送先手設定');
assert.ok(onlineSource.includes('start: function'), 'WebSocket 用戶端必須提供房主開始遊戲方法');

const gameSource = read(path.join(publicDir, 'js', 'game.js'));
const styleSource = read(path.join(publicDir, 'css', 'style.css'));
assert.ok(styleSource.includes('.deck-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))'), '牌組選擇必須在寬版分成上下各五張');
assert.ok(styleSource.includes('@media (max-width:560px){') && styleSource.includes('.deck-row{grid-template-columns:repeat(2,minmax(0,1fr))}'), '窄版牌組選擇必須改為兩欄以維持觸控尺寸');
assert.ok(gameSource.includes('renderOnlineSummary') && gameSource.includes('summaryEvent'), '線上對戰必須即時更新摘要與行動紀錄');
assert.ok(gameSource.includes('var iconCount = deck && deck.icons ? deck.icons.length : 32;'), '遊戲版面必須依牌組圖示數量產生配對');
assert.ok(serverSource.includes('const DECK_ICON_COUNTS = { phonetics: 37 };') && serverSource.includes('const iconCount = DECK_ICON_COUNTS[r.deck] || ICONS_PER_DECK;'), '線上伺服器必須支援 37 個注音符號牌面');
assert.ok(gameSource.includes("classList.toggle('online-mode'"), '線上對戰必須顯示摘要與聊天室側欄');
assert.ok(gameSource.includes('cardFront(ic)') && gameSource.includes('class="card-label"'), '翻開牌面時必須顯示中文名稱');
assert.ok(gameSource.includes('w.Sound.vibrate'), '翻牌、配對與逾時必須可觸發觸控震動');
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
assert.ok(styleSource.includes('.game-chat{position:absolute;left:10px;bottom:8px;') && styleSource.includes('#s-game.online-mode.chat-open .game-chat{display:flex;'), '對戰聊天室必須預設隱藏並在左下角展開');
assert.ok(styleSource.includes('.chat-toggle{display:none}') && styleSource.includes('#s-game.online-mode .chat-toggle{display:inline-flex}'), '聊天室按鈕只應在對戰中顯示');
assert.ok(styleSource.includes('.settings-fab{position:fixed;') && styleSource.includes('.settings-modal.open{display:flex}'), '設定入口必須固定顯示且能開啟彈窗');
assert.ok(styleSource.includes('.setting-range input{') && styleSource.includes('.setting-toggle input:checked'), '設定彈窗必須有音量滑桿與開關樣式');
assert.ok(styleSource.includes('.reduced-motion *'), '設定彈窗必須提供減少動畫的顯示選項');
assert.ok(styleSource.includes('min-height:100dvh') && styleSource.includes('env(safe-area-inset-right)'), '頁面必須支援動態視窗高度與安全區');
assert.ok(styleSource.includes('@media (orientation:portrait) and (max-width:820px)') && styleSource.includes('#s-game .gamebody{flex-direction:column;'), '直向裝置必須改用可捲動的單欄遊戲版面');
assert.ok(styleSource.includes('@media (orientation:landscape) and (max-height:520px)') && styleSource.includes('#s-home.active{align-items:flex-start;'), '橫向窄高裝置必須避免主選單上下裁切');
assert.ok(styleSource.includes('@media (max-width:1100px), (max-height:760px)') && styleSource.includes('.gbar{padding:4px 8px 0}') && styleSource.includes('.gamebody{gap:4px;padding:0 4px 2px}'), '小視窗必須壓縮外框留白並放大可操作棋盤');

assert.ok(gameSource.includes('}, match ? 620 : 480);'), '單機配對失敗後必須在 480 毫秒內恢復操作');
assert.ok(serverSource.includes('}, isMatch ? 650 : 500);'), '線上配對失敗後必須在 500 毫秒內切換回合');
assert.ok(serverSource.includes('fromId: cl.id') && serverSource.includes('Date.now()'), '伺服器聊天室訊息必須帶有發送者與時間');
assert.ok(serverSource.includes('function pruneEmptyRooms') && serverSource.includes('r.players.length > 0'), '空房間不得出現在房間列表');
assert.ok(serverSource.includes("r.cur = r.first === 'guest'"), '伺服器必須依房主設定決定先手');
assert.ok(serverSource.includes("case 'start':") && serverSource.includes('r.players[0] !== cl') && serverSource.includes('r.players[1].ready'), '伺服器必須只允許房主在對手 ready 後開始遊戲');

console.log('PASS：頁面資源、十套牌組、數字範圍與單機入口均正確');
