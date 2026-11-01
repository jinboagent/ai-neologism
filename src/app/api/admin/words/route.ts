import { NextResponse } from "next/server";
import { qAll } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Manage list: every word in the system, published first — the admin's inventory. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Log in at /admin." }, { status: 401 });
  }
  const words = await qAll(
    `SELECT id, slug, word, status, badge, input_type, use_votes, work_votes, published_at, created_at
     FROM words
     ORDER BY CASE status WHEN 'published' THEN 0 ELSE 1 END,
              COALESCE(published_at, created_at) DESC`
  );
  return NextResponse.json({ words });
}
