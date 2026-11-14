// Shared chrome for the game pages — client-safe presentational pieces.
import type { ReactNode } from "react";

/** One rules list (the "How to play" card every game page opens with). */
export function RulesCard({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">{heading}</h3>
      <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </div>
  );
}

export function GameFooter({ note }: { note: string }) {
  return <footer className="mt-10 text-center text-xs text-muted-foreground">{note}</footer>;
}

/** A data-sourced line under the word (e.g. the coining reason). */
export function WhyBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-r-xl border-l-4 border-accent bg-accent-soft px-4 py-3 text-left text-sm text-muted-foreground">
      <b className="text-accent">{label}</b> {children}
    </div>
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
