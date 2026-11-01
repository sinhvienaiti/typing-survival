/**
 * The typing feel's own bloom on High and Ultra (wave 1 fix, 01/11/2026).
 * The keys' marks, the ship's core and the stream (TypeFeel) are a shared
 * system with a bar of 9: L1's tighter bloom (BLOOM) must not change them.
 * Bloom adds strength × Σ factor(mip) × mip of the frame's bright pass, and
 * the old bloom (0.85, 0.3) minus L1's (0.45, 0.12) is 0.24 for every one of
 * the five mips; at radius 0.5 a bloom weighs them flat (0.6), so strength
 * 0.4 adds exactly that difference (BLOOM.feel; tests/vfx-pair.test.ts).
 * This pass gives it only what the marks add to the bright pass: the
 * frame's bright pass minus the bright pass of the frame without them (the
 * marks are drawn alone, from proxies sharing their pools' geometry and
 * material in a scene of their own, into a half-size buffer). A mark over the
 * lit hull blooms as it did, the guns keep L1's bloom. The marks themselves
 * are drawn in the main scene as before, with its depth. Skipped on frames
 * with no mark (`lit`), after a first frame that compiles its program.
 */
import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const MARKS_BRIGHT = /* glsl */ `
#include <common>
uniform sampler2D tDiffuse;
uniform sampler2D tMarks;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
vec4 bright(vec4 texel) {
  float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, luminance(texel.rgb));
  return mix(vec4(defaultColor, defaultOpacity), texel, alpha);
}
void main() {
  vec4 frame = texture2D(tDiffuse, vUv);
  vec4 rest = max(frame - vec4(texture2D(tMarks, vUv).rgb, 0.0), 0.0);
  gl_FragColor = max(bright(frame) - bright(rest), 0.0);
}`;

export class FeelBloomPass extends Pass {
  /** Any of the typing feel's billboards or streaks drawn this frame (TypeFeel sets it). */
  lit = false;
  private primed = false;
  private readonly scene = new THREE.Scene();
  private readonly target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly bloom: UnrealBloomPass;
  private readonly clearColor = new THREE.Color();

  constructor(private readonly camera: THREE.Camera, strength: number, radius: number, threshold: number) {
    super();
    this.needsSwap = false;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold);
    // Its bright pass reads the frame (render() sets tDiffuse) and the marks alone.
    const uniforms = this.bloom.highPassUniforms as Record<string, THREE.IUniform>;
    uniforms.tMarks = { value: this.target.texture };
    this.bloom.materialHighPassFilter = new THREE.ShaderMaterial({ uniforms, vertexShader: this.bloom.materialHighPassFilter.vertexShader, fragmentShader: MARKS_BRIGHT });
  }

  /** Draws `mesh` (a typing feel pool) into this pass too. */
  add(mesh: THREE.Mesh): void {
    const proxy = new THREE.Mesh(mesh.geometry, mesh.material);
    proxy.frustumCulled = false;
    proxy.renderOrder = mesh.renderOrder;
    this.scene.add(proxy);
  }

  override setSize(width: number, height: number): void {
    this.target.setSize(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2)));
    this.bloom.setSize(width, height);
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    if (!this.lit && this.primed) return;
    this.primed = true;
    renderer.getClearColor(this.clearColor);
    const alpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.scene, this.camera);
    renderer.setClearColor(this.clearColor, alpha);
    renderer.autoClear = autoClear;
    // The bloom of what the marks add, laid over the frame (the pass keeps autoClear off while it blends).
    this.bloom.render(renderer, writeBuffer, readBuffer, 0, false);
  }

  override dispose(): void {
    this.target.dispose();
    this.bloom.dispose();
  }
}
