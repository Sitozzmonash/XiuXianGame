"""数据库引擎 / 会话 / Base 与初始化工具。

默认 SQLite（本机零依赖跑测试），生产通过 DATABASE_URL 切 PostgreSQL：
    postgresql+psycopg://user:pass@host:5432/dbname
"""

from collections.abc import Generator

from sqlalchemy import BigInteger, Integer, create_engine, inspect, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import JSON

from app.config import get_settings


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""


# PostgreSQL 落 JSONB（索引/查询友好），SQLite 退化为 JSON
JSONType = JSON().with_variant(JSONB(), "postgresql")
# SQLite 只有 INTEGER 主键才自增，PostgreSQL 用 BIGSERIAL
BigIntPK = BigInteger().with_variant(Integer, "sqlite")


def _engine_kwargs(url: str) -> dict:
    """按方言返回引擎参数：SQLite 需放开线程检查，PostgreSQL 开连接前探活。"""
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10}


def _normalize_url(url: str) -> str:
    """把 Neon / Heroku 等平台给出的 postgresql:// 或 postgres:// 规范化为 psycopg3 方言串。"""
    for scheme in ("postgresql://", "postgres://"):
        if url.startswith(scheme):
            return "postgresql+psycopg://" + url[len(scheme):]
    return url


def create_db_engine(url: str | None = None) -> Engine:
    """创建数据库引擎（不填 url 则用配置里的 DATABASE_URL）。"""
    url = _normalize_url(url or get_settings().database_url)
    return create_engine(url, **_engine_kwargs(url))


engine: Engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    """建表 + 补列（均幂等）；生产建议改用 sql/schema.sql 或迁移工具管理。"""
    from app import models  # noqa: F401  确保模型注册进 metadata

    Base.metadata.create_all(bind=engine)
    _ensure_columns()


def _ensure_columns() -> None:
    """给「已存在的旧表」补齐后加的列。

    create_all 只建缺失的表、不会 ALTER，所以线上先建过表的库（如 Neon）
    拿不到 User.username / password_hash / is_admin。这里按方言显式补列，
    只加不删不改，重复执行安全。
    """
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return
    existing = {col["name"] for col in inspector.get_columns("users")}
    is_sqlite = engine.dialect.name == "sqlite"
    additions = {
        "username": "VARCHAR(64)",
        "password_hash": "VARCHAR(255)",
        "is_admin": "BOOLEAN NOT NULL DEFAULT 0" if is_sqlite else "BOOLEAN NOT NULL DEFAULT FALSE",
    }
    pending = [f"ADD COLUMN {name} {ddl}" for name, ddl in additions.items() if name not in existing]
    if not pending:
        return
    with engine.begin() as conn:
        for clause in pending:
            conn.execute(text(f"ALTER TABLE users {clause}"))
        # username 需要唯一索引才能保证注册不重名；SQLite / PostgreSQL 都支持 IF NOT EXISTS
        conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)")
        )


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：提供请求级会话，请求结束自动关闭。"""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def supports_for_update(session: Session) -> bool:
    """SQLite 不支持 SELECT ... FOR UPDATE，PostgreSQL 支持（用于存档行并发锁）。"""
    return session.get_bind().dialect.name != "sqlite"


def commit_or_rollback(session: Session) -> None:
    """提交事务；失败时回滚并向上抛出，保证不留下脏会话。"""
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
