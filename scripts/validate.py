import json
import sys
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "schemas" / "article.schema.json"
CONTENT = ROOT / "content" / "articles"


def load_schema():
    return json.loads(SCHEMA.read_text(encoding="utf-8"))


def validate_file(path, validator):
    data = json.loads(path.read_text(encoding="utf-8"))
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    return data, errors


def main():
    validator = Draft202012Validator(load_schema(), format_checker=FormatChecker())
    files = sorted(CONTENT.glob("*.json"))
    if not files:
        print("No article JSON files found.")
        return 1

    failed = False
    for path in files:
        try:
            _, errors = validate_file(path, validator)
        except json.JSONDecodeError as exc:
            print(f"FAIL {path.name}: invalid JSON at line {exc.lineno}, column {exc.colno}")
            failed = True
            continue
        except Exception as exc:
            print(f"FAIL {path.name}: {exc}")
            failed = True
            continue

        if errors:
            failed = True
            print(f"FAIL {path.name}")
            for error in errors:
                location = ".".join(str(x) for x in error.path) or "root"
                print(f"  - {location}: {error.message}")
        else:
            print(f"PASS {path.name}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
