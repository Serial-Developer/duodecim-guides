// Référencement : table des pages publiées, sitemap, 404 et humans.txt.
//
// Une seule table décrit toutes les pages transverses (clé de route, fichiers
// sources dont on lit les dates git, type schema.org). Le sitemap en découle —
// il n'est jamais écrit à la main, une page ajoutée ici y entre automatiquement.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { datesFor } from './git-dates.mjs';
import { SITE_URL, AUTHOR, AUTHOR_URL, absUrl } from '../src/site-config.mjs';
import { DEFAULT_LOCALE, LOCALE_META } from '../src/i18n/config.mjs';
import { pathFor } from '../src/i18n/routes.mjs';

// Pages hors guides personnages. `route` : clé de src/i18n/routes.mjs (le chemin
// publié en découle, par locale) ; `sources` : fichiers dont l'historique git
// détermine datePublished/dateModified — `{locale}` y est remplacé par la locale
// rendue, pour que chaque version porte la date de SA prose ; `ldType` : type
// schema.org.
export const PAGES = [
  {
    route: 'techniques', ldType: 'TechArticle', section: 'Techniques',
    sources: ['data/editorial/{locale}/_shared.json'],
  },
  {
    route: 'buildCreator', ldType: 'none', // JSON-LD WebApplication dédié
    sources: ['data/editorial/{locale}/_build-creator.json', 'data/build/equipment.json',
      'data/build/accessories.json', 'data/build/abilities.json'],
  },
  {
    route: 'multiplayer', ldType: 'Article', section: 'Jouer à Dissidia',
    sources: ['data/editorial/{locale}/_multiplayer.json'],
  },
  {
    route: 'install', ldType: 'TechArticle', section: 'Jouer à Dissidia',
    sources: ['data/editorial/{locale}/_install.json'],
  },
  {
    route: 'savedata', ldType: 'Article', section: 'Jouer à Dissidia',
    sources: ['data/editorial/{locale}/_savedata.json'],
  },
  {
    route: 'feralUnlock', ldType: 'TechArticle', section: 'Données du jeu',
    sources: ['data/editorial/{locale}/_feral-unlock.json'],
  },
  {
    route: 'participate', ldType: 'Article', section: 'Les tournois',
    sources: ['data/editorial/{locale}/_participer.json'],
  },
  {
    route: 'organize', ldType: 'TechArticle', section: 'Les tournois',
    sources: ['data/editorial/{locale}/_organiser.json'],
  },
  {
    route: 'pastTournaments', ldType: 'Article', section: 'Les tournois',
    sources: ['data/editorial/{locale}/_tournois.json'],
  },
  {
    route: 'upcomingTournaments', ldType: 'Article', section: 'Les tournois',
    sources: ['data/calendar/upcoming.json', 'data/calendar/auto.json'],
  },
];

// Bloc `seo` prêt à passer au template : chemin publié dans la locale, image OG
// (si elle existe), dates git et type schema.org.
export function seoFor(root, page, locale, { ogSlug, ogAlt, ogType } = {}) {
  const ogFile = ogSlug ? ogPathFor(root, ogSlug, locale) : null;
  const sources = (page.sources || []).map((s) => s.replace('{locale}', locale));
  return {
    path: pathFor(page.route, locale),
    ldType: page.ldType,
    section: page.section,
    ogImage: ogFile,
    ogAlt,
    ogType,
    dates: datesFor(root, sources),
  };
}

// Image de partage d'une locale. Les visuels portent du texte (tagline, tier) :
// chaque langue a donc les siens sous assets/og/<locale>/. Tant qu'une locale
// n'a pas les siens, on ne retombe pas sur ceux d'une autre langue — une carte
// de partage anglaise avec une accroche française serait pire que pas d'image.
export function ogPathFor(root, slug, locale) {
  const rel = `assets/og/${locale}/${slug}.png`;
  return existsSync(join(root, rel)) ? rel : null;
}

// --- sitemap.xml ---
// URLs absolues obligatoires (project site : le sitemap est lu hors contexte).
// `changefreq` et `priority` sont volontairement absents : Google les ignore
// depuis des années, ils n'ajouteraient que du bruit.
//
// Chaque URL déclare ses versions linguistiques via `xhtml:link`. Les
// annotations doivent être réciproques — c'est garanti par construction : les
// deux versions d'une page reçoivent la même table d'alternates.
export function writeSitemap(dist, entries) {
  const body = entries.map(({ path, lastmod, alternates }) => {
    const loc = absUrl(path);
    const alts = Object.entries(alternates || {}).map(([loc2, p]) =>
      `\n    <xhtml:link rel="alternate" hreflang="${LOCALE_META[loc2].lang}" href="${absUrl(p)}"/>`).join('');
    const xdef = alternates?.[DEFAULT_LOCALE]
      ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${absUrl(alternates[DEFAULT_LOCALE])}"/>`
      : '';
    return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}${alts}${xdef}\n  </url>`;
  }).join('\n');
  writeFileSync(join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`);
  return entries.length;
}

// --- 404.html ---
// Servi par GitHub Pages pour toute URL absente sous /duodecim-guides/, à
// n'importe quelle profondeur : ses liens et sa feuille de style doivent donc
// être en URL absolue (un chemin relatif se résoudrait depuis le dossier
// demandé, qui n'existe pas).
//
// Il n'y en a qu'un pour tout le site — GitHub Pages ne sert que celui de la
// racine, quelle que soit l'URL demandée. Il est donc bilingue : la langue par
// défaut d'abord, les autres ensuite dans leur propre langue, chacune dans un
// bloc portant son attribut `lang`. Un 404 par langue serait ignoré.
export function write404(dist, { blocks, header, footer }) {
  const first = blocks[0];
  const html = `<!DOCTYPE html>
<html lang="${LOCALE_META[first.locale].lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${first.title}</title>
<meta name="description" content="${first.description}">
<meta name="robots" content="noindex, follow">
<link rel="icon" href="${SITE_URL}/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${SITE_URL}/assets/favicon.png" type="image/png" sizes="64x64">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${SITE_URL}/styles/main.css">
</head>
<body>
${header}
<main class="wrap" style="padding-bottom:3rem">
${blocks.map((b, i) => `<section lang="${LOCALE_META[b.locale].lang}"${i ? ' style="margin-top:2.5rem"' : ''}>
${i === 0 ? `<h1 style="color:var(--gold)">${b.h1}</h1>` : `<h2 style="color:var(--gold)">${b.h1}</h2>`}
<p class="mv-desc">${b.lede}</p>
<div class="chips-nav" style="margin-top:1.5rem">
${b.links.map((l) => `<a href="${SITE_URL}/${l.href}">${l.label}</a>`).join('\n')}
</div>
</section>`).join('\n')}
</main>
${footer}
</body>
</html>`;
  writeFileSync(join(dist, '404.html'), html);
}

// --- humans.txt ---
// Convention humanstxt.org : le pendant lisible de robots.txt. Purement
// informatif, il déclare qui a écrit le site et avec quoi.
export function writeHumansTxt(dist, { generated, languages, subject }) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  writeFileSync(join(dist, 'humans.txt'), `/* AUTEUR */
Nom : ${AUTHOR}
Site : ${SITE_URL}/
Dépôt : ${AUTHOR_URL}

/* SITE */
Langues : ${languages}
Sujet : ${subject}
Généré le : ${generated}
Licence : code MIT, textes originaux CC BY-NC-ND 4.0 — voir LICENSE et NOTICE.md

/* TECHNIQUE */
Générateur : Node.js ${process.version} (scripts/build.mjs), sans framework
Dépendances : cheerio ${pkg.dependencies?.cheerio || ''} (extraction), @resvg/resvg-js (images de partage)
Hébergement : GitHub Pages
Sources des données : dissidia.wiki (CC BY 4.0), Final Fantasy Wiki (CC BY-SA 3.0)
`);
}
