/**
 * The HUD's banners and cards over the field (split from hud.ts by
 * ALIVE_PLAN AL-00; AL-07 owns it in wave 3): the banner (a surge, a repair
 * pod, a stage's start and end, the hunt won), 2.2 s; a 2 s card when a foe
 * the stage teaches first appears.
 */
import { FOES, KIND } from "../content/foes";
import { STAGE_S0 } from "../content/stage-s0";
import { peakAt } from "../sim/plan";
import type { World } from "../sim/world";
import { appendArt, el, iconText, replay } from "./hud-dom";
import { artAttrs, foeRole } from "./ui-art";

const NEW_MS = 2000;
/** The "new" card per kind a stage teaches. */
const NEW_CARD: Readonly<Record<number, string>> = {
  [KIND.brute]: "NEW · BRUTE · HEAVY FOE · ARMOR " + FOES[KIND.brute]!.armour,
  [KIND.leader]: "NEW · PACK LEADER · ARMOR " + FOES[KIND.leader]!.armour,
  [KIND.shield]: "NEW · SHIELD GUARD · BLOCKS FRONTAL SHOTS",
  [KIND.splitter]: "NEW · SPLITTER · SPLITS INTO 3 SHARDS",
};
const TEACH_KIND: Readonly<Record<string, number>> = { brute: KIND.brute, leader: KIND.leader, shield: KIND.shield, splitter: KIND.splitter };

export class HudBanners {
  private readonly banner: HTMLElement;
  private readonly card: HTMLElement;
  private bannerUntil = 0;
  private cardUntil = 0;
  private peak = 0;
  private readonly met = new Set<number>();
  private readonly teach: Set<number>;

  constructor(root: HTMLElement, w: World) {
    this.banner = el("div", "sv-banner", root);
    this.card = el("div", "sv-fresh", root);
    this.teach = new Set(w.stage.teach.map((thing) => TEACH_KIND[thing]).filter((kind): kind is number => kind !== undefined));
  }

  /** `icon`: a role drawn before the text (a surge, a repair pod). */
  show(text: string, now: number, icon?: string): void {
    if (icon === undefined) this.banner.textContent = text;
    else iconText(this.banner, icon, "banner", text);
    replay(this.banner, "is-on");
    this.bannerUntil = now + 2200;
  }

  /** A storm surge says so (the horde is far thicker this time); the banner goes when its time is up. */
  surge(w: World, now: number): void {
    const peak = peakAt(w);
    if (peak !== this.peak) {
      this.peak = peak;
      if (peak > 0) this.show("SURGE " + peak + (w.plan.storm[peak - 1] === 1 || w.plan.strength[peak - 1]! >= STAGE_S0.storm.spread[0] ? " · FIERCE" : ""), now, "icon-surge");
    }
    if (now > this.bannerUntil) this.banner.classList.remove("is-on");
  }

  /** A taught foe's first appearance: a small card for 2 s. */
  fresh(w: World, now: number): void {
    if (this.teach.size > 0) {
      const F = w.foes;
      for (let s = 0; s < F.top; s += 1) {
        const kind = F.kind[s]!;
        if (F.alive[s] === 1 && this.teach.has(kind) && !this.met.has(kind) && F.z[s]! < 42) {
          this.met.add(kind);
          this.card.replaceChildren();
          appendArt(this.card, artAttrs(foeRole(kind), "fresh"));
          appendArt(this.card, artAttrs("icon-new-badge", "small"));
          this.card.append(NEW_CARD[kind] ?? "");
          this.card.classList.add("is-on");
          this.cardUntil = now + NEW_MS;
        }
      }
    }
    if (now > this.cardUntil) this.card.classList.remove("is-on");
  }
}
