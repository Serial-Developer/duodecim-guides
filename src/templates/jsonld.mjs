// Données structurées schema.org. Tout est composé depuis site-config.mjs et
// les données existantes : aucun champ n'est renseigné « au cas où », un champ
// dont la valeur n'est pas connue est simplement absent (une date inventée
// serait un fait faux servi aux moteurs).
import { SITE_URL, SITE_NAME, AUTHOR, AUTHOR_URL, GAME, absUrl } from '../site-config.mjs';

const WEBSITE_ID = `${SITE_URL}/#website`;
const AUTHOR_ID = `${SITE_URL}/#author`;

// Licence des textes originaux français (cf. LICENSE et NOTICE.md)
export const CONTENT_LICENSE = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';

const person = () => ({
  '@type': 'Person',
  '@id': AUTHOR_ID,
  name: AUTHOR,
  url: AUTHOR_URL,
});

// Le jeu documenté — même entité réutilisée par toutes les pages, ce qui aide
// les moteurs à rattacher le site à un sujet unique et identifiable.
const videoGame = () => ({
  '@type': 'VideoGame',
  name: GAME.name,
  gamePlatform: GAME.platform,
  datePublished: GAME.datePublished,
  publisher: { '@type': 'Organization', name: GAME.publisher },
});

export function ldWebSite({ description, datePublished, dateModified }) {
  // Pas de SearchAction : le site n'a pas de recherche interne. La déclarer
  // enverrait les moteurs vers une URL de recherche inexistante.
  const out = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: absUrl(''),
    description,
    inLanguage: 'fr',
    author: person(),
    publisher: person(),
    license: CONTENT_LICENSE,
    about: videoGame(),
  };
  if (datePublished) out.datePublished = datePublished;
  if (dateModified) out.dateModified = dateModified;
  return out;
}

// Guides et pages transverses. `type` : 'TechArticle' pour les guides de jeu
// (contenu technique : frame data, builds), 'Article' pour le reste.
export function ldArticle({
  type = 'TechArticle', headline, description, path, image, imageAlt,
  datePublished, dateModified, section,
}) {
  const url = absUrl(path);
  const out = {
    '@context': 'https://schema.org',
    '@type': type,
    headline,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'fr',
    author: person(),
    publisher: person(),
    isPartOf: { '@id': WEBSITE_ID },
    license: CONTENT_LICENSE,
    about: videoGame(),
  };
  if (image) {
    out.image = {
      '@type': 'ImageObject',
      url: absUrl(image),
      ...(imageAlt ? { caption: imageAlt } : {}),
    };
  }
  if (datePublished) out.datePublished = datePublished;
  if (dateModified) out.dateModified = dateModified;
  if (section) out.articleSection = section;
  return out;
}

export function ldWebApplication({ name, description, path, image, imageAlt, datePublished, dateModified }) {
  const url = absUrl(path);
  const out = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Navigateur avec JavaScript activé',
    inLanguage: 'fr',
    author: person(),
    publisher: person(),
    isPartOf: { '@id': WEBSITE_ID },
    license: CONTENT_LICENSE,
    about: videoGame(),
    // L'outil est gratuit et sans compte — l'indiquer explicitement évite que
    // les moteurs le présentent comme un produit payant.
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };
  if (image) {
    out.image = { '@type': 'ImageObject', url: absUrl(image), ...(imageAlt ? { caption: imageAlt } : {}) };
  }
  if (datePublished) out.datePublished = datePublished;
  if (dateModified) out.dateModified = dateModified;
  return out;
}
