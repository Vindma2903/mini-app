from __future__ import annotations

from dataclasses import dataclass

import httpx
from app.services.api_football_client import LiveMatchScore


@dataclass
class LiveMatch:
    title: str
    sport: str
    event_type: str


class PandaScoreClient:
    BASE_URL = "https://api.pandascore.co"

    def __init__(self, token: str, timeout_seconds: float = 8.0):
        self._token = token
        self._timeout = timeout_seconds

    async def fetch_first_live_match(self, game: str) -> LiveMatch | None:
        endpoint_game = _endpoint_game(game)
        app_sport = _app_sport(endpoint_game)

        url = f"{self.BASE_URL}/{endpoint_game}/matches"
        params = {"filter[status]": "running", "sort": "-begin_at", "page[size]": 1}
        headers = {"Authorization": f"Bearer {self._token}"}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            items = response.json()

        if not items:
            return None

        match = items[0]
        opponents = match.get("opponents") or []
        left = (opponents[0].get("opponent", {}) or {}).get("name", "Team A") if len(opponents) > 0 else "Team A"
        right = (opponents[1].get("opponent", {}) or {}).get("name", "Team B") if len(opponents) > 1 else "Team B"
        league = (match.get("league") or {}).get("name", endpoint_game.upper())

        # MVP constraint: sessions support only `goal` event type.
        event_type = "goal"
        return LiveMatch(
            title=f"{left} — {right} ({league})",
            sport=app_sport,
            event_type=event_type,
        )

    async def get_live_matches(self, games: tuple[str, ...] = ("cs2",)) -> list[LiveMatchScore]:
        result: list[LiveMatchScore] = []
        for game in games:
            endpoint_game = _endpoint_game(game)
            url = f"{self.BASE_URL}/{endpoint_game}/matches"
            params = {"filter[status]": "running", "sort": "-begin_at", "page[size]": 50}
            headers = {"Authorization": f"Bearer {self._token}"}

            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, params=params, headers=headers)
                response.raise_for_status()
                items = response.json()

            for item in items:
                mapped = _map_match_item(item, endpoint_game)
                if mapped is not None:
                    result.append(mapped)
        return result


def _endpoint_game(game: str) -> str:
    return {
        "cs2": "csgo",
        "csgo": "csgo",
        "dota2": "dota2",
        "lol": "lol",
        "valorant": "valorant",
    }.get(game.lower(), "csgo")


def _app_sport(endpoint_game: str) -> str:
    if endpoint_game == "csgo":
        return "cs2"
    return endpoint_game


def _map_match_item(item: object, endpoint_game: str) -> LiveMatchScore | None:
    if not isinstance(item, dict):
        return None
    match_id = item.get("id")
    if not isinstance(match_id, int):
        return None

    opponents = item.get("opponents") if isinstance(item.get("opponents"), list) else []
    left = (opponents[0].get("opponent", {}) or {}).get("name", "Team A") if len(opponents) > 0 else "Team A"
    right = (opponents[1].get("opponent", {}) or {}).get("name", "Team B") if len(opponents) > 1 else "Team B"
    left_id = (opponents[0].get("opponent", {}) or {}).get("id") if len(opponents) > 0 else None
    right_id = (opponents[1].get("opponent", {}) or {}).get("id") if len(opponents) > 1 else None

    left_score, right_score = _extract_scores(item.get("results"), left_id, right_id)
    league = ((item.get("league") or {}).get("name")) or endpoint_game.upper()
    status_short = _status_short(item.get("status"))
    started_at = item.get("begin_at") if isinstance(item.get("begin_at"), str) else None

    return LiveMatchScore(
        provider_match_id=match_id,
        league=str(league),
        home_team=str(left),
        away_team=str(right),
        home_score=left_score,
        away_score=right_score,
        elapsed_minutes=None,
        status_short=status_short,
        started_at=started_at,
    )


def _extract_scores(results: object, left_id: object, right_id: object) -> tuple[int | None, int | None]:
    if not isinstance(results, list):
        return None, None
    left_score: int | None = None
    right_score: int | None = None
    for row in results:
        if not isinstance(row, dict):
            continue
        team_id = row.get("team_id")
        score = row.get("score")
        parsed_score = int(score) if isinstance(score, (int, float)) else None
        if team_id == left_id:
            left_score = parsed_score
        elif team_id == right_id:
            right_score = parsed_score
    return left_score, right_score


def _status_short(status: object) -> str | None:
    if not isinstance(status, str):
        return None
    normalized = status.lower()
    if normalized == "running":
        return "LIVE"
    if normalized == "finished":
        return "FT"
    if normalized == "not_started":
        return "NS"
    return normalized.upper()
