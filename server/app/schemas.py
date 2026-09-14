"""Pydantic 请求 / 响应模型（API 契约，PRD 43）。"""

from typing import Any, Literal

from pydantic import BaseModel, Field

Provider = Literal["wechat", "qq", "email"]
LoginProvider = Literal["wechat", "qq", "email", "password"]


# ------------------------------ /health ------------------------------


class HealthResponse(BaseModel):
    """健康检查响应。"""

    status: str
    time: str
    version: str


# ------------------------------ /auth ------------------------------


class GuestRequest(BaseModel):
    """游客登录请求；device_id 用于幂等复用同一台设备的游客账号。"""

    device_id: str | None = Field(default=None, max_length=128, description="设备唯一标识（客户端持久化）")


class GuestResponse(BaseModel):
    """游客登录响应。"""

    token: str
    user_id: int
    is_new: bool
    created_at: str
    device_id: str


class BindRequest(BaseModel):
    """绑定请求：把当前账号绑定到第三方凭证。"""

    provider: Provider
    credential: str = Field(min_length=1, max_length=256, description="openid / 邮箱（服务端只存哈希与掩码）")
    code: str | None = Field(default=None, max_length=16, description="邮箱验证码；第三方 OAuth 时为授权 code")


class BindResponse(BaseModel):
    """绑定响应。"""

    user_id: int
    provider: Provider
    credential_masked: str
    bound_at: str
    already_bound: bool = False


class LoginRequest(BaseModel):
    """登录请求：provider='password' 用用户名 + 密码，其余用已绑定的第三方凭证换 token。"""

    provider: LoginProvider
    credential: str = Field(min_length=1, max_length=256)
    password: str | None = Field(default=None, max_length=64, description="provider='password' 时必填")
    code: str | None = Field(default=None, max_length=16)


class LoginResponse(BaseModel):
    """登录响应。"""

    token: str
    user_id: int
    created_at: str
    is_guest: bool
    username: str | None = None
    is_admin: bool = False
    # 该账号云端是否已有存档；客户端据此省掉一次必然 404 的探测请求
    has_save: bool = False


class RegisterRequest(BaseModel):
    """注册请求：创建站内账号（用户名 + 密码），账号下的云存档独立于游客档。"""

    username: str = Field(min_length=1, max_length=20)
    password: str = Field(min_length=1, max_length=64)


class RegisterResponse(BaseModel):
    """注册响应：注册即登录，直接返回 token。"""

    token: str
    user_id: int
    username: str
    created_at: str
    is_admin: bool = False
    has_save: bool = False


class MeResponse(BaseModel):
    """当前账号信息（客户端启动时用它校验 token 是否仍有效）。"""

    user_id: int
    username: str | None
    is_guest: bool
    is_admin: bool
    created_at: str
    providers: list[str] = Field(default_factory=list)


# ------------------------------ /leaderboard ------------------------------

BoardKey = Literal["stage", "power", "realm"]


class LeaderboardEntry(BaseModel):
    """榜单条目；name 为展示名（账号名或脱敏游客名）。"""

    rank: int
    name: str
    user_id: int
    is_self: bool = False
    # 主指标：关卡榜=最高关卡；战力榜=战力；境界榜=境界序数
    value: int
    # 副标题：境界 / 战力 等展示文本
    detail: str
    is_admin: bool = False


class LeaderboardResponse(BaseModel):
    """榜单响应：entries 为前 N 名，me 恒为当前账号（未上榜时 rank 为 null）。"""

    board: BoardKey
    entries: list[LeaderboardEntry]
    me: LeaderboardEntry | None = None
    total: int = 0
    updated_at: str


# ------------------------------ /save ------------------------------


class SaveGetResponse(BaseModel):
    """云存档读取响应。"""

    save: dict[str, Any]
    version: int
    updated_at: str


class SavePostRequest(BaseModel):
    """云存档上传请求；base_version 为客户端最后见到的服务端版本号（首次上传为 0）。"""

    save: dict[str, Any]
    base_version: int = Field(ge=0)
    client_updated_at: int | None = Field(default=None, ge=0, description="客户端存档 updatedAt（毫秒）")


class SaveWarning(BaseModel):
    """增幅审计警告项（不阻断写入，仅标记 + 扣信任分）。"""

    code: str
    resource: str | None = None
    delta: float | None = None
    cap: float | None = None
    stage: int | None = None
    elapsed_seconds: float | None = None
    detail: str | None = None


class SavePostResponse(BaseModel):
    """云存档上传成功响应。"""

    version: int
    updated_at: str
    size_bytes: int
    suspicious: bool
    warnings: list[SaveWarning] = Field(default_factory=list)


class SaveConflictResponse(BaseModel):
    """版本冲突 409 响应（服务端权威存档）。"""

    code: str = "save_conflict"
    message: str
    server_save: dict[str, Any] | None = None
    server_version: int | None = None
    updated_at: str | None = None


# ------------------------------ /analytics ------------------------------


class AnalyticsEventIn(BaseModel):
    """单条埋点事件。"""

    name: str = Field(min_length=1, max_length=64)
    ts: int | None = Field(default=None, ge=0, description="客户端毫秒时间戳，缺省用服务端时间")
    props: dict[str, Any] | None = None
    session_id: str | None = Field(default=None, max_length=64)


class AnalyticsBatchIn(BaseModel):
    """埋点批量上报请求。"""

    events: list[AnalyticsEventIn] = Field(min_length=1, max_length=1000)


class AnalyticsBatchResponse(BaseModel):
    """埋点批量上报响应。"""

    accepted: int
    unknown: int
    server_time: str
