# 🎴 翻牌配對碰

可愛風的翻牌記憶配對遊戲，支援 **單機挑戰**、**線上雙人對戰（大廳＋房間列表）**。
針對手機、平板、桌機的直向與橫向觸控操作設計，按鈕為立體區塊 SVG，牌面採百科式圖示（有材質、輪廓與立體陰影細節），音樂與音效皆由程式即時合成（不需要任何音檔）。

## 怎麼玩

### 單機版（不用開伺服器）
直接用瀏覽器打開 `public/index.html` 就能玩「單機挑戰」。

### 線上版（大廳／房間／雙人對戰）
1. 在電腦上按兩下 **`啟動遊戲.bat`**（或在此資料夾執行 `node server.js`）。
2. 視窗會顯示兩組網址：
   - `http://localhost:3000` — 本機用
   - `http://192.168.x.x:3000` — 同一個 Wi-Fi 下的平板用
3. 兩台裝置都打開網址 → 進入「線上對戰」→ 一邊「建立房間」，另一邊在房間列表按「加入」。
4. 加入房間的玩家先按「我準備好了」，房主確認後按「開始遊戲」進入對戰。

房間內會顯示可複製／分享的邀請連結，對手開啟連結後會直接加入該房間；房間與對戰畫面都提供即時聊天室。對戰時右側「即時戰況」會同步顯示雙方比分、目前回合、已配對進度與最近行動。

> 需要 Node.js 16 以上（已安裝就好，**不需要 npm install**，本專案零外部套件）。

## 遊戲規則

| 難度 | 牌數 | 記憶時間 | 每回合限時 | 提示次數 |
|------|------|----------|------------|----------|
| 簡單 | 4 × 4 | 10 秒 | 10 秒 | 1 次 |
| 普通 | 6 × 6 | 20 秒 | 20 秒 | 2 次 |
| 困難 | 8 × 8 | 30 秒 | 30 秒 | 3 次 |

- 開場先掀開全部的牌讓玩家記憶，時間到後蓋牌。
- 每次翻兩張，**配對成功得 1 分，兩張牌會維持翻開並可以繼續翻**，翻錯換對手。
- 回合倒數最後 5 秒有滴答提醒音，最後 3 秒轉為急促音；時間到未翻完兩張則換人（單機模式為扣分並重新開始回合）。
- 💡 先翻開一張牌後才能使用提示；提示會直接翻出另一張配對牌。簡單、普通、困難分別可用 1、2、3 次。

## 牌組
動物、交通工具、蔬果、卡通角色、文具、食物、各國國旗、數字、注音符號、運動，共十套牌組。一般牌組有 32 種牌面，注音符號牌組收錄完整 37 個符號；數字牌組會依難度使用 1～8、1～18、1～32。

主題牌組的圖示使用專案內建的 [Google Noto Emoji SVG](https://github.com/googlefonts/noto-emoji) 或瀏覽器 Emoji 資源（Apache License 2.0），因此離線開啟或部署到 GitHub Pages 時也能正常載入；少數沒有對應圖示的文具牌會保留原本的手繪 SVG 備援。

## 檔案結構
```
flip-match/
├── 啟動遊戲.bat          # Windows 一鍵啟動
├── server.js             # 零依賴 HTTP + WebSocket 伺服器
├── package.json
└── public/
    ├── index.html
    ├── assets/noto/   # 本地百科式 SVG 圖示與授權檔
    ├── css/style.css
    └── js/
        ├── decks/        # 十套牌面 SVG 與百科式圖示映射
        ├── svgui.js      # 立體 SVG 按鈕 / 標題 / 牌背
        ├── audio.js      # Web Audio 即時合成音樂與音效
        ├── game.js       # 遊戲核心
        ├── online.js     # WebSocket 用戶端
        └── app.js        # 畫面流程
```

## 小技巧
- 平板橫向可讓棋盤放到最大；直向時資訊會自動堆疊並保留捲動操作空間。
- 每個畫面右上角的 ⚙️ 都能開啟設定，調整背景音樂／音效開關與音量，也能控制觸控震動和翻牌動畫；設定會記住。
- 排行榜紀錄存在該台裝置的瀏覽器中。

## 佈署到 GitHub Pages

本專案已內建 GitHub Actions 工作流程（`.github/workflows/deploy-pages.yml`），會把 `public/` 資料夾發佈到 GitHub Pages。

1. 在 GitHub 建立一個新的 repository（例如 `flip-match`），**不要**勾選任何初始化檔案。
2. 在本資料夾執行：
   ```bash
   git remote add origin https://github.com/<你的帳號>/flip-match.git
   git push -u origin main
   ```
3. 到 repository 的 **Settings → Pages**，把 **Source** 設為 **GitHub Actions**。
4. 之後每次 push 到 `main` 就會自動重新佈署，網址是
   `https://<你的帳號>.github.io/flip-match/`。

## 佈署線上對戰伺服器到 Render

GitHub Pages 只能放靜態檔案，跑不了 WebSocket，所以 `server.js` 另外部署到 [Render](https://render.com)。
本專案已內建 `render.yaml` 藍圖設定。

1. 登入 Render → **New → Blueprint** → 選這個 GitHub repository → **Apply**。
   （或用 **New → Web Service**，Build Command 留 `npm install`，Start Command 填 `node server.js`。）
2. 建好之後會拿到一組網址，例如 `https://flip-match.onrender.com`。
3. 回到 GitHub repository → **Settings → Secrets and variables → Actions → Variables**
   → **New repository variable**：

   | Name | Value |
   |------|-------|
   | `SERVER_URL` | `https://你的服務名稱.onrender.com` |

4. 到 **Actions** 分頁把 `Deploy to GitHub Pages` 重跑一次（**Re-run all jobs**），
   線上對戰就會連到 Render。之後改網址只要改這個 variable 再重跑，不用改程式碼。

> 網址是靠 `scripts/inject-server-url.js` 在佈署時寫進 `public/js/config.js` 的，
> 版控裡的 `REMOTE` 永遠是空字串。
> 想在本機試注入結果：`node scripts/inject-server-url.js https://xxx.onrender.com`
> （記得試完用 `git checkout public/js/config.js` 還原）。

### 連線規則

`public/js/config.js` 會自動判斷：

| 從哪裡開啟 | 線上對戰連到 |
|------------|--------------|
| `localhost` / 區網 IP（自己跑 `啟動遊戲.bat`） | 同一台主機，跟以前一樣 |
| GitHub Pages 或直接開 `index.html` | Render 上的伺服器 |

> ⚠️ Render 免費方案在閒置約 15 分鐘後會休眠，**第一次連線可能要等 30～60 秒**才會醒來，
> 期間畫面會顯示「連線中斷」並自動重試，醒來後就會連上。
> 免費方案每月有執行時數上限，兩人對戰的流量很小，一般不會用完。
