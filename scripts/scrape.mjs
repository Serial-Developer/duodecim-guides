// Récupération des pages dissidia.wiki vers cache/ (HTML brut, jamais re-fetché si présent).
// Usage : node scripts/scrape.mjs [--force]
import { CHARACTERS, SPECIAL, META_PAGES } from './characters.mjs';
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'cache');
const UA = 'dissidia012-guides-builder/0.1 (site fan non commercial; contact: jonathan@bt-consulting.io)';
const DELAY_MS = 2000;
const force = process.argv.includes('--force');

mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cachePath = (page) => join(CACHE, page.replaceAll('/', '__') + '.html');

async function fetchPage(page) {
  const file = cachePath(page);
  if (!force && existsSync(file) && statSync(file).size > 0) {
    console.log(`cache  ${page}`);
    return { page, status: 'cached' };
  }
  const url = `https://dissidia.wiki/${page}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const body = await res.text();
    if (res.status === 200 && body.length > 0) {
      writeFileSync(file, body);
      console.log(`fetch  ${page} (${res.status}, ${body.length} o)`);
      await sleep(DELAY_MS);
      return { page, status: 200, size: body.length };
    }
    console.warn(`ERREUR ${page} -> HTTP ${res.status}`);
    await sleep(DELAY_MS);
    return { page, status: res.status };
  } catch (e) {
    console.error(`ERREUR ${page} -> ${e.message}`);
    await sleep(DELAY_MS);
    return { page, status: 'error', error: e.message };
  }
}

const pages = [
  ...CHARACTERS.map((c) => c.page),
  ...CHARACTERS.map((c) => c.page + '/Matchups'),
  ...SPECIAL.map((c) => c.page),
  ...META_PAGES,
];

const results = [];
for (const p of pages) results.push(await fetchPage(p));

const failed = results.filter((r) => r.status !== 200 && r.status !== 'cached');
writeFileSync(join(ROOT, 'reports', 'scrape-log.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length} pages, ${failed.length} échec(s)`);
if (failed.length) console.log(failed.map((f) => `  - ${f.page}: ${f.status}`).join('\n'));
