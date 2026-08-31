/*
 * 把線上對戰伺服器的網址寫進 public/js/config.js。
 *
 * 網址來源（依序）：
 *   1. 命令列參數：node scripts/inject-server-url.js https://xxx.onrender.com
 *   2. 環境變數 SERVER_URL（GitHub Actions 由 repository variable 帶進來）
 *
 * 沒有給網址時只會警告，不會讓佈署失敗 —— 單機挑戰與對戰電腦仍然可以玩，
 * 只有線上對戰會連不到伺服器。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG = path.join(__dirname, '..', 'public', 'js', 'config.js');
const LINE = /^(\s*)var REMOTE = '[^']*';/m;

const raw = (process.argv[2] || process.env.SERVER_URL || '').trim();

if (!raw) {
  console.warn('⚠️  沒有提供 SERVER_URL，config.js 的 REMOTE 保持空白（線上對戰將無法使用）。');
  console.warn('   設定位置：Settings → Secrets and variables → Actions → Variables → SERVER_URL');
  process.exit(0);
}

// 去掉結尾斜線；只接受 http/https/ws/wss，避免把奇怪的值塞進 JS
const url = raw.replace(/\/+$/, '');
if (!/^(https?|wss?):\/\/[^\s'"\\]+$/.test(url)) {
  console.error('❌ SERVER_URL 格式不正確：' + raw);
  console.error('   應該像 https://flip-match.onrender.com');
  process.exit(1);
}

const source = fs.readFileSync(CONFIG, 'utf8');
if (!LINE.test(source)) {
  console.error('❌ 在 config.js 找不到 `var REMOTE = \'...\';` 這一行，請確認檔案沒有被改壞。');
  process.exit(1);
}

const next = source.replace(LINE, (m, indent) => indent + "var REMOTE = '" + url + "';");
fs.writeFileSync(CONFIG, next, 'utf8');
console.log('✅ 線上對戰伺服器設為 ' + url);
