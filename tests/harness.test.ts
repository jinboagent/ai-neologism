import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { rawGet, resetDb } from "./helpers/db";

describe("test harness", () => {
  beforeAll(async () => {
    await resetDb();
  });

  it("opens an isolated in-memory database, never data/ai-neologism.db", async () => {
    expect(process.env.NEOLOGISM_DB_PATH).toBe(":memory:");
    const name = (await getDb().execute("PRAGMA database_list")).rows[0] as unknown as { file: string };
    expect(name.file).toBe("");
  });

  it("creates the full schema including the FTS5 virtual table", async () => {
    const tables = (await getDb().execute(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name"
    )).rows as unknown as { name: string }[];
    const names = tables.map((t) => t.name);
    for (const expected of ["words", "revisions", "votes", "keys", "reviews", "words_fts"]) {
      expect(names).toContain(expected);
    }
  });

  it("keeps the FTS index in sync via triggers", async () => {
    const db = getDb();
    await db.execute("INSERT INTO words (slug, word, definition) VALUES ('ftsprobe', 'ftsprobe', 'a probe definition')");
    const hit = (await db.execute("SELECT rowid FROM words_fts WHERE words_fts MATCH '\"probe\"'")).rows;
    expect(hit).toHaveLength(1);

    await db.execute("DELETE FROM words WHERE slug = 'ftsprobe'");
    const afterDelete = (await db.execute("SELECT rowid FROM words_fts WHERE words_fts MATCH '\"probe\"'")).rows;
    expect(afterDelete).toHaveLength(0);
  });

  it("resets cleanly between tests", async () => {
    await resetDb();
    const n = (await rawGet("SELECT COUNT(*) AS n FROM words")) as { n: number };
    expect(n.n).toBe(0);
  });
});
