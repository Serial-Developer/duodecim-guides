// Page transverse : techniques universelles, glitches, jeu en ligne
import { esc, paras, banner, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';

function block(t, item) {
  if (!item) return '';
  return `<article class="card" id="${esc(item.id || '')}">
<h3 style="margin-top:0">${esc(item.name)}</h3>
${paras(item.summary)}
${item.howTo?.length ? `<h3>${t('techniques.inPractice')}</h3><ul>${item.howTo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${item.competitiveUse ? `<p><strong>${t('techniques.competitiveUse')}</strong> ${esc(item.competitiveUse)}</p>` : ''}
${item.video?.url ? `<p class="video-link"><a href="${esc(item.video.url)}" target="_blank" rel="external noopener">▶ ${esc(item.video.title || t('techniques.videoFallback'))}</a>${item.video.author ? ` — ${esc(item.video.author)}` : ''}${item.video.date ? ` (${esc(String(item.video.date))})` : ''}</p>` : ''}
${item.source ? `<p class="sources-list"><a href="${esc(item.source)}" target="_blank" rel="external noopener">${esc(item.source)}</a></p>` : ''}
</article>`;
}

export function renderTechniques(shared, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  if (!shared) {
    return pageShell({
      t, locale, seo, path, alternates,
      title: t('techniques.fallbackTitle'),
      description: t('techniques.fallbackDescription'),
      jsPath: null,
      body: `<main class="wrap">${banner(t)}</main>${siteFooter(t)}`,
    });
  }
  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'techniques' })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${t('techniques.h1')}</h1>
<p class="mv-desc">${t('techniques.lede')}</p>

<h2>${t('techniques.priorities')}</h2>
${shared.attackPriority ? paras(shared.attackPriority.summary) + `<p class="sources-list"><a href="${esc(shared.attackPriority.source)}" target="_blank" rel="external noopener">${esc(shared.attackPriority.source)}</a></p>` : banner(t)}

<h2>${t('techniques.universal')}</h2>
${(shared.techniques || []).map((x) => block(t, x)).join('\n')}

<h2>${t('techniques.glitches')}</h2>
${(shared.glitches || []).map((x) => block(t, x)).join('\n')}

<h2>${t('techniques.online')}</h2>
<p class="mv-desc">${t('techniques.onlineIntro', { href: L.page('install'), langAttr: L.pageLangAttr('install') })}</p>
${shared.onlineSetup ? paras(shared.onlineSetup.summary) + `<p>${t('techniques.onlineDetail', { href: L.page('multiplayer'), langAttr: L.pageLangAttr('multiplayer') })}</p><p class="sources-list"><a href="${esc(shared.onlineSetup.source)}" target="_blank" rel="external noopener">${esc(shared.onlineSetup.source)}</a></p>` : banner(t)}

<h2>${t('techniques.glossary')}</h2>
${shared.glossaryNote ? paras(shared.glossaryNote.summary) + `<p class="sources-list"><a href="${esc(shared.glossaryNote.source)}" target="_blank" rel="external noopener">${esc(shared.glossaryNote.source)}</a></p>` : banner(t)}
</main>
${siteFooter(t)}`;
  return pageShell({
    t,
    locale,
    seo,
    path,
    alternates,
    title: t('techniques.metaTitle'),
    description: t('techniques.metaDescription'),
    jsPath: null,
    body,
  });
}
