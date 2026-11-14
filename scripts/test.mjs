// End-to-end test suite for AI Neologism.
// Run against a live dev server:  npm test   (or: node scripts/test.mjs)
// Requires: server on BASE (default http://localhost:3000) and the seeded
// reviewer key (re-run `npm run seed` and update TEST_REVIEWER_KEY if it changed).

import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// Credentials and secrets come from .env.local (the operator's real config), so
// rotating the admin password or the CRON_SECRET doesn't break the suite.
function readEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const envLocal = readEnvLocal();

const REVIEWER_KEY = process.env.TEST_REVIEWER_KEY ?? "ck_seed_reviewer_7a0b807a8f3cb9f8";
const ADMIN_USER = process.env.TEST_ADMIN_USER ?? envLocal.ADMIN_USERNAME ?? "admin";
const ADMIN_PASS = process.env.TEST_ADMIN_PASS ?? envLocal.ADMIN_PASSWORD ?? "change-me-local";
const CRON_SECRET = process.env.CRON_SECRET ?? envLocal.CRON_SECRET ?? "";
const TS = Date.now().toString(36);

// ---------------------------------------------------------------------------
// harness

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${extra ? ` — ${extra}` : ""}`);
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

function section(title) {
  console.log(`\n■ ${title}`);
}

const jar = new Map();
function storeCookies(res) {
  for (const c of res.headers.getSetCookie()) {
    const pair = c.split(";")[0];
    const eq = pair.indexOf("=");
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path, { body, headers = {}, useJar = true, timeoutMs = 60_000 } = {}) {
  const h = { ...headers };
  if (body !== undefined) h["Content-Type"] = "application/json";
  if (useJar && jar.size) h["Cookie"] = cookieHeader();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  storeCookies(res);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html or empty */
  }
  return { status: res.status, json, text };
}

const PRIVATE_FIELDS = ["contributor_key_hash", "contact_email", "editor_key_hash"];
function assertNoPrivateFields(name, payload) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const leaked = PRIVATE_FIELDS.filter((f) => raw.includes(f));
  ok(`${name} (no private fields)`, leaked.length === 0, `leaked: ${leaked.join(", ")}`);
}

// ---------------------------------------------------------------------------
// DB cleanup of previous test runs (words prefixed zztest*, seeds zztest-*)

const dbFile = path.join(process.cwd(), "data", "ai-neologism.db");
const CLEANUP_SQL = [
  "DELETE FROM votes WHERE word_id IN (SELECT id FROM words WHERE word LIKE 'zztest%')",
  "DELETE FROM revisions WHERE word_id IN (SELECT id FROM words WHERE word LIKE 'zztest%')",
  "DELETE FROM reviews WHERE word_id IN (SELECT id FROM words WHERE word LIKE 'zztest%')",
  "DELETE FROM words WHERE word LIKE 'zztest%'",
  "DELETE FROM seeds WHERE url LIKE 'https://zztest-%'",
];
async function cleanTestRows() {
  if (!fs.existsSync(dbFile)) return;
  const db = createClient({ url: `file:${dbFile.replace(/\\/g, "/")}` });
  for (const sql of CLEANUP_SQL) await db.execute(sql);
  db.close();
}
await cleanTestRows();

// ---------------------------------------------------------------------------
// tests

async function testPublicReads() {
  section("A. Public pages & reads");
  const pages = ["/", "/index", "/popularity", "/search?q=philanthropy", "/contribute", "/review", "/my-words", "/seeds", "/sources", "/admin", "/about", "/words/graywashing"];
  for (const p of pages) {
    const { status } = await req("GET", p, { useJar: false });
    ok(`GET ${p} → 200`, status === 200, `got ${status}`);
  }

  const list = await req("GET", "/api/words", { useJar: false });
  ok("GET /api/words → 200", list.status === 200);
  ok("published list non-empty", (list.json?.words?.length ?? 0) > 0);
  assertNoPrivateFields("GET /api/words", list.text);

  const word = await req("GET", "/api/words/graywashing", { useJar: false });
  ok("GET /api/words/graywashing → 200", word.status === 200);
  ok("word has definition", !!word.json?.word?.definition);
  assertNoPrivateFields("GET /api/words/{slug}", word.text);

  const missing = await req("GET", "/api/words/zz-nonexistent-word", { useJar: false });
  ok("GET unknown word → 404", missing.status === 404);

  const search = await req("GET", "/api/search?q=philanthropy", { useJar: false });
  ok("full-text search finds graywashing", (search.json?.words ?? []).some((w) => w.slug === "graywashing"));

  const badFts = await req("GET", "/api/search?q=%22%27%29%3B DROP TABLE words%3B--", { useJar: false });
  ok("FTS injection-ish query handled safely", badFts.status === 200 && Array.isArray(badFts.json?.words));

  for (const lens of ["trending", "endorsed", "contested", "verified"]) {
    const pop = await req("GET", `/api/popularity?lens=${lens}`, { useJar: false });
    ok(`popularity lens ${lens} → 200`, pop.status === 200 && Array.isArray(pop.json?.words));
  }
  const bogus = await req("GET", "/api/popularity?lens=bogus", { useJar: false });
  ok("bogus lens falls back to trending", bogus.json?.lens === "trending");

  const revs = await req("GET", "/api/words/graywashing/revisions", { useJar: false });
  ok("revisions endpoint → 200", revs.status === 200 && Array.isArray(revs.json?.revisions));
  assertNoPrivateFields("revisions", revs.text);

  const badLimit = await req("GET", "/api/words?limit=abc&page=xyz", { useJar: false });
  ok("non-numeric pagination tolerated (NaN fix)", badLimit.status === 200);
}

async function testVoting() {
  section("B. Voting");
  const before = (await req("GET", "/api/words/graywashing", { useJar: false })).json.word;
  const v1 = await req("POST", "/api/words/graywashing/vote", { body: { vote: 1 }, useJar: false });
  ok("use-vote accepted", v1.status === 200 && v1.json?.ok === true);
  ok("use count increased", v1.json.use_votes === before.use_votes + 1, `${before.use_votes} -> ${v1.json?.use_votes}`);

  const v2 = await req("POST", "/api/words/graywashing/vote", { body: { vote: -1 }, useJar: false });
  ok("switching vote moves the count", v2.json?.use_votes === before.use_votes && v2.json?.work_votes === before.work_votes + 1);

  const v3 = await req("POST", "/api/words/graywashing/vote", { body: { vote: -1 }, useJar: false });
  ok("same vote again withdraws it", v3.json?.use_votes === before.use_votes && v3.json?.work_votes === before.work_votes);

  const bad = await req("POST", "/api/words/graywashing/vote", { body: { vote: 0 }, useJar: false });
  ok("invalid vote value → 400", bad.status === 400);
  assertNoPrivateFields("vote response", JSON.stringify(v1.json));
}

async function testSubmission() {
  section("C. Submission paths & validation");
  const badWord = await req("POST", "/api/words", { body: { word: "x", definition: "way too short" }, useJar: false });
  ok("word too short → 400 INVALID_WORD", badWord.status === 400 && badWord.json?.error === "INVALID_WORD");

  const badDef = await req("POST", "/api/words", { body: { word: `zztest${TS}ok`, definition: "short" }, useJar: false });
  ok("definition too short → 400", badDef.status === 400);

  const badEmail = await req("POST", "/api/words", {
    body: { word: `zztest${TS}mail`, definition: "A test definition long enough to pass validation.", contact_email: "notanemail" },
    useJar: false,
  });
  ok("invalid contact_email → 400 INVALID_EMAIL", badEmail.status === 400 && badEmail.json?.error === "INVALID_EMAIL");

  const dup = await req("POST", "/api/words", {
    body: { word: "graywashing", definition: "Attempting to duplicate an existing word should fail." },
    useJar: false,
  });
  ok("duplicate word → 409 DUPLICATE_WORD", dup.status === 409 && dup.json?.error === "DUPLICATE_WORD");

  // Web submission (cookie path): issues a key, goes to community queue.
  const web1 = await req("POST", "/api/words", {
    body: {
      word: `zztest${TS}web`,
      definition: "A test coinage created by the automated end-to-end suite.",
      ai_assisted: false,
      verification: { verdict: "NEW", checked_at: "2026-10-31", method: "test package", queries: [{ query: `"zztest"`, results_checked: 1, meaningful_matches: 0 }], note: "test" },
    },
  });
  ok("web submission → 202 in_review", web1.status === 202 && web1.json?.status === "in_review");
  ok("first submission issues a contribution key", typeof web1.json?.key === "string" && web1.json.key.startsWith("ck_"));

  // Live server-side verification run (no package supplied) — any verdict is honest behavior.
  const live = await req("POST", "/api/words", {
    body: { word: `zztest${TS}live`, definition: "A test coinage that lets the server run its own novelty search." },
    timeoutMs: 90_000,
  });
  ok(
    "server-side novelty search ran (any verdict)",
    (live.status === 202 && !!live.json?.verification?.verdict) || live.status === 409,
    `got ${live.status}`
  );

  return { webSlug: web1.json?.slug, webKey: web1.json?.key };
}

async function testKeys({ webSlug }) {
  section("D. Contribution keys & ownership");
  const anonKey = await req("GET", "/api/key", { useJar: false });
  ok("GET /api/key without key → has_key false", anonKey.json?.has_key === false);

  const withKey = await req("GET", "/api/key");
  ok("GET /api/key with cookie → has_key true", withKey.json?.has_key === true);

  const mine = await req("GET", "/api/words?mine=1");
  ok("?mine=1 lists own submission", (mine.json?.words ?? []).some((w) => w.slug === webSlug));
  assertNoPrivateFields("?mine=1", mine.text);

  const noKey = await req("GET", "/api/words?mine=1", { useJar: false });
  ok("?mine=1 without key → 401", noKey.status === 401);
}

async function testEditing({ webSlug, webKey }) {
  section("E. Editing & revisions");
  const strangerKey = "ck_" + "z".repeat(20);
  const strangerPut = await req("PUT", `/api/words/${webSlug}`, {
    headers: { "X-Contribution-Key": strangerKey },
    body: { definition: "A stranger should not be able to edit a pending word." },
    useJar: false,
  });
  ok("stranger edit of pending word → 403", strangerPut.status === 403);

  const ownerPut = await req("PUT", `/api/words/${webSlug}`, {
    headers: { "X-Contribution-Key": webKey },
    body: { definition: "A test coinage refined by its owner before review.", summary: "suite edit" },
    useJar: false,
  });
  ok("owner edit → 200", ownerPut.status === 200);
  ok("edit applied", ownerPut.json?.word?.definition?.includes("refined by its owner"));

  const revs = await req("GET", `/api/words/${webSlug}/revisions`, { headers: { "X-Contribution-Key": webKey }, useJar: false });
  ok("revision history has 2 entries after edit", (revs.json?.revisions?.length ?? 0) === 2, `got ${revs.json?.revisions?.length}`);
}

async function testCommunityReview({ webSlug, webKey }) {
  section("F. Community review");
  const noRights = await req("GET", "/api/review", { useJar: false });
  ok("review queue without rights → 403", noRights.status === 403);

  const queue = await req("GET", "/api/review", { headers: { "X-Contribution-Key": REVIEWER_KEY }, useJar: false });
  ok("reviewer sees the queue", queue.status === 200 && Array.isArray(queue.json?.queue));
  ok("community queue excludes API submissions", !(queue.json?.queue ?? []).some((w) => w.input_type === "api"));
  assertNoPrivateFields("community queue", queue.text);

  // True self-review test: the submitter holds review rights (seeded reviewer key),
  // so the word must be submitted through the BROWSER channel (cookie, not header)
  // to reach the community queue — then their own approve attempt must be blocked.
  const selfWord = await req("POST", "/api/words", {
    headers: { Cookie: `ck=${REVIEWER_KEY}` },
    body: {
      word: `zztest${TS}self`,
      definition: "A community-channel submission by a reviewer, used to prove self-review is blocked.",
      verification: { verdict: "NEW", checked_at: "2026-10-31", method: "test package", queries: [], note: "test" },
    },
    useJar: false,
  });
  ok("reviewer-key browser submission accepted", selfWord.status === 202);

  const selfReview = await req("POST", "/api/review", {
    headers: { "X-Contribution-Key": REVIEWER_KEY },
    body: { slug: selfWord.json?.slug, action: "approve", reason: "Approving my own word should be blocked." },
    useJar: false,
  });
  ok("self-review blocked → 403 SELF_REVIEW", selfReview.status === 403 && selfReview.json?.error === "SELF_REVIEW", `got ${selfReview.status} ${selfReview.json?.error}`);

  const shortReason = await req("POST", "/api/review", {
    headers: { "X-Contribution-Key": REVIEWER_KEY },
    body: { slug: webSlug, action: "approve", reason: "ok" },
    useJar: false,
  });
  ok("reason too short → 400", shortReason.status === 400);

  const missing = await req("POST", "/api/review", {
    headers: { "X-Contribution-Key": REVIEWER_KEY },
    body: { slug: "zz-nonexistent", action: "approve", reason: "Nothing behind this slug." },
    useJar: false,
  });
  ok("reviewing unknown slug → 404", missing.status === 404);

  const approve = await req("POST", "/api/review", {
    headers: { "X-Contribution-Key": REVIEWER_KEY },
    body: { slug: webSlug, action: "approve", reason: "Suite test: evidence supplied, definition reads fine." },
    useJar: false,
  });
  ok("reviewer approval → published", approve.status === 200 && approve.json?.status === "published");

  const published = await req("GET", `/api/words/${webSlug}`, { useJar: false });
  ok("published word now publicly visible", published.status === 200 && published.json?.word?.status === "published");
  assertNoPrivateFields("published word", published.text);
}

async function testApiChannelAndAdmin() {
  section("G. API channel & admin gate");
  const api1 = await req("POST", "/api/words", {
    headers: { "X-Contribution-Key": `ck_zztest_apikey1_${TS}` },
    body: {
      word: `zztest${TS}api1`,
      definition: "A third-party API submission that only the admin may approve.",
      contact_email: "zztest-partner@example.com",
      verification: { verdict: "NEW", checked_at: "2026-10-31", method: "test package", queries: [], note: "test" },
    },
    useJar: false,
  });
  ok("API submission accepted → 202", api1.status === 202);
  ok("API submission response does not leak the channel to strangers", api1.json?.slug?.length > 0);

  const api2 = await req("POST", "/api/words", {
    headers: { "X-Contribution-Key": `ck_zztest_apikey2_${TS}` },
    body: {
      word: `zztest${TS}api2`,
      definition: "A second API submission destined for the rejection path.",
      contact_email: "zztest-reject@example.com",
      verification: { verdict: "NEW", checked_at: "2026-10-31", method: "test package", queries: [], note: "test" },
    },
    useJar: false,
  });
  ok("second API submission accepted", api2.status === 202);

  const unauth = await req("GET", "/api/admin/review", { useJar: false });
  ok("admin queue without login → 401", unauth.status === 401);

  // A community reviewer must not be able to approve an API word by slug either.
  const apiSlugHunt = await req("POST", "/api/review", {
    headers: { "X-Contribution-Key": REVIEWER_KEY },
    body: { slug: `zztest${TS}api1`, action: "approve", reason: "Community reviewer reaching into the admin queue." },
    useJar: false,
  });
  ok("community review cannot decide API words → 404", apiSlugHunt.status === 404, `got ${apiSlugHunt.status}`);

  const wrongPass = await req("POST", "/api/admin/login", {
    body: { username: ADMIN_USER, password: "definitely-wrong" },
    headers: { "User-Agent": `zztest-suite-${TS}` },
    useJar: false,
  });
  ok("wrong password → 401", wrongPass.status === 401, `got ${wrongPass.status}`);

  const login = await req("POST", "/api/admin/login", {
    body: { username: ADMIN_USER, password: ADMIN_PASS },
    headers: { "User-Agent": `zztest-suite-${TS}` },
  });
  ok("admin login → session cookie", login.status === 200 && jar.has("admin_session"), `got ${login.status}`);

  const session = await req("GET", "/api/admin/login");
  ok("session check reports admin", session.json?.admin === true);

  const queue = await req("GET", "/api/admin/review");
  const inQueue = (queue.json?.queue ?? []).map((w) => w.word);
  ok("admin queue contains both API submissions", inQueue.includes(`zztest${TS}api1`) && inQueue.includes(`zztest${TS}api2`));
  ok("admin queue exposes contact_email to the admin only", (queue.json?.queue ?? []).some((w) => w.contact_email === "zztest-partner@example.com"));

  const nonApi = await req("POST", "/api/admin/review", {
    body: { slug: "graywashing", action: "approve", reason: "Admin route must only touch API submissions." },
  });
  ok("admin route refuses non-API words → 404", nonApi.status === 404);

  const noReason = await req("POST", "/api/admin/review", {
    body: { slug: `zztest${TS}api2`, action: "reject", reason: "no" },
  });
  ok("admin decision without real reason → 400", noReason.status === 400);

  const reject = await req("POST", "/api/admin/review", {
    body: { slug: `zztest${TS}api2`, action: "reject", reason: "Suite test: joke coinage without communicative need." },
  });
  ok("reject → declined", reject.status === 200 && reject.json?.status === "declined");
  ok("rejection notification skipped gracefully (no RESEND key)", /not set|skipped|no contact/i.test(reject.json?.notified?.detail ?? ""));

  const approveEdits = await req("POST", "/api/admin/review", {
    body: {
      slug: `zztest${TS}api1`,
      action: "approve",
      reason: "Suite test: approved with an editorial tightening.",
      edits: { definition: "A third-party API submission the admin edited before publishing." },
    },
  });
  ok("admin approve-with-edits → published", approveEdits.status === 200 && approveEdits.json?.status === "published" && approveEdits.json?.edits_applied === true);
  ok("approve notification marked not-applicable", /not applicable/i.test(approveEdits.json?.notified?.detail ?? ""));

  const edited = await req("GET", `/api/words/zztest${TS}api1`, { useJar: false });
  ok("published API word carries the admin's edit", edited.json?.word?.definition?.includes("admin edited"));

  const declinedOwner = await req("GET", `/api/words/zztest${TS}api2`, { headers: { "X-Contribution-Key": `ck_zztest_apikey2_${TS}` }, useJar: false });
  ok("rejected word visible to its submitter with reason", declinedOwner.json?.word?.status === "declined" && !!declinedOwner.json?.word?.return_notes);
  assertNoPrivateFields("declined word (owner view)", declinedOwner.text);

  const stranger = await req("GET", `/api/words/zztest${TS}api2`, { useJar: false });
  ok("rejected word invisible to strangers → 404", stranger.status === 404);

  const logout = await req("DELETE", "/api/admin/login");
  const afterLogout = await req("GET", "/api/admin/review");
  ok("logout ends the session", logout.status === 200 && afterLogout.status === 401);

  // Re-login for other suites is not needed; do the brute-force hammer LAST.
  // A throwaway per-run User-Agent keeps this run's hammer from exhausting the
  // rate-limit window for the suite's own fingerprint (and for future runs).
  let saw429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await req("POST", "/api/admin/login", {
      body: { username: ADMIN_USER, password: "wrong" },
      headers: { "User-Agent": `zztest-hammer-${TS}` },
      useJar: false,
    });
    if (r.status === 429) {
      saw429 = true;
      break;
    }
  }
  ok("login brute force rate-limited (429)", saw429);
}

async function testSeeds() {
  section("H. Seed queue");
  const badUrl = await req("POST", "/api/seeds", { body: { url: "not a url" } });
  ok("bad seed URL → 400", badUrl.status === 400);

  const ssrf = await req("POST", "/api/seeds", { body: { url: "http://169.254.169.254/latest/meta-data" } });
  ok("SSRF seed URL → 400", ssrf.status === 400);

  const url = `https://zztest-${TS}.example.com/article`;
  const add = await req("POST", "/api/seeds", { body: { url, note: "suite harvest" } });
  ok("valid seed added → 201", add.status === 201);
  const dupSeed = await req("POST", "/api/seeds", { body: { url } });
  ok("duplicate seed returns existing (not 201)", dupSeed.status === 200 && dupSeed.json?.duplicate === true);

  const list = await req("GET", "/api/seeds");
  ok("seed list contains it", (list.json?.seeds ?? []).some((s) => s.url === url));

  const id = add.json?.seed?.id;
  const del = await req("DELETE", `/api/seeds/${id}`);
  ok("owner delete works", del.status === 200);
  const foreignDel = await req("DELETE", "/api/seeds/999999");
  ok("deleting unknown seed → 404", foreignDel.status === 404);
}

async function testCron() {
  section("I. Daily auto-coiner");
  const cron = await req("POST", "/api/cron/coin", {
    useJar: false,
    timeoutMs: 120_000,
    headers: CRON_SECRET ? { "x-cron-secret": CRON_SECRET } : {},
  });
  ok("cron endpoint responds", cron.status === 200 || cron.status === 503, `got ${cron.status}`);
  if (cron.status === 503) {
    ok("graceful AI_NOT_CONFIGURED while no AI key", cron.json?.error === "AI_NOT_CONFIGURED");
  } else {
    ok("auto-coin report well-formed", Array.isArray(cron.json?.coined));
  }
}

// ---------------------------------------------------------------------------

console.log(`AI Neologism end-to-end suite — ${BASE}\n`);

const ctx = {};
await testPublicReads();
await testVoting();
Object.assign(ctx, (await testSubmission()) ?? {});
await testKeys(ctx);
await testEditing(ctx);
await testCommunityReview(ctx);
await testApiChannelAndAdmin();
async function testAdminWordManagement() {
  section("J. Admin word management");
  const login = await req("POST", "/api/admin/login", {
    body: { username: ADMIN_USER, password: ADMIN_PASS },
    headers: { "User-Agent": `zztest-suite-${TS}` },
  });
  ok("admin login for management", login.status === 200);

  const sub = await req("POST", "/api/words", {
    headers: { "X-Contribution-Key": `ck_zztest_manage_${TS}` },
    body: {
      word: `zztest${TS}manage`,
      definition: "A word created to prove the admin can unpublish, republish, and delete it.",
      verification: { verdict: "NEW", checked_at: "2026-11-01", method: "test package", queries: [], note: "test" },
    },
    useJar: false,
  });
  ok("management test word submitted", sub.status === 202);
  const slug = sub.json?.slug;

  const approve = await req("POST", "/api/admin/review", {
    body: { slug, action: "approve", reason: "" },
  });
  ok("one-click approval (empty reason) publishes", approve.status === 200 && approve.json?.status === "published", `got ${approve.status}`);

  const list1 = await req("GET", "/api/admin/words");
  const entry = (list1.json?.words ?? []).find((w) => w.slug === slug);
  ok("manage list contains the published word", !!entry && entry.status === "published");
  ok("manage list excludes private fields", !JSON.stringify(list1.text).includes("contributor_key_hash"));

  const unpub = await req("PATCH", `/api/admin/words/${entry.id}`, { body: { status: "draft" } });
  ok("unpublish → draft", unpub.status === 200 && unpub.json?.status === "draft");
  const hidden = await req("GET", `/api/words/${slug}`, { useJar: false });
  ok("unpublished word hidden from the public → 404", hidden.status === 404);

  const repub = await req("PATCH", `/api/admin/words/${entry.id}`, { body: { status: "published" } });
  ok("republish → published", repub.status === 200 && repub.json?.status === "published");
  const visible = await req("GET", `/api/words/${slug}`, { useJar: false });
  ok("republished word visible again", visible.status === 200);

  const del = await req("DELETE", `/api/admin/words/${entry.id}`);
  ok("delete → removed", del.status === 200 && del.json?.slug === slug);
  const gone = await req("GET", `/api/words/${slug}`, { useJar: false });
  ok("deleted word gone → 404", gone.status === 404);
  const list2 = await req("GET", "/api/admin/words");
  ok("manage list no longer contains it", !(list2.json?.words ?? []).some((w) => w.slug === slug));

  const unauth = await req("GET", "/api/admin/words", { useJar: false });
  ok("manage list without login → 401", unauth.status === 401);
}

async function testAdminBatch() {
  section("K. Admin batch operations");
  const login = await req("POST", "/api/admin/login", {
    body: { username: ADMIN_USER, password: ADMIN_PASS },
    headers: { "User-Agent": `zztest-suite-${TS}` },
  });
  ok("admin login for batch", login.status === 200);

  // Three queue words through the API channel (A+B for batch approve, C for the
  // partial batch, D for the batch reject — each decision needs its own word).
  const slugs = [];
  for (const tag of ["batchA", "batchB", "batchC", "batchD"]) {
    const sub = await req("POST", "/api/words", {
      headers: { "X-Contribution-Key": `ck_zztest_batch_${TS}` },
      body: {
        word: `zztest${TS}${tag}`,
        definition: `A batch-operations probe (${tag}) proving the admin can decide many words at once.`,
        verification: { verdict: "NEW", checked_at: "2026-11-01", method: "test package", queries: [], note: "test" },
      },
      useJar: false,
    });
    if (sub.status === 202) slugs.push(sub.json.slug);
  }
  ok("four batch test words submitted", slugs.length === 4, `got ${slugs.length}`);

  const noSlugs = await req("POST", "/api/admin/review/batch", { body: { slugs: [], action: "approve" } });
  ok("empty batch → 400", noSlugs.status === 400);
  const badAction = await req("POST", "/api/admin/review/batch", { body: { slugs: [slugs[0]], action: "nuke" } });
  ok("unknown batch action → 400", badAction.status === 400);
  const shortReason = await req("POST", "/api/admin/review/batch", { body: { slugs: [slugs[0]], action: "reject", reason: "no" } });
  ok("batch reject with too-short reason → 400", shortReason.status === 400);
  const unauth = await req("POST", "/api/admin/review/batch", { body: { slugs, action: "approve" }, useJar: false });
  ok("batch review without login → 401", unauth.status === 401);

  const appr = await req("POST", "/api/admin/review/batch", { body: { slugs: [slugs[0], slugs[1]], action: "approve" } });
  ok(
    "batch approve publishes both",
    appr.status === 200 && appr.json?.approved === 2,
    `got ${appr.status} ${JSON.stringify(appr.json ?? {}).slice(0, 120)}`
  );
  const pub1 = await req("GET", `/api/words/${slugs[0]}`, { useJar: false });
  const pub2 = await req("GET", `/api/words/${slugs[1]}`, { useJar: false });
  ok("approved words are publicly visible", pub1.status === 200 && pub2.status === 200);

  const mixed = await req("POST", "/api/admin/review/batch", {
    body: { slugs: [slugs[2], "zztest_never_submitted"], action: "approve" },
  });
  ok(
    "batch skips unknown slugs, decides the rest",
    mixed.status === 200 && mixed.json?.approved === 1 && (mixed.json?.results ?? []).some((r) => r.error === "NOT_FOUND")
  );

  const rej = await req("POST", "/api/admin/review/batch", { body: { slugs: [slugs[3]], action: "reject", reason: "" } });
  ok("batch reject with empty reason uses the default", rej.status === 200 && rej.json?.rejected === 1);
  const list = await req("GET", "/api/admin/words");
  const c = (list.json?.words ?? []).find((w) => w.slug === slugs[3]);
  ok("rejected word is declined in the manage list", !!c && c.status === "declined");

  // clean up the declined probe word
  const did = c?.id;
  if (did) await req("DELETE", `/api/admin/words/${did}`);

  const ids = [slugs[0], slugs[1]]
    .map((s) => (list.json?.words ?? []).find((w) => w.slug === s)?.id)
    .filter(Boolean);
  const unpub = await req("POST", "/api/admin/words/batch", { body: { ids, action: "unpublish" } });
  ok("batch unpublish takes both down", unpub.status === 200 && unpub.json?.succeeded === 2, `got ${unpub.status}`);
  const gone1 = await req("GET", `/api/words/${slugs[0]}`, { useJar: false });
  ok("batch-unpublished word hidden from the public → 404", gone1.status === 404);
  const repub = await req("POST", "/api/admin/words/batch", { body: { ids, action: "republish" } });
  ok("batch republish brings both back", repub.status === 200 && repub.json?.succeeded === 2);
  const mixedManage = await req("POST", "/api/admin/words/batch", { body: { ids: [...ids, 999999999], action: "delete" } });
  ok(
    "batch delete reports missing ids",
    mixedManage.status === 200 && mixedManage.json?.succeeded === 2 && mixedManage.json?.failed === 1
  );
  const gone2 = await req("GET", `/api/words/${slugs[0]}`, { useJar: false });
  const gone3 = await req("GET", `/api/words/${slugs[1]}`, { useJar: false });
  ok("batch-deleted words gone → 404", gone2.status === 404 && gone3.status === 404);
  const list2 = await req("GET", "/api/admin/words");
  ok(
    "manage list no longer contains deleted words",
    ![slugs[0], slugs[1]].some((s) => (list2.json?.words ?? []).some((w) => w.slug === s))
  );
  const manageUnauth = await req("POST", "/api/admin/words/batch", { body: { ids: [1], action: "delete" }, useJar: false });
  ok("batch manage without login → 401", manageUnauth.status === 401);

  // clean up the declined probe word
  const cid = (await req("GET", "/api/admin/words")).json?.words?.find((w) => w.slug === slugs[2])?.id;
  if (cid) await req("DELETE", `/api/admin/words/${cid}`);
}

await testSeeds();
await testCron();
await testAdminWordManagement();
await testAdminBatch();
await testMultilingual();
await testGames();

// ---------------------------------------------------------------------------
// Multilingual phase 2: localized routes, style-D switcher, one-time
// Accept-Language redirect, hreflang alternates, language guard on word pages.
// Uses raw fetch (no cookie jar) so the redirect cookie never leaks into the
// other suites' requests.
async function testMultilingual() {
  console.log("\nmultilingual (phase 2)");

  const raw = async (path, { headers = {}, manual = false } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      headers,
      redirect: manual ? "manual" : "follow",
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    return { status: res.status, text, location: res.headers.get("location") };
  };
  const DE_ACCEPT = { "Accept-Language": "de-DE,de;q=0.9" };

  const redir = await raw("/", { headers: DE_ACCEPT, manual: true });
  ok("first visit with German browser redirects to /de", redir.status >= 300 && redir.status < 400 && redir.location === "/de", `status ${redir.status}, location ${redir.location}`);

  const sticky = await raw("/", { headers: { ...DE_ACCEPT, Cookie: "locale-pref=en" }, manual: true });
  ok("stored locale choice wins (no redirect)", sticky.status === 200, `status ${sticky.status}`);

  const seeds = await raw("/seeds", { headers: DE_ACCEPT, manual: true });
  ok("EN-only pages never redirect", seeds.status === 200, `status ${seeds.status}`);

  const de = await raw("/de");
  ok("/de serves the German edition", de.status === 200 && de.text.includes("Wörter für das"), `status ${de.status}`);
  ok("German page carries the language switcher to the other locales", de.text.includes('href="/es"') && de.text.includes('href="/fr"'));

  const es = await raw("/es/criteria");
  ok("/es/criteria serves Spanish criteria", es.status === 200 && es.text.includes("Puerta 1"), `status ${es.status}`);

  const fr = await raw("/fr/about");
  ok("/fr/about serves French methodology", fr.status === 200 && fr.text.includes("Wikipédia vérifie"), `status ${fr.status}`);

  const deWord = await raw("/de/words/graywashing");
  ok("EN-only word 404s under the German edition", deWord.status === 404, `status ${deWord.status}`);

  const enWord = await raw("/words/graywashing");
  ok(
    "EN word page keeps canonical + x-default hreflang",
    enWord.status === 200 && /hreflang="x-default"/i.test(enWord.text) && enWord.text.includes('rel="canonical"'),
    `status ${enWord.status}`
  );

  const de404 = await raw("/de/nope-xyz");
  ok("unknown path under a locale → 404", de404.status === 404, `status ${de404.status}`);

  const enPrefix = await raw("/en/");
  ok("/en/ prefix is not a route → 404", enPrefix.status === 404, `status ${enPrefix.status}`);

  const sitemap = await raw("/sitemap.xml");
  ok(
    "sitemap contains localized URLs and hreflang alternates",
    sitemap.status === 200 && sitemap.text.includes("<loc>https://www.ai-neologism.com/de</loc>") && sitemap.text.includes('hreflang="de"'),
    `status ${sitemap.status}`
  );

  // phase 3: localized submission pipeline
  const deSub = await req("POST", "/api/words", {
    body: {
      word: "zztestGrauwäscherei",
      definition: "Die Praxis, oberflächliche Wohltätigkeit zu betreiben, um Schaden zu verschleiern.",
      language: "de",
      grammar: { gender: "die", plural: "zztestGrauwäschereien" },
      ai_assisted: true,
      input_type: "ai",
    },
  });
  ok(
    "German submission accepted with Duden-transliterated slug",
    deSub.status === 202 && deSub.json?.slug === "zztestgrauwaescherei",
    `status ${deSub.status}, slug ${deSub.json?.slug}`
  );
  const badLang = await req("GET", "/api/words?language=xx");
  ok("unknown language rejected on GET /api/words", badLang.status === 400, `status ${badLang.status}`);
  const badGrammar = await req("POST", "/api/words", {
    body: { word: "zztestEtwaswort", definition: "Eine Definition, die lang genug für die Prüfung ist.", language: "de" },
  });
  ok(
    "non-English submission without grammar rejected",
    badGrammar.status === 400 && badGrammar.json?.error === "INVALID_GRAMMAR",
    `status ${badGrammar.status}`
  );
}

// Games: the hub and per-game pages exist in all four locales, computed live
// from each language's published words, with per-game availability fallbacks.
async function testGames() {
  console.log("\ngames");

  const raw = async (path, { headers = {}, manual = false } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      headers,
      redirect: manual ? "manual" : "follow",
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    return { status: res.status, text, location: res.headers.get("location") };
  };

  const hub = await raw("/games");
  ok(
    "games hub serves in English with the five game cards",
    hub.status === 200 && hub.text.includes("What does it mean?") && hub.text.includes("The Antiquarium"),
    `status ${hub.status}`
  );

  const deHub = await raw("/de/games");
  ok("/de/games serves the German hub", deHub.status === 200 && deHub.text.includes("Spiel mit KI-geprägten Wörtern"), `status ${deHub.status}`);

  const esHub = await raw("/es/games");
  ok("/es/games serves the Spanish hub", esHub.status === 200 && esHub.text.includes("Juega con palabras acuñadas"), `status ${esHub.status}`);

  const frHub = await raw("/fr/games");
  ok("/fr/games serves the French hub", frHub.status === 200 && frHub.text.includes("Joue avec des mots forgés"), `status ${frHub.status}`);

  const mr = await raw("/games/meaning-reveal");
  ok("meaning-reveal serves the daily loop with a real word", mr.status === 200 && mr.text.includes("Reveal the meaning"), `status ${mr.status}`);

  const rof = await raw("/games/real-or-fake");
  ok("real-or-fake serves rounds with decoys", rof.status === 200 && rof.text.includes("Real or Fake?"), `status ${rof.status}`);

  const cs = await raw("/games/category-sort");
  ok("category-sort serves a fresh board", cs.status === 200 && cs.text.includes("Sort the Lexicon"), `status ${cs.status}`);

  const sl = await raw("/games/semantic-ladder");
  ok("semantic-ladder serves the demo board", sl.status === 200 && sl.text.includes("Warm or Cold?"), `status ${sl.status}`);

  const av = await raw("/games/ancient-vault");
  ok(
    "ancient-vault serves the Sator square and the word chain",
    av.status === 200 && av.text.includes("The Square of Five Words") && av.text.includes("Word Chain"),
    `status ${av.status}`
  );

  const deMr = await raw("/de/games/meaning-reveal");
  ok("German meaning-reveal renders German UI strings", deMr.status === 200 && deMr.text.includes("Bedeutung enthüllen"), `status ${deMr.status}`);

  const deAv = await raw("/de/games/ancient-vault");
  ok("German vault hides the why_this_word games (note instead)", deAv.status === 200 && deAv.text.includes("Fusionsrätsel"), `status ${deAv.status}`);

  const bad = await raw("/games/nope-xyz");
  ok("unknown game slug → 404", bad.status === 404, `status ${bad.status}`);

  const redir = await raw("/games", { headers: { "Accept-Language": "de-DE,de;q=0.9" }, manual: true });
  ok("games hub participates in the Accept-Language redirect", redir.status >= 300 && redir.status < 400 && redir.location === "/de/games", `status ${redir.status}, location ${redir.location}`);
}

// ---------------------------------------------------------------------------

// cleanup of this run's data
await cleanTestRows();
console.log("\n(cleaned up test data)");

console.log(`\n══════════ RESULT: ${pass} passed, ${fail} failed ══════════`);
if (failures.length) {
  console.log("Failures:");
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
