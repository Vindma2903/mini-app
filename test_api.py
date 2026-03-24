import argparse
import json
import os
import sys
from typing import Any
from urllib import error, request


def safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        # Fallback for Windows consoles with legacy code pages.
        sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
        sys.stdout.buffer.write(b"\n")


def http_json(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
) -> Any:
    body = None
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = request.Request(url=url, method=method, headers=req_headers, data=body)
    try:
        with request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(raw)
        except json.JSONDecodeError:
            details = {"raw": raw}
        raise RuntimeError(f"HTTP {exc.code} for {url}: {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Network error for {url}: {exc.reason}") from exc


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    parser = argparse.ArgumentParser(
        description="Check backend auth + live matches endpoint.",
    )
    parser.add_argument("--base-url", default="http://localhost:8000/api/v1")
    parser.add_argument("--email", default=os.getenv("TEST_EMAIL"))
    parser.add_argument("--password", default=os.getenv("TEST_PASSWORD"))
    args = parser.parse_args()

    if not args.email or not args.password:
        safe_print(
            "Provide credentials via --email/--password or TEST_EMAIL/TEST_PASSWORD env vars.",
        )
        return 2

    login_url = f"{args.base_url}/auth/login"
    live_url = f"{args.base_url}/matches/live"

    safe_print(f"1) Login: {login_url}")
    login_data = http_json(
        login_url,
        method="POST",
        payload={"email": args.email, "password": args.password},
    )
    token = login_data.get("access_token")
    if not token:
        safe_print(
            "Login response has no access_token: "
            + json.dumps(login_data, ensure_ascii=False, indent=2)
        )
        return 1

    safe_print("2) Request live matches: /matches/live")
    matches = http_json(
        live_url,
        method="GET",
        headers={"Authorization": f"Bearer {token}"},
    )

    safe_print("Success. Response:")
    safe_print(json.dumps(matches, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
