import math
import time
from collections import defaultdict, deque
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_admin_user, get_current_user
from app.config import get_settings
from app.models import Prediction, Session as GameSession, SessionStatus, User
from app.schemas_game import (
    CoachAdviceResponse,
    CommentaryRequest,
    CommentaryResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    LiveMatchPublic,
    MatchmakingBucketPublic,
    MatchmakingPlayerPublic,
    MatchmakingPreviewResponse,
    PredictionCreateRequest,
    PredictionPublic,
    ResolveSessionRequest,
    SessionCreateRequest,
    SessionPublic,
    SessionStatusPatchRequest,
)
from app.services.api_football_client import ApiFootballClient

router = APIRouter(tags=["game"])
_live_matches_cache: list[LiveMatchPublic] | None = None
_live_matches_cache_expires_at = 0.0
_live_matches_request_history: dict[int, deque[float]] = defaultdict(deque)
_SUPPORTED_SPORTS = {"football", "cs2"}
_SUPPORTED_EVENT_TYPE = "goal"
_SCORE_K_MS = 30


def _user_public_name(user: User) -> str:
    return user.telegram_username or user.display_name or user.email.split("@", maxsplit=1)[0]


def _score_prediction(predicted_at_ms: int, actual_event_ms: int, stream_delay_ms: int) -> tuple[int, int]:
    adjusted_delta_ms = max(0, abs(predicted_at_ms - actual_event_ms) - stream_delay_ms)
    score = max(0, 1000 - math.floor(adjusted_delta_ms / _SCORE_K_MS))
    return score, adjusted_delta_ms


def _avg(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _stddev(values: list[float]) -> float:
    if len(values) <= 1:
        return 0.0
    mean = _avg(values)
    variance = sum((value - mean) ** 2 for value in values) / len(values)
    return math.sqrt(variance)


@router.get("/matches/live", response_model=list[LiveMatchPublic])
async def get_live_matches(current_user: User = Depends(get_current_user)) -> list[LiveMatchPublic]:
    global _live_matches_cache, _live_matches_cache_expires_at
    settings = get_settings()
    if not settings.api_football_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API_FOOTBALL_API_KEY is not configured",
        )

    now = time.monotonic()
    _enforce_live_rate_limit(
        user_id=current_user.id,
        now=now,
        limit_per_minute=max(1, settings.live_matches_rate_limit_per_minute),
    )

    if _live_matches_cache is not None and now < _live_matches_cache_expires_at:
        return _live_matches_cache

    client = ApiFootballClient(
        api_key=settings.api_football_api_key,
        base_url=settings.api_football_base_url,
        timeout_seconds=settings.api_football_timeout_seconds,
    )
    try:
        items = await client.get_live_matches()
    except httpx.HTTPError:
        if _live_matches_cache is not None:
            return _live_matches_cache
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Live matches provider is unavailable",
        ) from None

    payload = [
        LiveMatchPublic(
            provider_match_id=item.provider_match_id,
            league=item.league,
            home_team=item.home_team,
            away_team=item.away_team,
            home_score=item.home_score,
            away_score=item.away_score,
            elapsed_minutes=item.elapsed_minutes,
            status_short=item.status_short,
            started_at=item.started_at,
        )
        for item in items
    ]
    _live_matches_cache = payload
    _live_matches_cache_expires_at = now + max(1, settings.live_matches_cache_ttl_seconds)
    return payload


def _enforce_live_rate_limit(user_id: int, now: float, limit_per_minute: int) -> None:
    history = _live_matches_request_history[user_id]
    cutoff = now - 60.0
    while history and history[0] < cutoff:
        history.popleft()

    if len(history) >= limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many live matches requests, please retry later",
        )
    history.append(now)


@router.get("/sessions/active", response_model=SessionPublic | None)
def get_active_session(db: Session = Depends(get_db)) -> SessionPublic | None:
    stmt = (
        select(GameSession)
        .where(GameSession.status.in_([SessionStatus.WAITING, SessionStatus.PREDICTING, SessionStatus.LOCKED]))
        .order_by(GameSession.created_at.desc())
        .limit(1)
    )
    session = db.scalar(stmt)
    return SessionPublic.model_validate(session) if session else None


@router.get("/sessions/{session_id}", response_model=SessionPublic)
def get_session(session_id: int, db: Session = Depends(get_db)) -> SessionPublic:
    session = db.get(GameSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return SessionPublic.model_validate(session)


@router.post("/sessions", response_model=SessionPublic)
def create_session(
    payload: SessionCreateRequest,
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> SessionPublic:
    sport = payload.sport.lower().strip()
    event_type = payload.event_type.lower().strip()
    if sport not in _SUPPORTED_SPORTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only football and cs2 are supported in this prototype",
        )
    if event_type != _SUPPORTED_EVENT_TYPE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only goal event type is supported in this prototype",
        )

    session = GameSession(
        title=payload.title,
        sport=sport,
        event_type=event_type,
        prediction_window_ms=payload.prediction_window_ms,
        stream_delay_ms=payload.stream_delay_ms,
        status=SessionStatus.WAITING,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionPublic.model_validate(session)


@router.patch("/sessions/{session_id}/status", response_model=SessionPublic)
def patch_session_status(
    session_id: int,
    payload: SessionStatusPatchRequest,
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> SessionPublic:
    session = db.get(GameSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.status = payload.status
    if payload.status == SessionStatus.LOCKED and session.locked_at is None:
        session.locked_at = datetime.now(UTC)
    if payload.status == SessionStatus.RESOLVED and session.event_occurred_at is None:
        session.event_occurred_at = datetime.now(UTC)

    db.commit()
    db.refresh(session)
    return SessionPublic.model_validate(session)


@router.post("/predictions", response_model=PredictionPublic)
def create_prediction(
    payload: PredictionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictionPublic:
    session = db.get(GameSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status != SessionStatus.PREDICTING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Prediction window is closed")

    prediction = Prediction(
        session_id=session.id,
        user_id=current_user.id,
        predicted_at_ms=payload.client_timestamp_ms,
        client_offset_ms=payload.stream_delay_compensation_ms,
    )
    db.add(prediction)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Prediction already exists") from None

    db.refresh(prediction)
    return PredictionPublic.model_validate(prediction)


@router.get("/predictions/me/{session_id}", response_model=PredictionPublic | None)
def get_my_prediction(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PredictionPublic | None:
    stmt = (
        select(Prediction)
        .where(Prediction.session_id == session_id, Prediction.user_id == current_user.id)
        .limit(1)
    )
    prediction = db.scalar(stmt)
    return PredictionPublic.model_validate(prediction) if prediction else None


@router.get("/leaderboard/{session_id}", response_model=LeaderboardResponse)
def session_leaderboard(session_id: int, db: Session = Depends(get_db)) -> LeaderboardResponse:
    stmt = (
        select(Prediction, User)
        .join(User, User.id == Prediction.user_id)
        .where(Prediction.session_id == session_id, Prediction.score.is_not(None))
        .order_by(Prediction.score.desc(), Prediction.predicted_at_ms.asc())
    )
    rows = db.execute(stmt).all()
    items = [
        LeaderboardEntry(
            rank=idx,
            user_id=user.id,
            username=_user_public_name(user),
            total_score=prediction.score or 0,
            predictions_count=1,
            best_delta_ms=prediction.delta_ms,
            avg_score=float(prediction.score or 0),
        )
        for idx, (prediction, user) in enumerate(rows, start=1)
    ]
    return LeaderboardResponse(items=items)


@router.get("/leaderboard/global", response_model=LeaderboardResponse)
def global_leaderboard(db: Session = Depends(get_db)) -> LeaderboardResponse:
    stmt = (
        select(
            User.id.label("user_id"),
            User.email.label("email"),
            User.display_name.label("display_name"),
            User.telegram_username.label("telegram_username"),
            func.coalesce(func.sum(Prediction.score), 0).label("total_score"),
            func.count(Prediction.id).label("predictions_count"),
            func.min(Prediction.delta_ms).label("best_delta_ms"),
            func.avg(Prediction.score).label("avg_score"),
        )
        .join(Prediction, Prediction.user_id == User.id)
        .where(Prediction.score.is_not(None))
        .group_by(User.id, User.email, User.display_name, User.telegram_username)
        .order_by(func.sum(Prediction.score).desc(), func.min(Prediction.delta_ms).asc())
    )
    rows = db.execute(stmt).all()

    items: list[LeaderboardEntry] = []
    for rank, row in enumerate(rows, start=1):
        username = row.telegram_username or row.display_name or row.email.split("@", maxsplit=1)[0]
        items.append(
            LeaderboardEntry(
                rank=rank,
                user_id=row.user_id,
                username=username,
                total_score=int(row.total_score or 0),
                predictions_count=int(row.predictions_count or 0),
                best_delta_ms=int(row.best_delta_ms) if row.best_delta_ms is not None else None,
                avg_score=float(row.avg_score) if row.avg_score is not None else None,
            )
        )
    return LeaderboardResponse(items=items)


@router.get("/leaderboard/daily", response_model=LeaderboardResponse)
def daily_leaderboard(db: Session = Depends(get_db)) -> LeaderboardResponse:
    now_utc = datetime.now(UTC)
    day_start_utc = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=UTC)
    stmt = (
        select(
            User.id.label("user_id"),
            User.email.label("email"),
            User.display_name.label("display_name"),
            User.telegram_username.label("telegram_username"),
            func.coalesce(func.sum(Prediction.score), 0).label("total_score"),
            func.count(Prediction.id).label("predictions_count"),
            func.min(Prediction.delta_ms).label("best_delta_ms"),
            func.avg(Prediction.score).label("avg_score"),
        )
        .join(Prediction, Prediction.user_id == User.id)
        .where(Prediction.score.is_not(None), Prediction.created_at >= day_start_utc)
        .group_by(User.id, User.email, User.display_name, User.telegram_username)
        .order_by(func.sum(Prediction.score).desc(), func.min(Prediction.delta_ms).asc())
    )
    rows = db.execute(stmt).all()

    items: list[LeaderboardEntry] = []
    for rank, row in enumerate(rows, start=1):
        username = row.telegram_username or row.display_name or row.email.split("@", maxsplit=1)[0]
        items.append(
            LeaderboardEntry(
                rank=rank,
                user_id=row.user_id,
                username=username,
                total_score=int(row.total_score or 0),
                predictions_count=int(row.predictions_count or 0),
                best_delta_ms=int(row.best_delta_ms) if row.best_delta_ms is not None else None,
                avg_score=float(row.avg_score) if row.avg_score is not None else None,
            )
        )
    return LeaderboardResponse(items=items)


@router.get("/ai/coach/me", response_model=CoachAdviceResponse)
async def ai_coach_me(
    session_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachAdviceResponse:
    if session_id is None:
        latest_prediction = db.scalar(
            select(Prediction)
            .where(Prediction.user_id == current_user.id, Prediction.score.is_not(None))
            .order_by(Prediction.created_at.desc())
            .limit(1)
        )
        if not latest_prediction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resolved predictions found")
        target_session_id = latest_prediction.session_id
    else:
        target_session_id = session_id

    target_prediction = db.scalar(
        select(Prediction)
        .where(
            Prediction.user_id == current_user.id,
            Prediction.session_id == target_session_id,
            Prediction.score.is_not(None),
        )
        .limit(1)
    )
    if not target_prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resolved prediction for this session")

    target_session = db.get(GameSession, target_session_id)
    if not target_session or target_session.event_occurred_at is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session is not resolved yet")

    recent_rows = db.execute(
        select(Prediction, GameSession)
        .join(GameSession, GameSession.id == Prediction.session_id)
        .where(
            Prediction.user_id == current_user.id,
            Prediction.score.is_not(None),
            GameSession.event_occurred_at.is_not(None),
        )
        .order_by(Prediction.created_at.desc())
        .limit(10)
    ).all()

    abs_deltas: list[float] = []
    signed_deltas: list[float] = []
    for prediction, session in recent_rows:
        if session.event_occurred_at is None:
            continue
        actual_event_ms = session.event_occurred_at.timestamp() * 1000
        signed_delta = float(prediction.predicted_at_ms - int(actual_event_ms))
        signed_deltas.append(signed_delta)
        abs_deltas.append(abs(signed_delta))

    avg_abs_delta_ms = int(round(_avg(abs_deltas))) if abs_deltas else None
    avg_signed_delta = _avg(signed_deltas)
    if avg_signed_delta > 1200:
        timing_profile = "late"
    elif avg_signed_delta < -1200:
        timing_profile = "early"
    else:
        timing_profile = "stable"

    if timing_profile == "late":
        summary = "Вы чаще нажимаете позже события. Попробуйте кликать немного раньше на пике атаки."
        tips = [
            "Отслеживайте предпоследний пас и начинайте готовить клик заранее.",
            "Сфокусируйтесь на моментах резкого ускорения темпа перед ударом.",
        ]
    elif timing_profile == "early":
        summary = "Вы чаще нажимаете слишком рано. Подождите финального подтверждения эпизода."
        tips = [
            "Не кликайте на подводке атаки, ждите последний завершающий контакт.",
            "Следите за сигналами завершения фазы: удар, добивание, финальный action-call.",
        ]
    else:
        summary = "Ваш тайминг в целом ровный. Подкрутите реакцию на резких сменах темпа."
        tips = [
            "Сохраняйте текущий ритм и тренируйте реакцию на быстрые контратаки.",
            "Перед кликом проверяйте, что момент действительно дошел до завершающей фазы.",
        ]

    try:
        from ai_engine import get_ai_engine

        context = (
            f"avg_abs_delta_ms={avg_abs_delta_ms or 0}; "
            f"timing_profile={timing_profile}; "
            f"recent_predictions={len(recent_rows)}; "
            f"sport={target_session.sport}; event_type={target_session.event_type}"
        )
        ai_tips_text = await get_ai_engine().generate_prediction_hint(
            sport=target_session.sport,
            event_type=target_session.event_type,
            context=context,
        )
        parts = [part.strip(" -•\t") for part in ai_tips_text.replace("\r", "\n").split("\n")]
        parsed_tips = [part for part in parts if len(part) > 8]
        if parsed_tips:
            tips = parsed_tips[:2]

        ai_summary = await get_ai_engine().generate_score_commentary(
            username=_user_public_name(current_user),
            sport=target_session.sport,
            delta_ms=avg_signed_delta,
            score=int(target_prediction.score or 0),
        )
        if ai_summary:
            summary = ai_summary.strip()
    except Exception:
        # Keep deterministic fallback advice.
        pass

    return CoachAdviceResponse(
        session_id=target_session_id,
        timing_profile=timing_profile,
        summary=summary,
        tips=tips[:2],
        avg_delta_ms=avg_abs_delta_ms,
        recent_predictions=len(recent_rows),
    )


@router.get("/tournaments/matchmaking-preview", response_model=MatchmakingPreviewResponse)
def matchmaking_preview(
    session_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchmakingPreviewResponse:
    stmt = (
        select(Prediction, User)
        .join(User, User.id == Prediction.user_id)
        .where(Prediction.score.is_not(None))
        .order_by(Prediction.created_at.desc())
    )
    if session_id is not None:
        stmt = stmt.where(Prediction.session_id == session_id)
    rows = db.execute(stmt).all()

    by_user: dict[int, dict[str, object]] = {}
    for prediction, user in rows:
        username = _user_public_name(user)
        payload = by_user.setdefault(
            user.id,
            {
                "user_id": user.id,
                "username": username,
                "scores": [],
                "deltas": [],
                "total_score": 0,
                "predictions_count": 0,
            },
        )
        payload["scores"].append(float(prediction.score or 0))
        payload["deltas"].append(float(prediction.delta_ms or 30_000))
        payload["total_score"] = int(payload["total_score"]) + int(prediction.score or 0)
        payload["predictions_count"] = int(payload["predictions_count"]) + 1

    players: list[MatchmakingPlayerPublic] = []
    for payload in by_user.values():
        scores = payload["scores"]
        deltas = payload["deltas"]
        avg_score = _avg(scores)
        avg_delta = _avg(deltas)
        score_stddev = _stddev(scores)
        risk_score = round(min(100.0, score_stddev / 5.0), 1)
        consistency_score = round(max(0.0, 100.0 - risk_score), 1)
        accuracy_component = max(0.0, 100.0 - min(100.0, avg_delta / 80.0))
        skill_score = round(avg_score * 0.75 + accuracy_component * 2.5, 1)
        players.append(
            MatchmakingPlayerPublic(
                user_id=int(payload["user_id"]),
                username=str(payload["username"]),
                total_score=int(payload["total_score"]),
                predictions_count=int(payload["predictions_count"]),
                avg_score=round(avg_score, 2),
                best_delta_ms=int(min(deltas)) if deltas else None,
                skill_score=skill_score,
                risk_score=risk_score,
                consistency_score=consistency_score,
            )
        )

    players.sort(
        key=lambda item: (
            -item.skill_score,
            item.best_delta_ms if item.best_delta_ms is not None else 999_999,
            -item.total_score,
        )
    )

    buckets_raw: dict[str, list[MatchmakingPlayerPublic]] = {"gold": [], "silver": [], "bronze": []}
    n = len(players)
    if n <= 2:
        buckets_raw["silver"] = players
    else:
        third = max(1, n // 3)
        for index, player in enumerate(players):
            if index < third:
                buckets_raw["gold"].append(player)
            elif index < third * 2:
                buckets_raw["silver"].append(player)
            else:
                buckets_raw["bronze"].append(player)

    your_bucket: str | None = None
    for bucket_name, bucket_players in buckets_raw.items():
        if any(player.user_id == current_user.id for player in bucket_players):
            your_bucket = bucket_name
            break

    buckets = [
        MatchmakingBucketPublic(bucket="gold", title="Gold дивизион", players=buckets_raw["gold"]),
        MatchmakingBucketPublic(bucket="silver", title="Silver дивизион", players=buckets_raw["silver"]),
        MatchmakingBucketPublic(bucket="bronze", title="Bronze дивизион", players=buckets_raw["bronze"]),
    ]
    return MatchmakingPreviewResponse(
        session_id=session_id,
        generated_at=datetime.now(UTC),
        your_bucket=your_bucket,
        buckets=buckets,
    )


@router.post("/admin/resolve", response_model=SessionPublic)
def resolve_session(
    payload: ResolveSessionRequest,
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> SessionPublic:
    session = db.get(GameSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    actual_event_ms = payload.actual_timestamp_ms
    session.event_occurred_at = datetime.fromtimestamp(actual_event_ms / 1000, tz=UTC)
    session.status = SessionStatus.RESOLVED
    if session.locked_at is None:
        session.locked_at = datetime.now(UTC)

    predictions = db.scalars(select(Prediction).where(Prediction.session_id == session.id)).all()
    for prediction in predictions:
        score, delta_ms = _score_prediction(
            predicted_at_ms=prediction.predicted_at_ms,
            actual_event_ms=actual_event_ms,
            stream_delay_ms=session.stream_delay_ms,
        )
        prediction.score = score
        prediction.delta_ms = delta_ms
        prediction.ai_commentary = (
            f"Ваш прогноз отклонился на {delta_ms} мс. Итог: {score} очков."
        )

    db.commit()
    db.refresh(session)
    return SessionPublic.model_validate(session)


@router.post("/admin/commentary", response_model=CommentaryResponse)
async def analyze_commentary(
    payload: CommentaryRequest,
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> CommentaryResponse:
    session = db.get(GameSession, payload.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.commentary_context = payload.commentary
    db.commit()

    try:
        from ai_engine import get_ai_engine

        result = await get_ai_engine().detect_event(
            commentary=payload.commentary,
            sport=session.sport,
            event_type=session.event_type,
        )
        return CommentaryResponse(
            event_detected=bool(result.get("event_detected", False)),
            confidence=float(result.get("confidence", 0.0)),
            reasoning=str(result.get("reasoning", "")),
        )
    except Exception:
        lowered = payload.commentary.lower()
        detected = any(keyword in lowered for keyword in ("goal", "гол", "kill", "ace", "penalty"))
        return CommentaryResponse(
            event_detected=detected,
            confidence=0.6 if detected else 0.2,
            reasoning="Fallback analysis (AI engine unavailable).",
        )


@router.get("/admin/sessions", response_model=list[SessionPublic])
def admin_sessions(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> list[SessionPublic]:
    sessions = db.scalars(select(GameSession).order_by(GameSession.created_at.desc())).all()
    return [SessionPublic.model_validate(item) for item in sessions]
