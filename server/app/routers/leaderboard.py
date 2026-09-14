"""仙缘榜（PRD 30 章）。

- GET /leaderboard?board=stage|power|realm&limit=N  取榜单前 N 名 + 自己的名次

指标口径说明：存档本体由客户端产出，服务端只做排序与展示，因此榜单**只用于展示与称号**，
不构成反作弊依据（资源增幅另有 audit 模块把关）。排序所需的派生字段由客户端在上传存档时
随存档写入 `save_json.rank`（见前端 lib/game/api/cloud.ts 的 rankSummary），
旧档缺该字段时退回用 progress.maxStage 兜底。
"""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import PlayerSave, User, iso_utc, utcnow
from app.schemas import BoardKey, LeaderboardEntry, LeaderboardResponse
from app.security import get_optional_user

router = APIRouter(tags=["leaderboard"])

# 单次排序最多扫描的存档行数（按更新时间倒序取最近活跃的），避免全表扫描
SCAN_LIMIT = 5000
DEFAULT_LIMIT = 50
MAX_LIMIT = 200


def _rank_of(save_json: Any) -> dict[str, Any]:
    """取出客户端写入的排行摘要；缺失或格式不对时返回空 dict。"""
    if not isinstance(save_json, dict):
        return {}
    rank = save_json.get("rank")
    return rank if isinstance(rank, dict) else {}


def _metric(save_json: Any, board: BoardKey) -> tuple[int, str]:
    """按榜单口径取出 (主指标, 副标题)。

    - stage：最高关卡；副标题给关卡名
    - power：战力；副标题给境界
    - realm：境界序数（越大越靠前，同位再比关卡）；副标题给境界名
    """
    rank = _rank_of(save_json)
    progress = save_json.get("progress") if isinstance(save_json, dict) else None
    progress = progress if isinstance(progress, dict) else {}
    profile = save_json.get("profile") if isinstance(save_json, dict) else None
    profile = profile if isinstance(profile, dict) else {}

    max_stage = int(progress.get("maxStage") or 0)
    realm_label = str(rank.get("realmLabel") or "初入修行")
    stage_label = str(rank.get("stageLabel") or f"第 {max_stage} 关")

    if board == "stage":
        return max_stage, stage_label
    if board == "power":
        return int(rank.get("power") or 0), realm_label
    realm_index = int(rank.get("realmIndex") or 0)
    # 境界榜：先比大境界，再比小阶段（用关卡序号近似阶段高低）
    return realm_index * 100000 + max_stage, realm_label


def _display_name(user: User, save_json: Any) -> str:
    """展示名优先用游戏内道号，其次账号名，最后给游客匿名名。"""
    rank = _rank_of(save_json)
    name = str(rank.get("name") or "").strip()
    if name:
        return name
    if user.username:
        return user.username
    return f"无名散修#{user.id}"


@router.get("/leaderboard", response_model=LeaderboardResponse)
def leaderboard(
    board: BoardKey = Query(default="stage", description="榜单：stage 关卡 / power 战力 / realm 境界"),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    user: User | None = Depends(get_optional_user),
    session: Session = Depends(get_db),
) -> LeaderboardResponse:
    """取榜单前 N 名，并附带当前账号的名次（未上榜时 me 仍返回，rank 为其真实名次）。"""
    rows = session.execute(
        select(User, PlayerSave.save_json)
        .join(PlayerSave, PlayerSave.user_id == User.id)
        .order_by(PlayerSave.updated_at.desc())
        .limit(SCAN_LIMIT)
    ).all()

    scored: list[tuple[int, User, Any]] = []
    for u, save_json in rows:
        value, _ = _metric(save_json, board)
        # 完全没有进度的游客档不占榜位
        if not isinstance(save_json, dict):
            continue
        progress = save_json.get("progress") or {}
        if int(progress.get("maxStage") or 0) <= 0 and value <= 0:
            continue
        scored.append((value, u, save_json))

    # 同分按 user_id 升序（先注册者靠前），保证名次稳定
    scored.sort(key=lambda item: (-item[0], item[1].id))

    entries: list[LeaderboardEntry] = []
    me: LeaderboardEntry | None = None
    for index, (value, u, save_json) in enumerate(scored):
        detail = _metric(save_json, board)[1]
        entry = LeaderboardEntry(
            rank=index + 1,
            name=_display_name(u, save_json),
            user_id=u.id,
            is_self=bool(user and user.id == u.id),
            value=value,
            detail=detail,
            is_admin=u.is_admin,
        )
        if entry.is_self:
            me = entry
        if len(entries) < limit:
            entries.append(entry)

    return LeaderboardResponse(
        board=board,
        entries=entries,
        me=me,
        total=len(scored),
        updated_at=iso_utc(utcnow()),
    )
