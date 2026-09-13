"""数据库引擎 / 会话 / Base 与初始化工具。

默认 SQLite（本机零依赖跑测试），生产通过 DATABASE_URL 切 PostgreSQL：
    postgresql+psycopg://user:pass@host:5432/dbname
"""

from collections.abc import Generator

from sqlalchemy import BigInteger, Integer, create_engine
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


def create_db_engine(url: str | None = None) -> Engine:
    """创建数据库引擎（不填 url 则用配置里的 DATABASE_URL）。"""
    url = url or get_settings().database_url
    return create_engine(url, **_engine_kwargs(url))


engine: Engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    """建表（幂等）；生产建议改用 sql/schema.sql 或迁移工具管理。"""
    from app import models  # noqa: F401  确保模型注册进 metadata

    Base.metadata.create_all(bind=engine)


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
