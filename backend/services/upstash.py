"""
Upstash Redis over its REST API (no SDK needed, stdlib only).
Used for: fixed-window rate limiting and a small response cache.
If Upstash is not configured, or is unreachable, we fall back to an in-process
store so local development works and the API never goes down because Redis did.
"""
import json
import threading
import time
import urllib.request
from typing import Any, Optional, Tuple

from . import config

_lock = threading.Lock()
_mem_counts: dict = {}
_mem_cache: dict = {}


def enabled() -> bool:
    return bool(config.UPSTASH_URL and config.UPSTASH_TOKEN)


def _pipeline(commands: list) -> list:
    req = urllib.request.Request(
        f"{config.UPSTASH_URL}/pipeline",
        data=json.dumps(commands).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {config.UPSTASH_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=2.5) as resp:  # noqa: S310 (fixed https URL from env)
        return json.loads(resp.read().decode("utf-8"))


def rate_limit(key: str, limit: int, window_s: int) -> Tuple[bool, int, int]:
    """Fixed-window limiter. Returns (allowed, remaining, retry_after_seconds)."""
    now = int(time.time())
    bucket = now // window_s
    retry_after = window_s - (now % window_s)
    k = f"rl:{key}:{bucket}"

    count: Optional[int] = None
    if enabled():
        try:
            res = _pipeline([["INCR", k], ["EXPIRE", k, window_s]])
            count = int(res[0]["result"])
        except Exception:
            count = None  # fall through to in-memory limiter
    if count is None:
        with _lock:
            # drop stale buckets so memory stays bounded
            for old in [x for x in _mem_counts if int(x.rsplit(":", 1)[1]) < bucket]:
                _mem_counts.pop(old, None)
            mk = f"{k}"
            _mem_counts[mk] = _mem_counts.get(mk, 0) + 1
            count = _mem_counts[mk]
    return count <= limit, max(0, limit - count), retry_after


def cache_get(key: str) -> Optional[Any]:
    if enabled():
        try:
            res = _pipeline([["GET", f"cache:{key}"]])
            raw = res[0].get("result")
            return json.loads(raw) if raw else None
        except Exception:
            pass
    with _lock:
        item = _mem_cache.get(key)
        if item and item[0] > time.time():
            return item[1]
    return None


def cache_set(key: str, value: Any, ttl_s: int = 300) -> None:
    if enabled():
        try:
            _pipeline([["SET", f"cache:{key}", json.dumps(value), "EX", ttl_s]])
            return
        except Exception:
            pass
    with _lock:
        _mem_cache[key] = (time.time() + ttl_s, value)


def cached(key: str, ttl_s: int, producer):
    hit = cache_get(key)
    if hit is not None:
        return hit
    value = producer()
    cache_set(key, value, ttl_s)
    return value
