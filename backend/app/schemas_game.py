from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import SessionStatus


class SessionCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    sport: str = Field(min_length=2, max_length=64)
    event_type: str = Field(min_length=2, max_length=64)
    prediction_window_ms: int = Field(default=30_000, ge=1_000, le=120_000)
    stream_delay_ms: int = Field(default=7_000, ge=0, le=60_000)


class SessionStatusPatchRequest(BaseModel):
    status: SessionStatus


class SessionPublic(BaseModel):
    id: int
    title: str
    sport: str
    event_type: str
    status: SessionStatus
    prediction_window_ms: int
    stream_delay_ms: int
    created_at: datetime
    locked_at: datetime | None
    event_occurred_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PredictionCreateRequest(BaseModel):
    session_id: int
    client_timestamp_ms: int = Field(gt=0)
    stream_delay_compensation_ms: int = Field(default=0, ge=0, le=60_000)


class PredictionPublic(BaseModel):
    id: int
    session_id: int
    user_id: int
    predicted_at_ms: int
    client_offset_ms: int
    score: int | None
    delta_ms: int | None
    ai_commentary: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    total_score: int
    predictions_count: int
    best_delta_ms: int | None = None
    avg_score: float | None = None


class LeaderboardResponse(BaseModel):
    items: list[LeaderboardEntry]


class ResolveSessionRequest(BaseModel):
    session_id: int
    actual_timestamp_ms: int = Field(gt=0)


class CommentaryRequest(BaseModel):
    session_id: int
    commentary: str = Field(min_length=3)


class CommentaryResponse(BaseModel):
    event_detected: bool
    confidence: float
    reasoning: str


class CoachAdviceResponse(BaseModel):
    session_id: int
    timing_profile: str
    summary: str
    tips: list[str]
    avg_delta_ms: int | None
    recent_predictions: int


class MatchmakingPlayerPublic(BaseModel):
    user_id: int
    username: str
    total_score: int
    predictions_count: int
    avg_score: float
    best_delta_ms: int | None = None
    skill_score: float
    risk_score: float
    consistency_score: float


class MatchmakingBucketPublic(BaseModel):
    bucket: str
    title: str
    players: list[MatchmakingPlayerPublic]


class MatchmakingPreviewResponse(BaseModel):
    session_id: int | None
    generated_at: datetime
    your_bucket: str | None = None
    buckets: list[MatchmakingBucketPublic]


class RequestQueueItemPublic(BaseModel):
    id: str
    method: str
    path: str
    status: str
    started_at: str
    finished_at: str | None
    status_code: int | None
    error: str | None


class RequestQueueSnapshotResponse(BaseModel):
    in_progress: list[RequestQueueItemPublic]
    recent: list[RequestQueueItemPublic]


class LiveMatchPublic(BaseModel):
    provider_match_id: int
    league: str
    home_team: str
    away_team: str
    home_score: int | None
    away_score: int | None
    elapsed_minutes: int | None
    status_short: str | None
    started_at: str | None
