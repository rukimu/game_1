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
  // ---------- Weapons (11 classes) ----------
  "weapon:sword": { kind: "svg", src: "/icons/sword.svg" },
  "weapon:greatsword": { kind: "svg", src: "/icons/greatsword.svg" },
  "weapon:spear": { kind: "svg", src: "/icons/spear.svg" },
  "weapon:dagger": { kind: "svg", src: "/icons/dagger.svg" },
  "weapon:bow": { kind: "svg", src: "/icons/bow.svg" },
  "weapon:staff": { kind: "svg", src: "/icons/staff.svg" },
  "weapon:rod": { kind: "svg", src: "/icons/wand.svg" },
  "weapon:wand": { kind: "svg", src: "/icons/wand.svg" },
  "weapon:drum": { kind: "svg", src: "/icons/drum.svg" },
  "weapon:flute": { kind: "svg", src: "/icons/flute.svg" },
  "weapon:hammer": { kind: "svg", src: "/icons/hammer.svg" },
  "weapon:flail": { kind: "svg", src: "/icons/flail.svg" },

  // ---------- Armor / accessories (7 slots) ----------
  "armor:helmet": { kind: "svg", src: "/icons/helmet.svg" },
  "armor:chest": { kind: "svg", src: "/icons/chest.svg" },
  "armor:arms": { kind: "svg", src: "/icons/arms.svg" },
  "armor:legs": { kind: "svg", src: "/icons/legs.svg" },
  "armor:boots": { kind: "svg", src: "/icons/boots.svg" },
  "armor:shield": { kind: "svg", src: "/icons/shield.svg" },
  "accessory:ring": { kind: "svg", src: "/icons/ring.svg" },
  "accessory:amulet": { kind: "svg", src: "/icons/amulet.svg" },

  // ---------- Job archetypes (9) ----------
  "job:warrior": { kind: "svg", src: "/icons/sword.svg" },
  "job:mage": { kind: "svg", src: "/icons/wand.svg" },
  "job:rogue": { kind: "svg", src: "/icons/mask.svg" },
  "job:cleric": { kind: "svg", src: "/icons/cross.svg" },
  "job:craft": { kind: "svg", src: "/icons/anvil.svg" },
  "job:support": { kind: "svg", src: "/icons/music.svg" },
  "job:heretic": { kind: "svg", src: "/icons/book-dark.svg" },
  "job:rare": { kind: "svg", src: "/icons/star.svg" },
  "job:cursed": { kind: "svg", src: "/icons/curse-flame.svg" },

  // ---------- Creature types (5) ----------
  "creature:humanoid": { kind: "svg", src: "/icons/humanoid.svg" },
  "creature:beast": { kind: "svg", src: "/icons/beast.svg" },
  "creature:undead": { kind: "svg", src: "/icons/skull.svg" },
  "creature:magic": { kind: "svg", src: "/icons/magic.svg" },
  "creature:construct": { kind: "svg", src: "/icons/construct.svg" },

  // ---------- Status / boss / misc ----------
  "status:boss": { kind: "svg", src: "/icons/crown.svg" },
  "status:curse": { kind: "svg", src: "/icons/curse-flame.svg" },
  "status:legendary": { kind: "svg", src: "/icons/star.svg" },
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
