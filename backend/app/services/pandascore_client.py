from __future__ import annotations

from dataclasses import dataclass

import httpx


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
        endpoint_game = {
            "cs2": "csgo",
            "csgo": "csgo",
            "dota2": "dota2",
            "lol": "lol",
        }.get(game.lower(), "csgo")

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

        event_type = "round" if endpoint_game == "csgo" else "kill"
        return LiveMatch(
            title=f"{left} — {right} ({league})",
            sport=endpoint_game,
            event_type=event_type,
        )
