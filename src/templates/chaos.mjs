// Fiche de Chaos — boss non jouable : guide stratégique du combat final
// (trois manches sur Edge of Madness), attaques et plan de bataille.
import { esc, paras, priorityBadge, sectionSources, pageShell, siteHeader, siteFooter } from './helpers.mjs';

function attackCard(a) {
  return `<details class="move">
<summary><span class="mv-name">${esc(a.name)}</span>
<span class="mv-meta">${esc(a.ou || '')}</span>${priorityBadge(a.prio)}</summary>
<div class="mv-body">
${a.effet ? `<p class="mv-desc">Effet : ${esc(a.effet)}</p>` : ''}
<div class="mv-note"><p>${esc(a.desc)}</p></div>
</div>
</details>`;
}

export function renderChaos({ char, ed, hasPortrait }) {
  const g = ed?.bossGuide;
  const body = `${siteHeader({ base: '../', active: 'chaos' })}
<main class="wrap" style="padding-bottom:3rem">
<section class="hero">
${hasPortrait ? `<img class="portrait" src="../assets/portraits/${char.slug}.png" alt="Portrait de Chaos dans Dissidia 012 [duodecim]">` : ''}
<div class="hero-id">
<p class="origin">${esc(char.origin)}</p>
<h1>${esc(char.name)}</h1>
${ed?.tagline ? `<p class="tagline">${esc(ed.tagline)}</p>` : ''}
</div>
</section>
${ed?.overview?.length ? paras(ed.overview) : ''}
<div class="banner info">Chaos est le boss final des modes solo, non sélectionnable en versus. Sa forme jouable, <a href="feral-chaos.html">Feral Chaos</a>, a son guide compétitif. Page wiki : <a href="${esc(char.url)}" target="_blank" rel="external noopener">${esc(char.url)}</a>.</div>
${g ? `
<h2 id="combat">Le combat</h2>
${paras(g.intro)}

<h2 id="attaques">Ses attaques</h2>
<h3>Braveries</h3>
${(g.attaques?.bravery || []).map(attackCard).join('\n')}
<h3>Attaques HP</h3>
${(g.attaques?.hp || []).map(attackCard).join('\n')}
<h3>Attaques spéciales</h3>
${(g.attaques?.special || []).map(attackCard).join('\n')}

<h2 id="strategie">Stratégie</h2>
${paras(g.strategie)}
${g.limits?.length ? g.limits.map((l) => `<p class="mv-desc">${esc(l)}</p>`).join('\n') : ''}
${sectionSources(g.sources)}` : ''}
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Chaos — Guide du boss final | Dissidia 012 [duodecim]',
    description: 'Battre Chaos dans Dissidia 012 [duodecim] Final Fantasy : ses attaques manche par manche, ses ouvertures, et la stratégie du combat final en trois manches.',
    cssPath: '../styles/main.css',
    jsPath: null,
    body,
  });
}
