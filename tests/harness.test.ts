import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { resetDb } from "./helpers/db";

describe("test harness", () => {
  beforeAll(() => {
    resetDb();
  });

  it("opens an isolated in-memory database, never data/ai-neologism.db", () => {
    expect(process.env.NEOLOGISM_DB_PATH).toBe(":memory:");
    const name = getDb().prepare("PRAGMA database_list").get() as { file: string };
    expect(name.file).toBe("");
  });

  it("creates the full schema including the FTS5 virtual table", () => {
    const tables = getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    for (const expected of ["words", "revisions", "votes", "keys", "reviews", "words_fts"]) {
      expect(names).toContain(expected);
    }
  });

  it("keeps the FTS index in sync via triggers", () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO words (slug, word, definition) VALUES ('ftsprobe', 'ftsprobe', 'a probe definition')"
    ).run();
    const hit = db
      .prepare("SELECT rowid FROM words_fts WHERE words_fts MATCH '\"probe\"'")
      .all();
    expect(hit).toHaveLength(1);

    db.prepare("DELETE FROM words WHERE slug = 'ftsprobe'").run();
    const afterDelete = db
      .prepare("SELECT rowid FROM words_fts WHERE words_fts MATCH '\"probe\"'")
      .all();
    expect(afterDelete).toHaveLength(0);
  });

  it("resets cleanly between tests", () => {
    resetDb();
    const n = getDb().prepare("SELECT COUNT(*) AS n FROM words").get() as { n: number };
    expect(n.n).toBe(0);
  });
});
