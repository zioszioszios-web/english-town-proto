# Little Town · 英語小鎮

階段 1：小鎮與移動。使用 Vite（開發與建置）、TypeScript（嚴格型別）及 Phaser 3（遊戲引擎）。沒有其他遊戲框架，也沒有外部圖片或字型下載。

## 本機執行

需要 Node.js 22.12 以上及 npm。

```sh
npm ci
npm run dev
```

開啟終端機顯示的網址，預設為 http://localhost:5173 。手機與電腦連到同一個 Wi-Fi，以電腦的區域網路 IP 開啟，例如 http://192.168.1.10:5173 。若作業系統詢問，允許私人網路的防火牆存取。

```sh
npm test
npm run build
npm run preview
```

測試檢查所有出生／返回位置到三個入口的路徑、沿途碰撞與邊界；建置先執行嚴格型別檢查，再輸出至 `dist/`。預覽預設為 http://localhost:4173 。

## 操作

- 電腦：方向鍵或 WASD。斜向移動速度已正規化。
- 手機：點擊地面，自動沿格子尋路；點建築也會前往門口。下方三個地點按鈕可直接導航。
- 玩家不能穿過建築與世界邊界。到達金色門墊時進入室內。
- 室內顯示該地點名稱、NPC（非玩家角色）與招呼文字；按「離開」回到同一扇門外，避免立刻再次進門。
- 小地圖顯示目前位置。探索數在離開室內後更新，重新整理會重設；本階段不包含錄音或口說評分。

## 專案結構

```text
src/
  main.ts                  遊戲入口與直式縮放
  style.css                全螢幕、觸控與安全區域
  scenes/
    TownScene.ts           小鎮繪製、鍵盤／觸控、鏡頭、進門
    InteriorScene.ts       地點室內、NPC 與離開
    ui.ts                  共用文字與按鈕
  entities/Player.ts       玩家造型、移動與碰撞
  data/
    town.ts                40×30 格地圖、32px 格子、三棟建築
    navigation.ts          四方向廣度優先尋路與碰撞判斷
public/assets/             預留美術資源
tests/navigation.test.ts  尋路與碰撞測試
.github/workflows/deploy.yml 自動建置與部署
```

遊戲邏輯畫面為 390×760，使用 Phaser.Scale.FIT（等比例適應螢幕）與鏡頭跟隨，較寬螢幕會保留側邊背景。全部場景圖形由程式繪製。瀏覽器捲動與手勢縮放已停用。

## GitHub Pages 部署

1. 在 GitHub 建立儲存庫，免費帳號一般使用公開儲存庫。把本專案內容放在儲存庫根目錄，包含 `package-lock.json` 及 `.github/`。
2. 儲存庫 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**（工作流程部署）。
3. **Settings → Actions → General** 允許本專案使用的 GitHub 官方動作。若組織有限制，確認允許 Pages 寫入及身分權杖權限；工作流程已宣告 `pages: write` 與 `id-token: write`。
4. 推送至 `main`，或到 **Actions → Deploy to GitHub Pages → Run workflow** 手動觸發。若部署環境要求審核，依 `github-pages` 環境規則核准。
5. 完成後在部署結果或 **Settings → Pages** 取得網址：一般為 `https://帳號.github.io/儲存庫名稱/`。

若目前資料夾尚未初始化版本控制：

```sh
git init -b main
git add .
git commit -m "Create English town prototype"
git remote add origin https://github.com/你的帳號/你的儲存庫.git
git push -u origin main
```

工作流程透過 `actions/configure-pages`（取得 Pages 設定）回傳的 `base_path` 自動設定 Vite 的資源基底路徑，支援專案子目錄、帳號根網站與自訂網域，不必手改儲存庫名稱。本機預設相對路徑 `./`；欲手動模擬子目錄部署，可在 PowerShell 執行：

```powershell
$env:VITE_BASE_PATH = '/你的儲存庫名稱/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

部署設定依據：[Vite 官方靜態部署說明](https://vite.dev/guide/static-deploy#github-pages)。

## iPhone Safari 實機驗收

建置或桌機預覽通過不代表手機已驗收。部署後請用實際 iPhone Safari 開啟 HTTPS 網址：

- 直式載入無水平或垂直頁面捲動；旋轉或網址列收合後維持等比顯示。
- 點擊數個地面位置確認移動；點建築另一側確認會繞路。
- 依序點 Cafe、Hotel、Pharmacy 導航按鈕，確認三個室內名稱及 NPC 不同，按「離開」回到對應門外。
- 返回後不會自動重複進門，仍可再次進入；多指操作不引發頁面縮放。
- 桌機補查方向鍵／WASD、碰牆、四邊邊界與鍵盤取消自動導航。

目前未綁定 GitHub 儲存庫，實際部署網址與 iPhone 驗收需於上述設定完成後確認。
