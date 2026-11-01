import { NextResponse } from "next/server";
import { qGet, qRun, withTx } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { deleteWordCascade } from "@/lib/words";

export const dynamic = "force-dynamic";

/**
 * Manage a single word: unpublish (takedown — hidden from the public, history
 * kept, can be republished) or delete (permanent removal, children cleaned up,
 * dangling related-word links on other entries repaired).
 */

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  const row = await qGet<{ id: number; slug: string }>("SELECT id, slug FROM words WHERE id = ?", [numId]);
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await withTx(async (tx) => {
    await deleteWordCascade(tx, row.id, row.slug);
  });

  return NextResponse.json({ deleted: row.id, slug: row.slug });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  let body: { status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const row = await qGet<{ id: number; status: string }>("SELECT id, status FROM words WHERE id = ?", [numId]);
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // Allowed transitions: published ⇄ draft. The review queue has its own flow.
  if (body.status === "draft") {
    if (row.status !== "published") {
      return NextResponse.json({ error: "INVALID_TRANSITION", message: "Only published words can be unpublished." }, { status: 400 });
    }
    await qRun("UPDATE words SET status = 'draft', updated_at = datetime('now') WHERE id = ?", [row.id]);
    return NextResponse.json({ id: row.id, status: "draft" });
  }
  if (body.status === "published") {
    if (row.status !== "draft") {
      return NextResponse.json({ error: "INVALID_TRANSITION", message: "Only drafts can be republished." }, { status: 400 });
    }
    await qRun(
      "UPDATE words SET status = 'published', published_at = COALESCE(published_at, datetime('now')), updated_at = datetime('now') WHERE id = ?",
      [row.id]
    );
    return NextResponse.json({ id: row.id, status: "published" });
  }
  return NextResponse.json({ error: "INVALID_STATUS", message: "status must be 'draft' or 'published'." }, { status: 400 });
}
