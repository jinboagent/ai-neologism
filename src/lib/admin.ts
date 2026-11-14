// Single-admin authentication: credentials come from ADMIN_USERNAME / ADMIN_PASSWORD
// env vars (gitignored; in production, the hosting platform's dashboard). Sessions are
// HMAC-signed HttpOnly cookies — no accounts table, and changing the password
// invalidates every existing session.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { safeEqual } from "./secure";

export const ADMIN_COOKIE = "admin_session";
const SESSION_DAYS = 7;

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_USERNAME && !!process.env.ADMIN_PASSWORD;
}

// Dedicated session-signing key when provided (rotate it independently of the
// password); falls back to ADMIN_PASSWORD. Either way the key is never "" —
// sign() refuses to mint tokens without secret material, and isAdmin() fails
// closed when the admin is not configured (security report F2: an unset
// password made the HMAC key "" and every forgeable token valid).
function sessionKey(): string {
  return process.env.ADMIN_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

function sign(exp: number): string {
  const key = sessionKey();
  if (!key) throw new Error("admin session key not configured");
  return crypto.createHmac("sha256", key).update(`admin:${exp}`).digest("hex");
}

export function createToken(): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  const expected = sign(exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  // Compare fixed-length digests with a constant-time comparison. Buffer.equals
  // short-circuits on the first differing byte, which leaks position via timing;
  // timingSafeEqual (via safeEqual) does not. Digest first so inputs are always
  // the same length and the candidate's length is not observable through early
  // exits.
  const h = (s: string) => crypto.createHash("sha256").update(s).digest();
  const userOk = safeEqual(h(username).toString("hex"), h(u).toString("hex"));
  const passOk = safeEqual(h(password).toString("hex"), h(p).toString("hex"));
  return userOk && passOk;
}

/** Whether the current request carries a valid admin session cookie.
 * Fails closed: without configured credentials there are no valid sessions at
 * all, so an empty-key HMAC can never pass (security report F2). */
export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  try {
    const jar = await cookies();
    return verifyToken(jar.get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}
