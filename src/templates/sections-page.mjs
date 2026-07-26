// Rendu générique des pages transverses à sections (Participer, Organiser…) :
// sections {id, name, short?, intro[], points[], cta[]} + sources/limites.
import { esc, paras, sourcesSection, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';

// Un appel à l'action désigne soit une URL externe (`url`), soit une page du
// site par sa clé de route (`route`, plus `anchor` au besoin). La clé est
// préférable : elle suit le routage par langue et survit au renommage d'un
// chemin, là où une URL en dur pointerait toujours la version française.
function ctaLink(l, L) {
  if (l.route) {
    const href = `${L.page(l.route)}${l.anchor ? `#${l.anchor}` : ''}`;
    return `<p class="video-link"><a href="${esc(href)}"${L.pageLangAttr(l.route)}>${esc(l.label)}</a></p>`;
  }
  const ext = l.ext ? ' target="_blank" rel="external noopener"' : '';
  return `<p class="video-link"><a href="${esc(l.url)}"${ext}>${esc(l.label)}</a></p>`;
}

function sectionBlock(s, L) {
  return `<h2 id="${esc(s.id)}">${esc(s.name)}</h2>
<article class="card">
${paras(s.intro)}
${s.points?.length ? `<ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
${(s.cta || []).map((c) => ctaLink(c, L)).join('\n')}
</article>`;
}

export function renderSectionsPage({ data, active, pageTitle, description, seo, t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  const body = `${siteHeader(t, { path, locale, alternates, availability, active })}
<nav class="guide-top" aria-label="${esc(t('common.pageSections'))}"><div class="chips-nav">
<a href="${L.page('home')}">${t('common.backToSelect')}</a>
${data.sections.map((s) => `<a href="#${esc(s.id)}">${esc(s.short || s.name)}</a>`).join('\n')}
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>

${data.sections.map((x) => sectionBlock(x, L)).join('\n\n')}

<h2 id="sources">${t('common.sources')}</h2>
${sourcesSection(t, data.sources, data.limits)}
</main>
${siteFooter(t)}`;
  return pageShell({
    t,
    locale,
    seo,
    title: pageTitle,
    description,
    path,
    alternates,
    jsPath: null,
    body,
  });
}
