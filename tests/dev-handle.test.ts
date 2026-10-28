import { describe, expect, it } from "vitest";
import { devHandleWanted } from "../src/app/dev";

describe("dev handle gating", () => {
  it.each([
    [true, "", true],
    [true, "?debug=0", true],
    [false, "", false],
    [false, "?debug=1", true],
    [false, "?card=1&debug=1", true],
    [false, "?debug=0", false],
    [false, "?debug=", false],
    [false, "?debug=true", false],
    [false, "?nodebug=1", false],
  ])("dev=%s, search=%j enables the handle: %s", (dev, search, wanted) => {
    expect(devHandleWanted(dev, search)).toBe(wanted);
  });
});
