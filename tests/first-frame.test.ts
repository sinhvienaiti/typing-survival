import * as THREE from "three";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CELL, FLAT, Glows } from "../src/view/fx";
import { LIGHT, lightLevel } from "../src/view/gun-rules";
import { GunLights, deckLightUniforms } from "../src/view/lights";

const F = 1 / 60;
const white = new THREE.Color(1, 1, 1);
const data = (g: Glows, name: "iColor" | "iPos" | "iSize") => g.mesh.geometry.getAttribute(name).array;
const alpha = (g: Glows, i = 0) => i < g.mesh.geometry.instanceCount ? data(g, "iColor")[i * 4 + 3]! : 0;
const frame = (g: Glows, dt = F) => { g.step(dt); g.flush(); };
const rounded = (values: number[]) => values.map((v) => Number(v.toFixed(6)));

beforeAll(() => vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => null }) }));
afterAll(() => vi.unstubAllGlobals());

describe("first frame", () => {
  it("1: a three-frame star starts whole and fades once per frame", () => {
    const g = new Glows(8);
    g.burst(CELL.star4, 0, 0, 0, 1, 1, 3 * F, white, 3);
    const values: number[] = [];
    for (let n = 0; n < 4; n += 1) { frame(g); values.push(alpha(g)); }
    console.log("035 star3F", JSON.stringify(rounded(values)));
    [1, 4 / 9, 1 / 9, 0].forEach((v, n) => expect(values[n]).toBeCloseTo(v, 5));
    expect(data(g, "iColor")[0]).toBe(3);
    expect(values[3]).toBeLessThanOrEqual(1e-6);
  });

  it("2: two to six-frame bursts have exactly one full frame and their designed visible life", () => {
    const rows = [2, 3, 4, 5, 6].map((life) => {
      const g = new Glows(8);
      g.burst(CELL.soft, 0, 0, 0, 1, 1, life * F, white, 1);
      const values: number[] = [];
      for (let n = 0; n < life + 2; n += 1) { frame(g); values.push(alpha(g)); }
      return { life, values };
    });
    for (const row of rows) console.log("035 burst", row.life + "F", JSON.stringify(rounded(row.values)));
    for (const { life, values } of rows) {
      expect(values.filter((v) => v > 1e-6)).toHaveLength(life);
      expect(values.filter((v) => Math.abs(v - 1) < 1e-6)).toHaveLength(1);
      values.forEach((v, n) => expect(v).toBeCloseTo(n < life ? (1 - n * F / (life * F)) ** 2 : 0, 5));
    }
  });

  it("3: position, size and angle start at creation and advance on the next step", () => {
    const g = new Glows(8);
    g.burst(CELL.ring + FLAT, 2, 0.5, -4, 1, 3, 0.5, white, 1, 6, 0, -12, 3, 0.25);
    frame(g);
    expect(Array.from(data(g, "iPos").slice(0, 4))).toEqual([2, 0.5, -4, CELL.ring + FLAT]);
    expect(Array.from(data(g, "iSize").slice(0, 2))).toEqual([1, 0.25]);
    frame(g);
    const k = F / 0.5;
    [2 + 6 * F, 0.5, -4 - 12 * F, CELL.ring + FLAT].forEach((v, i) => expect(data(g, "iPos")[i]).toBeCloseTo(v, 5));
    [1 + 2 * (1 - (1 - k) ** 2), 0.25 + 3 * F].forEach((v, i) => expect(data(g, "iSize")[i]).toBeCloseTo(v, 5));
  });

  it("4: embers, smoke scorches and rising puffs keep their own fade curves", () => {
    const embers = new Glows(8);
    const smoke = new Glows(8, true);
    embers.burst(CELL.soft + FLAT, 0, 0, 0, 1, 2, 3.5, white, 2);
    smoke.burst(CELL.soft + FLAT, 0, 0, 0, 1, 2, 9, white, 0.8);
    smoke.burst(CELL.puff, 0, 0, 0, 1, 2, 3.5, white, 0.75);
    frame(embers); frame(smoke);
    expect(alpha(embers)).toBe(1);
    expect(alpha(smoke)).toBeCloseTo(0.8, 5);
    expect(alpha(smoke, 1)).toBe(0);
    frame(embers); frame(smoke);
    const k = F / 3.5;
    expect(alpha(embers)).toBeCloseTo(1 - k * k, 5);
    expect(alpha(smoke)).toBeCloseTo((1 - (F / 9) ** 4) * 0.8, 5);
    expect(alpha(smoke, 1)).toBeCloseTo(Math.min(1, 20 * k) * (1 - k * k) * 0.75, 5);
  });

  it("5: draw-phase bursts precede ordered stamps and leave no stale instance slots", () => {
    const g = new Glows(8);
    for (const name of ["iColor", "iPos", "iSize"] as const) data(g, name).fill(NaN);
    g.burst(CELL.star4, 10, 0, 0, 1, 2, 0.3, white, 1);
    g.step(F);
    g.stamp(CELL.soft, 20, 1, 2, 3, 0.1, white, 0.2);
    g.stamp(CELL.ring, 30, 2, 3, 4, 0.2, white, 0.3);
    g.burst(CELL.star8, 40, 0, 0, 1, 2, 0.45, white, 1);
    g.stamp(CELL.flare, 50, 3, 4, 5, 0.3, white, 0.4);
    g.flush();
    expect(g.mesh.geometry.instanceCount).toBe(5);
    for (const [name, stride] of [["iColor", 4], ["iPos", 4], ["iSize", 2]] as const) {
      expect(Array.from(data(g, name).slice(0, 5 * stride)).every(Number.isFinite)).toBe(true);
    }
    expect([alpha(g, 0), alpha(g, 1)]).toEqual([1, 1]);
    [20, 30, 50].forEach((x, i) => {
      const slot = i + 2;
      expect(data(g, "iPos")[slot * 4]).toBe(x);
      expect(data(g, "iColor")[slot * 4]).toBeCloseTo(0.2 + i * 0.1, 5);
      expect(data(g, "iSize")[slot * 2]).toBe(3 + i);
    });
    frame(g);
    expect(g.mesh.geometry.instanceCount).toBe(2);
    expect(alpha(g, 1)).toBeCloseTo((1 - F / 0.45) ** 2, 5);
  });

  it("6: three paused frames keep a new burst at full alpha", () => {
    const g = new Glows(8);
    g.burst(CELL.soft, 0, 0, 0, 1, 2, 3 * F, white, 1);
    for (let n = 0; n < 3; n += 1) { frame(g, 0); expect(alpha(g)).toBe(1); }
  });

  it("7: each flash matches held power at age zero and then follows lightLevel", () => {
    const rows = Object.entries(LIGHT).filter(([, spec]) => spec.life > 0).map(([name, spec]) => {
      const g = new GunLights(new THREE.Scene(), deckLightUniforms(), 4);
      const held = new GunLights(new THREE.Scene(), deckLightUniforms(), 4);
      const values: number[] = [];
      g.flash(spec, 0, 0, 0, white);
      for (let n = 0; n < Math.ceil(spec.life / F) + 2; n += 1) {
        held.hold(1, LIGHT.tiaSlide, 0, 0, 0, white, spec.power);
        held.update(F); g.update(F);
        values.push(g.lights[0]!.intensity / held.lights[0]!.intensity);
      }
      return { name, spec, values };
    });
    for (const row of rows) console.log("035 light", row.name, JSON.stringify(rounded(row.values)));
    for (const { spec, values } of rows) {
      expect(values[0]).toBeCloseTo(1, 5);
      expect(values.filter((v) => Math.abs(v - 1) < 1e-6)).toHaveLength(1);
      values.forEach((v, n) => expect(v).toBeCloseTo(lightLevel(n * F, spec.life), 5));
    }
    // A flash made after update still starts whole on its next update.
    const late = new GunLights(new THREE.Scene(), deckLightUniforms(), 1);
    late.update(F);
    late.flash(LIGHT.ray, 0, 0, 0, white, 0.6);
    late.update(F);
    expect(late.lights[0]!.intensity).toBeCloseTo(3 * 0.6 * 26, 5);
    late.update(F);
    expect(late.lights[0]!.intensity).toBeCloseTo(3 * 0.6 * 26 * lightLevel(F, LIGHT.ray.life), 5);
  });

  it("8: a new Ray flash lights the floor at full colour and power", () => {
    const deck = deckLightUniforms();
    const g = new GunLights(new THREE.Scene(), deck, 4);
    g.flash(LIGHT.ray, 0, 0, 0, new THREE.Color(0.5, 0.25, 1));
    g.update(F);
    [2.1, 1.05, 4.2].forEach((v, i) => expect(deck.uLightColor.value[0]!.getComponent(i)).toBeCloseTo(v, 5));
  });

  it("9: held lights keep their power until no longer held", () => {
    const g = new GunLights(new THREE.Scene(), deckLightUniforms(), 1);
    // Reusing a fresh flash as a hold must not leave a pending flash.
    g.flash(LIGHT.xung, 0, 0, 0, white);
    for (let n = 0; n < 3; n += 1) {
      g.hold(1, LIGHT.tia, 0, 0, 0, white);
      g.update(F);
      expect(g.lights[0]!.intensity).toBeCloseTo(23.4, 5);
    }
    g.update(F);
    expect(g.lights[0]!.intensity).toBe(0);
  });
});
