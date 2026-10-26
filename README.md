# Little Town · 英語小鎮

階段 2：四級解鎖、搖桿探索與劇本對話。使用 Vite（開發與建置）、TypeScript（嚴格型別）及 Phaser 3（遊戲引擎）。沒有其他遊戲框架，也沒有外部圖片或字型下載。

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

## 操作與模式

首次開啟選擇「從第一級開始破關」或「直接進入第四級」。後者直接從 Lv4 開始，四級全部開放；破關模式預設須完成當級所有情境才能解鎖下一級。上方等級按鈕可切換已解鎖等級。

- 手機／滑鼠：拖曳左下角搖桿移動，支援八方向與類比速度；離開搖桿、取消觸控、視窗失焦或開啟介面都會停止。
- 電腦：方向鍵／WASD，斜向速度正規化；靠近門口 1.5 格後按 Enter／空白鍵進入。
- 右下角「進入」按鈕僅在可用地點的門口範圍出現。點地不移動，碰門不自動進入。
- 室內選單只顯示當前等級的情境。點回答練習，NPC（非玩家角色）以美式英文朗讀；可以隱藏翻譯、重播、向上捲動對話紀錄。
- 目前「說了幾句」是點選回答次數，尚未啟用錄音或語音辨識；麥克風標示階段 3 開放。
- 完成後可重玩、選其他情境或回到小鎮。設定內提供「重置所有進度」，點擊後仍須再次確認。

## 地圖與地點

保留 40×30 格、每格 32px、既有玩家碰撞與四方向尋路核心；階段 2 不再以點地觸發尋路。主路是中央南北向與中段東西向十字路，南側增加橫向支路，連接學校與藥局的南門。

| 地點 | 格子範圍（左上原點，從 0 開始） | 門口格 | 可用等級 |
| --- | --- | --- | --- |
| Cafe 咖啡廳 | (10,8)，5×4 | (12,12) | Lv1–4 |
| Hotel 飯店 | (25,5)，6×5 | (28,10) | Lv1–4 |
| Pharmacy 藥局 | (25,20)，6×4 | (28,24) | Lv1–4 |
| School 學校 | (5,20)，7×5 | (8,25) | Lv1–2 |
| Office 辦公室 | (13,1)，7×5 | (16,6) | Lv4 |

不適用的建築會變灰並標示「封閉」，不能進入，但仍保留碰撞。切換等級回到中央出生點，避免出現在封閉建築中。飯店、藥局目前只有 Lv1 劇本；學校只有 Lv1，其他可用等級進入會提示情境準備中，不列入該級解鎖分母。

## 情境與等級

| 地點／等級 | 內容與分支 | 每條路線回答數 |
| --- | --- | --- |
| 咖啡廳 Lv1 | 點茶、大小、內用／帶走、付款；大小杯走不同回覆 | 7 |
| 咖啡廳 Lv2 | 冰拿鐵、少冰、燕麥奶、加點心；燕麥奶／一般奶不同回覆 | 7 |
| 咖啡廳 Lv3 | 更換錯誤飲料或退款、詢問 Wi-Fi、附近閒聊 | 7 |
| 咖啡廳 Lv4 | 同事四杯外帶、發票與統編、出餐延遲協調；公司發票／一般收據分支 | 7 |
| 飯店 Lv1 | 入住、床型、早餐、退房；一張大床／兩張小床分支 | 6 |
| 藥局 Lv1 | 買牙刷、顏色、付款、袋子；藍色／綠色分支 | 6 |
| 學校 Lv1 | 問作業、交作業日期、借文具；鉛筆／原子筆分支 | 6 |
| 辦公室 Lv4 | 自我介紹、專案／辦公室導覽、會議時間與準備事項 | 6 |

Lv1 以常用基本字與短句為主；Lv2 增加客製化詞彙；Lv3 增加協商與閒聊句型；Lv4 使用職場與多益常見表達。等級是原型內容分級，不是檢定分數對照或逐字官方認證。參考：[教育部常用字彙說明](https://gazette.nat.gov.tw/EG_FileManager/eguploadpub/eg012045/ch05/type2/gov40/num4/Eg.htm)、[大考中心高中英文參考詞彙](https://www.ceec.edu.tw/xmdoc?xsmsid=0K213553204833715309)、[全民英檢中高級參考字表](https://www.lttc.ntu.edu.tw/resources/GEPT/GEPT_High-Intermediate.pdf)。

## 程式架構與存檔

- `src/data/levels.ts`：等級定義、模式、`UNLOCK_RATIO`（解鎖比例，預設 1.0）與純函式解鎖規則。
- `src/data/town.ts`：地點、可用等級、門口距離；`navigation.ts` 保留原尋路與碰撞判斷。
- `src/data/dialogues/*.json`：五個地點的劇本，情境含全域唯一 id、location、level、標題與 nodes。第一個 node 為入口，next 為 null 表示結尾。NPC 名稱與角色由 JSON 提供。
- `src/data/dialogues/validate.ts`：檢查資料結構、重複 id、壞連結、等級與地點不符、無法到達的節點、沒有結尾的分支。測試與瀏覽器執行時皆透過匯入入口檢查。
- `src/events.ts`：具型別的場景／介面事件。地圖與角色留在 Phaser，所有新介面與操作控制器在 `src/ui/`，最大寬度 30rem（預設 480px），CSS 用相對單位。
- `src/ui/DialogueEngine.ts`：對話引擎透過 `ReplyInput`（回答輸入介面）取得回答；`TapReplyInput` 為本階段點選實作，未來可替換成語音輸入。
- `src/ui/ProgressStore.ts`：localStorage（瀏覽器儲存）鍵名 `little-town:save`，版本 1，包含模式、當前等級、已解鎖等級及各情境完成狀態／次數；讀寫與儲存存取皆有例外處理，失敗保留記憶體進度並顯示提示。版本不支援時安全回到首次開啟狀態，未來可在版本分支加入轉換。
- 開啟模式、設定、等級或對話介面時，同時鎖定 Phaser 指標與鍵盤輸入，畫布停用指標事件，並清除搖桿狀態；HTML 面板的捲動不受畫布拖曳攔截。

## 驗證

`npm test` 包括五份 JSON、壞掉的 next、地點／等級不符、無結尾與困住的分支、所有路線 5–8 輪、實際分支差異、解鎖門檻、直接模式、存檔讀寫失敗、重新載入及五棟建築路徑／碰撞。自動部署也會先跑這些測試。

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

## iPhone Safari 注意與實機驗收

- 首次開啟需看到兩個模式。模式選擇、完成標記、次數與當前等級重新整理後應保留；無痕模式、清除網站資料、儲存限制或不同網域／瀏覽器會影響保存。
- 朗讀使用 speechSynthesis（瀏覽器文字轉語音），第一句在「開始情境」的點擊事件內同步呼叫，不以計時器或非同步請求開始。優先美式 Samantha／Google US English，沒有可用聲音時用 en-US 預設。聲音清單可能延後載入，會監聽 voiceschanged（聲音清單更新事件）。
- iOS 的音量、輸出裝置、已安裝語音與切換背景後的行為會影響朗讀。回到前景後可點重播；沒有語音功能或朗讀出錯仍能完成文字練習。無法從桌機測試保證 iPhone 實際出聲。[瀏覽器語音說明](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)。
- 測試搖桿的觸控拖曳、斜向與慢速、放開停止；靠近門顯示按鈕，離開範圍隱藏，點地不移動。
- 破關模式完成四個 Lv1 情境後應提示解鎖 Lv2；直接模式可切換四級，學校／辦公室依級別封閉。
- 對話紀錄可捲動、翻譯可切換、分支內容不同，按回答時背後角色不移動。
- 測試瀏海安全區域、網址列收合、直橫轉換與較短畫面。HTML 控制介面等比例寬度與 Phaser.Scale.FIT（畫布等比適應）分開管理。

正式網址：https://zioszioszios-web.github.io/english-town-proto/ 。實際 iPhone 操作與出聲仍需實機驗收。

## 階段 3：步驟 1

Lv1 已依教育部原表完成 2,003 個去重詞目，含中文、詞性、例句、主題與待複核標記。Lv2～Lv4 尚未開放。設定頁可查看四份資料來源與授權；字庫按需載入，不塞進遊戲入口封包。

- `npm run check:words`：完整字庫檢查、主題統計與待複核清單。
- `npm run check:words -- --batch`：編寫期間的批次檢查，不代表完整字庫通過。
- 來源、解析方式、字數差異及授權：[data/sources/README.md](data/sources/README.md)。
- 待教學人員複核：[data/review-list.md](data/review-list.md)。
- 原始字表解析需 Python + pdfplumber；一般開發、測試、部署僅需 Node.js。

## 階段 3：步驟 2

- 公園：西北方湖邊（湖泊第 2～6 欄／2～5 列，入口第 6 欄／8 列），接回主幹道；湖水不可通行。
- 街道：主幹道第 23 欄／17 列的起跑標誌，跑酷將在步驟 4 開放。
- 飯店／學校內選「小遊戲」分頁；學校遊戲顯示「操場」。
- 已完成釣魚（10 題、8 秒）、拼字跑步（10 步、自製與實體鍵盤）、翻牌配對（Lv1 四組，較高等級六組）。
- Lv1 可用字數：釣魚 2,003、拼字跑步 481、翻牌配對 241。其他等級顯示「單字準備中」。
- 計分、出題、單字練習記錄位於 src/games；ScoreRepository 為非同步介面，遊戲僅透過共用結算取得排行榜，不依賴本機儲存實作。
- 設定可修改暱稱、關閉小遊戲發音；重置會同時清除單字紀錄與本機排行。
- 開發用互動測試頁：啟動開發伺服器後開啟 /tests/games.html。重用正式元件，測試紀錄存記憶體，不包含在正式建置入口。
- 已以桌面瀏覽器操作三個遊戲到結算；手機寬度檢查不等於實體 iPhone Safari 驗收。iOS 語音需先點「開始遊戲」，背景切換可能取消朗讀，儲存空間被限制時僅保留本次紀錄。
