"""登录 / 绑定路由（PRD 3.3、43；B13 多端登录）。

- POST /auth/guest  游客登录（device_id 幂等复用）
- POST /auth/bind   游客绑定微信 / QQ / 邮箱（绑定后存档不丢：存档挂在 user_id 上）
- POST /auth/login  用已绑定凭证登录
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import commit_or_rollback, get_db
from app.models import AuthAccount, User, iso_utc, utcnow
from app.schemas import (
    BindRequest,
    BindResponse,
    GuestRequest,
    GuestResponse,
    LoginRequest,
    LoginResponse,
)
from app.security import (
    check_email_code,
    create_access_token,
    credential_fingerprint,
    get_current_user,
    is_valid_email,
    mask_credential,
    normalize_credential,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _new_device_id() -> str:
    """客户端未提供 device_id 时生成一个，随响应返回由客户端持久化。"""
    return "dev_" + secrets.token_hex(8)


@router.post("/guest", response_model=GuestResponse)
def guest_login(payload: GuestRequest, session: Session = Depends(get_db)) -> GuestResponse:
    """游客登录：按 device_id 幂等复用原账号（不新建、不丢档），否则创建游客并签发 token。"""
    device_id = (payload.device_id or "").strip() or _new_device_id()
    now = utcnow()
    user = session.scalar(select(User).where(User.device_id == device_id))
    is_new = user is None

    if user is None:
        user = User(
            device_id=device_id,
            is_guest=True,
            created_at=now,
            last_seen_at=now,
            trust_score=100,
        )
        session.add(user)
        try:
            session.commit()
        except IntegrityError:
            # 并发同设备重复建号：回滚后复用已存在的账号（唯一索引保证只会有一行）
            session.rollback()
            user = session.scalar(select(User).where(User.device_id == device_id))
            if user is None:
                raise
            is_new = False
    else:
        user.last_seen_at = now
        commit_or_rollback(session)

    return GuestResponse(
        token=create_access_token(user.id, device_id),
        user_id=user.id,
        is_new=is_new,
        created_at=iso_utc(user.created_at),
        device_id=device_id,
    )


@router.post("/bind", response_model=BindResponse)
def bind_account(
    payload: BindRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> BindResponse:
    """把当前游客账号绑定到第三方账号；凭证已绑其他账号返回 409，原云存档始终保留。"""
    credential = normalize_credential(payload.provider, payload.credential)

    if payload.provider == "email":
        if not is_valid_email(credential):
            raise HTTPException(400, detail={"code": "invalid_email", "message": "邮箱格式不正确"})
        check_email_code(credential, payload.code)
    else:
        # 占位实现：当前信任客户端传来的 credential（openid）。
        # 生产接入点：应先用 payload.code 调微信 code2Session / QQ 登录 OpenAPI 换取 openid，
        # 再对 openid 做指纹；客户端不应掌握 openid 明文。
        if not credential:
            raise HTTPException(400, detail={"code": "invalid_credential", "message": "凭证不能为空"})

    credential_hash = credential_fingerprint(payload.provider, credential)
    existing = session.scalar(
        select(AuthAccount).where(
            AuthAccount.provider == payload.provider,
            AuthAccount.credential_hash == credential_hash,
        )
    )
    if existing is not None:
        if existing.user_id != user.id:
            raise HTTPException(
                409,
                detail={
                    "code": "credential_already_bound",
                    "message": "该凭证已绑定其他账号，请直接登录该账号",
                },
            )
        return BindResponse(
            user_id=user.id,
            provider=payload.provider,  # type: ignore[arg-type]
            credential_masked=existing.credential_masked,
            bound_at=iso_utc(existing.bound_at),
            already_bound=True,
        )

    now = utcnow()
    session.add(
        AuthAccount(
            user_id=user.id,
            provider=payload.provider,
            credential_hash=credential_hash,
            credential_masked=mask_credential(payload.provider, credential),
            bound_at=now,
        )
    )
    user.is_guest = False
    user.last_seen_at = now
    try:
        session.commit()
    except IntegrityError:
        # 并发下撞唯一约束（provider, credential_hash）
        session.rollback()
        raise HTTPException(
            409,
            detail={"code": "credential_already_bound", "message": "该凭证已绑定其他账号，请直接登录该账号"},
        ) from None

    return BindResponse(
        user_id=user.id,
        provider=payload.provider,  # type: ignore[arg-type]
        credential_masked=mask_credential(payload.provider, credential),
        bound_at=iso_utc(now),
        already_bound=False,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Session = Depends(get_db)) -> LoginResponse:
    """用已绑定凭证登录（邮箱需带验证码），返回全新 token 与账号信息。"""
    credential = normalize_credential(payload.provider, payload.credential)

    if payload.provider == "email":
        if not is_valid_email(credential):
            raise HTTPException(400, detail={"code": "invalid_email", "message": "邮箱格式不正确"})
        check_email_code(credential, payload.code)

    credential_hash = credential_fingerprint(payload.provider, credential)
    account = session.scalar(
        select(AuthAccount).where(
            AuthAccount.provider == payload.provider,
            AuthAccount.credential_hash == credential_hash,
        )
    )
    if account is None:
        raise HTTPException(
            401,
            detail={"code": "credential_not_bound", "message": "该凭证尚未绑定账号，请先以游客身份绑定"},
        )

    user = session.get(User, account.user_id)
    if user is None:
        raise HTTPException(401, detail={"code": "account_gone", "message": "账号不存在或已注销"})

    user.last_seen_at = utcnow()
    commit_or_rollback(session)

    return LoginResponse(
        token=create_access_token(user.id, user.device_id),
        user_id=user.id,
        created_at=iso_utc(user.created_at),
        is_guest=user.is_guest,
    )
