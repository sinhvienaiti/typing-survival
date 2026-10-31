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
export function artAttrs(role: string, place: ArtPlace, opts: { label?: boolean } = {}): Record<string, string | number> | null {
  const image = pick(role, BOX[place].width);
  if (!image) return null;
  const box = BOX[place];
  return { class: "sv-art sv-art-" + place + (place === "bg" ? " sv-bg" : ""), src: image.src, ...(image.srcset ? { srcset: image.srcset } : {}), width: box.width, height: box.height, alt: opts.label ? roles[role]!.alt : "", ...(opts.label ? {} : { "aria-hidden": "true" }), decoding: "async", draggable: "false" };
}
const escape = (value: string | number): string => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function artHtml(role: string, place: ArtPlace, opts: { label?: boolean } = {}): string {
  const attrs = artAttrs(role, place, opts);
  return attrs ? "<img " + Object.entries(attrs).map(([k,v]) => k + '="' + escape(v) + '"').join(" ") + ">" : "";
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
