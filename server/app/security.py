"""鉴权与凭证安全：JWT 签发 / 校验、凭证指纹与掩码、邮箱验证码占位校验。

设计要点：
- 凭证不落明文（PRD 3.3 / 42）。第三方凭证（openid / 邮箱）需要「按值查找」才能实现
  唯一约束与登录，而加盐 bcrypt 是随机化的、无法建立唯一索引；因此查找键用带服务端密钥的
  确定性 HMAC-SHA256 指纹（无密钥无法离线枚举邮箱 / 反推凭证），展示层用掩码。
- bcrypt（passlib，bcrypt>=5 环境自动回退直接调用）保留给未来「邮箱 + 密码」类可校验凭证：
  hash_credential / verify_credential。
"""

import hashlib
import hmac
import logging
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User

logger = logging.getLogger("fanchen.security")

_BCRYPT_MAX_BYTES = 72  # bcrypt 输入上限

# ---- 哈希上下文：passlib 可用则用，bcrypt>=5 环境下回退 ----
try:  # pragma: no cover - 取决于本机 bcrypt 版本
    from passlib.context import CryptContext

    _pwd_context: "CryptContext | None" = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _pwd_context.hash("probe")  # 触发后端加载；bcrypt>=5 时这里会抛错
    _USE_PASSLIB = True
except Exception:  # noqa: BLE001 - 任何异常都退化为直接 bcrypt
    _pwd_context = None
    _USE_PASSLIB = False
    logger.warning("passlib 不可用或与当前 bcrypt 版本不兼容，凭证哈希回退为直接调用 bcrypt")


def _encode_for_bcrypt(raw: str) -> bytes:
    """统一截断到 bcrypt 72 字节上限（超长凭证如 openid 不用担心）。"""
    return raw.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_credential(raw: str) -> str:
    """对凭证做加盐哈希（bcrypt）；适用于「密码」类可校验凭证，不含查找语义。"""
    data = _encode_for_bcrypt(raw)
    if _USE_PASSLIB and _pwd_context is not None:
        return _pwd_context.hash(data.decode("utf-8", "ignore"))
    return bcrypt.hashpw(data, bcrypt.gensalt()).decode("ascii")


def verify_credential(raw: str, hashed: str) -> bool:
    """常数时间校验凭证是否匹配 bcrypt 哈希；任何异常一律视为不匹配。"""
    data = _encode_for_bcrypt(raw)
    try:
        if _USE_PASSLIB and _pwd_context is not None:
            return bool(_pwd_context.verify(data.decode("utf-8", "ignore"), hashed))
        return bcrypt.checkpw(data, hashed.encode("ascii"))
    except Exception:  # noqa: BLE001
        return False


def credential_fingerprint(provider: str, raw: str) -> str:
    """确定性凭证指纹（HMAC-SHA256 + 服务端密钥），作为 auth_accounts.credential_hash。

    第三方凭证必须「按值查找」（唯一约束 + 登录），加盐 bcrypt 做不到；用带密钥的
    HMAC 既确定又不落明文，无密钥无法离线枚举邮箱或反推 openid。若轮换
    credential_pepper / jwt_secret，旧绑定将无法再被检索（需数据迁移）。
    """
    settings = get_settings()
    secret = settings.credential_pepper or settings.jwt_secret
    message = f"{provider}:{raw}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def normalize_credential(provider: str, raw: str) -> str:
    """规范化：邮箱统一小写去空格；第三方 openid 去首尾空格（区分大小写）。"""
    raw = raw.strip()
    return raw.lower() if provider == "email" else raw


def mask_credential(provider: str, raw: str) -> str:
    """生成展示用掩码，如 ab***@qq.com / wx:***a1b2。"""
    if provider == "email":
        local, _, domain = raw.partition("@")
        head = local[:2] if len(local) > 2 else local[:1]
        return f"{head}***@{domain}" if domain else f"{head}***"
    prefix = {"wechat": "wx", "qq": "qq"}.get(provider, provider[:2])
    tail = raw[-4:] if len(raw) >= 4 else raw
    return f"{prefix}:***{tail}"


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(value: str) -> bool:
    """轻量邮箱格式校验（避免引入 email-validator 依赖）。"""
    return bool(_EMAIL_RE.match(value.strip()))


def check_email_code(email: str, code: str | None) -> None:
    """邮箱验证码占位校验（当前只做格式与固定码校验）。

    生产接入点：发送验证码时应把 {email: code} 以 TTL（如 5 分钟）写入 Redis / 数据库，
    这里改为「读存储 + 常数时间比较 + 重试次数限流」；接入真实短信 / 邮件服务（阿里云邮件
    推送、SendCloud、Resend 等）后把 accept_any_email_code 置 false。
    """
    settings = get_settings()
    if not code or not code.isdigit() or not 4 <= len(code) <= 6:
        raise HTTPException(400, detail={"code": "invalid_code", "message": "验证码格式不正确"})
    if not settings.accept_any_email_code and code != settings.email_code_placeholder:
        raise HTTPException(400, detail={"code": "invalid_code", "message": "验证码错误或已过期"})
    _ = email  # 占位：真实实现需按邮箱从存储中取出验证码比对


# ------------------------------ JWT ------------------------------


def create_access_token(user_id: int, device_id: str | None = None) -> str:
    """签发访问 token（HS256，含 iat/exp）。"""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload: dict = {
        "sub": str(user_id),
        "typ": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.token_ttl_hours)).timestamp()),
    }
    if device_id:
        payload["device_id"] = device_id
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """校验并解析 token；失败抛 jwt.PyJWTError（过期 / 签名错误等）。"""
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


_bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(message: str) -> HTTPException:
    """构造 401（带 WWW-Authenticate）。"""
    return HTTPException(
        status_code=401,
        detail={"code": "unauthorized", "message": message},
        headers={"WWW-Authenticate": "Bearer"},
    )


def _user_id_from_token(token: str) -> int | None:
    """从 token 中解出 user_id；无效返回 None。"""
    try:
        payload = decode_access_token(token)
        return int(payload.get("sub", ""))
    except (jwt.PyJWTError, TypeError, ValueError):
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: Session = Depends(get_db),
) -> User:
    """FastAPI 依赖：校验 Bearer token 并返回当前用户；未带或无效一律 401。"""
    if credentials is None or not credentials.credentials:
        raise _unauthorized("缺少 Bearer token")
    user_id = _user_id_from_token(credentials.credentials)
    if user_id is None:
        raise _unauthorized("token 无效或已过期")
    user = session.get(User, user_id)
    if user is None:
        raise _unauthorized("账号不存在")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: Session = Depends(get_db),
) -> User | None:
    """FastAPI 依赖：带合法 token 则返回用户，否则 None（埋点等允许匿名上报）。"""
    if credentials is None or not credentials.credentials:
        return None
    user_id = _user_id_from_token(credentials.credentials)
    if user_id is None:
        return None
    return session.get(User, user_id)
