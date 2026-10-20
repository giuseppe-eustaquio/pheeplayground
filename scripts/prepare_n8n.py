#!/usr/bin/env python3
"""Copy workflow JSON from your n8n-projects clone into this site, with private fields removed.

Usage (from the site repo root):
    python3 scripts/prepare_n8n.py ../n8n-projects

Each <folder>/*.json becomes n8n/workflows/<folder>.json.
Removes credential references, webhook IDs, pinned data and instance IDs, then WARNS about
things it can't safely remove (emails, API-key-like strings, sheet IDs). Review the warnings
and the output before you commit.
"""
import json
import re
import sys
from pathlib import Path

OUT = Path("n8n/workflows")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
SUSPICIOUS = re.compile(r"(appid=|api[_-]?key|bearer\s|sk-[A-Za-z0-9]|xai-|gsk_|token=)", re.I)


def clean(wf: dict) -> dict:
    for key in ("pinData", "staticData", "id", "versionId", "tags", "active"):
        wf.pop(key, None)
    if isinstance(wf.get("meta"), dict):
        wf["meta"].pop("instanceId", None)
    if isinstance(wf.get("settings"), dict):
        wf["settings"].pop("errorWorkflow", None)  # ID of your error workflow
    for node in wf.get("nodes", []):
        node.pop("credentials", None)
        node.pop("webhookId", None)
    return wf


def warn(name: str, wf: dict) -> None:
    text = json.dumps(wf)
    for m in sorted(set(EMAIL.findall(text))):
        print(f"  WARN {name}: email address found: {m}")
    for m in sorted({s.lower() for s in SUSPICIOUS.findall(text)}):
        print(f"  WARN {name}: looks like a key or token ({m!r}), search the JSON for it")
    for node in wf.get("nodes", []):
        doc = node.get("parameters", {}).get("documentId")
        if doc:
            print(f"  WARN {name}: node '{node.get('name')}' has a documentId (Google Sheet/Doc). Consider blanking it.")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    if not src.is_dir():
        sys.exit(f"Not a folder: {src}")
    OUT.mkdir(parents=True, exist_ok=True)

    for folder in sorted(p for p in src.iterdir() if p.is_dir() and not p.name.startswith(".")):
        files = sorted(folder.glob("*.json"))
        if not files:
            continue
        if len(files) > 1:
            print(f"{folder.name}: {len(files)} JSON files, using {files[0].name}")
        wf = clean(json.loads(files[0].read_text(encoding="utf-8")))
        warn(folder.name, wf)
        (OUT / f"{folder.name}.json").write_text(
            json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"ok  {folder.name} -> {OUT / (folder.name + '.json')}")


if __name__ == "__main__":
    main()
