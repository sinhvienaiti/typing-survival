// UI art in the browser (ticket 206; icons and parts of 149–153, sliders of 225, 31/10):
// Claude runs it at 1280×720 and 1920×1080; captures stay in OUT_DIR.
//   URL=http://127.0.0.1:3007/ OUT_DIR=tmp/ui-wire node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-ui-art.mjs --width=1280 --height=720
// Every screen that shows UI art: title, options, profile, armory, campaign, briefing, loadout,
// the stage card, the HUD in three fights (stage 1, the hunt's objective plate, a rift's warning
// with a typed streak, the input notice), pause, the Settings and Sound panels, the results of a
// win and a loss, and the no-WebGL message (review fixes 31/10).
// Checks: every art image loaded, drawn at its BOX size × --ui, inside the window; no element
// spills sideways; every card fits without scrolling; key caps, magazine cells and the slider
// skin use their art; magazine cells 10 × 28 px × --ui in their gun's colour, urgent in a full
// bay; the Rift icon and arrow ≥ 3:1 on their chips; only pending roles warn; no console error.
// UI pass 2 (31/10): the ticket 127 frames on panels, rows, cards, HUD plates, bays, chips, the
// banner and the quick panels; the quick panels' gear, speakers and row icons (ticket 180 and the
// Options art); every groove the same length and lit up to its knob; one rift chip with text and
// a mark on the corridor wall; the banner and the stars measured after their pop.
// Ticket 121 (31/10): the six screen backgrounds and the title logo (an h1 clear of the card, the menu
// and the corner buttons); every UI art request's status; on each background screen the contrast of
// the main card's text against the pixels behind it (a second frame with the text made transparent).
// Pages open with debug=1, so it also runs on a production build (URL=https://survival.typing-game.local/).
// Judge fixes (31/10): the corner gear and speaker ≥ 3 : 1 on every background screen, the stage art band
// inside the panel frame's rails, the logo's "Last" against the ring round it.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { DEV_URL, out } from "./common.mjs";
import { press, sv } from "./survival-s0-lib.mjs";

// Read BOX from its single source, without importing TypeScript in the CDP runner.
const source = readFileSync(new URL("../../../src/view/ui-art.ts", import.meta.url), "utf8");
const boxes = Object.fromEntries([...source.matchAll(/(\w+): \{ width: (\d+), height: (\d+) \}/g)].map(([, key, w, h]) => [key, { width: Number(w), height: Number(h) }]));
const selection = JSON.parse(readFileSync(new URL("../../ui-art/selection.json", import.meta.url), "utf8"));
const accepted = new Set(selection.entries.filter((e) => e.accepted).map((e) => e.role));
const pending = new Set(selection.entries.filter((e) => !e.accepted && !accepted.has(e.role)).map((e) => e.role));
const base = DEV_URL.replace(/\/$/, "");
const key = (page, code) => page.key(code, { code });
/** The screens with a background of their own (ticket 121): capture name → role. */
const BACKGROUNDS = { menu: "bg-menu", journey: "bg-journey", briefing: "bg-briefing", loadout: "bg-loadout", "results-win": "bg-results-win", "results-lose": "bg-results-lose" };
/** A rail beside the stage art may differ from the rail below it by this much (largest channel mean, 0–255). */
const RAIL_DIFF = 8;
/** "Last"'s faces against the ring round them (judge 31/10). */
const LOGO_RING = 3;
const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
/**
 * Each text run of the screen's main card against what is behind it: the run's colour against every
 * pixel of its box (the line box less 15 % top and bottom, where the glyphs are) in a frame shot with
 * all text transparent. p5 is the worst 5 % of those pixels; WCAG asks 4.5 : 1, 3 : 1 for large text
 * (24 px, or 18.66 px bold). Key names sit on the key cap art (ticket 153), not on the background:
 * reported apart, as `keycaps`.
 */
async function textContrast(page, file) {
  const runs = await page.eval(`(() => {
    const card = document.querySelector('.sv-overlay.is-on .sv-card'); if (!card) return [];
    const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT), runs = [];
    for (let n; (n = walk.nextNode());) {
      const text = n.textContent.trim(), el = n.parentElement, cs = getComputedStyle(el);
      if (!text || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width >= 3 && r.height >= 6) runs.push({ text: text.slice(0, 32), color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), key: !!el.closest('kbd'), box: [r.left, r.top + 0.15 * r.height, r.width, 0.7 * r.height] });
    }
    return runs;
  })()`);
  await page.eval("(() => { const s = document.createElement('style'); s.id = 'ui-art-bare'; s.textContent = '.sv-overlay.is-on, .sv-overlay.is-on * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; text-shadow: none !important; transition: none !important; }'; document.head.append(s); return true; })()");
  await page.sleep(150);
  await page.shot(file);
  await page.eval("(document.getElementById('ui-art-bare')?.remove(), true)");
  const magick = process.env.ART_MAGICK || "magick";
  const [w, h] = spawnSync(magick, ["identify", "-format", "%w %h", file], { encoding: "utf8" }).stdout.trim().split(" ").map(Number);
  const px = spawnSync(magick, [file, "-depth", "8", "rgb:-"], { maxBuffer: 64 << 20 }).stdout, scale = w / page.width;
  const measured = runs.map((run) => {
    const [r, g, b] = (run.color.match(/[\d.]+/g) || []).map(Number), text = lum(r, g, b), ratios = [];
    const [x0, y0, bw, bh] = run.box.map((v) => v * scale);
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y0 + bh)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x0 + bw)); x++) {
      const i = (y * w + x) * 3, back = lum(px[i], px[i + 1], px[i + 2]);
      ratios.push((Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05));
    }
    ratios.sort((a, b) => a - b);
    const at = (q) => Math.round(ratios[Math.min(ratios.length - 1, Math.floor(q * ratios.length))] * 100) / 100;
    const need = run.size >= 24 || (run.size >= 18.66 && run.weight >= 700) ? 3 : 4.5;
    return { text: run.text, size: run.size, key: run.key, need, p5: at(0.05), median: at(0.5), pass: at(0.05) >= need };
  });
  const sum = (list) => {
    const worst = list.reduce((a, m) => (!a || m.p5 / m.need < a.p5 / a.need ? m : a), null), medians = list.map((m) => m.median).sort((a, b) => a - b);
    return { runs: list.length, worst, medianOfRuns: medians[Math.floor(medians.length / 2)] ?? null, failing: list.filter((m) => !m.pass) };
  };
  return { ...sum(measured.filter((m) => !m.key)), keycaps: sum(measured.filter((m) => m.key)) };
}

/** A shot's pixels: [width, height, rgb bytes]. */
function pixels(file) {
  const magick = process.env.ART_MAGICK || "magick";
  const [w, h] = spawnSync(magick, ["identify", "-format", "%w %h", file], { encoding: "utf8" }).stdout.trim().split(" ").map(Number);
  return [w, h, spawnSync(magick, [file, "-depth", "8", "rgb:-"], { maxBuffer: 64 << 20 }).stdout];
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const round2 = (v) => Math.round(v * 100) / 100;

/**
 * The quick panels' corner gear and speaker against what is behind them (judge, 31/10: bare on the
 * bright ring, 1.9 : 1 on the title): each icon's alpha-weighted mean colour against every pixel of
 * its button in a frame shot with both icons hidden. p90 is the ratio at the worst 10 % of those
 * pixels (the brightest, the icons being light); a control needs 3 : 1.
 */
export async function cornerContrast(page, file) {
  const icons = await page.eval(`(() => [...document.querySelectorAll('.kit-qs__corner')].filter(b => b.getClientRects().length > 0).map(b => {
    const i = b.querySelector('img'), r = b.getBoundingClientRect(), box = [r.left, r.top, r.width, r.height];
    if (!i || !i.naturalWidth) return { role: '', box, mean: null };
    const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let R = 0, G = 0, B = 0, A = 0;
    for (let k = 0; k < d.length; k += 4) { const w = d[k + 3] / 255; R += d[k] * w; G += d[k + 1] * w; B += d[k + 2] * w; A += w; }
    return { role: (/\\/([\\w-]+)\\.\\d+\\.webp/.exec(i.currentSrc || i.src) || [])[1] || '', box, mean: [R / A, G / A, B / A] };
  }))()`);
  await page.eval("(() => { const s = document.createElement('style'); s.id = 'ui-art-corners'; s.textContent = '.kit-qs__corner img { visibility: hidden !important; }'; document.head.append(s); return true; })()");
  await page.sleep(120);
  await page.shot(file);
  await page.eval("(document.getElementById('ui-art-corners')?.remove(), true)");
  const [w, h, px] = pixels(file), scale = w / page.width;
  return icons.map((icon) => {
    if (!icon.mean) return { role: icon.role, p90: 0, median: 0, pass: false };
    const fg = lum(...icon.mean), [x0, y0, bw, bh] = icon.box.map((v) => v * scale), backs = [];
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y0 + bh)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x0 + bw)); x++) { const i = (y * w + x) * 3; backs.push(lum(px[i], px[i + 1], px[i + 2])); }
    const ratios = backs.map((b) => ratio(fg, b)).sort((a, b) => a - b), at = (q) => round2(ratios[Math.min(ratios.length - 1, Math.floor(q * ratios.length))]);
    backs.sort((a, b) => a - b);
    return { role: icon.role, icon: Math.round(fg * 1000) / 1000, back50: Math.round(backs[backs.length >> 1] * 1000) / 1000, back90: Math.round(backs[Math.floor(0.9 * backs.length)] * 1000) / 1000, p90: at(0.1), median: at(0.5), pass: at(0.1) >= 3 };
  });
}

/**
 * The stage card's side rails beside its stage art band (judge, 31/10: the band covered them). Each
 * rail strip (1.5–7.5 px × --ui in from the card's edge) is averaged over the band's rows and over the
 * rules' rows below; an unbroken rail looks the same in both (largest channel difference, 0–255).
 */
function railCheck(file, brief, page) {
  const [w, h, px] = pixels(file), scale = w / page.width, ui = brief.ui;
  const mean = (x0, x1, y0, y1) => {
    const sum = [0, 0, 0]; let n = 0;
    for (let y = Math.max(0, Math.round(y0 * scale)); y < Math.min(h, Math.round(y1 * scale)); y++) for (let x = Math.max(0, Math.round(x0 * scale)); x < Math.min(w, Math.round(x1 * scale)); x++) { const i = (y * w + x) * 3; sum[0] += px[i]; sum[1] += px[i + 1]; sum[2] += px[i + 2]; n++; }
    return sum.map((v) => v / Math.max(1, n));
  };
  const side = (x0, x1) => { const at = mean(x0, x1, brief.band[1], brief.band[3]), below = mean(x0, x1, brief.rules[1], brief.rules[3]); return Math.round(Math.max(...at.map((v, k) => Math.abs(v - below[k])))); };
  return {
    insetLeft: round2(brief.band[0] - brief.card[0]), insetRight: round2(brief.card[2] - brief.band[2]), bandWidth: round2(brief.band[2] - brief.band[0]),
    left: side(brief.card[0] + 1.5 * ui, brief.card[0] + 7.5 * ui), right: side(brief.card[2] - 7.5 * ui, brief.card[2] - 1.5 * ui),
  };
}

/**
 * The title logo against the ring behind it (judge, 31/10: "Last" sat on the ring's brightest part and
 * read only through its thin dark rims). From the logo's own alpha at its drawn size: the letters'
 * faces (alpha > 0.9) and a band 2–10 px × --ui outside them, read from the shot (halo included);
 * "Last" and "Line" split at the logo's thinnest column near its middle. ratio = faces' median against
 * the band's median luminance.
 */
export async function logoRing(page, file) {
  const m = await page.eval(`(() => { const i = document.querySelector('.sv-overlay.is-on img.sv-art-logo'); if (!i || !i.naturalWidth) return null;
    const r = i.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height), c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data; let s = '';
    for (let k = 3; k < d.length; k += 4) s += String.fromCharCode(d[k]);
    return { box: [Math.round(r.left), Math.round(r.top), w, h], alpha: btoa(s), ui: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) }; })()`);
  if (!m) return null;
  const [W, H, px] = pixels(file), [bx, by, bw, bh] = m.box, alpha = Buffer.from(m.alpha, "base64");
  if (W !== page.width) return null;
  const near = Math.max(1, Math.round(2 * m.ui)), far = Math.round(10 * m.ui), pad = far + 1, gw = bw + 2 * pad, gh = bh + 2 * pad;
  const mask = new Uint8Array(gw * gh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (alpha[y * bw + x] > 127) mask[(y + pad) * gw + x + pad] = 1;
  // Chebyshev dilation by r: a square max, rows then columns.
  const dilate = (src, r) => {
    const a = new Uint8Array(src.length), b = new Uint8Array(src.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let v = 0; for (let k = Math.max(0, x - r); k <= Math.min(gw - 1, x + r) && !v; k++) v = src[y * gw + k]; a[y * gw + x] = v; }
    for (let x = 0; x < gw; x++) for (let y = 0; y < gh; y++) { let v = 0; for (let k = Math.max(0, y - r); k <= Math.min(gh - 1, y + r) && !v; k++) v = a[k * gw + x]; b[y * gw + x] = v; }
    return b;
  };
  const inner = dilate(mask, near), outer = dilate(mask, far);
  let split = Math.round(bw / 2), least = Infinity;
  for (let x = Math.round(0.38 * bw); x < Math.round(0.6 * bw); x++) { let s = 0; for (let y = 0; y < bh; y++) s += alpha[y * bw + x]; if (s < least) { least = s; split = x; } }
  const part = (from, to) => {
    const faces = [], band = [];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const bxl = x - pad, sx = bx + bxl, sy = by + y - pad;
      if (bxl < from || bxl >= to || sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const i = (sy * W + sx) * 3, L = lum(px[i], px[i + 1], px[i + 2]), inBox = bxl >= 0 && bxl < bw && y >= pad && y < pad + bh;
      if (inBox && alpha[(y - pad) * bw + bxl] > 230) faces.push(L);
      else if (outer[y * gw + x] && !inner[y * gw + x]) band.push(L);
    }
    const med = (list) => list.sort((a, b) => a - b)[list.length >> 1] ?? 0;
    const face = med(faces), ring = med(band);
    return { face: Math.round(face * 1000) / 1000, ring: Math.round(ring * 1000) / 1000, ratio: round2(ratio(face, ring)) };
  };
  return { split, last: part(-pad, split), line: part(split, bw + pad) };
}

export default async function (page) {
  const size = page.width + "x" + page.height, screens = [], shots = [];
  const ready = async () => {
    for (let n = 0; n < 120; n++) { if (await page.eval(sv("return t.ready();"))) return; await page.sleep(250); }
    throw new Error("Game did not become ready");
  };
  const open = async (query) => { await page.goto(base + "/index.html?" + query + "&debug=1", { settle: 300 }); await ready(); };
  // A scroll container gets no 1 px slack: one pixel is enough for a classic scrollbar (206 browser check).
  const capture = async (name, scopeSelector) => {
    for (let n = 0; n < 80; n++) {
      if (await page.eval("[...document.querySelectorAll('img.sv-art')].every(i=>i.complete)")) break;
      await page.sleep(100);
    }
    const result = await page.eval(`(() => {
      const boxes=${JSON.stringify(boxes)}, ui=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui'));
      const visible=n=>n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
      const inside=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
      const spills=n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+(/auto|scroll|hidden/.test(getComputedStyle(n).overflowX)?0:1);
      const scope=document.querySelector(${JSON.stringify(scopeSelector ?? "")}||'.sv-overlay.is-on')??document.querySelector('.sv-hud');
      const allImages=[...scope.querySelectorAll('img.sv-art')];
      const imgs=allImages.filter(visible), failedImages=allImages.filter(i=>!i.hidden&&(!i.complete||i.naturalWidth===0)).map(i=>i.src);
      const role=i=>(/\\/([\\w-]+)\\.\\d+\\.webp/.exec(i.currentSrc||i.src)||[])[1];
      const images=imgs.map(i=>{const r=i.getBoundingClientRect(),place=[...i.classList].find(c=>c.startsWith('sv-art-'))?.slice(7),b=boxes[place];return {role:role(i),place,width:Math.round(r.width*10)/10,height:Math.round(r.height*10)/10,loaded:i.complete&&i.naturalWidth>0,natural:i.naturalWidth,sizeOK:place==='bg'?Math.abs(r.width-innerWidth)<=1&&Math.abs(r.height-innerHeight)<=1:!!b&&Math.abs(r.width-b.width*ui)<=1&&Math.abs(r.height-b.height*ui)<=1,inside:inside(r)};});
      // Not checked: the kit's focus strip and its preview (letters drawn past their boxes on purpose) and the clock's unlit LED digits "8:88" drawn behind the time.
      const skip=n=>!!n.closest('.sv-tfx, .tfx-layer, .kit-qs__slot')||n.matches('.sv-clock > b');
      const overflow=[scope,...scope.querySelectorAll('*')].filter(visible).filter(n=>!skip(n)).filter(spills).map(n=>n.className||n.tagName);
      const cards=[...document.querySelectorAll('.sv-overlay .sv-card, .kit-qs__panel')].filter(visible).map(n=>({cls:n.className,inside:inside(n.getBoundingClientRect()),noScroll:n.scrollHeight<=n.clientHeight+1}));
      const keys=[...scope.querySelectorAll('kbd')].filter(visible).map(k=>({text:k.textContent,cap:getComputedStyle(k).borderImageSource.includes('part-keycap'),lit:getComputedStyle(k).borderImageSource.includes('keycap-active'),fits:k.scrollWidth<=k.clientWidth+1,h:Math.round(k.getBoundingClientRect().height*10)/10}));
      // A cell's tint: the first colour of its full layer (the flat layer over the glass); its gun's colour from the bay.
      const rgb=t=>(/rgba?\\([^)]*\\)/.exec(t)||[''])[0];
      const gunOf=m=>{const p=document.createElement('i');p.style.color='var(--gun)';m.closest('.sv-slot').append(p);const c=getComputedStyle(p).color;p.remove();return c;};
      const mags=[...document.querySelectorAll('.sv-mags i')].filter(visible).map(m=>({art:getComputedStyle(m).backgroundImage.includes('part-mag-empty')&&getComputedStyle(m,'::after').backgroundImage.includes('part-mag-full'),w:Math.round(m.getBoundingClientRect().width*10)/10,h:Math.round(m.getBoundingClientRect().height*10)/10,tint:rgb(getComputedStyle(m,'::after').backgroundImage),gun:gunOf(m),bay:m.closest('.sv-slot').dataset.bay??''}));
      // Contrast of the art on the orange Rift plates: the image's mean colour (alpha-weighted, sRGB) against its own background (the chip) or its nearest painted ancestor's.
      const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
      const paint=n=>{for(let e=n;e;e=e.parentElement){const m=/rgba?\\(([^)]*)\\)/.exec(getComputedStyle(e).backgroundColor);if(m){const v=m[1].split(',').map(Number);if(v.length<4||v[3]>0.5)return v.slice(0,3);}}return [0,0,0];};
      const meanOf=i=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.drawImage(i,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let r=0,g=0,b=0,a=0;for(let k=0;k<d.length;k+=4){const w=d[k+3]/255;r+=d[k]*w;g+=d[k+1]*w;b+=d[k+2]*w;a+=w;}return [r/a,g/a,b/a];};
      const contrast=[...document.querySelectorAll('.sv-strip-warn img.sv-art, .sv-warn img.sv-art')].filter(visible).filter(i=>i.naturalWidth>0).map(i=>{const fg=meanOf(i),bg=paint(i),[hi,lo]=[lum(fg),lum(bg)].sort((p,q)=>q-p);return {role:role(i),plate:i.parentElement.className.split(' ')[0],mean:fg.map(Math.round),bg,ratio:Math.round((hi+0.05)/(lo+0.05)*100)/100};});
      const words=[...scope.querySelectorAll('.sv-words li')].map(li=>[...li.querySelectorAll('img.sv-art')].map(role));
      const qs=document.querySelector('.kit-qs');
      const roleOf=t=>(/\\/([\\w-]+)\\.\\d+\\.webp/.exec(t||'')||[])[1]||'';
      const open=qs&&[...qs.querySelectorAll('.kit-qs__dialog')].find(d=>d.getAttribute('aria-hidden')!=='true'&&visible(d));
      const quick=qs?{skinned:qs.classList.contains('kit-qs--skin-slider'),track:qs.style.getPropertyValue('--kit-qs-skin-track'),thumb:qs.style.getPropertyValue('--kit-qs-skin-thumb'),ranges:[...qs.querySelectorAll('.kit-qs__range')].filter(visible).map(r=>Math.round(r.getBoundingClientRect().width)),
        lit:[...qs.querySelectorAll('.kit-qs__range')].filter(visible).map(r=>[Number(r.value),Number(r.style.getPropertyValue('--v'))]),
        corners:[...qs.querySelectorAll('.kit-qs__corner')].map(b=>({role:roleOf(b.querySelector('img')?.src),w:Math.round(b.getBoundingClientRect().width)})),
        rowIcons:open?[...open.querySelectorAll('.kit-qs__row')].map(r=>[r.dataset.row,roleOf(r.querySelector('img.kit-qs__icon')?.src)||roleOf(getComputedStyle(r.querySelector('.kit-qs__icon-cell')??r).backgroundImage)]).filter(([,role])=>role):[]}:null;
      const frameOf=sel=>[...document.querySelectorAll(sel)].filter(visible).map(n=>roleOf(getComputedStyle(n).borderImageSource));
      const frames={card:frameOf('.sv-overlay.is-on .sv-card'),item:frameOf('.sv-overlay.is-on .sv-item:not(.is-on)'),itemOn:frameOf('.sv-overlay.is-on .sv-item.is-on'),guns:frameOf('.sv-overlay.is-on .sv-gun-card'),plates:frameOf('.sv-hp, .sv-clock, .sv-kills'),bays:frameOf('.sv-slot'),locks:frameOf('.sv-bay-lock'),chips:frameOf('.sv-strip-warn.is-on, .sv-notice:not([hidden])'),banner:frameOf('.sv-banner.is-on'),qsPanel:open?frameOf('.kit-qs__dialog[data-panel="'+open.dataset.panel+'"] .kit-qs__panel'):[],qsButtons:open?frameOf('.kit-qs__dialog[data-panel="'+open.dataset.panel+'"] .kit-qs__btn'):[]};
      const mark=document.querySelector('.sv-warn.is-on');
      const rift=mark?{text:mark.textContent,box:(r=>[Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)])(mark.getBoundingClientRect()),chips:[...document.querySelectorAll('.sv-strip-warn.is-on, .sv-warn.is-on')].filter(n=>n.textContent.trim()!=='').length}:null;
      const glyphs=(scope.innerText.match(/[★☆⚠◀▶⌨✓]/g)||[]);
      const goal=document.querySelector('.sv-goal');
      const goalText=goal?.querySelector('span'), goalOneLine=!goalText||goalText.getBoundingClientRect().height<1.8*parseFloat(getComputedStyle(goalText).fontSize);
      // Ticket 121: the title's logo heading against the card, its menu and the corner buttons; every UI art request so far.
      const rect=n=>{const r=n.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)];};
      const meets=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];
      const logoImg=document.querySelector('.sv-overlay.is-on h1.sv-title-logo > img.sv-art-logo');
      const logo=logoImg?(()=>{const box=rect(logoImg),card=document.querySelector('.sv-overlay.is-on .sv-title-card'),menu=card?.querySelector('.sv-menu'),corners=[...document.querySelectorAll('.kit-qs__corner')].filter(visible).map(rect);
        return {box,width:box[2]-box[0],alt:logoImg.alt,heading:logoImg.parentElement.textContent===''&&!logoImg.hasAttribute('aria-hidden'),textName:!!document.querySelector('.sv-overlay.is-on .sv-title-name'),card:card?rect(card):null,menu:menu?rect(menu):null,corners,clearOfCard:!card||!meets(box,rect(card)),clearOfMenu:!menu||!meets(box,rect(menu)),clearOfCorners:corners.every(c=>!meets(box,c))};})():null;
      const requests=performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/typing-survival/ui/')).map(e=>[new URL(e.name).pathname.split('/').pop(),e.responseStatus]);
      // The stage card, its art band and the rules under it (the rails check, judge 31/10).
      const box=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const briefCard=document.querySelector('.sv-overlay.is-on .sv-brief'),band=briefCard?.querySelector('.sv-art-briefing:not([hidden])'),rules=briefCard?.querySelector('.sv-brief-rules');
      const brief=band&&rules?{ui,card:box(briefCard),band:box(band),rules:box(rules)}:null;
      return {ui,images,failedImages,overflow,cards,keys,mags,contrast,words,quick,frames,rift,glyphs,goalShown:!!goal&&visible(goal),goalOneLine,logo,requests,brief};
    })()`);
    result.name = name; screens.push(result);
    const shot = await page.shot(out("ui-art-" + name + "-" + size + ".png"));
    shots.push(shot);
    if (result.brief) result.rails = railCheck(shot, result.brief, page);
    if (result.logo) result.logoRing = await logoRing(page, shot);
    if (BACKGROUNDS[name]) {
      result.textContrast = await textContrast(page, out("ui-art-" + name + "-" + size + "-bare.png"));
      result.corners = await cornerContrast(page, out("ui-art-" + name + "-" + size + "-corners.png"));
    }
    return result;
  };
  // The results' stars light in turn (0.45 s each, 0.2 s apart): measured once they stand still.
  const starsSettled = async () => {
    for (let n = 0; n < 40; n++) { if (await page.eval("[...document.querySelectorAll('.sv-art-star')].every(i=>i.getAnimations().every(a=>a.playState==='finished'))")) return; await page.sleep(50); }
  };
  const clickItem = async (index) => { await page.click('.sv-overlay.is-on .sv-item[data-index="' + index + '"]'); await page.sleep(300); };
  // A fast, clean typist on the held clock, through the page's own commands: a whole word, then 450 ms; until \`code\` holds or the fight ends.
  // \`banner\`: capture the first banner drawn with an icon (a surge) as "fight-surge".
  let surge = false;
  const typeHeld = async (code, words = 400, banner = false) => {
    await page.eval(sv("t.hold(true); return true;"));
    for (let n = 0; n < words; n++) {
      const look = await page.eval(sv("return { done: " + code + ", phase: t.state().phase, slots: t.slots(), banner: !!document.querySelector('.sv-banner.is-on > img') };"));
      if (banner && look.banner && !surge) {
        surge = true;
        // Measured once its pop has settled (scale 1.4 → 1 in the first 10 % of 2.2 s: llB's 46.8 px against 45 was mid-pop).
        for (let n = 0; n < 40; n++) { if (await page.eval("(document.querySelector('.sv-banner').getAnimations()[0]?.currentTime ?? 1e9) >= 320")) break; await page.sleep(50); }
        await capture("fight-surge", ".sv-hud");
      }
      if (look.done === true || look.phase !== "play") break;
      const locked = look.slots.findIndex((s) => s.locked);
      const bay = locked >= 0 ? locked : look.slots.reduce((best, s, i) => (s.mags < look.slots[best].mags ? i : best), 0);
      const word = look.slots[bay].text.slice(look.slots[bay].typed);
      await page.eval(sv("for (const c of " + JSON.stringify([...word]) + ") t.send({ t: 'key', letter: c.charCodeAt(0) - 97 }); t.advance(450); return true;"));
    }
  };

  // Title and its sheets (a fresh profile: stage 1 open, no stars).
  await open("seed=2");
  await page.eval("localStorage.removeItem('survival.stages'); localStorage.setItem('survival.guide', JSON.stringify({started:true,hint:true})); true");
  await open("seed=2");
  await capture("menu");
  for (const [index, name] of [[4, "profile"], [5, "options"], [6, "armory"]]) {
    await clickItem(index); await capture(name); await key(page, "Escape"); await page.sleep(300);
  }
  // Campaign → briefing → loadout → stage card → fight (stage 1).
  await clickItem(0); await capture("journey");
  await key(page, "Enter"); await page.sleep(300); await capture("briefing");
  await key(page, "Enter"); await page.sleep(300);
  await page.key("1", { code: "Digit1" }); await page.key("2", { code: "Digit2" }); await page.sleep(250); await capture("loadout");
  for (let n = 0; n < 4; n++) await key(page, "ArrowRight");
  await key(page, "Enter"); await page.sleep(500); await ready(); await capture("intro");
  await page.key("q", { code: "KeyQ", text: "q" }); await page.sleep(1500); await capture("fight", ".sv-hud");
  // A word into a full bay, as CSS: the first bay's cells turn urgent while is-overfull is on (hud.ts only clears it when its blink timer changes).
  await page.eval("document.querySelector('.sv-slot').classList.add('is-overfull'); true");
  await page.sleep(100); await capture("fight-overfull", ".sv-hud");
  await page.eval("document.querySelector('.sv-slot').classList.remove('is-overfull'); true");
  await key(page, "Escape"); await page.sleep(300); await capture("pause");
  await key(page, "Escape"); await page.sleep(400);
  await page.key("F1", { code: "F1" }); await page.sleep(500); await capture("quick-settings", ".kit-qs");
  await key(page, "Escape"); await page.sleep(300);
  await page.key("F2", { code: "F2" }); await page.sleep(500); await capture("quick-sound", ".kit-qs");
  await key(page, "Escape"); await page.sleep(3600);

  // A loss: stage 1 left alone on the held clock until the horde breaks the hull.
  await page.eval(sv("t.hold(true); return true;"));
  // Brutes placed at the line (logged commands) make it quick.
  for (let n = 0; n < 60; n++) { if ((await page.eval(sv("return t.state().phase;"))) !== "play") break; await page.eval(sv("for (const x of [-6, -2, 2, 6]) t.place(2, x, -100); t.advance(5000); return true;")); }
  await page.eval(sv("t.advance(1500); t.hold(false); return true;")); await page.sleep(400);
  const lost = await page.eval(sv("return { phase: t.state().phase, mode: t.mode() };"));
  await starsSettled(); await capture("results-lose");

  // The hunt (stage 2): the objective plate; a typed clean streak lights the streak LED.
  await open("seed=3&autostart=1&stage=c1-s2&guns=ray,tia");
  for (let w = 0; w < 4; w++) {
    const slots = await page.eval(sv("return t.slots();"));
    const bay = slots.reduce((best, s, i) => (s.mags < slots[best].mags ? i : best), 0);
    for (const letter of slots[bay].text) { await press(page, letter); await page.sleep(45); }
    await page.sleep(150);
  }
  const slots = await page.eval(sv("return t.slots();"));
  await press(page, slots[0].text[0]); await page.sleep(120);
  await capture("fight-hunt", ".sv-hud");

  // A rift (stage 3): its warning on the wall's side and the countdown beside the word line.
  await open("seed=3&autostart=1&stage=c1-s3&guns=tan,xung");
  await typeHeld("t.state().rifts.state === 1", 120);
  await page.eval(sv("t.advance(400); return true;"));
  const rift = await page.eval(sv("return t.state().rifts;"));
  await capture("fight-rift", ".sv-hud");
  // The input notice (LL-37): a Vietnamese letter typed as a real key, as a Telex keyboard sends it.
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ă", text: "ă", unmodifiedText: "ă" });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ă" });
  await page.sleep(300); await capture("fight-notice", ".sv-hud");
  await page.eval(sv("t.hold(false); return true;"));

  // A win: stage 1 typed through the page's own commands on the held clock (a fast, clean typist).
  await open("seed=2&autostart=1&stage=c1-s1&guns=xung,tan");
  await typeHeld("false", 400, true);
  await page.eval(sv("t.advance(1500); t.hold(false); return true;")); await page.sleep(400);
  const won = await page.eval(sv("return { phase: t.state().phase, mode: t.mode(), stars: t.journey().stars };"));
  await starsSettled(); await capture("results-win");

  // No WebGL (LL-02): the page's own message, with every WebGL context refused. The checks above read only what came before.
  const logsBefore = page.logs.length, exceptionsBefore = page.exceptions.length;
  const { identifier } = await page.send("Page.addScriptToEvaluateOnNewDocument", { source: "{ const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...rest) { return /webgl/.test(kind) ? null : get.call(this, kind, ...rest); }; }" }).then((m) => m.result ?? {});
  await page.goto(base + "/index.html?seed=2", { settle: 1200 });
  await capture("nogl", ".sv-nogl");
  if (identifier) await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  const noglLogs = page.logs.slice(logsBefore), noglExceptions = page.exceptions.slice(exceptionsBefore);
  const logs = page.logs.slice(0, logsBefore), exceptions = page.exceptions.slice(0, exceptionsBefore);

  const warnings = logs.filter((l) => l.includes("[ui-art]"));
  const by = (name) => screens.find((s) => s.name === name);
  const has = (name, role) => by(name).images.some((i) => i.role === role);
  const checks = {
    flowEnds: lost.phase === "lost" && lost.mode === "end" && won.phase === "won" && won.mode === "end" && rift.state === 1,
    allLoaded: screens.every((s) => s.failedImages.length === 0 && s.images.every((i) => i.loaded)),
    boxSizes: screens.every((s) => s.images.every((i) => i.sizeOK)),
    imagesInWindow: screens.every((s) => s.images.every((i) => i.inside)),
    noOverflow: screens.every((s) => s.overflow.length === 0),
    cardsFit: screens.every((s) => s.cards.every((c) => c.inside && c.noScroll)),
    noGlyphIcons: screens.every((s) => s.glyphs.length === 0),
    keyCaps: screens.every((s) => s.keys.every((k) => k.cap && k.fits)) && by("loadout").keys.filter((k) => k.lit).length === 2,
    // Cells 10 × 28 px × --ui (a 40 px canvas, UI pass 2); each bay's glass in its gun's colour, two guns two colours; urgent in a full bay.
    magCells: by("fight").mags.length > 0 && by("fight").mags.every((m) => m.art && m.w >= 10 * by("fight").ui - 0.5 && m.h >= 28 * by("fight").ui - 0.5 && m.tint === m.gun) && new Set(by("fight").mags.map((m) => m.tint)).size === 2,
    overfullCells: by("fight-overfull").mags.filter((m) => m.bay === "1").every((m) => m.tint === "rgb(255, 176, 32)") && by("fight-overfull").mags.some((m) => m.bay === "1") && by("fight-overfull").mags.filter((m) => m.bay !== "1").every((m) => m.tint === m.gun),
    warnContrast: by("fight-rift").contrast.length >= 3 && by("fight-rift").contrast.every((c) => c.ratio >= 3),
    noticeIcon: has("fight-notice", "icon-keyboard") && by("fight-notice").images.some((i) => i.role === "icon-keyboard" && i.place === "item"),
    wordIcons: by("results-win").words.length > 0 && by("results-win").words.every((w) => w.length === 1 && ["icon-check", "icon-new-badge"].includes(w[0])),
    noglMessage: has("nogl", "icon-warning") && noglExceptions.length > 0 && noglExceptions.every((e) => e.includes("survival: no WebGL")) && noglLogs.every((l) => /WebGL/.test(l)),
    sliderSkin: by("quick-sound").quick?.skinned === true && by("quick-sound").quick.track.includes("slider-track.1024.webp") && by("quick-sound").quick.thumb.includes("slider-thumb.128.webp"),
    titleIcons: ["icon-station-crest", "icon-menu-journey", "icon-clock", "icon-menu-mode", "icon-menu-profile", "icon-menu-settings", "icon-menu-armory", "part-led-on", "part-led-off", "part-arrow"].every((r) => has("menu", r)),
    optionsIcons: ["icon-sfx", "icon-music", "icon-shake", "icon-reduced-motion", "icon-read-aloud", "icon-pace-director", "icon-quality", "icon-check"].every((r) => has("options", r)),
    profileIcons: ["icon-stat-wpm", "icon-stat-accuracy", "icon-stat-new-word", "icon-stat-evenness", "icon-back"].every((r) => has("profile", r)),
    journeyIcons: ["icon-chapter-crest", "icon-star-unlit", "icon-lock", "icon-back"].every((r) => has("journey", r)),
    briefingIcons: ["icon-objective", "icon-hazard", "icon-learning-rule", "icon-equipment", "icon-new-badge", "icon-load-guns", "icon-back"].every((r) => has("briefing", r)),
    loadoutIcons: has("loadout", "icon-warning"),
    hudIcons: ["icon-armour", "icon-clock", "icon-kills", "icon-lock"].every((r) => has("fight", r)) && has("fight-hunt", "icon-objective") && has("fight-hunt", "foe-pack-leader") && has("fight-hunt", "icon-streak") && has("fight-rift", "icon-rift") && has("fight-rift", "part-arrow"),
    // Stage 1 holds: no objective plate (its [hidden] must win over the plate's own display).
    goalPlate: !by("fight").goalShown && !by("fight-surge").goalShown && by("fight-hunt").goalShown && by("fight-hunt").goalOneLine,
    surgeBanner: surge && has("fight-surge", "icon-surge"),
    pauseIcons: ["icon-menu-play", "icon-menu-settings", "icon-back"].every((r) => has("pause", r)),
    resultsIcons: ["icon-stat-time", "icon-kills", "icon-stat-accuracy", "icon-keyboard", "icon-retry", "icon-back"].every((r) => has("results-lose", r) && has("results-win", r)) && has("results-win", "icon-star-lit") && has("results-win", "icon-next-stage"),
    // UI pass 2: the ticket 127 frames where the theme's plates were.
    frames: ["menu", "options", "pause"].every((n) => by(n).frames.card.every((f) => f === "frame-panel") && by(n).frames.item.length > 0 && by(n).frames.item.every((f) => f === "frame-button") && by(n).frames.itemOn.every((f) => f === "frame-button-active"))
      && ["armory", "loadout"].every((n) => by(n).frames.guns.length === 5 && by(n).frames.guns.every((f) => f === "frame-card"))
      && by("fight").frames.plates.length === 3 && by("fight").frames.plates.every((f) => f === "frame-plate") && by("fight").frames.bays.every((f) => f === "frame-card") && by("fight").frames.locks.length === 2 && by("fight").frames.locks.every((f) => f === "frame-card")
      && by("fight-rift").frames.chips.every((f) => f === "frame-word") && by("fight-notice").frames.chips.length >= 1 && by("fight-notice").frames.chips.every((f) => f === "frame-word")
      && by("fight-surge").frames.banner.every((f) => f === "frame-banner")
      && ["quick-settings", "quick-sound"].every((n) => by(n).frames.qsPanel.length === 1 && by(n).frames.qsPanel[0] === "frame-panel" && by(n).frames.qsButtons.length > 0 && by(n).frames.qsButtons.every((f) => f === "frame-button" || f === "frame-button-active")),
    // The gear and the speaker on the corner buttons (ticket 180), 36 px × the panel's scale; the Sound rows' icons and the Settings rows' quality, motion and shake.
    quickIcons: by("quick-sound").quick.corners.map((c) => c.role).join() === "hud-settings,hud-sound" && by("quick-sound").quick.corners.every((c) => c.w >= 32)
      && ["vol-master", "vol-music", "vol-effects", "vol-keyboard", "vol-voice", "vol-interface"].every((r) => by("quick-sound").quick.rowIcons.some(([, role]) => role === r))
      && ["icon-quality", "icon-reduced-motion", "icon-shake"].every((r) => by("quick-settings").quick.rowIcons.some(([, role]) => role === r)),
    // Every groove the same length; each lit to its value (--v), so 50 and 100 differ.
    sliderFill: by("quick-sound").quick.ranges.length >= 5 && Math.max(...by("quick-sound").quick.ranges) - Math.min(...by("quick-sound").quick.ranges) <= 1 && by("quick-sound").quick.lit.every(([value, v]) => Math.abs(value - v) < 0.6),
    // One rift chip with text (by the word line); the wall mark has none and stands inside the corridor, not at the screen's edge.
    oneRiftChip: by("fight-rift").rift !== null && by("fight-rift").rift.text.trim() === "" && by("fight-rift").rift.chips === 1 && by("fight-rift").rift.box[0] > 0.06 * page.width && by("fight-rift").rift.box[2] < 0.94 * page.width,
    // Ticket 121: each screen on its own painted background, full window; the title's logo as its heading.
    backgrounds: Object.entries(BACKGROUNDS).every(([name, role]) => by(name).images.some((i) => i.role === role && i.place === "bg" && i.loaded && i.sizeOK)),
    logo: (({ logo }) => !!logo && logo.alt === "Last Line" && logo.heading && !logo.textName && logo.clearOfCard && logo.clearOfMenu && logo.clearOfCorners && Math.abs(logo.width - boxes.logo.width * by("menu").ui) <= 1)(by("menu")),
    // Every UI art response the page got: 200 (0 is a cached copy; no 4xx or 5xx).
    artRequests: screens.every((s) => s.requests.every(([, status]) => status === 0 || (status >= 200 && status < 400))),
    panelText: Object.keys(BACKGROUNDS).every((name) => by(name).textContrast.runs > 0 && by(name).textContrast.failing.length === 0),
    // Judge 31/10: the gear and the speaker ≥ 3 : 1 against the brightest 10 % behind them on every background screen.
    cornerIcons: Object.keys(BACKGROUNDS).every((name) => by(name).corners.length === 2 && by(name).corners.every((c) => c.pass)),
    // The stage art band inside the panel frame's rails (≥ 8.5 px × --ui in from each edge), each rail the same beside the band as below it.
    briefingRails: (({ rails, ui }) => !!rails && rails.insetLeft >= 8.5 * ui - 0.5 && rails.insetRight >= 8.5 * ui - 0.5 && rails.left <= RAIL_DIFF && rails.right <= RAIL_DIFF)(by("briefing")),
    // The ring pulled down behind "Last": its faces ≥ LOGO_RING : 1 against the band round them.
    logoRing: !!by("menu").logoRing && by("menu").logoRing.last.ratio >= LOGO_RING,
    onlyPendingWarnings: warnings.every((l) => { const role = l.split("no accepted image: ")[1]?.trim(); return !!role && pending.has(role) && !l.includes("missing image:"); }),
    noConsoleErrors: logs.filter((l) => l.startsWith("error")).length === 0,
    noExceptions: exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean); if (!pass) process.exitCode = 1;
  // Sizes as drawn, per place (CSS px at this size), for the report.
  const drawn = {};
  for (const s of screens) for (const i of s.images) if (i.place !== "bg") drawn[i.place] = [i.width, i.height];
  const contrast = by("fight-rift").contrast, magSizes = by("fight").mags.map((m) => [m.w, m.h]);
  const requests = Object.fromEntries(screens.flatMap((s) => s.requests).sort(([a], [b]) => a.localeCompare(b)));
  const panelContrast = Object.fromEntries(Object.keys(BACKGROUNDS).map((name) => [name, by(name).textContrast]));
  const corners = Object.fromEntries(Object.keys(BACKGROUNDS).map((name) => [name, by(name).corners]));
  return { pass, checks, drawn, contrast, magSizes, lost, won, rift: { state: rift.state }, logo: by("menu").logo, logoRing: by("menu").logoRing, rails: by("briefing").rails, corners, requests, panelContrast, screens, warnings, exceptions, noglLogs, noglExceptions, shots };
}
