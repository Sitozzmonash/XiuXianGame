"""启动时幂等播种测试账号。

只创建、不覆盖：账号已存在时原样保留（改密码 / 改标记请走数据库或后续管理接口），
所以重复启动、多实例并发启动都不会重置任何人的存档或密码。
"""

import logging

from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.models import User, utcnow
from app.security import hash_credential

logger = logging.getLogger("fanchen.seed")


def seed_admin() -> None:
    """按配置创建 admin 测试账号（默认 admin/admin，is_admin=True）。"""
    settings = get_settings()
    if not settings.seed_admin_enabled:
        return
    username = settings.seed_admin_username.strip()
    if not username:
        return

    session = SessionLocal()
    try:
        existing = session.scalar(select(User).where(User.username == username))
        if existing is not None:
            # 老库里可能已存在同名账号但没打 admin 标记，这里补一下（不改密码）
            if not existing.is_admin:
                existing.is_admin = True
                session.commit()
                logger.info("seed: 已为既有账号 %s 补上 admin 标记", username)
            return

        now = utcnow()
        session.add(
            User(
                device_id=f"admin_{username}",
                username=username,
                password_hash=hash_credential(settings.seed_admin_password),
                is_guest=False,
                is_admin=True,
                created_at=now,
                last_seen_at=now,
                trust_score=100,
            )
        )
        session.commit()
        logger.info("seed: 已创建测试账号 %s", username)
    except Exception:  # noqa: BLE001 - 播种失败不应阻断服务启动
        session.rollback()
        logger.exception("seed: 测试账号播种失败，已跳过")
    finally:
        session.close()
