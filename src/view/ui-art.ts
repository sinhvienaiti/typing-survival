import table from "./ui-art.json";
import type { GunKey, CounterRow } from "../content/guns";
import { KIND } from "../content/foes";

/** CSS boxes at 1280 × 720; the CSS parity test guards these dimensions. */
export const BOX = {
  armory: { width: 64, height: 64 }, menu: { width: 96, height: 54 },
  briefing: { width: 760, height: 120 }, foe: { width: 40, height: 40 },
  teach: { width: 32, height: 32 }, loadout: { width: 72, height: 72 },
  counter: { width: 20, height: 20 }, threat: { width: 16, height: 16 },
  intro: { width: 384, height: 216 }, introGun: { width: 48, height: 48 },
  fresh: { width: 48, height: 48 }, bay: { width: 40, height: 40 },
  bg: { width: 1280, height: 720 },
  // Icons and parts (tickets 149–153, sizes as UI_IMAGERY §4 measured them at 720p).
  small: { width: 16, height: 16 }, icon: { width: 20, height: 20 },
  item: { width: 24, height: 24 }, lock: { width: 24, height: 24 },
  // A results star draws its glyph 28 px tall (LL-50's measure; the art fills 70 % of its box), a menu lamp 7 px (review 31/10).
  banner: { width: 28, height: 28 }, star: { width: 40, height: 40 },
  chapter: { width: 32, height: 32 }, led: { width: 10, height: 10 },
  arrow: { width: 12, height: 12 },
} as const;
export type ArtPlace = keyof typeof BOX;
const missing = new Set<string>();
const failed = new Set<string>();
const watched = new WeakSet<EventTarget>();
const FOE_ROLE: Record<string, string> = { mine: "swarm", scout: "scout", brute: "brute", leader: "pack-leader", shield: "shield-guard", splitter: "splitter", shard: "shard" };
export const gunRole = (key: GunKey | string): string => "gun-" + key;
export function foeRole(kind: number | string): string {
  const key = typeof kind === "number" ? Object.keys(KIND).find(k => KIND[k as keyof typeof KIND] === kind) ?? "" : kind;
  return "foe-" + (FOE_ROLE[key] ?? key);
}
export const stageRole = (id: string): string => "stage-" + id;
export const bgRole = (screen: string): string => "bg-" + screen;
export function rowRoles(row: CounterRow): readonly string[] {
  return { swarmFar: ["foe-swarm"], swarmNear: ["foe-swarm"], scout: ["foe-scout"], armoured: ["foe-brute", "foe-pack-leader"], shield: ["foe-shield-guard"], splitter: ["foe-splitter", "foe-shard"] }[row];
}
type Role = { kind: string; alt: string; rev: string; widths: number[]; aspect: number };
const roles: Record<string, Role> = table.roles;
function accepted(role: string): Role | undefined {
  const data = roles[role];
  if (!data && !missing.has(role)) { missing.add(role); console.warn("[ui-art] no accepted image: " + role); }
  return data;
}
/** Density descriptors account for the UI scale without a CSS-dependent sizes attribute. */
export function pick(role: string, box: number): { src: string; srcset?: string; width: number } | null {
  const data = accepted(role);
  if (!data) return null;
  const at = (target: number): number => data.widths.find(w => w >= target) ?? data.widths[data.widths.length - 1]!;
  const one = at(box * 1.5), two = at(box * 3);
  const imageUrl = (width: number): string => table.base + role + "." + width + ".webp?v=" + data.rev;
  return { src: imageUrl(one), width: one, ...(two !== one ? { srcset: imageUrl(one) + " 1x, " + imageUrl(two) + " 2x" } : {}) };
}
/** `label`: the image names itself (alt); `alt`: a name of its own where the role's alt does not fit the sentence; `cls`: extra classes (a mirrored arrow). */
export type ArtOpts = { label?: boolean; alt?: string; cls?: string };
export function artAttrs(role: string, place: ArtPlace, opts: ArtOpts = {}): Record<string, string | number> | null {
  const image = pick(role, BOX[place].width);
  if (!image) return null;
  const box = BOX[place];
  const alt = opts.alt ?? (opts.label ? roles[role]!.alt : "");
  return { class: "sv-art sv-art-" + place + (place === "bg" ? " sv-bg" : "") + (opts.cls ? " " + opts.cls : ""), src: image.src, ...(image.srcset ? { srcset: image.srcset } : {}), width: box.width, height: box.height, alt, ...(alt !== "" ? {} : { "aria-hidden": "true" }), decoding: "async", draggable: "false" };
}
const escape = (value: string | number): string => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function artHtml(role: string, place: ArtPlace, opts: ArtOpts = {}): string {
  const attrs = artAttrs(role, place, opts);
  return attrs ? "<img " + Object.entries(attrs).map(([k,v]) => k + '="' + escape(v) + '"').join(" ") + ">" : "";
}
/** The same image as a DOM node for the HUD (null: no accepted art). */
export function artNode(role: string, place: ArtPlace, opts: ArtOpts = {}): HTMLImageElement | null {
  const attrs = artAttrs(role, place, opts);
  if (!attrs) return null;
  const img = document.createElement("img");
  for (const [key, value] of Object.entries(attrs)) img.setAttribute(key, String(value));
  return img;
}
/**
 * One URL for art drawn by CSS (a background, a border image, the quick
 * panels' skin), which takes no srcset: the width that stays sharp at 2× on
 * the 1080p scale (`box` × 1.5 × 2).
 */
export function artUrl(role: string, box: number): string | null {
  const data = accepted(role);
  if (!data) return null;
  const width = data.widths.find(w => w >= box * 3) ?? data.widths[data.widths.length - 1]!;
  return table.base + role + "." + width + ".webp?v=" + data.rev;
}
/**
 * Art that survival.css draws as backgrounds (key caps, magazine cells),
 * as CSS variables for the page's root. A role without art sets nothing;
 * survival.css then draws its plain fallback (each var() carries one: a flat
 * key cap, flat magazine cells). The boxes are the square canvas each part
 * is drawn at: a key cap fills 70 % × 32 % of its canvas (16 px tall → a
 * 50 px canvas), a magazine cell 25 % × 72 % (a 24 px canvas → 6 × 17 px).
 */
export function artVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, role, box] of [["--art-keycap", "part-keycap", 50], ["--art-keycap-on", "part-keycap-active", 50], ["--art-mag-empty", "part-mag-empty", 24], ["--art-mag-full", "part-mag-full", 24]] as const) {
    const url = artUrl(role, box);
    if (url) vars[name] = 'url("' + url + '")';
  }
  return vars;
}
/**
 * Sets artVars() on `root` (the page's <html>) and loads each image once: a
 * CSS background fires no error, so an image that fails warns here as an
 * <img> does, and its variable is removed, which brings back survival.css's
 * plain fallback instead of an empty cell or a bare key.
 */
export function applyArtVars(root: { style: { setProperty(name: string, value: string): void; removeProperty(name: string): unknown } }): void {
  for (const [name, value] of Object.entries(artVars())) {
    root.style.setProperty(name, value);
    if (typeof Image === "undefined") continue;
    const url = value.slice(5, -2);
    const probe = new Image();
    probe.addEventListener("error", () => {
      root.style.removeProperty(name);
      if (!failed.has(url)) { failed.add(url); console.warn("[ui-art] missing image: " + url); }
    });
    probe.src = url;
  }
}
export function resetArtWarnings(): void { missing.clear(); failed.clear(); }
type ErrorImage = { tagName?: string; classList?: { contains(name: string): boolean }; currentSrc?: string; src?: string; hidden: boolean };
/** Structural target permits Node tests without a DOM shim. */
export function handleArtError(event: { target: unknown }): void {
  const img = event.target as ErrorImage | null;
  if (img?.tagName !== "IMG" || !img.classList?.contains("sv-art")) return;
  const url = img.currentSrc || img.src || "";
  if (!failed.has(url)) { failed.add(url); console.warn("[ui-art] missing image: " + url); }
  img.hidden = true;
}
export function watchArt(target: EventTarget): void {
  if (watched.has(target)) return;
  watched.add(target);
  target.addEventListener("error", handleArtError, true);
}
