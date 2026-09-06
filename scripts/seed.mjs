// Seed AI Neologism with three example words (idempotent-ish: skips if words exist).
// Also bootstraps two contribution keys and prints them:
//   - a contributor key (owns the seed words)
//   - a reviewer key (accepted_words preset to 3 → review rights, for local testing)

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "ai-neologism.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    word TEXT NOT NULL,
    pronunciation TEXT,
    part_of_speech TEXT NOT NULL DEFAULT 'noun',
    definition TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    why_this_word TEXT NOT NULL DEFAULT '',
    alternatives_json TEXT NOT NULL DEFAULT '[]',
    verification_json TEXT NOT NULL DEFAULT '{}',
    references_json TEXT NOT NULL DEFAULT '[]',
    related_words TEXT NOT NULL DEFAULT '[]',
    categories_json TEXT NOT NULL DEFAULT '[]',
    ai_assisted INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_review',
    return_notes TEXT,
    badge TEXT NOT NULL DEFAULT 'unverified',
    input_type TEXT,
    contributor_key_hash TEXT,
    use_votes INTEGER NOT NULL DEFAULT 0,
    work_votes INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL REFERENCES words(id),
    editor_key_hash TEXT,
    summary TEXT NOT NULL DEFAULT '',
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS votes (
    word_id INTEGER NOT NULL REFERENCES words(id),
    voter_hash TEXT NOT NULL,
    vote INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(word_id, voter_hash)
  );
  CREATE TABLE IF NOT EXISTS keys (
    key_hash TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_words INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER NOT NULL REFERENCES words(id),
    reviewer_key_hash TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
    word, definition, explanation, why_this_word,
    content='words', content_rowid='id', tokenize='porter unicode61'
  );
  CREATE TRIGGER IF NOT EXISTS words_fts_ai AFTER INSERT ON words BEGIN
    INSERT INTO words_fts(rowid, word, definition, explanation, why_this_word)
    VALUES (new.id, new.word, new.definition, new.explanation, new.why_this_word);
  END;
  CREATE TRIGGER IF NOT EXISTS words_fts_ad AFTER DELETE ON words BEGIN
    INSERT INTO words_fts(words_fts, rowid, word, definition, explanation, why_this_word)
    VALUES ('delete', old.id, old.word, old.definition, old.explanation, old.why_this_word);
  END;
  CREATE TRIGGER IF NOT EXISTS words_fts_au AFTER UPDATE OF word, definition, explanation, why_this_word ON words BEGIN
    INSERT INTO words_fts(words_fts, rowid, word, definition, explanation, why_this_word)
    VALUES ('delete', old.id, old.word, old.definition, old.explanation, old.why_this_word);
    INSERT INTO words_fts(rowid, word, definition, explanation, why_this_word)
    VALUES (new.id, new.word, new.definition, new.explanation, new.why_this_word);
  END;
`);

const hash = (k) => crypto.createHash("sha256").update(k).digest("hex");

const CONTRIBUTOR_KEY = "ck_seed_contributor_" + crypto.randomBytes(8).toString("hex");
const REVIEWER_KEY = "ck_seed_reviewer_" + crypto.randomBytes(8).toString("hex");
db.prepare("INSERT OR IGNORE INTO keys (key_hash, accepted_words) VALUES (?, 0)").run(hash(CONTRIBUTOR_KEY));
db.prepare("INSERT OR IGNORE INTO keys (key_hash, accepted_words) VALUES (?, 3)").run(hash(REVIEWER_KEY));

const SEED_WORDS = [
  {
    slug: "graywashing",
    word: "graywashing",
    pronunciation: "/ˈɡreɪˌwɒʃɪŋ/",
    part_of_speech: "noun",
    definition:
      "Performing superficial philanthropy to mask the harmful record of an institution.",
    explanation:
      "Where greenwashing launders environmental harm, graywashing launders moral harm. An organization facing public criticism funds visible acts of charity — a scholarship here, a gala there — not to do good, but to repaint a damaged reputation. The charitable acts are real; the change they advertise is not.\n\nThe term covers the widening gap between institutional kindness and institutional accountability. When a company simultaneously settles a negligence suit and launches a foundation, the foundation is the graywash: a coat of virtue applied over structural harm.",
    why_this_word:
      "Coined while reading coverage of corporations launching charity foundations in the same quarter they settled misconduct cases. Existing terms (greenwashing, sportswashing, pinkwashing) each cover one domain; this phenomenon needed a domain-general word for laundering a moral record through philanthropy.\n\nEtymology: gray (moral gray area, graying of reputation) + washing (the established '-washing' pattern for reputation laundering).",
    alternatives: [
      { word: "philanthro-veneer", rationale: "accurate but hard to say and four syllables of prefix" },
      { word: "charityshield", rationale: "clear, but collides with the UK Charity Shield trophy" },
      { word: "virtuelaundering", rationale: "evokes money laundering strongly, but 5 syllables" },
    ],
    verification: {
      verdict: "NEW",
      checked_at: "2026-08-28",
      method: "quoted exact-match web search + dictionary lookup (dictionaryapi.dev)",
      queries: [
        { query: '"graywashing"', results_checked: 8, meaningful_matches: 0 },
        { query: '"graywashing" meaning', results_checked: 8, meaningful_matches: 0 },
        { query: '"graywashing" definition', results_checked: 8, meaningful_matches: 0 },
      ],
      closest_matches: [
        { url: "https://example.com/hair-care-blog", note: 'uses "gray washing" for silver-hair care — different sense, two words' },
      ],
      note: 'No established usage of "graywashing" with this meaning found in 24 checked results.',
    },
    references: [
      {
        type: "news",
        title: "Settlements and scholarships: the two-line annual report (seed example)",
        outlet: "Example Gazette",
        date: "2026-07-30",
        url: "https://example.com/settlements-and-scholarships",
        excerpt: "The same quarter it settled three negligence claims, the firm launched a foundation for youth safety.",
      },
      {
        type: "essay",
        title: "On virtue as paint (seed example)",
        author: "A. Thinker",
        date: "2026-05-12",
        url: "https://example.com/on-virtue-as-paint",
        excerpt: "The good works are real; the change they advertise is not.",
      },
    ],
    related_words: [],
    categories: ["Society & Philanthropy"],
    badge: "new",
    use_votes: 34,
    work_votes: 3,
    recent_votes: [1, 1, 1, 1, 1, 1, -1, 1, 1, 1],
    published_at: "datetime('now', '-6 days')",
  },
  {
    slug: "pingdread",
    word: "pingdread",
    pronunciation: "/ˈpɪŋdrɛd/",
    part_of_speech: "noun",
    definition:
      "The low-grade anxiety of seeing a message notification arrive and postponing opening it, knowing it carries a request.",
    explanation:
      "Not fear of bad news — fear of small obligations. The message is probably fine: a favor, a follow-up, a calendar link. But opening it converts a bubble into a task, and so the bubble sits, glowing, while its owner decides they will look at it 'in a bit' — a bit that lengthens as the dread accumulates interest.\n\nPingdread names the specific avoidance loop of the notification age: the longer the message waits, the heavier it feels, until replying requires apologizing for the delay itself.",
    why_this_word:
      "Coined from accounts of messaging fatigue in always-on workplaces: the notification you see but don't open. 'Notification anxiety' exists but is clinical and four syllables of noun pileup; the feeling needed a small, speakable word.\n\nEtymology: ping (message notification) + dread.",
    alternatives: [
      { word: "inbox dread", rationale: "exists informally; two words, not a coinage" },
      { word: "notifear", rationale: "reads like a product name" },
    ],
    verification: {
      verdict: "NEW",
      checked_at: "2026-08-29",
      method: "quoted exact-match web search + dictionary lookup (dictionaryapi.dev)",
      queries: [
        { query: '"pingdread"', results_checked: 8, meaningful_matches: 0 },
        { query: '"ping dread"', results_checked: 8, meaningful_matches: 1 },
      ],
      closest_matches: [
        { url: "https://example.com/forum/thread-118", note: 'one forum post says "that ping dread when the boss messages" — single informal use, not established' },
      ],
      note: 'No established usage found; one informal forum use of the two-word variant recorded.',
    },
    references: [
      {
        type: "news",
        title: "The unopened bubble: messaging fatigue at work (seed example)",
        outlet: "Example Wire",
        date: "2026-08-02",
        url: "https://example.com/unopened-bubble",
        excerpt: "Workers describe seeing the notification, and choosing — for hours — not to know.",
      },
    ],
    related_words: [],
    categories: ["Technology & AI", "Work & Economy"],
    badge: "new",
    use_votes: 21,
    work_votes: 5,
    recent_votes: [1, 1, -1, 1, 1, 1],
    published_at: "datetime('now', '-3 days')",
  },
  {
    slug: "microlegacy",
    word: "microlegacy",
    pronunciation: "/ˈmaɪkroʊlɛɡəsi/",
    part_of_speech: "noun",
    definition:
      "The small digital artifacts — photos, notes, playlists, half-finished drafts — a person curates unintentionally as an accidental legacy.",
    explanation:
      "A legacy used to be deliberate: the will, the archive, the named foundation. The microlegacy is its inverse — nobody plans it, yet everyone is building one. The camera roll with 40,000 photos, the notes app with a decade of lists, the playlist titled 'songs for cleaning' — these outlive their maker as an unintended self-portrait.\n\nThe word gives a name to the mild vertigo of realizing that the most honest record of a life may be the artifacts nobody meant to keep.",
    why_this_word:
      "Coined from essays on digital estates and what actually survives of us: not the biography but the drafts folder.\n\nEtymology: micro- + legacy; follows the productive micro- pattern (microhistory, microfame).",
    alternatives: [
      { word: "accidental archive", rationale: "descriptive but not a coinage; three words" },
      { word: "ghostfiles", rationale: "evocative but collides with several existing product names" },
    ],
    verification: {
      verdict: "NEAR_EXISTING",
      checked_at: "2026-08-30",
      method: "quoted exact-match web search + dictionary lookup (dictionaryapi.dev)",
      queries: [
        { query: '"microlegacy"', results_checked: 8, meaningful_matches: 1 },
      ],
      closest_matches: [
        { url: "https://example.com/blog/microlegacy", note: "a personal blog uses 'microlegacy' for small bequeathed habits (knitting, recipes) — related but physical, not digital" },
      ],
      note: 'Word form appears once with a related but different (non-digital) sense — published with caveat.',
    },
    references: [
      {
        type: "essay",
        title: "What the drafts folder knows (seed example)",
        author: "R. Observer",
        date: "2026-06-18",
        url: "https://example.com/what-the-drafts-folder-knows",
        excerpt: "The archive of a life is no longer curated at the end; it accumulates, unasked, in the cloud.",
      },
    ],
    related_words: [],
    categories: ["Culture & Language"],
    badge: "near_existing",
    use_votes: 12,
    work_votes: 1,
    recent_votes: [1, 1, 1],
    published_at: "datetime('now', '-1 day')",
  },
];

const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace("T", " ");
};

const insertWord = db.prepare(`
  INSERT INTO words (slug, word, pronunciation, part_of_speech, definition, explanation, why_this_word,
    alternatives_json, verification_json, references_json, related_words, categories_json,
    ai_assisted, status, badge, input_type, contributor_key_hash, use_votes, work_votes,
    published_at, created_at, updated_at)
  VALUES (@slug, @word, @pronunciation, @part_of_speech, @definition, @explanation, @why_this_word,
    @alternatives_json, @verification_json, @references_json, @related_words, @categories_json,
    1, 'published', @badge, 'ai', @key_hash, @use_votes, @work_votes,
    @published_at, @created_at, @updated_at)
`);

const insertVote = db.prepare(
  "INSERT OR IGNORE INTO votes (word_id, voter_hash, vote, created_at) VALUES (?, ?, ?, ?)"
);

for (const w of SEED_WORDS) {
  const exists = db.prepare("SELECT 1 FROM words WHERE slug = ?").get(w.slug);
  if (exists) {
    console.log(`skip ${w.slug} (already seeded)`);
    continue;
  }
  // published_at arrives as "datetime('now', '-N days')" — convert to a literal date string
  const daysBack = Number(w.published_at.match(/-(\d+) days/)?.[1] ?? 1);
  const info = insertWord.run({
    ...w,
    published_at: daysAgo(daysBack),
    created_at: daysAgo(daysBack + 2),
    updated_at: daysAgo(daysBack - 1 < 0 ? 0 : daysBack - 1),
    alternatives_json: JSON.stringify(w.alternatives),
    verification_json: JSON.stringify(w.verification),
    references_json: JSON.stringify(w.references),
    related_words: JSON.stringify(w.related_words),
    categories_json: JSON.stringify(w.categories),
    key_hash: hash(CONTRIBUTOR_KEY),
  });
  const wordId = info.lastInsertRowid;
  db.prepare("INSERT INTO revisions (word_id, editor_key_hash, summary, snapshot_json) VALUES (?, ?, 'Initial submission (seed)', '{}')").run(
    wordId,
    hash(CONTRIBUTOR_KEY)
  );
  db.prepare("INSERT INTO reviews (word_id, reviewer_key_hash, action, reason) VALUES (?, ?, 'approve', 'Seed example: evidence log complete, no prior usage found.')").run(
    wordId,
    hash(REVIEWER_KEY)
  );
  w.recent_votes.forEach((v, i) => {
    insertVote.run(wordId, hash(`seed-voter-${w.slug}-${i}`), v, daysAgo((i % 5) + 1));
  });
  // Votes table is the canonical count source — pad it up to the cached column totals.
  for (let i = w.recent_votes.length; i < w.use_votes; i++) {
    insertVote.run(wordId, hash(`seed-voter-${w.slug}-use-${i}`), 1, daysAgo((i % 6) + 1));
  }
  for (let i = 0; i < w.work_votes; i++) {
    insertVote.run(wordId, hash(`seed-voter-${w.slug}-work-${i}`), -1, daysAgo((i % 6) + 1));
  }
  console.log(`seeded ${w.word}`);
}

console.log("\n--- contribution keys (dev only) ---");
console.log("CONTRIBUTOR_KEY (owns seed words):", CONTRIBUTOR_KEY);
console.log("REVIEWER_KEY (review rights, for testing the queue):", REVIEWER_KEY);
console.log("Use with header:  X-Contribution-Key: <key>");
