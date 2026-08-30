# video-download-manager · 在线视频下载管理器

本檔案為本專案的代理工作指引，承襲自：
1. 系統層 `~/.dsh/AGENTS.md`
2. 工作區層 `/Users/sean/Documents/Agent space/AGENTS.md`

本檔僅**補充 / 明確化**上層規則，不覆寫。

---

## 目標

- 交付一個現代化的 **線上影片下載管理 Web 應用**，統一管理來自 YouTube、Bilibili、Vimeo、X (Twitter)、TikTok、Instagram 六大平台的**公開影片**下載任務。
- 核心能力：
  - URL 解析與影片中繼資料擷取（透過公開 `oEmbed` / OpenGraph 協定）
  - 任務佇列與並發限制（1 / 2 / 3 / 5 / 10）
  - 任務控制：暫停 / 繼續 / 取消 / 重試 / 刪除、批次刪除
  - SQLite 持久化 + 服務重啟自動恢復（`downloading` / `parsing` / `waiting` → 重置為 `waiting`）
  - WebSocket 即時進度推送（`task:created` / `task:update` / `task:progress` / `task:removed` / `config:update`）
  - 資料看板（下載量、成功率、平台分佈、近 7 天趨勢）、下載歷史、完整設定頁
  - 深色 / 淺色 / 跟隨系統主題，響應式（桌面 / 平板 / 手機）
- 部署形態：本機開發雙進程（server 4000 / client 5173），或 `docker compose up -d` 一鍵部署（多階段建置、命名卷 `vdm-data` / `vdm-downloads`）。

---

## 避免

### 法律與合規（硬性紅線）

- **絕對不要**加入 DRM 繞過、付費牆突破、登入限制繞過或任何平台安全機制規避的能力。本工具僅處理**公開且使用者擁有合法授權**的影片資源。
- 不要為了「讓 demo 更好看」而引入需要平台帳號憑證、Cookie 注入或反爬蟲對抗的程式碼路徑。

### 架構與實作

- 不要把 mock / 占位中繼資料的 fallback 邏輯（平台回傳受限時的行為）當成 bug 直接移除——那是刻意設計，用來保證 demo 可用性。若要改動，先確認是否影響 `videoInfo.ts` 的降級路徑。
- 不要把前後端型別各自複製一份後任意分岔：`server/src/types/index.ts` 與 `client/src/types/` 需保持語意一致。
- 不要繞過 `services/downloadManager.ts` 的任務狀態機直接改資料庫狀態；狀態轉移必須經過管理器，否則重啟恢復邏輯與 WebSocket 推送會不同步。
- 不要把設定值散落成硬編碼常數：執行期設定走 `utils/config.ts` + SQLite `config` 表，環境變數僅作為預設值（見 README 環境變數表）。
- `better-sqlite3` 是原生模組：更換 Node.js 大版本（專案基準為 **Node.js 22**）或跨平台建置 Docker 映像時需重新編譯，不要假設 `node_modules` 可直接搬移。
- 不要提交 `server/data/`、`server/downloads/`、`dist/`、`.env`——已列於 `.gitignore`，新增下載或建置產物時不要用 `git add -f` 強制加入。
- 這是 npm **workspaces** 專案（根 `package.json` 管 `client` / `server`）；不要在子目錄各自初始化不相容的套件管理器（pnpm / yarn）而破壞 workspace 解析。

### 測試

- **待觀察**：目前專案**沒有自動化測試框架**（`server` 與 `client` 皆僅有 `type-check`，無 test script、無 vitest / jest 設定）。
- 依上層 AGENTS.md 第 1.3 條：任何程式碼改動應同步補測試；在測試框架建立前，至少須執行 `npm run lint`（= 前後端 `tsc --noEmit`）並手動驗證關鍵互動（建立任務 → 進度推送 → 暫停/繼續 → 完成/歷史），並將驗證結果註記於 commit message。

---

## 技術棧與指令

### 技術棧

| 層 | 內容 |
| --- | --- |
| 前端 | React 18、TypeScript 5.6、Vite 5、Tailwind CSS 3、React Router 6、Zustand 5、原生 WebSocket |
| 後端 | Node.js 22、TypeScript 5.6、Express 4、better-sqlite3 11、ws 8、dotenv、自研任務佇列 |
| 開發工具 | tsx（watch）、concurrently、tsc、postcss / autoprefixer |
| 部署 | Docker 多階段建置、docker-compose（`Dockerfile.server`、`docker-compose.yml`） |

### 關鍵指令（於專案根目錄）

```bash
npm install            # workspaces 安裝
npm run dev            # 同時啟動 server(4000) 與 client(5173)
npm run dev:server     # 僅後端 (tsx watch)
npm run dev:client     # 僅前端 (vite)
npm run build          # server tsc + client vite build
npm run start          # 執行後端產物 (node dist/index.js)
npm run lint           # 前後端 tsc --noEmit 型別檢查（目前唯一的自動化驗證）
docker compose up -d   # 容器部署，瀏覽 http://localhost:5173
```

首次執行後端前需 `cp server/.env.example server/.env`。

### 目錄結構摘要

```
video-download-manager/
├── client/                 # React + Vite + Tailwind 前端
│   └── src/{components,pages,hooks,store,types,utils}
├── server/                 # Express + SQLite 後端
│   └── src/
│       ├── index.ts        # 入口
│       ├── routes/         # parse / tasks / stats / settings / files
│       ├── services/       # database、downloadManager、urlParser、videoInfo、ws
│       ├── types/          # 共享型別
│       └── utils/          # config、logger
├── Dockerfile.server
├── docker-compose.yml
└── package.json            # npm workspaces 根
```

### 執行期預設

- 後端 `http://localhost:4000`，API 前綴 `/api`，WebSocket 路徑 `/ws`
- 前端 `http://localhost:5173`，`CORS_ORIGIN` 預設對應此位址
- 資料庫 `server/data/vdm.db`，下載目錄 `server/downloads/`

詳細 API、錯誤碼與環境變數表請見 `README.md`。
