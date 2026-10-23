import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hordeIntensity, layerGains } from "../src/audio/music";
import { BUSES, SOUND_IDS } from "../src/audio/theme-audio";
import { Menu, cycle, stepVolume } from "../src/app/menu";
import { ROOT } from "./survival/scan";

/**
 * The "Vành Chân Trời" theme (docs/changelog/2026-10-23-theme.md): one theme
 * file holds every colour and font of the DOM UI; the title font is Chakra
 * Petch and Space's Exo 2 is gone; every sound id has its entry in
 * docs/audio/THEME_SOUND_LIST.md; the menus move over enabled items; the
 * music's layers follow the horde.
 */
const text = (path: string): string => readFileSync(join(ROOT, path), "utf8");
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("Tuyến Cuối theme", () => {
  const theme = stripComments(text("src/view/theme.css"));
  const hud = stripComments(text("src/view/survival.css"));
  const defined = new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]!));

  it("the HUD and screens use no literal colour: every colour comes from theme.css", () => {
    const literals = [...hud.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((match) => match[0]);
    expect(literals).toEqual([]);
  });

  it("every variable the HUD reads is defined in theme.css (or set at run time: --ui, --fill, --fit)", () => {
    const runtime = new Set(["--ui", "--fill", "--fit"]);
    const used = [...new Set([...hud.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]!))];
    expect(used.filter((name) => !defined.has(name) && !runtime.has(name))).toEqual([]);
    for (const token of ["--steel-900", "--hot", "--volt", "--danger", "--typing", "--hazard", "--rivet", "--led", "--panel"]) expect(defined.has(token)).toBe(true);
  });

  it("titles are Chakra Petch, the fight's words Be Vietnam Pro; Space's Exo 2 is gone", () => {
    expect(theme).toMatch(/--font-title:\s*"Chakra Petch"/);
    expect(theme).toMatch(/--font-battle:\s*"Be Vietnam Pro"/);
    const main = text("src/app/main.ts");
    expect(main).toContain('import "@fontsource/chakra-petch/700.css";');
    expect(main).toContain('import "../view/theme.css";');
    expect(main.indexOf("theme.css")).toBeLessThan(main.indexOf("survival.css"));
    expect(text("package.json")).not.toContain("exo-2");
    expect(hud).not.toMatch(/Exo 2/);
  });

  it("the player sees the game's name, never Space's mode", () => {
    const visible = [text("index.html"), text("src/view/screens.ts"), text("src/view/hud.ts")].join("\n");
    expect(visible).toContain("TUYẾN CUỐI");
    expect(visible).not.toMatch(/SINH TỒN|Sinh Tồn/);
  });

  it("every sound id has its entry in docs/audio/THEME_SOUND_LIST.md, with a prompt", () => {
    const list = text("docs/audio/THEME_SOUND_LIST.md");
    expect(new Set(SOUND_IDS).size).toBe(SOUND_IDS.length);
    for (const id of SOUND_IDS) {
      expect(list).toContain("| `" + id + "` |");
      expect(list).toMatch(new RegExp("- `" + id.replace(/\./g, "\\.") + "` — \\*Prompt:\\* \""));
    }
  });

  it("pronunciation ducks guns and impacts by 6 dB and the music by 4 dB", () => {
    const db = (gain: number) => Math.round(20 * Math.log10(gain) * 10) / 10;
    expect(db(BUSES.guns.duck)).toBe(-6);
    expect(db(BUSES.impacts.duck)).toBe(-6);
    expect(db(BUSES.music.duck)).toBe(-4);
  });

  it("the music's layers come in with the horde: drums, then bass, then rivets; the pad gives way", () => {
    expect(layerGains(0)).toEqual({ calm: 1, drums: 0, bass: 0, rivets: 0 });
    const full = layerGains(1);
    expect(full.calm).toBeCloseTo(0.45, 6);
    expect([full.drums, full.bass, full.rivets]).toEqual([1, 1, 1]);
    let last = layerGains(0);
    for (let x = 0.05; x <= 1.0001; x += 0.05) {
      const now = layerGains(x);
      expect(now.drums).toBeGreaterThanOrEqual(last.drums);
      expect(now.bass).toBeLessThanOrEqual(now.drums);
      expect(now.rivets).toBeLessThanOrEqual(now.bass);
      expect(now.calm).toBeLessThanOrEqual(last.calm);
      last = now;
    }
    expect(hordeIntensity(10, false)).toBe(0);
    expect(hordeIntensity(120, false)).toBe(1);
    expect(hordeIntensity(40, true)).toBe(0.75);
  });

  it("menus move over enabled items, wrapping; volumes step by 10 %; options cycle", () => {
    const menu = new Menu([
      { id: "start", label: "Bắt đầu", enabled: true },
      { id: "continue", label: "Chơi tiếp", enabled: false },
      { id: "settings", label: "Cài đặt", enabled: true },
      { id: "armory", label: "Kho súng", enabled: true },
    ]);
    expect(menu.current?.id).toBe("start");
    menu.move(1);
    expect(menu.current?.id).toBe("settings");
    menu.move(-1);
    expect(menu.current?.id).toBe("start");
    menu.move(-1);
    expect(menu.current?.id).toBe("armory");
    expect(menu.select("continue")).toBe(false);
    expect(menu.select("settings")).toBe(true);
    expect(new Menu(menu.items, 1).current?.id).toBe("settings");
    expect(stepVolume(0.7, 1)).toBe(0.8);
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0.04, -1)).toBe(0);
    expect(stepVolume(Number.NaN, 1)).toBe(0.1);
    expect(cycle(["low", "medium", "high", "ultra"], "ultra", 1)).toBe("low");
    expect(cycle(["low", "medium", "high", "ultra"], "low", -1)).toBe("ultra");
  });
});
