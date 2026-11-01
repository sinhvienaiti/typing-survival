/**
 * The game's CSS as the page loads it (ALIVE_PLAN AL-00 split survival.css
 * and theme.css by area): the files in main.ts's import order, read as one
 * text for the checks that used to read one file.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./scan";

/** Shared tokens first, then each area's (theme-<area>.css). */
export const THEME_FILES = ["theme.css", "theme-hud.css", "theme-bays.css", "theme-strip.css", "theme-screens.css", "theme-journey.css", "theme-intro.css", "theme-results.css", "theme-quick.css"] as const;
/** The base, then the areas (the cascade's order). */
export const CSS_FILES = ["survival.css", "hud.css", "bays.css", "strip.css", "screens.css", "journey.css", "intro.css", "results.css", "quick.css"] as const;

const read = (file: string): string => readFileSync(join(ROOT, "src/view", file), "utf8");
export const themeCss = (): string => THEME_FILES.map(read).join("\n");
export const survivalCss = (): string => CSS_FILES.map(read).join("\n");
/** The HUD's TypeScript (hud.ts and its parts), read as one text. */
export const hudSource = (): string => ["hud.ts", "hud-dom.ts", "hud-panels.ts", "hud-banners.ts", "hud-bays.ts"].map(read).join("\n");
