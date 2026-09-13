"""应用配置：全部通过环境变量 / .env 注入，默认值保证本机零依赖（SQLite）可跑。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """服务端配置项（环境变量大小写不敏感，如 DATABASE_URL -> database_url）。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---- 基础 ----
    app_name: str = "凡尘问道 云存档后端"
    app_version: str = "0.1.0"
    debug: bool = False

    # ---- 存储 ----
    database_url: str = "sqlite:///./fanchen.db"

    # ---- 鉴权 ----
    jwt_secret: str = "dev-secret-change-me-please-set-32bytes"
    jwt_algorithm: str = "HS256"
    token_ttl_hours: int = 720
    # 凭证指纹专用密钥（HMAC）；留空则回退 jwt_secret。生产建议单独设置，且不要随意轮换
    credential_pepper: str = ""

    # ---- 云存档 ----
    max_save_bytes: int = 1024 * 1024
    snapshot_keep: int = 10

    # ---- 埋点（PRD 49） ----
    analytics_max_batch: int = 500
    analytics_max_props_bytes: int = 8192

    # ---- 存档增幅审计（PRD 43：客户端不直接提交资源结果） ----
    # 上限 = 速率(关卡) × 有效时长 × 宽容倍数，且不小于 audit_min_cap；仙玉按固定额度。
    audit_tolerance_mult: float = 3.0
    audit_grace_seconds: float = 120.0
    audit_clock_slack_seconds: float = 600.0
    audit_stone_base_per_sec: float = 1.0
    audit_stone_per_stage_per_sec: float = 0.5
    audit_cultivation_base_per_sec: float = 5.0
    audit_cultivation_per_stage_per_sec: float = 2.0
    audit_jade_flat_cap: float = 300.0
    audit_jade_per_stage_cap: float = 1.0
    audit_min_cap: float = 1000.0
    trust_penalty_per_warning: int = 5

    # ---- 其它 ----
    cors_origins: str = "*"
    accept_any_email_code: bool = True
    email_code_placeholder: str = "123456"

    @property
    def cors_origin_list(self) -> list[str]:
        """把逗号分隔的 CORS 配置解析成列表。"""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """获取全局配置单例（测试可直接修改属性来覆盖单项）。"""
    return Settings()
