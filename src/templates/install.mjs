// Page transverse : installer le jeu sur PPSSPP (PC et mobile)
import { esc, paras, banner, infoBanner, sectionSources, sourcesSection, pageShell, siteHeader, siteFooter } from './helpers.mjs';

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

function step(st, n) {
  if (!st) return '';
  return `<section class="card step" id="${esc(st.id)}">
<h3 class="step-title"><span class="step-num" aria-hidden="true">${n}</span>${esc(st.title)}</h3>
${st.intro?.length ? paras(st.intro) : ''}
${st.actions?.length ? `<ol class="steps">${st.actions.map(actionItem).join('\n')}</ol>` : ''}
${st.warning ? infoBanner(`<strong>À retenir :</strong> ${esc(st.warning)}`) : ''}
${settingsTable(st.settings)}
${st.notes?.length ? `<ul class="step-notes">${st.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${sectionSources(st.sources)}
</section>`;
}

function platform(p) {
  if (!p) return '';
  return `<section id="${esc(p.id)}">
<h2>${esc(p.label)}${p.subtitle ? ` <span class="plat-sub">${esc(p.subtitle)}</span>` : ''}</h2>
${p.intro?.length ? paras(p.intro) : ''}
${(p.steps || []).map((st, i) => step(st, i + 1)).join('\n')}
</section>`;
}

export function renderInstall(data) {
  if (!data) {
    return pageShell({
      title: 'Installer Dissidia 012 sur PPSSPP',
      description: 'Installer Dissidia 012 [duodecim] sur PPSSPP.',
      cssPath: 'styles/main.css', jsPath: null,
      body: `<main class="wrap">${banner()}</main>${siteFooter()}`,
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

  const prereq = `<section id="prerequis"><h2>Prérequis</h2>
${infoBanner('<strong>Point de départ :</strong> vous possédez déjà le jeu et son fichier ISO, obtenu légalement depuis votre propre exemplaire. Cette page ne traite pas de l’obtention du fichier et ne renvoie vers aucune source de téléchargement.')}
${paras(data.prerequisites?.summary)}
${sectionSources(data.prerequisites?.sources)}
</section>`;

  const checklist = data.checklist ? `<section id="checklist"><h2>${esc(data.checklist.title)}</h2>
${data.checklist.intro ? `<p class="mv-desc">${esc(data.checklist.intro)}</p>` : ''}
<div class="card"><ul class="checklist">${(data.checklist.items || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
${sectionSources(data.checklist.sources)}
</section>` : '';

  const sources = `<section id="sources"><h2>Sources</h2>
${sourcesSection(data.sources, data.limits)}
</section>`;

  const body = `${siteHeader({ active: 'install' })}
<nav class="guide-top" aria-label="Sections de la page"><div class="chips-nav">
<a href="index.html">← Sélection</a>
<a href="#prerequis">Prérequis</a>
${chips}
<a href="#checklist">Checklist</a>
</div></nav>
<div class="guide-layout">
<nav class="guide-toc" aria-label="Sommaire"><ol>
<li><a href="index.html" class="backlink">← Sélection</a></li>
<li><a href="#prerequis">Prérequis</a></li>
${tocGroups}
<li><a href="#checklist">Checklist en ligne</a></li>
<li><a href="#sources">Sources</a></li>
</ol></nav>
<main class="guide-main">
${hero}
${prereq}
${(data.platforms || []).map(platform).join('\n')}
${checklist}
${sources}
</main>
</div>
${siteFooter()}`;

  return pageShell({
    title: 'Installer Dissidia 012 sur PPSSPP — PC et mobile',
    description: 'Installer et configurer PPSSPP pour Dissidia 012 [duodecim] Final Fantasy sur PC et sur mobile : émulateur, mise en place du jeu, réglages, jeu en local et en ligne.',
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
