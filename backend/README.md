# Backend auth setup

## Run

1. Copy `.env.example` to `.env`
2. Run `docker compose up --build`

API:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/telegram`
- `GET /api/v1/auth/me`
- `GET /api/v1/matches/live`
- `GET /api/v1/sessions/active`
- `GET /api/v1/sessions/{id}`
- `POST /api/v1/sessions` (admin)
- `PATCH /api/v1/sessions/{id}/status` (admin)
- `POST /api/v1/predictions`
- `GET /api/v1/predictions/me/{session_id}`
- `GET /api/v1/leaderboard/{session_id}`
- `GET /api/v1/leaderboard/global`
- `POST /api/v1/admin/commentary` (admin)
- `POST /api/v1/admin/resolve` (admin)
- `GET /api/v1/admin/sessions` (admin)
- `GET /health`

## Авторизация (JWT)

Клиент получает `access_token` из `POST /api/v1/auth/login` или `POST /api/v1/auth/telegram` и передаёт его в заголовке `Authorization: Bearer <token>` для `GET /api/v1/auth/me` и остальных защищённых методов.

## Live-матчи и счет (API-FOOTBALL)

Для `GET /api/v1/matches/live` backend использует API-FOOTBALL и переменные:

- `API_FOOTBALL_BASE_URL` (по умолчанию `https://v3.football.api-sports.io`)
- `API_FOOTBALL_API_KEY` (обязательно)
- `API_FOOTBALL_TIMEOUT_SECONDS` (по умолчанию `8`)
- `LIVE_MATCHES_CACHE_TTL_SECONDS` (по умолчанию `20`)
- `LIVE_MATCHES_RATE_LIMIT_PER_MINUTE` (по умолчанию `10`)

Запрос к внешнему провайдеру идет через `GET` и заголовок `x-apisports-key`.
При ошибке внешнего провайдера backend возвращает последний успешный кэш (если он есть).

## Опционально: авто-сессии через PandaScore (выключено по умолчанию)

Если нужны автоматические игровые сессии по данным PandaScore, в `.env` задайте `AUTO_SESSION_ENABLED=true` и `PANDASCORE_API_TOKEN`. Без этого бэкенд **не** обращается к PandaScore.

## Telegram Mini App auth

1. Set `TELEGRAM_BOT_TOKEN` in `.env`.
2. In `@BotFather` configure Menu Button with your Mini App HTTPS URL.
3. Open the app from Telegram and use "Войти через Telegram".

Backend validates `initData` signature and auth timestamp before issuing JWT.

## Add a user manually

1. Generate a password hash:

```bash
python scripts/hash_password.py mypassword123
```

2. Insert the user into Postgres:

```sql
INSERT INTO users (email, password_hash, display_name, telegram_username, is_admin, is_active, is_vip)
VALUES (
  'admin@example.com',
  '$2b$12$replace_with_generated_hash',
  'Admin User',
  '@admin',
  true,
  true,
  true
);
```

`display_name` and `telegram_username` are optional.

## Alembic migrations

1. Install dependencies (`pip install -r requirements.txt`)
2. Run migrations:

```bash
alembic upgrade head
```
