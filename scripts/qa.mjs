// QA : (1) aucune ressource locale manquante, (2) contrôle anti-invention
// (chaque section rendue est adossée à documented:true OU affiche le bandeau),
// (3) liens externes vivants (option --links, requêtes réseau).
// Usage : node scripts/qa.mjs [--links]
import { CHARACTERS, SPECIAL } from './characters.mjs';
import * as cheerio from 'cheerio';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const errors = [];
const warns = [];

// --- 1. Ressources locales ---
const htmlFiles = [
  join(DIST, 'index.html'),
  join(DIST, 'techniques.html'),
  join(DIST, 'install.html'),
  ...readdirSync(join(DIST, 'characters')).map((f) => join(DIST, 'characters', f)),
];
const externalLinks = new Set();
for (const file of htmlFiles) {
  const $ = cheerio.load(readFileSync(file, 'utf-8'));
  const base = dirname(file);
  $('[src], [href]').each((_, el) => {
    const url = $(el).attr('src') || $(el).attr('href');
    if (!url || url.startsWith('#') || url.startsWith('data:')) return;
    if (/^https?:/.test(url)) {
      externalLinks.add(url);
      return;
    }
    const target = join(base, url.split('#')[0]);
    if (!existsSync(target)) errors.push(`${file.replace(DIST, 'dist')} -> ressource locale manquante : ${url}`);
  });
  // ancres internes
  const ids = new Set();
  $('[id]').each((_, el) => ids.add($(el).attr('id')));
  $('a[href^="#"]').each((_, el) => {
    const anchor = $(el).attr('href').slice(1);
    if (anchor && !ids.has(anchor)) errors.push(`${file.replace(DIST, 'dist')} -> ancre morte : #${anchor}`);
  });
}

// --- 2. Anti-invention ---
const BANNER = 'Section non documentée';
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);
for (const c of [...CHARACTERS, ...SPECIAL]) {
  if (c.slug === 'chaos') continue;
  const htmlPath = join(DIST, 'characters', `${c.slug}.html`);
  if (!existsSync(htmlPath)) { errors.push(`guide manquant : ${c.slug}`); continue; }
  const html = readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const data = readJson(join(ROOT, 'data', 'characters', `${c.slug}.json`));
  const ed = readJson(join(ROOT, 'data', 'editorial', `${c.slug}.json`));
  const s = data.sections;

  // La section « Mécanique unique » n'existe que si le perso a une mécanique
  // (documentée par le wiki ou rédigée dans l'éditorial) : absente sinon, par design.
  const hasUnique = !!(s.uniqueMechanics?.documented || ed?.uniqueMechanics?.intro?.length);
  if (!hasUnique && $('#unique').length) errors.push(`${c.slug} : section #unique présente alors que le personnage n'a pas de mécanique unique`);

  const checks = [
    // passe d'enrichissement : l'overview/les builds peuvent être remplis depuis des
    // sources externes (sourcesBySection) même si le wiki ne documente pas la section.
    ['overview', !!ed?.overview?.length],
    ...(hasUnique ? [['unique', !!(ed?.uniqueMechanics?.intro?.length)]] : []),
    ['gameplan', !!ed?.gameplan?.length],
    ...(c.slug === 'aerith' ? [] : [['matchups', !!(ed?.matchups?.summary?.length)]]),
    ['builds', !!ed?.builds?.philosophy?.length],
    ['community', !!ed?.communityTech?.length],
  ];
  for (const [id, hasContent] of checks) {
    const section = $(`#${id}`);
    if (!section.length) { errors.push(`${c.slug} : section #${id} absente du HTML`); continue; }
    const hasBanner = section.find('.banner').length > 0;
    if (!hasContent && !hasBanner) {
      errors.push(`${c.slug} : section #${id} sans données documentées ET sans bandeau`);
    }
  }
  // les notes de coups FR doivent correspondre à des coups existants
  if (ed?.moveNotes) {
    const moveNames = new Set();
    for (const key of ['bravery', 'hp']) {
      for (const g of Object.values(s[key]?.groups || {})) g.moves.forEach((m) => m.name && moveNames.add(m.name));
    }
    for (const name of Object.keys(ed.moveNotes)) {
      if (!moveNames.has(name)) warns.push(`${c.slug} : moveNote « ${name} » ne correspond à aucun coup extrait (note non affichée)`);
    }
  }
}

// --- 3. Liens externes (optionnel) ---
if (process.argv.includes('--links')) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // gamefaqs : 403 systématique pour les clients non-navigateur (threads vérifiés
  // manuellement au moment de leur ajout) ; youtube : vérifié via oEmbed ci-dessous.
  const skip = /fonts\.(googleapis|gstatic)\.com|creativecommons\.org|web\.archive\.org|gamefaqs\.gamespot\.com/;
  const toCheck = [...externalLinks].filter((u) => !skip.test(u));
  console.log(`Vérification de ${toCheck.length} liens externes uniques…`);
  let done = 0;
  for (const url of toCheck) {
    try {
      // YouTube : l'API oEmbed publique dit si la vidéo est disponible (une page
      // watch répond 200 même pour une vidéo supprimée)
      const yt = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
      const target = yt ? `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${yt[1]}&format=json` : url;
      const res = await fetch(target, {
        method: 'GET',
        headers: { 'User-Agent': 'dissidia012-guides-qa/0.1' },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      if (res.status >= 400) errors.push(`lien externe ${res.status} : ${url}`);
    } catch (e) {
      errors.push(`lien externe injoignable : ${url} (${e.message})`);
    }
    done++;
    if (done % 10 === 0) console.log(`  … ${done}/${toCheck.length}`);
    await sleep(800);
  }
}

console.log(`\nQA : ${errors.length} erreur(s), ${warns.length} avertissement(s)`);
if (warns.length) console.log('\nAvertissements :\n' + warns.map((w) => '  ~ ' + w).join('\n'));
if (errors.length) {
  console.log('\nErreurs :\n' + errors.map((e) => '  ! ' + e).join('\n'));
  process.exit(1);
}
