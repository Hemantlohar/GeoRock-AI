"""HTTPS enforcement, security headers, client IP, rate-limit dependency, Turnstile."""
import hashlib
import json
import urllib.parse
import urllib.request

from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware

from . import config, upstash

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "testserver"}


def client_ip(request: Request) -> str:
    if config.TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def hash_ip(ip: str) -> str:
    return hashlib.sha256(f"{config.IP_HASH_SALT}:{ip}".encode()).hexdigest()[:32]


def _is_https(request: Request) -> bool:
    if config.TRUST_PROXY:
        proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
        if proto:
            return proto == "https"
    return request.url.scheme == "https"


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Force https (308) for every non-local request when FORCE_HTTPS is on."""

    async def dispatch(self, request: Request, call_next):
        host = (request.url.hostname or "").lower()
        if config.FORCE_HTTPS and host not in _LOCAL_HOSTS and not _is_https(request):
            return RedirectResponse(str(request.url.replace(scheme="https")), status_code=308)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        h = response.headers
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"] = "DENY"
        h["Referrer-Policy"] = "strict-origin-when-cross-origin"
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        h["Cross-Origin-Resource-Policy"] = "same-site"
        if config.IS_PROD:  # Swagger UI is disabled in production, so a strict CSP is safe
            h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if config.FORCE_HTTPS and _is_https(request):
            h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def rate_limit(bucket: str, limit: int, window_s: int):
    """FastAPI dependency factory: `Depends(rate_limit('predict', 60, 60))`."""

    async def _dep(request: Request):
        allowed, remaining, retry_after = upstash.rate_limit(
            f"{bucket}:{hash_ip(client_ip(request))}", limit, window_s
        )
        request.state.rate_remaining = remaining
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down and try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )

    return _dep


def verify_turnstile(token: str, ip: str) -> bool:
    """Cloudflare Turnstile server-side check. Disabled (returns True) if no secret is set."""
    if not config.TURNSTILE_SECRET:
        return True
    if not token:
        return False
    data = urllib.parse.urlencode(
        {"secret": config.TURNSTILE_SECRET, "response": token, "remoteip": ip}
    ).encode()
    try:
        req = urllib.request.Request(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify", data=data, method="POST"
        )
        with urllib.request.urlopen(req, timeout=4) as resp:  # noqa: S310
            return bool(json.loads(resp.read().decode()).get("success"))
    except Exception:
        return False  # fail closed: a failed check must not let bots through
