"""FastAPI 入口：CORS、路由挂载、/health、启动建表。

启动：
    cd server && uvicorn app.main:app --reload --port 8000

部署到 Vercel（Services 按 /api/* 转发并保留原始路径）时，设环境变量
API_PREFIX=/api，同一应用即以 /api/auth/guest、/api/save 等路径对外服务；
本机开发保持空前缀不变。
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.models import iso_utc, utcnow
from app.routers import analytics, auth, leaderboard, save
from app.seed import seed_admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fanchen")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """启动时建表 + 播种测试账号（均幂等）；生产可改用 sql/schema.sql 或迁移工具。"""
    init_db()
    seed_admin()
    logger.info("database ready: %s", get_settings().database_url.split("@")[-1])
    yield


def create_app() -> FastAPI:
    """装配应用；路由前缀由配置 api_prefix 决定（本机空，Vercel 生产 /api）。"""
    settings = get_settings()
    prefix = settings.api_prefix.rstrip("/")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="《凡尘问道》H5 挂机修仙 · 云存档 / 多端登录 / 埋点后端（PRD 42、43、49）",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,  # token 走 Authorization 头，无需携带 Cookie
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix=prefix)
    app.include_router(save.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(leaderboard.router, prefix=prefix)

    @app.get(f"{prefix}/health", tags=["meta"])
    def health() -> dict[str, str]:
        """健康检查：返回状态、当前时间与服务版本。"""
        return {"status": "ok", "time": iso_utc(utcnow()), "version": settings.app_version}

    return app


app = create_app()


if __name__ == "__main__":  # pragma: no cover - 本地便捷启动
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
