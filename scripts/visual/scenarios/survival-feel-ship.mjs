// Tuyến Cuối feel pass, the ship build (docs/FEEL_PASS_S1.md §5, §7.2–§7.3:
// F7 and the ship's kicks): frame sequences on the page's held clock with the
// ship's pose at each (window.__survival.ship(): drift, turn, kicks, hover,
// thrust, its root on screen), contact sheets, and the measures that grade
// them. Every foe is placed by a logged command (as survival-s1-guns).
//   drift  F7: chapter stage 1, seed 3, director off: 2 s with nothing near
//          (frames 100 ms apart: the hover), then 10 mines placed at x +8 m,
//          z 12 m and 30 frames 50 ms apart; then two Xung words break the
//          pack and frames go on 100 ms apart (the return). Grades: ≥ 40 px
//          (720p) toward the pack in 1.5 s; banked into the move; engines
//          flared while it moves; within 10 px of the centre by 2.5 s after
//          the pack is gone (Σw < 0.3); the hover's travel on screen (peak to
//          peak) 2–5 px.
//   kick   each gun (Xung, Tán, Ray, Pháo Sao, Tia): a magazine typed on the
//          held clock into a placed pack; every frame for 0.75 s (the lunge,
//          the first shots), then the pose every frame to 2.4 s. Grades: the
//          lunge 0.30–0.36 m forward within 12 frames (less Tia's 0.06 m
//          held back, which starts with it), the nose behind z 2.1;
//          a shot's kick past the lunge (Xung 0.05, Tán 0.28, Ray 0.4 back,
//          Pháo Sao 0.08 down, Tia 0.06 held) ≥ 85 % of §5.2 and gone in
//          its return + 3 frames; the turn ≤ 7 rad/s and ≤ ±50°; Ray's snap
//          overshoots its aim.
//   reduced the same with survival.motion = reduced: no drift, hover or
//          lunge; recoil ≤ 30 %.
//   rt     real time: a Xung and a Tán word typed at 90 ms a key with a pack
//          to the side, the pose logged on every real frame (rAF) in the page:
//          the motion runs on the frame clock, no jumps.
//   URL=http://127.0.0.1:3007/ OUT_DIR=… SCENES=drift,kick,reduced,rt node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-feel-ship.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR } from "./common.mjs";
import { press, sv } from "./survival-s0-lib.mjs";
import { KIND, openStage } from "./survival-s1-lib.mjs";
import { advance, hold, save, sheet, STEP } from "./survival-feel-lib.mjs";

const EV = { shot: 1, load: 11, beamStart: 12, volley: 20, charge: 21, rail: 22, launch: 23 };
const DEG = Math.PI / 180;
/** Per gun: the kit, its shot event, the pack (kind, x, z), §5.2's kick (back m, down m) and its return (s). */
const GUNS = {
  xung: { kit: ["xung", "tan"], ev: EV.shot, pack: (i) => [KIND.mine, -2 + (i % 6) * 0.8, 9 + Math.floor(i / 6) * 1.4], back: 0.05, ret: 0.08 },
  tan: { kit: ["tan", "xung"], ev: EV.volley, pack: (i) => [KIND.mine, -3 + (i % 6) * 1.2, 6.5 + Math.floor(i / 6) * 1.3], back: 0.28, ret: 0.18 },
  ray: { kit: ["ray", "xung"], ev: EV.rail, pack: (i) => [i === 0 ? KIND.brute : KIND.mine, -4 - i * 0.1, 11 + i * 1.6], back: 0.4, ret: 0.26 },
  phao: { kit: ["phao", "xung"], ev: EV.launch, pack: (i) => [KIND.mine, 3 + (i % 4) * 1.1, 15 + Math.floor(i / 4) * 1.1], down: 0.08, ret: 0.22 },
  tia: { kit: ["tia", "xung"], ev: EV.beamStart, pack: (i) => [KIND.mine, -4 + (i % 6) * 1.6, 7 + Math.floor(i / 6) * 1.6], hold: 0.06 },
};
const POSE = sv("return { tick: t.state().tick, foes: t.state().foes, ship: t.ship(), events: t.events() };");

const r3 = (v) => Math.round(v * 1000) / 1000;
const median = (list) => {
  const s = [...list].sort((a, b) => a - b);
  return s.length === 0 ? null : s[s.length >> 1];
};

/** The ship's neighbourhood on screen (the word line above it, the bays beside it). */
const shipClip = (ui) => ({ x: 400 * ui, y: 320 * ui, w: 480 * ui, h: 320 * ui });

async function shot(page, dir, name, extra = {}) {
  const file = join(dir, name + ".png");
  await page.shot(file);
  return { file, name, ...extra, ...(await page.eval(POSE)) };
}

/** Frames whose upper third is all but black (a broken frame: the corridor and the horde are never that dark). */
function dark(rows, page) {
  const out = [];
  for (const row of rows) {
    if (row.file === undefined) continue;
    const mean = Number(execFileSync("magick", [row.file, "-crop", page.width + "x" + Math.round(page.height * 0.36) + "+0+0", "+repage", "-colorspace", "gray", "-format", "%[fx:mean]", "info:"]).toString());
    if (mean < 0.06) out.push(row.file.split("/").pop());
  }
  return out;
}

/** Types bay `bay`'s word but its last letter on the held clock, one frame between keys; returns the word. */
async function typeHeld(page, bay) {
  const slots = await page.eval(sv("return t.slots();"));
  const word = slots[bay].text;
  for (const letter of word.slice(0, -1)) {
    await press(page, letter);
    await advance(page, STEP);
  }
  return word;
}

async function open(page, kit) {
  const ready = await openStage(page, "c1-s1", kit, "&director=0");
  await page.key("Shift", { code: "ShiftLeft" });
  await page.sleep(300);
  await hold(page, true);
  return ready;
}

/** F7: the drift toward a pack at x +8 m, the bank and engines on the way, the return and the hover once it is gone. */
async function drift(page, dir) {
  const size = page.width + "x" + page.height;
  const ui = page.height / 720;
  const ready = await open(page, ["xung", "tan"]);
  await advance(page, 200);
  // The hover first: 2 s with nothing near (the stage's own horde is still at the gate).
  const rows = [];
  let ms = -2000;
  for (let f = 0; f <= 20; f += 1) {
    if (f > 0) {
      await advance(page, 100);
      ms += 100;
    }
    rows.push(await shot(page, dir, "drift-" + String(rows.length).padStart(3, "0"), { ms }));
  }
  // F7: 10 mines at x +8 m, z 12 m; 1.5 s of frames 50 ms apart.
  for (let i = 0; i < 10; i += 1) await page.eval(sv("t.place(" + KIND.mine + ", " + (7.2 + (i % 5) * 0.4) + ", " + (11.6 + Math.floor(i / 5) * 0.8) + "); return true;"));
  ms = 0;
  rows.push(await shot(page, dir, "drift-" + String(rows.length).padStart(3, "0"), { ms }));
  const s0 = rows.at(-1).ship;
  for (let f = 1; f <= 30; f += 1) {
    await advance(page, 50);
    ms += 50;
    rows.push(await shot(page, dir, "drift-" + String(rows.length).padStart(3, "0"), { ms }));
  }
  // Then two Xung magazines break the pack (typed on the held clock, a frame a letter); frames go on 100 ms apart.
  for (let w = 0; w < 2; w += 1) {
    const slots = await page.eval(sv("return t.slots();"));
    const word = slots[slots.findIndex((slot) => slot.gun === "xung")].text;
    for (const letter of word) {
      await press(page, letter);
      await advance(page, STEP);
      ms += STEP;
    }
  }
  for (let f = 0; f < 70; f += 1) {
    await advance(page, 100);
    ms += 100;
    rows.push(await shot(page, dir, "drift-" + String(rows.length).padStart(3, "0"), { ms: Math.round(ms) }));
  }
  await hold(page, false);
  const at = (t) => rows.find((row) => row.ms >= t) ?? rows.at(-1);
  const toward = at(1500).ship.sx - s0.sx;
  const moving = rows.filter((row) => row.ms >= 0 && row.ms <= 1500 && row.ship.vx > 0.5);
  const gone = rows.findIndex((row) => row.ms > 1500 && row.ship.weight < 0.3);
  const goneMs = gone >= 0 ? rows[gone].ms : null;
  // Back at the centre: the first frame within 10 px (720p) from the pack's end to 2.5 s after it (the stage's own horde reaches 16 m from ~6 s and pulls it again).
  const back = gone >= 0 ? rows.filter((row) => row.ms >= goneMs && row.ms <= goneMs + 2500).find((row) => Math.abs(row.ship.sx - row.ship.cx) <= 10 * ui) ?? null : null;
  const idle = rows.filter((row) => row.ms < 0);
  const sy = idle.map((row) => row.ship.sy);
  const bob = idle.every((row) => row.ship.weight < 0.3) && sy.length > 10 ? Math.max(...sy) - Math.min(...sy) : null;
  const label = (row) => row.ms + " ms x " + row.ship.x.toFixed(2) + " v " + row.ship.vx.toFixed(1) + " th " + row.ship.thrust.toFixed(1) + " w " + row.ship.weight.toFixed(2);
  const pick = (from, to, every) => rows.filter((row, k) => row.ms >= from && row.ms <= to && k % every === 0);
  const clip = { x: 280 * ui, y: 180 * ui, w: 720 * ui, h: 460 * ui };
  const sheets = [
    sheet(pick(-2000, 1500, 1).filter((row) => row.ms >= 0 || row.ms % 200 === 0).map((row) => ({ file: row.file, label: label(row) })), join(dir, "sheet-drift-" + size + ".jpg"), clip, 6, 360),
    sheet(pick(1500, 9000, 2).map((row) => ({ file: row.file, label: label(row) })), join(dir, "sheet-drift-return-" + size + ".jpg"), clip, 6, 360),
  ];
  const black = dark(rows, page);
  save(dir, "meta-drift-" + size + ".json", rows.map(({ file, events, ...row }) => ({ file: file.split("/").pop(), ...row })));
  const result = {
    ready,
    towardPx720: r3(toward / ui),
    xAt1500: at(1500).ship.x,
    vxMax: r3(Math.max(...rows.map((row) => row.ship.vx))),
    rollMinDeg: r3(Math.min(...rows.filter((row) => row.ms >= 0 && row.ms <= 1500).map((row) => row.ship.roll)) / DEG),
    thrustMoving: moving.length > 0 ? r3(Math.max(...moving.map((row) => row.ship.thrust))) : 0,
    goneMs,
    backPx720: back === null ? null : r3(Math.abs(back.ship.sx - back.ship.cx) / ui),
    backAfterMs: back === null ? null : Math.round(back.ms - goneMs),
    bobPx720: bob === null ? null : r3(bob / ui),
    idleFrames: idle.length,
    dark: black,
    sheets,
  };
  return {
    ...result,
    checks: {
      toward40px: result.towardPx720 >= 40,
      banksIntoMove: result.rollMinDeg <= -2,
      enginesFlare: result.thrustMoving >= 0.5,
      packGone: goneMs !== null,
      backWithin10px: result.backPx720 !== null && result.backPx720 <= 10,
      hover2to5px: result.bobPx720 !== null && result.bobPx720 >= 2 && result.bobPx720 <= 5,
      noDarkFrames: black.length === 0,
    },
  };
}

/** New events of `kind` between two rows. */
const fresh = (rows, k, kind) => (k === 0 ? 0 : (rows[k].events[kind] ?? 0) - (rows[k - 1].events[kind] ?? 0));

/** Each gun: the lunge on its load, its kicks, its turn. */
async function kick(page, dir, opts = {}) {
  const size = page.width + "x" + page.height;
  const ui = page.height / 720;
  const out = {};
  const pick = (process.env.GUNS ?? "xung,tan,ray,phao,tia").split(",");
  for (const [gun, spec] of Object.entries(GUNS)) {
    if (!pick.includes(gun)) continue;
    const ready = await open(page, spec.kit);
    const count = gun === "ray" ? 6 : 12;
    for (let i = 0; i < count; i += 1) await page.eval(sv("t.place(" + spec.pack(i).join(", ") + "); return true;"));
    await advance(page, 50);
    const slots = await page.eval(sv("return t.slots();"));
    const bay = slots.findIndex((slot) => slot.gun === gun);
    const word = await typeHeld(page, bay);
    const rows = [await shot(page, dir, (opts.tag ?? "kick") + "-" + gun + "-pre", { f: -1, ms: -17 })];
    await press(page, word.at(-1));
    // Every frame for 0.75 s with a picture, then the pose alone to 2.4 s.
    for (let f = 0; f < 144; f += 1) {
      await advance(page, STEP);
      const ms = Math.round((f + 1) * STEP);
      rows.push(f < 45 ? await shot(page, dir, (opts.tag ?? "kick") + "-" + gun + "-" + String(f).padStart(3, "0"), { f, ms }) : { f, ms, ...(await page.eval(POSE)) });
    }
    await hold(page, false);
    const S = rows.map((row) => row.ship);
    const loadAt = rows.findIndex((row, k) => fresh(rows, k, EV.load) > 0);
    const lunge = Math.min(...S.slice(0, 12).map((p) => p.back));
    const noseMax = Math.max(...S.map((p) => p.nose));
    // Kicks past the lunge (≥ 0.75 s): each shot's peak over the frame before it, within 3 frames.
    const kicks = [];
    const gone = [];
    for (let k = 1; k < rows.length; k += 1) {
      if (rows[k].ms < 750 || fresh(rows, k, spec.ev) <= 0) continue;
      const base = S[k - 1];
      const win = S.slice(k, k + 4);
      if (spec.back !== undefined) {
        const peak = Math.max(...win.map((p) => p.back));
        kicks.push(r3(peak - base.back));
        const settle = S.slice(k).findIndex((p, j) => j > 1 && p.back - base.back < 0.1 * spec.back);
        if (settle >= 0) gone.push(Math.round(settle * STEP));
      } else if (spec.down !== undefined) kicks.push(r3(Math.max(...win.map((p) => p.down)) - base.down));
    }
    const held = spec.hold !== undefined ? median(S.filter((p, k) => rows[k].ms >= 750 && rows[k].ms <= 2000).map((p) => p.back)) : null;
    // The turn: the fastest frame-to-frame yaw (rad/s) and the widest; Ray's snap: the yaw passes its settled aim after the charge.
    const yaw = S.map((p) => p.yaw);
    const speed = Math.max(...yaw.slice(1).map((y, k) => Math.abs(y - yaw[k]) / (STEP / 1000)));
    let overshoot = null;
    if (gun === "ray") {
      const charge = rows.findIndex((row, k) => fresh(rows, k, EV.charge) > 0);
      if (charge >= 0) {
        const after = yaw.slice(charge, charge + 30);
        const settled = after.at(-1);
        const sign = Math.sign(settled - yaw[charge]);
        overshoot = r3((Math.max(...after.map((y) => (y - settled) * sign)) / Math.max(1e-6, Math.abs(settled - yaw[charge]))));
      }
    }
    const label = (row) => gun + " " + row.ms + " ms b" + row.ship.back.toFixed(2) + " p" + (row.ship.pitch / DEG).toFixed(1) + " y" + (row.ship.yaw / DEG).toFixed(0) + (fresh(rows, rows.indexOf(row), spec.ev) > 0 ? " SHOT" : "") + (fresh(rows, rows.indexOf(row), EV.load) > 0 ? " LOAD" : "");
    const pics = rows.filter((row) => row.file !== undefined).slice(0, 37);
    const sheets = [sheet(pics.map((row) => ({ file: row.file, label: label(row) })), join(dir, "sheet-" + (opts.tag ?? "kick") + "-" + gun + "-" + size + ".jpg"), shipClip(ui), 6, 330)];
    save(dir, "meta-" + (opts.tag ?? "kick") + "-" + gun + "-" + size + ".json", { word, bay, loadAt, rows: rows.map(({ file, events, ...row }) => ({ file: file?.split("/").pop(), ...row })) });
    const kickMed = median(kicks);
    const black = dark(rows, page);
    const want = spec.back ?? spec.down ?? spec.hold;
    out[gun] = {
      ready, word, loadAt, lunge: r3(lunge), noseMax: r3(noseMax), kicks, kickMedian: kickMed, held: held === null ? null : r3(held), want, settleMs: median(gone), ret: spec.ret ?? null,
      turn: { speedMax: r3(speed), yawMaxDeg: r3(Math.max(...yaw.map(Math.abs)) / DEG), overshoot },
      xMax: r3(Math.max(...S.map((p) => Math.abs(p.x)))), bobMax: r3(Math.max(...S.map((p) => Math.abs(p.bob)))), dark: black, sheets,
    };
  }
  const reduced = opts.reduced === true;
  const checks = {};
  for (const [gun, r] of Object.entries(out)) {
    const spec = GUNS[gun];
    const kickOk = (k) => (reduced ? k <= 0.3 * r.want * 1.2 + 0.002 : k >= 0.85 * r.want);
    checks[gun + ".turnSpeed7"] = r.turn.speedMax <= 7.05;
    checks[gun + ".turnMax50"] = r.turn.yawMaxDeg <= 50.1;
    checks[gun + ".noseBehind2.1"] = r.noseMax <= 2.1001;
    checks[gun + ".noDarkFrames"] = r.dark.length === 0;
    if (reduced) {
      checks[gun + ".noLunge"] = r.lunge >= -0.001;
      checks[gun + ".noDrift"] = r.xMax <= 0.005;
      checks[gun + ".noHover"] = r.bobMax <= 0.0001;
    } else checks[gun + ".lunge"] = r.lunge <= -0.3 + (spec.hold ?? 0) && r.lunge >= -0.36;
    if (spec.hold !== undefined) checks[gun + ".held"] = r.held !== null && (reduced ? r.held <= 0.3 * r.want * 1.2 : Math.abs(r.held - r.want) <= 0.015);
    else checks[gun + ".kick"] = r.kickMedian !== null && kickOk(r.kickMedian);
    if (!reduced && spec.back !== undefined && r.settleMs !== null) checks[gun + ".returns"] = r.settleMs <= (spec.ret + 0.016) * 1000 + 3 * STEP;
    if (!reduced && gun === "ray") checks[gun + ".snapOvershoots"] = r.turn.overshoot !== null && r.turn.overshoot > 0.005;
  }
  return { guns: out, checks };
}

/** Reduced motion (§1.5): the same kicks with survival.motion = reduced. */
async function reduced(page, dir) {
  await openStage(page, "c1-s1", ["xung", "tan"], "&director=0");
  await page.eval("localStorage.setItem('survival.motion', 'reduced'); true");
  try {
    const run = await kick(page, dir, { reduced: true, tag: "reduced" });
    return run;
  } finally {
    await page.eval("localStorage.removeItem('survival.motion'); true");
  }
}

/** Real time: a Xung and a Tán word at 90 ms a key, a pack to the side; the pose on every real frame. */
async function rt(page, dir) {
  const size = page.width + "x" + page.height;
  const ui = page.height / 720;
  const ready = await openStage(page, "c1-s1", ["xung", "tan"], "&director=0");
  await page.key("Shift", { code: "ShiftLeft" });
  for (let i = 0; i < 12; i += 1) await page.eval(sv("t.place(" + KIND.mine + ", " + (3 + (i % 4) * 0.8) + ", " + (9 + Math.floor(i / 4) * 1.2) + "); return true;"));
  await page.sleep(100);
  await page.eval("window.__pose = []; (function rec(t0) { const go = (t) => { const s = window.__survival.ship(); window.__pose.push([Math.round((t - t0) * 10) / 10, s.x, s.yaw, s.back, s.sx, s.sy, s.thrust]); if (t - t0 < 4000) requestAnimationFrame(go); }; requestAnimationFrame(go); })(performance.now()); true");
  const shots = [];
  const start = Date.now();
  const snap = async () => {
    const file = join(dir, "rt-" + String(shots.length).padStart(3, "0") + ".png");
    await page.shot(file);
    shots.push({ file, label: "+" + (Date.now() - start) + " ms" });
  };
  for (const bayGun of ["xung", "tan"]) {
    const slots = await page.eval(sv("return t.slots();"));
    const bay = slots.findIndex((slot) => slot.gun === bayGun);
    for (const letter of slots[bay].text) {
      await press(page, letter);
      await page.sleep(90);
    }
    await snap();
  }
  while (Date.now() - start < 3600) await snap();
  await page.sleep(500);
  const rec = await page.eval("window.__pose");
  const gaps = rec.slice(1).map((r, k) => r[0] - rec[k][0]);
  // A jump: more sideways than the drift's 2.4 m/s plus a kick's sideways share allows, or a turn faster than 7 rad/s plus the wobble.
  let jumps = 0;
  let dxMax = 0;
  let dyawMax = 0;
  for (let k = 1; k < rec.length; k += 1) {
    const dt = Math.max(1e-3, (rec[k][0] - rec[k - 1][0]) / 1000);
    const dx = Math.abs(rec[k][1] - rec[k - 1][1]) / dt;
    const dyaw = Math.abs(rec[k][2] - rec[k - 1][2]) / dt;
    dxMax = Math.max(dxMax, dx);
    dyawMax = Math.max(dyawMax, dyaw);
    if (dx > 2.45 || dyaw > 7.05 + (1.2 * DEG) / dt) jumps += 1;
  }
  save(dir, "rt-" + size + ".json", rec);
  const sorted = [...gaps].sort((a, b) => a - b);
  return {
    ready, frames: rec.length, shots: shots.length, frameMs: { median: sorted[sorted.length >> 1] ?? 0, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0 },
    xMax: r3(Math.max(...rec.map((r) => r[1]))), dxMax: r3(dxMax), dyawMax: r3(dyawMax), jumps,
    sheet: sheet(shots.slice(0, 24), join(dir, "sheet-rt-" + size + ".jpg"), { x: 280 * ui, y: 180 * ui, w: 720 * ui, h: 460 * ui }, 6, 330),
    checks: { realFrames: rec.length >= 150, drifts: Math.max(...rec.map((r) => r[1])) >= 0.4, noJumps: jumps === 0 },
  };
}

const SCENES = { drift, kick, reduced, rt };

export default async function (page) {
  const size = page.width + "x" + page.height;
  const dir = join(OUT_DIR, size);
  mkdirSync(dir, { recursive: true });
  const only = (process.env.SCENES ?? "drift,kick").split(",");
  const results = {};
  for (const name of only) {
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
  save(dir, "result-" + size + ".json", { pass, checks, results });
  return { pass, checks, results };
}
