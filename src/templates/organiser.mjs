// Page transverse : organiser son propre tournoi (rôle TO, règlement, bracket,
// annonce, déroulé, après-tournoi)
import { renderSectionsPage } from './sections-page.mjs';

export function renderOrganiser(data, seo) {
  return renderSectionsPage({
    seo,
    data,
    active: 'organiser',
    pageTitle: 'Organiser un tournoi — Dissidia 012 [duodecim]',
    description: 'Organiser un tournoi Dissidia 012 [duodecim] : rôle Tournament Organizer, règlement, bracket start.gg ou Challonge, annonce, arbitrage et clôture.',
  });
}
