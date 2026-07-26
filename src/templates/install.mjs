// Page transverse : installer le jeu sur PPSSPP (PC et mobile)
import { esc, paras, banner, infoBanner, sectionSources, sourcesSection, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';

function actionItem(a) {
  if (!a?.do) return '';
  const link = a.link?.url
    ? ` <a href="${esc(a.link.url)}" target="_blank" rel="external noopener">${esc(a.link.label || a.link.url)}</a>`
    : '';
  return `<li><strong>${esc(a.do)}</strong>${a.detail ? ` — ${esc(a.detail)}` : ''}${link}</li>`;
}

function settingsTable(s) {
  if (!s?.rows?.length) return '';
  const [head, ...body] = s.rows;
  // stack-sm : sur mobile, chaque ligne devient une carte (nom du réglage en
  // titre, valeur mise en avant via data-label, explication en dessous).
  return `<div class="table-scroll"><table class="data stack-sm">
${s.caption ? `<caption>${esc(s.caption)}</caption>` : ''}
<tr>${head.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
${body.map((r) => `<tr>${r.map((c, i) => `<td${i > 0 && head[i] ? ` data-label="${esc(head[i])}"` : ''}>${esc(c)}</td>`).join('')}</tr>`).join('\n')}
</table></div>`;
}

function step(t, st, n) {
  if (!st) return '';
  return `<section class="card step" id="${esc(st.id)}">
<h3 class="step-title"><span class="step-num" aria-hidden="true">${n}</span>${esc(st.title)}</h3>
${st.intro?.length ? paras(st.intro) : ''}
${st.actions?.length ? `<ol class="steps">${st.actions.map(actionItem).join('\n')}</ol>` : ''}
${st.warning ? infoBanner(`${t('install.warning')} ${esc(st.warning)}`) : ''}
${settingsTable(st.settings)}
${st.notes?.length ? `<ul class="step-notes">${st.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${sectionSources(t, st.sources)}
</section>`;
}

function platform(t, p) {
  if (!p) return '';
  return `<section id="${esc(p.id)}">
<h2>${esc(p.label)}${p.subtitle ? ` <span class="plat-sub">${esc(p.subtitle)}</span>` : ''}</h2>
${p.intro?.length ? paras(p.intro) : ''}
${(p.steps || []).map((st, i) => step(t, st, i + 1)).join('\n')}
</section>`;
}

export function renderInstall(data, seo, { t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  if (!data) {
    return pageShell({
      t, locale, seo, path, alternates,
      title: t('install.fallbackTitle'),
      description: t('install.fallbackDescription'),
      jsPath: null,
      body: `<main class="wrap">${banner(t)}</main>${siteFooter(t)}`,
    });
  }

  const tocGroups = (data.platforms || []).map((p) =>
    `<li><a href="#${esc(p.id)}">${esc(p.label)}</a><ol class="toc-sub">${
      (p.steps || []).map((st) => `<li><a href="#${esc(st.id)}">${esc(st.title)}</a></li>`).join('')
    }</ol></li>`).join('');

  const chips = (data.platforms || []).map((p) => `<a href="#${esc(p.id)}">${esc(p.label)}</a>`).join('');

  const hero = `<header class="install-hero">
<p class="origin">PPSSPP ${esc(data.emulatorVersion || '')}</p>
<h1>${esc(data.title)}</h1>
${data.lede ? `<p class="tagline">${esc(data.lede)}</p>` : ''}
</header>`;

  const prereq = `<section id="prerequis"><h2>${t('install.prerequisites')}</h2>
${infoBanner(t('install.prerequisitesBanner'))}
${paras(data.prerequisites?.summary)}
${sectionSources(t, data.prerequisites?.sources)}
</section>`;

  const checklist = data.checklist ? `<section id="checklist"><h2>${esc(data.checklist.title)}</h2>
${data.checklist.intro ? `<p class="mv-desc">${esc(data.checklist.intro)}</p>` : ''}
<div class="card"><ul class="checklist">${(data.checklist.items || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
${sectionSources(t, data.checklist.sources)}
</section>` : '';

  const sources = `<section id="sources"><h2>${t('common.sources')}</h2>
${sourcesSection(t, data.sources, data.limits)}
</section>`;

  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'install' })}
<nav class="guide-top" aria-label="${esc(t('common.pageSections'))}"><div class="chips-nav">
<a href="${L.page('home')}">${t('common.backToSelect')}</a>
<a href="#prerequis">${t('install.prerequisites')}</a>
${chips}
<a href="#checklist">${t('install.checklist')}</a>
</div></nav>
<div class="guide-layout">
<nav class="guide-toc" aria-label="${esc(t('common.tocAria'))}"><ol>
<li><a href="${L.page('home')}" class="backlink">${t('common.backToSelect')}</a></li>
<li><a href="#prerequis">${t('install.prerequisites')}</a></li>
${tocGroups}
<li><a href="#checklist">${t('install.checklistToc')}</a></li>
<li><a href="#sources">${t('common.sources')}</a></li>
</ol></nav>
<main class="guide-main">
${hero}
${prereq}
${(data.platforms || []).map((p) => platform(t, p)).join('\n')}
${checklist}
${sources}
</main>
</div>
${siteFooter(t)}`;

  return pageShell({
    t,
    locale,
    seo,
    path,
    alternates,
    title: t('install.metaTitle'),
    description: t('install.metaDescription'),
    jsPath: null,
    body,
  });
}
