// Page transverse : participer aux tournois (rejoindre, s'équiper, s'inscrire,
// jouer, récompenses)
import { renderSectionsPage } from './sections-page.mjs';

export function renderParticiper(data) {
  return renderSectionsPage({
    data,
    active: 'participer',
    pageTitle: 'Participer aux tournois — Dissidia 012 [duodecim]',
    description: 'Comment participer aux tournois de Dissidia 012 [duodecim] : rejoindre le Discord DISSIDIA, préparer PPSSPP et Radmin, s\'inscrire, jouer ses matchs et organiser son propre tournoi.',
  });
}
