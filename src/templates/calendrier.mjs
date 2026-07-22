// Page transverse : calendrier navigable des tournois (passés, à venir,
// candidats détectés par la veille automatique)
import { esc, paras, sourcesSection, pageShell, siteHeader, siteFooter } from './helpers.mjs';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function frDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}

function upcomingList(events) {
  if (!events.length) {
    return `<div class="banner info">Aucun tournoi à venir annoncé pour le moment. Les annonces tombent sur le canal <strong>announcements</strong> du Discord DISSIDIA — les tournois créés sur start.gg apparaissent ici automatiquement, les autres sont relayés à la main.</div>`;
  }
  return events.map((e) => `<article class="card">
<h3 style="margin-top:0">${esc(e.name)}</h3>
<div class="table-scroll"><table class="stats">
<tr><th>Date</th><td>${esc(frDate(e.iso))}</td></tr>
${e.format ? `<tr><th>Format</th><td>${esc(e.format)}</td></tr>` : ''}
${e.organisation ? `<tr><th>Organisation</th><td>${esc(e.organisation)}</td></tr>` : ''}
</table></div>
${e.notes ? `<p class="mv-desc">${esc(e.notes)}</p>` : ''}
${e.url ? `<p class="video-link"><a href="${esc(e.url)}" target="_blank" rel="external noopener">Inscription et détails</a></p>` : ''}
</article>`).join('\n');
}

function inboxList(candidates) {
  if (!candidates.length) return '';
  return `<h2 id="detectes">Annonces détectées — à confirmer</h2>
<p class="mv-desc">La veille a repéré ces messages sur le canal d'annonces ; ils sont listés tels quels en attendant une vérification manuelle (date, règlement, inscription).</p>
${candidates.map((c) => `<article class="card">
<p><strong>${esc(c.at || '')}</strong>${c.author ? ` — ${esc(c.author)}` : ''}</p>
<p class="mv-desc">${esc(c.excerpt)}</p>
${(c.links || []).map((l) => `<p class="video-link"><a href="${esc(l)}" target="_blank" rel="external noopener">${esc(l)}</a></p>`).join('\n')}
</article>`).join('\n')}`;
}

export function renderCalendrier(data) {
  const { events, upcoming, candidates, lastCheck, sources, limits } = data;
  const payload = JSON.stringify({ events }).replace(/</g, '\\u003c');
  const lastCheckTxt = lastCheck
    ? `Dernière vérification automatique : ${esc(frDate(lastCheck.slice(0, 10)))}.`
    : `La veille automatique n'a pas encore tourné — le calendrier reflète le dernier relevé manuel (juillet 2026).`;

  const body = `${siteHeader({ active: 'futurs' })}
<nav class="guide-top" aria-label="Sections de la page"><div class="chips-nav">
<a href="index.html">← Sélection</a>
<a href="#calendrier">Calendrier</a>
<a href="#avenir">À venir</a>
<a href="#veille">La veille automatique</a>
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">Futurs tournois</h1>
<p class="mv-desc">Le calendrier de la scène compétitive : les tournois annoncés à venir et tous les tournois passés documentés. Une veille sonde start.gg deux fois par jour ; les annonces du Discord DISSIDIA sont relayées à la main.</p>

<h2 id="calendrier">Calendrier</h2>
<div class="cal" id="cal">
<div class="cal-bar">
<div class="cal-nav">
<button type="button" id="cal-jump-prev" title="Aller au tournoi précédent">⏮</button>
<button type="button" id="cal-prev" title="Mois précédent">‹</button>
<button type="button" id="cal-today">Aujourd'hui</button>
<button type="button" id="cal-next" title="Mois suivant">›</button>
<button type="button" id="cal-jump-next" title="Aller au tournoi suivant">⏭</button>
</div>
<p class="cal-label" id="cal-label" aria-live="polite"></p>
</div>
<div class="cal-grid" id="cal-grid" role="grid" aria-label="Calendrier des tournois"></div>
<div class="cal-legend"><span class="cal-key cal-key-past">tournoi joué</span><span class="cal-key cal-key-up">tournoi à venir</span></div>
<div id="cal-month-list"></div>
</div>
<script type="application/json" id="cal-data">${payload}</script>

<h2 id="avenir">Tournois à venir</h2>
${upcomingList(upcoming)}

${inboxList(candidates)}

<h2 id="veille">Comment cette page se remplit</h2>
<article class="card">
<p>Deux fois par jour, une veille automatique interroge l'API officielle de start.gg : chaque tournoi Duodecim qui y est créé apparaît ici de lui-même, avec sa date et son lien. Les annonces du canal <strong>announcements</strong> du Discord DISSIDIA (notamment les brackets Challonge) sont relayées manuellement sur le calendrier. Les tournois passés viennent de la <a href="tournois.html">page Tournois</a>, où chaque édition est documentée avec son ruleset et ses résultats.</p>
<p class="mv-desc">${lastCheckTxt}</p>
</article>

<h2 id="sources">Sources</h2>
${sourcesSection(sources, limits)}
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Futurs tournois — Dissidia 012 [duodecim]',
    description: 'Calendrier des tournois de Dissidia 012 [duodecim] : éditions à venir et tournois passés, mis à jour automatiquement depuis start.gg et le Discord DISSIDIA.',
    cssPath: 'styles/main.css',
    jsPath: 'scripts/calendrier.js',
    body,
  });
}
