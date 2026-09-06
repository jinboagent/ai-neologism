// Minimal inline SVG icon set (Lucide-style outline, 16px stroke) — no emoji as icons.

type IconProps = { className?: string };

function base(className?: string) {
  return {
    className: className ?? "h-4 w-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z" />
    </svg>
  );
}

export function IconWave({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconThumbUp({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M7 10v12" />
      <path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.2 7a2 2 0 0 1-1.9 1.4H7V10l4.3-8a2.4 2.4 0 0 1 3.7 3.9Z" />
    </svg>
  );
}

export function IconThumbDown({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M17 14V2" />
      <path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.2-7A2 2 0 0 1 6.4 3H17v11l-4.3 8a2.4 2.4 0 0 1-3.7-3.9Z" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconExternal({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function IconSparkle({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5L15 7m-6 10-1.5 1.5m0-13L9 7m6 10 1.5 1.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconList({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
