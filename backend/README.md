# Backend auth setup

## Run

1. Copy `.env.example` to `.env`
2. Run `docker compose up --build`

API:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/telegram`
- `GET /api/v1/auth/me`
- `GET /health`

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
INSERT INTO users (email, password_hash, display_name, telegram_username, is_active, is_vip)
VALUES (
  'admin@example.com',
  '$2b$12$replace_with_generated_hash',
  'Admin User',
  '@admin',
  true,
  true
);
```

`display_name` and `telegram_username` are optional.
