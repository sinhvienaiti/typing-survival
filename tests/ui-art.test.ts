import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect, vi, afterEach } from "vitest";
import { GUN_KEYS, GUN_SPECS, COUNTER_ROWS } from "../src/content/guns";
import { KIND, FOES } from "../src/content/foes";
import { CHAPTER_1 } from "../src/content/chapter-1";
import selection from "../scripts/ui-art/selection.json";
import table from "../src/view/ui-art.json";
import { BOX, pick, artHtml, artAttrs, gunRole, foeRole, stageRole, rowRoles, bgRole, resetArtWarnings, handleArtError, watchArt } from "../src/view/ui-art";
import { screens206, plain206 } from "./ui-art-fixtures";
import golden from "./golden/ui-text-206.json";
import { WIRED } from "./ui-art-roles";

/** The screens with a background of their own (ticket 121). */
const SCREENS = ["menu","journey","briefing","loadout","results-win","results-lose"];

const accepted = selection.entries.filter(e => e.accepted);
const roles = selection.entries.map(e => e.role);
const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");
afterEach(() => { vi.restoreAllMocks(); resetArtWarnings(); });
describe("UI art 206", () => {
  it("selects precisely 92 accepted roles from 107 entries (206's 15, the Shard, 53 icons and parts with 242's Words stat, UI pass 2's 7 frames of 127 and 9 icons of 180, 121's six backgrounds and logo), with English names and pending replacements", () => {
    expect(selection.version).toBe(1); expect(selection.entries).toHaveLength(107);
    const wanted = [...GUN_KEYS.map(gunRole), ...Object.values(KIND).map(foeRole), ...CHAPTER_1.map(s=>stageRole(s.id)), ...WIRED, ...SCREENS.map(bgRole), "logo"].sort();
    expect(accepted.map(e=>e.role).sort()).toEqual(wanted);
    for(const role of new Set(roles)) expect(accepted.filter(e=>e.role===role).length).toBeLessThanOrEqual(1);
    for(const e of selection.entries) {
      // Accepted 31/10 16:30: 121's backgrounds and logo, 126's Lightbearer stage art in place of 109's.
      if(["157","109"].includes(e.ticket)) expect(e.accepted).toBe(false);
      if(["121","126"].includes(e.ticket)) { expect(e.accepted).toBe(true); expect(e.verdict).toMatch(/^CODEX_QUEUE 12[16]: Nhận 31\/10 16:30/); }
      if(e.kind==="stage") expect(e.source).toMatch(e.accepted ? /^ui\/stages-v2\// : /^ui\/stages\//);
      if(e.kind==="bg") { expect(e.crop).toBe("1536x864+0+80"); expect(e.alt).toBe(""); }
      expect(e.source??"").not.toMatch(/\.png$|\.(64|128|256)$/);
      expect(e.alt).not.toMatch(/[À-ỹ]/);
    }
    for(const g of GUN_SPECS) expect(selection.entries.filter(e=>e.role===gunRole(g.key)).every(e=>e.alt===g.name)).toBe(true);
    for(const k of Object.values(KIND)) expect(selection.entries.find(e=>e.role===foeRole(k))?.alt).toBe(FOES[k]!.name);
    for(const s of CHAPTER_1) expect(selection.entries.find(e=>e.role===stageRole(s.id))?.alt).toBe(s.name);
    // The clean alpha cut of the logo, never the failed first extraction (logo.alpha, logo.512).
    expect(selection.entries.filter(e=>e.role==="logo")).toEqual([expect.objectContaining({ kind: "logo", source: "ui/screens-epic/logo-clean", accepted: true, ticket: "121", alt: "Last Line" })]);
  });
  it("keeps the runtime table equal to accepted selection without source paths", () => {
    expect(Object.keys(table.roles).sort()).toEqual(accepted.filter(e=>e.source).map(e=>e.role).sort());
    for(const [role, data] of Object.entries(table.roles)) {
      expect(data.rev).toMatch(/^[a-f0-9]{8}$/);
      expect(data.widths).toEqual(role.startsWith("stage-")?[192,384,768,1536]:role.startsWith("bg-")?[1280,1536]:role==="logo"?[640,1280]:role==="slider-track"?[512,1024]:role.startsWith("frame-")?[448,896]:[64,128,256]);
      // A frame keeps its crop's shape (the painted part of its canvas), as its 448 px copy has it.
      const crop = /^(\d+)x(\d+)/.exec(accepted.find(e=>e.role===role)?.crop ?? "");
      const frameAspect = crop ? Math.round(448/Math.round(448*Number(crop[2])/Number(crop[1]))*1e6)/1e6 : 0;
      expect(data.aspect).toBe(role.startsWith("stage-")||role.startsWith("bg-")?1.777778:role==="logo"?Math.round(640/213*1e6)/1e6:role==="slider-track"?16:role.startsWith("frame-")?frameAspect:1);
    }
    expect(JSON.stringify(table)).not.toMatch(/art-src|\.png/);
  });
  it("maps every gun, foe, chapter, row and background to a selected role", () => {
    const all = [...GUN_KEYS.map(gunRole), ...Object.values(KIND).map(foeRole), ...CHAPTER_1.map(s=>stageRole(s.id)), ...COUNTER_ROWS.flatMap(rowRoles), ...SCREENS.map(bgRole)];
    for(const r of all) expect(roles).toContain(r);
    expect(rowRoles("armoured")).toEqual(["foe-brute","foe-pack-leader"]);
    expect(rowRoles("splitter")).toEqual(["foe-splitter","foe-shard"]);
  });
  it.each([["logo",BOX.logo.width,1280,null],["bg-menu",BOX.bg.width,1536,null],["gun-xung",40,64,128],["gun-xung",20,64,null],["gun-xung",72,128,256],["stage-c1-s1",96,192,384],["stage-c1-s1",384,768,1536],["stage-c1-s1",760,1536,null]] as const)("picks %s at %s", (r,b,one,two) => {
    const p = pick(r,b)!; expect(p.width).toBe(one); expect(p.src).toContain(`.${one}.webp?v=`);
    if(two) expect(p.srcset).toContain(`.${two}.webp?v=`); else expect(p.srcset).toBeUndefined();
  });
  it("preserves every screen's text against the pre-edit golden", () => {
    vi.spyOn(console,"warn").mockImplementation(()=>{});
    expect(Object.fromEntries(Object.entries(screens206()).map(([k,v])=>[k,plain206(v)]))).toEqual(golden);
  });
  it("places art in all screen contexts with dimensions and decoding", () => {
    vi.spyOn(console,"warn").mockImplementation(()=>{});
    const s = screens206();
    expect((s.armory!.match(/sv-art-armory/g)??[])).toHaveLength(5);
    expect((s.stages!.match(/sv-art-menu/g)??[])).toHaveLength(4);
    expect(s.briefing).toContain("sv-art-briefing");
    for(const r of ["foe-swarm","foe-scout","foe-brute"]) expect(s.briefing).toContain(r+".");
    expect(s.briefing).toMatch(/sv-art-teach[^>]+foe-brute/);
    for(const name of ["loadout1","loadout4"]) {
      expect((s[name]!.match(/sv-art-loadout/g)??[])).toHaveLength(5);
      expect(s[name]).toMatch(/sv-good[^]*sv-chip[^]*sv-art-chip[^]*foe-swarm/);
      expect(s[name]).toMatch(/sv-threats[^]*sv-art-threat/);
    }
    expect((s.intro!.match(/<img /g)??[])).toHaveLength(3);
    expect((s.trial!.match(/<img /g)??[])).toHaveLength(2);
    expect(s.trial).not.toContain("stage-s0"); expect(s.end).toContain("stage-c1-s2.");
    for(const html of Object.values(s)) for(const img of html.match(/<img\b[^>]*>/g)??[]) {
      // Decorative, except the learning rule's check, which stands for a word of its sentence, and the title's logo, its heading.
      const named = (img.includes("/icon-check.") && img.includes('alt="check"')) || (img.includes("/logo.") && img.includes('alt="Last Line"'));
      for(const attr of ["width=", "height=", 'decoding="async"', ...(named ? [] : ['alt=""', 'aria-hidden="true"'])]) expect(img).toContain(attr);
      if(named) expect(img).not.toContain("aria-hidden");
      expect(img).not.toContain("sizes=");
    }
  });
  it("leaves pending art empty and warns once per role", () => {
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    // No role is pending since 121 (31/10): a role the table lacks (the Ship row's icon) draws nothing, no stand-in.
    expect(artHtml("icon-ship","icon")).toBe(""); expect(artHtml("icon-ship","icon")).toBe("");
    expect(warn.mock.calls.filter(c=>c[0]==="[ui-art] no accepted image: icon-ship")).toHaveLength(1);
    const s=screens206();
    expect(s.title).toMatch(/^<img class="sv-art sv-art-bg sv-bg" src="[^"]*\/bg-menu\.1536\.webp/); expect(s.title).not.toMatch(/<svg/);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(rowRoles("splitter").map(r=>artHtml(r,"threat")).join("")).toContain("foe-splitter.");
    // The Shard has its portrait since 238 (31/10); a background is still pending.
    expect(rowRoles("splitter").map(r=>artHtml(r,"threat")).join("")).toContain("foe-shard.");
    for(const screen of SCREENS) expect(artHtml(bgRole(screen),"bg")).toContain("/"+bgRole(screen)+".");
    expect(artHtml("gun-xung","bay",{label:true})).toContain('alt="Pulse Gun"');
    expect(artHtml("gun-xung","bay",{label:true})).not.toContain("aria-hidden");
  });
  it("hides failed art and warns only once per URL, ignoring other images", () => {
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const img={tagName:"IMG", classList:{contains:(c:string)=>c==="sv-art"},currentSrc:"test.webp",src:"test.webp",hidden:false};
    handleArtError({target:img}); handleArtError({target:img});
    expect(img.hidden).toBe(true); expect(warn).toHaveBeenCalledExactlyOnceWith("[ui-art] missing image: test.webp");
    const other={...img,hidden:false,classList:{contains:()=>false}}; handleArtError({target:other}); expect(other.hidden).toBe(false);
    const add=vi.fn(); const target={addEventListener:add} as unknown as HTMLElement;
    watchArt(target); watchArt(target); expect(add).toHaveBeenCalledTimes(1); expect(add.mock.calls[0]![2]).toBe(true);
  });
  it("heads the title with the painted logo (ticket 121): an h1 named by its alt, outside the menu's card", () => {
    vi.spyOn(console,"warn").mockImplementation(()=>{});
    const title=screens206().title!;
    const h1=title.match(/<h1\b[^>]*>[^]*?<\/h1>/g)??[];
    expect(h1).toHaveLength(1);
    expect(h1[0]).toMatch(/^<h1 class="sv-title-logo"><img class="sv-art sv-art-logo" src="[^"]*\/logo\.1280\.webp\?v=[a-f0-9]{8}" width="600" height="200" alt="Last Line" decoding="async" draggable="false"><\/h1>$/);
    expect(title.indexOf(h1[0]!)).toBeLessThan(title.indexOf("sv-title-card"));
    expect(title).not.toContain("LAST LINE");
    // 3:1 like its art, 600 × 200 px × --ui (560–640 px at 720p), absolutely placed so it never pushes the card.
    expect(BOX.logo.width/BOX.logo.height).toBe(3);
    const css=readFileSync("src/view/survival.css","utf8");
    expect(css).toMatch(/\.sv-title-logo \{ position: absolute; top: calc\(\d+px \* var\(--ui\)\); right: calc\(\d+px \* var\(--ui\)\);/);
  });
  it("sets the name in the title font while the table has no logo", () => {
    vi.spyOn(console,"warn").mockImplementation(()=>{});
    const roles=table.roles as Record<string,unknown>, saved=roles.logo;
    delete roles.logo;
    try {
      const title=screens206().title!;
      expect(title).toContain('<h1 class="sv-title-name">LAST LINE</h1>');
      expect(title).not.toContain("sv-title-logo");
    } finally { roles.logo=saved; }
  });
  it("keeps CSS box dimensions equal to BOX without adding theme variables", () => {
    const css = readFileSync("src/view/survival.css", "utf8");
    for (const [place, box] of Object.entries(BOX)) expect(css).toContain(`.sv-art-${place} { width: calc(${box.width}px * var(--ui)); height: calc(${box.height}px * var(--ui)); }`);
  });
  it("gives DOM callers the same gun and taught foe dimensions", () => {
    for(const key of GUN_KEYS) { const a=artAttrs(gunRole(key),"bay")!; expect(a.width).toBe(BOX.bay.width); expect(a.height).toBe(44); expect(a.src).toContain(gunRole(key)+"."); }
    for(const k of [KIND.brute,KIND.leader,KIND.shield,KIND.splitter]) { const a=artAttrs(foeRole(k),"fresh")!; expect(a.width).toBe(48); expect(a.src).toContain(foeRole(k)+"."); }
  });
  it.skipIf(!existsSync("public/assets/typing-survival/ui/manifest.json"))("checks real media bytes, hashes and dimensions", async () => {
    const m=JSON.parse(readFileSync("public/assets/typing-survival/ui/manifest.json","utf8"));
    const {spawnSync}=await import("node:child_process");
    for(const role of Object.values(m.roles) as {sizes:{file:string;bytes:number;md5:string;width:number;height:number}[]}[]) for(const f of role.sizes) {
      const path="public/assets/typing-survival/ui/"+f.file, bytes=readFileSync(path);
      expect(bytes.length).toBe(f.bytes); expect(md5(bytes)).toBe(f.md5);
      expect(spawnSync("magick",["identify","-format","%w %h",path],{encoding:"utf8"}).stdout).toBe(`${f.width} ${f.height}`);
    }
  // 262 files since 121 (one magick per file): past vitest's 5 s default while the suite runs in parallel.
  }, 30000);
});
