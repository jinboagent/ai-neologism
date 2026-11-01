import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminConfigured, ADMIN_COOKIE, checkCredentials, createToken, isAdmin } from "@/lib/admin";
import { rateLimit, voterFingerprint } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Session check for the admin page. */
export async function GET() {
  return NextResponse.json({ admin: await isAdmin(), configured: adminConfigured() });
}

/** Log in with ADMIN_USERNAME / ADMIN_PASSWORD (.env.local); sets a signed session cookie. */
export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_NOT_CONFIGURED", message: "Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.local first." },
      { status: 503 }
    );
  }
  if (!rateLimit(`adminlogin:${voterFingerprint(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many attempts; wait a few minutes." }, { status: 429 });
  }

  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  if (!checkCredentials(body.username ?? "", body.password ?? "")) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS", message: "Wrong username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ admin: true });
  res.cookies.set(ADMIN_COOKIE, createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

/** Log out. */
export async function DELETE() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  return NextResponse.json({ admin: false });
}
