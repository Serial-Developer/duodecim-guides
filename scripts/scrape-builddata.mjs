// Récupération des sources du créateur de builds vers cache/ (jamais re-fetché si présent).
//
// Deux origines :
//  - dissidia.wiki : HTML brut, comme scrape.mjs (abilities, statistiques, assists,
//    summons, règles de tournoi).
//  - finalfantasy.fandom.com : les listes exhaustives d'équipements et d'accessoires
//    de Dissidia 012 n'existent pas sur dissidia.wiki (pages 404). Le HTML /wiki/ du
//    Fandom répond 403 aux fetchers : on passe par api.php action=parse&prop=wikitext,
//    qui renvoie le wikitext source (plus simple à parser, et stable).
//
// Usage : node scripts/scrape-builddata.mjs [--force]
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'cache');
const CACHE_FANDOM = join(CACHE, 'fandom');
const UA = 'dissidia012-guides-builder/0.1 (site fan non commercial; contact: https://github.com/Serial-Developer/duodecim-guides)';
const DELAY_MS = 2000;
const force = process.argv.includes('--force');

mkdirSync(CACHE, { recursive: true });
mkdirSync(CACHE_FANDOM, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pages dissidia.wiki nécessaires au créateur de builds (les pages personnages et
// le Multiplayer Build Guide sont déjà récupérées par scrape.mjs).
export const BUILD_PAGES = [
  'Abilities_(Dissidia_012)',
  'Statistic_(Dissidia_012)',
  'Assist_(Dissidia_012)',
  'Summons_(Dissidia_012)',
  'Tournament_Rules_(Dissidia_012)',
  'Special_Effects_(Dissidia_012)',
];

// Pages Fandom (wikitext). Combination mélange Dissidia 2008 et 012 : le parseur
// filtre sur la section « List of Dissidia 012 ... » / la classe CSS D012.
export const FANDOM_PAGES = [
  'Dissidia_012_Final_Fantasy_weapons',
  'Dissidia_012_Final_Fantasy_armor',
  'Dissidia_012_Final_Fantasy_accessories',
  'Combination',
  // Pages personnages du Fandom : leur section « Bravery to HP Attacks » donne,
  // pour chaque attaque HP branchée, la bravery dont elle part (colonne
  // « Obtained »). Liste des personnages concernés obtenue via
  // Category:Bravery_to_HP_abilities_in_Dissidia_012_Final_Fantasy.
  ...[
    'Warrior of Light', 'Firion', 'Onion Knight', 'Cloud Strife', 'Terra Branford',
    'Bartz Klauser', 'Golbez', 'Zidane Tribal', 'Tidus', 'Tifa Lockhart', 'Lightning',
  ].map((n) => `${n.replaceAll(' ', '_')}_(Dissidia_PSP)`),
];

async function fetchWiki(page) {
  const file = join(CACHE, page.replaceAll('/', '__') + '.html');
  if (!force && existsSync(file) && statSync(file).size > 0) {
    console.log(`cache  ${page}`);
    return { page, source: 'dissidia.wiki', status: 'cached' };
  }
  const url = `https://dissidia.wiki/${page}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const body = await res.text();
    await sleep(DELAY_MS);
    if (res.status === 200 && body.length > 0) {
      writeFileSync(file, body);
      console.log(`fetch  ${page} (${res.status}, ${body.length} o)`);
      return { page, source: 'dissidia.wiki', status: 200, size: body.length, url };
    }
    console.warn(`ERREUR ${page} -> HTTP ${res.status}`);
    return { page, source: 'dissidia.wiki', status: res.status, url };
  } catch (e) {
    await sleep(DELAY_MS);
    console.error(`ERREUR ${page} -> ${e.message}`);
    return { page, source: 'dissidia.wiki', status: 'error', error: e.message, url };
  }
}

async function fetchFandom(page) {
  const file = join(CACHE_FANDOM, page + '.wikitext');
  if (!force && existsSync(file) && statSync(file).size > 0) {
    console.log(`cache  fandom/${page}`);
    return { page, source: 'finalfantasy.fandom.com', status: 'cached' };
  }
  const api = `https://finalfantasy.fandom.com/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&formatversion=2&format=json`;
  const url = `https://finalfantasy.fandom.com/wiki/${page}`;
  try {
    const res = await fetch(api, { headers: { 'User-Agent': UA } });
    const json = await res.json();
    await sleep(DELAY_MS);
    const text = json?.parse?.wikitext;
    if (res.status === 200 && typeof text === 'string' && text.length > 0) {
      writeFileSync(file, text);
      console.log(`fetch  fandom/${page} (${res.status}, ${text.length} o)`);
      return { page, source: 'finalfantasy.fandom.com', status: 200, size: text.length, url };
    }
    console.warn(`ERREUR fandom/${page} -> ${json?.error?.code || res.status}`);
    return { page, source: 'finalfantasy.fandom.com', status: json?.error?.code || res.status, url };
  } catch (e) {
    await sleep(DELAY_MS);
    console.error(`ERREUR fandom/${page} -> ${e.message}`);
    return { page, source: 'finalfantasy.fandom.com', status: 'error', error: e.message, url };
  }
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1].endsWith('scrape-builddata.mjs')) {
  const results = [];
  for (const p of BUILD_PAGES) results.push(await fetchWiki(p));
  for (const p of FANDOM_PAGES) results.push(await fetchFandom(p));

  const failed = results.filter((r) => r.status !== 200 && r.status !== 'cached');
  mkdirSync(join(ROOT, 'reports'), { recursive: true });
  writeFileSync(join(ROOT, 'reports', 'scrape-builddata-log.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length} pages, ${failed.length} échec(s)`);
  if (failed.length) console.log(failed.map((f) => `  - ${f.page}: ${f.status}`).join('\n'));
}
