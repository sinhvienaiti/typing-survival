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
  `three/examples/jsm/*`, `@fontsource/*`, `a11y-dialog` (the kit's
  quick-settings panels); never Space Typing paths.
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
  Sao 305–315). Build 2 done (same changelog, "Bước 2"): the guns and
  kills (§4: F3 + F4). Rules in `src/view/gun-rules.ts` (the game's
  feedback profile `FEEL`: flash 2–6 frames, numbers h/30; the 3 m join;
  light priorities; chunk counts and flight; `tests/gun-feel.test.ts`);
  `lights.ts` (PointLight pool made with the fight, the deck's pools through
  `scene.ts` uniforms), `bolts.ts` (Space's `skills/*-bolt` GLBs, one
  InstancedMesh a kind, caps), `shots.ts` (Xung with a comet head of light
  on each round, Tán, Pháo Sao, hit looks), `beams.ts` (Tia, Ray, its
  armed bolt), `chunks.ts` (kill chunks and shadows, 2 draw calls), real
  muzzles from `Ship.muzzle(out, MUZZLE.*)`; `warm.ts` compiles every
  program once the models are in, into the composer's buffer when bloom is
  on (programs compiled for the screen are not the ones drawn there): 34
  programs, none new in a fight; the page is `ready` after it, and
  `survival-s1-perf` checks it (`programsSteady`). Sounds in `gun-audio.ts`
  (loops `gun.tia.loop`, `gun.ray.armed`, heard only while the fight runs:
  `audio.live`, set each frame in `main.ts`; `gun.xung.tail`; a foe in
  Pháo Sao's ring plays no `hit.*`). Bloom 0.85 with radius 0.3, not the spec's
  0.45 (a Ray shot washed the lane). Frame sequences:
  `scripts/visual/scenarios/survival-feel-guns.mjs`
  (`SCENES=f5,f6,shake,f9g,audio`, `GUNS=` to pick, ~15 min a size). The
  backdrop under the word line is at its limit (p50 +0.020 over build 1,
  §4.1 allows 0.02): measure it again after any new light. Build 3 done
  (same changelog, "Bước 3"): the ship (§5: F5), view only. Rules in
  `src/view/ship-rules.ts` (`tests/ship-motion.test.ts`: the drift target
  from the near horde's weights, the springs, hover, kicks by gun and the
  lunge, aim priorities, engine thrust); `ship.ts` drives the pose on its
  own clock (frozen under the pause) on `Ship.root` (yaw, pitch, drift,
  kicks) and the rig's bank (`turnBank`, the kit's slow sway taken off),
  gets kicks and aim cues from `shots.ts` / `beams.ts` (`ship.kick`,
  `ship.cue`), reads Ray's charge and Tia's burn from the world, and draws
  the engines into the fight's glows and strips (`drawEngines`). Sockets
  missing on a model fall back to anchors in ship space (Draconis has no
  engines: none drawn). Probes for scenarios in `src/view/probes.ts`
  (`__survival.ship()`, `.foes()`). Frame sequences:
  `scripts/visual/scenarios/survival-feel-ship.mjs`
  (`SCENES=drift,kick,reduced,rt`, ~5 min a size); `survival-feel` `f8` also
  grades how much light washes out the horde (the balance pass; stage 4
  at 1080p is 10.7 %, over its 10 %, from build 2's Pháo Sao blasts and
  the black hole's glare, not the ship). Since build 2 the frame 267 ms
  after a Ray load draws the 3D scene black when it lands on sim tick 74
  of the kick scene (4/4 such runs, both before and after build 3; no
  NaN found on the CPU side; cause not found, see the changelog): fix it
  before the owner's play test. Next: F6 (§8: remeasure §6–§7, the
  owner's play test §7.6).
- Test pass of 27/10 (three testers by level, then one verify-and-fix
  agent; `docs/changelog/2026-10-27-test-pass.md`, spec changes in
  `FEEL_PASS_S1.md` §11): a finished word's meaning never sits under a
  bay's next word (the line goes to two lines); the bay being typed is a
  dictionary entry (word 22 px + IPA, meaning on two lines); the word line
  stands 1.8 m past the bottom line (`LINE_LIFT` in `hud.ts`, y 400–456 at
  720p) so the muzzles show under it; typed letters take the gun's ink
  from f0 (`--gun-ink`, set on each gun class: a `:root` default inherits
  as Xung's colour; Ray's `--ray-ink`) with an underline that stays;
  big kills, Pháo Sao and the rift's open hit harder; the rift's countdown
  sits beside the line. App: the world steps only once the page is ready;
  a page from the journey or a replay opens on the stage card (`?card=1`,
  mode `intro`: any key but Esc goes in, opens the audio and types
  nothing); a run's end shows a 0.9 s banner before its card; settings has
  "Giảm chuyển động" (`survival.motion`, live). Balance (Khá/Nhanh into
  full bays, stages 1–2 too easy, a 30 WPM human losing stages 2–3 that
  bots win) stays with the R1 gate's tuning. `src/` is 12,757 lines with
  its CSS (over the 12,500 proposed for the feel pass; `main.ts` 738,
  `hud.ts` 419 over its 400, `combat.ts` 429 of 430): split in R2. An
  element shown and hidden with `hidden` must not get a `display` of its
  own without `:not([hidden])` (the two-line done text showed beside the
  next word).
- N4/N6 pass (27/10, after the recheck: `docs/changelog/2026-10-27-feel-n4n6.md`,
  `FEEL_PASS_S1.md` §12): each right key marks the field on its own frame
  (`KEY_MARK` in `type-rules.ts`, `typing-feel.ts`: a bolt from the plate's
  edge under the letter into the ship's core, a star at each end, the deck
  lit with a ring out past the painted one; reduced motion keeps a still
  bolt); Tia and Ray are tamed over the ship (their first 3 m, their lights
  1.5 m out, Tia's floor burns past 3 m); a Trâu or Đầu Đàn dies as its own
  event (`ShotFx.bigKill`: a warm flash, a fireball, smoke laid over the
  deck by `Glows` in its smoke mode, a bed of embers, a heap of light steel
  chunks). A billboard's size is its full width (a ring's radius is 0.4 of
  it); every new burst and gun light shows whole on the frame that
  makes it (Codex 035, merged 28/10: `Glows.flush` writes a new burst at
  age 0, `GunLights` a new flash at its power; no `early` argument). Scenes `survival-feel`
  `f1f` and `survival-feel-guns` `f6b`; `f5` types its last key 300 ms
  late (a key now lights the deck round the muzzle). Round 2 (after an
  independent judge, same changelog, `FEEL_PASS_S1.md` §13): the bolt bows
  1.3 m to the letter's side with a fork (off Tia's column), and a spark
  marks the letter itself (`.sv-strip-spark`, the plate's first child so it
  is drawn behind the word, never over a letter; placed by `strip.ts`); a
  big kill leaves a dark cloud about as wide as its flash (`CLOUD` in
  `shots.ts`: 23 puffs, a sooty base, a dense dark body, dimmer tops; the
  smoke shader shades by thickness and fades a puff over its lowest 1.2 m,
  so the deck never cuts it on a straight line; drawn over the beams), a
  scorch with glowing cracks and a field of 36–40 chunks thrown all round
  (`THROW.big`, cold rims 2.6× lit) that lies until 8 s. `f1f`
  checks the field mark (≥ 8,000 px at 720p, beam or not) and the spark;
  `f6b` measures the cloud against the frame before the kill. `src/`
  12,787 lines (the excess is `main.ts` and `hud.ts`: split in R2).
- Cloud fix (28/10, after a second judge: `ce9dea3`'s cloud hid the live
  foes near a big kill for 1–3 s; `docs/changelog/2026-10-28-cloud-fix.md`,
  `FEEL_PASS_S1.md` §14): in depth the smoke lies on the deck. The smoke
  shader writes the floor's depth along each pixel's ray (`fx.ts`,
  `gl_FragDepth`; the deck writes none, the slab under it sits at
  −0.02 m), so it still covers the deck, the beams and Tia's column, while
  foes, chunks, the ship and the rails stand over it. The cloud's colours,
  alpha, sizes and life as §13; the fireball's puffs live 0.3–0.45 s (were
  0.5–0.85 s: they washed the foes in front at 0.3–0.6 s). The foes' look
  in the cloud now matches a run with the smoke switched off; what still
  dips, for one frame at 0.4–0.7 s, is the gun's own next hit (a Tán
  flash, a Pháo Sao burst). `f6b` runs the judge's set too (each gun on a
  Trâu and a Đầu Đàn; `KILLS=` picks) and checks it: `cloudKeepsFoes`
  (live foes in the 480 × 340 px box keep a luma spread ≥ 0.12, ≥ 60 % of
  the box's and of their own at 4.5 s, every frame 0.3–4 s; a lone frame
  does not count), `cloudReads`, `emberStar`, `chunksLie` (the aftermath
  at 2–3 s over floors). Codex 035 was merged over it (28/10) with
  the 0.3–0.45 s life kept (`docs/changelog/2026-10-28-first-frame.md`).
- VFX pair (28/10, TS-M1-05, parent `docs/games/VFX_STANDARD.md`;
  `docs/changelog/2026-10-28-vfx-pair.md`, `FEEL_PASS_S1.md` §15): Pulse
  Gun and Heat Beam have all five phases. A: their muzzles gather the
  locked word (`CHARGE` in `type-rules.ts`, `TypeFeel.charge`/`gather`),
  let go on the load's frame; R: Xung's first star and a tongue 0.7–1.6 m
  out along the shot, its light 1.2 m off the hull, the core's load flash
  ×1.35 at 3 into these two guns; Tia's primer (`LIGHT.tiaPrime`); T: Tia's
  core in its own orange (`AFTER.tiaCore`, ≤ 0.3 white); F: Xung's
  scorches (`AFTER.scorch`, one each 100 ms), the hurt ship's smoke and
  sparks (`ShotFx.hurt`, `AFTER.hurt`; smoke lies on the deck in depth, so it
  trails beside the hull). Captures: `survival-vfx-pair.mjs`
  (`ACTIONS=xung,tia,hurt`, `VARIANT=lit`); the rules in
  `tests/vfx-pair.test.ts`. Scatter Gun, Rail Gun and Star Mortar are
  TS-M1-16.
- The design docs live in `docs/`; the parent repo's
  `docs/games/SPLIT_PLAN.md` explains the split and the theme.
