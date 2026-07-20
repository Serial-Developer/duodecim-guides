// Copie locale des portraits + icônes officiels du wiki via la Wayback Machine.
// Le CDN resources.dissidia.wiki est en panne (301 -> 404 vérifié en juillet 2026) ;
// web.archive.org conserve des snapshots des mêmes fichiers (vérifié : PNG intègre).
// Usage : node scripts/fetch-images.mjs
import { CHARACTERS, SPECIAL } from './characters.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTRAITS = join(ROOT, 'assets', 'portraits');
const ICONS = join(ROOT, 'assets', 'icons');
mkdirSync(PORTRAITS, { recursive: true });
mkdirSync(ICONS, { recursive: true });

// Timestamp pivot : snapshot vérifié en Phase 0 (janvier 2026) ; la Wayback
// redirige vers le snapshot le plus proche disponible pour chaque URL.
const WB = (url) => `https://web.archive.org/web/20260114if_/${url}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isPng = (buf) => buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';

async function grab(url, dest, label) {
  if (existsSync(dest)) {
    console.log(`cache  ${label}`);
    return { label, status: 'cached' };
  }
  try {
    const res = await fetch(WB(url), { redirect: 'follow' });
    if (!res.ok) {
      console.warn(`ERREUR ${label}: HTTP ${res.status}`);
      await sleep(1200);
      return { label, url, status: res.status };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isPng(buf)) {
      console.warn(`ERREUR ${label}: pas un PNG (${buf.length} o)`);
      await sleep(1200);
      return { label, url, status: 'not-png' };
    }
    writeFileSync(dest, buf);
    console.log(`ok     ${label} (${buf.length} o)`);
    await sleep(1200);
    return { label, status: 200, size: buf.length };
  } catch (e) {
    console.error(`ERREUR ${label}: ${e.message}`);
    await sleep(1200);
    return { label, url, status: 'error', error: e.message };
  }
}

const jobs = [];
for (const c of [...CHARACTERS, ...SPECIAL]) {
  const dataFile = join(ROOT, 'data', 'characters', `${c.slug}.json`);
  if (existsSync(dataFile)) {
    const d = JSON.parse(readFileSync(dataFile, 'utf-8'));
    if (d.portraitUrl) jobs.push({ url: d.portraitUrl, dest: join(PORTRAITS, `${c.slug}.png`), label: `portrait ${c.slug}` });
    else console.warn(`(pas de portraitUrl pour ${c.slug})`);
  }
  if (c.icon) jobs.push({ url: `https://resources.dissidia.wiki/ddff/chara-icon/ddff-icon-${c.icon}.png`, dest: join(ICONS, `${c.slug}.png`), label: `icone ${c.slug}` });
}

const results = [];
for (const j of jobs) results.push(await grab(j.url, j.dest, j.label));
const failed = results.filter((r) => r.status !== 200 && r.status !== 'cached');
writeFileSync(join(ROOT, 'reports', 'images-log.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length} images, ${failed.length} échec(s)`);
if (failed.length) console.log(failed.map((f) => `  - ${f.label}: ${f.status}`).join('\n'));
