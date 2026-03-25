from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import httpx

from app.services.api_football_client import LiveMatchScore


class SportSrcClient:
    def __init__(self, base_url: str = "https://api.sportsrc.org/", timeout_seconds: float = 8.0):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    async def get_esports_matches(self) -> list[LiveMatchScore]:
        params = {"data": "matches", "category": "esports"}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(self._base_url, params=params)
            response.raise_for_status()
            payload = response.json()

        items = _extract_items(payload)
        result: list[LiveMatchScore] = []
        for item in items:
            mapped = _map_item(item)
            if mapped is not None:
                result.append(mapped)
        return result


def _extract_items(payload: object) -> list[object]:
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    for key in ("response", "matches", "data", "items"):
        value = payload.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            nested_matches = value.get("matches")
            if isinstance(nested_matches, list):
                return nested_matches
    return []


def _map_item(item: object) -> LiveMatchScore | None:
    if not isinstance(item, dict):
        return None

    match_id = _to_match_id(item)
    home_team, away_team = _teams(item)
    home_score, away_score = _scores(item)
    status_short = _status(item)
    started_at = _started_at(item)
    league = _to_str(item.get("league") or item.get("tournament") or item.get("competition") or "Esports")
    elapsed = _to_int(item.get("elapsed_minutes") or item.get("minute") or item.get("elapsed"))

    return LiveMatchScore(
        provider_match_id=match_id,
        league=league,
        home_team=home_team,
        away_team=away_team,
        home_score=home_score,
        away_score=away_score,
        elapsed_minutes=elapsed,
        status_short=status_short,
        started_at=started_at,
    )


def _to_match_id(item: dict) -> int:
    raw = item.get("id") or item.get("match_id") or item.get("slug") or item.get("url")
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str):
        try:
            return int(raw)
        except ValueError:
            digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
            return int(digest, 16)
    serialized = str(sorted(item.items()))
    digest = hashlib.sha1(serialized.encode("utf-8")).hexdigest()[:12]
    return int(digest, 16)


def _teams(item: dict) -> tuple[str, str]:
    teams = item.get("teams")
    if isinstance(teams, list) and len(teams) >= 2:
        left = _to_str(_team_name(teams[0]) or "Team A")
        right = _to_str(_team_name(teams[1]) or "Team B")
        return left, right
    home = _to_str(item.get("home_team") or item.get("team1") or item.get("home") or "Team A")
    away = _to_str(item.get("away_team") or item.get("team2") or item.get("away") or "Team B")
    return home, away


def _team_name(value: object) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("name", "title", "team"):
            candidate = value.get(key)
            if isinstance(candidate, str):
                return candidate
    return None


def _scores(item: dict) -> tuple[int | None, int | None]:
    scores = item.get("scores")
    if isinstance(scores, dict):
        return _to_int(scores.get("home")), _to_int(scores.get("away"))
    return _to_int(item.get("home_score")), _to_int(item.get("away_score"))


def _status(item: dict) -> str | None:
    for key in ("status_short", "status", "state"):
        value = item.get(key)
        if isinstance(value, str):
            return value.upper()
    if item.get("live") is True:
        return "LIVE"
    return None


def _started_at(item: dict) -> str | None:
    value = item.get("started_at") or item.get("date") or item.get("start_time") or item.get("timestamp")
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=UTC).isoformat()
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.isdigit():
            return datetime.fromtimestamp(float(stripped), tz=UTC).isoformat()
        return stripped
    return None


def _to_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_str(value: object) -> str:
    return str(value)
