// Single-admin authentication: credentials come from ADMIN_USERNAME / ADMIN_PASSWORD
// env vars (gitignored; in production, the hosting platform's dashboard). Sessions are
// HMAC-signed HttpOnly cookies — no accounts table, and changing the password
// invalidates every existing session.

import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
const SESSION_DAYS = 7;

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_USERNAME && !!process.env.ADMIN_PASSWORD;
}

function sign(exp: number): string {
  return crypto.createHmac("sha256", process.env.ADMIN_PASSWORD ?? "").update(`admin:${exp}`).digest("hex");
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
  const a = Buffer.from(username);
  const b = Buffer.from(u);
  const c = Buffer.from(password);
  const d = Buffer.from(p);
  const userOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  const passOk = c.length === d.length && crypto.timingSafeEqual(c, d);
  return userOk && passOk;
}

/** Whether the current request carries a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  try {
    const jar = await cookies();
    return verifyToken(jar.get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}
