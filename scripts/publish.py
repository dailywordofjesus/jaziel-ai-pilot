#!/usr/bin/env python3
"""Publish validated generated articles to the separate Jaziel repository.

This module is intentionally conservative: it only prepares a publication plan
unless --apply is explicitly supplied. GitHub credentials are never stored in
this repository; the workflow should provide them through GitHub Secrets.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated" / "articles"
CONFIG = ROOT / "config.json"


def load_config() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def files_to_publish() -> list[tuple[str, bytes]]:
    if not GENERATED.exists():
        return []
    files = []
    for path in sorted(GENERATED.rglob("*")):
        if path.is_file() and path.suffix.lower() in {".html", ".css", ".js", ".json", ".xml", ".txt"}:
            rel = path.relative_to(GENERATED).as_posix()
            files.append((rel, path.read_bytes()))
    return files


def build_plan(files: list[tuple[str, bytes]], site_subdir: str) -> list[dict]:
    return [{"source": rel, "destination": f"{site_subdir.rstrip('/')}/{rel}"} for rel, _ in files]


def github_json(url: str, token: str, method: str = "GET", payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, method=method, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "jaziel-ai-pilot-publisher",
    })
    try:
        with urlopen(req, timeout=30) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API {exc.code}: {detail}") from exc


def publish(files: list[tuple[str, bytes]], owner: str, repo: str, branch: str, site_subdir: str, token: str) -> None:
    api = f"https://api.github.com/repos/{owner}/{repo}"
    ref = github_json(f"{api}/git/ref/heads/{branch}", token)
    parent_sha = ref["object"]["sha"]
    commit = github_json(f"{api}/git/commits/{parent_sha}", token)
    base_tree = commit["tree"]["sha"]

    tree_elements = []
    for rel, data in files:
        blob = github_json(f"{api}/git/blobs", token, "POST", {
            "content": base64.b64encode(data).decode("ascii"),
            "encoding": "base64",
        })
        tree_elements.append({
            "path": f"{site_subdir.rstrip('/')}/{rel}",
            "mode": "100644",
            "type": "blob",
            "sha": blob["sha"],
        })

    tree = github_json(f"{api}/git/trees", token, "POST", {
        "base_tree": base_tree,
        "tree": tree_elements,
    })
    new_commit = github_json(f"{api}/git/commits", token, "POST", {
        "message": f"Publish Jaziel articles ({len(files)} files)",
        "tree": tree["sha"],
        "parents": [parent_sha],
    })
    github_json(f"{api}/git/refs/heads/{branch}", token, "PATCH", {
        "sha": new_commit["sha"],
        "force": False,
    })
    print(f"Published {len(files)} files to {owner}/{repo}@{branch}.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Actually publish to GitHub")
    args = parser.parse_args()

    config = load_config()
    publisher = config.get("publisher", {})
    target = publisher.get("target", {})
    owner = os.getenv("JAZIEL_TARGET_OWNER", target.get("owner", "dailywordofjesus"))
    repo = os.getenv("JAZIEL_TARGET_REPO", target.get("repo", "jaziel"))
    branch = os.getenv("JAZIEL_TARGET_BRANCH", target.get("branch", "main"))
    site_subdir = os.getenv("JAZIEL_SITE_SUBDIR", target.get("site_subdir", "articles"))

    files = files_to_publish()
    if not files:
        raise SystemExit("No generated publication files found.")

    print(json.dumps({"target": f"{owner}/{repo}@{branch}", "plan": build_plan(files, site_subdir)}, indent=2))
    if not args.apply:
        print("DRY RUN: no GitHub changes were made. Use --apply with a token to publish.")
        return 0

    token = os.getenv("JAZIEL_PUBLISH_TOKEN")
    if not token:
        raise SystemExit("JAZIEL_PUBLISH_TOKEN is required with --apply.")
    publish(files, owner, repo, branch, site_subdir, token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
