/**
 * Small DOM helpers the HUD's parts share (hud.ts, hud-panels.ts,
 * hud-banners.ts, hud-bays.ts; split by ALIVE_PLAN AL-00).
 */
import { artAttrs, type ArtPlace } from "./ui-art";

export function appendArt(parent: HTMLElement, attrs: ReturnType<typeof artAttrs>): void {
  if (!attrs) return;
  const img = document.createElement("img");
  for (const [key, value] of Object.entries(attrs)) img.setAttribute(key, String(value));
  parent.append(img);
}

/** `parent`'s content becomes an icon (if it has art) and `text`. */
export function iconText(parent: HTMLElement, role: string, place: ArtPlace, text: string): void {
  parent.replaceChildren();
  appendArt(parent, artAttrs(role, place));
  parent.append(text);
}

/** Sets `node`'s text when it changed (most frames change nothing). */
export const text = (node: HTMLElement, value: string): void => {
  if (node.textContent !== value) node.textContent = value;
};

/** Restarts a class's CSS animation on `node`. */
export const replay = (node: HTMLElement, name: string): void => {
  node.classList.remove(name);
  void node.offsetWidth;
  node.classList.add(name);
};

export function el<T extends HTMLElement>(tag: string, className: string, parent: HTMLElement, text = ""): T {
  const node = document.createElement(tag) as T;
  node.className = className;
  if (text !== "") node.textContent = text;
  parent.append(node);
  return node;
}
