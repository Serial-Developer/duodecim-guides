// Configuration du site — source unique de vérité pour tout ce qui doit être
// absolu (canonical, sitemap, Open Graph, JSON-LD).
//
// GitHub Pages sert ce repo comme *project site* : le site vit dans le
// sous-dossier /duodecim-guides/ du domaine serial-developer.github.io. Un
// chemin relatif dans un canonical, un og:image ou le sitemap serait donc
// cassé — d'où cette constante, utilisée partout via absUrl().
export const SITE_URL = 'https://serial-developer.github.io/duodecim-guides';

export const SITE_NAME = 'Guides Dissidia 012 [duodecim]';
export const SITE_LOCALE = 'fr_FR';
export const SITE_LANG = 'fr';

// Signature du travail éditorial (copyright, footer, author JSON-LD, README).
export const AUTHOR = 'Serial';
export const AUTHOR_URL = 'https://github.com/Serial-Developer/duodecim-guides';

// Le jeu documenté — nom exact, réutilisé tel quel dans le JSON-LD `about`.
export const GAME = {
  name: 'Dissidia 012 [duodecim] Final Fantasy',
  platform: 'PlayStation Portable',
  publisher: 'Square Enix',
  datePublished: '2011',
};

// Balises de vérification des moteurs de recherche.
// À remplir après avoir créé la propriété (procédure dans le README, § « Se
// faire indexer ») : coller ici la valeur du `content=` fournie par le moteur,
// puis `node scripts/build.mjs`. Une chaîne vide = aucune balise émise.
export const SITE_VERIFICATION = {
  google: 'GQ45pzJIGMqbhiioMEPXfs_BZYmR_0Q-L8NgEWMHyhw', // propriété créée le 27/07/2026
  bing: '',   // <meta name="msvalidate.01" content="…">
};

// URL absolue depuis un chemin publié ('' ou 'index.html' -> racine du site).
export function absUrl(path = '') {
  const p = String(path).replace(/^\/+/, '');
  if (!p || p === 'index.html') return `${SITE_URL}/`;
  return `${SITE_URL}/${p}`;
}
