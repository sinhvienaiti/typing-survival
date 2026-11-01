// Last Line's gun cards beside the corridor (parent docs/games/QUALITY_RESCUE_2026-11-01.md L4,
// variant A), typed for real through CDP at WPM:
//   sample   chapter stage 1 (seed 3, Pulse Gun + Scatter Gun) for SECONDS: every poll (one a key, from
//            10 s, with ≥ 5 foes on the field) the horde's centre (the median screen y of the live foes),
//            the words in the live cards (their centre) and the gap between them as a share of the
//            view's height; a picture at 60 s for the compare sheet.
//   chapter  stages 1–4 of chapter 1 (every gun), each played to its end.
// Every poll of both: each card and chip off the lane (the HUD's own wall and lane edges at the card's
// lowest row, `t.layout()`), inside a protected rectangle, off the rift chip; damage numbers over a
// protected rectangle (the kit's count). Grades: the gap's median ≤ 10 % of the height, all of these
// clear, every stage ended on the page it started on, no console error.
//   URL=… OUT_DIR=… QUERY=… SCENES=sample,chapter WPM=40 SECONDS=90 node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-layout.mjs --width=1920 --height=1080
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./common.mjs";
import { press, stats, sv } from "./survival-s0-lib.mjs";
import { openStage } from "./survival-s1-lib.mjs";
import { save } from "./survival-feel-lib.mjs";

const WPM = Number(process.env.WPM ?? 40);
const SECONDS = Number(process.env.SECONDS ?? 90);
const QUERY = process.env.QUERY ?? "";
const CHAPTER = [["c1-s1", ["xung", "tan"]], ["c1-s2", ["ray", "tia"]], ["c1-s3", ["tan", "ray"]], ["c1-s4", ["phao", "xung"]]];

/** The locked bay's next letter, else the first of the bay holding the fewest magazines. */
function nextLetter(slots) {
  const locked = slots.find((slot) => slot.locked);
  if (locked) return locked.text[locked.typed];
  let pick = slots[0];
  for (const slot of slots) if (slot.mags < pick.mags) pick = slot;
  return pick.text[0];
}

const LOOK = sv(`
  const box = (n) => { const r = n.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const cards = [...document.querySelectorAll('.sv-bottom > [data-bay]')].map((n) => {
    const tab = n.querySelector('.sv-art-bay:not([hidden])');
    const word = n.querySelector('.sv-word');
    return { bay: Number(n.dataset.bay), sealed: n.classList.contains('sv-bay-lock'), box: box(n), tab: tab && tab.getBoundingClientRect().width > 0 ? box(tab) : null, word: word ? box(word) : null };
  });
  const rift = document.querySelector('.sv-strip-warn.is-on');
  return { slots: t.slots(), state: t.state(), mode: t.mode(), foes: t.foes(), cards, rects: t.rects(), overlaps: t.numbers().overlaps, rift: rift ? box(rift) : null, layout: t.layout ? t.layout() : null };`);

const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const inside = (a, r) => a[0] >= r.x - 0.5 && a[1] >= r.y - 0.5 && a[2] <= r.x + r.w + 0.5 && a[3] <= r.y + r.h + 0.5;
const r3 = (v) => Math.round(v * 1000) / 1000;

/** One poll's checks: the gap (or null), each card's inner edge against the lane and the wall, protected, off the rift chip. */
function grade(look, W, H, tally) {
  tally.polls += 1;
  tally.overlaps += look.overlaps;
  const placed = new Map((look.layout?.bays ?? []).map((b) => [b.bay, b]));
  for (const card of look.cards) {
    const left = card.bay % 2 === 1;
    const p = placed.get(card.bay);
    const span = card.tab ? [Math.min(card.box[0], card.tab[0]), Math.min(card.box[1], card.tab[1]), Math.max(card.box[2], card.tab[2]), card.box[3]] : card.box;
    if (p) {
      const inner = left ? span[2] : W - span[0];
      tally.laneClear = Math.min(tally.laneClear, Math.round(p.lane - inner));
      tally.wallClear = Math.min(tally.wallClear, Math.round(p.wall - inner));
      tally.scale = Math.min(tally.scale, p.scale);
    }
    if (!look.rects.some((r) => inside(card.box, r)) || (card.tab && !look.rects.some((r) => inside(card.tab, r)))) tally.unprotected += 1;
    if (look.rift && hit(look.rift, span)) tally.riftOnCard += 1;
    tally.bands[card.bay] = [Math.round((card.box[1] / H) * 1000) / 10, Math.round((card.box[3] / H) * 1000) / 10];
  }
  if (look.rift) tally.riftPolls += 1;
  const words = look.cards.filter((c) => !c.sealed && c.bay <= 2 && c.word).map((c) => (c.word[1] + c.word[3]) / 2);
  const ys = look.foes.map((f) => f[1]).filter((y) => y >= 0 && y <= H).sort((a, b) => a - b);
  if (words.length === 0 || ys.length < 5 || look.state.time < 10) return null;
  const centre = ys[ys.length >> 1];
  const word = words.reduce((s, y) => s + y, 0) / words.length;
  return { t: Math.round(look.state.time), word: Math.round(word), horde: centre, gap: r3(Math.abs(word - centre) / H) };
}

const newTally = () => ({ polls: 0, overlaps: 0, laneClear: Infinity, wallClear: Infinity, scale: Infinity, unprotected: 0, riftOnCard: 0, riftPolls: 0, bands: {} });

async function play(page, stage, guns, seconds, dir, tag) {
  const W = page.width;
  const H = page.height;
  const ready = await openStage(page, stage, guns, QUERY);
  const keyMs = 60000 / (WPM * 5);
  const tally = newTally();
  const gaps = [];
  let state = null;
  let lastTick = -1;
  let reloaded = false;
  let picture = null;
  for (;;) {
    const at = Date.now();
    const look = await page.eval(LOOK);
    if (look === null || look.state.tick < lastTick) {
      reloaded = true;
      break;
    }
    lastTick = look.state.tick;
    state = look.state;
    const g = grade(look, W, H, tally);
    if (g) gaps.push(g);
    if (look.mode !== "play" || look.state.phase !== "play" || look.state.time > seconds) break;
    if (picture === null && look.state.time >= 60) picture = await page.shot(join(dir, tag + "-60s.png"));
    await press(page, nextLetter(look.slots));
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  const gapStats = stats(gaps.map((g) => g.gap));
  return { stage, guns, ready, reloaded, phase: state?.phase ?? null, time: state?.time ?? 0, hp: state?.hp ?? 0, kills: state?.stats?.kills ?? 0, tally: { ...tally, laneClear: Number.isFinite(tally.laneClear) ? tally.laneClear : null, wallClear: Number.isFinite(tally.wallClear) ? tally.wallClear : null, scale: Number.isFinite(tally.scale) ? tally.scale : null }, gap: gapStats, gapP90: r3([...gaps.map((g) => g.gap)].sort((a, b) => a - b)[Math.floor(gaps.length * 0.9)] ?? 0), samples: gaps.slice(0, 400), picture };
}

async function sample(page, dir) {
  const run = await play(page, "c1-s1", ["xung", "tan"], SECONDS, dir, "sample");
  const t = run.tally;
  return {
    run,
    checks: {
      ready: run.ready,
      gapMedian: run.gap.frames > 20 && run.gap.median <= 0.1,
      offLane: t.laneClear === null || t.laneClear >= 0,
      protectedCards: t.unprotected === 0,
      riftOffCards: t.riftOnCard === 0,
      numbersClear: t.overlaps === 0,
    },
  };
}

async function chapter(page, dir) {
  const runs = [];
  for (const [stage, guns] of CHAPTER) runs.push(await play(page, stage, guns, 400, dir, "chapter-" + stage));
  return {
    runs: runs.map(({ samples, ...run }) => run),
    checks: {
      ready: runs.every((r) => r.ready),
      ended: runs.every((r) => !r.reloaded && (r.phase === "won" || r.phase === "lost")),
      offLane: runs.every((r) => r.tally.laneClear === null || r.tally.laneClear >= 0),
      protectedCards: runs.every((r) => r.tally.unprotected === 0),
      riftOffCards: runs.every((r) => r.tally.riftOnCard === 0),
      numbersClear: runs.every((r) => r.tally.overlaps === 0),
    },
  };
}

const SCENES = { sample, chapter };

export default async function (page) {
  const size = page.width + "x" + page.height;
  const dir = join(OUT_DIR, size);
  mkdirSync(dir, { recursive: true });
  const results = {};
  for (const name of (process.env.SCENES ?? "sample").split(",")) {
    try {
      results[name] = await SCENES[name](page, dir);
    } catch (error) {
      results[name] = { error: String(error?.stack ?? error).slice(0, 600), checks: { ran: false } };
    }
  }
  const checks = Object.fromEntries(Object.entries(results).flatMap(([scene, r]) => Object.entries(r.checks ?? {}).map(([k, v]) => [scene + "." + k, v])));
  checks.noConsoleErrors = page.logs.filter((line) => line.startsWith("error")).length === 0;
  checks.noExceptions = page.exceptions.length === 0;
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  save(dir, "layout-" + size + ".json", { pass, checks, results });
  return { pass, checks, results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ...v, run: v.run ? { ...v.run, samples: undefined } : undefined }])) };
}
