// Génération statique : data/ + src/templates/ -> dist/
// Usage : node scripts/build.mjs
import { CHARACTERS, SPECIAL } from './characters.mjs';
import { renderLanding } from '../src/templates/landing.mjs';
import { renderGuide } from '../src/templates/guide.mjs';
import { renderTechniques } from '../src/templates/techniques.mjs';
import { renderChaos } from '../src/templates/chaos.mjs';
import { speedValues } from '../src/templates/helpers.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);

const meta = readJson(join(ROOT, 'data', 'meta.json'));
const shared = readJson(join(ROOT, 'data', 'editorial', '_shared.json'));

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

// Moyennes du cast (31 jouables) pour le profil de mobilité
const SPEED_KEYS = ['Run Speed', 'Dash Speed', 'Fall Speed', 'Fall Speed Ratio After Dodge'];
const castAvg = {};
for (const key of SPEED_KEYS) {
  const vals = chars
    .filter((c) => CHARACTERS.some((k) => k.slug === c.def.slug))
    .map((c) => speedValues(c.data.infobox?.[key]).normal)
    .filter((v) => v !== null && !Number.isNaN(v));
  if (vals.length) castAvg[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
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

// Landing (31 jouables uniquement, rangées façon écran du jeu)
const taglineBySlug = Object.fromEntries(chars.filter((c) => c.ed?.tagline).map((c) => [c.def.slug, c.ed.tagline]));
writeFileSync(join(DIST, 'index.html'), renderLanding({
  characters: CHARACTERS,
  tierBySlug,
  taglineBySlug,
}));

// Guides + fiche courte Chaos
let missingEd = 0;
for (const { def, data, ed } of chars) {
  if (def.slug === 'chaos') {
    writeFileSync(join(DIST, 'characters', 'chaos.html'), renderChaos({
      char: data,
      ed,
      hasPortrait: existsSync(join(ROOT, 'assets', 'portraits', 'chaos.png')),
    }));
    continue;
  }
  if (!ed) missingEd++;
  const html = renderGuide({
    char: data,
    ed,
    tierEntry: tierEntryBySlug[def.slug] || null,
    castAvg,
    hasPortrait: existsSync(join(ROOT, 'assets', 'portraits', `${def.slug}.png`)),
    moveImages,
  });
  writeFileSync(join(DIST, 'characters', `${def.slug}.html`), html);
}

// Techniques
writeFileSync(join(DIST, 'techniques.html'), renderTechniques(shared));

// Statiques
cpSync(join(ROOT, 'src', 'styles', 'main.css'), join(DIST, 'styles', 'main.css'));
cpSync(join(ROOT, 'src', 'scripts', 'site.js'), join(DIST, 'scripts', 'site.js'));
cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });

console.log(`dist/ généré : index + ${chars.length - 1} guides + techniques.html${missingEd ? ` (${missingEd} sans éditorial — bandeaux)` : ''}`);
