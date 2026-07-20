// Landing : reproduction de l'écran « Player Select » du mode versus du jeu —
// panneau d'infos à gauche mis à jour au survol, grande illustration à droite,
// grille en rangées (nouveaux venus 012 / héros / antagonistes / rangée bonus).
import { esc, pageShell, siteFooter } from './helpers.mjs';

// Rangées inspirées de l'écran de sélection du jeu (roster exact, ordre libre §3)
const ROWS = [
  ['lightning', 'vaan', 'laguna-loire', 'yuna', 'kain-highwind', 'tifa-lockhart'],
  ['warrior-of-light', 'firion', 'onion-knight', 'cecil-harvey', 'bartz-klauser', 'terra-branford', 'cloud-strife', 'squall-leonhart', 'zidane-tribal', 'tidus'],
  ['garland', 'the-emperor', 'cloud-of-darkness', 'golbez', 'exdeath', 'kefka-palazzo', 'sephiroth', 'ultimecia', 'kuja', 'jecht'],
  ['shantotto', 'gabranth', 'prishe', 'gilgamesh', 'feral-chaos'],
];

export function renderLanding({ characters, tierBySlug, taglineBySlug }) {
  const bySlug = Object.fromEntries(characters.map((c) => [c.slug, c]));
  const first = bySlug[ROWS[0][0]];

  const rows = ROWS.map((row) => `<li class="char-row">
${row.map((slug) => {
    const c = bySlug[slug];
    if (!c) return '';
    const tier = tierBySlug[slug];
    return `<span class="char-cell"><a href="characters/${slug}.html"
 data-name="${esc(c.name)}" data-origin="${esc(c.origin)}"
 data-tier="${esc(tier || '')}" data-tagline="${esc(taglineBySlug[slug] || '')}"
 data-portrait="assets/portraits/${slug}.png">
<img src="assets/portraits/${slug}.png" alt="${esc(c.name)}" width="80" height="80" loading="lazy">
${tier ? `<span class="tier-badge" aria-hidden="true">${esc(tier)}</span>` : ''}
</a></span>`;
  }).join('\n')}
</li>`).join('\n');

  const body = `<main class="select-screen">
<header class="vs-header">
<span class="vs-plate">Sélection du personnage</span>
<h1>Dissidia 012 <span class="gold">[duodecim]</span> Final Fantasy — guides compétitifs</h1>
</header>
<div class="vs-body">
<div class="vs-left">
<div class="vs-info" aria-live="polite">
<p class="vs-origin vs-anim" id="np-origin">${esc(first.origin)}</p>
<h2 class="vs-name vs-anim" id="np-name">${esc(first.name)}</h2>
<p class="vs-sub vs-anim" id="np-sub">${tierBySlug[first.slug] ? `<span class="badge prio-melee-high">Tier ${esc(tierBySlug[first.slug])}</span>` : ''}${esc(taglineBySlug[first.slug] || '')}</p>
</div>
<ul class="char-grid" id="char-grid" aria-label="Grille de sélection des personnages">
${rows}
</ul>
<p class="select-extras">
<a href="characters/aerith.html">Fiche assist : Aerith</a> ·
<a href="characters/chaos.html">Fiche boss : Chaos</a> ·
<a href="techniques.html">Techniques universelles &amp; glitches</a> ·
<a href="https://replaytheater.app/?game=d012" rel="external noopener">Vidéos de matchs</a>
</p>
<p class="select-extras" style="padding-top:0">Badge de coin : tier tournoi 2017 (dissidia.wiki). Navigation clavier : flèches + Entrée.</p>
</div>
<div class="vs-portrait" aria-hidden="true">
<img id="np-portrait" src="assets/portraits/${first.slug}.png" alt="">
</div>
</div>
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
