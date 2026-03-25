from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, engine
from app.routers.auth import router as auth_router
from app.routers.game import router as game_router
from app.services.request_queue_monitor import get_request_queue_monitor
from app.services.auto_session import AutoSessionManager

settings = get_settings()
auto_session_manager = AutoSessionManager()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Backward-compatible bootstrap for existing databases created before telegram_id field.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"))
        conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_telegram_id ON users (telegram_id)")
        )
    auto_session_manager.start()
    yield
    await auto_session_manager.stop()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _extract_response_error(status_code: int, response) -> str | None:
    if status_code < 400:
        return None

    body = getattr(response, "body", None)
    if isinstance(body, bytes) and body:
        text_body = body.decode("utf-8", errors="replace").strip()
        if text_body:
            # Keep queue entries compact for admin view.
            return text_body[:500]
    try:
        return f"{status_code} {HTTPStatus(status_code).phrase}"
    except ValueError:
        return f"HTTP {status_code}"


@app.middleware("http")
async def request_queue_middleware(request, call_next):
    if request.url.path.startswith(settings.api_prefix):
        monitor = get_request_queue_monitor()
        request_id = monitor.start(method=request.method, path=str(request.url.path))
        try:
            response = await call_next(request)
            error = _extract_response_error(response.status_code, response)
            monitor.finish(request_id, status_code=response.status_code, error=error)
            return response
        except Exception as exc:
            monitor.finish(request_id, status_code=500, error=str(exc))
            raise
    return await call_next(request)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/admin/request-queue", response_class=HTMLResponse)
def admin_request_queue_page() -> str:
    return """
<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin · Request Queue</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: Inter, Arial, sans-serif; background: #0b1020; color: #e8eefc; margin: 0; padding: 24px; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    h1 { margin: 0 0 12px; font-size: 24px; }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    input, button { padding: 10px 12px; border-radius: 8px; border: 1px solid #2b3655; background: #111a31; color: #e8eefc; }
    input { min-width: 160px; }
    button { cursor: pointer; background: #27408b; border-color: #3e5fb7; }
    button:hover { background: #3352ab; }
    .muted { color: #9fb0db; font-size: 13px; margin-bottom: 12px; }
    .status { color: #9fb0db; font-size: 13px; margin-bottom: 12px; min-height: 18px; }
    .panel { background: #111a31; border: 1px solid #253154; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
    .row { display: grid; grid-template-columns: 120px 80px 1fr 180px 100px 1fr; gap: 8px; font-size: 12px; padding: 8px; border-bottom: 1px solid #1d2744; }
    .row.head { font-weight: 700; color: #b8c8ef; }
    .row:last-child { border-bottom: none; }
    .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .in_progress { background: #6b4f00; color: #ffd976; }
    .success { background: #114226; color: #83f0b2; }
    .error { background: #561f2e; color: #ff9bb4; }
    code { color: #c6d6ff; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Очередь API (Admin)</h1>
    <div class="muted">Войди как админ, токен получим автоматически. Данные обновляются каждые 5 сек.</div>
    <div class="controls">
      <input id="email" type="email" placeholder="admin@email.com" />
      <input id="password" type="password" placeholder="password" />
      <input id="limit" value="200" />
      <button id="login">Войти</button>
      <button id="logout">Выйти</button>
      <button id="refresh">Обновить</button>
    </div>
    <div id="status" class="status"></div>
    <div class="panel">
      <h3>In progress</h3>
      <div id="in_progress"></div>
    </div>
    <div class="panel">
      <h3>Recent</h3>
      <div id="recent"></div>
    </div>
  </div>
  <script>
    const inProgressEl = document.getElementById("in_progress");
    const recentEl = document.getElementById("recent");
    const statusEl = document.getElementById("status");
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");
    const limitEl = document.getElementById("limit");
    const loginBtn = document.getElementById("login");
    const logoutBtn = document.getElementById("logout");
    const refreshBtn = document.getElementById("refresh");
    const tokenStorageKey = "admin_queue_token";
    const emailStorageKey = "admin_queue_email";
    emailEl.value = localStorage.getItem(emailStorageKey) || "";

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }

    function renderRows(items) {
      if (!items || items.length === 0) {
        return '<div class="row"><div>—</div><div>—</div><div>Пусто</div><div>—</div><div>—</div><div>—</div></div>';
      }
      const head = '<div class="row head"><div>Status</div><div>Code</div><div>Path</div><div>Started</div><div>Method</div><div>Error</div></div>';
      const rows = items.map((item) => {
        return `
          <div class="row">
            <div><span class="pill ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></div>
            <div>${escapeHtml(item.status_code ?? "-")}</div>
            <div><code>${escapeHtml(item.path)}</code></div>
            <div>${escapeHtml(item.started_at)}</div>
            <div>${escapeHtml(item.method)}</div>
            <div>${escapeHtml(item.error ?? "-")}</div>
          </div>
        `;
      }).join("");
      return head + rows;
    }

    function getToken() {
      return localStorage.getItem(tokenStorageKey) || "";
    }

    function setStatus(text) {
      statusEl.textContent = text || "";
    }

    async function login() {
      const email = emailEl.value.trim();
      const password = passwordEl.value;
      if (!email || !password) {
        setStatus("Укажи email и password");
        return false;
      }
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setStatus(`Ошибка входа: ${resp.status} ${text}`);
        return false;
      }
      const data = await resp.json();
      localStorage.setItem(tokenStorageKey, data.access_token);
      localStorage.setItem(emailStorageKey, email);
      passwordEl.value = "";
      setStatus("Авторизация успешна");
      return true;
    }

    function logout() {
      localStorage.removeItem(tokenStorageKey);
      setStatus("Выход выполнен");
      inProgressEl.innerHTML = "";
      recentEl.innerHTML = "";
    }

    async function load() {
      const token = getToken();
      const limit = Number(limitEl.value || "200");
      if (!token) {
        inProgressEl.innerHTML = "Сначала нажми Войти";
        recentEl.innerHTML = "";
        setStatus("Нет токена. Выполни вход.");
        return;
      }
      const resp = await fetch(`/api/v1/admin/request-queue?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        if (resp.status === 401 || resp.status === 403) {
          localStorage.removeItem(tokenStorageKey);
          setStatus("Токен истек или нет прав. Войди снова.");
        } else {
          setStatus(`Ошибка запроса очереди: ${resp.status}`);
        }
        inProgressEl.innerHTML = `Ошибка: ${resp.status}`;
        recentEl.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
        return;
      }
      const data = await resp.json();
      setStatus("Данные обновлены");
      inProgressEl.innerHTML = renderRows(data.in_progress);
      recentEl.innerHTML = renderRows(data.recent);
    }

    loginBtn.addEventListener("click", () => {
      login().then((ok) => {
        if (ok) {
          load().catch(console.error);
        }
      }).catch(console.error);
    });
    logoutBtn.addEventListener("click", logout);
    refreshBtn.addEventListener("click", () => { load().catch(console.error); });
    load().catch(console.error);
    setInterval(() => { load().catch(console.error); }, 5000);
  </script>
</body>
</html>
    """


app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(game_router, prefix=settings.api_prefix)
