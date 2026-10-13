#!/usr/bin/env python3
"""Read-only daily watcher for the Better Playgrounds campaign inbox.

The watcher reports new playground ideas and campaign replies without marking,
sending, archiving, or publishing anything. It keeps a local message-ID state
file so the scheduler can run repeatedly without replaying old mail.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ACCOUNT_HOME = Path(
    os.environ.get(
        "BETTER_PLAYGROUNDS_GOOGLE_HOME",
        str(Path.home() / ".hermes/google-accounts/betterplaygroundsfororinda"),
    )
)
GOOGLE_PYTHON = Path(
    os.environ.get(
        "BETTER_PLAYGROUNDS_GOOGLE_PYTHON",
        str(Path.home() / ".hermes/venvs/google-workspace/bin/python"),
    )
)
GOOGLE_API = Path(
    os.environ.get(
        "BETTER_PLAYGROUNDS_GOOGLE_API",
        str(Path.home() / ".hermes/skills/productivity/google-workspace/scripts/google_api.py"),
    )
)
STATE_PATH = Path(
    os.environ.get(
        "BETTER_PLAYGROUNDS_WATCH_STATE",
        str(ACCOUNT_HOME / "better_playgrounds_inbox_watch_state.json"),
    )
)

SEARCH_TERMS = (
    'subject:"An Early Win" subject:"Better Playgrounds" '
    'playground playgrounds "play area" "play space" "play structure" '
    '"natural play" "wood chips" "rubber surfacing"'
)


def gmail_search(query: str) -> list[dict[str, Any]]:
    env = os.environ.copy()
    env["HERMES_HOME"] = str(ACCOUNT_HOME)
    result = subprocess.run(
        [
            str(GOOGLE_PYTHON),
            str(GOOGLE_API),
            "gmail",
            "search",
            query,
            "--max",
            "100",
        ],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"Gmail search failed: {detail[:500]}")
    output = result.stdout.strip()
    if not output or output == "No messages found.":
        return []
    try:
        rows = json.loads(output)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gmail search returned invalid JSON: {exc}") from exc
    return rows if isinstance(rows, list) else []


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {"seen_ids": [], "last_checked_at": 0}
    try:
        state = json.loads(STATE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {"seen_ids": [], "last_checked_at": 0}
    if not isinstance(state, dict):
        return {"seen_ids": [], "last_checked_at": 0}
    seen = state.get("seen_ids", [])
    state["seen_ids"] = [str(value) for value in seen if value]
    state["last_checked_at"] = int(state.get("last_checked_at", 0) or 0)
    return state


def save_state(state: dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{STATE_PATH.name}.", dir=STATE_PATH.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(state, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, STATE_PATH)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def clean_snippet(value: str) -> str:
    text = html.unescape(value or "")
    text = re.sub(r"https?://\S+", "[link]", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*On .*wrote:.*$", "", text, flags=re.IGNORECASE)
    if len(text) > 220:
        text = text[:217].rstrip() + "..."
    return text


def classify(row: dict[str, Any]) -> str:
    subject = (row.get("subject") or "").lower()
    snippet = (row.get("snippet") or "").lower()
    if "an early win" in subject or "better playgrounds" in subject:
        return "campaign response"
    if any(term in f"{subject} {snippet}" for term in ("playground", "play area", "play structure", "wood chips", "natural play")):
        return "playground idea"
    return "campaign inbox item"


def display_date(value: str) -> str:
    if not value:
        return ""
    return value.split(", ", 1)[-1].rsplit(" -", 1)[0].strip()


def run(initialize: bool = False) -> int:
    state = load_state()
    now = int(datetime.now(timezone.utc).timestamp())
    seen = set(state.get("seen_ids", []))
    last_checked = int(state.get("last_checked_at", 0) or 0)
    if last_checked:
        after = max(0, last_checked - 172800)
        time_clause = f"after:{after}"
    else:
        time_clause = "newer_than:365d"
    query = f'in:anywhere -in:sent -label:drafts {time_clause} {{{SEARCH_TERMS}}}'
    rows = gmail_search(query)
    current_ids = {str(row.get("id")) for row in rows if row.get("id")}

    if not state.get("last_checked_at") or initialize:
        state = {"seen_ids": sorted(seen | current_ids), "last_checked_at": now}
        save_state(state)
        return 0

    new_rows = [row for row in rows if row.get("id") and str(row["id"]) not in seen]
    state["seen_ids"] = sorted(seen | current_ids)
    state["last_checked_at"] = now
    save_state(state)

    if not new_rows:
        return 0

    new_rows.sort(key=lambda row: row.get("date", ""), reverse=True)
    lines = [f"Better Playgrounds inbox — {len(new_rows)} new item(s)"]
    for row in new_rows[:10]:
        subject = (row.get("subject") or "(no subject)").strip()
        kind = classify(row)
        date = display_date(row.get("date", ""))
        snippet = clean_snippet(row.get("snippet", ""))
        line = f"• {kind}: {subject}"
        if date:
            line += f" ({date})"
        if snippet:
            line += f" — {snippet}"
        lines.append(line)
    if len(new_rows) > 10:
        lines.append(f"• {len(new_rows) - 10} more item(s) are recorded in the watcher state.")
    lines.append("No mailbox changes were made; review before adding anything public.")
    print("\n".join(lines))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--initialize",
        action="store_true",
        help="Baseline the current matching mailbox without producing output.",
    )
    args = parser.parse_args()
    try:
        return run(initialize=args.initialize)
    except Exception as exc:  # pragma: no cover - scheduler should deliver the error
        print(f"Better Playgrounds inbox watcher error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
