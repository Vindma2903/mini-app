# Frontend Setup & Demo Notes

## Что нужно заранее

- Docker Desktop
- Node.js 20+
- npm

## Запуск backend (API + Postgres)

Из корня проекта:

```powershell
cd backend
Copy-Item .env.example .env
```

Проверь `backend/.env`:

- `API_FOOTBALL_API_KEY=...` (без него не будет live по футболу)
- `PANDASCORE_API_TOKEN=...` (для live по киберспорту/CS2)
- `DATABASE_URL` по умолчанию подходит для `docker compose`

Запуск:

```powershell
docker compose up -d --build
```

Проверка:

- [http://localhost:8000/health](http://localhost:8000/health) -> `{"status":"ok"}`

## Запуск frontend

В новом терминале:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Открыть:

- [http://localhost:5173](http://localhost:5173)

## Какие API используются

### Внешние API

- **API-FOOTBALL** (`https://v3.football.api-sports.io`)
  - live футбол
  - подборка популярных/предстоящих матчей
- **PandaScore** (`https://api.pandascore.co`)
  - live-матчи по киберспорту (в проекте используется CS2)

### Локальный backend API

Базовый URL: `http://localhost:8000/api/v1`

Основные endpoint-ы для фронта:

- `/auth/*` - авторизация
- `/matches/live` - live матчи
- `/matches/popular` - популярные/предстоящие матчи
- `/matches/esports` - live CS2
- `/sessions/active`, `/predictions/*`, `/leaderboard/*` - игровая сессия, прогнозы и рейтинги

## Тестовые (демо) данные

В проекте есть demo-данные матчей и рейтинга игроков для показа решения, если в API временно нет активных матчей/данных.

Включение:

- Профиль -> **`Демо-данные матчей`** (тумблер)

Сейчас demo-режим включен по умолчанию.

## Просмотр очереди запросов (admin)

Результаты запросов и статусы очереди можно посмотреть по адресу:

- [http://localhost:8000/admin/request-queue](http://localhost:8000/admin/request-queue)

На странице есть встроенный login (email/password), после входа таблица обновляется автоматически.

## Если не пускает в приложение

Если нет пользователя, создай admin-пользователя в Postgres или используй существующего.

Тестовый admin для локальной разработки:

- email: `admin@example.com`
- password: `mypassword123`

## Остановка проекта

Backend:

```powershell
cd backend
docker compose down
```

Frontend:

- остановить `npm run dev` (`Ctrl + C`)

Данные для авторизации
admin@example.com
mypassword123