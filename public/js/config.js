/* ===== config.js — 線上對戰伺服器位址設定 =====
 *
 * GitHub Pages 只能放靜態網頁，沒辦法跑 WebSocket，
 * 所以線上對戰的伺服器（server.js）另外部署在 Render。
 *
 * ⚠️ 下面 REMOTE 這一行不用手動改。
 * 佈署到 GitHub Pages 時，Actions 會用 repository variable `SERVER_URL`
 * 的值改寫它（見 scripts/inject-server-url.js）。
 * 設定位置：Settings → Secrets and variables → Actions → Variables → SERVER_URL
 *
 * 連線規則：
 *   - 從 localhost 或區網 IP 開啟（自己按「啟動遊戲.bat」跑 node server.js）
 *     → 連同一台主機，跟以前一樣，不受 REMOTE 影響。
 *   - 從 GitHub Pages 或直接開啟 index.html
 *     → 連 REMOTE 指定的伺服器；REMOTE 是空的就退回連同一台主機。
 */
(function (w) {
  'use strict';

  /* SERVER_URL_PLACEHOLDER — 這一行由 scripts/inject-server-url.js 改寫，格式勿動 */
  var REMOTE = '';

  var h = w.location.hostname;
  var isLocal = (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' ||
                 /^\d+\.\d+\.\d+\.\d+$/.test(h));

  // 空字串代表「連開啟這個網頁的同一台主機」
  w.FLIP_MATCH_SERVER = isLocal ? '' : REMOTE;
})(window);
