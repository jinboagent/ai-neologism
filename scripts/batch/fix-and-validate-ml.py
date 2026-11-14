#!/usr/bin/env python3
"""Authoritative auto-fix + validation for multilingual batch tables.

For each table file (<src-stem>-<lang>.md paired with a source EN file):
  1. Rewrite the English column from the source file (authoritative), by row number.
  2. Validate: every source survivor row present, no dupes, ratings 1-5.
Usage: python scripts/batch/fix-and-validate-ml.py <table.md> ...
"""
import io, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / "wordstoreview"
SURV = json.load(open(WS / "survivors-4409-501.json", encoding="utf-8"))

REV2SRC = {
    "review-batch-4-04-claude.md": "batch-4-04-daily-100.md",
    "review-batch-4-05-claude.md": "batch-4-05-daily-100.md",
    "review-batch-4-06-claude.md": "batch-4-06-daily-100.md",
    "review-batch-4-07-claude.md": "batch-4-07-daily-100.md",
    "review-batch-4-08-claude.md": "batch-4-08-daily-100.md",
    "review-batch-4-09-claude.md": "batch-4-09-daily-100.md",
    "review-batch-5-01-claude.md": "batch-5-01-night-100.md",
}

def survivor_words(rev):
    return {s["n"]: s["word"] for s in SURV[rev]}

def process(table_path):
    name = table_path.stem  # e.g. batch-4-04-daily-fr
    m = re.match(r"(batch-\d-\d\d-daily|batch-5-01-night)-(fr|es|de)$", name)
    if not m:
        return f"SKIP {name} (pattern)"
    stem, lang = m.groups()
    rev = next(k for k, v in REV2SRC.items() if v.startswith(stem))
    expected = survivor_words(rev)

    lines = io.open(table_path, encoding="utf-8").read().splitlines()
    out, seen, problems, fixed = [], {}, [], 0
    for line in lines:
        mrow = re.match(r"^\|\s*(\d+)\s*\|\s*(.+?)\s*\|", line)
        if not mrow or line.startswith("| #"):
            out.append(line)
            continue
        n = int(mrow.group(1))
        cells = line.split("|")
        # cells: ['', ' # ', ' EN ', ' TGT ', ' gloss ', ' funny ', ' novelty ', '']
        if len(cells) < 8:
            problems.append(f"row {n}: {len(cells)-2} cells (need 6 cols)")
            out.append(line)
            continue
        if n in expected:
            auth = expected[n]
            if cells[2].strip() != auth:
                cells[2] = f" {auth} "
                fixed += 1
        else:
            problems.append(f"row {n}: not an APPROVE survivor")
        seen.setdefault(n, cells[3].strip())
        # rating range check
        for idx, lbl in ((5, "funny"), (6, "novelty")):
            v = cells[idx].strip()
            if not re.fullmatch(r"[1-5]", v):
                problems.append(f"row {n}: {lbl}='{v}'")
        out.append("|".join(cells))
    text = "\n".join(out) + ("\n" if not out[-1] else "")
    io.open(table_path, "w", encoding="utf-8", newline="\n").write(text)

    missing = sorted(set(expected) - set(seen))
    dupes = [n for n, w in seen.items() if list(seen.keys()).count(n) > 1]
    if missing:
        problems.append(f"MISSING survivor rows: {missing}")
    if dupes:
        problems.append(f"DUPLICATE rows: {dupes}")
    status = "OK" if not problems else "PROBLEMS: " + "; ".join(problems)
    return f"{name}: rows={len(seen)}/{len(expected)} en-fixed={fixed} -> {status}"

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(process(Path(p)))
