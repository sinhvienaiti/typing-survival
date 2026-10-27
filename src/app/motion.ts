// Source: games/space-typing/src/ui/motion-preference.ts (trimmed: no matchMedia override; own key; the settings row is main.ts's)
import { safeLocalStorage } from "../kit/platform";

/**
 * Motion preference: "full" (default), "system" or "reduced", kept under
 * survival.motion. The game decides reduced motion itself (Windows'
 * "Animation effects" switch is often off for speed, not comfort), so the
 * camera shake and the CSS follow this, not the bare media query: the
 * stylesheet's reduced rules hang on :root[data-motion="reduced"].
 */
export type MotionPreference = "full" | "system" | "reduced";

export const MOTION_KEY = "survival.motion";

const stored = safeLocalStorage.getItem(MOTION_KEY);
let preference: MotionPreference = stored === "system" || stored === "reduced" ? stored : "full";

export const motionPreference = (): MotionPreference => preference;

/** The settings row ("Giảm chuyển động"): stores the choice and the stylesheet follows at once. */
export function setMotion(next: MotionPreference): void {
  preference = next;
  safeLocalStorage.setItem(MOTION_KEY, next);
  if (typeof document !== "undefined") document.documentElement.dataset.motion = motionReduced() ? "reduced" : "full";
}

export function motionReduced(): boolean {
  if (preference === "reduced") return true;
  if (preference === "full") return false;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

if (typeof document !== "undefined") document.documentElement.dataset.motion = motionReduced() ? "reduced" : "full";
