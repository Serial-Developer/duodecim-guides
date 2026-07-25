// Page « Créateur de builds » : structure statique (bandeau de personnages,
// onglets, jauge, panneau d'état). Tout le comportement vit dans
// src/scripts/build-creator.js, alimenté par window.BUILD_DATA.
import { esc, paras, banner, infoBanner, pageShell, siteHeader, siteFooter } from './helpers.mjs';

const TABS = [
  { key: 'attack', label: 'Attaques' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'stuff', label: 'Équipement' },
  { key: 'accessories', label: 'Accessoires' },
  { key: 'assist', label: 'Assist & invocation' },
];

function characterBanner(characters, hasPortrait) {
  return `<div class="bc-roster" role="radiogroup" aria-label="Choisir un personnage">
${characters.map((c) => `<button type="button" class="bc-char" role="radio" aria-checked="false" data-slug="${esc(c.slug)}" title="${esc(c.name)}">
${hasPortrait(c.slug) ? `<img src="assets/portraits/${esc(c.slug)}.png" alt="" loading="lazy" width="56" height="56">` : '<span class="bc-char-fallback" aria-hidden="true"></span>'}
<span class="bc-char-name">${esc(c.name)}</span>
</button>`).join('\n')}
</div>`;
}

// Jauge de CP : couleurs du jeu (vert pomme = attaques, bleu ciel = abilities).
// L'équivalent textuel est porté par aria-valuetext, mis à jour par le script.
function cpGauge() {
  return `<div class="bc-gauge-wrap" id="bc-gauge-wrap">
<div class="bc-gauge" id="bc-gauge" role="meter" aria-valuemin="0" aria-valuemax="450" aria-valuenow="0" aria-valuetext="0 sur 450 CP — attaques 0, abilities 0" aria-labelledby="bc-gauge-label">
<span class="bc-gauge-fill bc-gauge-attacks" id="bc-gauge-attacks"></span>
<span class="bc-gauge-fill bc-gauge-abilities" id="bc-gauge-abilities"></span>
</div>
<p class="bc-gauge-text" id="bc-gauge-label"><strong id="bc-gauge-used">0</strong>/<span id="bc-gauge-max">450</span> CP
<span class="bc-legend"><span class="bc-dot bc-dot-attacks"></span>attaques <span id="bc-gauge-a">0</span></span>
<span class="bc-legend"><span class="bc-dot bc-dot-abilities"></span>abilities <span id="bc-gauge-b">0</span></span>
</p>
</div>`;
}

export function renderBuildCreator({ ed, characters, hasPortrait }) {
  if (!ed) {
    return pageShell({
      title: 'Créateur de builds — Dissidia 012 [duodecim]',
      description: 'Composer un build Dissidia 012 [duodecim].',
      cssPath: 'styles/main.css', jsPath: null,
      body: `${siteHeader({ active: 'createur' })}<main class="wrap">${banner()}</main>${siteFooter()}`,
    });
  }

  const body = `${siteHeader({ active: 'createur' })}
<main class="wrap bc-main">
<h1 style="color:var(--gold)">${esc(ed.title)}</h1>
${paras(ed.intro)}

<noscript>${infoBanner('Le créateur de builds a besoin de JavaScript pour fonctionner. Les données de jeu restent consultables sur les fiches de personnages.')}</noscript>

<section class="card bc-step" aria-labelledby="bc-step1">
<h2 id="bc-step1" style="margin-top:0.2rem">1. Choisir un personnage</h2>
${characterBanner(characters, hasPortrait)}
</section>

<section class="card bc-editor" id="bc-editor" hidden aria-labelledby="bc-step2">
<div class="bc-editor-head">
<h2 id="bc-step2" style="margin:0">2. <span id="bc-current-name">Composer le build</span></h2>
<div class="bc-build-meta">
<label class="bc-field"><span>Nom du build</span>
<input type="text" id="bc-build-name" maxlength="60" placeholder="Sans titre" autocomplete="off"></label>
<label class="bc-field bc-field-inline"><input type="checkbox" id="bc-mastered" checked> <span>Coûts maîtrisés</span></label>
</div>
</div>

<div class="bc-sticky">
${cpGauge()}
<div class="bc-status" id="bc-status" role="status" aria-live="polite"></div>
</div>

<div class="bc-tabs">
<div class="bc-tablist" role="tablist" aria-label="Sections du build">
${TABS.map((t, i) => `<button type="button" class="bc-tab" role="tab" id="bc-tab-${t.key}" aria-controls="bc-panel-${t.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-tab="${t.key}">${esc(t.label)}</button>`).join('\n')}
</div>
${TABS.map((t, i) => `<div class="bc-panel" role="tabpanel" id="bc-panel-${t.key}" aria-labelledby="bc-tab-${t.key}" tabindex="0"${i === 0 ? '' : ' hidden'}></div>`).join('\n')}
</div>
</section>

<section class="card bc-step" id="bc-manager" hidden aria-labelledby="bc-step3">
<h2 id="bc-step3" style="margin-top:0.2rem">3. Builds enregistrés</h2>
<div class="bc-actions">
<button type="button" class="bc-btn bc-btn-primary" id="bc-save">Enregistrer le build</button>
<button type="button" class="bc-btn" id="bc-new">Nouveau build</button>
<button type="button" class="bc-btn" id="bc-share">Copier le lien de partage</button>
<button type="button" class="bc-btn" id="bc-export">Exporter (JSON)</button>
<button type="button" class="bc-btn" id="bc-export-all">Tout exporter</button>
<button type="button" class="bc-btn" id="bc-export-csv">Exporter (CSV)</button>
<label class="bc-btn bc-btn-file">Importer…<input type="file" id="bc-import" accept="application/json,.json" hidden></label>
</div>
<div id="bc-saved-list" class="bc-saved-list"></div>
<p class="bc-notes-label"><label for="bc-notes">Notes libres sur ce build</label></p>
<textarea id="bc-notes" rows="3" placeholder="Remarques, matchups visés, variantes…"></textarea>
</section>

<section class="card" aria-labelledby="bc-help">
<h2 id="bc-help" style="margin-top:0.2rem">Repères</h2>
${infoBanner(esc(ed.legalityNote))}
${(ed.help || []).map((h) => `<h3>${esc(h.title)}</h3><ul>${h.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`).join('\n')}
<h3>Limites connues</h3>
<ul class="sources-list">
${Object.values(ed.undocumented || {}).map((u) => `<li>${esc(u)}</li>`).join('\n')}
</ul>
</section>

<p class="sources-list" id="bc-sources"></p>
</main>
${siteFooter()}`;

  return pageShell({
    title: 'Créateur de builds — Dissidia 012 [duodecim]',
    description: 'Composer, sauvegarder, exporter et partager des builds Dissidia 012 [duodecim] : attaques, abilities, équipement, accessoires, assist et invocation, avec jauge de CP et contrôle de légalité tournoi.',
    cssPath: 'styles/main.css',
    jsPath: 'scripts/build-creator.js',
    extraHead: '<script src="scripts/build-data.js" defer></script>',
    body,
  });
}
