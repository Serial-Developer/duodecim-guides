// Page transverse : tournois documentés, rulesets et participation
import { esc, paras, sourcesSection, pageShell, siteHeader, siteFooter, slugAnchor, linksFor } from './helpers.mjs';

function rulesetBlock(r) {
  return `<article class="card" id="${esc(r.id)}">
<h3 style="margin-top:0">${esc(r.name)}</h3>
${paras(r.summary)}
${r.points?.length ? `<ul>${r.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
<p class="video-link"><a href="${esc(r.source)}" target="_blank" rel="external noopener">${esc(r.sourceLabel)}</a></p>
</article>`;
}

function tournoiBlock(t, tr) {
  const medals = ['🥇', '🥈', '🥉'];
  return `<article class="card" id="${slugAnchor(tr.name)}">
<h3 style="margin-top:0">${esc(tr.name)}</h3>
<div class="table-scroll"><table class="stats">
<tr><th>${t('tournaments.date')}</th><td>${esc(tr.date)}</td></tr>
<tr><th>${t('tournaments.format')}</th><td>${esc(tr.format)}</td></tr>
<tr><th>${t('tournaments.players')}</th><td>${esc(tr.joueurs)}</td></tr>
${tr.podium?.length ? `<tr><th>${t('tournaments.podium')}</th><td>${tr.podium.map((p, i) => `${medals[i] || ''} ${esc(p)}`).join(' · ')}</td></tr>` : ''}
<tr><th>${t('tournaments.organisation')}</th><td>${esc(tr.organisation)}</td></tr>
</table></div>
${tr.notes ? `<p class="mv-desc">${esc(tr.notes)}</p>` : ''}
${(tr.liens || []).map((l) => `<p class="video-link"><a href="${esc(l.url)}" target="_blank" rel="external noopener">${esc(l.label)}</a></p>`).join('\n')}
</article>`;
}

export function renderTournois(data, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'tournois' })}
<nav class="guide-top" aria-label="${esc(t('common.pageSections'))}"><div class="chips-nav">
<a href="${L.page('home')}">${t('common.backToSelect')}</a>
<a href="#rulesets">${t('tournaments.navRulesets')}</a>
<a href="#tournois">${t('tournaments.navTournaments')}</a>
<a href="#participer">${t('tournaments.participate')}</a>
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>

<h2 id="rulesets">${t('tournaments.rulesets')}</h2>
${(data.rulesets || []).map(rulesetBlock).join('\n')}

<h2 id="tournois">${t('tournaments.documented')}</h2>
${(data.tournois || []).map((tr) => tournoiBlock(t, tr)).join('\n')}

<h2 id="participer">${t('tournaments.participate')}</h2>
${paras(data.participer?.intro)}
<p><a href="${L.page('participate')}">${t('tournaments.participateLink')}</a></p>

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
    title: t('tournaments.metaTitle'),
    description: t('tournaments.metaDescription'),
    jsPath: null,
    body,
  });
}
