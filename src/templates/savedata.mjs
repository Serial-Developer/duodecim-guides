// Page transverse : savedata prêtes pour les tournois (communauté Discord DISSIDIA)
import { esc, paras, infoBanner, sectionSources, sourcesSection, pageShell, siteHeader, siteFooter } from './helpers.mjs';

export function renderSavedata(data) {
  const saves = (data.saves || []).map((s) => `<article class="card">
<h3 style="margin-top:0">${esc(s.name)}</h3>
<p><span class="badge prio-melee-high">${esc(s.pour)}</span></p>
<p>${esc(s.desc)}</p>
<p class="video-link"><a href="${esc(s.url)}" target="_blank" rel="external noopener">Télécharger (Google Drive)</a></p>
</article>`).join('\n');

  const inst = data.installation;
  const body = `${siteHeader({ active: 'savedata' })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>
${infoBanner(esc(data.avertissement))}

<h2 id="saves">Les sauvegardes disponibles</h2>
${saves}

<h2 id="installation">Installer une savedata</h2>
${inst?.intro ? `<p>${esc(inst.intro)}</p>` : ''}
${inst?.etapes?.length ? `<ol class="steps">${inst.etapes.map((e) => `<li>${esc(e)}</li>`).join('')}</ol>` : ''}
${inst?.note ? `<p class="mv-desc">${esc(inst.note)} <a href="install.html">Installer sur PPSSPP →</a></p>` : ''}

<h2 id="builds">Comprendre les builds</h2>
<p>${esc(data.comprendre?.texte || '')}</p>
${sectionSources(data.comprendre?.source ? [data.comprendre.source] : [])}

<h2 id="sources">Sources</h2>
${sourcesSection(data.sources, data.limits)}
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Savedata prêtes pour les tournois — Dissidia 012 [duodecim]',
    description: 'Sauvegardes Dissidia 012 (ULUS10566) prêtes pour le jeu en ligne et les tournois : starter pack, builds 2017 Tournament Rules, Modern Alternate Rules et Japan Ranked.',
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
