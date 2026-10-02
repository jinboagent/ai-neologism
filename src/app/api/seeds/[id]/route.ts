import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { resolveKeyHash } from "@/lib/keys";

export const dynamic = "force-dynamic";

type SeedRow = { id: number; contributor_key_hash: string };

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return NextResponse.json({ error: "NO_KEY" }, { status: 401 });

  const seed = getDb()
    .prepare("SELECT id, contributor_key_hash FROM seeds WHERE id = ?")
    .get(Number(id)) as SeedRow | undefined;
  if (!seed) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (seed.contributor_key_hash !== keyHash) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  getDb().prepare("DELETE FROM seeds WHERE id = ?").run(seed.id);
  return NextResponse.json({ deleted: seed.id });
}

/** Mark a seed coined (with the produced word slug) or move it back to pending. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keyHash = await resolveKeyHash(req);
  if (!keyHash) return NextResponse.json({ error: "NO_KEY" }, { status: 401 });

  const seed = getDb()
    .prepare("SELECT id, contributor_key_hash FROM seeds WHERE id = ?")
    .get(Number(id)) as SeedRow | undefined;
  if (!seed) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (seed.contributor_key_hash !== keyHash) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: { status?: string; slug?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  if (body.status !== "coined" && body.status !== "pending") {
    return NextResponse.json({ error: "INVALID_STATUS", message: "status must be 'coined' or 'pending'." }, { status: 400 });
  }
  const slug = body.status === "coined" ? (body.slug ?? null) : null;
  getDb()
    .prepare("UPDATE seeds SET status = ?, slug = ?, updated_at = datetime('now') WHERE id = ?")
    .run(body.status, slug, seed.id);
  return NextResponse.json({ id: seed.id, status: body.status, slug });
}
