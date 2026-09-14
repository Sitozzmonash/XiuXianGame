"""server 端 API 集成测试：SQLite 内存库 + TestClient，本机离线可跑。

覆盖：guest 幂等 / bind 后登录且不丢档 / save 版本冲突 409 / 超限 413 /
埋点批量入库与 unknown 标记 / 未带 token 401 / 增幅审计函数。
运行：cd server && python -m pytest tests -q
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.audit import audit_save_growth, effective_elapsed_seconds
from app.config import get_settings
from app.db import Base, get_db
from app.main import app
from app.models import AnalyticsEvent, AuthAccount, SaveSnapshot, User

# ------------------------------------------------------------------ #
# 测试基座
# ------------------------------------------------------------------ #


@pytest.fixture()
def session_factory() -> Generator[sessionmaker, None, None]:
    """每个测试一个 SQLite 内存库（StaticPool 保证同一连接）。"""
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    yield factory
    engine.dispose()


@pytest.fixture()
def client(session_factory: sessionmaker) -> Generator[TestClient, None, None]:
    """TestClient，数据库依赖替换为内存库。"""

    def override_get_db() -> Generator[Session, None, None]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def settings_overrides():
    """临时覆盖配置项，测试结束自动还原。"""
    settings = get_settings()
    saved: dict[str, object] = {}

    def apply(**values: object) -> None:
        for key, value in values.items():
            if key not in saved:
                saved[key] = getattr(settings, key)
            setattr(settings, key, value)

    yield apply
    for key, value in saved.items():
        setattr(settings, key, value)


# ------------------------------------------------------------------ #
# 工具函数
# ------------------------------------------------------------------ #


def make_save(
    *,
    stone: int = 100,
    cultivation: int = 0,
    immortal_jade: int = 0,
    max_stage: int = 1,
    updated_at: int = 0,
) -> dict:
    """构造一份近似前端 GameSave 的存档 JSON。"""
    return {
        "version": 1,
        "createdAt": 0,
        "updatedAt": updated_at,
        "profile": {
            "name": "测试道友",
            "stageId": "qi_1",
            "realmId": "qi_refining",
            "cultivation": cultivation,
            "level": 1,
            "spiritRoot": {"quality": "single", "elements": {"fire": 1}},
            "school": "sword",
        },
        "resources": {"stone": stone, "immortalJade": immortal_jade, "sectContribution": 0},
        "progress": {
            "stage": 1,
            "mapStage": 1,
            "mapId": "qingshi_village",
            "maxStage": max_stage,
            "stableStage": 1,
            "mapProgress": {},
            "clearedRealms": [],
        },
        "story": {
            "flags": {"first_encounter": 1},
            "seenNodes": ["prologue"],
            "pending": [],
            "encounterCooldown": 0,
            "encounterHistory": [],
            "chapterStage": 1,
        },
    }


def guest(client: TestClient, device_id: str | None = None) -> dict:
    """调 /auth/guest 并返回响应 JSON。"""
    body = {"device_id": device_id} if device_id else {}
    response = client.post("/auth/guest", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def headers(token: str) -> dict[str, str]:
    """Bearer 头。"""
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------ #
# /health
# ------------------------------------------------------------------ #


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert body["time"].endswith("Z")


# ------------------------------------------------------------------ #
# /auth/guest 幂等
# ------------------------------------------------------------------ #


def test_guest_is_idempotent_by_device_id(client: TestClient) -> None:
    first = guest(client, "device-aaa")
    assert first["is_new"] is True

    second = guest(client, "device-aaa")
    assert second["user_id"] == first["user_id"]
    assert second["is_new"] is False
    assert second["device_id"] == "device-aaa"

    # 返回的 token 可用
    response = client.get("/save", headers=headers(second["token"]))
    assert response.status_code == 404  # 能通过鉴权，只是还没有存档


def test_guest_without_device_id_creates_separate_accounts(client: TestClient) -> None:
    first = guest(client)
    second = guest(client)
    assert first["is_new"] and second["is_new"]
    assert first["user_id"] != second["user_id"]
    assert first["device_id"].startswith("dev_")


# ------------------------------------------------------------------ #
# 鉴权 401
# ------------------------------------------------------------------ #


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/save", None),
        ("post", "/save", {"save": make_save(), "base_version": 0}),
        ("post", "/auth/bind", {"provider": "wechat", "credential": "wx_x"}),
    ],
)
def test_endpoints_require_token(client: TestClient, method: str, path: str, body: dict | None) -> None:
    kwargs = {"json": body} if body is not None else {}
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"


def test_invalid_token_rejected(client: TestClient) -> None:
    response = client.get("/save", headers=headers("not-a-jwt"))
    assert response.status_code == 401


# ------------------------------------------------------------------ #
# /save 主流程：首次上传 + 版本递增 + 冲突 409
# ------------------------------------------------------------------ #


def test_save_first_upload_then_version_increment(client: TestClient) -> None:
    token = guest(client, "device-save-1")["token"]

    first_save = make_save(stone=100)
    response = client.post(
        "/save",
        json={"save": first_save, "base_version": 0, "client_updated_at": 0},
        headers=headers(token),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["version"] == 1
    assert body["suspicious"] is False
    assert body["warnings"] == []
    assert body["size_bytes"] > 0

    fetched = client.get("/save", headers=headers(token))
    assert fetched.status_code == 200
    assert fetched.json()["version"] == 1
    assert fetched.json()["save"]["resources"]["stone"] == 100

    second_save = make_save(stone=160, cultivation=20, updated_at=60_000)
    response = client.post(
        "/save",
        json={"save": second_save, "base_version": 1, "client_updated_at": 60_000},
        headers=headers(token),
    )
    assert response.status_code == 200
    assert response.json()["version"] == 2
    assert response.json()["suspicious"] is False

    fetched = client.get("/save", headers=headers(token))
    assert fetched.json()["version"] == 2
    assert fetched.json()["save"]["resources"]["stone"] == 160


def test_save_conflict_409_returns_server_save(client: TestClient) -> None:
    token = guest(client, "device-save-2")["token"]
    client.post("/save", json={"save": make_save(stone=100), "base_version": 0}, headers=headers(token))
    client.post(
        "/save",
        json={"save": make_save(stone=160), "base_version": 1, "client_updated_at": 60_000},
        headers=headers(token),
    )

    # 用过期的 base_version 再传（模拟多端同时写）
    response = client.post(
        "/save",
        json={"save": make_save(stone=999999, cultivation=1), "base_version": 1, "client_updated_at": 120_000},
        headers=headers(token),
    )
    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "save_conflict"
    assert body["server_version"] == 2
    assert body["server_save"]["resources"]["stone"] == 160  # 服务端权威

    # 服务端存档未被覆盖
    fetched = client.get("/save", headers=headers(token))
    assert fetched.json()["version"] == 2
    assert fetched.json()["save"]["resources"]["stone"] == 160


def test_save_conflict_when_no_server_save_but_base_version_nonzero(client: TestClient) -> None:
    token = guest(client, "device-save-3")["token"]
    response = client.post(
        "/save",
        json={"save": make_save(), "base_version": 3},
        headers=headers(token),
    )
    assert response.status_code == 409
    assert response.json()["server_version"] is None


def test_save_returns_404_before_first_upload(client: TestClient) -> None:
    token = guest(client, "device-save-4")["token"]
    response = client.get("/save", headers=headers(token))
    assert response.status_code == 404


# ------------------------------------------------------------------ #
# /save 体积限制 413
# ------------------------------------------------------------------ #


def test_save_too_large_returns_413(client: TestClient, settings_overrides) -> None:
    settings_overrides(max_save_bytes=512)
    token = guest(client, "device-big")["token"]
    huge_save = make_save()
    huge_save["log"] = [{"id": str(i), "text": "x" * 50} for i in range(50)]

    response = client.post(
        "/save",
        json={"save": huge_save, "base_version": 0},
        headers=headers(token),
    )
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "save_too_large"


# ------------------------------------------------------------------ #
# 快照保留
# ------------------------------------------------------------------ #


def test_snapshot_keep_limit(client: TestClient, session_factory: sessionmaker, settings_overrides) -> None:
    settings_overrides(snapshot_keep=2)
    info = guest(client, "device-snap")
    token = info["token"]

    version = 0
    for i in range(4):
        response = client.post(
            "/save",
            json={"save": make_save(stone=100 + i, updated_at=i * 60_000), "base_version": version},
            headers=headers(token),
        )
        assert response.status_code == 200
        version = response.json()["version"]

    with session_factory() as session:
        versions = list(
            session.scalars(
                select(SaveSnapshot.version)
                .where(SaveSnapshot.user_id == info["user_id"])
                .order_by(SaveSnapshot.version)
            )
        )
    assert versions == [3, 4]  # 只保留最近 2 份


# ------------------------------------------------------------------ #
# 绑定 / 登录
# ------------------------------------------------------------------ #


def test_bind_then_login_keeps_save(client: TestClient) -> None:
    info = guest(client, "device-bind-1")
    token = info["token"]
    client.post("/save", json={"save": make_save(stone=300), "base_version": 0}, headers=headers(token))

    bind = client.post(
        "/auth/bind",
        json={"provider": "wechat", "credential": "wx_openid_abc123"},
        headers=headers(token),
    )
    assert bind.status_code == 200, bind.text
    assert bind.json()["already_bound"] is False
    assert bind.json()["credential_masked"].startswith("wx:***")

    login = client.post("/auth/login", json={"provider": "wechat", "credential": "wx_openid_abc123"})
    assert login.status_code == 200
    assert login.json()["user_id"] == info["user_id"]
    assert login.json()["is_guest"] is False

    # 新 token 能读到绑定前的存档（绑定不丢档）
    fetched = client.get("/save", headers=headers(login.json()["token"]))
    assert fetched.status_code == 200
    assert fetched.json()["save"]["resources"]["stone"] == 300


def test_bind_same_credential_twice_is_idempotent(client: TestClient) -> None:
    token = guest(client, "device-bind-2")["token"]
    payload = {"provider": "qq", "credential": "qq_openid_zzz"}
    first = client.post("/auth/bind", json=payload, headers=headers(token))
    second = client.post("/auth/bind", json=payload, headers=headers(token))
    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["already_bound"] is False
    assert second.json()["already_bound"] is True


def test_bind_conflict_409(client: TestClient) -> None:
    token_a = guest(client, "device-bind-a")["token"]
    token_b = guest(client, "device-bind-b")["token"]
    assert (
        client.post(
            "/auth/bind",
            json={"provider": "wechat", "credential": "wx_shared_id"},
            headers=headers(token_a),
        ).status_code
        == 200
    )

    response = client.post(
        "/auth/bind",
        json={"provider": "wechat", "credential": "wx_shared_id"},
        headers=headers(token_b),
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "credential_already_bound"


def test_login_not_bound_returns_401(client: TestClient) -> None:
    response = client.post("/auth/login", json={"provider": "qq", "credential": "qq_never_bound"})
    assert response.status_code == 401


def test_email_bind_and_login_with_code(client: TestClient) -> None:
    token = guest(client, "device-mail")["token"]
    # 邮箱格式错误
    bad = client.post(
        "/auth/bind",
        json={"provider": "email", "credential": "not-an-email", "code": "123456"},
        headers=headers(token),
    )
    assert bad.status_code == 400
    # 验证码缺失
    no_code = client.post(
        "/auth/bind",
        json={"provider": "email", "credential": "dao@example.com"},
        headers=headers(token),
    )
    assert no_code.status_code == 400
    # 正常绑定（占位校验接受任意 4~6 位数字）
    ok = client.post(
        "/auth/bind",
        json={"provider": "email", "credential": "Dao@Example.com", "code": "1234"},
        headers=headers(token),
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["credential_masked"] == "da***@example.com"

    login = client.post(
        "/auth/login",
        json={"provider": "email", "credential": "dao@example.com", "code": "5678"},
    )
    assert login.status_code == 200


def test_email_code_placeholder_strict_mode(client: TestClient, settings_overrides) -> None:
    settings_overrides(accept_any_email_code=False, email_code_placeholder="123456")
    token = guest(client, "device-mail-strict")["token"]
    wrong = client.post(
        "/auth/bind",
        json={"provider": "email", "credential": "dao2@example.com", "code": "999999"},
        headers=headers(token),
    )
    assert wrong.status_code == 400
    right = client.post(
        "/auth/bind",
        json={"provider": "email", "credential": "dao2@example.com", "code": "123456"},
        headers=headers(token),
    )
    assert right.status_code == 200


def test_credentials_stored_hashed_and_masked(
    client: TestClient, session_factory: sessionmaker
) -> None:
    token = guest(client, "device-hash")["token"]
    client.post(
        "/auth/bind",
        json={"provider": "wechat", "credential": "wx_secret_openid"},
        headers=headers(token),
    )
    with session_factory() as session:
        account = session.scalar(select(AuthAccount))
    assert account is not None
    assert "wx_secret_openid" not in account.credential_hash  # 不存明文
    assert len(account.credential_hash) == 64  # HMAC-SHA256 指纹（确定性，可建唯一索引）
    assert "secret" not in account.credential_masked
    assert account.credential_masked == "wx:***enid"

    # 指纹确定性 + provider 隔离：登录 / 唯一约束依赖此性质
    from app.security import credential_fingerprint

    assert credential_fingerprint("wechat", "wx_secret_openid") == account.credential_hash
    assert credential_fingerprint("qq", "same-id") != credential_fingerprint("wechat", "same-id")


def test_bcrypt_helpers_for_password_style_credentials() -> None:
    """bcrypt 工具函数（未来邮箱+密码 / 服务端口令）可用且校验严格。"""
    from app.security import hash_credential, verify_credential

    hashed = hash_credential("s3cret-pass")
    assert hashed.startswith("$2")
    assert verify_credential("s3cret-pass", hashed) is True
    assert verify_credential("wrong-pass", hashed) is False


# ------------------------------------------------------------------ #
# 埋点
# ------------------------------------------------------------------ #


def test_analytics_batch_ingest_and_unknown_marked(
    client: TestClient, session_factory: sessionmaker
) -> None:
    info = guest(client, "device-evt")
    token = info["token"]
    payload = {
        "events": [
            {"name": "login", "ts": 1_700_000_000_000, "props": {"provider": "guest"}, "session_id": "s-1"},
            {"name": "idle_claim", "ts": 1_700_000_001_000, "props": {"seconds": 3600}},
            {"name": "stage_start", "ts": 1_700_000_002_000},
            {"name": "story_choice", "ts": 1_700_000_003_000, "props": {"node": "village_1", "choice": "help"}},
            {"name": "realm_breakthrough", "ts": 1_700_000_004_000},
            {"name": "自定义事件", "ts": 1_700_000_005_000},
            {"name": "totally_unknown_event"},
        ]
    }
    response = client.post("/analytics/events", json=payload, headers=headers(token))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["accepted"] == 7
    assert body["unknown"] == 2

    with session_factory() as session:
        total = session.scalar(select(func.count()).select_from(AnalyticsEvent))
        unknown_rows = list(session.scalars(select(AnalyticsEvent.name).where(AnalyticsEvent.unknown.is_(True))))
        linked = session.scalar(select(AnalyticsEvent.user_id).where(AnalyticsEvent.name == "login"))
        default_ts = session.scalar(select(AnalyticsEvent.ts).where(AnalyticsEvent.name == "totally_unknown_event"))
    assert total == 7
    assert sorted(unknown_rows) == ["totally_unknown_event", "自定义事件"]
    assert linked == info["user_id"]  # 带 token 时关联账号
    assert default_ts > 0  # 未带 ts 时用服务端时间补齐


def test_analytics_accepts_anonymous(client: TestClient, session_factory: sessionmaker) -> None:
    response = client.post(
        "/analytics/events",
        json={"events": [{"name": "last_page_before_leave", "props": {"page": "/map"}}]},
    )
    assert response.status_code == 200
    with session_factory() as session:
        row = session.scalar(select(AnalyticsEvent))
    assert row is not None and row.user_id is None and row.unknown is False


def test_analytics_batch_limit(client: TestClient, settings_overrides) -> None:
    settings_overrides(analytics_max_batch=2)
    response = client.post(
        "/analytics/events",
        json={"events": [{"name": "login"}, {"name": "idle_claim"}, {"name": "stage_start"}]},
    )
    assert response.status_code == 422


def test_analytics_rejects_empty_batch(client: TestClient) -> None:
    response = client.post("/analytics/events", json={"events": []})
    assert response.status_code == 422


# ------------------------------------------------------------------ #
# 增幅审计（PRD 43）
# ------------------------------------------------------------------ #


def test_audit_flags_huge_gain_via_api(client: TestClient, session_factory: sessionmaker) -> None:
    info = guest(client, "device-cheat")
    token = info["token"]
    client.post("/save", json={"save": make_save(stone=100), "base_version": 0}, headers=headers(token))

    response = client.post(
        "/save",
        json={
            "save": make_save(stone=100 + 10**9, updated_at=60_000),
            "base_version": 1,
            "client_updated_at": 60_000,
        },
        headers=headers(token),
    )
    assert response.status_code == 200  # 不直接 4xx，只标记
    body = response.json()
    assert body["suspicious"] is True
    assert len(body["warnings"]) == 1
    assert body["warnings"][0]["resource"] == "stone"
    assert body["warnings"][0]["code"] == "gain_exceeds_cap"

    with session_factory() as session:
        user = session.get(User, info["user_id"])
    assert user is not None and user.trust_score < 100  # 信任分被扣


def test_audit_normal_growth_passes(client: TestClient) -> None:
    token = guest(client, "device-normal")["token"]
    client.post("/save", json={"save": make_save(stone=100), "base_version": 0}, headers=headers(token))
    response = client.post(
        "/save",
        json={
            "save": make_save(stone=150, cultivation=300, updated_at=60_000),
            "base_version": 1,
            "client_updated_at": 60_000,
        },
        headers=headers(token),
    )
    assert response.status_code == 200
    assert response.json()["suspicious"] is False
    assert response.json()["warnings"] == []


def test_audit_spending_is_not_flagged() -> None:
    settings = get_settings()
    prev = make_save(stone=100_000, cultivation=50_000)
    new = make_save(stone=10, cultivation=0)
    assert audit_save_growth(prev, new, 10.0, settings) == []


def test_audit_first_upload_has_no_baseline() -> None:
    settings = get_settings()
    assert audit_save_growth(None, make_save(stone=10**12), 0.0, settings) == []


def test_audit_uses_stage_and_elapsed_scale() -> None:
    settings = get_settings()
    prev = make_save(stone=0, cultivation=0, max_stage=100)
    # 第 100 关挂机 1 小时：上限 = (1 + 100*0.5) * 3600 * 3
    within = make_save(stone=545_000, cultivation=0, max_stage=100)
    assert audit_save_growth(prev, within, 3600.0, settings) == []
    beyond = make_save(stone=10_000_000, cultivation=0, max_stage=100)
    warnings = audit_save_growth(prev, beyond, 3600.0, settings)
    assert [w["resource"] for w in warnings] == ["stone"]


def test_effective_elapsed_clamps_client_clock() -> None:
    settings = get_settings()
    # 客户端谎报 24h，服务端只经过 60s：最多放宽 clock_slack(600s) + grace(120s)
    elapsed = effective_elapsed_seconds(60.0, 86_400.0, settings)
    assert elapsed == pytest.approx(60.0 + 600.0 + 120.0)
    # 服务端时间更长时以服务端为准
    assert effective_elapsed_seconds(9000.0, 10.0, settings) == pytest.approx(9000.0 + 120.0)


# ------------------------------------------------------------------ #
# /auth/register + /auth/login（站内账号）+ /auth/me
# ------------------------------------------------------------------ #


def register(client: TestClient, username: str, password: str = "pass1234") -> dict:
    """调 /auth/register 并返回响应 JSON。"""
    response = client.post("/auth/register", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def test_register_then_me(client: TestClient) -> None:
    body = register(client, "yunsong")
    assert body["username"] == "yunsong"
    assert body["is_admin"] is False

    me = client.get("/auth/me", headers=headers(body["token"]))
    assert me.status_code == 200
    assert me.json()["username"] == "yunsong"
    assert me.json()["is_guest"] is False
    assert me.json()["providers"] == []


def test_register_rejects_duplicate_username(client: TestClient) -> None:
    register(client, "yunsong")
    dup = client.post("/auth/register", json={"username": "yunsong", "password": "pass1234"})
    assert dup.status_code == 409
    assert dup.json()["detail"]["code"] == "username_taken"


@pytest.mark.parametrize(
    "username,password,code",
    [
        ("ab", "pass1234", "invalid_username"),
        ("has space", "pass1234", "invalid_username"),
        ("yunsong", "123", "invalid_password"),
    ],
)
def test_register_validates_input(client: TestClient, username: str, password: str, code: str) -> None:
    response = client.post("/auth/register", json={"username": username, "password": password})
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == code


def test_register_after_guest_does_not_collide_on_device_id(
    client: TestClient, session_factory: sessionmaker
) -> None:
    """回归：注册不能复用游客的 device_id，否则会撞唯一索引被误报成「用户名已占用」。"""
    guest_body = guest(client, "device-shared")
    account = register(client, "yunsong")

    session = session_factory()
    try:
        me = session.scalar(select(User).where(User.username == "yunsong"))
        guest_user = session.scalar(select(User).where(User.device_id == "device-shared"))
        assert me is not None and guest_user is not None
        assert me.id != guest_user.id
        assert me.device_id != guest_user.device_id
    finally:
        session.close()

    assert account["user_id"] != guest_body["user_id"]


def test_password_login_and_wrong_password(client: TestClient) -> None:
    register(client, "yunsong", "pass1234")

    ok = client.post(
        "/auth/login",
        json={"provider": "password", "credential": "yunsong", "password": "pass1234"},
    )
    assert ok.status_code == 200
    assert ok.json()["username"] == "yunsong"

    bad = client.post(
        "/auth/login",
        json={"provider": "password", "credential": "yunsong", "password": "nope"},
    )
    assert bad.status_code == 401
    assert bad.json()["detail"]["code"] == "bad_credentials"

    # 不存在的用户名与错误密码返回同一错误码，避免枚举账号
    missing = client.post(
        "/auth/login",
        json={"provider": "password", "credential": "nobody", "password": "pass1234"},
    )
    assert missing.status_code == 401
    assert missing.json()["detail"]["code"] == "bad_credentials"


def test_password_is_not_stored_in_plaintext(
    client: TestClient, session_factory: sessionmaker
) -> None:
    register(client, "yunsong", "pass1234")
    session = session_factory()
    try:
        user = session.scalar(select(User).where(User.username == "yunsong"))
        assert user is not None
        assert user.password_hash and user.password_hash != "pass1234"
        assert user.password_hash.startswith("$2")  # bcrypt
    finally:
        session.close()


def test_me_requires_valid_token(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers=headers("bad.token.value")).status_code == 401


def test_login_reports_has_save(client: TestClient) -> None:
    """has_save 让客户端跳过注定 404 的探测请求，必须如实反映云端是否有存档。"""
    account = register(client, "yunsong")
    assert account["has_save"] is False

    login = client.post(
        "/auth/login",
        json={"provider": "password", "credential": "yunsong", "password": "pass1234"},
    )
    assert login.status_code == 200
    assert login.json()["has_save"] is False

    pushed = client.post(
        "/save",
        json={"save": make_save(stone=42), "base_version": 0},
        headers=headers(account["token"]),
    )
    assert pushed.status_code == 200

    again = client.post(
        "/auth/login",
        json={"provider": "password", "credential": "yunsong", "password": "pass1234"},
    )
    assert again.json()["has_save"] is True


def test_account_save_is_separate_from_guest(client: TestClient) -> None:
    """站内账号与游客档互不影响：各自读写自己的云存档。"""
    guest_body = guest(client, "device-sep")
    account = register(client, "yunsong")

    pushed = client.post(
        "/save",
        json={"save": make_save(stone=777), "base_version": 0},
        headers=headers(account["token"]),
    )
    assert pushed.status_code == 200

    mine = client.get("/save", headers=headers(account["token"]))
    assert mine.status_code == 200
    assert mine.json()["save"]["resources"]["stone"] == 777

    # 游客账号仍没有存档
    assert client.get("/save", headers=headers(guest_body["token"])).status_code == 404


# ------------------------------------------------------------------ #
# /leaderboard 仙缘榜
# ------------------------------------------------------------------ #


def ranked_save(stage: int, power: int, name: str, realm_index: int = 1) -> dict:
    """带排行摘要的存档（rank 由客户端在上传前写入）。"""
    save = make_save(max_stage=stage)
    save["progress"]["maxStage"] = stage
    save["rank"] = {
        "name": name,
        "power": power,
        "realmIndex": realm_index,
        "realmLabel": "炼气三层",
        "stageLabel": f"第 {stage} 关",
    }
    return save


def push(client: TestClient, token: str, save: dict) -> None:
    response = client.post("/save", json={"save": save, "base_version": 0}, headers=headers(token))
    assert response.status_code == 200, response.text


def test_leaderboard_orders_by_stage_and_marks_self(client: TestClient) -> None:
    low = guest(client, "dev-low")
    high = guest(client, "dev-high")
    me = guest(client, "dev-me")
    push(client, low["token"], ranked_save(10, 1000, "小修士"))
    push(client, high["token"], ranked_save(50, 900, "大修士"))
    push(client, me["token"], ranked_save(30, 5000, "我自己"))

    response = client.get("/leaderboard?board=stage", headers=headers(me["token"]))
    assert response.status_code == 200
    body = response.json()
    assert body["board"] == "stage"
    assert [e["name"] for e in body["entries"]] == ["大修士", "我自己", "小修士"]
    assert [e["rank"] for e in body["entries"]] == [1, 2, 3]
    assert body["total"] == 3
    assert body["me"]["rank"] == 2
    assert body["me"]["is_self"] is True
    assert sum(1 for e in body["entries"] if e["is_self"]) == 1


def test_leaderboard_power_and_realm_boards(client: TestClient) -> None:
    a = guest(client, "dev-a")
    b = guest(client, "dev-b")
    push(client, a["token"], ranked_save(10, 100, "甲", realm_index=1))
    push(client, b["token"], ranked_save(5, 9999, "乙", realm_index=3))

    power = client.get("/leaderboard?board=power").json()
    assert [e["name"] for e in power["entries"]] == ["乙", "甲"]

    realm = client.get("/leaderboard?board=realm").json()
    assert [e["name"] for e in realm["entries"]] == ["乙", "甲"]


def test_leaderboard_honours_limit_and_skips_empty_saves(client: TestClient) -> None:
    tokens = [guest(client, f"dev-{i}")["token"] for i in range(4)]
    for i, token in enumerate(tokens):
        push(client, token, ranked_save(i + 1, 0, f"修士{i}"))

    # 只有游客登录、从未上传存档的账号不应占榜位
    idle = guest(client, "dev-idle")
    body = client.get("/leaderboard?board=stage&limit=2").json()
    assert len(body["entries"]) == 2
    assert body["total"] == 4
    assert all(e["name"] != f"游客{idle['user_id']}" for e in body["entries"])


def test_leaderboard_works_without_token(client: TestClient) -> None:
    body = client.get("/leaderboard").json()
    assert body["entries"] == []
    assert body["me"] is None


def test_leaderboard_rejects_unknown_board(client: TestClient) -> None:
    assert client.get("/leaderboard?board=bogus").status_code == 422


# ------------------------------------------------------------------ #
# 旧库升级：create_all 不会 ALTER，_ensure_columns 必须补上后加的列
# ------------------------------------------------------------------ #


def test_ensure_columns_upgrades_legacy_users_table(tmp_path, monkeypatch) -> None:
    """模拟线上已存在的旧表（Neon）：建表语句是加列之前的老版本。"""
    from sqlalchemy import create_engine, inspect, text

    from app import db as db_module

    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE users (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id    VARCHAR(128) UNIQUE,
                    is_guest     BOOLEAN NOT NULL DEFAULT 1,
                    created_at   DATETIME NOT NULL,
                    last_seen_at DATETIME NOT NULL,
                    trust_score  INTEGER NOT NULL DEFAULT 100
                )
                """
            )
        )
        conn.execute(text("INSERT INTO users (device_id, created_at, last_seen_at) VALUES ('old-dev', '2026-01-01', '2026-01-01')"))

    monkeypatch.setattr(db_module, "engine", engine)
    db_module._ensure_columns()

    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    assert {"username", "password_hash", "is_admin"} <= columns

    # 旧数据必须原样保留，且新列取到默认值
    with engine.begin() as conn:
        row = conn.execute(text("SELECT device_id, is_admin FROM users")).one()
    assert row[0] == "old-dev"
    assert row[1] in (0, False)

    # 幂等：重复执行不报错
    db_module._ensure_columns()
    assert {c["name"] for c in inspect(engine).get_columns("users")} == columns
    engine.dispose()


# ------------------------------------------------------------------ #
# 测试账号播种
# ------------------------------------------------------------------ #


def test_seed_admin_creates_and_is_idempotent(monkeypatch, session_factory) -> None:
    from app import seed as seed_module

    monkeypatch.setattr(seed_module, "SessionLocal", session_factory)

    seed_module.seed_admin()
    session = session_factory()
    try:
        admin = session.scalar(select(User).where(User.username == "admin"))
        assert admin is not None and admin.is_admin is True
        assert admin.password_hash and admin.password_hash != "admin"
        admin_id = admin.id

        # 重复播种不新建、不改密码
        seed_module.seed_admin()
        again = session.scalar(select(User).where(User.username == "admin"))
        assert again is not None and again.id == admin_id
        assert again.password_hash == admin.password_hash
    finally:
        session.close()


def test_seed_admin_can_be_disabled(monkeypatch, session_factory, settings_overrides) -> None:
    from app import seed as seed_module

    monkeypatch.setattr(seed_module, "SessionLocal", session_factory)
    settings_overrides(seed_admin_enabled=False)

    seed_module.seed_admin()
    session = session_factory()
    try:
        assert session.scalar(select(User).where(User.username == "admin")) is None
    finally:
        session.close()


def test_seeded_admin_can_log_in(monkeypatch, session_factory) -> None:
    """admin/admin 能真的登进来 —— 这是交付给用户的测试账号。"""
    from app import seed as seed_module

    monkeypatch.setattr(seed_module, "SessionLocal", session_factory)
    seed_module.seed_admin()

    def override_get_db() -> Generator[Session, None, None]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        # 不用 with：避免触发 lifespan 里的 init_db 去动本机 sqlite 文件；
        # 播种已在上面显式调用
        local_client = TestClient(app)
        response = local_client.post(
            "/auth/login",
            json={"provider": "password", "credential": "admin", "password": "admin"},
        )
        assert response.status_code == 200, response.text
        assert response.json()["is_admin"] is True

        me = local_client.get("/auth/me", headers=headers(response.json()["token"]))
        assert me.json()["is_admin"] is True
    finally:
        app.dependency_overrides.clear()
