// Chargement des catalogues de chaînes et fabrique de la fonction `t`.
//
// Règle de fallback (arbitrée en Phase 0) : une chaîne d'interface manquante
// se replie sur DEFAULT_LOCALE pour que la page reste lisible, mais le manque
// est enregistré — `npm run i18n:check` le fait remonter et le build refuse de
// publier en mode strict. Autrement dit, le repli est un filet pendant le
// développement, jamais un état publiable.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, LOCALES } from './config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOCALES_DIR = join(ROOT, 'locales');

const cache = new Map();

export function loadCatalog(locale) {
  if (!cache.has(locale)) {
    cache.set(locale, JSON.parse(readFileSync(join(LOCALES_DIR, `${locale}.json`), 'utf-8')));
  }
  return cache.get(locale);
}

// 'guide.sections.moves' -> valeur, ou undefined
function lookup(catalog, key) {
  let node = catalog;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

// Interpolation : « Guide de {name} » + { name: 'Prishe' }.
const interpolate = (str, params) =>
  params ? String(str).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : String(str);

// Fabrique la fonction `t` d'une locale.
//
// `t(key, params)` renvoie la chaîne ; `t.missing` liste les clés absentes
// rencontrées ; `t.locale` rappelle la locale courante ; `t.has(key)` teste sans
// déclencher de repli (utile pour les blocs entièrement optionnels).
export function createT(locale, { strict = false } = {}) {
  const catalog = loadCatalog(locale);
  const fallback = locale === DEFAULT_LOCALE ? null : loadCatalog(DEFAULT_LOCALE);
  const missing = new Set();

  const t = (key, params) => {
    let val = lookup(catalog, key);
    if (val === undefined && fallback) {
      missing.add(key);
      val = lookup(fallback, key);
    }
    if (val === undefined) {
      missing.add(key);
      if (strict) throw new Error(`chaîne i18n absente : « ${key} » (locale ${locale})`);
      // Visible plutôt que silencieux : une clé nue dans la page se repère à
      // l'œil pendant le développement, une chaîne vide passerait inaperçue.
      return `⟨${key}⟩`;
    }
    if (Array.isArray(val)) return val.map((v) => interpolate(v, params));
    return interpolate(val, params);
  };

  t.locale = locale;
  t.missing = missing;
  t.has = (key) => lookup(catalog, key) !== undefined;
  // Accès à une AUTRE locale depuis la locale courante. Un seul usage, mais il
  // est structurant : le bandeau qui propose le français à un visiteur
  // francophone doit lui parler français alors qu'il est sur une page anglaise.
  t.forLocale = (other) => (other === locale ? t : createT(other, { strict }));
  // Accès direct à un sous-arbre (tables de correspondance : libellés de stats,
  // de champs de coups…), replié sur la langue par défaut clé par clé.
  t.table = (key) => {
    const own = lookup(catalog, key) || {};
    const base = fallback ? lookup(fallback, key) || {} : {};
    return { ...base, ...own };
  };
  return t;
}

// Toutes les clés d'un catalogue, à plat — base du contrôle de couverture.
export function flatKeys(node, prefix = '', out = []) {
  for (const [k, v] of Object.entries(node || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatKeys(v, key, out);
    else out.push(key);
  }
  return out;
}

export { DEFAULT_LOCALE, LOCALES };
