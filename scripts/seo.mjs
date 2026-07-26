// Référencement : table des pages publiées, sitemap, 404 et humans.txt.
//
// Une seule table décrit toutes les pages transverses (chemin publié, fichiers
// sources dont on lit les dates git, type schema.org). Le sitemap en découle —
// il n'est jamais écrit à la main, une page ajoutée ici y entre automatiquement.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { datesFor, gitDates } from './git-dates.mjs';
import { SITE_URL, AUTHOR, AUTHOR_URL, absUrl } from '../src/site-config.mjs';

// Pages hors guides personnages. `sources` : fichiers dont l'historique git
// détermine datePublished/dateModified ; `ldType` : type schema.org.
export const PAGES = [
  {
    path: 'techniques.html', ldType: 'TechArticle', section: 'Techniques',
    sources: ['data/editorial/_shared.json'],
  },
  {
    path: 'createur-de-builds.html', ldType: 'none', // JSON-LD WebApplication dédié
    sources: ['data/editorial/_build-creator.json', 'data/build/equipment.json',
      'data/build/accessories.json', 'data/build/abilities.json'],
  },
  {
    path: 'multijoueur.html', ldType: 'Article', section: 'Jouer à Dissidia',
    sources: ['data/editorial/_multiplayer.json'],
  },
  {
    path: 'install.html', ldType: 'TechArticle', section: 'Jouer à Dissidia',
    sources: ['data/editorial/_install.json'],
  },
  {
    path: 'savedata.html', ldType: 'Article', section: 'Jouer à Dissidia',
    sources: ['data/editorial/_savedata.json'],
  },
  {
    path: 'obtenir-feral-chaos.html', ldType: 'TechArticle', section: 'Données du jeu',
    sources: ['data/editorial/_feral-unlock.json'],
  },
  {
    path: 'participer.html', ldType: 'Article', section: 'Les tournois',
    sources: ['data/editorial/_participer.json'],
  },
  {
    path: 'organiser.html', ldType: 'TechArticle', section: 'Les tournois',
    sources: ['data/editorial/_organiser.json'],
  },
  {
    path: 'tournois.html', ldType: 'Article', section: 'Les tournois',
    sources: ['data/editorial/_tournois.json'],
  },
  {
    path: 'futurs-tournois.html', ldType: 'Article', section: 'Les tournois',
    sources: ['data/calendar/upcoming.json', 'data/calendar/auto.json'],
  },
];

// Dates du dépôt entier — utilisées par l'accueil, qui reflète l'ensemble.
export function repoDates(root) {
  const map = gitDates(root);
  let created = null, modified = null;
  for (const { created: c, modified: m } of map.values()) {
    if (!created || c < created) created = c;
    if (!modified || m > modified) modified = m;
  }
  return { datePublished: created, dateModified: modified };
}

// Bloc `seo` prêt à passer au template : chemin, image OG (si elle existe),
// dates git et type schema.org.
export function seoFor(root, page, { ogSlug, ogAlt, ogType } = {}) {
  const ogFile = ogSlug ? join(root, 'assets', 'og', `${ogSlug}.png`) : null;
  return {
    path: page.path,
    ldType: page.ldType,
    section: page.section,
    ogImage: ogFile && existsSync(ogFile) ? `assets/og/${ogSlug}.png` : null,
    ogAlt,
    ogType,
    dates: datesFor(root, page.sources || []),
  };
}

// --- sitemap.xml ---
// URLs absolues obligatoires (project site : le sitemap est lu hors contexte).
// `changefreq` et `priority` sont volontairement absents : Google les ignore
// depuis des années, ils n'ajouteraient que du bruit.
export function writeSitemap(dist, entries) {
  const body = entries.map(({ path, lastmod }) => {
    const loc = absUrl(path);
    return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}\n  </url>`;
  }).join('\n');
  writeFileSync(join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  return entries.length;
}

// --- 404.html ---
// Servi par GitHub Pages pour toute URL absente sous /duodecim-guides/, à
// n'importe quelle profondeur : ses liens et sa feuille de style doivent donc
// être en URL absolue (un chemin relatif se résoudrait depuis le dossier
// demandé, qui n'existe pas).
export function write404(dist, siteHeaderHtml, siteFooterHtml) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page introuvable — Guides Dissidia 012 [duodecim]</title>
<meta name="description" content="Cette page n’existe pas ou a été déplacée. Retour à la sélection des personnages et aux guides Dissidia 012 [duodecim].">
<meta name="robots" content="noindex, follow">
<link rel="icon" href="${SITE_URL}/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${SITE_URL}/assets/favicon.png" type="image/png" sizes="64x64">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${SITE_URL}/styles/main.css">
</head>
<body>
${siteHeaderHtml}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">404 — cette page n’existe pas</h1>
<p class="mv-desc">L’adresse demandée est introuvable : la page a peut-être été renommée, ou le lien qui vous a mené ici est incomplet.</p>
<div class="chips-nav" style="margin-top:1.5rem">
<a href="${SITE_URL}/index.html">← Sélection des personnages</a>
<a href="${SITE_URL}/createur-de-builds.html">Créateur de builds</a>
<a href="${SITE_URL}/techniques.html">Techniques &amp; glitches</a>
<a href="${SITE_URL}/participer.html">Participer aux tournois</a>
</div>
</main>
${siteFooterHtml}
</body>
</html>`;
  writeFileSync(join(dist, '404.html'), html);
}

// --- humans.txt ---
// Convention humanstxt.org : le pendant lisible de robots.txt. Purement
// informatif, il déclare qui a écrit le site et avec quoi.
export function writeHumansTxt(dist, { generated }) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  writeFileSync(join(dist, 'humans.txt'), `/* AUTEUR */
Nom : ${AUTHOR}
Site : ${SITE_URL}/
Dépôt : ${AUTHOR_URL}

/* SITE */
Langue : français
Sujet : Dissidia 012 [duodecim] Final Fantasy (PSP, 2011) — guides compétitifs
Généré le : ${generated}
Licence : code MIT, textes originaux CC BY-NC-ND 4.0 — voir LICENSE et NOTICE.md

/* TECHNIQUE */
Générateur : Node.js ${process.version} (scripts/build.mjs), sans framework
Dépendances : cheerio ${pkg.dependencies?.cheerio || ''} (extraction), @resvg/resvg-js (images de partage)
Hébergement : GitHub Pages
Sources des données : dissidia.wiki (CC BY 4.0), Final Fantasy Wiki (CC BY-SA 3.0)
`);
}
