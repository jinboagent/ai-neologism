#!/usr/bin/env python3
"""Build the standalone local archive of non-approved batch-4/5 words.

Output: data/ai-neologism-notapproved.db (plain SQLite, separate from the wiki DB).

Tables:
  not_approved_en   — every batch-4/5 EN headword whose verdict is REVISE or REJECT
                      (276 from batch-4 01-10 + 17 from batch-5-01), with the full
                      source entry, the verdict, the reviewer's one-line reason and
                      the German coin where the German table has one.
  german_held_back  — German coinages for APPROVED English words that the German
                      in-language review sent back (REVISE/REJECT/DROP among
                      survivors) — pending rename before they can join the wiki.
  meta              — build provenance.

Idempotent: the DB file is rebuilt from scratch on each run.
Usage: python scripts/batch/build-notapproved-db.py
"""
import json, re, sqlite3, io
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / "wordstoreview"
OUT = ROOT / "data" / "ai-neologism-notapproved.db"

REVMAP = {
    "review-batch-4-01-claude.md": "batch-4-01-daily-100.md",
    "review-batch-4-02-claude.md": "batch-4-02-daily-100.md",
    "review-batch-4-03-claude.md": "batch-4-03-daily-100.md",
    "review-batch-4-04-claude.md": "batch-4-04-daily-100.md",
    "review-batch-4-05-claude.md": "batch-4-05-daily-100.md",
    "review-batch-4-06-claude.md": "batch-4-06-daily-100.md",
    "review-batch-4-07-claude.md": "batch-4-07-daily-100.md",
    "review-batch-4-08-claude.md": "batch-4-08-daily-100.md",
    "review-batch-4-09-claude.md": "batch-4-09-daily-100.md",
    "review-batch-4-10-claude.md": "batch-4-10-daily-100.md",
    "review-batch-5-01-claude.md": "batch-5-01-night-100.md",
}
DE_FILTERED = {"batch-4-04", "batch-4-05", "batch-4-06", "batch-4-07", "batch-4-08", "batch-4-09"}

def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]

def parse_source(path):
    """{n: entry dict} from a batch source file."""
    entries, cur = {}, None
    for line in io.open(path, encoding="utf-8"):
        m = re.match(r"^### (\d+)\. (.+)", line)
        if m:
            cur = int(m.group(1))
            entries[cur] = {"word": m.group(2).strip(), "pos": "", "definition": "", "explanation": "",
                            "why": "", "pronunciation": "", "related": "", "categories": ""}
            continue
        if cur is None:
            continue
        for key, label in [("pos", "Part of speech"), ("definition", "Definition"), ("explanation", "Explanation"),
                           ("why", "Why this word"), ("pronunciation", "Pronunciation"),
                           ("related", "Related words"), ("categories", "Categories")]:
            m2 = re.match(rf"-\s*\*\*{label}:\*\*\s*(.+)", line)
            if m2:
                entries[cur][key] = m2.group(1).strip()
    return entries

def parse_review_table(path):
    """[(n, word_or_coin, verdict, funny, novelty, reason)] from an EN review file
    (| # | word | verdict | funny | novelty | reason |) or a bilingual German one
    (| # | English | Deutsch | verdict | funny | novelty | reason |)."""
    out = []
    V = re.compile(r"(?i)(APPROVE|REVISE|REJECT|CHECK|DROP)")
    rating = lambda c: (int(re.findall(r"\d+", c)[-1]) if re.findall(r"\d+", c) else None)
    for line in io.open(path, encoding="utf-8"):
        cs = cells(line)
        if not cs or not cs[0].isdigit():
            continue
        if len(cs) >= 6 and V.fullmatch(cs[2] or ""):
            out.append((int(cs[0]), cs[1], cs[2].upper(), rating(cs[3]), rating(cs[4]), " | ".join(cs[5:]).strip()))
        elif len(cs) >= 7 and V.fullmatch(cs[3] or ""):
            out.append((int(cs[0]), cs[2], cs[3].upper(), rating(cs[4]), rating(cs[5]), " | ".join(cs[6:]).strip()))
    return out

def parse_bilingual(path):
    """{n: {en, coin, gloss, funny, novelty}} from a translation table."""
    out = {}
    for line in io.open(path, encoding="utf-8"):
        cs = cells(line)
        if len(cs) >= 7 and cs[0].isdigit() and cs[1] and cs[1].lower() != "#":
            rating = lambda c: (int(re.findall(r"\d+", c)[-1]) if re.findall(r"\d+", c) else None)
            out[int(cs[0])] = {"en": cs[1], "coin": cs[2], "gloss": cs[3],
                               "funny": rating(cs[4]), "novelty": rating(cs[5])}
    return out

def main():
    verdicts = json.load(open(WS / "review-verdicts.json", encoding="utf-8"))
    OUT.unlink(missing_ok=True)
    OUT.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(OUT)
    con.executescript("""
    CREATE TABLE not_approved_en (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch TEXT NOT NULL, src_num INTEGER NOT NULL,
      word TEXT NOT NULL, slug TEXT NOT NULL,
      part_of_speech TEXT, definition TEXT, explanation TEXT, why_this_word TEXT,
      pronunciation TEXT, related TEXT, categories TEXT,
      funny_level INTEGER, novelty_level INTEGER,
      verdict TEXT NOT NULL, review_reason TEXT, reviewed_at TEXT DEFAULT '2026-11-14',
      de_coin TEXT, de_gloss TEXT
    );
    CREATE TABLE german_held_back (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch TEXT NOT NULL, src_num INTEGER NOT NULL,
      en_word TEXT NOT NULL,
      de_coin TEXT NOT NULL, de_gloss TEXT,
      de_verdict TEXT NOT NULL, de_reason TEXT,
      en_funny_level INTEGER, en_novelty_level INTEGER
    );
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    """)
    cur = con.cursor()
    counts = {"en": 0, "de_held": 0, "rejects": 0, "revises": 0}

    for rev, src in REVMAP.items():
        batch = rev.replace("review-", "").replace("-claude.md", "")
        ents = parse_source(WS / src)
        review_rows = {n: (w, v, f, nv, reason) for (n, w, v, f, nv, reason) in parse_review_table(WS / rev)}
        de_file = WS / (f"{batch}-daily-de.md")
        de_table = parse_bilingual(de_file) if de_file.exists() else {}
        de_review_path = Path(str(WS / rev).replace("-claude.md", "-de-claude.md"))
        de_review = parse_review_table(de_review_path) if de_review_path.exists() else []
        de_verdict_by_num = {n: (w, v, reason) for (n, w, v, f, nv, reason) in de_review}

        for r in verdicts[rev]["rows"]:
            n = r["n"]
            if r["verdict"] == "APPROVE":
                continue  # approved words live in the wiki DB
            e = ents.get(n, {})
            w, v, f, nv, reason = review_rows.get(n, (r["word"], r["verdict"], r["funny"], r["novelty"], ""))
            de = de_table.get(n)
            cur.execute(
                "INSERT INTO not_approved_en (batch, src_num, word, slug, part_of_speech, definition, explanation,"
                " why_this_word, pronunciation, related, categories, funny_level, novelty_level,"
                " verdict, review_reason, de_coin, de_gloss) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (batch, n, e.get("word") or w, (e.get("word") or w).lower(), e.get("pos"), e.get("definition"),
                 e.get("explanation"), e.get("why"), e.get("pronunciation"), e.get("related"), e.get("categories"),
                 f, nv, v, reason, de["coin"] if de else None, de["gloss"] if de else None))
            counts["en"] += 1
            counts["rejects" if v == "REJECT" else "revises"] += 1

        # German coinages held back from the wiki (reviewed REVISE/REJECT on approved EN words)
        de_bilingual = parse_bilingual(de_file) if de_file.exists() else {}
        for (dn, dw, dv, df, dnv, dreason) in de_review:
            if dv not in ("REVISE", "REJECT"):
                continue
            en_row = next((x for x in verdicts[rev]["rows"] if x["n"] == dn), None)
            if not en_row or en_row["verdict"] != "APPROVE":
                continue  # EN-REJECT rows are in not_approved_en already
            de = de_bilingual.get(dn)
            cur.execute(
                "INSERT INTO german_held_back (batch, src_num, en_word, de_coin, de_gloss, de_verdict,"
                " de_reason, en_funny_level, en_novelty_level) VALUES (?,?,?,?,?,?,?,?,?)",
                (batch, dn, en_row["word"], dw, de["gloss"] if de else None, dv, dreason,
                 en_row["funny"], en_row["novelty"]))
            counts["de_held"] += 1

    cur.executemany("INSERT INTO meta (key, value) VALUES (?, ?)", [
        ("built", "2026-11-14"),
        ("scope", "batch-4 01-10 + batch-5-01 (English novelty review; German in-language review for 04-09)"),
        ("en_rows", str(counts["en"])), ("rejects", str(counts["rejects"])), ("revises", str(counts["revises"])),
        ("german_held_back", str(counts["de_held"])),
        ("note", "verdicts from wordstoreview/review-*.md via review-verdicts.json; CHECKs resolved 2026-11-14"),
    ])
    con.commit()

    print(f"built {OUT}")
    print(f"  not_approved_en: {counts['en']} rows (REJECT {counts['rejects']} / REVISE {counts['revises']})")
    print(f"  german_held_back: {counts['de_held']} rows")
    for row in cur.execute("SELECT verdict, COUNT(*) FROM not_approved_en GROUP BY verdict"):
        print("  ", tuple(row))
    con.close()

if __name__ == "__main__":
    main()
