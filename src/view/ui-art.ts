import table from "./ui-art.json";
import type { GunKey, CounterRow } from "../content/guns";
import { KIND } from "../content/foes";

/** CSS boxes at 1280 × 720; the CSS parity test guards these dimensions. */
export const BOX = {
  armory: { width: 64, height: 64 }, menu: { width: 96, height: 54 },
  briefing: { width: 760, height: 120 }, foe: { width: 40, height: 40 },
  teach: { width: 32, height: 32 }, loadout: { width: 72, height: 72 },
  // Foe icons inside the loadout's Strong / Weak lines and the threat strip: 24 px at least (UI pass 2, 31/10: 16 px read as smudges).
  counter: { width: 24, height: 24 }, threat: { width: 24, height: 24 },
  intro: { width: 384, height: 216 }, introGun: { width: 48, height: 48 },
  // A bay's gun sits on a small tab plate on the bay's top edge (padding inside the box).
  fresh: { width: 48, height: 48 }, bay: { width: 44, height: 44 },
  bg: { width: 1280, height: 720 },
  // Icons and parts (tickets 149–153). UI pass 2 (31/10): rows and items 28–32 px at 720p, each icon's painting trimmed to 85 % of its box at prepare time (selection.json `fill`).
  small: { width: 20, height: 20 }, icon: { width: 28, height: 28 },
  item: { width: 32, height: 32 }, lock: { width: 40, height: 40 },
  // A banner's icon beside its 34 px capitals; a results star is the card's hero (64 px).
  banner: { width: 40, height: 40 }, star: { width: 64, height: 64 },
  chapter: { width: 40, height: 40 }, led: { width: 12, height: 12 },
  arrow: { width: 16, height: 16 },
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
type Role = { kind: string; alt: string; rev: string; widths: number[]; aspect: number; slice?: number[] };
const roles: Record<string, Role> = table.roles as Record<string, Role>;
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
 * Art that survival.css draws as backgrounds (key caps, magazine cells, the
 * Options meter's lamps, the quick Settings rows' icons) and as nine-slice
 * borders (the ticket 127 frames), as CSS variables for the page's root. A
 * role without art sets nothing; survival.css then draws its plain fallback
 * (each var() carries one: a flat key cap, flat magazine cells; a frame's
 * rules apply only while its token is in the root's data-art). The boxes
 * are the square canvas each part is drawn at: a key cap fills 70 % × 32 %
 * of its canvas (16 px tall → a 50 px canvas), a magazine cell 25 % × 72 %
 * (a 40 px canvas → 10 × 29 px, UI pass 2).
 */
const BACKGROUNDS = [
  ["--art-keycap", "part-keycap", 50], ["--art-keycap-on", "part-keycap-active", 50],
  ["--art-mag-empty", "part-mag-empty", 40], ["--art-mag-full", "part-mag-full", 40],
  ["--art-led-on", "part-led-on", 12], ["--art-led-off", "part-led-off", 12],
  ["--art-icon-quality", "icon-quality", 28], ["--art-icon-shake", "icon-shake", 28], ["--art-icon-reduced-motion", "icon-reduced-motion", 28], ["--art-icon-read-aloud", "icon-read-aloud", 28],
] as const;
/** The nine-slice frames (ticket 127): every one drawn from its 896 px copy (sharp at 2× on the 1080p scale for the largest panel). */
export const FRAMES = ["frame-panel", "frame-card", "frame-word", "frame-plate", "frame-button", "frame-button-active", "frame-banner"] as const;
export function artVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, role, box] of BACKGROUNDS) {
    const url = artUrl(role, box);
    if (url) vars[name] = 'url("' + url + '")';
  }
  for (const role of FRAMES) {
    const url = roles[role]?.slice ? artUrl(role, 300) : null;
    if (url) vars["--art-" + role] = 'url("' + url + '")';
  }
  return vars;
}
/** Each frame's slice lines (percentages of its image, top right bottom left, and `fill`: the frame's glass is the box's background), keyed by its slice variable. */
export function frameSlices(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const role of FRAMES) {
    const slice = roles[role]?.slice;
    if (slice) out["--art-" + role + "-slice"] = slice.map((n) => n + "%").join(" ") + " fill";
  }
  return out;
}
type ArtRoot = { style: { setProperty(name: string, value: string): void; removeProperty(name: string): unknown }; setAttribute?(name: string, value: string): void };
/**
 * Sets artVars() and frameSlices() on `root` (the page's <html>), lists the
 * frames in its data-art, and loads each image once: a CSS background fires
 * no error, so an image that fails warns here as an <img> does, and its
 * variable (and frame token) is removed, which brings back survival.css's
 * plain fallback instead of an empty cell, a bare key or a missing border.
 */
export function applyArtVars(root: ArtRoot): void {
  for (const [name, value] of Object.entries(frameSlices())) root.style.setProperty(name, value);
  const vars = artVars();
  const tokens = new Set<string>(FRAMES.filter((role) => vars["--art-" + role] !== undefined));
  const mark = (): void => root.setAttribute?.("data-art", [...tokens].join(" "));
  mark();
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
    if (typeof Image === "undefined") continue;
    const url = value.slice(5, -2);
    const probe = new Image();
    probe.addEventListener("error", () => {
      root.style.removeProperty(name);
      if (tokens.delete(name.slice(6))) mark();
      if (!failed.has(url)) { failed.add(url); console.warn("[ui-art] missing image: " + url); }
    });
    probe.src = url;
  }
}
/** The quick panels' icons (ticket 180): the corner gear and speakers at 32 px, the Sound rows' at 24 (× 1.5 at 1080p, sharp at 2×). */
export function quickIcons(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ["hud-settings", "hud-sound", "hud-sound-muted", "vol-master", "vol-music", "vol-effects", "vol-keyboard", "vol-voice", "vol-interface"]) {
    const url = artUrl(name, name.startsWith("hud-") ? 32 : 24);
    if (url) out[name] = url;
  }
  return out;
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
