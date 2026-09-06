import Link from "next/link";
import { Badge } from "./badge";
import type { Word } from "@/lib/words";

export function WordCard({ word }: { word: Word }) {
  return (
    <Link
      href={`/words/${word.slug}`}
      className="block rounded-xl border border-border bg-card p-4 hover:border-primary hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="word-title text-lg font-bold text-primary">{word.word}</h3>
        <Badge kind={word.badge} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{word.definition}</p>
      <p className="mt-2 text-xs text-muted-foreground/80">
        {word.use_votes} would use · {word.work_votes} needs work
        {word.published_at ? ` · ${word.published_at.slice(0, 10)}` : ""}
      </p>
    </Link>
  );
}
