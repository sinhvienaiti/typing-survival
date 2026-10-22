# Agent guidance: Tuyến Cuối (typing-survival)

Tuyến Cuối (EN: Last Line) is a typing survival game: typed words load the
guns that hold a corridor against a horde. It was split out of Space Typing
(its "Sinh Tồn" mode, tag `survival-s0`) with its history.

- Port 3007, host `survival.typing-game.local`, learning `gameId`
  `typing-survival`. Run from the parent repo checkout
  (`/Users/toandx/htdocs/typing-game/games/typing-survival`).
- Commands: `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm check`,
  `pnpm survival:balance`, `pnpm survival:replay <replay.json>`,
  `pnpm visual scripts/visual/scenarios/survival-s0-boot.mjs --width=1280 --height=720`.
- Layout: `src/sim`, `src/content` (deterministic rules: no DOM, clock,
  `Math.random`, locale or trigonometry; same seed and log give the same
  hash in Node and Chrome), `src/view` (three.js), `src/app` (page, input,
  session), `src/feedback` (combat feedback), `docs/` (design and build notes).
- `src/kit/` is copied from the parent repo's `shared/game-kit` by
  `node scripts/sync-game-kit.mjs --target games/typing-survival` (run in the
  parent repo). Never edit it by hand; `pnpm check` verifies its sha256.
- `tests/boundary.test.ts`: `src/` imports only `src/**`, `three`,
  `three/examples/jsm/*`, `@fontsource/*`; never Space Typing paths.
- Models: Space Typing's library through the URL `/assets/space-typing/models/`
  (Vite plugin in dev, nginx alias in play). Never copy models here.
- No media in Git (images, audio, video, `.glb`, `.bin`); `public/assets/**`
  and `art-src/` are ignored. Code comments in English, short.
- Each update gets `docs/changelog/<date>-<topic>.md` (Vietnamese).
- The design docs live in `docs/`; the parent repo's
  `docs/games/SPLIT_PLAN.md` explains the split and the theme still to come.
