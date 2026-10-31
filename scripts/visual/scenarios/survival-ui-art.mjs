// Ticket 206: Claude runs at 1280×720 and 1920×1080; captures stay in OUT_DIR.
import { readFileSync } from "node:fs";
import { DEV_URL, out } from "./common.mjs";
import { sv } from "./survival-s0-lib.mjs";

// Read BOX from its single source, without importing TypeScript in the CDP runner.
const source = readFileSync(new URL("../../../src/view/ui-art.ts", import.meta.url), "utf8");
const boxes = Object.fromEntries([...source.matchAll(/(\w+): \{ width: (\d+), height: (\d+) \}/g)].map(([,key,w,h])=>[key,{width:Number(w),height:Number(h)}]));
const selection = JSON.parse(readFileSync(new URL("../../ui-art/selection.json", import.meta.url), "utf8"));
const accepted = new Set(selection.entries.filter(e=>e.accepted).map(e=>e.role));
const pending = new Set(selection.entries.filter(e=>!e.accepted&&!accepted.has(e.role)).map(e=>e.role));
const key = (page, code) => page.key(code, {code});
// A scroll container gets no 1 px slack: one pixel is enough for a classic scrollbar (206 browser check,
// the stage card's art band). Elements that overflow visibly keep it (the locked bay's padlock shackle).
export default async function(page) {
  const size = page.width + "x" + page.height, screens = [], shots = [];
  const ready = async () => {
    for(let n=0;n<100;n++) { if(await page.eval(sv("return t.ready();"))) return; await page.sleep(250); }
    throw new Error("Game did not become ready");
  };
  const capture = async name => {
    for(let n=0;n<80;n++) {
      if(await page.eval("[...document.querySelectorAll('img.sv-art')].every(i=>i.complete)")) break;
      await page.sleep(100);
    }
    const result = await page.eval(`(() => {
      const boxes=${JSON.stringify(boxes)}, ui=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui'));
      const visible=n=>n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden';
      const inside=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
      const spills=n=>n.clientWidth>0&&n.scrollWidth>n.clientWidth+(/auto|scroll|hidden/.test(getComputedStyle(n).overflowX)?0:1);
      const scope=document.querySelector('.sv-overlay.is-on')??document.querySelector('.sv-bottom');
      const allImages=[...scope.querySelectorAll('img.sv-art')];
      const imgs=allImages.filter(visible), failedImages=allImages.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
      const images=imgs.map(i=>{const r=i.getBoundingClientRect(),place=[...i.classList].find(c=>c.startsWith('sv-art-'))?.slice(7),b=boxes[place];return {src:i.currentSrc,loaded:i.complete&&i.naturalWidth>0,place,width:r.width,height:r.height,sizeOK:place==='bg'?Math.abs(r.width-innerWidth)<=1&&Math.abs(r.height-innerHeight)<=1:!!b&&Math.abs(r.width-b.width*ui)<=1&&Math.abs(r.height-b.height*ui)<=1,inside:inside(r)};});
      const overflow=[scope,...scope.querySelectorAll('*')].filter(visible).filter(spills).map(n=>n.className);
      const cards=[...document.querySelectorAll('.sv-overlay .sv-card')].filter(visible).map(n=>({inside:inside(n.getBoundingClientRect()),noScroll:n.scrollHeight<=n.clientHeight}));
      const strip=document.querySelector('.sv-strip')?.getBoundingClientRect();
      const bays=[...scope.querySelectorAll('.sv-slot')].filter(visible).map(n=>{const word=n.querySelector('.sv-word'),img=n.querySelector('.sv-art-bay'),r=img?.getBoundingClientRect();return {px:parseFloat(getComputedStyle(word).fontSize)/ui,overflow:[...n.querySelectorAll('*')].filter(spills).map(e=>e.className),iconInside:!!r&&inside(r),clearStrip:!!r&&!!strip&&(r.right<=strip.left||r.left>=strip.right||r.bottom<=strip.top||r.top>=strip.bottom)};});
      const resources=performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/typing-survival/ui/'));
      const current=new Set(imgs.map(i=>i.currentSrc));
      const used=[...new Map(resources.filter(r=>current.has(r.name)).map(r=>[r.name,r])).values()];
      const names=[...document.querySelectorAll('.sv-cards header b')].map(b=>{const r=document.createRange();r.selectNodeContents(b);return new Set([...r.getClientRects()].map(x=>x.top)).size;});
      return {ui,images,failedImages,overflow,cards,bays,names,bytes:{pageResources:resources.reduce((s,r)=>s+r.decodedBodySize,0),screenResources:used.reduce((s,r)=>s+r.decodedBodySize,0),transfer:used.reduce((s,r)=>s+r.transferSize,0),files:used.map(r=>({url:r.name,bytes:r.decodedBodySize,transfer:r.transferSize}))}};
    })()`);
    result.name=name; screens.push(result);
    shots.push(await page.shot(out("survival-ui-art-"+name+"-"+size+".png")));
  };
  await page.goto(DEV_URL.replace(/\/$/,"")+"/index.html?seed=2",{settle:300}); await ready();
  await page.eval("localStorage.removeItem('survival.stages'); true");
  await page.eval('localStorage.setItem("survival.guide", JSON.stringify({started:true,hint:true})); true');
  await capture("menu");
  await key(page,"Enter"); await page.sleep(250); await capture("journey");
  await key(page,"Enter"); await page.sleep(250); await capture("briefing");
  await key(page,"Enter"); await page.sleep(250);
  await page.key("1",{code:"Digit1"}); await page.key("2",{code:"Digit2"}); await page.sleep(200); await capture("loadout");
  // Cursor on card two; four steps reach START.
  for(let n=0;n<4;n++) await key(page,"ArrowRight");
  await key(page,"Enter"); await page.sleep(500); await ready(); await capture("intro");
  const intro=await page.eval(sv("return {mode:t.mode(),state:t.state()};"));
  await page.key("q",{code:"KeyQ",text:"q"}); await page.sleep(1200); await capture("fight");
  const fight=await page.eval(sv("return {mode:t.mode(),state:t.state()};"));
  await page.goto(DEV_URL.replace(/\/$/,"")+"/index.html?seed=2",{settle:300}); await ready();
  await key(page,"ArrowUp"); await key(page,"Enter"); await page.sleep(300); await capture("armory");
  const warnings=page.logs.filter(l=>l.includes('[ui-art]'));
  const checks={
    flow:intro.mode==='intro'&&fight.mode==='play'&&fight.state.stage==='c1-s1'&&JSON.stringify(fight.state.guns)==='["xung","tia"]',
    allLoaded:screens.every(s=>s.failedImages.length===0&&s.images.every(i=>i.loaded)),
    expectedCounts:screens.every(s=>s.name==='menu'?s.images.length===0:s.name==='journey'?s.images.length===4:s.name==='intro'?s.images.length===3:s.name==='fight'?s.images.length===2:s.name==='armory'?s.images.length===5:s.images.length>=5),
    boxSizes:screens.every(s=>s.images.every(i=>i.sizeOK)),
    noOverflow:screens.every(s=>s.overflow.length===0),
    cardsFit:screens.every(s=>s.cards.every(c=>c.inside&&c.noScroll)),
    imagesInWindow:screens.every(s=>s.images.every(i=>i.inside)),
    gunNamesOneLine:screens.every(s=>s.names.every(n=>n===1)),
    baysFit:screens.find(s=>s.name==='fight').bays.every(b=>b.px>=26&&b.overflow.length===0&&b.iconInside&&b.clearStrip),
    onlyPendingWarnings:warnings.every(l=>{const role=l.split('no accepted image: ')[1]?.trim();return !!role&&pending.has(role)&&!l.includes('missing image:');}),
    noConsoleErrors:page.logs.filter(l=>l.startsWith('error')).length===0,
    noExceptions:page.exceptions.length===0,
  };
  const pass=Object.values(checks).every(Boolean); if(!pass)process.exitCode=1;
  return {pass,checks,screens,warnings,shots};
}
