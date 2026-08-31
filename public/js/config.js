/* ===== config.js — 線上對戰伺服器位址設定 =====
 *
 * GitHub Pages 只能放靜態網頁，沒辦法跑 WebSocket，
 * 所以線上對戰的伺服器（server.js）另外部署在 Render，網址填在下面 REMOTE。
 *
 * 規則：
 *   - 從 localhost 或區網 IP 開啟（自己按「啟動遊戲.bat」跑 node server.js）
 *     → 連同一台主機，跟以前一樣。
 *   - 從 GitHub Pages 或直接開啟 index.html
 *     → 連 Render 上的伺服器。
 *
 * 換伺服器只要改 REMOTE 這一行（填 https:// 或 wss:// 都可以）。
 */
(function (w) {
  'use strict';

  var REMOTE = 'https://flip-match.onrender.com';

  var h = w.location.hostname;
  var isLocal = (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' ||
                 /^\d+\.\d+\.\d+\.\d+$/.test(h));

  // 空字串代表「連開啟這個網頁的同一台主機」
  w.FLIP_MATCH_SERVER = isLocal ? '' : REMOTE;
})(window);
