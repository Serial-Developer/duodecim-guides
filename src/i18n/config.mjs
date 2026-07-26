// Configuration des langues du site.
//
// `DEFAULT_LOCALE` est LA constante de bascule : la langue par défaut est servie
// à la racine du site, toutes les autres sous leur préfixe. La faire passer de
// 'fr' à 'en' déplace donc l'anglais à la racine et le français sous /fr/ —
// c'est toute la Phase 5 du chantier, une ligne.
//
// Bascule effectuée le 27/07/2026, la prose anglaise étant complète (41/41
// fichiers, 43 pages de chaque côté) : l'anglais occupe désormais la racine, le
// français passe sous /fr/. Les deux versions restent servies telles quelles —
// aucune redirection, conformément au §8 du cahier des charges.
//
// Conséquence assumée : les URLs françaises historiquement à la racine servent
// maintenant l'anglais. Il faut donc resoumettre le sitemap en Search Console
// pour que les nouvelles URLs /fr/ soient découvertes.
export const DEFAULT_LOCALE = 'en';

// Ordre d'affichage dans le sélecteur de langue.
export const LOCALES = ['en', 'fr'];

export const LOCALE_META = {
  fr: {
    lang: 'fr',           // <html lang> et hreflang
    ogLocale: 'fr_FR',    // og:locale
    label: 'Français',    // libellé du sélecteur, dans sa propre langue
    code: 'FR',           // code compact affiché
    name: 'français',     // pour les phrases (« aussi disponible en français »)
  },
  en: {
    lang: 'en',
    ogLocale: 'en_US',
    label: 'English',
    code: 'EN',
    name: 'English',
  },
};

// Préfixe de dossier d'une locale : '' pour la langue par défaut (servie à la
// racine), 'xx/' pour les autres.
export const localeDir = (locale) => (locale === DEFAULT_LOCALE ? '' : `${locale}/`);

// Profondeur d'une page publiée, en nombre de '../' pour remonter à la racine du
// site. 'fr/characters/prishe.html' -> '../../'.
export const upTo = (path) => '../'.repeat(String(path).split('/').length - 1);

export const isLocale = (x) => Object.prototype.hasOwnProperty.call(LOCALE_META, x);
