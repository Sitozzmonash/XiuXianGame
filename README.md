# 凡尘问道 · 修仙挂机

竖屏 H5 国风水墨修仙挂机游戏：自动战斗推关、爆装刷宝、法宝 Build、境界突破、剧情奇遇、秘境探索、洞府养成，带云端存档。

- 完整产品设计见 [`docs/凡尘问道_Master_PRD_v3.0.md`](docs/凡尘问道_Master_PRD_v3.0.md)
- 部署上线见 [`docs/部署指南.md`](docs/部署指南.md)
- 工程约定见 [`docs/架构与工程约定.md`](docs/架构与工程约定.md)

## 玩法内容

| 系统 | 规模 |
| --- | --- |
| 关卡 | 4 张地图 × 50 关 = 200 关（青石村 / 黑风岭 / 云泽城 / 落霞谷） |
| 境界 | 炼气 → 筑基 → 结丹 → 元婴 → 化神 → 炼虚 → 合体 → 大乘 → 渡劫 → 飞升，每境多阶，突破需材料 + 挑战 Boss |
| 怪物 | 31 种（普通 / 精英 / Boss），数值随关卡指数成长 |
| 装备 | 6 部位 × 多品质（白绿蓝紫橙红），词条随机、强化、批量熔炼、自动装备 |
| 法宝 | 30 件（主动施放：飞剑 / 剑阵 / 护盾 / 召唤 / 灼烧 / 治疗…），品质 + 升级 |
| 功法 | 29 部（主修 + 辅修槽位） |
| 灵兽 | 15 只 |
| 材料 / 丹药 | 40 种材料、30 种丹药（炼丹、突破、永久属性） |
| 剧情 | 13 个主线节点（13 位 NPC）、30 个随机奇遇、关键抉择影响属性与因果 |
| 秘境 | 3 座（青石试炼 / 黑风洞窟 / 落霞古洞），分支路线 + 节点战斗 + 专属掉落 |
| 挂机 | 离线收益 24h 封顶，随关卡 / 境界 / 洞府 / 功法加成 |
| 表现 | Canvas 2D 战斗渲染、25 种合成音效（WebAudio）、水墨动效、移动端安全区适配 |
| 云存档 | 游客自动建档、多端登录接口、服务端权威版本号、冲突回滚快照、埋点上报 |

## 技术栈

- **前端**：Next.js 16（App Router / Turbopack）、React 19、TypeScript 5.7、Tailwind CSS v4、Zustand 5（persist）
- **后端**：FastAPI + SQLAlchemy 2 + Pydantic v2，JWT 鉴权，psycopg3
- **数据库**：PostgreSQL（Neon）/ 本机可零依赖跑 SQLite
- **部署**：Vercel（Services 单项目：Next.js + FastAPI）+ Neon

## 项目结构

```text
├── app/                    # Next.js 页面（/ 游戏入口、/battle-preview 战斗与音效调试）
├── components/game/        # 全部游戏 UI
│   ├── screens/            # 各功能屏（主界面/战斗/背包/角色/Build/功法/秘境/洞府…）
│   ├── overlays/           # 剧情、奇遇、仙途录、突破演出、秘境路线
│   ├── modals/             # 装备/法宝/挂机结算弹窗
│   └── battle/             # Canvas 战斗渲染、HUD、战斗驱动
├── lib/
│   ├── game/
│   │   ├── types.ts        # ★ 前后端共享契约（GameSave / 战斗事件 / 配置类型）
│   │   ├── config/         # 内容配置：地图/怪物/装备/法宝/功法/灵兽/材料/丹药/境界/剧情/秘境
│   │   ├── engine/         # 纯函数引擎：battle / loot / idle / breakthrough / story / realm
│   │   ├── state/          # Zustand 存档与全部 action
│   │   └── api/            # 云存档客户端（auth / 推拉同步 / 埋点上报）
│   ├── game/audio.ts       # WebAudio 合成音效
│   └── navigation.ts       # 屏幕与导航类型
├── server/                 # FastAPI 云存档后端
│   ├── app/                # main(装配) / config / db / models / schemas / security / audit / routers
│   ├── sql/schema.sql      # DDL（供 DBA 审查；应用启动自动建表）
│   ├── tests/              # 31 项接口契约测试（SQLite 内存库）
│   └── docker-compose.yml  # 可选：本机 PostgreSQL + api
├── scripts/e2e-cloud.ts    # 云同步端到端自检（真实前端代码打本地后端）
├── docs/                   # PRD、开发 Prompt、部署指南、工程约定
└── vercel.json             # Vercel Services：/api/* → FastAPI，其余 → Next.js
```

## 快速开始

```bash
npm install
npm run dev          # http://localhost:3000
```

此时游戏即可完整游玩（本地存档）。要启用云存档，再起后端：

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # 默认 SQLite；server/.env 可切 PostgreSQL
```

`next.config.mjs` 会把开发环境的 `/api/*` 代理到 `127.0.0.1:8000`，无需其他配置。
后端接口文档：<http://127.0.0.1:8000/docs>

## 环境变量

模板见 [`.env.example`](.env.example)。部署到 Vercel 需在项目设置里填：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串（Neon 的 `postgresql://` 原样填，应用自动转 psycopg 方言） |
| `JWT_SECRET` | 是 | JWT 签名密钥（随机 64 位 hex） |
| `CREDENTIAL_PEPPER` | 是 | 凭证指纹 HMAC 密钥（随机 64 位 hex，与上者不同） |
| `API_PREFIX` | 是 | Vercel Services 部署填 `/api`；本机开发留空 |
| `NEXT_PUBLIC_API_URL` | 否 | 仅前后端拆成两个项目时填后端完整域名 |

## 测试与自检

```bash
npm run typecheck            # TS 全量类型检查
npm run build                # 生产构建

cd server && python -m pytest tests -q       # 后端 31 项契约测试
npx tsx scripts/e2e-cloud.ts                 # 云同步端到端（需本地 uvicorn 已启动，
                                             # 覆盖：建档 → 首推 → 增量推送 → 采纳云端存档）
```

## 云存档设计（摘要）

- 游客按 `device_id` 幂等建档，JWT 鉴权；绑定微信/QQ/邮箱后可跨设备登录（绑定 UI 待做）。
- 服务端权威版本号：客户端每次写入带 `base_version`，不一致返回 409 并附服务端存档，前端整体采纳。
- 前端 15s 节流自动推送、切后台补推；**一切网络失败静默降级为本地模式，游戏不受影响**。
- 服务端对 `stone / cultivation / immortalJade` 增幅做审计（只标记 + 扣信任分，不阻断写入），每版存档留快照可回滚。
- 埋点按 PRD 49 批量上报 14 类事件（登录 / 推关 / 挂机 / 突破 / 剧情选择 …）。
