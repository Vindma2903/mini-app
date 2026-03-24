# ТЗ: Predict The Moment

Игра для зрителей футбольных трансляций.
Пользователь кликает в момент, когда, по его мнению, произойдёт событие (гол, пенальти, удар).
Чем точнее — тем больше очков. Турнирная таблица в реальном времени.

---

## Стек (зафиксировано)

| Компонент     | Технология                                                  |
|---------------|-------------------------------------------------------------|
| Backend       | Python 3.11 + FastAPI                                       |
| AI            | LangChain + OpenAI (gpt-4o-mini)                            |
| БД            | PostgreSQL (Docker)                                         |
| Миграции      | Alembic                                                     |
| Frontend      | React 18 + TypeScript + Vite                                |
| Архитектура   | **Feature-Sliced Design (FSD)**                             |
| Данные (футбол)    | **football-data.org** (polling каждые 10с)             |
| Данные (киберспорт)| **PandaScore** CS2 / Dota 2 / LoL (polling каждые 10с)|
| Real-time     | **Polling** (переделать на WS позже)                        |
| Deploy        | Docker Compose                                              |
| Mini App      | Telegram WebApp SDK                                         |

---

## Роли пользователей

- **Player** — смотрит трансляцию (футбол или киберспорт), делает предсказания
- **Admin** — создаёт сессии, выбирает тип события, отправляет комментарий в AI, закрывает окно

---

## Жизненный цикл сессии (Session Lifecycle)

```
WAITING → PREDICTING → LOCKED → RESOLVED
```

| Статус       | Что происходит                                              |
|--------------|-------------------------------------------------------------|
| WAITING      | Сессия создана, предсказания не принимаются                 |
| PREDICTING   | Окно открыто (30 сек по умолчанию), принимаем клики        |
| LOCKED       | Окно закрыто, событие вот-вот произойдёт                   |
| RESOLVED     | Событие зафиксировано, очки начислены, AI комментирует     |

---

## Алгоритм очков

```
delta_ms = |prediction_ms - actual_event_ms| - stream_delay_ms
score    = max(0, floor(1000 × (1 − delta_ms / 30_000) ^ 1.5))
```

| Точность   | Очки       |
|------------|------------|
| < 500 мс   | ~1000      |
| 2 сек      | ~870       |
| 5 сек      | ~680       |
| 10 сек     | ~480       |
| 30+ сек    | 0          |

**Тай-брейк:** при равных очках — кто предсказал раньше, тот выше.

---

## Компенсация задержки трансляции

- Admin при создании сессии указывает `stream_delay_ms` (напр. 7000 для YouTube)
- Реальный момент = server_timestamp_когда_admin_нажал_resolved − stream_delay_ms
- Пользователь не настраивает ничего вручную на MVP

---

## AI-функции (LangChain)

### 1. Event Detection (temperature=0.0)
- Вход: текстовый комментарий от admin
- CoT reasoning: ключевые слова → эмоциональная эскалация → подтверждение
- Выход: JSON `{event_detected, confidence, reasoning}`
- Если confidence > 0.85 → backend предлагает авто-резолв сессии

### 2. Score Commentary (temperature=0.5, top_p=0.9)
- Вход: username, sport, delta_ms, score
- Выход: 1-2 предложения живого комментария к результату

### 3. Prediction Hints (temperature=0.8, top_p=0.85)
- Вход: sport, event_type, игровой контекст
- Выход: 2-3 предложения — что смотреть прямо сейчас

---

## API Endpoints

### Sessions
| Method | Path                    | Описание                          |
|--------|-------------------------|-----------------------------------|
| GET    | `/sessions/active`      | Текущая активная сессия           |
| GET    | `/sessions/{id}`        | Сессия по ID                      |
| POST   | `/sessions`             | Создать сессию (admin)            |
| PATCH  | `/sessions/{id}/status` | Сменить статус (admin)            |

### Predictions
| Method | Path                          | Описание                        |
|--------|-------------------------------|---------------------------------|
| POST   | `/predictions`                | Отправить предсказание          |
| GET    | `/predictions/me/{session_id}`| Моё предсказание в сессии       |

### Leaderboard
| Method | Path                            | Описание                      |
|--------|---------------------------------|-------------------------------|
| GET    | `/leaderboard/{session_id}`     | Лидерборд сессии (polling)    |
| GET    | `/leaderboard/global`           | Общий лидерборд               |

### Admin / AI
| Method | Path                        | Описание                           |
|--------|-----------------------------|------------------------------------|
| POST   | `/admin/commentary`         | Отправить комментарий в AI         |
| POST   | `/admin/resolve`            | Зафиксировать момент события       |
| GET    | `/admin/sessions`           | Список всех сессий                 |

---

## Acceptance Criteria (MVP)

| # | Сценарий                              | Ожидаемый результат                          |
|---|---------------------------------------|----------------------------------------------|
| 1 | Открыть Mini App                      | Видит активную сессию или экран ожидания     |
| 2 | Клик в окне PREDICTING                | Предсказание принято, кнопка заблокирована   |
| 3 | Двойной клик                          | Второй клик отклонён (409)                   |
| 4 | Клик после LOCKED                     | Отклонён (409), сообщение "окно закрыто"     |
| 5 | Сессия перешла в RESOLVED             | Видит score + AI-комментарий + место в табл. |
| 6 | Лидерборд                             | Обновляется polling каждые 3 сек             |
| 7 | Admin вводит комментарий              | AI возвращает reasoning + confidence         |
| 8 | Admin нажимает Resolve                | Всем игрокам начисляются очки                |
| 9 | Подсказка от AI                       | Показывается когда статус → PREDICTING       |

---

## Источник данных о матчах: football-data.org

**Уровень 1 — два API для MVP: футбол + компьютерные игры.**

---

### football-data.org — Футбол

- Регистрация → бесплатный ключ → `X-Auth-Token` header
- Лимит: 10 запросов / минута (polling каждые 10 сек — укладываемся)
- Ключевые endpoints:

| Endpoint | Что берём |
|----------|-----------|
| `GET /v4/matches?status=LIVE` | Список живых матчей |
| `GET /v4/matches/{id}` | Детали: счёт, голы, минута |

- Структура события гола:
```json
{
  "goals": [
    {
      "minute": 67,
      "scorer": { "name": "Mbappe" },
      "team": { "name": "Real Madrid" },
      "type": "NORMAL"
    }
  ]
}
```

- Отслеживаемые события: **Гол**, **Пенальти**, **Автогол**

---

### PandaScore — Киберспорт

- Регистрация → бесплатный ключ → `Authorization: Bearer` header
- Лимит: 1000 запросов / час (polling каждые 10 сек — 360 req/час, укладываемся)
- Поддерживаемые игры: **CS2**, **Dota 2**, **League of Legends**
- Ключевые endpoints:

| Endpoint | Что берём |
|----------|-----------|
| `GET /csgo/matches?filter[status]=running` | Живые CS2-матчи |
| `GET /csgo/matches/{id}` | Детали: раунды, счёт |
| `GET /dota2/matches?filter[status]=running` | Живые Dota 2-матчи |
| `GET /dota2/matches/{id}` | Детали: kills, towers |
| `GET /lol/matches?filter[status]=running` | Живые LoL-матчи |

- Структура события CS2 (новый раунд):
```json
{
  "games": [
    {
      "rounds": [{ "winner": { "name": "NaVi" }, "number": 14 }],
      "position": 14
    }
  ]
}
```

- Отслеживаемые события по играм:

| Игра | Событие | Что детектируем |
|------|---------|-----------------|
| CS2 | **Раунд взят** | `rounds` count увеличился |
| Dota 2 | **Первая кровь** | `first_blood_time` появился |
| Dota 2 | **Рошан убит** | ручной AI-детект из комментария |
| LoL | **Первая кровь** | `first_blood` в событиях матча |
| LoL | **Барон убит** | ручной AI-детект из комментария |

---

### Общая логика фиксации момента события

```
Backend scheduler (каждые 10 сек):
  events_now = api.get_events(match_id, sport_type)
  если len(events_now) > len(events_before):
      actual_timestamp = now()
      trigger RESOLVED(session, actual_timestamp)
```

`actual_timestamp - stream_delay_ms` = момент с которым сравниваем клики.

---

## Архитектура frontend: Feature-Sliced Design (FSD)

Все файлы фронтенда делятся строго по слоям FSD. Импорты только сверху вниз.

```
frontend/src/
├── app/                        # Инициализация, провайдеры, роутинг
│   ├── providers/
│   └── styles/
│
├── pages/                      # Компоновка виджетов под конкретный роут
│   ├── home/
│   ├── predict/
│   ├── result/
│   ├── leaderboard/
│   └── admin/
│
├── widgets/                    # Композиционный слой — сборка фич и entities
│   ├── game-screen/
│   ├── leaderboard-table/
│   └── ai-insight-card/
│
├── features/                   # Пользовательские действия
│   ├── make-prediction/        # Кнопка "СЕЙЧАС!", отправка, блокировка
│   ├── poll-session/           # Polling статуса сессии каждые 3 сек
│   ├── poll-leaderboard/       # Polling лидерборда каждые 3 сек
│   └── analyze-commentary/     # Форма отправки комментария в AI (admin)
│
├── entities/                   # Бизнес-сущности
│   ├── session/                # типы, стор, ui-карточка сессии
│   ├── prediction/             # типы, стор, статус предсказания
│   ├── leaderboard/            # типы, строка таблицы
│   └── match/                  # данные матча из football-data.org
│
└── shared/                     # Переиспользуемая инфраструктура
    ├── api/                    # axios-клиент к backend + football-data клиент
    ├── ui/                     # Button, Card, Timer, ProgressBar, Badge
    ├── lib/                    # хуки: usePolling, useTelegram
    └── types/                  # общие TypeScript типы
```

**Правила FSD:**
- `shared` не импортирует из других слоёв
- `entities` импортирует только из `shared`
- `features` импортирует из `entities` и `shared`
- `widgets` импортирует из `features`, `entities`, `shared`
- `pages` импортирует из `widgets`, `features`, `entities`, `shared`
- Никаких циклических зависимостей

---

## Что НЕ входит в MVP

- WebSocket (заменён polling, переделать после тестирования)
- Другие виды спорта кроме футбола и CS2/Dota2/LoL
- Kalибровка задержки трансляции пользователем
- Push-уведомления
- Стрим внутри приложения
- Мультиматч (несколько активных сессий одновременно)
- Оплата / монетизация

---

## UI Экраны

- `HomeScreen` — активная сессия или ожидание
- `PredictScreen` — основной игровой экран (WAITING / PREDICTING / после клика)
- `ResultScreen` — результат + AI-комментарий
- `LeaderboardScreen` — таблица с polling каждые 3 сек
- `AdminPanel` — управление сессией, AI-анализ, авто-резолв
