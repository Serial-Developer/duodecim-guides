// Génération statique : data/ + src/templates/ -> dist/
// Usage : node scripts/build.mjs [--strict]
//
// Le site est bilingue. La langue par défaut (src/i18n/config.mjs) est publiée à
// la racine de dist/, les autres sous leur préfixe (dist/en/…). Basculer
// DEFAULT_LOCALE suffit donc à intervertir les deux arbres.
//
// Règle de disponibilité (arbitrée en Phase 0) : une page dont la prose n'existe
// pas dans une locale n'est PAS générée dans cette locale — pas de page à moitié
// traduite, et pas de hreflang vers une version inexistante. Seule la landing
// échappe à la règle : c'est un écran de sélection bâti sur des données de jeu
// (portraits, noms, origines, tiers), sans prose propre.
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
import { renderFeralUnlock } from '../src/templates/feral-unlock.mjs';
import { renderMultiplayer } from '../src/templates/multiplayer.mjs';
import { renderBuildCreator } from '../src/templates/build-creator.mjs';
import { renderBuildCardTest } from '../src/templates/build-card-test.mjs';
import { renderBuildCardRoster } from '../src/templates/build-card-roster.mjs';
import { buildDataBundle } from './build-data-bundle.mjs';
import { applyMoveFixes } from './move-fixes.mjs';
import { buildsFromWiki } from './wiki-builds.mjs';
import { slugAnchor, speedValues, siteHeader, siteFooter, buildRoster, linksFor } from '../src/templates/helpers.mjs';
import { PAGES, seoFor, ogPathFor, writeSitemap, write404, writeHumansTxt } from './seo.mjs';
import { datesFor, contentLastModified } from './git-dates.mjs';
import { sizeAttrs } from './image-size.mjs';
import { absUrl } from '../src/site-config.mjs';
import { LOCALES, DEFAULT_LOCALE, LOCALE_META, localeDir } from '../src/i18n/config.mjs';
import { pathFor, guidePathFor } from '../src/i18n/routes.mjs';
import { createT } from '../src/i18n/t.mjs';
import { buildCreatorStrings } from '../src/i18n/build-creator-strings.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const STRICT = process.argv.includes('--strict');

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);
const edPath = (locale, name) => join(ROOT, 'data', 'editorial', locale, `${name}.json`);
const readEd = (locale, name) => readJson(edPath(locale, name));

const meta = readJson(join(ROOT, 'data', 'meta.json'));

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

// Données de jeu des personnages : partagées entre les langues (ce sont des
// chiffres et des noms propres). Seule la prose éditoriale est par locale.
// Payload du créateur : les fiches s'en servent aussi, pour convertir les
// builds du wiki en cartes. Il ne dépend pas de la langue rendue.
const bundlePartage = buildDataBundle(ROOT, readEd('en', '_build-creator'));
// Cellules des builds du wiki que la conversion n'a pas su résoudre : elles
// sont dites, jamais tues.
const cartesRefusees = [];
const chars = [];
// Cellules arbitrées entre les deux wikis : déclarées dans l'éditorial anglais,
// langue des données de jeu, et appliquées ici comme dans le payload du
// créateur — la fiche et le créateur affichent la même attaque.
const moveFixes = readEd('en', '_build-creator')?.moveFixes;
const correctionsRefusees = [];
for (const c of [...CHARACTERS, ...SPECIAL]) {
  const data = readJson(join(ROOT, 'data', 'characters', `${c.slug}.json`));
  if (!data) { console.warn(`(pas de données pour ${c.slug})`); continue; }
  applyMoveFixes(c.slug, data, moveFixes, correctionsRefusees);
  chars.push({ def: c, data });
}
for (const r of correctionsRefusees) console.warn(`(correction ignorée — ${r.slug} / ${r.move} / ${r.field} : ${r.raison})`);

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

// Roster reconnu dans la prose des matchups : noms complets (issus du roster,
// donc jamais désynchronisés) + noms courts non ambigus déclarés dans
// characters.mjs. « chaos » est exclu : sa page n'est qu'une redirection.
const roster = buildRoster([
  ...[...CHARACTERS, ...SPECIAL].filter((c) => c.slug !== 'chaos').map((c) => ({ name: c.name, slug: c.slug })),
  ...Object.entries(SHORT_NAMES).map(([name, slug]) => ({ name, slug })),
]);

// --- Passe 1 : quelles pages existent dans quelle langue ? ---
// Les tables d'alternates doivent être connues AVANT de rendre quoi que ce soit :
// une page doit annoncer ses versions sœurs, ce qui suppose de savoir lesquelles
// seront écrites. C'est aussi ce qui garantit la réciprocité des hreflang.
const EDITORIAL_OF_ROUTE = {
  techniques: '_shared',
  buildCreator: '_build-creator',
  multiplayer: '_multiplayer',
  install: '_install',
  savedata: '_savedata',
  feralUnlock: '_feral-unlock',
  participate: '_participer',
  organize: '_organiser',
  pastTournaments: '_tournois',
  // Le calendrier n'a pas de prose propre : ses textes sont des chaînes
  // d'interface et ses données viennent de data/calendar/. Il suit donc la
  // disponibilité de la page « tournois passés », vers laquelle il renvoie.
  upcomingTournaments: '_tournois',
};

// Locales réellement publiables : celles dont le catalogue de chaînes existe.
const activeLocales = LOCALES.filter((l) => existsSync(join(ROOT, 'locales', `${l}.json`)));

const pageAvailability = {};   // route -> [locales]
for (const route of Object.keys(EDITORIAL_OF_ROUTE)) {
  pageAvailability[route] = activeLocales.filter((l) => existsSync(edPath(l, EDITORIAL_OF_ROUTE[route])));
}
const guideAvailability = {};  // slug -> [locales]
for (const { def } of chars) {
  if (def.slug === 'chaos') continue;
  guideAvailability[def.slug] = activeLocales.filter((l) => existsSync(edPath(l, def.slug)));
}
// La landing existe dans toutes les langues actives (voir l'en-tête du fichier).
const homeAvailability = activeLocales;

const altsForRoute = (route) => Object.fromEntries(
  (pageAvailability[route] || []).map((l) => [l, pathFor(route, l)]));
const altsForGuide = (slug) => Object.fromEntries(
  (guideAvailability[slug] || []).map((l) => [l, guidePathFor(slug, l)]));
const altsForHome = Object.fromEntries(homeAvailability.map((l) => [l, pathFor('home', l)]));

// Table transmise aux templates : elle permet à chaque lien de viser la version
// réellement publiée quand la destination manque dans la langue courante
// (le temps que la traduction rattrape).
const availability = {
  routes: { ...pageAvailability, home: homeAvailability },
  guides: guideAvailability,
};

// --- Passe 2 : rendu ---
mkdirSync(join(DIST, 'styles'), { recursive: true });
mkdirSync(join(DIST, 'scripts'), { recursive: true });

const sitemap = [];
const missingKeys = new Map();  // locale -> Set de clés absentes
let nGuides = 0, nPages = 0;

for (const locale of activeLocales) {
  const t = createT(locale, { strict: STRICT });
  const dir = localeDir(locale);
  const outDir = join(DIST, dir);
  mkdirSync(join(outDir, 'characters'), { recursive: true });

  const i18n = (path, alternates) => ({ t, locale, path, alternates, availability });

  // --- Landing ---
  // Dates de l'accueil : les fichiers dont son contenu dépend réellement (les
  // taglines des fiches de CETTE langue, les tiers, le template de l'écran de
  // sélection). Prendre le dernier commit du dépôt entier la ferait changer à
  // chaque build, y compris pour une correction de README.
  const localeEds = Object.fromEntries(chars
    .filter(({ def }) => def.slug !== 'chaos')
    .map(({ def }) => [def.slug, readEd(locale, def.slug)]));
  const taglineBySlug = Object.fromEntries(Object.entries(localeEds)
    .filter(([, ed]) => ed?.tagline).map(([slug, ed]) => [slug, ed.tagline]));
  const homePath = pathFor('home', locale);
  const homeDates = datesFor(ROOT, [
    ...(guideAvailability ? Object.keys(localeEds).map((slug) => `data/editorial/${locale}/${slug}.json`) : []),
    'data/meta.json',
    'src/templates/landing.mjs',
  ]);
  writeFileSync(join(DIST, homePath), renderLanding({
    ...i18n(homePath, altsForHome),
    characters: CHARACTERS,
    tierBySlug,
    taglineBySlug,
    ogImage: ogPathFor(ROOT, 'site', locale),
    dates: homeDates,
  }));
  sitemap.push({ path: homePath, lastmod: homeDates.dateModified, alternates: altsForHome });

  // --- Guides personnages ---
  for (const { def, data } of chars) {
    if (def.slug === 'chaos') {
      // L'ancienne fiche « Boss : Chaos » est remplacée par la page « Obtenir
      // Feral Chaos » ; l'URL publiée reste vivante via redirection. Le
      // canonical pointe la destination en absolu et la page est en noindex :
      // c'est un renvoi, pas un contenu à indexer — elle est donc aussi absente
      // du sitemap.
      // La destination peut n'exister que dans une autre langue tant que la
      // traduction est en cours : `linksFor` vise alors la version publiée.
      const L = linksFor(`${dir}characters/chaos.html`, locale, availability);
      const target = pathFor('feralUnlock', L.pageLang('feralUnlock') || locale);
      writeFileSync(join(outDir, 'characters', 'chaos.html'), `<!doctype html>
<html lang="${LOCALE_META[locale].lang}"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${L.page('feralUnlock')}">
<link rel="canonical" href="${absUrl(target)}">
<meta name="robots" content="noindex, follow">
<title>${t('feralUnlock.redirectTitle')}</title></head>
<body><p>${t('feralUnlock.redirectBody')} <a href="${L.page('feralUnlock')}">${t('feralUnlock.metaTitle').split(' — ')[0]}</a>.</p></body></html>`);
      continue;
    }
    const ed = localeEds[def.slug];
    if (!ed) continue;  // pas de prose dans cette langue : pas de page (voir l'en-tête)
    const path = guidePathFor(def.slug, locale);
    const dates = datesFor(ROOT, [
      `data/editorial/${locale}/${def.slug}.json`,
      `data/characters/${def.slug}.json`,
    ]);
    writeFileSync(join(DIST, path), renderGuide({
      ...i18n(path, altsForGuide(def.slug)),
      char: data,
      ed,
      tierEntry: tierEntryBySlug[def.slug] || null,
      castStats,
      hasPortrait: existsSync(join(ROOT, 'assets', 'portraits', `${def.slug}.png`)),
      moveImages,
      sizeOf,
      dates,
      ogImage: ogPathFor(ROOT, def.slug, locale),
      roster,
      // La prose vient toujours de l'anglais : le build est le même dans les
      // deux langues, ses coups aussi. Lire la locale rendue ferait diverger la
      // carte française de l'anglaise.
      buildCards: buildsFromWiki(data, def.slug, bundlePartage, cartesRefusees, Object.values(readEd('en', def.slug)?.builds?.perBuild || {}).map((x) => (Array.isArray(x) ? x.join(' ') : String(x || '')))),
      cardData: bundlePartage,
    }));
    sitemap.push({ path, lastmod: dates.dateModified, alternates: altsForGuide(def.slug) });
    nGuides++;
  }

  // --- Pages transverses ---
  // La table PAGES de scripts/seo.mjs est la source unique (clé de route,
  // fichiers sources pour les dates git, type schema.org). Chaque page rendue
  // entre au sitemap.
  const PAGE_BY_ROUTE = Object.fromEntries(PAGES.map((p) => [p.route, p]));
  const seoOf = (route, opts = {}) => {
    const page = PAGE_BY_ROUTE[route];
    if (!page) throw new Error(`page absente de PAGES (scripts/seo.mjs) : ${route}`);
    const s = seoFor(ROOT, page, locale, { ogSlug: 'site', ogAlt: t('landing.ogAltSite'), ...opts });
    sitemap.push({ path: s.path, lastmod: s.dates.dateModified, alternates: altsForRoute(route) });
    nPages++;
    return s;
  };
  // `render` n'est appelé que si la prose de la page existe dans cette locale.
  const emit = (route, render) => {
    if (!(pageAvailability[route] || []).includes(locale)) return;
    const seo = seoOf(route);
    const path = seo.path;
    writeFileSync(join(DIST, path), render({ seo, ...i18n(path, altsForRoute(route)) }));
  };

  // Créateur de builds : page + payload de données (script plutôt que JSON à
  // fetcher, pour rester consultable sans serveur comme le reste du site).
  if (pageAvailability.buildCreator.includes(locale)) {
    const ed = readEd(locale, '_build-creator');
    // Le payload est partagé par toutes les langues, mais l'éditorial dont il
    // tire ses quelques textes déclarés à la main (effets d'invocation, motifs
    // d'exclusion) existe, lui, dans chaque langue. L'assembler depuis la locale
    // en cours faisait gagner la DERNIÈRE rendue : Barbariccia s'affichait en
    // français sur le site anglais. On l'assemble donc toujours depuis
    // l'anglais, langue des données de jeu — comme les descriptions du wiki que
    // le payload embarque déjà et que le site français affiche telles quelles.
    const bundle = bundlePartage;
    // Le payload de données est partagé par toutes les langues (identifiants,
    // chiffres et noms propres du jeu) : il est écrit une seule fois.
    writeFileSync(join(DIST, 'scripts', 'build-data.js'), `window.BUILD_DATA=${JSON.stringify(bundle)};\n`);
    // Le rendu partagé de la carte : le créateur s'en sert dans le navigateur,
    // les pages de build statiques l'appellent au build. Un seul fichier.
    cpSync(join(ROOT, 'src', 'scripts', 'build-card-view.js'), join(DIST, 'scripts', 'build-card-view.js'));
    const seo = seoOf('buildCreator', {
      ogSlug: 'createur-de-builds',
      ogAlt: t('buildCreator.ogAlt'),
    });
    writeFileSync(join(DIST, seo.path), renderBuildCreator({
      ...i18n(seo.path, altsForRoute('buildCreator')),
      ed,
      characters: CHARACTERS,
      // Les fichiers de assets/icons/ sont des planches de 128×32 (quatre vignettes
      // côte à côte) : ce sont les portraits carrés qu'il faut afficher ici.
      hasPortrait: (slug) => existsSync(join(ROOT, 'assets', 'portraits', `${slug}.png`)),
      i18nPayload: buildCreatorStrings(t),
      tierBySlug,
      seo,
      // La carte de build tient lieu d'interface depuis le 10/08/2026 : elle a
      // remplacé les cinq onglets, qui montraient des listes là où le jeu
      // montre un écran d'équipement.
      card: true,
    }));

    // Page de validation de la carte de build. Hors sitemap, hors navigation et
    // en noindex : elle sert à juger le rendu, pas à être trouvée. Elle n'est
    // écrite que pour la langue par défaut — c'est un banc d'essai, pas une
    // page du site.
    const carte = readJson(join(ROOT, 'data', 'build-card-test.json'));
    if (carte?.build) {
      writeFileSync(join(DIST, 'build-card-test.html'), renderBuildCardTest({
        ...i18n('build-card-test.html', {}),
        build: carte.build,
        source: carte.source,
        data: bundle,
        hasPortrait: (slug) => existsSync(join(ROOT, 'assets', 'portraits', `${slug}.png`)),
        sizeOf,
      }));
    }
    // Même banc d'essai, étendu aux 31 personnages : c'est là qu'on voit si un
    // cadrage de portrait gêne la lecture. Mêmes conditions — noindex, hors
    // sitemap, langue par défaut seulement.
    // Builds réels décodés depuis les liens de partage fournis (data/build-cards.json).
    // Ce que ce fichier ne couvre pas est rendu en maquette, et la carte le dit.
    const reels = Object.fromEntries(
      (readJson(join(ROOT, 'data', 'build-cards.json'))?.builds || [])
        .map((e) => [e.build.character, e.build]),
    );
    writeFileSync(join(DIST, 'build-card-roster.html'), renderBuildCardRoster({
      ...i18n('build-card-roster.html', {}),
      reels,
      data: bundle,
      hasPortrait: (slug) => existsSync(join(ROOT, 'assets', 'portraits', `${slug}.png`)),
      sizeOf,
    }));
    cpSync(join(ROOT, 'src', 'scripts', 'build-card-roster.js'), join(DIST, 'scripts', 'build-card-roster.js'));
  }

  emit('techniques', (x) => renderTechniques(readEd(locale, '_shared'), x.seo, x));
  emit('multiplayer', (x) => renderMultiplayer(readEd(locale, '_multiplayer'), x.seo, x));
  emit('install', (x) => renderInstall(readEd(locale, '_install'), x.seo, x));
  emit('savedata', (x) => renderSavedata(readEd(locale, '_savedata'), x.seo, x));
  emit('pastTournaments', (x) => renderTournois(readEd(locale, '_tournois'), x.seo, x));
  emit('participate', (x) => renderParticiper(readEd(locale, '_participer'), x.seo, x));
  emit('organize', (x) => renderOrganiser(readEd(locale, '_organiser'), x.seo, x));
  emit('feralUnlock', (x) => renderFeralUnlock(readEd(locale, '_feral-unlock'), x.seo, x));

  // Calendrier des tournois : passés documentés (_tournois.json) + à venir
  // confirmés (upcoming.json) + détectés sur start.gg (auto.json), dédupliqués
  // par URL ; les candidats Discord (inbox.json) restent hors calendrier.
  emit('upcomingTournaments', (x) => {
    const tournois = readEd(locale, '_tournois');
    const calDir = join(ROOT, 'data', 'calendar');
    const upcoming = readJson(join(calDir, 'upcoming.json')) || { events: [] };
    const auto = readJson(join(calDir, 'auto.json')) || { events: [] };
    const inbox = readJson(join(calDir, 'inbox.json')) || { candidates: [] };
    const lastCheck = (readJson(join(calDir, 'last-check.json')) || {}).lastCheck || null;

    const normUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '').replace(/\/details$/, '').toLowerCase();
    const known = new Set();
    for (const tr of tournois.tournois) for (const l of tr.liens || []) known.add(normUrl(l.url));
    for (const e of upcoming.events) if (e.url) known.add(normUrl(e.url));

    const pastPage = pathFor('pastTournaments', locale);
    const past = tournois.tournois
      .filter((tr) => tr.iso)
      .map((tr) => ({ iso: tr.iso, name: tr.name, url: `${linksFor(x.path, locale).page('pastTournaments')}#${slugAnchor(tr.name)}` }));
    const autoEvents = auto.events.filter((e) => !known.has(normUrl(e.url)));
    const events = [...past, ...upcoming.events, ...autoEvents]
      .map(({ iso, name, url }) => ({ iso, name, url }))
      .sort((a, b) => a.iso.localeCompare(b.iso));

    const today = new Date().toISOString().slice(0, 10);
    const futurs = [...upcoming.events, ...autoEvents].filter((e) => e.iso >= today).sort((a, b) => a.iso.localeCompare(b.iso));

    return renderCalendrier({
      events,
      upcoming: futurs,
      candidates: inbox.candidates || [],
      lastCheck,
      sources: [
        'https://www.start.gg/',
        'https://discord.gg/a44rneC',
      ],
      limits: [t('calendar.limitStartgg'), t('calendar.limitElsewhere')],
    }, x.seo, x);
  });

  if (t.missing.size) missingKeys.set(locale, t.missing);
}

// --- Statiques (partagés entre les langues) ---
cpSync(join(ROOT, 'src', 'styles', 'main.css'), join(DIST, 'styles', 'main.css'));
cpSync(join(ROOT, 'src', 'scripts', 'site.js'), join(DIST, 'scripts', 'site.js'));
cpSync(join(ROOT, 'src', 'scripts', 'lang.js'), join(DIST, 'scripts', 'lang.js'));
cpSync(join(ROOT, 'src', 'scripts', 'calendrier.js'), join(DIST, 'scripts', 'calendrier.js'));
cpSync(join(ROOT, 'src', 'scripts', 'build-creator.js'), join(DIST, 'scripts', 'build-creator.js'));
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });

// --- Référencement : sitemap, page 404, humans.txt ---
// Le sitemap est bâti depuis les pages réellement écrites ci-dessus : il ne
// peut donc pas lister une URL inexistante ni oublier une page.
const nUrls = writeSitemap(DIST, sitemap);

// Le 404 réutilise le header et le footer du site pour rester dans son identité,
// et présente ses explications dans chaque langue publiée (GitHub Pages n'en
// sert qu'un pour tout le site, quelle que soit l'URL demandée).
{
  const ordered = [DEFAULT_LOCALE, ...activeLocales.filter((l) => l !== DEFAULT_LOCALE)];
  const blocks = ordered.map((locale) => {
    const t = createT(locale);
    return {
      locale,
      title: t('notFound.title'),
      description: t('notFound.description'),
      h1: t('notFound.h1'),
      lede: t('notFound.lede'),
      links: [
        { href: pathFor('home', locale), label: t('notFound.linkSelect') },
        { href: pathFor('buildCreator', locale), label: t('notFound.linkBuildCreator') },
        { href: pathFor('techniques', locale), label: t('notFound.linkTechniques') },
        { href: pathFor('participate', locale), label: t('notFound.linkParticipate') },
      ],
    };
  });
  const t0 = createT(DEFAULT_LOCALE);
  write404(DIST, {
    blocks,
    header: siteHeader(t0, { path: 'index.html', locale: DEFAULT_LOCALE, alternates: altsForHome, availability }),
    footer: siteFooter(t0),
  });
}

writeHumansTxt(DIST, {
  updated: contentLastModified(ROOT),
  languages: activeLocales.map((l) => createT(l)('humans.languageName')).join(', '),
  subject: createT(DEFAULT_LOCALE)('humans.subject'),
});

if (cartesRefusees.length) {
  const vus = new Set();
  for (const r of cartesRefusees) {
    const k = `${r.slug}/${r.cle}/${r.valeur}`;
    if (vus.has(k)) continue;
    vus.add(k);
    console.warn(`(${r.releve ? 'attaque relevée dans la prose' : 'build du wiki non converti'} — ${r.slug} / ${r.cle} « ${r.valeur} »${r.releve ? '' : ` : ${r.raison}`})`);
  }
}
console.log(`dist/ généré : ${activeLocales.join(' + ')} — ${nGuides} guides, ${nPages} pages transverses`);
console.log(`référencement : sitemap.xml (${nUrls} URLs), 404.html, humans.txt`);
if (missingKeys.size) {
  for (const [locale, keys] of missingKeys) {
    console.warn(`(i18n : ${keys.size} clé(s) absente(s) en « ${locale} » — npm run i18n:check pour le détail)`);
  }
  if (STRICT) process.exit(1);
}
