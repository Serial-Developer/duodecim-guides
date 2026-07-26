// Page transverse : organiser son propre tournoi (rôle TO, règlement, bracket,
// annonce, déroulé, après-tournoi)
import { renderSectionsPage } from './sections-page.mjs';

export function renderOrganiser(data, seo, i18n) {
  return renderSectionsPage({
    ...i18n,
    seo,
    data,
    active: 'organiser',
    pageTitle: i18n.t('organize.metaTitle'),
    description: i18n.t('organize.metaDescription'),
  });
}
