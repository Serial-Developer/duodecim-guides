// Table des chemins publiés, par page logique et par locale.
//
// Source unique du routage : le build, le header, le sélecteur de langue, les
// alternates hreflang et le sitemap en découlent tous. Une page ajoutée ici
// existe partout ; une page absente d'ici n'existe nulle part.
//
// Les slugs de personnages ne figurent pas dans cette table : ils sont des noms
// propres, identiques dans toutes les langues (`characters/prishe.html`). Seul
// le préfixe de locale les distingue. Localiser le segment `characters/` en
// `personnages/` doublerait la surface de bug (maillage interne de linkRoster,
// ancres profondes, 33 guides) pour un gain nul : Google déduit la langue de
// `hreflang` et de `<html lang>`, pas des mots du chemin.
//
// Les pages transverses, elles, sont localisées : laisser des URLs françaises
// sur la version anglaise serait incohérent pour le public visé.
import { LOCALES, localeDir } from './config.mjs';

export const ROUTES = {
  home: { fr: 'index.html', en: 'index.html' },
  techniques: { fr: 'techniques.html', en: 'techniques.html' },
  buildCreator: { fr: 'createur-de-builds.html', en: 'build-creator.html' },
  multiplayer: { fr: 'multijoueur.html', en: 'multiplayer.html' },
  install: { fr: 'install.html', en: 'install.html' },
  savedata: { fr: 'savedata.html', en: 'savedata.html' },
  feralUnlock: { fr: 'obtenir-feral-chaos.html', en: 'unlock-feral-chaos.html' },
  participate: { fr: 'participer.html', en: 'join-tournaments.html' },
  organize: { fr: 'organiser.html', en: 'run-a-tournament.html' },
  pastTournaments: { fr: 'tournois.html', en: 'past-tournaments.html' },
  upcomingTournaments: { fr: 'futurs-tournois.html', en: 'upcoming-tournaments.html' },
};

// Chemin publié d'une page logique dans une locale ('fr/techniques.html').
export function pathFor(key, locale) {
  const entry = ROUTES[key];
  if (!entry) throw new Error(`route inconnue : ${key}`);
  const file = entry[locale];
  if (!file) throw new Error(`route « ${key} » sans chemin pour la locale ${locale}`);
  return `${localeDir(locale)}${file}`;
}

// Chemin publié du guide d'un personnage.
export const guidePathFor = (slug, locale) => `${localeDir(locale)}characters/${slug}.html`;

// Alternates d'une page : { locale -> chemin }, pour les liens hreflang et le
// sélecteur de langue. `available` restreint aux locales où la page existe
// réellement (voir la règle de fallback : une page sans prose n'est pas générée,
// et ne doit alors pas être annoncée comme alternative).
export function alternatesFor(key, { available = LOCALES } = {}) {
  const out = {};
  for (const l of LOCALES) if (available.includes(l)) out[l] = pathFor(key, l);
  return out;
}

export function guideAlternatesFor(slug, { available = LOCALES } = {}) {
  const out = {};
  for (const l of LOCALES) if (available.includes(l)) out[l] = guidePathFor(slug, l);
  return out;
}

// Correspondance inverse : chemin publié -> clé logique. Sert au sélecteur de
// langue côté client, qui doit retrouver l'équivalent de la page courante.
export function routeKeyOf(file, locale) {
  for (const [key, entry] of Object.entries(ROUTES)) if (entry[locale] === file) return key;
  return null;
}
