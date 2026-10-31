/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The Typing Feel host's origin (parent docs/games/TYPING_FEEL_SERVICE.md
   * §5.1), set by the build script: `https://feel.typing-game.local` from the
   * parent repo's build:survival (build:local) and dev:survival:app. No value in
   * code: unset (a standalone clone, CI) turns Typing Feel off, and the game
   * plays on with Off and Relay.
   */
  readonly VITE_TYPING_FEEL_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
