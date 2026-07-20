// Screenshots de coups via la Wayback Machine (couverture partielle : seuls les
// fichiers effectivement archivés existent — les autres sont loggés et ignorés).
// Usage : node scripts/fetch-move-images.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHARS_DIR = join(ROOT, 'data', 'characters');
const OUT = join(ROOT, 'assets', 'moves');
mkdirSync(OUT, { recursive: true });

const WB = (url) => `https://web.archive.org/web/20260114if_/${url}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isImg = (buf) =>
  buf.subarray(0, 2).toString('hex') === 'ffd8' || buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';

// Collecte {slug, url, filename} pour tous les coups
const jobs = [];
for (const f of readdirSync(CHARS_DIR)) {
  const d = JSON.parse(readFileSync(join(CHARS_DIR, f), 'utf-8'));
  for (const key of ['bravery', 'hp']) {
    for (const g of Object.values(d.sections[key]?.groups || {})) {
      for (const m of g.moves) {
        if (m.image) jobs.push({ slug: d.slug, url: m.image, filename: decodeURIComponent(m.image.split('/').pop()) });
      }
    }
  }
}

const results = [];
let ok = 0, miss = 0, cached = 0;
for (const j of jobs) {
  const dir = join(OUT, j.slug);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, j.filename);
  if (existsSync(dest)) { cached++; results.push({ ...j, status: 'cached' }); continue; }
  try {
    const res = await fetch(WB(j.url), { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.ok && isImg(buf)) {
      writeFileSync(dest, buf);
      ok++;
      results.push({ ...j, status: 200, size: buf.length });
    } else {
      miss++;
      results.push({ ...j, status: res.status === 200 ? 'not-img' : res.status });
    }
  } catch (e) {
    miss++;
    results.push({ ...j, status: 'error', error: e.message });
  }
  if ((ok + miss) % 25 === 0) console.log(`  … ${ok + miss}/${jobs.length} (ok:${ok} absents:${miss})`);
  await sleep(900);
}

writeFileSync(join(ROOT, 'reports', 'move-images-log.json'), JSON.stringify(results, null, 2));
console.log(`\n${jobs.length} références : ${ok} récupérées, ${cached} en cache, ${miss} non archivées (voir reports/move-images-log.json)`);
