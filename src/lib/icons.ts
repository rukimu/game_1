// Cycle 35-a: abstract icon registry. Two backends supported via the
// IconSource union — current `svg` (static file under public/icons/)
// and future `pixel` (a color-grid sprite registered by id). Switching
// any single slug from svg → pixel is a one-line change in this file
// once Cycle 35 phase 2 lands real pixel art; consumers don't move.

export type IconSource =
  | { kind: "svg"; src: string }
  | { kind: "pixel"; gridId: string };

// Phase 1 — sample slugs to prove the wiring. Phase 2 (C35-b/c) will
// fill in the full job/weapon/armor/creature catalogues.
export const ICON_REGISTRY: Record<string, IconSource> = {
  // weapons
  "weapon:sword": { kind: "svg", src: "/icons/sword.svg" },
  "weapon:wand": { kind: "svg", src: "/icons/wand.svg" },

  // armor / shield
  "armor:shield": { kind: "svg", src: "/icons/shield.svg" },

  // status / boss
  "status:boss": { kind: "svg", src: "/icons/crown.svg" },

  // creature types
  "creature:undead": { kind: "svg", src: "/icons/skull.svg" },
};

export function iconFor(slug: string): IconSource | null {
  return ICON_REGISTRY[slug] ?? null;
}

export function hasIcon(slug: string): boolean {
  return slug in ICON_REGISTRY;
}

export function listIconSlugs(): string[] {
  return Object.keys(ICON_REGISTRY);
}
