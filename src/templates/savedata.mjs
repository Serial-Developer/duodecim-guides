// Page transverse : savedata prêtes pour les tournois (communauté Discord DISSIDIA)
import { esc, infoBanner, sectionSources, sourcesSection, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';

export function renderSavedata(data, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  const saves = (data.saves || []).map((s) => `<article class="card">
<h3 style="margin-top:0">${esc(s.name)}</h3>
<p><span class="badge prio-melee-high">${esc(s.pour)}</span></p>
<p>${esc(s.desc)}</p>
<p class="video-link"><a href="${esc(s.url)}" target="_blank" rel="external noopener">${t('savedata.download')}</a></p>
</article>`).join('\n');

  const inst = data.installation;
  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'savedata' })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>
${infoBanner(esc(data.avertissement))}

<h2 id="saves">${t('savedata.saves')}</h2>
${saves}

<h2 id="installation">${t('savedata.installTitle')}</h2>
${inst?.intro ? `<p>${esc(inst.intro)}</p>` : ''}
${inst?.etapes?.length ? `<ol class="steps">${inst.etapes.map((e) => `<li>${esc(e)}</li>`).join('')}</ol>` : ''}
${inst?.note ? `<p class="mv-desc">${esc(inst.note)} <a href="${L.page('install')}">${t('savedata.installLink')}</a></p>` : ''}

<h2 id="builds">${t('savedata.builds')}</h2>
<p>${esc(data.comprendre?.texte || '')}</p>
${sectionSources(t, data.comprendre?.source ? [data.comprendre.source] : [])}

<h2 id="sources">${t('common.sources')}</h2>
${sourcesSection(t, data.sources, data.limits)}
</main>
${siteFooter(t)}`;
  return pageShell({
    t,
    locale,
    seo,
    path,
    alternates,
    title: t('savedata.metaTitle'),
    description: t('savedata.metaDescription'),
    jsPath: null,
    body,
  });
}
