"""
Minimal Supabase (PostgREST) client using the SERVICE ROLE key, stdlib only.
Runs on the server; the key never reaches the browser. Tables have RLS enabled
with no public policies (see backend/supabase/schema.sql), so the anon key
cannot read or write them even if someone finds it.
"""
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from . import config


def enabled() -> bool:
    return bool(config.SUPABASE_URL and config.SUPABASE_SERVICE_KEY)


def _request(method: str, table: str, params: Optional[Dict[str, str]] = None,
             body: Optional[Any] = None, prefer: Optional[str] = None) -> Any:
    url = f"{config.SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {
        "apikey": config.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310 (fixed https URL from env)
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else None


def insert(table: str, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    out = _request("POST", table, body=row, prefer="return=representation")
    return out[0] if out else None


def select(table: str, order: str = "id.desc", limit: int = 50,
           filters: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    params = {"select": "*", "order": order, "limit": str(limit)}
    params.update(filters or {})
    return _request("GET", table, params=params) or []


def update(table: str, match: Dict[str, str], patch: Dict[str, Any]) -> List[Dict[str, Any]]:
    return _request("PATCH", table, params=match, body=patch, prefer="return=representation") or []
