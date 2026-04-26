"""Tool registry exposed to Gemma via OpenAI-compatible function calling.

Each entry has:
  - spec: JSON-schema parameters block sent to the model
  - run:  callable(args: dict) -> dict, executed when the model calls the tool

Schemas reflect the Cohort desktop app's expectations; column names follow the
Supabase tables the Electron client + overlay write to. Adjust signatures once
the live `sessions` schema is finalized.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from .supabase_client import supabase


def _ok(data: Any) -> dict[str, Any]:
    return {"ok": True, "data": data}


def _err(msg: str) -> dict[str, Any]:
    return {"ok": False, "error": msg}


def _get_recent_sessions(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    limit = int(args.get("limit", 10))
    if not user_id:
        return _err("user_id required")
    res = (
        supabase.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return _ok(res.data)


def _get_session(args: dict[str, Any]) -> dict[str, Any]:
    session_id = args.get("session_id")
    if not session_id:
        return _err("session_id required")
    session = (
        supabase.table("sessions").select("*").eq("id", session_id).maybe_single().execute()
    )
    screens = (
        supabase.table("screen_classifications")
        .select("captured_at, classification, confidence")
        .eq("session_id", session_id)
        .order("captured_at")
        .execute()
    )
    return _ok({"session": session.data, "screens": screens.data})


def _get_session_screens(args: dict[str, Any]) -> dict[str, Any]:
    session_id = args.get("session_id")
    if not session_id:
        return _err("session_id required")
    res = (
        supabase.table("screen_classifications")
        .select("captured_at, classification, confidence, metadata")
        .eq("session_id", session_id)
        .order("captured_at")
        .execute()
    )
    return _ok(res.data)


def _get_screen_classifications(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    since_iso = args.get("since_iso")
    limit = int(args.get("limit", 100))
    if not user_id:
        return _err("user_id required")
    q = (
        supabase.table("screen_classifications")
        .select("captured_at, classification, confidence")
        .eq("user_id", user_id)
        .order("captured_at", desc=True)
        .limit(limit)
    )
    if since_iso:
        q = q.gte("captured_at", since_iso)
    return _ok(q.execute().data)


def _summarize_day(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    date = args.get("date")
    if not user_id or not date:
        return _err("user_id and date required")
    start = f"{date}T00:00:00+00:00"
    end = f"{date}T23:59:59+00:00"
    sessions = (
        supabase.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .gte("started_at", start)
        .lte("started_at", end)
        .execute()
    )
    screens = (
        supabase.table("screen_classifications")
        .select("classification")
        .eq("user_id", user_id)
        .gte("captured_at", start)
        .lte("captured_at", end)
        .execute()
    )
    counts: dict[str, int] = {}
    for row in screens.data or []:
        label = row.get("classification") or "unknown"
        counts[label] = counts.get(label, 0) + 1
    return _ok(
        {
            "date": date,
            "session_count": len(sessions.data or []),
            "sessions": sessions.data,
            "classification_counts": counts,
        }
    )


def _get_dashboard_metrics(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    window_days = int(args.get("window_days", 7))
    if not user_id:
        return _err("user_id required")
    since = (datetime.now(timezone.utc) - timedelta(days=window_days)).isoformat()
    sessions = (
        supabase.table("sessions")
        .select("started_at, ended_at")
        .eq("user_id", user_id)
        .gte("started_at", since)
        .execute()
    )
    rows = sessions.data or []
    total = len(rows)
    days_active = len({(r.get("started_at") or "")[:10] for r in rows if r.get("started_at")})
    return _ok({"total_sessions": total, "days_active": days_active, "window_days": window_days})


def _search_sessions(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    query = args.get("query", "")
    limit = int(args.get("limit", 20))
    if not user_id or not query:
        return _err("user_id and query required")
    res = (
        supabase.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .ilike("title", f"%{query}%")
        .limit(limit)
        .execute()
    )
    return _ok(res.data)


def _get_user_profile(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    if not user_id:
        return _err("user_id required")
    res = supabase.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    return _ok(res.data)


REGISTRY: dict[str, dict[str, Any]] = {
    "get_recent_sessions": {
        "run": _get_recent_sessions,
        "spec": {
            "type": "function",
            "function": {
                "name": "get_recent_sessions",
                "description": "Most recent focus sessions for a user, newest first.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "limit": {"type": "integer", "default": 10},
                    },
                    "required": ["user_id"],
                },
            },
        },
    },
    "get_session": {
        "run": _get_session,
        "spec": {
            "type": "function",
            "function": {
                "name": "get_session",
                "description": "One session row plus its joined screen classifications.",
                "parameters": {
                    "type": "object",
                    "properties": {"session_id": {"type": "string"}},
                    "required": ["session_id"],
                },
            },
        },
    },
    "get_session_screens": {
        "run": _get_session_screens,
        "spec": {
            "type": "function",
            "function": {
                "name": "get_session_screens",
                "description": "Screen classifications recorded during one session.",
                "parameters": {
                    "type": "object",
                    "properties": {"session_id": {"type": "string"}},
                    "required": ["session_id"],
                },
            },
        },
    },
    "get_screen_classifications": {
        "run": _get_screen_classifications,
        "spec": {
            "type": "function",
            "function": {
                "name": "get_screen_classifications",
                "description": "Recent screen-classification rows for a user.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "since_iso": {"type": "string"},
                        "limit": {"type": "integer", "default": 100},
                    },
                    "required": ["user_id"],
                },
            },
        },
    },
    "summarize_day": {
        "run": _summarize_day,
        "spec": {
            "type": "function",
            "function": {
                "name": "summarize_day",
                "description": "Aggregate sessions and classification counts for one date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "date": {"type": "string", "description": "YYYY-MM-DD"},
                    },
                    "required": ["user_id", "date"],
                },
            },
        },
    },
    "get_dashboard_metrics": {
        "run": _get_dashboard_metrics,
        "spec": {
            "type": "function",
            "function": {
                "name": "get_dashboard_metrics",
                "description": "Totals and active-day count over a recent window.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "window_days": {"type": "integer", "default": 7},
                    },
                    "required": ["user_id"],
                },
            },
        },
    },
    "search_sessions": {
        "run": _search_sessions,
        "spec": {
            "type": "function",
            "function": {
                "name": "search_sessions",
                "description": "Case-insensitive title search across a user's sessions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "query": {"type": "string"},
                        "limit": {"type": "integer", "default": 20},
                    },
                    "required": ["user_id", "query"],
                },
            },
        },
    },
    "get_user_profile": {
        "run": _get_user_profile,
        "spec": {
            "type": "function",
            "function": {
                "name": "get_user_profile",
                "description": "Profile/settings row for a user.",
                "parameters": {
                    "type": "object",
                    "properties": {"user_id": {"type": "string"}},
                    "required": ["user_id"],
                },
            },
        },
    },
}


def specs() -> list[dict[str, Any]]:
    return [t["spec"] for t in REGISTRY.values()]


def run(name: str, args: dict[str, Any]) -> dict[str, Any]:
    entry = REGISTRY.get(name)
    if not entry:
        return _err(f"unknown tool: {name}")
    fn: Callable[[dict[str, Any]], dict[str, Any]] = entry["run"]
    try:
        return fn(args)
    except Exception as e:  # noqa: BLE001
        return _err(f"{type(e).__name__}: {e}")
