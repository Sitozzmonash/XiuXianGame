"""存档增幅审计（PRD 43：客户端不直接提交"我获得了 10000 灵石"）。

对比上一版云存档，按「关卡 × 时长」推算资源增量上限：
    上限 = 速率(关卡) × 有效时长 × 宽容倍数（且不小于 audit_min_cap）
超限时不返回 4xx，只产出 warnings（写库 + 降低信任分），避免误伤正常玩家与网络重放。
本模块是纯函数集合，独立可单测。
"""

from typing import Any, Mapping

from app.config import Settings, get_settings

# 参与审计的资源 -> 在 GameSave（lib/game/types.ts）中的路径
RESOURCE_PATHS: dict[str, tuple[str, ...]] = {
    "stone": ("resources", "stone"),
    "immortalJade": ("resources", "immortalJade"),
    "cultivation": ("profile", "cultivation"),
}


def _num(value: Any) -> float | None:
    """提取数值（bool 不算数字）；非数值返回 None。"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def extract_resource(save: Mapping[str, Any], resource: str) -> Any:
    """按路径从存档中读取资源字段（缺失返回 None）。"""
    node: Any = save
    for key in RESOURCE_PATHS[resource]:
        if not isinstance(node, Mapping):
            return None
        node = node.get(key)
    return node


def stage_of(save: Mapping[str, Any]) -> int:
    """取存档进度关卡（maxStage 优先，回退 stage，再缺省 1）。"""
    progress = save.get("progress") if isinstance(save, Mapping) else None
    if not isinstance(progress, Mapping):
        return 1
    for key in ("maxStage", "stage"):
        value = _num(progress.get(key))
        if value is not None:
            return max(1, int(value))
    return 1


def rate_per_second(resource: str, stage: int, settings: Settings) -> float:
    """按关卡推算该资源的挂机产出速率（PRD 28/29 的收益公式，取保守上界）。"""
    if resource == "stone":
        return settings.audit_stone_base_per_sec + stage * settings.audit_stone_per_stage_per_sec
    if resource == "cultivation":
        return settings.audit_cultivation_base_per_sec + stage * settings.audit_cultivation_per_stage_per_sec
    # 仙玉只来自成就 / 主线 / 榜单轻量奖励（PRD 29），不按时间产出
    return 0.0


def cap_for(resource: str, stage: int, elapsed_seconds: float, settings: Settings) -> float:
    """资源单次增量上限：时间型资源按速率推算，仙玉用固定额度 + 关卡加成。"""
    if resource == "immortalJade":
        cap = settings.audit_jade_flat_cap + stage * settings.audit_jade_per_stage_cap
        return max(cap, settings.audit_min_cap)
    rate = rate_per_second(resource, stage, settings)
    return max(rate * max(elapsed_seconds, 0.0) * settings.audit_tolerance_mult, settings.audit_min_cap)


def effective_elapsed_seconds(server_elapsed: float, client_elapsed: float | None, settings: Settings) -> float:
    """取较可信的时长：服务端为准；客户端时长最多放宽 clock_slack；再叠加宽限 grace。"""
    base = max(server_elapsed, 0.0)
    if client_elapsed is not None and client_elapsed > 0:
        base = max(base, min(client_elapsed, base + settings.audit_clock_slack_seconds))
    return base + settings.audit_grace_seconds


def audit_save_growth(
    prev: Mapping[str, Any] | None,
    new: Mapping[str, Any],
    elapsed_seconds: float,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """对比新旧存档做资源增幅审计；返回 warnings 列表（空列表 = 通过）。"""
    settings = settings or get_settings()
    warnings: list[dict[str, Any]] = []
    if prev is None or not isinstance(prev, Mapping):
        return warnings  # 首次上传没有基线，不做增幅审计

    stage = stage_of(new)
    elapsed = max(elapsed_seconds, 0.0)

    for resource in RESOURCE_PATHS:
        new_raw = extract_resource(new, resource)
        if new_raw is None:
            continue  # 客户端未携带该字段，跳过
        new_value = _num(new_raw)
        if new_value is None:
            warnings.append(
                {
                    "code": "resource_value_not_numeric",
                    "resource": resource,
                    "detail": f"{resource} 不是数值：{type(new_raw).__name__}",
                }
            )
            continue
        if new_value < 0:
            warnings.append(
                {
                    "code": "resource_negative",
                    "resource": resource,
                    "delta": None,
                    "cap": None,
                    "detail": f"{resource} 出现负值 {new_value}",
                }
            )
            continue

        old_value = _num(extract_resource(prev, resource))
        if old_value is None:
            continue  # 上一版没有该字段（老存档），本版视为首次出现
        delta = new_value - old_value
        if delta <= 0:
            continue  # 消耗 / 守恒不审计

        cap = cap_for(resource, stage, elapsed, settings)
        if delta > cap:
            warnings.append(
                {
                    "code": "gain_exceeds_cap",
                    "resource": resource,
                    "delta": round(delta, 2),
                    "cap": round(cap, 2),
                    "stage": stage,
                    "elapsed_seconds": round(elapsed, 2),
                    "detail": (
                        f"{resource} 增量 {delta:.0f} 超过按第 {stage} 关与 {elapsed:.0f}s "
                        f"推算的上限 {cap:.0f}（PRD 43 服务端权威）"
                    ),
                }
            )
    return warnings
