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
  sequences), `-stage`, `-hazards`, `-perf`; agents run a dev server with
  `npx vite --host 127.0.0.1 --port 3047 --strictPort` and set `URL`).
- S1 "Chương 1 · Hành Lang VC-7" (`docs/BUILD_S1.md`; R1 built:
  `docs/changelog/2026-10-24-s1-r1.md`, reviewed and fixed:
  `docs/changelog/2026-10-24-s1-r1-fix.md`; the R1 gate of §14 is not met
  yet, see that changelog's "Còn lại"): guns in `src/content/guns.ts`
  (COUNTERS is the measured table: `node --import tsx scripts/counters.ts`,
  16 seeds, and every mark must hold on `--first=17` too; gate G3m in
  `tests/guns.test.ts` pins its one known miss, Xung ● on one row only),
  foes in `src/content/foes.ts`, stages
  in `src/content/stage-rules.ts` + `chapter-1.ts` (the trial is stage
  `s0`, `stage-s0.ts`), threat scoring for bots and the briefing in
  `src/content/threat.ts`; sim per gun in `src/sim/guns/`, objectives in
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
  (chapter stages drain from 14 m, the trial from 16). The run header (mode, pace k, E,
  director) is set from the skill profile (`src/app/skill.ts`, key
  `survival.skill`) before the world is made and goes into every replay.
  `pnpm survival:balance` (default 100 seeds; one Node process) prints the
  §3 metrics per bot × mode and gates B1–B9, each stage as it ends;
  stages 1–4 with `--g3c --time` are 18 400 runs (14 400 bot cells, 4 000
  for G3c), 26–30 min on the Dell
  laptop (WSL, shared with other agents): run it in the background. While
  tuning use `--seeds=40`, one stage a process (at most 4 at once). Bots
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
- Next: close the R1 gate (B1, B3, B4, B7, G3m's "● on ≥ 2 rows" for
  Xung, G3c's "best ≤ 97 %" miss: `docs/changelog/2026-10-24-s1-r1-fix.md`
  "Còn lại"; §17 frame budgets pass on the Dell GPU, the Mac M4 is not
  measured), then S1 R2 (chapter flow,
  doors, Lõi, Mốc, stages 5–9, Bão ion, Giếng, Nghĩa) and R3 (the boss),
  `docs/BUILD_S1.md` §14.
- The design docs live in `docs/`; the parent repo's
  `docs/games/SPLIT_PLAN.md` explains the split and the theme.
