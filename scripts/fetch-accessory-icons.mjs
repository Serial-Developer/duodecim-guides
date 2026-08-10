// Icônes de rang et de type des accessoires, depuis le Final Fantasy Wiki.
//
// Il n'y a que quatorze icônes distinctes pour 551 accessoires : quatre rangs
// (S/A/B/C) et dix types de booster. On en récupère donc une de chaque, et le
// site les associe par le `rank` et le `boosterType` déjà présents dans
// data/build/accessories.json — extraits de cette même page.
//
// Deux pièges du Fandom, tous deux documentés dans CLAUDE.md :
//  - /wiki/… répond 403 aux fetchers : on passe par api.php ;
//  - une URL en .png sert du WebP, que resvg ne décode pas : d'où
//    « ?format=original », l'en-tête Accept ne suffisant pas.
//
// Usage : node scripts/fetch-accessory-icons.mjs [--force]
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'accessory-icons');
const FORCE = process.argv.includes('--force');
const UA = 'duodecim-guides/1.0 (+https://github.com/Serial-Developer/duodecim-guides)';

// Nom du fichier wiki -> nom local. La clé locale est celle que porte la donnée
// (`rank` ou `boosterType`), pour que l'association se fasse sans table.
const ICONS = {
  'Dissidia-SRank-Icon.png': 'rank-S.png',
  'Dissidia-ARank-Icon.png': 'rank-A.png',
  'Dissidia-BRank-Icon.png': 'rank-B.png',
  'Dissidia-CRank-Icon.png': 'rank-C.png',
  'DFF-HP-Icon.png': 'type-HP.png',
  'DFF-BRV-Icon.png': 'type-BRV.png',
  'DFF-OPP-Icon.png': 'type-OPP.png',
  'DFF-EX-Icon.png': 'type-EX.png',
  'DFF-AS-Icon.png': 'type-AS.png',
  'DFF-ETC-Icon.png': 'type-ETC.png',
  'DFF-ATK-Icon.png': 'type-ATK.png',
  'DFF-STG-Icon.png': 'type-STG.png',
  'DFF-TIME-Icon.png': 'type-TIME.png',
  'DFF-LV-Icon.png': 'type-LV.png',
  // Icônes de catégorie. Le wiki les emploie en en-tête de section, et à la
  // place du rang sur les treize accessoires Qu'Bia — les seuls qu'il ne
  // classe pas. C'est donc le seul repère visuel dont ceux-là disposent.
  'DFF-Basic-Icon.png': 'cat-basic.png',
  'DFF-Booster-Icon.png': 'cat-booster.png',
  'DFF-Special-Icon.png': 'cat-special.png',
  'DFF-Trade-Icon.png': 'cat-trade.png',
};

const API = 'https://finalfantasy.fandom.com/api.php';

async function urlsOf(titles) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url',
    titles: titles.map((t) => `File:${t}`).join('|'),
  });
  const res = await fetch(`${API}?${q}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`api.php a répondu ${res.status}`);
  const data = await res.json();
  const out = {};
  for (const page of Object.values(data.query?.pages || {})) {
    const url = page.imageinfo?.[0]?.url;
    if (url) out[String(page.title).replace(/^File:/, '')] = url;
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
const manquants = Object.keys(ICONS).filter((f) => FORCE || !existsSync(join(OUT, ICONS[f])));
if (!manquants.length) {
  console.log('Icônes d’accessoires : déjà présentes (--force pour re-télécharger).');
} else {
  const urls = await urlsOf(manquants);
  let ok = 0;
  const absents = [];
  for (const fichier of manquants) {
    const base = urls[fichier];
    if (!base) { absents.push(fichier); continue; }
    // `?format=original` ne vaut que sur l'URL nue du fichier : appliqué à
    // l'URL de révision que rend l'API (…/revision/latest?cb=…), le paramètre
    // se perd derrière la query existante et le WebP est servi quand même.
    const res = await fetch(`${base.split('/revision/')[0]}?format=original`, { headers: { 'User-Agent': UA } });
    if (!res.ok) { absents.push(`${fichier} (${res.status})`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    // Un WebP servi malgré tout commencerait par « RIFF » : on refuse plutôt
    // que d'écrire une image que le site ne saura pas afficher partout.
    if (buf.slice(0, 4).toString('latin1') === 'RIFF') { absents.push(`${fichier} (WebP)`); continue; }
    writeFileSync(join(OUT, ICONS[fichier]), buf);
    ok++;
  }
  console.log(`Icônes d’accessoires : ${ok} écrite(s) dans assets/accessory-icons/.`);
  if (absents.length) console.warn(`(non récupérées : ${absents.join(', ')})`);
}
