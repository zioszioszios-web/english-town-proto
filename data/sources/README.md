# 官方單字來源與處理紀錄

取得日期：2026-10-26。四份原檔均已下載；Lv1、Lv2 字庫已完成；Lv3、Lv4 的字庫尚未完成。中文、例句、主題為 AI 輔助編寫，不是官方提供的釋義。

| 等級 | 原檔 | 官方來源 | SHA-256 |
| --- | --- | --- | --- |
| Lv1 | moe-english-curriculum-2018.pdf | [教育部課綱](https://edu.law.moe.gov.tw/LawContent.aspx?id=GL001749)／[國教院原檔](https://stv.naer.edu.tw/data/course_outline/pta_18518_3555074_59836.pdf) | 83dde39b16dfd3df84e6d9b2abca4cb7e822d925c8b3d1f4cb0df01527fb0abe |
| Lv2 | ceec-111-vocabulary.pdf | [大考中心原檔](https://www.ceec.edu.tw/files/file_pool/1/0N118345621497981164/%E9%AB%98%E4%B8%AD%E8%8B%B1%E6%96%87%E5%8F%83%E8%80%83%E8%A9%9E%E5%BD%99%E8%A1%A8%28111%E5%AD%B8%E5%B9%B4%E5%BA%A6%E8%B5%B7%E9%81%A9%E7%94%A8%29.pdf) | 27b010f8230b2e8763653ddb35783fe9e0140c143b0040f13839046aebb2a126 |
| Lv3 | nawl-1.2-alphabetized.txt | [NAWL 官方頁](https://www.newgeneralservicelist.com/new-academic-word-list)／[原檔](https://www.newgeneralservicelist.com/s/NAWL_12_alphabetized_description.txt) | 88a99099e10010ea40992cca4a5119102d05a0f2888ee5d43d4c8b4afd597fef |
| Lv4 | tsl-1.2-alphabetized.txt | [TSL 官方頁](https://www.newgeneralservicelist.com/toeic-service-list)／[原檔](https://www.newgeneralservicelist.com/s/TSL_12_alphabetized_description.txt) | 935b89bdad27755b91f5b1b49b755af3dd7ee60c50d7b899f36520691c88eea8 |

## Lv1 可重現解析

安裝 Python 的 pdfplumber 後執行 `python scripts/parse_moe_words.py`。腳本先驗證原檔雜湊值，再讀 PDF 第 56～61 頁的表一、表二；不重複計算表三主題字表。保留片語，括號內的變化形存為 aliases，斜線寫法以第一個為詞目，其餘存為別名。忽略大小寫合併同形詞。

課綱稱為基本 2000 字，實際解析表一 1,211 筆、表二 794 筆，共 2,005 筆；合併 May/may 與 Miss/miss 後為 **2,003 筆**。沒有為湊足整數而刪除原表詞目。完整對照與來源字形存於 moe-lv1-raw.json。此差異需教學人員複核，不能宣稱官方精確有 2,003 字。

20 批編寫資料位於 data/word-batches/lv1，執行 `python scripts/build_word_batches.py` 重新組裝 JSON；每批驗證來源、重複、六欄內容與例句詞目。再執行 `npm run check:words` 檢查完整數量、欄位、跨等級去重、主題下限並輸出 data/review-list.md。部分例句保留來源舊拼法的說明，列為待複核。

## 授權與出處

- 教育部：十二年國民基本教育課程綱要，語文領域—英語文（2018），附錄五；保留完整官方課綱出處。
- 大考中心原檔載明：非營利使用須註明出處，營利使用須取得書面同意；本專案不重新授權該原檔。
- NAWL：Browne, C., Culligan, B. & Phillips, J.，New Academic Word List，1.2 版。
- TSL：Browne, C. & Culligan, B.，TOEIC Service List，1.2 版。
- NAWL、TSL 原始字表及其後續新增的中文、例句與主題，依 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 標示與分享。版本及作者以官方頁面與原檔為準；原檔中的引用年代文字保持原樣。
- 專案程式碼與其他來源原檔不因上述聲明改變授權。


## Lv2 可重現解析

執行 python scripts/parse_ceec_words.py，再執行 python scripts/build_word_batches.py 2。腳本驗證原檔 SHA-256，讀取 PDF 第 65～115 頁依字母排序的三欄字表；不重複計算前段依級別排列的字表。解析 6,012 組原始列，展開括號衍生詞後為 6,064 個詞目；排除 Lv1 已收錄詞目及原表明列的拼字／複數變化後為 4,203 筆，排除 1,861 筆。

大小寫、直／彎撇號及連字號視為同字；斜線採第一個字形，含重音時優先 ASCII 拼字，其餘保留別名。近義詞不傳遞低等級歸屬，例如 chairperson 不因 chair 已在 Lv1 就刪除。shoe(s) 的別名展開為 shoes。第 107 頁 sportsman/sportswoman 跨行的末字母 n 與詞性欄重新接合，修正記錄保留在原始解析 JSON。

42 批編寫資料位於 data/word-batches/lv2，4,203 筆中 314 筆待複核。官方標稱字數與依實際列、衍生詞、別名規則計算的數量不完全相同；未為湊整數刪補詞目。中文、詞性及例句仍需教學人員複核，不是官方釋義。
