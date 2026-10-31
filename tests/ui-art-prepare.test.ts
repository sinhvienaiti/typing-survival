import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, readdirSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { describe, it, expect, afterAll } from "vitest";
// @ts-expect-error Node-only build tool has no declaration file.
import { plan, prepare } from "../scripts/ui-art/prepare.mjs";
const available=["magick","cwebp"].every(c=>spawnSync(c,["-version"]).status===0);
const root=resolve("tmp/ui-art-test"), artSrc=root+"/source", out=root+"/public/ui", table=root+"/table.json";
const hash=(p:string)=>createHash("md5").update(readFileSync(p)).digest("hex");
const entry=(role:string,kind:string,source:string,accepted=true)=>({role,kind,source,accepted,ticket:"test",verdict:"Fixture",alt:role,...(kind==="bg"?{crop:"320x180+0+10"}:{})});
const selection={version:1,entries:[entry("gun-test","icon","icon"),entry("foe-test","portrait","portrait"),entry("stage-test","stage","stage"),entry("bg-test","bg","bg"),entry("gun-pending","icon","icon",false)]};
function png(name:string,w:number,h:number){const r=spawnSync("magick",["-size",`${w}x${h}`,"gradient:#223344-#ccddee",...(name.startsWith("icon")||name==="portrait"?["-alpha","set","-channel","A","-evaluate","set","75%","+channel"]:[]),artSrc+"/"+name+".png"],{encoding:"utf8"});if(r.status!==0) throw Error(r.stderr);}
afterAll(()=>rmSync(root,{recursive:true,force:true}));
describe("UI art planner",()=>{
  it("uses exact icon sizes and the closest larger fallback",()=>{
    const files=[64,128,256].map(w=>({file:`icon.${w}.png`,width:w,height:w}));
    expect(plan({version:1,entries:[entry("gun-test","icon","icon")]},files).map((j:{source:string})=>j.source)).toEqual(files.map(f=>f.file));
    expect(plan({version:1,entries:[entry("gun-test","icon","icon")]},files.filter(f=>f.width!==128))[1].source).toBe("icon.256.png");
  });
  it("plans a slider groove (track) at 512 and 1024 wide, 16:1, from its sized source first (ticket 225)",()=>{
    const files=[{file:"track.png",width:1024,height:64},{file:"track.512.png",width:512,height:32}];
    const jobs=plan({version:1,entries:[entry("slider-test","track","track")]},files);
    expect(jobs.map((j:{source:string;width:number;height:number})=>[j.source,j.width,j.height])).toEqual([["track.512.png",512,32],["track.png",1024,64]]);
    expect(plan({version:1,entries:[entry("slider-test","track","track")]},files.slice(0,1)).map((j:{source:string})=>j.source)).toEqual(["track.png","track.png"]);
    expect(()=>plan({version:1,entries:[entry("slider-test","track","track")]},[{file:"track.png",width:1024,height:1024}])).toThrow(/16:1/);
    expect(()=>plan({version:1,entries:[entry("slider-test","track","track")]},[{file:"track.png",width:512,height:32}])).toThrow(/upscale/);
  });
  it("rejects upscaling and non-16:9 stages before writing",()=>{
    expect(()=>plan({version:1,entries:[entry("gun-test","icon","icon")]},[{file:"icon.png",width:32,height:32}])).toThrow(/larger|upscale/);
    expect(()=>plan({version:1,entries:[entry("stage-test","stage","stage")]},[{file:"stage.png",width:1536,height:1000}])).toThrow(/16:9/);
  });
});
describe("UI pass 2: nine-slice frames and trimmed icons (31/10)",()=>{
  const frame=(extra:object={})=>({...entry("frame-test","frame","frame"),crop:"900x300+50+40",slice:[90,120,80,120],...extra});
  it("plans a frame at 448 and 896 wide in its crop's shape, from the full canvas, never upscaled",()=>{
    const jobs=plan({version:1,entries:[frame()]},[{file:"frame.png",width:1024,height:400}]);
    expect(jobs.map((j:{source:string;width:number;height:number;crop:object})=>[j.source,j.width,j.height,j.crop])).toEqual([["frame.png",448,149,{width:900,height:300,x:50,y:40}],["frame.png",896,299,{width:900,height:300,x:50,y:40}]]);
    expect(()=>plan({version:1,entries:[frame({crop:"800x300+50+40"})]},[{file:"frame.png",width:1024,height:400}])).toThrow(/upscale/);
    expect(()=>plan({version:1,entries:[frame({crop:"900x300+200+40"})]},[{file:"frame.png",width:1024,height:400}])).toThrow(/crop/);
  });
  it("rejects a frame without a crop, with slice lines that meet, or with a slice that is not four whole numbers",()=>{
    const files=[{file:"frame.png",width:1024,height:400}];
    expect(()=>plan({version:1,entries:[frame({crop:undefined})]},files)).toThrow(/crop/);
    expect(()=>plan({version:1,entries:[frame({slice:[150,120,150,120]})]},files)).toThrow(/slice/);
    expect(()=>plan({version:1,entries:[frame({slice:[90,120,80]})]},files)).toThrow(/slice/);
    expect(()=>plan({version:1,entries:[frame({slice:[90,120.5,80,120]})]},files)).toThrow(/slice/);
  });
  it("trims an icon or a portrait from its full-size painting (fill), not from the sized copies, and only those kinds with 0.5 ≤ fill ≤ 1",()=>{
    const files=[{file:"icon.png",width:1024,height:1024},...[64,128,256].map(w=>({file:`icon.${w}.png`,width:w,height:w}))];
    const jobs=plan({version:1,entries:[{...entry("gun-test","icon","icon"),fill:0.85}]},files);
    expect(jobs.map((j:{source:string;fill:number})=>[j.source,j.fill])).toEqual([["icon.png",0.85],["icon.png",0.85],["icon.png",0.85]]);
    for(const fill of [0.4,1.2,"0.85"]) expect(()=>plan({version:1,entries:[{...entry("gun-test","icon","icon"),fill}]},files)).toThrow(/fill/);
    expect(()=>plan({version:1,entries:[{...entry("stage-test","stage","stage"),fill:0.85}]},[{file:"stage.png",width:1536,height:864}])).toThrow(/fill/);
    expect(plan({version:1,entries:[{...entry("foe-test","portrait","portrait"),fill:0.9}]},[{file:"portrait.png",width:1024,height:1024}]).map((j:{source:string})=>j.source)).toEqual(["portrait.png","portrait.png","portrait.png"]);
  });
});
describe("the title logo (ticket 121)",()=>{
  it("plans a logo at 640 and 1280 wide, 3:1, from its one full-size source, never upscaled",()=>{
    const jobs=plan({version:1,entries:[entry("logo","logo","logo")]},[{file:"logo.png",width:2172,height:724}]);
    expect(jobs.map((j:{source:string;width:number;height:number})=>[j.source,j.width,j.height])).toEqual([["logo.png",640,213],["logo.png",1280,427]]);
    expect(()=>plan({version:1,entries:[entry("logo","logo","logo")]},[{file:"logo.png",width:1200,height:400}])).toThrow(/upscale/);
  });
  it("rejects a logo whose source is not 3:1, or that has none",()=>{
    expect(()=>plan({version:1,entries:[entry("logo","logo","logo")]},[{file:"logo.png",width:2172,height:1024}])).toThrow(/3:1/);
    expect(()=>plan({version:1,entries:[entry("logo","logo","logo")]},[])).toThrow(/3:1/);
  });
  it("keeps the selection's checks for a logo: one accepted entry per role, a clean source path",()=>{
    const files=[{file:"logo.png",width:2172,height:724}];
    expect(()=>plan({version:1,entries:[entry("logo","logo","logo"),entry("logo","logo","logo")]},files)).toThrow(/Multiple accepted/);
    expect(()=>plan({version:1,entries:[entry("logo","logo","logo.png")]},files)).toThrow(/source/);
    expect(()=>plan({version:1,entries:[entry("logo","logo","../logo")]},files)).toThrow(/source/);
  });
});
describe.skipIf(!available)("UI art preparation fixtures",()=>{
  it("encodes a logo with its alpha and refuses a flattened (opaque) one",async()=>{
    const src=root+"/logo-src", logoOut=root+"/logo-out";
    mkdirSync(src,{recursive:true});
    const make=(name:string,alpha:boolean)=>{const r=spawnSync("magick",["-size","1536x512","gradient:#223344-#ccddee",...(alpha?["-alpha","set","-channel","A","-evaluate","set","60%","+channel"]:[]),src+"/"+name+".png"],{encoding:"utf8"});if(r.status!==0) throw Error(r.stderr);};
    make("logo",true); make("flat",false);
    const config={artSrc:src,out:logoOut,table:root+"/logo-table.json",work:root+"/logo-work",pendingOut:root+"/logo-pending"};
    await prepare({...config,selection:{version:1,entries:[entry("logo","logo","logo")]}});
    for(const [file,size] of [["logo.640.webp","640 213"],["logo.1280.webp","1280 427"]]) {
      expect(spawnSync("magick",["identify","-format","%w %h",logoOut+"/"+file],{encoding:"utf8"}).stdout).toBe(size);
      expect(spawnSync("magick",["identify","-format","%[opaque]",logoOut+"/"+file],{encoding:"utf8"}).stdout.toLowerCase()).toBe("false");
    }
    expect(JSON.parse(readFileSync(root+"/logo-table.json","utf8")).roles.logo).toMatchObject({kind:"logo",alt:"logo",widths:[640,1280]});
    await expect(prepare({...config,out:root+"/flat-out",table:root+"/flat-table.json",selection:{version:1,entries:[entry("logo","logo","flat")]}})).rejects.toThrow(/alpha/);
  },60000);
  it("builds accepted media transactionally, stays unchanged on rerun, checks corruption, isolates pending and preserves old output on failure",async()=>{
    mkdirSync(artSrc,{recursive:true}); for(const w of [64,128,256]) png("icon."+w,w,w);
    png("portrait",1024,1024); png("stage",1536,864); png("bg",1536,1024);
    // Fixture crop must support both output widths without upscaling.
    selection.entries[3]!.crop="1536x864+0+80";
    const config={selection,artSrc,out,table,work:root+"/work",pendingOut:root+"/pending"};
    await prepare(config);
    const manifest=JSON.parse(readFileSync(out+"/manifest.json","utf8"));
    expect(Object.keys(manifest.roles)).toHaveLength(4); expect(manifest.roles["gun-pending"]).toBeUndefined();
    expect(manifest.roles["gun-test"].sizes).toHaveLength(3); expect(manifest.roles["stage-test"].sizes).toHaveLength(4); expect(manifest.roles["bg-test"].sizes).toHaveLength(2);
    for(const r of Object.values(manifest.roles) as {sizes:{file:string;bytes:number;md5:string;width:number;height:number}[]}[]) for(const f of r.sizes){
      expect(statSync(out+"/"+f.file).size).toBe(f.bytes);expect(hash(out+"/"+f.file)).toBe(f.md5);
      expect(spawnSync("magick",["identify","-format","%w %h",out+"/"+f.file],{encoding:"utf8"}).stdout).toBe(`${f.width} ${f.height}`);
    }
    for(const file of ["gun-test.64.webp","foe-test.256.webp"]) expect(spawnSync("magick",["identify","-format","%[opaque]",out+"/"+file],{encoding:"utf8"}).stdout.toLowerCase()).toBe("false");
    const runtime=JSON.parse(readFileSync(table,"utf8")); expect(Object.keys(runtime.roles)).toEqual(Object.keys(manifest.roles));
    const paths=[...readdirSync(out).map(f=>out+"/"+f),table]; const before=paths.map(p=>[hash(p),statSync(p).mtimeMs]);
    const rerun=await prepare(config);expect(rerun.written).toBe(0);expect(paths.map(p=>[hash(p),statSync(p).mtimeMs])).toEqual(before);
    await expect(prepare({...config,check:true})).resolves.toMatchObject({written:0});
    const f=out+"/gun-test.64.webp", original=readFileSync(f); writeFileSync(f,Buffer.concat([original,Buffer.from([1])]));
    await expect(prepare({...config,check:true})).rejects.toThrow(/gun-test.64.webp/);writeFileSync(f,original);
    await prepare({...config,pending:true}); expect(readdirSync(root+"/pending").filter(f=>f.endsWith(".webp"))).toHaveLength(3);
    expect(paths.map(p=>hash(p))).toEqual(before.map(v=>v[0]));
    const bad={...selection,entries:[...selection.entries,entry("stage-bad","stage","bad")]};png("bad",100,100);
    await expect(prepare({...config,selection:bad})).rejects.toThrow(/16:9/);expect(paths.map(p=>hash(p))).toEqual(before.map(v=>v[0]));
    // A conversion error after valid jobs must also leave the old generation intact.
    const encoder=root+"/fail-second.mjs";
    writeFileSync(encoder, '#!/usr/bin/env node\nimport {existsSync,writeFileSync} from "node:fs"; import {spawnSync} from "node:child_process";const marker=process.argv[1]+".ran";if(existsSync(marker))process.exit(9);writeFileSync(marker,"first conversion");process.exit(spawnSync("cwebp",process.argv.slice(2)).status??1);\n');
    chmodSync(encoder,0o755);
    await expect(prepare({...config,encoder,force:true})).rejects.toThrow();expect(paths.map(p=>hash(p))).toEqual(before.map(v=>v[0]));
    writeFileSync(out+"/gun-test.999.webp","foreign");await expect(prepare({...config,check:true})).rejects.toThrow(/gun-test.999.webp/);rmSync(out+"/gun-test.999.webp");
    const saved=readFileSync(table);writeFileSync(table,"{}");await expect(prepare({...config,check:true})).rejects.toThrow(/table/);writeFileSync(table,saved);
    const source=readFileSync(artSrc+"/icon.64.png");writeFileSync(artSrc+"/icon.64.png",Buffer.concat([source,Buffer.from([0])]));await expect(prepare({...config,check:true})).rejects.toThrow(/source/);writeFileSync(artSrc+"/icon.64.png",source);
    // Only obsolete manifest-owned files are removed.
    writeFileSync(out+"/unrelated.txt","keep");await prepare({...config,selection:{...selection,entries:selection.entries.map(e=>({...e,accepted:e.role==="foe-test"}))}});
    expect(readdirSync(out)).toContain("unrelated.txt");expect(readdirSync(out)).not.toContain("gun-test.64.webp");
  },60000);
});
