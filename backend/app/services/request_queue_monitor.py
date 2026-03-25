from __future__ import annotations

from collections import deque
from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4


class RequestQueueMonitor:
    def __init__(self, max_history: int = 500):
        self._active: dict[str, dict] = {}
        self._history: deque[dict] = deque(maxlen=max_history)
        self._lock = Lock()

    def start(self, method: str, path: str) -> str:
        request_id = uuid4().hex
        now = datetime.now(UTC).isoformat()
        item = {
            "id": request_id,
            "method": method,
            "path": path,
            "status": "in_progress",
            "started_at": now,
            "finished_at": None,
            "status_code": None,
            "error": None,
        }
        with self._lock:
            self._active[request_id] = item
        return request_id

    def finish(self, request_id: str, status_code: int, error: str | None = None) -> None:
        now = datetime.now(UTC).isoformat()
        with self._lock:
            item = self._active.pop(request_id, None)
            if item is None:
                return
            item["finished_at"] = now
            item["status_code"] = status_code
            item["error"] = error
            item["status"] = "success" if status_code < 400 and error is None else "error"
            self._history.appendleft(item)

    def snapshot(self, limit: int = 200) -> dict[str, list[dict]]:
        safe_limit = max(1, min(limit, 1000))
        with self._lock:
            in_progress = list(self._active.values())[:safe_limit]
            recent = list(self._history)[:safe_limit]
        return {
            "in_progress": in_progress,
            "recent": recent,
        }


_monitor = RequestQueueMonitor()


def get_request_queue_monitor() -> RequestQueueMonitor:
    return _monitor
