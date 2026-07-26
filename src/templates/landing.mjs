// Landing : reproduction de l'écran « Player Select » du mode versus du jeu —
// panneau d'infos à gauche mis à jour au survol, grande illustration à droite,
// grille en rangées (nouveaux venus 012 / héros / antagonistes / rangée bonus).
import { esc, pageShell, siteHeader, siteFooter, linksFor } from './helpers.mjs';
import { ldWebSite } from './jsonld.mjs';

// Rangées inspirées de l'écran de sélection du jeu (roster exact, ordre libre §3)
const ROWS = [
  ['lightning', 'vaan', 'laguna-loire', 'yuna', 'kain-highwind', 'tifa-lockhart'],
  ['warrior-of-light', 'firion', 'onion-knight', 'cecil-harvey', 'bartz-klauser', 'terra-branford', 'cloud-strife', 'squall-leonhart', 'zidane-tribal', 'tidus'],
  ['garland', 'the-emperor', 'cloud-of-darkness', 'golbez', 'exdeath', 'kefka-palazzo', 'sephiroth', 'ultimecia', 'kuja', 'jecht'],
  ['shantotto', 'gabranth', 'prishe', 'gilgamesh', 'feral-chaos'],
];

export function renderLanding({ characters, tierBySlug, taglineBySlug, ogImage, dates, t, locale, path, alternates, availability }) {
  const L = linksFor(path, locale, availability);
  const bySlug = Object.fromEntries(characters.map((c) => [c.slug, c]));
  const first = bySlug[ROWS[0][0]];

  // Un guide qui n'existe pas encore dans cette langue reste atteignable, mais
  // vers sa version publiée : la vignette pointe alors l'autre langue et le
  // déclare (`hreflang`), plutôt que de mener à une page absente.
  const linkFor = (slug) => ({ href: L.guide(slug), lang: L.guideLang(slug) });

  const rows = ROWS.map((row) => `<li class="char-row">
${row.map((slug) => {
    const c = bySlug[slug];
    if (!c) return '';
    const tier = tierBySlug[slug];
    const link = linkFor(slug);
    return `<span class="char-cell"><a href="${link.href}"${link.lang ? ` hreflang="${link.lang}" lang="${link.lang}"` : ''}
 data-name="${esc(c.name)}" data-origin="${esc(c.origin)}"
 data-tier="${esc(tier || '')}" data-tagline="${esc(taglineBySlug[slug] || '')}"
 data-portrait="${L.asset(`assets/portraits/${slug}.png`)}">
<img src="${L.asset(`assets/portraits/${slug}.png`)}" alt="${esc(c.name)}" width="80" height="80" loading="lazy">
</a>
${tier ? `<span class="tier-badge" aria-hidden="true">${esc(tier)}</span>` : ''}
</span>`;
  }).join('\n')}
</li>`).join('\n');

  const body = `${siteHeader(t, { path, locale, alternates, availability, active: 'index', h1: true })}
<main class="select-screen">
<div class="vs-body">
<div class="vs-left">
<div class="vs-info" aria-live="polite">
<p class="vs-origin vs-anim" id="np-origin">${esc(first.origin)}</p>
<h2 class="vs-name vs-anim" id="np-name">${esc(first.name)}</h2>
<p class="vs-sub vs-anim" id="np-sub">${tierBySlug[first.slug] ? `<span class="badge prio-melee-high">${esc(t('landing.tierBadge', { tier: tierBySlug[first.slug] }))}</span>` : ''}${esc(taglineBySlug[first.slug] || '')}</p>
</div>
<ul class="char-grid" id="char-grid" aria-label="${esc(t('landing.gridAria'))}">
${rows}
</ul>
<p class="select-extras">${t('landing.rankNote')} <a href="https://dissidia.wiki/Tier_List_(Dissidia_012)" target="_blank" rel="external noopener">dissidia.wiki</a></p>
</div>
<div class="vs-right">
<div class="plate-row"><span class="vs-plate">${esc(t('landing.plate'))}</span></div>
<div class="vs-portrait" aria-hidden="true">
<img id="np-portrait" src="${L.asset(`assets/portraits/${first.slug}.png`)}" alt="" width="256" height="256">
</div>
</div>
</div>
${siteFooter(t)}
</main>`;

  const title = t('landing.metaTitle');
  const description = t('landing.metaDescription');
  return pageShell({
    t,
    locale,
    title,
    description,
    path,
    alternates,
    jsPath: 'scripts/site.js',
    body,
    og: ogImage ? { image: ogImage, alt: t('landing.ogAlt'), width: 1200, height: 630, type: 'website' } : { type: 'website' },
    jsonLd: ldWebSite({ description, locale, name: t('site.name'), path, ...dates }),
  });
}
