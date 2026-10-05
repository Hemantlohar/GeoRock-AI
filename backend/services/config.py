"""
Central configuration. Every secret is read from environment variables on the
SERVER only. Nothing in this module (or any key it loads) is ever sent to the
browser. Copy backend/.env.example to backend/.env for local development.
"""
import os

try:  # optional dependency; real environment variables always win
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


APP_ENV = env("APP_ENV", "development")          # development | production
IS_PROD = APP_ENV.lower() == "production"

# Comma-separated list of exact browser origins allowed to call this API.
ALLOWED_ORIGINS = [
    o.strip().rstrip("/")
    for o in env("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

# Redirect http -> https and send HSTS. Defaults to on in production.
FORCE_HTTPS = env("FORCE_HTTPS", "true" if IS_PROD else "false").lower() == "true"
# Only trust X-Forwarded-* headers when running behind your own reverse proxy / PaaS.
TRUST_PROXY = env("TRUST_PROXY", "true" if IS_PROD else "false").lower() == "true"

# Supabase (server-side only: use the SERVICE ROLE key, never the anon key here)
SUPABASE_URL = env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")

# Upstash Redis REST (rate limiting + response cache)
UPSTASH_URL = env("UPSTASH_REDIS_REST_URL").rstrip("/")
UPSTASH_TOKEN = env("UPSTASH_REDIS_REST_TOKEN")

# Cloudflare Turnstile (optional bot challenge). Empty = challenge disabled.
TURNSTILE_SECRET = env("TURNSTILE_SECRET_KEY")

# Salt used to hash IP addresses before they are stored (never store raw IPs).
IP_HASH_SALT = env("IP_HASH_SALT", "change-me-in-production")

MAX_UPLOAD_BYTES = int(env("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
