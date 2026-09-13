-- ============================================================
-- 《凡尘问道》云存档后端 PostgreSQL DDL（PRD 42 摘要，与 app/models.py 保持一致）
-- 用法：psql "$DATABASE_URL" -f sql/schema.sql
-- 说明：应用启动时也会 create_all（幂等），本文件供 DBA 直接建表 / 审阅。
-- ============================================================

BEGIN;

-- 账号（游客与绑定后正式账号同一行，绑定不丢档）
CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL   PRIMARY KEY,
    device_id    VARCHAR(128) UNIQUE,
    is_guest     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    trust_score  INTEGER     NOT NULL DEFAULT 100
);

-- 第三方凭证绑定（只存哈希 + 掩码，禁止明文）
CREATE TABLE IF NOT EXISTS auth_accounts (
    id                BIGSERIAL    PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider          VARCHAR(16)  NOT NULL,               -- wechat | qq | email
    credential_hash   VARCHAR(255) NOT NULL,
    credential_masked VARCHAR(128) NOT NULL,
    bound_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_auth_provider_credential UNIQUE (provider, credential_hash)
);
CREATE INDEX IF NOT EXISTS ix_auth_accounts_user_id ON auth_accounts (user_id);

-- 云存档主表（save_json 即前端 GameSave 完整 JSON，含剧情关键状态）
CREATE TABLE IF NOT EXISTS player_saves (
    user_id     BIGINT      PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    version     INTEGER     NOT NULL DEFAULT 0,
    save_json   JSONB       NOT NULL,
    size_bytes  INTEGER     NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    suspicious  BOOLEAN     NOT NULL DEFAULT FALSE,
    warnings    JSONB
);

-- 存档快照（每次成功写入留一份，仅保留最近 N 份）
CREATE TABLE IF NOT EXISTS save_snapshots (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    version    INTEGER     NOT NULL,
    save_json  JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_save_snapshots_user_version ON save_snapshots (user_id, version);

-- 埋点事件（PRD 49；未知事件名照收并标记 unknown）
CREATE TABLE IF NOT EXISTS analytics_events (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      REFERENCES users (id) ON DELETE SET NULL,
    session_id VARCHAR(64),
    name       VARCHAR(64) NOT NULL,
    ts         BIGINT      NOT NULL,                       -- 客户端毫秒时间戳
    props      JSONB,
    unknown    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_analytics_events_user_id ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS ix_analytics_events_name ON analytics_events (name);
CREATE INDEX IF NOT EXISTS ix_analytics_events_ts ON analytics_events (ts);

COMMIT;
