"""ORM 模型（PRD 42 摘要）：users / auth_accounts / player_saves / save_snapshots / analytics_events。

存档本体（GameSave，前端 lib/game/types.ts 的 JSON 形状）整体落在 player_saves.save_json，
其中剧情关键状态（story.flags / seenNodes / npcs / karma / realmRun 等）随之服务端保存。
"""

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, BigIntPK, JSONType


def utcnow() -> datetime:
    """当前 UTC 时间（统一带时区；SQLite 取出时为 naive，按 UTC 处理）。"""
    return datetime.now(timezone.utc)


def as_utc(dt: datetime) -> datetime:
    """把可能为 naive 的数据库时间视为 UTC，返回带时区对象。"""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def iso_utc(dt: datetime) -> str:
    """序列化为 ISO-8601 UTC 字符串（如 2026-09-13T10:00:00Z）。"""
    return as_utc(dt).astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


class User(Base):
    """账号：游客与绑定后的正式账号是同一行，仅 is_guest 变化（保证绑定不丢档）。"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    device_id: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    is_guest: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    # 100 为满分；增幅审计出 suspicious 时扣分（B12/B13 风控信号，不封号）
    trust_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    accounts: Mapped[list["AuthAccount"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    save: Mapped["PlayerSave | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )


class AuthAccount(Base):
    """第三方凭证绑定：只存哈希与掩码，绝不落明文。"""

    __tablename__ = "auth_accounts"
    __table_args__ = (Index("ix_auth_accounts_user_id", "user_id"),)

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)  # wechat | qq | email
    credential_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    credential_masked: Mapped[str] = mapped_column(String(128), nullable=False)
    bound_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="accounts")


class PlayerSave(Base):
    """云存档主表：一行一账号，version 为服务端权威版本号（乐观锁）。"""

    __tablename__ = "player_saves"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    save_json: Mapped[dict] = mapped_column(JSONType, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
    suspicious: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    warnings: Mapped[list | None] = mapped_column(JSONType, nullable=True)

    user: Mapped[User] = relationship(back_populates="save")


class SaveSnapshot(Base):
    """存档快照：每次成功写入留一份，仅保留最近 SNAPSHOT_KEEP 份（回滚 / 风控取证）。"""

    __tablename__ = "save_snapshots"
    __table_args__ = (Index("ix_save_snapshots_user_version", "user_id", "version"),)

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    save_json: Mapped[dict] = mapped_column(JSONType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class AnalyticsEvent(Base):
    """埋点事件（PRD 49）：未知事件名照收并标记 unknown=true。"""

    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    ts: Mapped[int] = mapped_column(BigInteger, nullable=False)  # 客户端毫秒时间戳
    props: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    unknown: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
