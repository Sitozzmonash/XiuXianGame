"""埋点路由（PRD 49；B14）。

POST /analytics/events：批量接收基础埋点。带合法 token 时关联账号，未带也照收（匿名），
未知事件名照收但标记 unknown=true，便于配置迭代期不丢数据。
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import commit_or_rollback, get_db
from app.models import AnalyticsEvent, User, iso_utc, utcnow
from app.schemas import AnalyticsBatchIn, AnalyticsBatchResponse
from app.security import get_optional_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

# PRD 49 章基础埋点名单（13 条观察项，归并为 14 个事件名）
KNOWN_EVENTS: frozenset[str] = frozenset(
    {
        "login",
        "idle_claim",
        "stage_start",
        "stage_end",
        "boss_fail",
        "equip_change",
        "loadout_switch",
        "story_enter",
        "story_choice",
        "encounter_trigger",
        "realm_enter_exit",
        "offline_duration",
        "realm_breakthrough",
        "last_page_before_leave",
    }
)


@router.post("/events", response_model=AnalyticsBatchResponse)
def ingest_events(
    payload: AnalyticsBatchIn,
    user: User | None = Depends(get_optional_user),
    session: Session = Depends(get_db),
) -> AnalyticsBatchResponse:
    """批量写入埋点事件；未知事件名照收并标记 unknown，带 token 时关联账号。"""
    settings = get_settings()
    if len(payload.events) > settings.analytics_max_batch:
        raise HTTPException(
            422,
            detail={
                "code": "batch_too_large",
                "message": f"单次最多 {settings.analytics_max_batch} 条事件",
                "limit": settings.analytics_max_batch,
            },
        )

    now = utcnow()
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    unknown_count = 0
    rows: list[AnalyticsEvent] = []

    for event in payload.events:
        unknown = event.name not in KNOWN_EVENTS
        unknown_count += int(unknown)
        if event.props is not None:
            props_bytes = len(
                json.dumps(event.props, ensure_ascii=False, separators=(",", ":"), default=str).encode("utf-8")
            )
            if props_bytes > settings.analytics_max_props_bytes:
                raise HTTPException(
                    422,
                    detail={
                        "code": "props_too_large",
                        "message": f"事件 {event.name} 的 props 超过 {settings.analytics_max_props_bytes} 字节",
                        "limit": settings.analytics_max_props_bytes,
                    },
                )
        rows.append(
            AnalyticsEvent(
                user_id=user.id if user is not None else None,
                session_id=event.session_id,
                name=event.name,
                ts=int(event.ts) if event.ts is not None else now_ms,
                props=event.props,
                unknown=unknown,
                created_at=now,
            )
        )

    session.add_all(rows)
    commit_or_rollback(session)

    return AnalyticsBatchResponse(accepted=len(rows), unknown=unknown_count, server_time=iso_utc(now))
