"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { detectLocale } from "@/lib/i18n/core";

/**
 * The root layout owns <html lang="en"> (EN owns the root); localized pages
 * correct it after hydration. Server-rendered hreflang links carry the SEO
 * weight — this keeps the a11y/UA signal honest for localized visitors.
 */
export function HtmlLangSync() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = detectLocale(pathname ?? "/");
  }, [pathname]);
  return null;
}
