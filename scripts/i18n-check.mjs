// Contrôle d'internationalisation — `npm run i18n:check`
//
// Quatre vérifications, toutes bloquantes (code de sortie 1) :
//  1. clés manquantes ou orphelines dans un catalogue ;
//  2. paramètres d'interpolation ({name}, {href}…) incohérents entre langues —
//     une traduction qui perd un {href} produit un lien vide, silencieusement ;
//  3. couverture de la prose éditoriale, page par page et langue par langue ;
//  4. chaînes de texte laissées en dur dans les templates.
//
// Les deux premières sont des erreurs. La couverture de prose est un état des
// lieux : elle n'échoue pas (un site en cours de traduction est un état normal),
// mais elle est chiffrée pour que reports/i18n.md ne soit jamais écrit à la main.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, DEFAULT_LOCALE } from '../src/i18n/config.mjs';
import { flatKeys, loadCatalog } from '../src/i18n/t.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_ARG = process.argv.includes('--json');

const errors = [];
const warnings = [];

// --- 1 & 2 : catalogues de chaînes ---
const catalogs = {};
for (const l of LOCALES) {
  const p = join(ROOT, 'locales', `${l}.json`);
  if (!existsSync(p)) { errors.push(`catalogue absent : locales/${l}.json`); continue; }
  catalogs[l] = loadCatalog(l);
}
const present = Object.keys(catalogs);
const keysOf = Object.fromEntries(present.map((l) => [l, new Set(flatKeys(catalogs[l]))]));
const allKeys = new Set(present.flatMap((l) => [...keysOf[l]]));

const missingByLocale = {};
for (const l of present) {
  const missing = [...allKeys].filter((k) => !keysOf[l].has(k)).sort();
  missingByLocale[l] = missing;
  for (const k of missing) errors.push(`clé absente en « ${l} » : ${k}`);
}

// Paramètres d'interpolation : la référence est la langue par défaut.
const paramsOf = (v) => new Set(String(v).match(/\{(\w+)\}/g) || []);
const lookup = (cat, key) => key.split('.').reduce((n, p) => (n == null ? n : n[p]), cat);
for (const l of present) {
  if (l === DEFAULT_LOCALE) continue;
  for (const k of keysOf[l]) {
    if (!keysOf[DEFAULT_LOCALE]?.has(k)) continue;
    const ref = lookup(catalogs[DEFAULT_LOCALE], k);
    const val = lookup(catalogs[l], k);
    if (typeof ref !== 'string' || typeof val !== 'string') continue;
    const a = paramsOf(ref), b = paramsOf(val);
    const lost = [...a].filter((x) => !b.has(x));
    const extra = [...b].filter((x) => !a.has(x));
    if (lost.length) errors.push(`paramètre perdu en « ${l} » sur ${k} : ${lost.join(', ')}`);
    if (extra.length) errors.push(`paramètre inconnu en « ${l} » sur ${k} : ${extra.join(', ')}`);
  }
}

// --- 3 : couverture de la prose éditoriale ---
// La référence est la langue par défaut : c'est elle qui définit ce qu'un site
// complet contient.
const edDir = (l) => join(ROOT, 'data', 'editorial', l);
const edFiles = (l) => (existsSync(edDir(l))
  ? readdirSync(edDir(l)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  : []);
const reference = edFiles(DEFAULT_LOCALE);
const coverage = {};
for (const l of present) {
  const have = new Set(edFiles(l));
  const missing = reference.filter((f) => !have.has(f));
  coverage[l] = {
    done: reference.length - missing.length,
    total: reference.length,
    missing,
  };
}

// --- 4 : chaînes en dur dans les templates ---
// Heuristique volontairement étroite : on cherche du texte destiné à l'écran
// entre balises ou dans un attribut visible, hors interpolation. Les commentaires
// et le code sont ignorés. L'objectif est de rattraper un oubli, pas de prouver
// l'absence — d'où le statut d'avertissement.
const TEXT_ATTRS = /(?:aria-label|title|placeholder|alt)="([^"$][^"]*)"/g;
const FR_HINT = /[àâäéèêëîïôöùûüçœ]|(?:^|\s)(?:le|la|les|des|une|pour|avec|sans|dans|vous|est|sont|plus|cette|qui|que)(?:\s|$)/i;
const hardcoded = [];
for (const f of readdirSync(join(ROOT, 'src', 'templates'))) {
  const src = readFileSync(join(ROOT, 'src', 'templates', f), 'utf-8');
  const code = src.split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  // Texte entre deux balises, sans interpolation ni entité seule
  for (const m of code.matchAll(/>([^<>{}`$\n]{4,})</g)) {
    const s = m[1].trim();
    if (!s || /^[\s\d.,:;·—–&|/()[\]{}#%+*-]*$/.test(s)) continue;
    if (!FR_HINT.test(s)) continue;
    hardcoded.push(`${f} : « ${s.slice(0, 60)} »`);
  }
  for (const m of code.matchAll(TEXT_ATTRS)) {
    const s = m[1].trim();
    if (!s || !FR_HINT.test(s)) continue;
    hardcoded.push(`${f} : attribut « ${s.slice(0, 60)} »`);
  }
}
for (const h of hardcoded) warnings.push(`chaîne en dur — ${h}`);

// --- Rapport ---
const summary = {
  locales: present,
  defaultLocale: DEFAULT_LOCALE,
  keys: { total: allKeys.size, missing: missingByLocale },
  editorial: coverage,
  hardcoded,
  errors,
};

if (JSON_ARG) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`i18n : ${allKeys.size} clés d'interface · locales ${present.join(', ')} · défaut « ${DEFAULT_LOCALE} »`);
  for (const l of present) {
    const c = coverage[l];
    const pct = c.total ? Math.round((100 * c.done) / c.total) : 0;
    console.log(`  ${l} : ${allKeys.size - missingByLocale[l].length}/${allKeys.size} clés · prose ${c.done}/${c.total} fichiers (${pct} %)`);
    if (c.missing.length && c.missing.length <= 12) console.log(`      prose absente : ${c.missing.join(', ')}`);
    else if (c.missing.length) console.log(`      prose absente : ${c.missing.slice(0, 10).join(', ')}… (+${c.missing.length - 10})`);
  }
  for (const w of warnings) console.warn(`  ! ${w}`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.log(errors.length ? `\n${errors.length} erreur(s).` : '\nAucune erreur de catalogue.');
}

process.exit(errors.length ? 1 : 0);
