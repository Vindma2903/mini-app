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
        result: list[LiveMatchScore] = []
        for item in items:
            fixture = item.get("fixture") or {}
            league = item.get("league") or {}
            teams = item.get("teams") or {}
            goals = item.get("goals") or {}
            status = fixture.get("status") or {}
            result.append(
                LiveMatchScore(
                    provider_match_id=int(fixture.get("id", 0)),
                    league=str(league.get("name") or "Unknown league"),
                    home_team=str((teams.get("home") or {}).get("name") or "Home"),
                    away_team=str((teams.get("away") or {}).get("name") or "Away"),
                    home_score=_to_int_or_none(goals.get("home")),
                    away_score=_to_int_or_none(goals.get("away")),
                    elapsed_minutes=_to_int_or_none(status.get("elapsed")),
                    status_short=_to_str_or_none(status.get("short")),
                    started_at=_to_str_or_none(fixture.get("date")),
                )
            )
        return result


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
