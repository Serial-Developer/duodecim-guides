// Page transverse : participer aux tournois (rejoindre, s'équiper, s'inscrire,
// jouer, récompenses)
import { renderSectionsPage } from './sections-page.mjs';

export function renderParticiper(data, seo) {
  return renderSectionsPage({
    seo,
    data,
    active: 'participer',
    pageTitle: 'Participer aux tournois — Dissidia 012 [duodecim]',
    description: 'Participer aux tournois Dissidia 012 [duodecim] : rejoindre le Discord DISSIDIA, préparer PPSSPP et Radmin, s\'inscrire et jouer ses matchs.',
  });
}
