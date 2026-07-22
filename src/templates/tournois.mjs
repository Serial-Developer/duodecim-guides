// Page transverse : tournois documentés, rulesets et participation
import { esc, paras, sectionSources, sourcesSection, pageShell, siteHeader, siteFooter, slugAnchor } from './helpers.mjs';

function rulesetBlock(r) {
  return `<article class="card" id="${esc(r.id)}">
<h3 style="margin-top:0">${esc(r.name)}</h3>
${paras(r.summary)}
${r.points?.length ? `<ul>${r.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
<p class="video-link"><a href="${esc(r.source)}" target="_blank" rel="external noopener">${esc(r.sourceLabel)}</a></p>
</article>`;
}

function tournoiBlock(t) {
  const medals = ['🥇', '🥈', '🥉'];
  return `<article class="card" id="${slugAnchor(t.name)}">
<h3 style="margin-top:0">${esc(t.name)}</h3>
<div class="table-scroll"><table class="stats">
<tr><th>Date</th><td>${esc(t.date)}</td></tr>
<tr><th>Format</th><td>${esc(t.format)}</td></tr>
<tr><th>Participants</th><td>${esc(t.joueurs)}</td></tr>
${t.podium?.length ? `<tr><th>Podium</th><td>${t.podium.map((p, i) => `${medals[i] || ''} ${esc(p)}`).join(' · ')}</td></tr>` : ''}
<tr><th>Organisation</th><td>${esc(t.organisation)}</td></tr>
</table></div>
${t.notes ? `<p class="mv-desc">${esc(t.notes)}</p>` : ''}
${(t.liens || []).map((l) => `<p class="video-link"><a href="${esc(l.url)}" target="_blank" rel="external noopener">${esc(l.label)}</a></p>`).join('\n')}
</article>`;
}

export function renderTournois(data) {
  const body = `${siteHeader({ active: 'tournois' })}
<nav class="guide-top" aria-label="Sections de la page"><div class="chips-nav">
<a href="index.html">← Sélection</a>
<a href="#rulesets">Rulesets</a>
<a href="#tournois">Tournois</a>
<a href="#participer">Participer</a>
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>

<h2 id="rulesets">Les rulesets</h2>
${(data.rulesets || []).map(rulesetBlock).join('\n')}

<h2 id="tournois">Tournois documentés</h2>
${(data.tournois || []).map(tournoiBlock).join('\n')}

<h2 id="participer">Participer</h2>
${paras(data.participer?.intro)}
<p><a href="participer.html">Participer aux tournois : le guide complet →</a></p>

<h2 id="sources">Sources</h2>
${sourcesSection(data.sources, data.limits)}
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Tournois — Dissidia 012 [duodecim]',
    description: 'Les tournois compétitifs de Dissidia 012 [duodecim] : rulesets (Duodecim 22-1, Japan Ranked), brackets, résultats et conditions de participation.',
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
