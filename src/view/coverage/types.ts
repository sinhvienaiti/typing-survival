/**
 * The coverage table's shape (docs/ALIVE_PLAN.md AL-00, §2, §2.16): every
 * sim event the screen shows, every screen and every UI event, each with its
 * VFX ids and SFX ids, the package that owns its reaction and the §2 rows it
 * answers. Each package keeps its rows in its own file (al<nn>.ts) and edits
 * no other; index.ts gathers them; tests/coverage.test.ts fails on a missing
 * cell. Nothing here runs in the game.
 */

export const PACKAGES = ["AL-01", "AL-02", "AL-03", "AL-04", "AL-05", "AL-06", "AL-07", "AL-08", "AL-09", "AL-10", "AL-11", "AL-12", "AL-13", "AL-14", "AL-15", "AL-16", "AL-17"] as const;
export type Package = (typeof PACKAGES)[number];

/**
 * How the look stands today (§2 column VFX): "c" whole, "y" weak, "k" none
 * (debt until the package's effect passes). `art`: the row's art today when
 * it is drawn in code ("code") or missing ("none"), as debt (G6).
 */
export type Look = "c" | "y" | "k";

/** "—": no sound by design (§2 SFX "—"); every other entry is a sound id (docs/audio/THEME_SOUND_LIST.md). */
export const NO_SOUND = "—";

export type CoverageRow = {
  /** "ev.<EV name>", "typing.<TypingFxKind>", "screen.<Screen>", "ui.<event>". */
  readonly key: string;
  readonly owner: Package;
  /** The rows of ALIVE_PLAN.md §2 it answers (M001 …). */
  readonly rows: readonly string[];
  /** VFX ids: "fx.<area>.<what>" (the package's effect; VFX_STANDARD's five phases where it is combat). */
  readonly vfx: readonly string[];
  /** SFX ids, played through audio.cue(id) or the theme's existing calls; [NO_SOUND] when none is meant. */
  readonly sfx: readonly string[];
  readonly look: Look;
  readonly art?: "code" | "none";
};

export function row(owner: Package, key: string, rows: readonly string[], vfx: readonly string[], sfx: readonly string[], look: Look, art?: "code" | "none"): CoverageRow {
  return art === undefined ? { key, owner, rows, vfx, sfx, look } : { key, owner, rows, vfx, sfx, look, art };
}

/** A debt line: a sound made in code ("sfx-code") or silent ("sfx-none"), no look ("vfx-none"), art drawn in code or missing ("art-code", "art-none"). */
export type Debt = { readonly key: string; readonly kind: "sfx-code" | "sfx-none" | "vfx-none" | "art-code" | "art-none"; readonly id: string; readonly owner: Package };
