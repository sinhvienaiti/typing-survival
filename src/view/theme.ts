/**
 * The 3D side of the "Vành Chân Trời" theme (src/view/theme.css holds the
 * DOM side): one palette for the stage, the horde's "Bầy Hố Đen" layer and
 * the blows. Dark steel, hot orange, electric blue; red stays danger, teal
 * stays typing power (the kit's semantic colours).
 */
import * as THREE from "three";

export const PALETTE = {
  /** The page and the far void. */
  void: "#030405",
  steel: "#2a3138",
  steelDark: "#14181c",
  hot: "#ff7a1f",
  hotHi: "#ffb15c",
  ember: "#ff5512",
  volt: "#3db8ff",
  voltHi: "#a6e0ff",
  danger: "#ff3b3b",
  perfect: "#9ffff2",
  crit: "#ffc23a",
} as const;

/** Colours of the blows (src/view/combat.ts). */
export const BLOW = {
  white: new THREE.Color("#ffffff"),
  /** White-hot metal: muzzle cores, kill flashes. */
  hot: new THREE.Color("#fff0d8"),
  /** The swarm's death: hot orange. */
  swarm: new THREE.Color(PALETTE.hot),
  /** An elite's (scout's) death: an electric discharge. */
  elite: new THREE.Color(PALETTE.voltHi),
  volt: new THREE.Color(PALETTE.volt),
  crit: new THREE.Color(PALETTE.crit),
  perfect: new THREE.Color(PALETTE.perfect),
  danger: new THREE.Color(PALETTE.danger),
  ember: new THREE.Color(PALETTE.ember),
  /** Breaking metal: shards glow hot at first, then read as steel. */
  shardHot: new THREE.Color("#ff9448"),
  shardSteel: new THREE.Color("#6f7c88"),
  /** Foes spilling out at the gate. */
  spawn: new THREE.Color("#ff6a1a"),
  /** The near zone leaching the line: a dull red-orange. */
  drain: new THREE.Color("#ff3d1f"),
  /** The repair pod: typing teal (help, not a blow). */
  repair: new THREE.Color("#7ff5e0"),
  /** A Bọc Thép (armoured) foe's death: gold. */
  armour: new THREE.Color("#ffd27a"),
  // S1 guns (theme.css's --tan, --ray, --phao): Tán amber, Ray white-blue, Pháo Sao vermilion.
  tan: new THREE.Color("#ffc53d"),
  ray: new THREE.Color("#c4d2ff"),
  rayCore: new THREE.Color("#f2f7ff"),
  phao: new THREE.Color("#ff3f6c"),
  smoke: new THREE.Color("#58616b"),
  /** A blow Vỏ stopped: orange sparks bouncing back. */
  clank: new THREE.Color("#ff9a2e"),
  /** A clean magazine piercing Vỏ: a white-blue streak. */
  pierce: new THREE.Color("#bfe9ff"),
  /** Khiên's energy wall and its glass when it breaks. */
  shield: new THREE.Color("#4fc8ff"),
  glass: new THREE.Color("#9fe6ff"),
  /** Đầu Đàn's beacon: gold. */
  beacon: new THREE.Color("#ffcf4a"),
  /** A rift's crack: molten orange. */
  rift: new THREE.Color("#ff6a12"),
} as const;
