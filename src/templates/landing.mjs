// Landing : écran de sélection de personnage du mode versus
import { esc, pageShell, siteFooter } from './helpers.mjs';

export function renderLanding({ characters, tierBySlug }) {
  const cells = characters.map((c, i) => {
    const tier = tierBySlug[c.slug];
    return `<li class="char-cell">
<a href="characters/${c.slug}.html" data-name="${esc(c.name)}" data-origin="${esc(c.origin)}" ${i === 0 ? 'data-first="1"' : ''}>
<img src="assets/icons/${c.slug}.png" alt="${esc(c.name)}" width="80" height="80" loading="lazy">
${tier ? `<span class="tier-badge" aria-hidden="true">${esc(tier)}</span>` : ''}
</a>
</li>`;
  }).join('\n');

  const body = `<main class="select-screen">
<header class="select-header">
<h1>Dissidia 012 <span class="gold">[duodecim]</span> Final Fantasy</h1>
<p class="sub">Guides compétitifs — choisissez votre personnage</p>
</header>
<div class="nameplate" aria-live="polite">
<span class="np-name" id="np-name">Sélection du personnage</span>
<span class="np-origin" id="np-origin">31 combattants</span>
</div>
<ul class="char-grid" id="char-grid" aria-label="Grille de sélection des personnages">
${cells}
</ul>
<p class="select-extras">
<a href="characters/aerith.html">Fiche assist : Aerith</a> ·
<a href="techniques.html">Techniques universelles &amp; glitches</a> ·
<a href="https://replaytheater.app/?game=d012" rel="external noopener">Vidéos de matchs (Replay Theater)</a>
</p>
<p class="select-extras" style="padding-top:0">Badge de coin : rang dans la tier list tournoi 2017 de dissidia.wiki. Navigation clavier : flèches + Entrée.</p>
${siteFooter()}
</main>`;

  return pageShell({
    title: 'Dissidia 012 [duodecim] — Guides compétitifs',
    description: 'Guides compétitifs français pour les 31 personnages de Dissidia 012 [duodecim] Final Fantasy (PSP) : frame data, builds, matchups, assists — données dissidia.wiki.',
    cssPath: 'styles/main.css',
    jsPath: 'scripts/site.js',
    body,
  });
}
