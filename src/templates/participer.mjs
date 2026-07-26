// Page transverse : participer aux tournois (rejoindre, s'équiper, s'inscrire,
// jouer, récompenses)
import { renderSectionsPage } from './sections-page.mjs';

export function renderParticiper(data, seo, i18n) {
  return renderSectionsPage({
    ...i18n,
    seo,
    data,
    active: 'participer',
    pageTitle: i18n.t('participate.metaTitle'),
    description: i18n.t('participate.metaDescription'),
  });
}
