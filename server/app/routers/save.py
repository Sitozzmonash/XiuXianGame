"""云存档路由（PRD 3.3、42、43；B12）。

- GET  /save  读取云存档（无存档 404）
- POST /save  上传云存档：服务端权威版本号，冲突 409 并回传服务端存档，
             成功 version+1、留快照、跑增幅审计（PRD 43 关键资源服务端验证）
"""

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.audit import audit_save_growth, effective_elapsed_seconds
from app.config import get_settings
from app.db import commit_or_rollback, get_db, supports_for_update
from app.models import PlayerSave, SaveSnapshot, User, iso_utc, utcnow
from app.schemas import SaveGetResponse, SavePostRequest, SavePostResponse
from app.security import get_current_user

router = APIRouter(tags=["save"])


def _serialize(save: dict[str, Any]) -> bytes:
    """按紧凑 JSON 序列化（排序键保证同内容同体积），用于体积统计。"""
    return json.dumps(save, ensure_ascii=False, separators=(",", ":"), sort_keys=True, default=str).encode("utf-8")


def _client_elapsed_seconds(client_updated_at: int | None, previous_save: Any) -> float | None:
    """由客户端上报的 updatedAt 推算时间差（仅辅助，服务端时长优先，见 audit 模块）。"""
    if client_updated_at is None or not isinstance(previous_save, dict):
        return None
    prev_ms = previous_save.get("updatedAt")
    if isinstance(prev_ms, bool) or not isinstance(prev_ms, (int, float)):
        return None
    return max(0.0, (float(client_updated_at) - float(prev_ms)) / 1000.0)


def _conflict(
    server_save: dict[str, Any] | None,
    version: int | None,
    updated_at: str | None,
    message: str,
) -> JSONResponse:
    """构造 409 冲突响应（附服务端权威存档，客户端应整体采纳，PRD 3.3）。"""
    return JSONResponse(
        status_code=409,
        content={
            "code": "save_conflict",
            "message": message,
            "server_save": server_save,
            "server_version": version,
            "updated_at": updated_at,
        },
    )


def _prune_snapshots(session: Session, user_id: int, keep: int) -> None:
    """只保留每个账号最近 keep 份快照。"""
    if keep <= 0:
        session.execute(delete(SaveSnapshot).where(SaveSnapshot.user_id == user_id))
        return
    keep_ids = (
        select(SaveSnapshot.id)
        .where(SaveSnapshot.user_id == user_id)
        .order_by(SaveSnapshot.id.desc())
        .limit(keep)
    )
    session.execute(
        delete(SaveSnapshot).where(
            SaveSnapshot.user_id == user_id,
            SaveSnapshot.id.not_in(keep_ids),
        )
    )


@router.get("/save", response_model=SaveGetResponse)
def get_save(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> SaveGetResponse:
    """读取当前账号的云存档；尚无存档返回 404。"""
    row = session.get(PlayerSave, user.id)
    if row is None:
        raise HTTPException(404, detail={"code": "save_not_found", "message": "该账号还没有云存档"})
    return SaveGetResponse(save=row.save_json, version=row.version, updated_at=iso_utc(row.updated_at))


@router.post("/save", response_model=SavePostResponse)
def put_save(
    payload: SavePostRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    """上传云存档：base_version 一致则写入并 version+1，不一致返回 409 与服务端存档。"""
    settings = get_settings()

    size_bytes = len(_serialize(payload.save))
    if size_bytes > settings.max_save_bytes:
        raise HTTPException(
            413,
            detail={
                "code": "save_too_large",
                "message": f"存档体积 {size_bytes} 字节超过上限 {settings.max_save_bytes} 字节",
                "size_bytes": size_bytes,
                "limit": settings.max_save_bytes,
            },
        )

    # 行级锁保证同账号并发写入串行化（SQLite 本身串行，PostgreSQL 走 FOR UPDATE）
    stmt = select(PlayerSave).where(PlayerSave.user_id == user.id)
    if supports_for_update(session):
        stmt = stmt.with_for_update()
    row = session.scalar(stmt)
    now = utcnow()

    if row is None:
        if payload.base_version != 0:
            return _conflict(None, None, None, "服务端无存档，但客户端 base_version 非 0")
        previous_save: dict[str, Any] | None = None
        server_elapsed = 0.0
    else:
        if payload.base_version != row.version:
            return _conflict(
                row.save_json,
                row.version,
                iso_utc(row.updated_at),
                f"版本冲突：客户端 base_version={payload.base_version}，服务端 version={row.version}",
            )
        previous_save = row.save_json
        updated_at = row.updated_at if row.updated_at.tzinfo else row.updated_at.replace(tzinfo=timezone.utc)
        server_elapsed = (now - updated_at).total_seconds()

    # ---- 增幅审计（PRD 43）：只标记 + 扣信任分，不阻断写入 ----
    client_elapsed = _client_elapsed_seconds(payload.client_updated_at, previous_save)
    elapsed = effective_elapsed_seconds(server_elapsed, client_elapsed, settings)
    warnings = audit_save_growth(previous_save, payload.save, elapsed, settings)
    suspicious = bool(warnings)

    new_version = (row.version if row is not None else 0) + 1
    if row is None:
        session.add(
            PlayerSave(
                user_id=user.id,
                version=new_version,
                save_json=payload.save,
                size_bytes=size_bytes,
                updated_at=now,
                suspicious=suspicious,
                warnings=warnings or None,
            )
        )
    else:
        row.version = new_version
        row.save_json = payload.save
        row.size_bytes = size_bytes
        row.updated_at = now
        row.suspicious = suspicious  # 当前版本审计结论；信任分是长期信号
        row.warnings = warnings or None

    if warnings:
        penalty = settings.trust_penalty_per_warning * len(warnings)
        user.trust_score = max(0, user.trust_score - penalty)
    elif user.trust_score < 100:
        user.trust_score += 1  # 正常存档缓慢恢复信任分

    session.add(SaveSnapshot(user_id=user.id, version=new_version, save_json=payload.save, created_at=now))
    session.flush()
    _prune_snapshots(session, user.id, settings.snapshot_keep)
    commit_or_rollback(session)

    return SavePostResponse(
        version=new_version,
        updated_at=iso_utc(now),
        size_bytes=size_bytes,
        suspicious=suspicious,
        warnings=warnings,
    )
