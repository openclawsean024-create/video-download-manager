# 在线视频下载管理器 · Online Video Download Manager

> 现代化的在线视频下载管理 Web 应用，统一管理来自 YouTube / Bilibili / Vimeo / X / TikTok / Instagram 的公开视频下载任务。

![Status](https://img.shields.io/badge/status-ready-brightgreen)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Express%20%7C%20SQLite-blue)

---

## ✨ 功能特性

- 🔗 **6 大平台支持** — YouTube、Bilibili、Vimeo、X (Twitter)、TikTok、Instagram
- 🎨 **现代 AI SaaS 风格 UI** — 深色 / 浅色 / 跟随系统
- 📊 **数据看板** — 实时统计下载量、成功率、平台分布
- 🗂️ **任务队列** — 支持并发数量限制（1、2、3、5、10）
- 🔄 **任务控制** — 暂停 / 继续 / 取消 / 重试 / 删除
- 💾 **任务持久化** — SQLite + 服务重启自动恢复
- ⚡ **实时进度** — WebSocket 推送，无需刷新
- 📜 **下载历史** — 搜索、筛选、排序、删除
- ⚙️ **完整设置** — 下载、网络、外观、系统参数
- 📱 **响应式** — 桌面 / 平板 / 手机自适应
- 🐳 **Docker 一键部署**

> **法律声明**：本工具仅用于下载公开且用户拥有合法授权的视频资源。不支持 DRM 绕过、付费墙突破、登录限制绕过或任何平台安全机制规避。

---

## 🛠️ 技术栈

**前端**
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- React Router 6
- Zustand（状态管理）
- WebSocket（实时推送）

**后端**
- Node.js 22 + TypeScript
- Express 4
- better-sqlite3（嵌入式数据库）
- ws（WebSocket 服务）
- 自研任务队列（并发限制、状态机、持久化）

**部署**
- Docker / docker-compose
- 多阶段构建（前后端统一打包）

---

## 📁 目录结构

```
video-download-manager/
├── client/                       # 前端 (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/           # 通用组件
│   │   ├── pages/                # 路由页面
│   │   ├── hooks/                # 自定义 hooks
│   │   ├── store/                # Zustand 状态
│   │   ├── types/                # 类型定义
│   │   └── utils/                # 工具函数
│   ├── package.json
│   └── vite.config.ts
├── server/                       # 后端 (Express + SQLite)
│   ├── src/
│   │   ├── routes/               # REST 路由
│   │   ├── services/             # 数据库、下载管理、URL 解析、视频信息
│   │   ├── types/                # 共享类型
│   │   └── utils/                # 配置、日志
│   └── package.json
├── docker-compose.yml
├── Dockerfile.server
└── package.json                  # workspace 根
```

---

## 🚀 快速开始

### 本地开发

```bash
# 1. 克隆并进入项目
cd video-download-manager

# 2. 安装依赖
cd server && npm install --cache /tmp/npm-cache-server
cd ../client && npm install --cache /tmp/npm-cache-client

# 3. 复制环境变量
cd ../server && cp .env.example .env

# 4. 启动后端 (端口 4000)
npm run dev

# 5. 另起终端，启动前端 (端口 5173)
cd ../client && npm run dev

# 6. 打开浏览器
open http://localhost:5173
```

### 一键启动（使用根 package.json）

```bash
# 在项目根目录
npm install --cache /tmp/npm-cache-root
npm run dev    # 同时启动后端与前端
```

### 生产构建

```bash
# 后端构建
cd server && npm run build && npm start

# 前端构建
cd client && npm run build
# 产物在 client/dist，可用 nginx / serve 部署
```

### Docker 部署

```bash
# 在项目根目录
docker compose up -d

# 浏览器访问
open http://localhost:5173
```

构建过程会：
1. 拉取 Node.js 22 Alpine 镜像
2. 构建前端静态资源
3. 构建后端 TypeScript
4. 把前后端产物打入同一个运行时镜像
5. 启动后端（端口 4000）+ 前端 preview（端口 5173）

数据与下载文件通过命名卷 `vdm-data` 和 `vdm-downloads` 持久化。

---

## ⚙️ 环境变量

后端 `.env` 文件位于 `server/.env`：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4000` | 后端 HTTP 端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `DB_PATH` | `./data/vdm.db` | SQLite 数据库文件 |
| `DOWNLOAD_DIR` | `./downloads` | 下载文件保存目录 |
| `MAX_CONCURRENT` | `3` | 默认最大并发下载数 |
| `MAX_SPEED_MBPS` | `0` | 全局限速（MB/s），0 表示不限 |
| `REQUEST_TIMEOUT_MS` | `30000` | 网络请求超时（毫秒） |
| `MAX_RETRIES` | `3` | 任务失败自动重试次数 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的跨域来源 |
| `LOG_LEVEL` | `info` | 日志级别 (debug / info / warn / error) |

设置页面里大部分选项会持久化到 `config` 表，并在运行时立即生效。

---

## 📚 API 文档

后端默认前缀 `/api`。

### 健康检查

```
GET /api/health
```

返回：
```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "uptime": 12.3,
    "runningTasks": 1,
    "maxConcurrent": 3,
    "version": "1.0.0"
  }
}
```

### 解析视频

```
POST /api/parse
Body: { "url": "https://..." }
```

返回视频元数据（标题、缩略图、作者、时长、可用质量/格式等）。支持以下平台：

- `https://www.youtube.com/watch?v=...` 或 `youtu.be/...`
- `https://www.bilibili.com/video/BV...` 或 `b23.tv/...`
- `https://vimeo.com/...`
- `https://x.com/.../status/...`
- `https://www.tiktok.com/@.../video/...`
- `https://www.instagram.com/p|reel|tv/...`

错误码：

| error code | HTTP | 含义 |
| --- | --- | --- |
| `URL_REQUIRED` | 400 | URL 为空 |
| `URL_INVALID` | 400 | URL 格式错误 |
| `PLATFORM_UNSUPPORTED` | 400 | 当前平台不支持 |
| `FETCH_FAILED` | 502 | 网络/平台限制 |
| `TIMEOUT` | 502 | 请求超时 |

### 任务管理

```
GET    /api/tasks?status=&platform=      列出任务
POST   /api/tasks                        创建任务
POST   /api/tasks/:id/pause              暂停
POST   /api/tasks/:id/resume             继续
POST   /api/tasks/:id/cancel             取消
POST   /api/tasks/:id/retry              重试
DELETE /api/tasks/:id?deleteFile=true    删除（可选删除文件）
POST   /api/tasks/batch/delete           批量删除
```

### 统计

```
GET /api/stats
```

返回：今日任务、已完成、下载中、失败、累计下载、累计任务、成功率、平台分布、最近 7 天每日下载量、最近任务。

### 设置

```
GET    /api/settings
PUT    /api/settings         Body: { ... }  更新持久化设置
GET    /api/settings/system  系统状态（版本、CPU、内存、磁盘）
```

### 文件

```
GET    /api/files/list        列出已下载文件
POST   /api/files/open        Body: { path }  获取文件路径
POST   /api/files/delete      Body: { path, removeTasks }  删除文件
```

### WebSocket

```
WS /ws
```

事件类型：`task:created` / `task:update` / `task:progress` / `task:removed` / `config:update`。
前端通过 `useWebSocket` hook 自动订阅。

---

## 🧪 错误处理与恢复

- **URL 格式错误** — 拒绝创建任务，返回明确错误码
- **不支持的平台** — 返回 `PLATFORM_UNSUPPORTED`，提示支持哪些平台
- **视频不可访问** — 通过 `oEmbed` / OpenGraph 检测，失败时给出本地占位元数据
- **下载失败** — 任务进入 `failed` 状态，记录具体错误信息，可一键重试
- **网络中断** — 当前任务正常结束或失败；前端 WebSocket 自动重连
- **服务重启** — 启动时扫描数据库：
  - `completed` → 保留不动
  - `paused` → 保持暂停
  - `downloading` / `parsing` / `waiting` → 重置为 `waiting`，由任务队列继续处理
- **重复下载** — 同一 URL 若存在进行中任务，创建时返回 `409 DUPLICATE`

---

## ❓ 常见问题

**Q: 我能看到实际下载的视频文件吗？**

A: 可以。下载完成后文件保存在 `server/downloads/` 目录（可在设置中更改）。前端提供"打开文件"和"删除文件"两个独立的操作。

**Q: 为什么有些平台的元数据看起来是 mock 数据？**

A: 本应用通过公开的 `oEmbed` 和 `OpenGraph` 协议获取元数据，这些 API 在大多数情况下返回真实数据。对于返回受限的平台（如部分 X / TikTok 帖子），应用会基于 URL 生成有代表性的占位数据，确保演示始终可用。所有真实下载文件会写入磁盘。

**Q: 支持 DRM / 登录 / 付费视频吗？**

A: **不支持**。本工具严格遵循平台 ToS，仅处理用户拥有合法授权或公开可下载的视频资源。

**Q: 能在局域网内多设备访问吗？**

A: 可以。默认 `HOST=0.0.0.0`。手机/平板通过 `http://<你的电脑IP>:5173` 即可访问。

**Q: 数据存哪里？**

A: SQLite 文件在 `server/data/vdm.db`，下载文件在 `server/downloads/`。Docker 部署时持久化在命名卷 `vdm-data` / `vdm-downloads`。

**Q: 怎么调整并发？**

A: 进入设置页 → "下载设置" → "最大并发任务"，可选 1 / 2 / 3 / 5 / 10。

---

## 📜 License

MIT — 仅供学习与合法用途使用。