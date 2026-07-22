// Page transverse : obtenir Feral Chaos (chemin de déblocage + méthodes pour
// battre le boss final du scénario 000)
import { esc, paras, sourcesSection, pageShell, siteHeader, siteFooter } from './helpers.mjs';

function methodeBlock(m) {
  return `<article class="card" id="${esc(m.id)}">
<h3 style="margin-top:0">${esc(m.name)}</h3>
${paras(m.intro)}
${m.points?.length ? `<ul>${m.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
</article>`;
}

export function renderFeralUnlock(data) {
  const body = `${siteHeader({ active: 'feral' })}
<nav class="guide-top" aria-label="Sections de la page"><div class="chips-nav">
<a href="index.html">← Sélection</a>
<a href="#chemin">Le chemin</a>
<a href="#methodes">Battre Feral Chaos</a>
<a href="#apres">Après le déblocage</a>
</div></nav>
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(data.title)}</h1>
<p class="mv-desc">${esc(data.lede)}</p>

<h2 id="chemin">Le chemin du déblocage</h2>
${paras(data.chemin.intro)}
<ol class="steps">${data.chemin.etapes.map((e) => `<li>${esc(e)}</li>`).join('')}</ol>
<article class="card">
<h3 style="margin-top:0">Le combat qui verrouille tout</h3>
<p>${esc(data.chemin.boss)}</p>
</article>
<div class="banner info">${esc(data.chemin.piege)}</div>

<h2 id="methodes">Trois méthodes pour le battre</h2>
${data.methodes.map(methodeBlock).join('\n')}

<h2 id="apres">Après le déblocage</h2>
${paras(data.apres.intro)}
<p class="video-link"><a href="characters/feral-chaos.html">La fiche complète de Feral Chaos jouable</a></p>

<h2 id="sources">Sources</h2>
${sourcesSection(data.sources, data.limits)}
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Obtenir Feral Chaos — Dissidia 012 [duodecim]',
    description: 'Débloquer Feral Chaos dans Dissidia 012 [duodecim] : le chemin par Confessions of the Creator, et trois méthodes éprouvées pour battre le boss final niveau 130 (build Iai Strike, attaques que l\'IA n\'esquive pas, méthode complète).',
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
