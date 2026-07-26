// Page transverse : obtenir Feral Chaos (chemin de déblocage + méthodes pour
// battre le boss final du scénario 000)
import { esc, paras, sourcesSection, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';

function methodeBlock(m) {
  return `<article class="card" id="${esc(m.id)}">
<h3 style="margin-top:0">${esc(m.name)}</h3>
${paras(m.intro)}
${m.points?.length ? `<ul>${m.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
</article>`;
}

export function renderFeralUnlock(data, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'feral' })}
<nav class="guide-top" aria-label="${esc(t('common.pageSections'))}"><div class="chips-nav">
<a href="${L.page('home')}">${t('common.backToSelect')}</a>
<a href="#chemin">${t('feralUnlock.navPath')}</a>
<a href="#methodes">${t('feralUnlock.navMethods')}</a>
<a href="#apres">${t('feralUnlock.navAfter')}</a>
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>

<h2 id="chemin">${t('feralUnlock.pathTitle')}</h2>
${paras(data.chemin.intro)}
<ol class="steps">${data.chemin.etapes.map((e) => `<li>${esc(e)}</li>`).join('')}</ol>
<article class="card">
<h3 style="margin-top:0">${t('feralUnlock.bossCard')}</h3>
<p>${esc(data.chemin.boss)}</p>
</article>
<div class="banner info">${esc(data.chemin.piege)}</div>

<h2 id="methodes">${t('feralUnlock.methodsTitle')}</h2>
${data.methodes.map(methodeBlock).join('\n')}

<h2 id="apres">${t('feralUnlock.afterTitle')}</h2>
${paras(data.apres.intro)}
<p class="video-link"><a href="${L.guide('feral-chaos')}">${t('feralUnlock.sheetLink')}</a></p>

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
    title: t('feralUnlock.metaTitle'),
    description: t('feralUnlock.metaDescription'),
    jsPath: null,
    body,
  });
}
