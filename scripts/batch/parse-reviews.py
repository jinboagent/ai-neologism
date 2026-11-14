#!/usr/bin/env python3
"""Parse batch-4/5 review verdict tables into JSON + verify header tallies.

Table formats handled:
  EN: | # | word | verdict | funny | novelty | reason |
  DE: | # | English | Deutsch | verdict | funny | novelty | reason |
Ratings like "4→3" take the LAST number (the re-rated value); "–" -> None.
"""
import json, re, sys, io
from pathlib import Path

WS = Path(__file__).resolve().parents[2] / "wordstoreview"
FILES = [
    "review-batch-4-01-claude.md", "review-batch-4-02-claude.md", "review-batch-4-03-claude.md",
    "review-batch-4-04-claude.md", "review-batch-4-05-claude.md", "review-batch-4-06-claude.md",
    "review-batch-4-07-claude.md", "review-batch-4-08-claude.md", "review-batch-4-09-claude.md",
    "review-batch-4-10-claude.md",
    "review-batch-4-04-de-claude.md", "review-batch-4-05-de-claude.md", "review-batch-4-06-de-claude.md",
    "review-batch-4-07-de-claude.md", "review-batch-4-08-de-claude.md", "review-batch-4-09-de-claude.md",
    "review-batch-5-01-claude.md",
]

def parse_rating(cell):
    cell = cell.strip()
    nums = re.findall(r"\d+", cell)
    return int(nums[-1]) if nums else None

def parse_file(path):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"Tally:\s*(.+)", text)
    tally = {}
    if m:
        for k, v in re.findall(r"(APPROVE|REVISE|REJECT|CHECK|DROP)\s+(\d+)", m.group(1)):
            tally[k] = int(v)
    rows, is_de = [], False
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) >= 2 and cells[1].lower() == "english":
            is_de = True
            continue
        if len(cells) >= 6 and re.fullmatch(r"\d+", cells[0]):
            if is_de and len(cells) >= 7:
                n, word, de, verdict, funny, nov = cells[0], cells[1], cells[2], cells[3], cells[4], cells[5]
            else:
                n, word, verdict, funny, nov = cells[0], cells[1], cells[2], cells[3], cells[4]
                de = None
            rows.append({
                "n": int(n), "word": word, "de": de, "verdict": verdict.upper(),
                "funny": parse_rating(funny), "novelty": parse_rating(nov),
            })
    computed = {}
    for r in rows:
        computed[r["verdict"]] = computed.get(r["verdict"], 0) + 1
    return {"file": path.name, "header_tally": tally, "computed_tally": computed,
            "row_count": len(rows), "rows": rows}

def main():
    out = {}
    bad = []
    for name in FILES:
        p = WS / name
        if not p.exists():
            bad.append((name, "MISSING FILE"))
            continue
        d = parse_file(p)
        out[name] = d
        diffs = {k: (d["header_tally"].get(k, 0), d["computed_tally"].get(k, 0))
                 for k in set(d["header_tally"]) | set(d["computed_tally"])
                 if d["header_tally"].get(k, 0) != d["computed_tally"].get(k, 0)}
        status = "OK" if not diffs else f"MISMATCH {diffs}"
        if diffs:
            bad.append((name, status))
        appr = d["computed_tally"].get("APPROVE", 0)
        print(f"{name}: rows={d['row_count']} computed={d['computed_tally']} -> {status}")

    print()
    print("=== English APPROVE survivors per file ===")
    total_en = 0
    for name in FILES:
        if "-de-" in name:
            continue
        surv = [r["word"] for r in out[name]["rows"] if r["verdict"] == "APPROVE"]
        total_en += len(surv)
        print(f"{name}: {len(surv)}")
    print(f"TOTAL English APPROVE (batch-4 + batch-5-01): {total_en}")

    (WS / "review-verdicts.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nWrote wordstoreview/review-verdicts.json ({sum(len(v['rows']) for v in out.values())} rows)")
    if bad:
        print("PROBLEMS:", bad)

if __name__ == "__main__":
    main()
