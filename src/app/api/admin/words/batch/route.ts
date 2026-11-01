import { NextResponse } from "next/server";
import { qGet, qRun, withTx } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { deleteWordCascade } from "@/lib/words";

export const dynamic = "force-dynamic";

const MAX_BATCH = 200;

/**
 * Batch inventory actions for the manage tab. delete is permanent and uses the
 * exact cascade of the single-word DELETE (children removed, dangling
 * related-word links repaired); unpublish/republish follow the same published
 * ⇄ draft transitions as PATCH and report INVALID_TRANSITION per item when the
 * word is not in the state the action requires (e.g. unpublishing a word that
 * is already a draft). Items are independent: one failure never blocks the rest.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }

  let body: { ids?: unknown; action?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const ids = (Array.isArray(body.ids) ? body.ids : [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const action = body.action;
  if (ids.length === 0 || !action || !["delete", "unpublish", "republish"].includes(action)) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "ids (non-empty array) and action ('delete' | 'unpublish' | 'republish') are required." },
      { status: 400 }
    );
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: "BATCH_TOO_LARGE", message: `At most ${MAX_BATCH} words per batch.` }, { status: 400 });
  }

  type ItemResult = { id: number; ok: boolean; slug?: string; status?: string; error?: string };
  const results: ItemResult[] = [];

  for (const id of ids) {
    const row = await qGet<{ id: number; slug: string; status: string }>("SELECT id, slug, status FROM words WHERE id = ?", [id]);
    if (!row) {
      results.push({ id, ok: false, error: "NOT_FOUND" });
      continue;
    }

    if (action === "delete") {
      await withTx(async (tx) => {
        await deleteWordCascade(tx, row.id, row.slug);
      });
      results.push({ id, ok: true, slug: row.slug, status: "deleted" });
      continue;
    }

    const want = action === "unpublish" ? "draft" : "published";
    const need = action === "unpublish" ? "published" : "draft";
    if (row.status !== need) {
      results.push({ id, ok: false, slug: row.slug, status: row.status, error: "INVALID_TRANSITION" });
      continue;
    }
    if (want === "draft") {
      await qRun("UPDATE words SET status = 'draft', updated_at = datetime('now') WHERE id = ?", [id]);
    } else {
      await qRun(
        "UPDATE words SET status = 'published', published_at = COALESCE(published_at, datetime('now')), updated_at = datetime('now') WHERE id = ?",
        [id]
      );
    }
    results.push({ id, ok: true, slug: row.slug, status: want });
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({ action, succeeded, failed: results.length - succeeded, results });
}
