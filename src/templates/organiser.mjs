// Page transverse : organiser son propre tournoi (rôle TO, règlement, bracket,
// annonce, déroulé, après-tournoi)
import { renderSectionsPage } from './sections-page.mjs';

export function renderOrganiser(data) {
  return renderSectionsPage({
    data,
    active: 'organiser',
    pageTitle: 'Organiser un tournoi — Dissidia 012 [duodecim]',
    description: 'Organiser son propre tournoi Dissidia 012 [duodecim] : obtenir le rôle Tournament Organizer, écrire le règlement, créer le bracket sur start.gg ou Challonge, annoncer, arbitrer et clôturer l\'édition.',
  });
}
