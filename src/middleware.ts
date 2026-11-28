import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, UI_LOCALES } from "@/lib/i18n/core";
import wordIndex from "./generated/word-index.json";

/**
 * One-time Accept-Language redirect (multilingual phase 2): a first-time
 * visitor whose browser prefers de/es/fr and who lands on a page that EXISTS
 * in that locale gets redirected once; the choice cookie is set so the
 * redirect never fights a manual language pick. Googlebot sends no
 * Accept-Language header, so crawlers always see the unprefixed originals.
 *
 * Cross-language word URLs (e.g. /de/words/<en-slug>, a family link pasted
 * with the wrong prefix) are redirected here too, using the build-generated
 * slug map — the word PAGE must not call redirect() because that would flip
 * it back to dynamic rendering in Next 16 (see the 2026-11 Vercel outage).
 */

// Paths that exist under /{locale} — everything else (action pages, owner
// tools, API, files) is served from the English root and must not redirect.
const LOCALIZED_PATHS: RegExp[] = [
  /^\/$/,
  /^\/index(\/|$)/,
  /^\/popularity(\/|$)/,
  /^\/about(\/|$)/,
  /^\/criteria(\/|$)/,
  /^\/games(\/|$)/,
  /^\/words\/[^/]+$/,
];

const LOCALE_PREFIX = /^\/(de|es|fr)(?=\/|$)/;
const WORD_PATH = /^\/(de|es|fr)?\/?words\/([^/]+)$/;

type WordIndex = Record<string, { lang: string; fam: Record<string, string> }>;

function crossLangRedirect(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const m = WORD_PATH.exec(pathname);
  if (!m) return null;
  const locale = m[1] ?? "en";
  const slug = m[2];
  const e = (wordIndex as WordIndex)[slug];
  if (!e) return null; // unknown slug — let the page render its own 404
  // The URL's language segment must match the word's own language; anything
  // else (a family link pasted with the wrong prefix, a stale bookmark) is
  // redirected to the word in this language, falling back to the word's own
  // language when the URL language has no published sibling.
  if (e.lang === locale) return null;
  const targetLang = e.fam[locale] ? locale : e.lang;
  const target = e.fam[targetLang];
  if (!target) return null;
  const url = req.nextUrl.clone();
  url.pathname = targetLang === "en" ? `/words/${target}` : `/${targetLang}/words/${target}`;
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const localizer = req.method === "GET" || req.method === "HEAD" ? crossLangRedirect(req) : null;
  if (localizer) return localizer;

  // Already localized (or a /en/... request) — pass through untouched.
  if (LOCALE_PREFIX.test(pathname) || /^\/en(\/|$)/.test(pathname)) {
    return NextResponse.next();
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return NextResponse.next();
  }
  // A stored choice (from the switcher or a previous redirect) wins.
  if (req.cookies.get(LOCALE_COOKIE)?.value) {
    return NextResponse.next();
  }

  const accept = req.headers.get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase().slice(0, 2) ?? "";
  if (!UI_LOCALES.includes(first as (typeof UI_LOCALES)[number])) {
    return NextResponse.next();
  }
  if (!LOCALIZED_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${first}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.redirect(url);
  res.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  return res;
}

// Static assets, API routes and any file with an extension never reach the
// logic above — but excluding them here keeps the middleware cheap.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
