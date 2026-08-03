// Page transverse : calendrier navigable des tournois (passés, à venir,
// candidats détectés par la veille automatique)
import { esc, sourcesSection, pageShell, siteHeader, siteFooter, linksFor, longDate } from './helpers.mjs';

// Les champs libres d'un tournoi sont relayés à la main depuis une annonce.
// Une chaîne vaut pour les deux langues — c'est le cas d'un format écrit en
// termes du jeu (« BO5 ») ; un objet { en, fr } permet de les traduire quand
// c'est de la prose. `data/calendar/` n'étant pas rangé par locale, sans cela
// un lecteur français lisait le règlement en anglais.
const champ = (v, locale) => (v && typeof v === 'object' ? (v[locale] ?? v.en ?? '') : (v || ''));

function upcomingList(t, events) {
  if (!events.length) {
    return `<div class="banner info">${t('calendar.noUpcoming')}</div>`;
  }
  return events.map((e) => `<article class="card">
<h3 style="margin-top:0">${esc(e.name)}</h3>
<div class="table-scroll"><table class="stats">
<tr><th>${t('tournaments.date')}</th><td>${esc(longDate(t, e.iso))}</td></tr>
${champ(e.format, t.locale) ? `<tr><th>${t('tournaments.format')}</th><td>${esc(champ(e.format, t.locale))}</td></tr>` : ''}
${champ(e.organisation, t.locale) ? `<tr><th>${t('tournaments.organisation')}</th><td>${esc(champ(e.organisation, t.locale))}</td></tr>` : ''}
</table></div>
${champ(e.notes, t.locale) ? `<p class="mv-desc">${esc(champ(e.notes, t.locale))}</p>` : ''}
${e.url ? `<p class="video-link"><a href="${esc(e.url)}" target="_blank" rel="external noopener">${t('calendar.signup')}</a></p>` : ''}
</article>`).join('\n');
}

function inboxList(t, candidates) {
  if (!candidates.length) return '';
  return `<h2 id="detectes">${t('calendar.detectedTitle')}</h2>
<p class="mv-desc">${t('calendar.detectedDesc')}</p>
${candidates.map((c) => `<article class="card">
<p><strong>${esc(c.at || '')}</strong>${c.author ? ` — ${esc(c.author)}` : ''}</p>
<p class="mv-desc">${esc(c.excerpt)}</p>
${(c.links || []).map((l) => `<p class="video-link"><a href="${esc(l)}" target="_blank" rel="external noopener">${esc(l)}</a></p>`).join('\n')}
</article>`).join('\n')}`;
}

export function renderCalendrier(data, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  const { events, upcoming, candidates, lastCheck, sources, limits } = data;
  const payload = JSON.stringify({ events }).replace(/</g, '\\u003c');
  const lastCheckTxt = lastCheck
    ? t('calendar.lastCheck', { date: esc(longDate(t, lastCheck.slice(0, 10))) })
    : t('calendar.noCheckYet');

  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'futurs' })}
<nav class="guide-top" aria-label="${esc(t('common.pageSections'))}"><div class="chips-nav">
<a href="${L.page('home')}">${t('common.backToSelect')}</a>
<a href="#calendrier">${t('calendar.navCalendar')}</a>
<a href="#avenir">${t('calendar.navUpcoming')}</a>
<a href="#veille">${t('calendar.navWatch')}</a>
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${t('calendar.h1')}</h1>
<p class="mv-desc">${t('calendar.lede')}</p>

<h2 id="calendrier">${t('calendar.navCalendar')}</h2>
<div class="cal" id="cal">
<div class="cal-bar">
<div class="cal-nav">
<button type="button" id="cal-jump-prev" title="${esc(t('calendar.jumpPrev'))}">⏮</button>
<button type="button" id="cal-prev" title="${esc(t('calendar.prevMonth'))}">‹</button>
<button type="button" id="cal-today">${esc(t('calendar.today'))}</button>
<button type="button" id="cal-next" title="${esc(t('calendar.nextMonth'))}">›</button>
<button type="button" id="cal-jump-next" title="${esc(t('calendar.jumpNext'))}">⏭</button>
</div>
<p class="cal-label" id="cal-label" aria-live="polite"></p>
</div>
<div class="cal-grid" id="cal-grid" role="grid" aria-label="${esc(t('calendar.calendarAria'))}"></div>
<div class="cal-legend"><span class="cal-key cal-key-past">${esc(t('calendar.keyPast'))}</span><span class="cal-key cal-key-up">${esc(t('calendar.keyUpcoming'))}</span></div>
<div id="cal-month-list"></div>
</div>
<script type="application/json" id="cal-data">${payload}</script>
<script type="application/json" id="cal-i18n">${JSON.stringify({
    locale,
    months: t('calendar.months'),
    weekdays: t('calendar.weekdays'),
    firstDay: Number(t('calendar.firstDay')),
    dayMonth: t('calendar.dayMonth'),
    empty: t('calendar.noEventsThisMonth'),
  }).replace(/</g, '\\u003c')}</script>

<h2 id="avenir">${t('calendar.upcomingTitle')}</h2>
${upcomingList(t, upcoming)}

${inboxList(t, candidates)}

<h2 id="veille">${t('calendar.howTitle')}</h2>
<article class="card">
<p>${t('calendar.howBody', { href: L.page('pastTournaments'), langAttr: L.pageLangAttr('pastTournaments') })}</p>
<p class="mv-desc">${lastCheckTxt}</p>
</article>

<h2 id="sources">${t('common.sources')}</h2>
${sourcesSection(t, sources, limits)}
</main>
${siteFooter(t)}`;
  return pageShell({
    t,
    locale,
    seo,
    path,
    alternates,
    title: t('calendar.metaTitle'),
    description: t('calendar.metaDescription'),
    jsPath: 'scripts/calendrier.js',
    body,
  });
}
