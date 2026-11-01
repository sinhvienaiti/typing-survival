/**
 * The typing feel on High and Ultra (wave 1 fix, 01/11/2026). The keys'
 * marks, the ship's core, the stream and the charge each key gathers at the
 * muzzles (TypeFeel) are a shared system with a bar of 9: L1's bloom (0.45,
 * 0.12) and Neutral tone mapping must not change them; main drew them under
 * the old bloom (0.85, 0.3) and ACES. FeelBloomPass draws only the typing
 * feel's pools (proxies sharing their geometry and material, in a scene of
 * their own: no lights, no new program) into a half-size buffer. L1's own
 * bloom chain carries what the marks add to its bright pass (the frame's
 * bright pass minus that of the frame without them) in the alpha channel,
 * blurred with the rest; its composite adds, mip for mip, what the old bloom
 * added minus what L1's adds (bloomWeight: 1.10 … 0.77 of the marks' share,
 * in the mip's colour), so the marks bloom as the old bloom bloomed them.
 * FeelOutputPass (three's OutputPass) tone maps each pixel toward ACES by the
 * marks' share of its light (their own and their bloom's): the marks and
 * their glare as on main, the rest Neutral. ?feel=gain,blend (debug only)
 * scales the two for A/B. One bloom chain: a second cost 3–4 ms a frame at
 * 1080p with MSAA. The marks themselves are drawn in the main scene as
 * before, with its depth.
 */
import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputShader } from "three/examples/jsm/shaders/OutputShader.js";

/**
 * UnrealBloomPass's mip factors and the light it adds of mip i. Its composite
 * weighs mip i strength × mix(f, 1.2 − f, radius) and writes as alpha
 * strength × the sum of those mixes (3 for five mips, whatever the radius;
 * the blur leaves every mip's alpha at 1), and blends additively by its alpha:
 * mip i adds 3 × strength² × mix(f, 1.2 − f, radius). The old bloom (0.85,
 * 0.3) added 1.65 … 0.95 of mips 1 … 5, L1's (0.45, 0.12) 0.55 … 0.18.
 */
const FACTORS = [1, 0.8, 0.6, 0.4, 0.2];
export const bloomWeight = (b: { strength: number; radius: number }, i: number): number => 3 * b.strength * b.strength * (FACTORS[i]! + b.radius * (1.2 - 2 * FACTORS[i]!));

/** The bright pass (three's LuminosityHighPassShader) with the marks' share of it, as luminance, in alpha. */
const BRIGHT = /* glsl */ `
#include <common>
uniform sampler2D tDiffuse;
uniform sampler2D tMarks;
uniform float uFeel;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
vec3 bright(vec3 texel) {
  return texel * smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, luminance(texel));
}
void main() {
  vec3 frame = texture2D(tDiffuse, vUv).rgb;
  vec3 lit = bright(frame);
  float marks = 0.0;
  if (uFeel > 0.0) marks = luminance(max(lit - bright(max(frame - texture2D(tMarks, vUv).rgb, 0.0)), 0.0));
  gl_FragColor = vec4(lit, marks);
}`;

/** three's separable blur, its alpha blurred too. */
const BLUR = /* glsl */ `
#include <common>
varying vec2 vUv;
uniform sampler2D colorTexture;
uniform vec2 invSize;
uniform vec2 direction;
uniform float gaussianCoefficients[KERNEL_RADIUS];
void main() {
  float weightSum = gaussianCoefficients[0];
  vec4 diffuseSum = texture2D(colorTexture, vUv) * weightSum;
  for (int i = 1; i < KERNEL_RADIUS; i ++) {
    float x = float(i);
    float w = gaussianCoefficients[i];
    vec2 uvOffset = direction * invSize * x;
    diffuseSum += (texture2D(colorTexture, vUv + uvOffset) + texture2D(colorTexture, vUv - uvOffset)) * w;
    weightSum += 2.0 * w;
  }
  gl_FragColor = diffuseSum / weightSum;
}`;

/** three's composite with its alpha folded in (written as 1), plus uFeelW[i] × the marks' share of mip i, in that mip's colour. */
const COMPOSITE = /* glsl */ `
varying vec2 vUv;
uniform sampler2D blurTexture1;
uniform sampler2D blurTexture2;
uniform sampler2D blurTexture3;
uniform sampler2D blurTexture4;
uniform sampler2D blurTexture5;
uniform float bloomStrength;
uniform float bloomRadius;
uniform float bloomFactors[NUM_MIPS];
uniform vec3 bloomTintColors[NUM_MIPS];
uniform float uFeelW[NUM_MIPS];
float lerpBloomFactor(const in float factor) {
  float mirrorFactor = 1.2 - factor;
  return mix(factor, mirrorFactor, bloomRadius);
}
// The marks' share of a blurred mip (its alpha: their luminance), as light of the mip's own colour.
vec3 marks(const in vec4 m) {
  return m.rgb * clamp(m.a / max(dot(m.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-5), 0.0, 1.0);
}
void main() {
  vec4 m1 = texture2D(blurTexture1, vUv);
  vec4 m2 = texture2D(blurTexture2, vUv);
  vec4 m3 = texture2D(blurTexture3, vUv);
  vec4 m4 = texture2D(blurTexture4, vUv);
  vec4 m5 = texture2D(blurTexture5, vUv);
  vec3 bloom = bloomStrength * (lerpBloomFactor(bloomFactors[0]) * bloomTintColors[0] * m1.rgb +
    lerpBloomFactor(bloomFactors[1]) * bloomTintColors[1] * m2.rgb +
    lerpBloomFactor(bloomFactors[2]) * bloomTintColors[2] * m3.rgb +
    lerpBloomFactor(bloomFactors[3]) * bloomTintColors[3] * m4.rgb +
    lerpBloomFactor(bloomFactors[4]) * bloomTintColors[4] * m5.rgb);
  float alpha = bloomStrength * (lerpBloomFactor(bloomFactors[0]) + lerpBloomFactor(bloomFactors[1]) + lerpBloomFactor(bloomFactors[2]) +
    lerpBloomFactor(bloomFactors[3]) + lerpBloomFactor(bloomFactors[4]));
  vec3 feel = uFeelW[0] * marks(m1) + uFeelW[1] * marks(m2) + uFeelW[2] * marks(m3) + uFeelW[3] * marks(m4) + uFeelW[4] * marks(m5);
  gl_FragColor = vec4(alpha * bloom + feel, 1.0);
}`;

/** three's OutputShader, the pixel tone mapped toward ACES by the marks' share of its light. */
const OUTPUT = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D tMarks;
uniform sampler2D tMip1;
uniform sampler2D tMip2;
uniform sampler2D tMip3;
uniform sampler2D tMip4;
uniform sampler2D tMip5;
uniform float uOldW[5];
uniform float uOn;
uniform float uBlend;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 base(vec3 c) {
  #if defined(LINEAR_TONE_MAPPING)
    return LinearToneMapping(c);
  #elif defined(REINHARD_TONE_MAPPING)
    return ReinhardToneMapping(c);
  #elif defined(CINEON_TONE_MAPPING)
    return CineonToneMapping(c);
  #elif defined(ACES_FILMIC_TONE_MAPPING)
    return ACESFilmicToneMapping(c);
  #elif defined(AGX_TONE_MAPPING)
    return AgXToneMapping(c);
  #elif defined(NEUTRAL_TONE_MAPPING)
    return NeutralToneMapping(c);
  #else
    return c;
  #endif
}
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  vec3 tone = base(c.rgb);
  if (uOn > 0.0) {
    float marks = lum(texture2D(tMarks, vUv).rgb) + uOldW[0] * texture2D(tMip1, vUv).a + uOldW[1] * texture2D(tMip2, vUv).a +
      uOldW[2] * texture2D(tMip3, vUv).a + uOldW[3] * texture2D(tMip4, vUv).a + uOldW[4] * texture2D(tMip5, vUv).a;
    float share = clamp(marks / max(lum(c.rgb), 1e-4), 0.0, 1.0);
    if (share > 0.0) tone = mix(tone, ACESFilmicToneMapping(c.rgb), share * uBlend);
  }
  gl_FragColor = vec4(tone, c.a);
  #ifdef SRGB_TRANSFER
    gl_FragColor = sRGBTransferOETF(gl_FragColor);
  #endif
}`;

const TONE_DEFINES: Partial<Record<THREE.ToneMapping, string>> = {
  [THREE.LinearToneMapping]: "LINEAR_TONE_MAPPING",
  [THREE.ReinhardToneMapping]: "REINHARD_TONE_MAPPING",
  [THREE.CineonToneMapping]: "CINEON_TONE_MAPPING",
  [THREE.ACESFilmicToneMapping]: "ACES_FILMIC_TONE_MAPPING",
  [THREE.AgXToneMapping]: "AGX_TONE_MAPPING",
  [THREE.NeutralToneMapping]: "NEUTRAL_TONE_MAPPING",
};

/** The composer's last pass in place of three's OutputPass: tone mapping and sRGB, toward ACES where the marks light the pixel. */
class FeelOutputPass extends Pass {
  readonly uniforms: Record<string, THREE.IUniform>;
  private readonly material: THREE.RawShaderMaterial;
  private readonly quad: FullScreenQuad;
  private colorSpace: string | null = null;
  private toneMapping: THREE.ToneMapping | null = null;

  constructor(marks: THREE.Texture, bloom: UnrealBloomPass, on: THREE.IUniform<number>, old: { strength: number; radius: number }, blend: number) {
    super();
    const mip = (i: number) => ({ value: bloom.renderTargetsVertical[i]!.texture });
    this.uniforms = {
      tDiffuse: { value: null }, toneMappingExposure: { value: 1 }, tMarks: { value: marks },
      tMip1: mip(0), tMip2: mip(1), tMip3: mip(2), tMip4: mip(3), tMip5: mip(4),
      uOldW: { value: FACTORS.map((_, i) => bloomWeight(old, i)) }, uOn: on, uBlend: { value: blend },
    };
    this.material = new THREE.RawShaderMaterial({ name: "FeelOutputShader", uniforms: this.uniforms, vertexShader: OutputShader.vertexShader, fragmentShader: OUTPUT });
    this.quad = new FullScreenQuad(this.material);
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    this.uniforms.tDiffuse!.value = readBuffer.texture;
    this.uniforms.toneMappingExposure!.value = renderer.toneMappingExposure;
    if (this.colorSpace !== renderer.outputColorSpace || this.toneMapping !== renderer.toneMapping) {
      this.colorSpace = renderer.outputColorSpace;
      this.toneMapping = renderer.toneMapping;
      const defines: Record<string, string> = {};
      if (THREE.ColorManagement.getTransfer(this.colorSpace) === THREE.SRGBTransfer) defines.SRGB_TRANSFER = "";
      const tone = TONE_DEFINES[this.toneMapping];
      if (tone !== undefined) defines[tone] = "";
      this.material.defines = defines;
      this.material.needsUpdate = true;
    }
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    }
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    this.quad.dispose();
  }
}

export class FeelBloomPass extends Pass {
  /** Any of the typing feel's billboards or streaks drawn this frame (TypeFeel sets it). */
  lit = false;
  /** Off for the scenarios' control frames (TypeFeel.show): the marks add nothing to the bloom or the tone. */
  shown = true;
  /** The composer's last pass (after `bloom`), in place of three's OutputPass. */
  readonly output: Pass;
  private readonly scene = new THREE.Scene();
  private readonly target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly feel: THREE.IUniform<number> = { value: 0 };
  private readonly feelW: THREE.IUniform<number[]> = { value: [0, 0, 0, 0, 0] };
  private readonly clearColor = new THREE.Color();

  /** Gives `bloom` (it runs after this pass) the marks' share of its bright pass, weighed as the bloom `old` weighed it. */
  constructor(private readonly camera: THREE.Camera, private readonly bloom: UnrealBloomPass, private readonly old: { strength: number; radius: number }, private readonly gain: number, blend: number) {
    // (three's bright pass also blended to a default colour and opacity, black and 0: the alpha now carries the marks.)
    super();
    this.needsSwap = false;
    const bright = bloom.highPassUniforms as Record<string, THREE.IUniform>;
    bright.tMarks = { value: this.target.texture };
    bright.uFeel = this.feel;
    bloom.materialHighPassFilter = new THREE.ShaderMaterial({ uniforms: bright, vertexShader: bloom.materialHighPassFilter.vertexShader, fragmentShader: BRIGHT });
    for (const blur of bloom.separableBlurMaterials) {
      blur.fragmentShader = BLUR;
      blur.needsUpdate = true;
    }
    bloom.compositeMaterial.uniforms.uFeelW = this.feelW;
    bloom.compositeMaterial.fragmentShader = COMPOSITE;
    bloom.compositeMaterial.needsUpdate = true;
    this.output = new FeelOutputPass(this.target.texture, bloom, this.feel, old, blend);
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
  }

  override render(renderer: THREE.WebGLRenderer): void {
    const on = this.lit && this.shown;
    this.feel.value = on ? 1 : 0;
    // What the old bloom added of each mip over the live one (?bloom= A/B included).
    for (let i = 0; i < FACTORS.length; i += 1) this.feelW.value[i] = on ? this.gain * Math.max(0, bloomWeight(this.old, i) - bloomWeight(this.bloom, i)) : 0;
    if (!on) return;
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
  }

  override dispose(): void {
    this.target.dispose();
    this.output.dispose();
  }
}
