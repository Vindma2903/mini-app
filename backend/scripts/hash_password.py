import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.security import get_password_hash


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/hash_password.py <password>")

    print(get_password_hash(sys.argv[1]))


if __name__ == "__main__":
    main()
