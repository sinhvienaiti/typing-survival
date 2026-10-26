# Agent guidance: Tuyến Cuối (typing-survival)

Tuyến Cuối (EN: Last Line) is a typing survival game: typed words load the
guns that hold a corridor against a horde. It was split out of Space Typing
(its "Sinh Tồn" mode, tag `survival-s0`) with its history.

- Port 3007, host `survival.typing-game.local`, learning `gameId`
  `typing-survival`. Run from the parent repo checkout
  (`<parent repo>/games/typing-survival`; on the Dell laptop the toolchain
  lives only in WSL: `source ../../scripts/local-env.sh` first). A dev
  server under WSL on `/mnt/d` does not see edits saved from Windows:
  restart it after an edit, before a browser scenario. Headless Chrome
  there has software WebGL only (SwiftShader, 2–4 frames a second in a
  fight): frame budgets and waits on wall time do not hold in WSL. Run perf
  and timing scenarios in Windows Chrome on the real GPU (RTX 3050 Ti,
  ANGLE D3D11) with a portable Windows Node
  (`D:\_tools\node-v24.11.0-win-x64\node.exe src/kit/tools/cdp-run.mjs …`,
  `URL` the WSL dev server on 127.0.0.1:3007, one GPU measurement at a time
  across agents: `D:\_tools\gpu.lock`); parts that spawn `tsx` (the keys
  scenario's replay) fail there and run in WSL on the saved JSON.
- Commands: `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm check`,
  `pnpm survival:balance [--stages=s0,c1-s1,c1-s2,c1-s3,c1-s4] [--g3c]`,
  `pnpm survival:replay <replay.json>`,
  `pnpm visual scripts/visual/scenarios/survival-s0-boot.mjs --width=1280 --height=720`
  (S0 scenarios on the trial: `boot`, `menu`, `fight`, `perf`, `keys`,
  `frames`, `balance`; S1: `survival-s1-loadout`, `-guns` (frame
  sequences), `-stage`, `-hazards`, `-perf`, `-latency`; agents run the dev
  server with `pnpm dev` (port 3007, strict; Vite ignores `tmp/`) and set
  `URL=http://127.0.0.1:3007/`; stop it when done).
- S1 "Chương 1 · Hành Lang VC-7" (`docs/BUILD_S1.md`; R1 built:
  `docs/changelog/2026-10-24-s1-r1.md`, reviewed and fixed:
  `docs/changelog/2026-10-24-s1-r1-fix.md`, guns reworked:
  `docs/changelog/2026-10-24-s1-r1-guns.md`, its review handled and the
  gate tuned on: `docs/changelog/2026-10-25-s1-r1-close.md`; the two §5.1
  rules taken as proposed, drain per stage, §17 on the Apple M4:
  `docs/changelog/2026-10-25-s1-r1-mac.md`; the 100-seed report rerun on
  the committed code, the browser scenarios at both sizes and a chapter
  step test: `docs/changelog/2026-10-25-s1-r1-report.md`; the independent
  review of those handled, both seed sets, the latency source:
  `docs/changelog/2026-10-26-s1-r1-review-fix.md`; the R1 gate of §14 is
  not met yet, see its "Còn lại"): guns in `src/content/guns.ts`
  (COUNTERS is the measured table, scenes fought on a chapter stage:
  `node --import tsx scripts/counters.ts` prints seeds 1–16 and 17–32, and
  every mark must hold on both; gate G3m in `tests/guns.test.ts` has no
  known miss, but Tia's second ✕, the swarm at the line, is 1.96× / 1.93×
  of Tán: it holds on the ±8 % margin only; remeasure after any Tia or
  Tán change), foes in `src/content/foes.ts`, stages
  in `src/content/stage-rules.ts` + `chapter-1.ts` (the trial is stage
  `s0`, `stage-s0.ts`), threat scoring for bots and the briefing in
  `src/content/threat.ts`; sim per gun in `src/sim/guns/` (where Tia and
  Ray aim, in S0's way and on duty: `aim.ts`), objectives in
  `src/sim/stage.ts`, hazards in `src/sim/hazards.ts`; the journey screens in
  `src/app/journey.ts` + `src/view/screens-journey.ts`; effects in
  `src/view/gunfx.ts` + `hazard-fx.ts`; S1 sounds in
  `src/audio/gun-audio.ts`. The trial's event trace is golden
  (`tests/s0-trace.test.ts`, `tests/golden/s0-trace.json`): regenerate it
  only on purpose (`node --import tsx scripts/s0-trace.ts --write`) and say
  why in the changelog.
- Balance (parent `docs/games/BALANCE.md` §9.3, `docs/changelog/2026-10-23-balance.md`):
  the kit's `src/kit/balance` runs inside the sim (FlowMeter, PaceDirector:
  `src/sim/pace.ts`; the run's timeline: `src/sim/plan.ts`). Every balance
  number is data in `src/content/balance.ts` (modes, pace k, step table),
  `src/content/stage-s0.ts` (rates, surges, storms) and `src/content/rules.ts`
  (near zone, drain, Giáp, repair pod); a stage may set `drainFrom`
  (chapter stages drain from 14 m, the trial from 16) and `drainRate` (× the
  drain; stages 1 and 4 set 2, the rest 1; G3/G3m scenes drain at the
  chapter's base rate, `tests/survival/arena.ts`). The run header (mode, pace k, E,
  director) is set from the skill profile (`src/app/skill.ts`, key
  `survival.skill`) before the world is made and goes into every replay.
  `pnpm survival:balance` (default 100 seeds; one Node process) prints the
  §3 metrics per bot × mode and gates B1–B9, each stage as it ends;
  stages 1–4 with `--g3c --time` are 18 400 runs (14 400 bot cells, 4 000
  for G3c), 12 min on the Mac mini M4 (12:21 and 12:12, one process,
  other lanes busy, 25/10; 15:15 and 15:28 with two reports at once,
  26/10), 15–30 min on the Dell laptop (four runs, 15:31 to 30:29): run it
  in the background, through the parent's `.local/bin/heavy.sh`; add
  `--first=101` for the second seed set. The report ends with B6 pooled
  over the stages and the B1/B7 cells to rerun on the next seeds. Tuning numbers at run time:
  `--set=RAY.damage=110,c1-s1.drainRate=2,…` on `scripts/balance.ts` and
  `scripts/counters.ts` (`scripts/overrides.ts`; quote it in zsh). While
  tuning use `--seeds=40`, one stage a process; the trimmed cell set (the
  gates' Cân bằng bots, Chuẩn without the director, Trẻ em in Thư giãn) and
  the round runner and grader of the Mac pass are in
  `tmp/mac-2026-10-25/scripts/` (not in Git; `round.ts`, `grade.ts`,
  `hashes.ts`, `g3.ts`). Bots
  (`tests/survival/typist-bot.ts`) type through `installKeys`. Retune data,
  then rerun the report and the tests.
- Layout: `src/sim`, `src/content` (deterministic rules: no DOM, clock,
  `Math.random`, locale or trigonometry; same seed and log give the same
  hash in Node and Chrome), `src/view` (three.js), `src/app` (page, input,
  session), `docs/` (design and build notes). Combat feedback is the kit's
  `src/kit/feedback` ("ship" profile); there is no local copy.
- `src/kit/` is copied from the parent repo's `shared/game-kit` by
  `node scripts/sync-game-kit.mjs --target games/typing-survival` (run in the
  parent repo). Never edit it by hand; `pnpm check` verifies its sha256.
- `tests/boundary.test.ts`: `src/` imports only `src/**`, `three`,
  `three/examples/jsm/*`, `@fontsource/*`; never Space Typing paths.
- Models: Space Typing's library through the URL `/assets/space-typing/models/`
  (Vite plugin in dev, nginx alias in play). Never copy models here.
- No media in Git (images, audio, video, `.glb`, `.bin`); `public/assets/**`
  and `art-src/` are ignored. Code comments in English, short.
- Theme "Vành Chân Trời" (SPLIT_PLAN §1.3, direction A): every DOM colour,
  font and surface is a variable in `src/view/theme.css` (`survival.css` uses
  only those; `tests/theme.test.ts` checks it); the 3D palette is
  `src/view/theme.ts`. Titles Chakra Petch 700, every word of the fight Be
  Vietnam Pro. The horde's shared "Bầy Hố Đen" material is in
  `src/view/crowd.ts`; the stage (steel deck, black hole backdrop, title
  camera) in `src/view/scene.ts`; menus in `src/app/menu.ts` and
  `src/view/screens.ts`.
- Sound is made in code (no files yet) through the kit's `SceneAudio`:
  `src/audio/theme-audio.ts` (cues, buses, pronunciation duck),
  `src/audio/music.ts` (calm and surge layers following the horde). Every
  sound id has an entry in `docs/audio/THEME_SOUND_LIST.md`; add one there
  with each new id.
- Each update gets `docs/changelog/<date>-<topic>.md` (Vietnamese).
- R1 gate state (100-seed reports on the committed code, seeds 1–100
  and 101–200, Mac mini M4, 26/10, `docs/changelog/2026-10-26-s1-r1-review-fix.md`):
  passes on both seed sets `pnpm check`, B2–B5, B6 pooled over the stages
  (+11.0 / +11.3), B8, G3, G3m, G3c on stages 1 and 3, G5, G6, G8, §7.6;
  fails B1 and B7 on stages 1–4 (B1: 43 / 40 band misses) and G3c's "best
  ≤ 97 %" on stages 2 and 4. The two seed sets differ by up to 16 win
  points in one direction (stages 1 and 3 harder on 101–200): confirm
  every tuning round on seeds 101–200. Heavy words keep their extra letter
  where the cap of 10 stops the long end (`HEAVY.spill`, E ≥ 60: 7–10).
  §17 on the Apple M4 (60 Hz locked, busy machine): frames, draw calls and
  key to frame pass; key to shot passes since the latency scenario starts
  the audio before it measures (a page's first key builds the AudioContext,
  ~107 ms; in play that key is on the title screen) and pools 40 words:
  six runs, p95 18–20 ms, at most 32 ms, no long frame. A chapter stage's sim step (700 foes, 2,000
  rounds, 63 + 1 shells, 32 shields, three bays) is a test in
  `tests/survival-sim.test.ts` (median 0.88–0.91 ms of 1.5; 1.39–1.40 ms with
  the machine at load 8–60, so move it out of `pnpm check` if it starts to
  fail on load); a chapter's
  30-minute memory waits for R2. The S1/S0 browser scenarios pass at
  1280×720 and 1920×1080.
- Next: close the R1 gate from the review-fix changelog's "Còn lại": the
  coordinator sets how many variants a tuning round may hold; Khá and
  Nhanh idle on stages 1, 2, 4 because the guns take no more magazines (a
  §5.1 rule for a full bay); stage 3 loses in a cliff when the first
  surge's crowd reaches the line at 60–90 s (guns loaded but swamped; a
  third surge would add a cliff): spread it and pay the strong bots back
  with steady pressure; G3c's "best" on stage 2 is always Tia on duty
  (damp `TIA_DUTY` with Tán or Ray), on stage 4 pairs without Tia pass
  97 % too (stage-wide pressure, or Pháo Sao where shields stand); then S1
  R2 (chapter flow, doors, Lõi, Mốc, stages 5–9, Bão ion, Giếng, Nghĩa)
  and R3 (the boss), `docs/BUILD_S1.md` §14.
- Feel pass (the owner's verdict of 26/10): `docs/FEEL_PASS_S1.md` (the
  word line above the ship's nose with the bays beside the ship, each
  letter charging the ship's core, 3D bolts and light pools per gun, kill
  chunks, the ship's view-only drift, sounds by Q6; budgets and frame
  sequence checks). It touches no sim file: chapter runs and the trial
  golden must hash the same (its §1.1, §7.1; `scripts/chapter-hashes.ts`
  prints the 152 chapter runs, diff it against the commit before).
  Build 1 done (`docs/changelog/2026-10-26-feel-pass-s1.md`): the layout
  (§2: `src/view/strip.ts` the word line, `hud.ts` the bays placed from the
  still camera, `Stage.project(…, still)`) and the typing feel (§3:
  `src/view/typing-feel.ts` reads the typing events with its own cursor and
  drives the line, the core, shards, rings and the sounds; numbers in
  `type-rules.ts`; sounds in `src/audio/type-audio.ts`). Frame sequences:
  `scripts/visual/scenarios/survival-feel.mjs`
  (`SCENES=f1,f2,f4,f9,layout,marks,rate,audio,f8`, ~10 min a size with
  f8). Open from build 1: the eye to each new number is 238 / 229 px (720p
  px, both stages pooled, target 210; stage 1 205–215, stage 4 with Pháo
  Sao 305–315); Ray's armed bolt, the first shot's flash and the ship's lunge wait
  for F3 and F5. Next: F3 guns (§4.1–§4.4, §4.6), F4 chunks, F5 the ship.
- The design docs live in `docs/`; the parent repo's
  `docs/games/SPLIT_PLAN.md` explains the split and the theme.
