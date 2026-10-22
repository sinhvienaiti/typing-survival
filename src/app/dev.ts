/**
 * window.__survival: what the browser scenarios (scripts/visual/scenarios/
 * survival-s0-*.mjs) read and drive; main.ts builds it. It changes a run only
 * through the commands a player could send (plus a dev flood and the view's
 * frame clock), so a scenario's log replays in Node like any other
 * (scripts/replay.ts).
 */
export function installDevHandle(handle: object): void {
  (window as unknown as { __survival?: object }).__survival = handle;
}
