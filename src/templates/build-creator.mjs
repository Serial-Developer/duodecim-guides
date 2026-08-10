// Page « Créateur de builds » : structure statique (bandeau de personnages,
// onglets, jauge, panneau d'état). Tout le comportement vit dans
// src/scripts/build-creator.js, alimenté par window.BUILD_DATA et window.BC_I18N.
import { esc, paras, banner, infoBanner, pageShell, siteHeader, siteFooter, linksFor, rosterGrid } from './helpers.mjs';
import { ldWebApplication } from './jsonld.mjs';

const TAB_KEYS = ['attack', 'abilities', 'stuff', 'accessories', 'assist'];

// Le choix du personnage reprend la grille de la page d'accueil — l'écran
// « Player Select » du jeu. Les cases sont ici des boutons plutôt que des liens :
// on choisit qui l'on équipe, on ne quitte pas la page. Le nom n'est plus écrit
// sous la vignette, comme à l'accueil ; il reste porté par le bouton, donc lu à
// la souris comme au lecteur d'écran, et la carte l'affiche en grand dès qu'un
// personnage est choisi.
function characterBanner(t, characters, hasPortrait, L, tierBySlug) {
  return rosterGrid({
    bySlug: Object.fromEntries(characters.map((c) => [c.slug, c])),
    tierBySlug,
    role: 'radiogroup',
    ariaLabel: t('buildCreator.rosterAria'),
    cell: (slug, c) => `<button type="button" class="bc-char" role="radio" aria-checked="false" data-slug="${esc(slug)}" title="${esc(c.name)}" aria-label="${esc(c.name)}">
${hasPortrait(slug) ? `<img src="${L.asset(`assets/portraits/${esc(slug)}.png`)}" alt="" loading="lazy" width="80" height="80">` : '<span class="bc-char-fallback" aria-hidden="true"></span>'}
</button>`,
  });
}

// Case « Coûts maîtrisés » : elle commande ce que la jauge compte, et n'a donc
// qu'un seul endroit juste — sous ses chiffres. Sous les onglets elle reste
// dans l'en-tête, à côté du nom du build : la jauge y est couchée dans une
// barre collante, une case sous elle couperait la page en deux.
// Elle ne doit exister qu'une fois : `#bc-mastered` est lu par son identifiant.
function masteredToggle(t) {
  return `<label class="bc-field bc-field-inline"><input type="checkbox" id="bc-mastered" checked> <span>${esc(t('buildCreator.masteredCosts'))}</span></label>`;
}

// Jauge de CP : couleurs du jeu (vert pomme = attaques, bleu ciel = abilities).
// L'équivalent textuel est porté par aria-valuetext, mis à jour par le script.
function cpGauge(t, { mastered = false } = {}) {
  return `<div class="bc-gauge-wrap" id="bc-gauge-wrap">
<div class="bc-gauge" id="bc-gauge" role="meter" aria-valuemin="0" aria-valuemax="450" aria-valuenow="0" aria-valuetext="${esc(t('buildCreator.gaugeValueText'))}" aria-labelledby="bc-gauge-label">
<span class="bc-gauge-fill bc-gauge-attacks" id="bc-gauge-attacks"></span>
<span class="bc-gauge-fill bc-gauge-abilities" id="bc-gauge-abilities"></span>
</div>
<p class="bc-gauge-text" id="bc-gauge-label"><strong id="bc-gauge-used">0</strong>/<span id="bc-gauge-max">450</span> CP
<span class="bc-legend"><span class="bc-dot bc-dot-attacks"></span>${esc(t('buildCreator.gaugeAttacks'))} <span id="bc-gauge-a">0</span></span>
<span class="bc-legend"><span class="bc-dot bc-dot-abilities"></span>${esc(t('buildCreator.gaugeAbilities'))} <span id="bc-gauge-b">0</span></span>
</p>
${mastered ? masteredToggle(t) : ''}
</div>`;
}

// Modificateurs détaillés (dégâts, défense, BRV, EX, assist), repliés par
// défaut : la ligne de totaux reste la lecture rapide, le dépliant porte le
// détail. Le <details> est écrit ici plutôt que par le script, qui vide le
// panneau d'état à chaque rendu — l'élément persiste, donc son état ouvert ou
// fermé survit à chaque modification du build.
function detailStats(t) {
  return `<details class="bc-detail" id="bc-detail">
<summary><span>${esc(t('buildCreator.detailSummary'))}</span> <span class="bc-detail-count" id="bc-detail-count"></span></summary>
<div class="bc-detail-body">
<div class="bc-detail-main" id="bc-detail-main"></div>
<aside class="bc-detail-boosters" id="bc-detail-boosters" aria-label="${esc(t('buildCreator.boostersAria'))}"></aside>
</div>
<p class="bc-detail-note">${esc(t('buildCreator.detailNote'))}</p>
</details>`;
}

// `card` bascule la page sur le banc d'essai : la carte de build tient lieu
// d'interface à la place des cinq onglets. Le reste — bandeau de personnages,
// gestionnaire, aide — ne bouge pas ; c'est l'intérêt de ne changer que le
// milieu.
export function renderBuildCreator({ ed, characters, hasPortrait, seo, i18nPayload, t, locale, path, alternates, availability, tierBySlug = {}, card = false }) {
  const L = linksFor(path, locale, availability);
  if (!ed) {
    return pageShell({
      t, locale, seo, path, alternates,
      title: t('buildCreator.fallbackTitle'),
      description: t('buildCreator.fallbackDescription'),
      jsPath: null,
      body: `${siteHeader(t, { path, locale, alternates, availability, active: 'createur' })}<main class="wrap">${banner(t)}</main>${siteFooter(t)}`,
    });
  }

  const tabs = TAB_KEYS.map((key) => ({ key, label: t(`buildCreator.tabs.${key}`) }));

  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'createur' })}
<main class="wrap bc-main">
<h1 style="color:var(--gold)">${esc(ed.title)}</h1>
${card ? '' : paras(ed.intro)}

<noscript>${infoBanner(t('buildCreator.noscript'))}</noscript>

<section class="card bc-step" aria-labelledby="bc-step1">
<h2 id="bc-step1" style="margin-top:0.2rem">${esc(t('buildCreator.step1'))}</h2>
${characterBanner(t, characters, hasPortrait, L, tierBySlug)}
</section>

<section class="card bc-editor" id="bc-editor" hidden aria-labelledby="bc-step2" data-asset-base="${L.asset("assets/")}">
<div class="bc-editor-head">
<h2 id="bc-step2" style="margin:0">2. <span id="bc-current-name">${esc(t('buildCreator.step2Default'))}</span></h2>
<div class="bc-build-meta">
<label class="bc-field"><span>${esc(t('buildCreator.buildName'))}</span>
<input type="text" id="bc-build-name" maxlength="60" placeholder="${esc(t('buildCreator.buildNamePlaceholder'))}" autocomplete="off"></label>
${card ? '' : masteredToggle(t)}
</div>
</div>

${card ? '' : `<div class="bc-sticky">
${cpGauge(t)}
<div class="bc-status" id="bc-status" role="status" aria-live="polite"></div>
${detailStats(t)}
</div>`}

${card ? `<div class="bc-two"><div class="bc-card-host" id="bc-card" data-base="${L.asset('')}"></div>
<aside class="bc-side-stats">
<section class="bcard-block"><h3 class="bcard-h">${esc(t('buildCard.panelStats'))}</h3>
<div class="bc-status" id="bc-status" role="status" aria-live="polite"></div>
<div class="bc-side-detail" id="bc-detail-main"></div></section>
<section class="bcard-block"><h3 class="bcard-h">${esc(t('buildCard.panelBoosters'))}</h3><div id="bc-detail-boosters"></div></section>
</aside>${cpGauge(t, { mastered: true })}</div>` : `<div class="bc-tabs">
<div class="bc-tablist" role="tablist" aria-label="${esc(t('buildCreator.tablistAria'))}">
${tabs.map((tb, i) => `<button type="button" class="bc-tab" role="tab" id="bc-tab-${tb.key}" aria-controls="bc-panel-${tb.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-tab="${tb.key}">${esc(tb.label)}</button>`).join('\n')}
</div>
${tabs.map((tb, i) => `<div class="bc-panel" role="tabpanel" id="bc-panel-${tb.key}" aria-labelledby="bc-tab-${tb.key}" tabindex="0"${i === 0 ? '' : ' hidden'}></div>`).join('\n')}
</div>`}

<div class="bc-notes">
<p class="bc-notes-label"><label for="bc-notes">${esc(t('buildCreator.notesLabel'))}</label></p>
<textarea id="bc-notes" rows="3" placeholder="${esc(t('buildCreator.notesPlaceholder'))}"></textarea>
</div>
${card ? '' : '</section>'}

<section class="card bc-step" id="bc-manager" hidden aria-labelledby="bc-step3">
<h2 id="bc-step3" style="margin-top:0.2rem">${esc(t('buildCreator.step3'))}</h2>
<div class="bc-actions">
<button type="button" class="bc-btn bc-btn-primary" id="bc-save">${esc(t('buildCreator.save'))}</button>
<button type="button" class="bc-btn" id="bc-new">${esc(t('buildCreator.new'))}</button>
<button type="button" class="bc-btn" id="bc-share">${esc(t('buildCreator.share'))}</button>
${card ? `<button type="button" class="bc-btn" id="bc-export-img">${esc(t('buildCreator.exportImage'))}</button>` : ''}
<button type="button" class="bc-btn" id="bc-export-all">${esc(t('buildCreator.exportAll'))}</button>
<label class="bc-btn bc-btn-file">${esc(t('buildCreator.import'))}<input type="file" id="bc-import" accept="application/json,.json" hidden></label>
</div>
<div id="bc-saved-list" class="bc-saved-list"></div>
</section>
${card ? '</section>' : ''}

<section class="card" aria-labelledby="bc-help">
<h2 id="bc-help" style="margin-top:0.2rem">${esc(t('buildCreator.help'))}</h2>
${infoBanner(esc(ed.legalityNote))}
${(ed.help || []).map((h) => `<h3>${esc(h.title)}</h3><ul>${h.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`).join('\n')}
<h3>${esc(t('buildCreator.knownLimits'))}</h3>
<ul class="sources-list">
${Object.values(ed.undocumented || {}).map((u) => `<li>${esc(u)}</li>`).join('\n')}
</ul>
</section>

${card ? `<section class="card">${paras(ed.intro)}</section>` : ''}
<p class="sources-list" id="bc-sources"></p>
</main>
${siteFooter(t)}`;

  const title = t('buildCreator.metaTitle');
  const description = t('buildCreator.metaDescription');
  return pageShell({
    t,
    locale,
    seo,
    path,
    alternates,
    title,
    description,
    jsPath: 'scripts/build-creator.js',
    // Les libellés de l'outil sont injectés avant son script : celui-ci les lit
    // à l'initialisation et ne contient donc aucun texte en dur.
    // Le banc d'essai est hors périmètre : ni indexé, ni au sitemap, tant que
    // l'interface n'est pas validée.
    robots: card ? 'noindex, nofollow' : null,
    extraHead: `<script>window.BC_I18N=${JSON.stringify(i18nPayload).replace(/</g, '\\u003c')};</script>
<script src="${L.asset('scripts/build-data.js')}" defer></script>${card ? `
<script src="${L.asset('scripts/build-card-view.js')}" defer></script>` : ''}`,
    body,
    // Ce n'est pas un article mais un outil : le type WebApplication décrit ce
    // que la page fait, et signale qu'elle est gratuite et sans compte.
    jsonLd: ldWebApplication({
      name: t('buildCreator.appName'),
      description,
      path,
      locale,
      browserRequirements: t('jsonld.browserRequirements'),
      image: seo?.ogImage,
      imageAlt: seo?.ogAlt,
      ...(seo?.dates || {}),
    }),
  });
}
