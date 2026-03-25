from __future__ import annotations

from dataclasses import dataclass

import httpx


@dataclass
class LiveMatchScore:
    provider_match_id: int
    league: str
    home_team: str
    away_team: str
    home_score: int | None
    away_score: int | None
    elapsed_minutes: int | None
    status_short: str | None
    started_at: str | None


class ApiFootballClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://v3.football.api-sports.io",
        timeout_seconds: float = 8.0,
    ):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    async def get_live_matches(self) -> list[LiveMatchScore]:
        url = f"{self._base_url}/fixtures"
        # API-FOOTBALL requires GET and `x-apisports-key` header.
        headers = {"x-apisports-key": self._api_key}
        params = {"live": "all"}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()

        items = payload.get("response") or []
        return [mapped for mapped in (_map_fixture_item(item) for item in items) if mapped is not None]

    async def get_popular_matches(self, upcoming_count: int = 20) -> list[LiveMatchScore]:
        url = f"{self._base_url}/fixtures"
        headers = {"x-apisports-key": self._api_key}
        live_params = {"live": "all"}
        upcoming_params = {"next": str(max(1, upcoming_count))}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            live_response = await client.get(url, params=live_params, headers=headers)
            live_response.raise_for_status()
            upcoming_response = await client.get(url, params=upcoming_params, headers=headers)
            upcoming_response.raise_for_status()
            live_payload = live_response.json()
            upcoming_payload = upcoming_response.json()

        live_items = live_payload.get("response") or []
        upcoming_items = upcoming_payload.get("response") or []
        combined: list[LiveMatchScore] = []
        seen_ids: set[int] = set()

        def add_items(items: list[object]) -> None:
            for item in items:
                mapped = _map_fixture_item(item)
                if mapped is None:
                    continue
                if mapped.provider_match_id in seen_ids:
                    continue
                seen_ids.add(mapped.provider_match_id)
                combined.append(mapped)

        add_items(live_items)
        add_items(upcoming_items)

        def sort_key(item: LiveMatchScore) -> tuple[int, str]:
            status = (item.status_short or "").upper()
            is_live = status in {"1H", "2H", "ET", "HT", "PEN", "LIVE"}
            return (0 if is_live else 1, item.started_at or "9999-99-99T99:99:99")

        combined.sort(key=sort_key)
        return combined[:24]


def _map_fixture_item(item: object) -> LiveMatchScore | None:
    if not isinstance(item, dict):
        return None
    fixture = item.get("fixture") or {}
    league = item.get("league") or {}
    teams = item.get("teams") or {}
    goals = item.get("goals") or {}
    status = fixture.get("status") or {}
    fixture_id = _to_int_or_none(fixture.get("id"))
    if fixture_id is None:
        return None
    return LiveMatchScore(
        provider_match_id=fixture_id,
        league=str(league.get("name") or "Unknown league"),
        home_team=str((teams.get("home") or {}).get("name") or "Home"),
        away_team=str((teams.get("away") or {}).get("name") or "Away"),
        home_score=_to_int_or_none(goals.get("home")),
        away_score=_to_int_or_none(goals.get("away")),
        elapsed_minutes=_to_int_or_none(status.get("elapsed")),
        status_short=_to_str_or_none(status.get("short")),
        started_at=_to_str_or_none(fixture.get("date")),
    )


def _to_int_or_none(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_str_or_none(value: object) -> str | None:
    if value is None:
        return None
    return str(value)
