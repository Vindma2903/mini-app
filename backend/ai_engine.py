"""
AI Engine — LangChain chains для трёх задач:

1. EventDetectionChain   — CoT, temperature=0.0
   Детектирует событие из текстового комментария.
   Низкая температура нужна не "по учебнику", а потому что при temperature=0.7
   модель начинает галлюцинировать события которых не было — проверено эмпирически.
   Top-P здесь не помогает: проблема не в хвосте распределения, а в том что
   нам нужна максимально детерминированная экстракция фактов.

2. ScoreCommentaryChain  — temperature=0.5, top_p=0.9
   Генерирует живой комментарий к результату предсказания.
   Баланс: достаточно разнообразно чтобы не повторяться, достаточно стабильно
   чтобы не нести бред. top_p=0.9 срезает самые безумные варианты.

3. PredictionHintChain   — temperature=0.8, top_p=0.85
   Генерирует подсказки перед событием на основе game state.
   Высокая температура нужна для разнообразия подсказок.
   top_p=0.85 (nucleus sampling) здесь лучше чем просто temperature=0.9:
   при чистом temperature повышение масштабирует ВСЕ вероятности равномерно,
   что иногда даёт несвязные предложения; nucleus sampling вместо этого
   сохраняет только топ-85% вероятностной массы — результат более связный
   при той же "температуре творчества".
"""

import os
import json
import re
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import SystemMessage, HumanMessage


# ---------------------------------------------------------------------------
# Chain 1: Event Detection (Chain-of-Thought, temperature=0.0)
# ---------------------------------------------------------------------------

EVENT_DETECTION_SYSTEM = """You are an expert sports event detector analyzing live commentary.
Your ONLY job is to determine if a significant scoring event just occurred.

Respond ONLY with valid JSON in this exact format:
{
  "reasoning": "<step-by-step analysis>",
  "event_detected": true/false,
  "confidence": 0.0-1.0,
  "event_type": "goal|point|kill|ace|strike|null",
  "estimated_moment_description": "<when exactly it happened in the text>"
}

Chain-of-thought reasoning steps to follow:
1. Scan for action keywords (goal, score, GOAAAL, kills, ace, strike, point)
2. Check emotional intensity escalation (calm → excited → peak)
3. Look for confirmation signals ("it's official", "VAR confirms", "the referee signals")
4. Distinguish near-misses from actual events ("almost!", "saved!" = no event)
5. Assign confidence based on clarity of evidence"""

EVENT_DETECTION_HUMAN = """Sport: {sport}
Expected event type: {event_type}
Recent commentary:
---
{commentary}
---
Did a scoring event just occur?"""


# ---------------------------------------------------------------------------
# Chain 2: Score Commentary (temperature=0.5, top_p=0.9)
# ---------------------------------------------------------------------------

SCORE_COMMENTARY_SYSTEM = """You are an enthusiastic but precise sports game commentator for a prediction game.
Generate a SHORT (1-2 sentences) reaction to a player's prediction accuracy.
Be specific about the numbers. Mix in relevant sports metaphors.
Language: match the user's context (Russian if commentary was in Russian)."""

SCORE_COMMENTARY_HUMAN = """Player: {username}
Sport: {sport}
They predicted the event would happen and clicked {delta_ms}ms {direction} it actually occurred.
They earned {score} out of 1000 points.
React to their performance."""


# ---------------------------------------------------------------------------
# Chain 3: Prediction Hints (temperature=0.8, top_p=0.85)
# ---------------------------------------------------------------------------

PREDICTION_HINTS_SYSTEM = """You are an AI analyst helping users predict the exact moment of a sports event.
Based on game context, generate 1-2 specific, actionable timing hints.
Be concrete: mention specific patterns, player behaviours, or statistical tendencies.
Keep it to 2-3 sentences max. Sound like an insider, not a textbook."""

PREDICTION_HINTS_HUMAN = """Sport: {sport}
Event to predict: {event_type}
Current game context:
{context}

What timing signals should the user watch for right now?"""


class AIEngine:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        # Chain 1: детерминированная экстракция — temperature=0.0
        self.detector_llm = ChatOpenAI(
            model=model,
            temperature=0.0,
            api_key=api_key,
        )

        # Chain 2: живой комментарий — баланс creativity/accuracy
        self.commentary_llm = ChatOpenAI(
            model=model,
            temperature=0.5,
            top_p=0.9,
            api_key=api_key,
        )

        # Chain 3: подсказки — максимум разнообразия, nucleus sampling
        self.hints_llm = ChatOpenAI(
            model=model,
            temperature=0.8,
            top_p=0.85,
            api_key=api_key,
        )

        self._build_chains()

    def _build_chains(self):
        self.detection_prompt = ChatPromptTemplate.from_messages([
            ("system", EVENT_DETECTION_SYSTEM),
            ("human", EVENT_DETECTION_HUMAN),
        ])

        self.commentary_prompt = ChatPromptTemplate.from_messages([
            ("system", SCORE_COMMENTARY_SYSTEM),
            ("human", SCORE_COMMENTARY_HUMAN),
        ])

        self.hints_prompt = ChatPromptTemplate.from_messages([
            ("system", PREDICTION_HINTS_SYSTEM),
            ("human", PREDICTION_HINTS_HUMAN),
        ])

        parser = StrOutputParser()
        self.detection_chain = self.detection_prompt | self.detector_llm | parser
        self.commentary_chain = self.commentary_prompt | self.commentary_llm | parser
        self.hints_chain = self.hints_prompt | self.hints_llm | parser

    async def detect_event(
        self,
        commentary: str,
        sport: str,
        event_type: str,
    ) -> dict:
        """
        CoT event detection. Returns parsed JSON with reasoning trace.
        При ошибке парсинга — возвращаем безопасный fallback.
        """
        try:
            result = await self.detection_chain.ainvoke({
                "sport": sport,
                "event_type": event_type,
                "commentary": commentary,
            })
            # Вычищаем markdown-блоки если модель их добавила
            clean = re.sub(r"```json\s*|\s*```", "", result).strip()
            return json.loads(clean)
        except Exception as e:
            return {
                "reasoning": f"Parse error: {e}",
                "event_detected": False,
                "confidence": 0.0,
                "event_type": None,
                "estimated_moment_description": "",
            }

    async def generate_score_commentary(
        self,
        username: str,
        sport: str,
        delta_ms: float,
        score: int,
    ) -> str:
        direction = "before" if delta_ms > 0 else "after"
        try:
            return await self.commentary_chain.ainvoke({
                "username": username,
                "sport": sport,
                "delta_ms": abs(int(delta_ms)),
                "direction": direction,
                "score": score,
            })
        except Exception:
            abs_delta = abs(int(delta_ms))
            if score >= 900:
                return f"{username} — феноменально! {abs_delta}мс точности, {score} очков!"
            elif score >= 600:
                return f"{username} — неплохо, {abs_delta}мс погрешность, {score} очков."
            else:
                return f"{username} — промах на {abs_delta}мс. {score} очков. Следующий раз лучше!"

    async def generate_prediction_hint(
        self,
        sport: str,
        event_type: str,
        context: str,
    ) -> str:
        try:
            return await self.hints_chain.ainvoke({
                "sport": sport,
                "event_type": event_type,
                "context": context,
            })
        except Exception:
            return "Смотри за темпом атаки — события часто происходят на пике давления."


# Singleton
_engine: Optional[AIEngine] = None


def get_ai_engine() -> AIEngine:
    global _engine
    if _engine is None:
        _engine = AIEngine()
    return _engine
