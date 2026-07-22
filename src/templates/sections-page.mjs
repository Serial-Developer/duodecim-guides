// Rendu générique des pages transverses à sections (Participer, Organiser…) :
// sections {id, name, short?, intro[], points[], cta[]} + sources/limites.
import { esc, paras, sourcesSection, pageShell, siteHeader, siteFooter } from './helpers.mjs';

function ctaLink(l) {
  const ext = l.ext ? ' target="_blank" rel="external noopener"' : '';
  return `<p class="video-link"><a href="${esc(l.url)}"${ext}>${esc(l.label)}</a></p>`;
}

function sectionBlock(s) {
  return `<h2 id="${esc(s.id)}">${esc(s.name)}</h2>
<article class="card">
${paras(s.intro)}
${s.points?.length ? `<ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
${(s.cta || []).map(ctaLink).join('\n')}
</article>`;
}

export function renderSectionsPage({ data, active, pageTitle, description }) {
  const body = `${siteHeader({ active })}
<nav class="guide-top" aria-label="Sections de la page"><div class="chips-nav">
<a href="index.html">← Sélection</a>
${data.sections.map((s) => `<a href="#${esc(s.id)}">${esc(s.short || s.name)}</a>`).join('\n')}
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>

${data.sections.map(sectionBlock).join('\n\n')}

<h2 id="sources">Sources</h2>
${sourcesSection(data.sources, data.limits)}
</main>
${siteFooter()}`;
  return pageShell({
    title: pageTitle,
    description,
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
