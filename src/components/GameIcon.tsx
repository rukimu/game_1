// Cycle 35-a: abstract icon component. Resolves slug → IconSource via
// the registry, then renders the right backend (svg now, pixel later).
// Consumers stay backend-agnostic; swapping a slug to pixel art is a
// one-line registry change.

import { iconFor } from "@/lib/icons";

type Props = {
  slug: string;
  size?: number;
  className?: string;
  alt?: string;
  title?: string;
};

export default function GameIcon({ slug, size = 16, className, alt = "", title }: Props) {
  const src = iconFor(slug);
  if (!src) return null;
  // The "game-icon" class lets the text-only toggle (IconsToggle.tsx)
  // hide every icon at once via globals.css `.no-icons .game-icon`.
  const cls = `game-icon ${className ?? ""}`.trim();
  if (src.kind === "svg") {
    return (
      <img
        src={src.src}
        width={size}
        height={size}
        alt={alt}
        title={title}
        className={cls}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }
  // Phase 2 placeholder — until real pixel art lands, render a neutral
  // square so missing assets are visible during dev rather than silent.
  return (
    <span
      className={cls}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: "#3a3548",
        verticalAlign: "middle",
      }}
      aria-label={alt}
      title={title ?? `pixel:${src.gridId}`}
    />
  );
}
