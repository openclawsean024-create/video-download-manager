# video-download-manager · 變更日誌

本檔記錄 video-download-manager 自 v1.0 以來的所有版本變更。

---

## v3.0.2 — 2026-09-06 (Fleet Alignment by Sean 10-repo-fleet)

**作者**：Sean 10-repo-fleet（batch 7B）
**對齊契約**：SPEC v3.0 19 章

### Added
- `PRD/SPEC.md` — v3.0.2 等級 9 章規格書（產品概述／場景／FR／NFR／架構／DoD／部署／Out-of-scope／變更日誌）
- `PRD/CHANGELOG.md` — 本檔（v3.0.2 / v1.0 二層歷史）
- `.github/workflows/ci.yml` — 4-job CI：lint / test / build / deploy(none)
- `server/tests/urlParser.test.ts` — 27 個 node --test 案例（detectPlatform × 14 + isValidUrl × 5 + PLATFORM_NAMES × 1 + PLATFORM_COLORS × 2 + getPlatformLimits × 5）

### Changed
- `client/package.json` — 新增 `@types/node ^22` devDep（修復 vite.config.ts tsc --noEmit 缺型別）
- `server/package.json` — 新增 `test` script（`node --test --import tsx tests/*.test.ts`）
- 根 `package.json` — 新增 `test` script（轉發至 `npm --prefix server run test`）

### Notes
- v3.0.2 完成於 2026-09-06 by Sean 10-repo-fleet
- 部署目標採 `none`（Express + SQLite + better-sqlite3 原生模組不適合 Vercel/Pages，請用 `docker compose up -d`）
- Lint / Build / Test 三項全綠（27/27 pass）

---

## v1.0 — 2024-Q4（原始版本）

**作者**：OpenClaw 原始團隊
**說明**：初版 README + AGENTS.md 為主，無正式 SPEC 規格書。

### Shipped 功能
- 6 平台 URL 解析（YouTube / Bilibili / Vimeo / X / TikTok / Instagram）
- React 18 + Vite 5 + Tailwind 3 前端
- Express 4 + better-sqlite3 11 + ws 8 後端
- SQLite 持久化 + 重啟自動恢復
- WebSocket 即時進度推送
- Dashboard / Tasks / History / Settings 4 大頁面
- 深淺色主題 + RWD 三斷點
- Docker 一鍵部署（`Dockerfile.server` + `docker-compose.yml`）
- npm workspaces（client + server 統一管理）
- 完整 AGENTS.md（目標／避免／技術棧／指令／執行期預設）
- 法律紅線明確：不做 DRM 繞過 / 付費牆突破 / 登入限制繞過
