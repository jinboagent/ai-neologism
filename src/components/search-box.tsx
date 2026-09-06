"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconSearch } from "./icons";

export function SearchBox({ compact = false, initial = "" }: { compact?: boolean; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search words and phenomena
      </label>
      <div className="flex items-center rounded-lg border border-border bg-card focus-within:border-primary transition-colors">
        <IconSearch className="ml-3 h-4 w-4 text-muted-foreground shrink-0" />
        <input
          id="site-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={compact ? "Search…" : 'Describe the phenomenon — e.g. "companies pretending to be ethical"'}
          className={`w-full bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground/70 outline-none ${compact ? "text-sm" : "text-base"}`}
        />
        <button
          type="submit"
          className="m-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-deep transition-colors cursor-pointer"
        >
          Search
        </button>
      </div>
    </form>
  );
}
