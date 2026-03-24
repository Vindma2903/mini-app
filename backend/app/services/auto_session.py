from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import Session, SessionStatus
from app.services.pandascore_client import PandaScoreClient

logger = logging.getLogger(__name__)


class AutoSessionManager:
    def __init__(self):
        self._settings = get_settings()
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self._client = PandaScoreClient(self._settings.pandascore_api_token)

    def start(self) -> None:
        if not self._settings.auto_session_enabled:
            logger.info("Auto-session disabled")
            return
        if not self._settings.pandascore_api_token:
            logger.warning("Auto-session enabled but PANDASCORE_API_TOKEN is empty")
            return
        if self._task and not self._task.done():
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run(), name="auto-session-manager")

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run(self) -> None:
        interval = max(5, self._settings.auto_session_poll_seconds)
        while not self._stop_event.is_set():
            try:
                await self._tick()
            except Exception:
                logger.exception("Auto-session tick failed")
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=interval)
            except TimeoutError:
                continue

    async def _tick(self) -> None:
        with SessionLocal() as db:
            active_exists = db.scalar(
                select(Session.id).where(
                    Session.status.in_(
                        [SessionStatus.WAITING, SessionStatus.PREDICTING, SessionStatus.LOCKED]
                    )
                )
            )
            if active_exists:
                return

        live_match = await self._client.fetch_first_live_match(self._settings.auto_session_game)
        if not live_match:
            return

        with SessionLocal() as db:
            active_exists = db.scalar(
                select(Session.id).where(
                    Session.status.in_(
                        [SessionStatus.WAITING, SessionStatus.PREDICTING, SessionStatus.LOCKED]
                    )
                )
            )
            if active_exists:
                return

            session = Session(
                title=live_match.title,
                sport=live_match.sport,
                event_type=live_match.event_type,
                status=SessionStatus.PREDICTING,
                prediction_window_ms=self._settings.auto_session_prediction_window_ms,
                stream_delay_ms=self._settings.auto_session_stream_delay_ms,
            )
            db.add(session)
            db.commit()
            logger.info("Auto-created session id=%s title=%s", session.id, session.title)
