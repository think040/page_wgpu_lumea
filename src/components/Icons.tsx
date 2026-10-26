import type { ServiceIcon } from "@/lib/content/types";

const common = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS: Record<ServiceIcon, React.ReactNode> = {
  pendant: (
    <>
      <path d="M12 2v6" />
      <path d="M6 14a6 6 0 0 1 12 0z" />
      <path d="M10.5 17.5a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  spot: (
    <>
      <path d="M8 3h8l-2 7h-4z" />
      <path d="M10 10l-4 11M14 10l4 11" opacity=".5" />
    </>
  ),
  line: (
    <>
      <path d="M3 9h18" />
      <path d="M5 9v2M19 9v2" />
      <path d="M4 13l-1 6M12 13v6M20 13l1 6" opacity=".5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  scene: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h3M8 12h8M8 16h5" />
      <circle cx="15" cy="8" r="1.2" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.5 5.5a4 4 0 0 0-5 5L3 17l4 4 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-3-3z" />
    </>
  ),
};

export function ServiceGlyph({ name }: { name: ServiceIcon }) {
  return (
    <svg {...common} aria-hidden="true">
      {PATHS[name] ?? PATHS.pendant}
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg {...common} width={18} height={18} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
