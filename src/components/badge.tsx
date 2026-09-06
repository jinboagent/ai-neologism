import type { ReactNode } from "react";
import { IconAlert, IconCheck, IconStar, IconWave } from "./icons";

export type BadgeKind = "new" | "near_existing" | "unverified" | "collision" | "in_use";

const MAP: Record<BadgeKind, { label: string; cls: string; icon: (p: { className?: string }) => ReactNode }> = {
  new: {
    label: "Verified New",
    cls: "bg-good-soft text-good border-good/30",
    icon: IconCheck,
  },
  near_existing: {
    label: "Word exists · sense is new",
    cls: "bg-warn-soft text-warn border-warn/30",
    icon: IconWave,
  },
  unverified: {
    label: "Unverified",
    cls: "bg-muted text-muted-foreground border-border",
    icon: IconWave,
  },
  collision: {
    label: "Name collision",
    cls: "bg-bad-soft text-bad border-bad/30",
    icon: IconAlert,
  },
  in_use: {
    label: "Now in real use",
    cls: "bg-violet-soft text-accent border-accent/30",
    icon: IconStar,
  },
};

export function Badge({ kind, className = "" }: { kind: BadgeKind | string; className?: string }) {
  const conf = MAP[(kind as BadgeKind) in MAP ? (kind as BadgeKind) : "unverified"];
  const Icon = conf.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${conf.cls} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {conf.label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    in_review: "bg-primary-soft text-primary border-primary/30",
    published: "bg-good-soft text-good border-good/30",
    returned: "bg-warn-soft text-warn border-warn/30",
    declined: "bg-bad-soft text-bad border-bad/30",
    draft: "bg-muted text-muted-foreground border-border",
  };
  const label: Record<string, string> = {
    in_review: "In review",
    published: "Published",
    returned: "Returned with notes",
    declined: "Declined",
    draft: "Draft",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls[status] ?? cls.draft}`}>
      {label[status] ?? status}
    </span>
  );
}
