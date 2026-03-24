from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
import time


class SportType(str, Enum):
    FOOTBALL = "football"
    BASKETBALL = "basketball"
    ESPORTS = "esports"
    TENNIS = "tennis"
    HOCKEY = "hockey"


class EventType(str, Enum):
    GOAL = "goal"
    POINT = "point"
    KILL = "kill"
    ACE = "ace"
    STRIKE = "strike"
    CUSTOM = "custom"


class SessionStatus(str, Enum):
    WAITING = "waiting"       # ждём начала
    PREDICTING = "predicting" # окно для предсказаний открыто
    LOCKED = "locked"         # окно закрыто, событие ожидается
    RESOLVED = "resolved"     # событие произошло, очки начислены


class Session(BaseModel):
    id: str
    title: str
    sport: SportType
    event_type: EventType
    status: SessionStatus = SessionStatus.WAITING
    prediction_window_ms: int = 30000   # 30 сек окно для ставок
    stream_delay_ms: int = 7000         # типичная задержка трансляции
    created_at: float = 0.0
    locked_at: Optional[float] = None
    event_occurred_at: Optional[float] = None
    commentary_context: str = ""        # последние комментарии для AI


class Prediction(BaseModel):
    user_id: str
    username: str
    session_id: str
    predicted_at_ms: float              # unix timestamp * 1000 в момент клика
    client_offset_ms: float = 0.0      # компенсация задержки клиента
    score: Optional[int] = None
    delta_ms: Optional[float] = None   # разница с реальным событием
    ai_commentary: Optional[str] = None


class PredictRequest(BaseModel):
    user_id: str
    username: str
    session_id: str
    client_timestamp_ms: float
    stream_delay_compensation_ms: float = 0.0


class CommentaryRequest(BaseModel):
    session_id: str
    commentary: str
    timestamp_ms: float


class EventOccurredRequest(BaseModel):
    session_id: str
    actual_timestamp_ms: float          # реальный момент события
    event_description: str = ""


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    total_score: int
    predictions_count: int
    best_delta_ms: Optional[float]
    avg_score: float


class AIInsight(BaseModel):
    type: str                           # "hint" | "event_detected" | "score_explanation"
    content: str
    confidence: Optional[float] = None
    suggested_timing_ms: Optional[float] = None


class WSMessage(BaseModel):
    type: str
    payload: dict
