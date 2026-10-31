import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, renameSync, rmSync, lstatSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const WIDTHS = { icon: [64, 128, 256], portrait: [64, 128, 256], stage: [192, 384, 768, 1536], bg: [1280, 1536], track: [512, 1024] };
/** Width over height per kind; a track is a slider's groove (ticket 225: 1024 × 64, drawn stretched by the kit). */
export const ASPECT = { icon: 1, portrait: 1, stage: 16 / 9, bg: 16 / 9, track: 16 };
/** Kinds drawn over the UI with real alpha, made from sized sources (`<source>.<width>.png`) when there are any. */
const SIZED = new Set(['icon', 'portrait', 'track']);
/** Where the game fetches UI art (the runtime table's base). */
export const BASE = '/assets/typing-survival/ui/';
/** The folder this tool writes: Vite copies public/ into dist as is, so it serves at BASE. */
export const OUT = 'public' + BASE.slice(0, -1);
/** The build record beside the WebP files; vite.config.ts UI_ART_RECORD keeps it out of dist. */
export const RECORD = 'manifest.json';
const json = value => JSON.stringify(value, null, 2) + '\n';
const md5 = data => createHash('md5').update(data).digest('hex');
const readJson = path => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
const sortObject = pairs => Object.fromEntries(pairs.sort(([a], [b]) => a.localeCompare(b, 'en')));
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}
function dimensions(path) {
  const [width, height] = run(process.env.ART_MAGICK || 'magick', ['identify', '-format', '%w %h', path]).trim().split(/\s+/).map(Number);
  return { width, height };
}
function validate(selection) {
  if (!Number.isInteger(selection.version) || selection.version < 1 || !Array.isArray(selection.entries)) throw new Error('Invalid selection version or entries');
  const seen = new Set();
  for (const entry of selection.entries) {
    if (!/^[a-z0-9-]+$/.test(entry.role) || !WIDTHS[entry.kind]) throw new Error(`Invalid role or kind: ${entry.role}`);
    if (entry.source !== null && (typeof entry.source !== 'string' || !/^[\w./-]+$/.test(entry.source) || entry.source.split('/').includes('..') || entry.source.startsWith('/') || /\.png$|\.(64|128|256)$/.test(entry.source))) throw new Error(`Invalid source: ${entry.role}`);
    if (entry.accepted) {
      if (seen.has(entry.role)) throw new Error(`Multiple accepted entries: ${entry.role}`);
      seen.add(entry.role);
    }
  }
}
/** Pure plan; files are relative PNG paths with measured width and height. */
export function plan(selection, files) {
  validate(selection);
  return selection.entries.filter(e => e.accepted && e.source).sort((a,b) => a.role.localeCompare(b.role, 'en')).flatMap(entry => {
    const exactBase = files.find(f => f.file === `${entry.source}.png`);
    let crop;
    if (entry.kind === 'bg') {
      const match = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(entry.crop ?? '');
      if (!match) throw new Error(`Invalid crop: ${entry.role}`);
      const [width,height,x,y] = match.slice(1).map(Number);
      crop = {width,height,x,y};
      if (width * 9 !== height * 16 || !exactBase || x + width > exactBase.width || y + height > exactBase.height) throw new Error(`Invalid 16:9 crop: ${entry.role}`);
    }
    if (entry.kind === 'stage' && (!exactBase || exactBase.width * 9 !== exactBase.height * 16)) throw new Error(`Stage requires a 16:9 source: ${entry.role}`);
    return WIDTHS[entry.kind].map(width => {
      const height = Math.round(width / ASPECT[entry.kind]);
      let source = exactBase;
      if (SIZED.has(entry.kind)) {
        const candidates = files.filter(f => f.file === `${entry.source}.png` || (f.file.startsWith(`${entry.source}.`) && /^\d+\.png$/.test(f.file.slice(entry.source.length + 1))));
        source = candidates.find(f => f.file === `${entry.source}.${width}.png`);
        if (!source) source = candidates.filter(f => f.width >= width && f.height >= height).sort((a,b) => a.width - b.width || a.file.localeCompare(b.file, 'en'))[0];
        if (source && source.width !== source.height * ASPECT[entry.kind]) throw new Error(entry.kind === 'track' ? `Track requires a 16:1 source: ${source.file}` : `Square source required: ${source.file}`);
      }
      if (!source || (crop?.width ?? source.width) < width || (crop?.height ?? source.height) < height) throw new Error(`No larger source; cannot upscale ${entry.role}.${width}`);
      return { entry, source: source.file, width, height, ...(crop ? {crop} : {}) };
    });
  });
}
function inventory(selection, artSrc) {
  const names = new Set();
  for (const e of selection.entries.filter(e => e.accepted && e.source)) {
    const folder = dirname(e.source), stem = basename(e.source), path = join(artSrc, folder);
    if (!existsSync(path)) continue;
    for (const name of readdirSync(path)) if (name === `${stem}.png` || (name.startsWith(stem + '.') && /^\d+\.png$/.test(name.slice(stem.length + 1)))) names.add(join(folder,name));
  }
  return [...names].sort().map(file => ({file, ...dimensions(join(artSrc,file))}));
}
function fingerprints(jobs, artSrc) {
  return sortObject([...new Set(jobs.map(j => j.entry.role))].map(role => {
    const group = jobs.filter(j => j.entry.role === role);
    const sourceFiles = sortObject([...new Set(group.map(j => j.source))].map(file => [file, md5(readFileSync(join(artSrc,file)))]));
    const hashes = Object.values(sourceFiles);
    return [role, { ticket: group[0].entry.ticket, source: group[0].entry.source, sourceFiles, sourceMd5: hashes.length === 1 ? hashes[0] : md5(json(sourceFiles)) }];
  }));
}
function runtime(selection, roles) {
  return {version:selection.version, base:BASE, roles:sortObject(Object.entries(roles).map(([role,info]) => {
    const entry = selection.entries.find(e => e.role === role && e.accepted);
    return [role,{kind:entry.kind,alt:entry.alt,rev:info.sourceMd5.slice(0,8),widths:info.sizes.map(s => s.width),aspect:Math.round(info.sizes[0].width / info.sizes[0].height * 1e6) / 1e6}];
  }))};
}
function psnr(png, webp) {
  const result = spawnSync(process.env.ART_MAGICK || 'magick', ['compare','-metric','PSNR',png,webp,'null:'], {encoding:'utf8'});
  if (result.error || ![0,1].includes(result.status)) throw new Error(`PSNR: ${result.error?.message ?? result.stderr}`);
  const value = result.stderr.trim();
  if (/^inf/i.test(value)) return 'Infinity';
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid PSNR: ${value}`);
  return Math.round(number * 1e6) / 1e6;
}
function safeOutput(path) {
  let part = resolve(path);
  while (true) {
    if (existsSync(part) && lstatSync(part).isSymbolicLink()) throw new Error(`Output must be a real directory, not a symlink: ${part}`);
    const parent = dirname(part); if (parent === part) break; part = parent;
  }
}
function sameMeta(a,b) {
  return a && a.ticket===b.ticket && a.source===b.source && a.sourceMd5===b.sourceMd5 && json(a.sourceFiles)===json(b.sourceFiles);
}
function verifyFile(out, size) {
  const path = join(out,size.file);
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  const data = readFileSync(path);
  if (data.length !== size.bytes || md5(data) !== size.md5) throw new Error(`Media bytes/md5 differ: ${path}`);
}
/** Stage all conversions first; rollback also covers publication failures. */
function publish(changes, removals, work, finalChanges) {
  const applied = [];
  mkdirSync(join(work,'backup'),{recursive:true});
  try {
    for (const [target, staged] of [...changes, ...removals.map(p => [p,null]), ...finalChanges]) {
      mkdirSync(dirname(target),{recursive:true});
      const backup = existsSync(target) ? join(work,'backup',String(applied.length)) : null;
      if (backup) renameSync(target,backup);
      applied.push({target,backup});
      if (staged) renameSync(staged,target);
    }
  } catch (error) {
    for (const {target,backup} of applied.reverse()) { rmSync(target,{force:true}); if (backup) renameSync(backup,target); }
    throw error;
  }
}
export async function prepare(options = {}) {
  const {selection = readJson(fileURLToPath(new URL('./selection.json',import.meta.url))), artSrc = 'art-src', out:requestedOut = OUT, table = 'src/view/ui-art.json', check = false, pending = false, work = 'tmp/ui-art/work', pendingOut = 'tmp/ui-art/pending', encoder = 'cwebp', force = false} = options;
  if (!existsSync(artSrc)) { const error = new Error(`Missing --art-src directory: ${artSrc}. Pass --art-src ../typing-survival/art-src in the worktree.`); error.exitCode = 2; throw error; }
  if (check && pending) throw new Error('--check and --pending are separate modes');
  validate(selection);
  const selected = pending ? {...selection, entries:selection.entries.filter(e=>!e.accepted && e.source).map(e=>({...e,accepted:true}))} : selection;
  const out = pending ? pendingOut : requestedOut;
  if (pending && !resolve(out).startsWith(resolve('tmp') + '/')) throw new Error('Pending output must be inside tmp/');
  safeOutput(out); if (!pending) safeOutput(table);
  const jobs = plan(selected,inventory(selected,artSrc));
  const stamps = fingerprints(jobs,artSrc), old = readJson(join(out,RECORD));
  const expectedNames = jobs.map(j => `${j.entry.role}.${j.width}.webp`);
  if (check) {
    if (!old || old.version !== selected.version) throw new Error('Missing or outdated manifest.json');
    if (json(Object.keys(old.roles).sort()) !== json(Object.keys(stamps).sort())) throw new Error('Manifest roles differ from selection');
    for (const [role,stamp] of Object.entries(stamps)) {
      const previous = old.roles[role];
      if (!sameMeta(previous,stamp)) throw new Error(`Changed source or selection: ${role}`);
      const group=jobs.filter(j=>j.entry.role===role);
      if (json(previous.sizes.map(s=>[s.file,s.width,s.height])) !== json(group.map(j=>[`${role}.${j.width}.webp`,j.width,j.height]))) throw new Error(`Manifest sizes differ: ${role}`);
      previous.sizes.forEach(s=>verifyFile(out,s));
    }
    for (const name of readdirSync(out)) if (name.endsWith('.webp') && selection.entries.some(e=>name.startsWith(e.role+'.')) && !expectedNames.includes(name)) throw new Error(`Unknown role WebP: ${name}`);
    if (!existsSync(table) || readFileSync(table,'utf8') !== json(runtime(selected,old.roles))) throw new Error(`Runtime table differs: ${table}`);
    console.log('UI art check: OK'); return {written:0,manifest:old};
  }
  const roles = {}, changes = [];
  mkdirSync(work,{recursive:true});
  try {
    for (const [role,stamp] of Object.entries(stamps)) {
      const group=jobs.filter(j=>j.entry.role===role), previous=old?.roles?.[role];
      let reusable=!force && sameMeta(previous,stamp) && json(previous.sizes?.map(s=>[s.file,s.width,s.height]))===json(group.map(j=>[`${role}.${j.width}.webp`,j.width,j.height]));
      if (reusable) try { previous.sizes.forEach(s=>verifyFile(out,s)); } catch { reusable=false; }
      if (reusable) {
        roles[role]=previous;
        if (pending) for (const size of previous.sizes) console.log(`${size.file}: ${size.bytes} bytes, PSNR ${size.psnr} (unchanged)`);
        continue;
      }
      const sizes=[];
      for (const job of group) {
        const {entry,width,height,crop}=job, file=`${role}.${width}.webp`, png=join(work,`${role}.${width}.png`), webp=join(work,file);
        const args=[join(artSrc,job.source)];
        if (crop) args.push('-crop',entry.crop,'+repage');
        args.push('-colorspace','sRGB','-filter','Lanczos','-resize',`${width}x${height}!`,'-strip',png);
        run(process.env.ART_MAGICK || 'magick',args);
        const alpha=SIZED.has(entry.kind);
        let quality=alpha?90:84, lossless=false;
        const encode=()=>run(encoder,['-quiet','-metadata','none','-m','6',...(lossless?['-lossless']:['-q',String(quality),...(alpha?['-alpha_q','100']:[])]),png,'-o',webp]);
        encode(); let metric=psnr(png,webp);
        if (Number(metric)<35) { if(alpha) lossless=true; else quality=92; encode(); metric=psnr(png,webp); }
        const data=readFileSync(webp);
        sizes.push({file,width,height,bytes:data.length,md5:md5(data),psnr:metric,lossless,quality:lossless?null:quality});
        changes.push([join(out,file),webp]);
        console.log(`${file}: ${data.length} bytes, PSNR ${metric}${lossless?', lossless':`, q${quality}`}`);
      }
      roles[role]={...stamp,sizes};
    }
    const manifest={version:selected.version,roles};
    const removals=Object.entries(old?.roles??{}).filter(([r])=>!stamps[r]).flatMap(([,r])=>r.sizes.map(s=>s.file)).filter(f=>basename(f)===f && f.endsWith('.webp')).map(f=>join(out,f));
    const finalChanges=[];
    const save=(target,value,name)=>{ const data=json(value); if(existsSync(target)&&readFileSync(target,'utf8')===data)return; const staged=join(work,name);writeFileSync(staged,data); finalChanges.push([target,staged]); };
    save(join(out,RECORD),manifest,'manifest.next.json');
    if(!pending) save(table,runtime(selected,roles),'table.next.json');
    const written=changes.length+finalChanges.length;
    publish(changes,removals,work,finalChanges);
    console.log(`UI art: ${written} files written, ${removals.length} removed${pending?' (pending, tmp only)':''}`);
    return {written,manifest};
  } finally { rmSync(work,{recursive:true,force:true}); }
}
export async function main(args=process.argv.slice(2)) {
  if(args.includes('--help')) { console.log('pnpm ui-art:prepare [--art-src <dir>] [--out <dir>] [--table <file>] [--check] [--pending] [--help]'); return; }
  const options={};
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--check'||arg==='--pending')options[arg.slice(2)]=true;
    else if(['--art-src','--out','--table'].includes(arg)&&args[i+1]&&!args[i+1].startsWith('--')) options[{'--art-src':'artSrc','--out':'out','--table':'table'}[arg]]=args[++i];
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  await prepare(options);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=error.exitCode??1;});
