// Génération statique : data/ + src/templates/ -> dist/
// Usage : node scripts/build.mjs
import { CHARACTERS, SPECIAL, SHORT_NAMES } from './characters.mjs';
import { renderLanding } from '../src/templates/landing.mjs';
import { renderGuide } from '../src/templates/guide.mjs';
import { renderTechniques } from '../src/templates/techniques.mjs';
import { renderInstall } from '../src/templates/install.mjs';
import { renderSavedata } from '../src/templates/savedata.mjs';
import { renderTournois } from '../src/templates/tournois.mjs';
import { renderParticiper } from '../src/templates/participer.mjs';
import { renderOrganiser } from '../src/templates/organiser.mjs';
import { renderCalendrier } from '../src/templates/calendrier.mjs';
import { slugAnchor } from '../src/templates/helpers.mjs';
import { renderFeralUnlock } from '../src/templates/feral-unlock.mjs';
import { renderMultiplayer } from '../src/templates/multiplayer.mjs';
import { renderBuildCreator } from '../src/templates/build-creator.mjs';
import { buildDataBundle } from './build-data-bundle.mjs';
import { speedValues, siteHeader, siteFooter } from '../src/templates/helpers.mjs';
import { buildRoster } from '../src/templates/helpers.mjs';
import { PAGES, seoFor, repoDates, writeSitemap, write404, writeHumansTxt } from './seo.mjs';
import { datesFor } from './git-dates.mjs';
import { sizeAttrs } from './image-size.mjs';
import { absUrl } from '../src/site-config.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);

const meta = readJson(join(ROOT, 'data', 'meta.json'));
const shared = readJson(join(ROOT, 'data', 'editorial', '_shared.json'));
const install = readJson(join(ROOT, 'data', 'editorial', '_install.json'));
const savedata = readJson(join(ROOT, 'data', 'editorial', '_savedata.json'));
const tournois = readJson(join(ROOT, 'data', 'editorial', '_tournois.json'));
const participer = readJson(join(ROOT, 'data', 'editorial', '_participer.json'));
const organiser = readJson(join(ROOT, 'data', 'editorial', '_organiser.json'));
const feralUnlock = readJson(join(ROOT, 'data', 'editorial', '_feral-unlock.json'));

// Correspondance nom tier list -> slug (la tier list utilise des noms courts)
const TIER_NAME_TO_SLUG = {
  'exdeath': 'exdeath', 'prishe': 'prishe', 'ultimecia': 'ultimecia', 'lightning': 'lightning',
  'squall': 'squall-leonhart', 'jecht': 'jecht', 'zidane': 'zidane-tribal', 'sephiroth': 'sephiroth',
  'kuja': 'kuja', 'cloud': 'cloud-strife', 'kefka': 'kefka-palazzo', 'firion': 'firion',
  'the emperor': 'the-emperor', 'warrior of light': 'warrior-of-light', 'onion knight': 'onion-knight',
  'golbez': 'golbez', 'kain': 'kain-highwind', 'tidus': 'tidus', 'gilgamesh': 'gilgamesh',
  'gabranth': 'gabranth', 'yuna': 'yuna', 'tifa': 'tifa-lockhart', 'shantotto': 'shantotto',
  'garland': 'garland', 'vaan': 'vaan', 'terra': 'terra-branford', 'cecil': 'cecil-harvey',
  'cloud of darkness': 'cloud-of-darkness', 'laguna': 'laguna-loire', 'bartz': 'bartz-klauser',
};

const tierBySlug = {};
const tierEntryBySlug = {};
for (const e of meta?.tierList?.entries || []) {
  const slug = TIER_NAME_TO_SLUG[(e.name || '').toLowerCase()];
  if (slug) {
    tierBySlug[slug] = e.tier;
    tierEntryBySlug[slug] = e;
  } else if (e.name) {
    console.warn(`(tier list : nom non mappé « ${e.name} »)`);
  }
}

// Charge les données personnages
const chars = [];
for (const c of [...CHARACTERS, ...SPECIAL]) {
  const data = readJson(join(ROOT, 'data', 'characters', `${c.slug}.json`));
  if (!data) { console.warn(`(pas de données pour ${c.slug})`); continue; }
  const ed = readJson(join(ROOT, 'data', 'editorial', `${c.slug}.json`));
  chars.push({ def: c, data, ed });
}

// Statistiques du cast (31 jouables) pour le profil de mobilité :
// valeurs triées (plus bas = plus rapide), min/max/moyenne et rang par perso
const SPEED_KEYS = ['Run Speed', 'Dash Speed', 'Fall Speed', 'Fall Speed Ratio After Dodge'];
const castStats = {};
for (const key of SPEED_KEYS) {
  const vals = chars
    .filter((c) => CHARACTERS.some((k) => k.slug === c.def.slug))
    .map((c) => speedValues(c.data.infobox?.[key]).normal)
    .filter((v) => v !== null && !Number.isNaN(v))
    .sort((a, b) => a - b);
  if (vals.length) {
    castStats[key] = {
      values: vals,
      min: vals[0],
      max: vals[vals.length - 1],
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  }
}

// --- Génération ---
mkdirSync(join(DIST, 'characters'), { recursive: true });
mkdirSync(join(DIST, 'styles'), { recursive: true });
mkdirSync(join(DIST, 'scripts'), { recursive: true });

// Screenshots de coups disponibles en local (couverture Wayback partielle)
const moveImages = new Set();
const movesDir = join(ROOT, 'assets', 'moves');
if (existsSync(movesDir)) {
  for (const slug of readdirSync(movesDir)) {
    for (const f of readdirSync(join(movesDir, slug))) moveImages.add(`${slug}/${f}`);
  }
}

// Dimensions intrinsèques des images, pour écrire width/height sur chaque <img>
// (évite le décalage de mise en page pendant le chargement).
const sizeCache = new Map();
const sizeOf = (rel) => {
  if (!sizeCache.has(rel)) sizeCache.set(rel, sizeAttrs(join(ROOT, 'assets', rel)));
  return sizeCache.get(rel);
};

// Image de partage d'un personnage (absente = pas de balise og:image plutôt
// qu'une URL en 404)
const ogFor = (slug) => (existsSync(join(ROOT, 'assets', 'og', `${slug}.png`)) ? `assets/og/${slug}.png` : null);

// URLs du sitemap, collectées au fil de la génération
const sitemap = [];

// Roster reconnu dans la prose des matchups : noms complets (issus du roster,
// donc jamais désynchronisés) + noms courts non ambigus déclarés dans
// characters.mjs. « chaos » est exclu : sa page n'est qu'une redirection.
const roster = buildRoster([
  ...[...CHARACTERS, ...SPECIAL].filter((c) => c.slug !== 'chaos').map((c) => ({ name: c.name, slug: c.slug })),
  ...Object.entries(SHORT_NAMES).map(([name, slug]) => ({ name, slug })),
]);

// Landing (31 jouables uniquement, rangées façon écran du jeu)
const taglineBySlug = Object.fromEntries(chars.filter((c) => c.ed?.tagline).map((c) => [c.def.slug, c.ed.tagline]));
const homeDates = repoDates(ROOT);
writeFileSync(join(DIST, 'index.html'), renderLanding({
  characters: CHARACTERS,
  tierBySlug,
  taglineBySlug,
  ogImage: ogFor('site'),
  dates: homeDates,
}));
sitemap.push({ path: 'index.html', lastmod: homeDates.dateModified });

// Guides + fiche courte Chaos
let missingEd = 0;
for (const { def, data, ed } of chars) {
  if (def.slug === 'chaos') {
    // L'ancienne fiche « Boss : Chaos » est remplacée par la page « Obtenir
    // Feral Chaos » à la racine ; l'URL publiée reste vivante via redirection.
    // Le canonical pointe la destination en absolu et la page est en noindex :
    // c'est un renvoi, pas un contenu à indexer — elle est donc aussi absente
    // du sitemap.
    writeFileSync(join(DIST, 'characters', 'chaos.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=../obtenir-feral-chaos.html">
<link rel="canonical" href="${absUrl('obtenir-feral-chaos.html')}">
<meta name="robots" content="noindex, follow">
<title>Obtenir Feral Chaos — Dissidia 012 [duodecim]</title></head>
<body><p>Cette page a déménagé : <a href="../obtenir-feral-chaos.html">Obtenir Feral Chaos</a>.</p></body></html>`);
    continue;
  }
  if (!ed) missingEd++;
  const dates = datesFor(ROOT, [
    `data/editorial/${def.slug}.json`,
    `data/characters/${def.slug}.json`,
  ]);
  const html = renderGuide({
    char: data,
    ed,
    tierEntry: tierEntryBySlug[def.slug] || null,
    castStats,
    hasPortrait: existsSync(join(ROOT, 'assets', 'portraits', `${def.slug}.png`)),
    moveImages,
    sizeOf,
    dates,
    ogImage: ogFor(def.slug),
    roster,
  });
  writeFileSync(join(DIST, 'characters', `${def.slug}.html`), html);
  sitemap.push({ path: `characters/${def.slug}.html`, lastmod: dates.dateModified });
}

// Métadonnées de référencement des pages transverses : la table PAGES de
// scripts/seo.mjs est la source unique (chemin publié, fichiers sources pour
// les dates git, type schema.org). Chaque page passée ici entre au sitemap.
const PAGE_BY_PATH = Object.fromEntries(PAGES.map((p) => [p.path, p]));
const OG_SITE_ALT = 'Guides compétitifs Dissidia 012 [duodecim] — bandeau des personnages';
function seoOf(path, opts = {}) {
  const page = PAGE_BY_PATH[path];
  if (!page) throw new Error(`page absente de PAGES (scripts/seo.mjs) : ${path}`);
  const s = seoFor(ROOT, page, { ogSlug: 'site', ogAlt: OG_SITE_ALT, ...opts });
  sitemap.push({ path, lastmod: s.dates.dateModified });
  return s;
}

// Créateur de builds : page + payload de données (script plutôt que JSON à
// fetcher, pour rester consultable sans serveur comme le reste du site).
{
  const ed = readJson(join(ROOT, 'data', 'editorial', '_build-creator.json'));
  const bundle = buildDataBundle(ROOT, ed);
  writeFileSync(join(DIST, 'scripts', 'build-data.js'), `window.BUILD_DATA=${JSON.stringify(bundle)};\n`);
  writeFileSync(join(DIST, 'createur-de-builds.html'), renderBuildCreator({
    ed,
    characters: CHARACTERS,
    // Les fichiers de assets/icons/ sont des planches de 128×32 (quatre vignettes
    // côte à côte) : ce sont les portraits carrés qu'il faut afficher ici.
    hasPortrait: (slug) => existsSync(join(ROOT, 'assets', 'portraits', `${slug}.png`)),
    seo: seoOf('createur-de-builds.html', {
      ogSlug: 'createur-de-builds',
      ogAlt: 'Créateur de builds Dissidia 012 [duodecim]',
    }),
  }));
}

// Techniques + Multijoueur
writeFileSync(join(DIST, 'techniques.html'), renderTechniques(shared, seoOf('techniques.html')));
writeFileSync(join(DIST, 'multijoueur.html'), renderMultiplayer(readJson(join(ROOT, 'data', 'editorial', '_multiplayer.json')), seoOf('multijoueur.html')));

// Installation (PPSSPP, PC et mobile)
writeFileSync(join(DIST, 'install.html'), renderInstall(install, seoOf('install.html')));

// Savedata, tournois et participation
writeFileSync(join(DIST, 'savedata.html'), renderSavedata(savedata, seoOf('savedata.html')));
writeFileSync(join(DIST, 'tournois.html'), renderTournois(tournois, seoOf('tournois.html')));
writeFileSync(join(DIST, 'participer.html'), renderParticiper(participer, seoOf('participer.html')));
writeFileSync(join(DIST, 'organiser.html'), renderOrganiser(organiser, seoOf('organiser.html')));
writeFileSync(join(DIST, 'obtenir-feral-chaos.html'), renderFeralUnlock(feralUnlock, seoOf('obtenir-feral-chaos.html')));

// Calendrier des tournois : passés documentés (_tournois.json) + à venir
// confirmés (upcoming.json) + détectés sur start.gg (auto.json), dédupliqués
// par URL ; les candidats Discord (inbox.json) restent hors calendrier.
{
  const calDir = join(ROOT, 'data', 'calendar');
  const upcoming = readJson(join(calDir, 'upcoming.json')) || { events: [] };
  const auto = readJson(join(calDir, 'auto.json')) || { events: [] };
  const inbox = readJson(join(calDir, 'inbox.json')) || { candidates: [] };
  const lastCheck = (readJson(join(calDir, 'last-check.json')) || {}).lastCheck || null;

  const normUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '').replace(/\/details$/, '').toLowerCase();
  const known = new Set();
  for (const t of tournois.tournois) for (const l of t.liens || []) known.add(normUrl(l.url));
  for (const e of upcoming.events) if (e.url) known.add(normUrl(e.url));

  const past = tournois.tournois
    .filter((t) => t.iso)
    .map((t) => ({ iso: t.iso, name: t.name, url: `tournois.html#${slugAnchor(t.name)}` }));
  const autoEvents = auto.events.filter((e) => !known.has(normUrl(e.url)));
  const events = [...past, ...upcoming.events, ...autoEvents]
    .map(({ iso, name, url }) => ({ iso, name, url }))
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const today = new Date().toISOString().slice(0, 10);
  const futurs = [...upcoming.events, ...autoEvents].filter((e) => e.iso >= today).sort((a, b) => a.iso.localeCompare(b.iso));

  writeFileSync(join(DIST, 'futurs-tournois.html'), renderCalendrier({
    events,
    upcoming: futurs,
    candidates: inbox.candidates || [],
    lastCheck,
    sources: [
      'https://www.start.gg/',
      'https://discord.gg/a44rneC',
    ],
    limits: [
      'Seule start.gg est couverte automatiquement (API officielle). Le canal d’annonces du Discord DISSIDIA est un canal texte classique, non suivable depuis un autre serveur : ses annonces — notamment les brackets Challonge, qui n’ont pas d’API publique de recherche — sont relayées manuellement et peuvent arriver avec du retard.',
      'Un tournoi annoncé uniquement ailleurs (Twitter/X, dont l’API de lecture est payante, ou un autre serveur) peut échapper au calendrier.',
    ],
  }, seoOf('futurs-tournois.html')));
}

// Statiques
cpSync(join(ROOT, 'src', 'styles', 'main.css'), join(DIST, 'styles', 'main.css'));
cpSync(join(ROOT, 'src', 'scripts', 'site.js'), join(DIST, 'scripts', 'site.js'));
cpSync(join(ROOT, 'src', 'scripts', 'calendrier.js'), join(DIST, 'scripts', 'calendrier.js'));
cpSync(join(ROOT, 'src', 'scripts', 'build-creator.js'), join(DIST, 'scripts', 'build-creator.js'));
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });

// --- Référencement : sitemap, page 404, humans.txt ---
// Le sitemap est bâti depuis les pages réellement écrites ci-dessus : il ne
// peut donc pas lister une URL inexistante ni oublier une page.
const nUrls = writeSitemap(DIST, sitemap);
// Le 404 réutilise le header et le footer du site pour rester dans son identité.
write404(DIST, siteHeader({ base: `${absUrl('')}` }), siteFooter());
writeHumansTxt(DIST, { generated: new Date().toISOString().slice(0, 10) });

console.log(`dist/ généré : index + ${chars.length - 1} guides + créateur de builds + 7 pages transverses (techniques, install, savedata, tournois, participer, organiser, futurs-tournois)${missingEd ? ` (${missingEd} sans éditorial — bandeaux)` : ''}`);
console.log(`référencement : sitemap.xml (${nUrls} URLs), 404.html, humans.txt`);
