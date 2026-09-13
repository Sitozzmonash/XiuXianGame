"""Pydantic 请求 / 响应模型（API 契约，PRD 43）。"""

from typing import Any, Literal

from pydantic import BaseModel, Field

Provider = Literal["wechat", "qq", "email"]


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
    """登录请求：用已绑定的第三方凭证换 token。"""

    provider: Provider
    credential: str = Field(min_length=1, max_length=256)
    code: str | None = Field(default=None, max_length=16)


class LoginResponse(BaseModel):
    """登录响应。"""

    token: str
    user_id: int
    created_at: str
    is_guest: bool


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
