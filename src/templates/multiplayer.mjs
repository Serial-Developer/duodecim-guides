// Page Multijoueur : un scénario de connexion par section
import { esc, paras, banner, infoBanner, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';

function scenario(sc) {
  const list = (points) => `<ul>${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
  return `<article class="card" id="${esc(sc.id)}">
<h2 style="margin-top:0.2rem">${esc(sc.title)}</h2>
${list(sc.points)}
${(sc.sub || []).map((s) => `<h3>${esc(s.title)}</h3>${list(s.points)}`).join('')}
</article>`;
}

export function renderMultiplayer(mp, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  if (!mp) {
    return pageShell({
      t, locale, seo, path, alternates,
      title: t('multiplayer.fallbackTitle'),
      description: t('multiplayer.fallbackDescription'),
      jsPath: null,
      body: `${siteHeader(t, { path, locale, alternates, availability, active: 'multijoueur' })}<main class="wrap">${banner(t)}</main>${siteFooter(t)}`,
    });
  }
  const anchors = mp.scenarios.map((sc) => `<a href="#${esc(sc.id)}">${esc(sc.title.split(' — ')[0].split(' (')[0])}</a>`).join(' · ');
  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'multijoueur' })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${t('multiplayer.h1')}</h1>
${paras(mp.intro)}
<p class="mv-desc">${t('multiplayer.goToScenario')} ${anchors}</p>
<p class="mv-desc">${t('multiplayer.notInstalled', { install: L.page('install'), installAttr: L.pageLangAttr('install'), savedata: L.page('savedata'), savedataAttr: L.pageLangAttr('savedata') })}</p>
${mp.scenarios.map(scenario).join('\n')}
${infoBanner(esc(mp.note))}
<p class="sources-list">${t('multiplayer.sourceLine')} <a href="${esc(mp.source)}" target="_blank" rel="external noopener">${esc(mp.source)}</a> ${t('multiplayer.sourceSuffix')}</p>
</main>
${siteFooter(t)}`;
  return pageShell({
    t,
    locale,
    seo,
    path,
    alternates,
    title: t('multiplayer.metaTitle'),
    description: t('multiplayer.metaDescription'),
    jsPath: null,
    body,
  });
}
