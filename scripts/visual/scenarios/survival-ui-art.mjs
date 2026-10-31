// UI art in the browser (ticket 206; icons and parts of 149–153, sliders of 225, 31/10):
// Claude runs it at 1280×720 and 1920×1080; captures stay in OUT_DIR.
//   URL=http://127.0.0.1:3007/ OUT_DIR=tmp/ui-wire node src/kit/tools/cdp-run.mjs scripts/visual/scenarios/survival-ui-art.mjs --width=1280 --height=720
// Every screen that shows UI art: title, options, profile, armory, campaign, briefing, loadout,
// the stage card, the HUD in three fights (stage 1, the hunt's objective plate, a rift's warning
// with a typed streak, the input notice), pause, the Settings and Sound panels, the results of a
// win and a loss, and the no-WebGL message (review fixes 31/10).
// Checks: every art image loaded, drawn at its BOX size × --ui, inside the window; no element
// spills sideways; every card fits without scrolling; key caps, magazine cells and the slider
// skin use their art; magazine cells 6 × 17 px × --ui in their gun's colour, urgent in a full
// bay; the Rift icon and arrow ≥ 3:1 on their chips; only pending roles warn; no console error.
import { readFileSync } from "node:fs";
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

export default async function (page) {
  const size = page.width + "x" + page.height, screens = [], shots = [];
  const ready = async () => {
    for (let n = 0; n < 120; n++) { if (await page.eval(sv("return t.ready();"))) return; await page.sleep(250); }
    throw new Error("Game did not become ready");
  };
  const open = async (query) => { await page.goto(base + "/index.html?" + query, { settle: 300 }); await ready(); };
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
      const quick=qs?{skinned:qs.classList.contains('kit-qs--skin-slider'),track:qs.style.getPropertyValue('--kit-qs-skin-track'),thumb:qs.style.getPropertyValue('--kit-qs-skin-thumb'),ranges:[...qs.querySelectorAll('.kit-qs__range')].filter(visible).map(r=>Math.round(r.getBoundingClientRect().width))}:null;
      const glyphs=(scope.innerText.match(/[★☆⚠◀▶⌨✓]/g)||[]);
      const goal=document.querySelector('.sv-goal');
      const goalText=goal?.querySelector('span'), goalOneLine=!goalText||goalText.getBoundingClientRect().height<1.8*parseFloat(getComputedStyle(goalText).fontSize);
      return {ui,images,failedImages,overflow,cards,keys,mags,contrast,words,quick,glyphs,goalShown:!!goal&&visible(goal),goalOneLine};
    })()`);
    result.name = name; screens.push(result);
    shots.push(await page.shot(out("ui-art-" + name + "-" + size + ".png")));
    return result;
  };
  const clickItem = async (index) => { await page.click('.sv-overlay.is-on .sv-item[data-index="' + index + '"]'); await page.sleep(300); };
  // A fast, clean typist on the held clock, through the page's own commands: a whole word, then 450 ms; until \`code\` holds or the fight ends.
  // \`banner\`: capture the first banner drawn with an icon (a surge) as "fight-surge".
  let surge = false;
  const typeHeld = async (code, words = 400, banner = false) => {
    await page.eval(sv("t.hold(true); return true;"));
    for (let n = 0; n < words; n++) {
      const look = await page.eval(sv("return { done: " + code + ", phase: t.state().phase, slots: t.slots(), banner: !!document.querySelector('.sv-banner.is-on > img') };"));
      if (banner && look.banner && !surge) { surge = true; await page.sleep(300); await capture("fight-surge", ".sv-hud"); }
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
  await capture("results-lose");

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
  await capture("results-win");

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
    // Cells 6 × 17 px × --ui (a 24 px canvas, review 31/10); each bay's glass in its gun's colour, two guns two colours; urgent in a full bay.
    magCells: by("fight").mags.length > 0 && by("fight").mags.every((m) => m.art && m.w >= 6 * by("fight").ui - 0.5 && m.h >= 17 * by("fight").ui - 0.5 && m.tint === m.gun) && new Set(by("fight").mags.map((m) => m.tint)).size === 2,
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
    onlyPendingWarnings: warnings.every((l) => { const role = l.split("no accepted image: ")[1]?.trim(); return !!role && pending.has(role) && !l.includes("missing image:"); }),
    noConsoleErrors: logs.filter((l) => l.startsWith("error")).length === 0,
    noExceptions: exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean); if (!pass) process.exitCode = 1;
  // Sizes as drawn, per place (CSS px at this size), for the report.
  const drawn = {};
  for (const s of screens) for (const i of s.images) if (i.place !== "bg") drawn[i.place] = [i.width, i.height];
  const contrast = by("fight-rift").contrast, magSizes = by("fight").mags.map((m) => [m.w, m.h]);
  return { pass, checks, drawn, contrast, magSizes, lost, won, rift: { state: rift.state }, screens, warnings, noglLogs, noglExceptions, shots };
}
