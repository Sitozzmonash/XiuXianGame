# 凡尘问道 · 云存档后端（B12~B14）

FastAPI + SQLAlchemy 2 + PostgreSQL（本机可零依赖用 SQLite 跑测试）。
提供游客登录、微信 / QQ / 邮箱绑定与登录、服务端权威云存档（版本冲突 409、快照留存、增幅审计）、
PRD 49 章基础埋点批量上报。与前端完全解耦：只按 HTTP 契约交换 GameSave JSON（形状见
`lib/game/types.ts` 的 `GameSave`，服务端原样存取，不解析业务字段，仅对 stone / cultivation /
immortalJade 做增幅审计）。

## 快速开始

```bash
cd server
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # 本机可保持 SQLite 默认值
uvicorn app.main:app --reload --port 8000
# 文档：http://127.0.0.1:8000/docs   健康检查：http://127.0.0.1:8000/health
```

跑测试（SQLite 内存库，离线可跑，无需 PostgreSQL）：

```bash
cd server
python -m pytest tests -q
```

本机起 PostgreSQL（可选，docker-compose 会顺带跑 `sql/schema.sql`）：

```bash
cd server
docker compose up -d db          # postgres:16 @ localhost:5432（fanchen/fanchen）
docker compose up --build api    # 可选：连库起 api @ localhost:8000
```

## 环境变量（`.env.example`）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./fanchen.db` | 生产用 `postgresql+psycopg://user:pass@host:5432/db` |
| `JWT_SECRET` | `dev-secret-change-me-please-set-32bytes` | 生产必须替换（随机长字符串） |
| `CREDENTIAL_PEPPER` | 空（回退 `JWT_SECRET`） | 凭证 HMAC 指纹密钥，防离线枚举邮箱/openid；轮换会使旧绑定无法被检索 |
| `TOKEN_TTL_HOURS` | `720` | token 有效期 |
| `MAX_SAVE_BYTES` | `1048576` | 单份存档上限，超限 413 |
| `SNAPSHOT_KEEP` | `10` | 每账号保留快照份数 |
| `CORS_ORIGINS` | `*` | 逗号分隔白名单，生产填前端域名 |
| `ANALYTICS_MAX_BATCH` / `ANALYTICS_MAX_PROPS_BYTES` | `500` / `8192` | 埋点批量与单条 props 上限 |
| `AUDIT_*` / `TRUST_PENALTY_PER_WARNING` | 见配置 | 增幅审计参数（速率 / 宽容倍数 / 扣分） |
| `ACCEPT_ANY_EMAIL_CODE` / `EMAIL_CODE_PLACEHOLDER` | `true` / `123456` | 邮箱验证码占位模式；接真实短信 / 邮件服务后置 false |

## 接口表（PRD 43）

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 无 | `{status, time, version}` |
| POST | `/auth/guest` | 无 | 建游客；带 `device_id` 时同设备幂等返回原账号（`is_new=false`）。响应 `{token, user_id, is_new, created_at, device_id}` |
| POST | `/auth/bind` | Bearer | `{provider, credential, code?}` 绑定当前账号；凭证已绑其他账号 → 409。邮箱需 4~6 位数字 `code`（占位校验） |
| POST | `/auth/login` | 无 | `{provider, credential, code?}` 登录，返回 `{token, user_id, created_at, is_guest}`；未绑定 → 401 |
| GET | `/save` | Bearer | `{save, version, updated_at}`；无存档 → 404 |
| POST | `/save` | Bearer | `{save, base_version, client_updated_at?}`；版本不一致 → 409 + 服务端存档；成功 version+1 并留快照，返回 `{version, updated_at, size_bytes, suspicious, warnings}`；超限 → 413 |
| POST | `/analytics/events` | 可选 | `{events:[{name, ts?, props?, session_id?}]}`；未知事件名照收 `unknown=true`，带 token 关联账号，返回 `{accepted, unknown, server_time}` |

埋点名单（PRD 49，共 14 个事件名）：`login` `idle_claim` `stage_start` `stage_end` `boss_fail`
`equip_change` `loadout_switch` `story_enter` `story_choice` `encounter_trigger` `realm_enter_exit`
`offline_duration` `realm_breakthrough` `last_page_before_leave`。

### 云存档语义（PRD 3.3）

- **服务端权威**：`version` 由服务端维护，客户端每次写入必须带 `base_version`；不等于服务端版本即 409，
  响应携带 `server_save`，客户端应整体采纳服务端状态。
- **写入事务**：POST /save 全程单事务（PostgreSQL 上行级锁），成功才 `version+1` 并追加
  `save_snapshots`，按 `SNAPSHOT_KEEP` 只保留最近 N 份；异常回滚。
- **增幅审计**：对比上一版存档，`stone` / `cultivation` 增量超过「按关卡速率 × 有效时长 × 宽容倍数」
  上限、或 `immortalJade` 超过固定额度时：不返回 4xx，而是 `suspicious=true` + `warnings` 数组 +
  扣减 `users.trust_score`（长期信号，正常存档缓慢恢复）。审计为纯函数（`app/audit.py`），可单测。
- **剧情关键状态**：`story.flags / seenNodes / npcs / karma / realmRun` 等随完整 GameSave JSON
  存在 `player_saves.save_json`（JSONB），不入库前做结构解析。

## 目录结构

```text
server/
  app/
    config.py        # pydantic-settings 配置（SQLite 默认，生产 PostgreSQL）
    db.py            # engine / session / Base / init_db（JSONB→JSON 方言适配）
    models.py        # users / auth_accounts / player_saves / save_snapshots / analytics_events
    schemas.py       # pydantic 请求 / 响应模型
    security.py      # JWT、凭证 HMAC 指纹与掩码（无明文；bcrypt 供未来密码型凭证）
    audit.py         # 存档增幅审计（独立可测的纯函数）
    routers/         # auth.py / save.py / analytics.py
    main.py          # FastAPI 装配（CORS / 路由 / /health）
  sql/schema.sql     # PostgreSQL DDL（与 models 一致，供 DBA 直接建表）
  tests/test_api.py  # pytest + TestClient（SQLite 内存库）
  docker-compose.yml # postgres:16 + api（可选）
```

## 部署建议（Render / Railway + Neon）

1. **数据库（Neon）**：创建 Postgres 项目，连接串形如
   `postgresql+psycopg://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require`，填入 `DATABASE_URL`。
   可先用 `psql "$DATABASE_URL" -f sql/schema.sql` 建表（应用启动也会自动 `create_all`）。
2. **服务（Render）**：New → Web Service，Root Directory 填 `server`，
   Build Command：`pip install -r requirements.txt`，
   Start Command：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`。
   Environment 配 `DATABASE_URL` / `JWT_SECRET`（随机 32 字节）/ `CORS_ORIGINS`（前端域名）。
   免费实例会休眠，冷启动约 30s；`/health` 可用于 Uptime 探活。
3. **Railway**：等同 Render；也可用仓库内 `docker-compose.yml`（Railway 需把 api 服务指向
   `server/` 目录并注入 `DATABASE_URL`）。
4. **线上注意**：
   - `JWT_SECRET` 必须更换且不随镜像分发；换密钥会让全部旧 token 失效（用户重新 `/auth/guest` 或登录）。
   - 在反代 / 平台层限制请求体大小（如 nginx `client_max_body_size 2m`），与应用内
     `MAX_SAVE_BYTES`（413）双保险。
   - 建议对 Postgres 做定期快照（Neon 自带 PITR），`save_snapshots` 是应用级回滚兜底。
   - 多实例部署时无需共享状态：鉴权无状态（JWT），存档行锁在数据库层。
