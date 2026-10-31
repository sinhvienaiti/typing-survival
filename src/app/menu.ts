/**
 * The keyboard menus of Tuyến Cuối (title, settings, the armory placeholder,
 * pause, results): a list of items, one selected; ↑ ↓ move over the enabled
 * ones (wrapping), ← → change a setting's value, Enter takes the item, Esc
 * goes back. No DOM here (src/view/screens.ts draws it), so it is tested in
 * Node (tests/theme.test.ts).
 */
export type MenuItem = {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
  readonly art?: string;
  /** An icon role (ui-art.ts) before the label; the menu sets its size. */
  readonly icon?: string;
  /** A stage's stars (0–3) after its label; `locked` shows the lock there instead. */
  readonly stars?: number;
  readonly locked?: boolean;
  readonly enabled: boolean;
  /** A setting's value as shown ("70 %", "Bật"); ← → change it. */
  readonly value?: string;
  /** 0 … 1: a setting drawn as an LED bar (volumes). */
  readonly level?: number;
};

export class Menu {
  index: number;

  constructor(readonly items: readonly MenuItem[], start = 0) {
    this.index = 0;
    this.index = this.nearest(Math.max(0, Math.min(items.length - 1, start)));
  }

  get current(): MenuItem | undefined {
    return this.items[this.index];
  }

  /** The first enabled item from `from` on (wrapping), or `from` when none is. */
  private nearest(from: number): number {
    for (let k = 0; k < this.items.length; k += 1) {
      const index = (from + k) % this.items.length;
      if (this.items[index]!.enabled) return index;
    }
    return from;
  }

  /** Moves the selection by `delta` over enabled items, wrapping; true when it moved. */
  move(delta: -1 | 1): boolean {
    const n = this.items.length;
    for (let k = 1; k <= n; k += 1) {
      const index = (((this.index + delta * k) % n) + n) % n;
      if (this.items[index]!.enabled) {
        const moved = index !== this.index;
        this.index = index;
        return moved;
      }
    }
    return false;
  }

  /** Selects the item with `id` if it is enabled; true when it is. */
  select(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0 || !this.items[index]!.enabled) return false;
    this.index = index;
    return true;
  }
}

/** A volume one step (10 %) up or down, kept in 0 … 1 and on the 10 % grid. */
export function stepVolume(value: number, delta: number): number {
  const steps = Math.round((Number.isFinite(value) ? value : 0) * 10) + Math.sign(delta);
  return Math.max(0, Math.min(10, steps)) / 10;
}

/** The next of `options` after `value` by `delta`, wrapping. */
export function cycle<T>(options: readonly T[], value: T, delta: number): T {
  const index = options.indexOf(value);
  const n = options.length;
  return options[(((index < 0 ? 0 : index) + Math.sign(delta || 1)) % n + n) % n]!;
}
