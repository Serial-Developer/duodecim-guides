// Helpers partagés des templates
//
// Les helpers qui produisent du texte visible reçoivent `t` en premier argument
// (la fonction de traduction de la locale en cours de rendu). C'est explicite et
// sans état global : le build rend une locale entière, puis la suivante, et rien
// ne peut fuiter de l'une à l'autre.
import {
  SITE_URL, SITE_NAME, AUTHOR, AUTHOR_URL, GAME,
  SITE_VERIFICATION, absUrl,
} from '../site-config.mjs';
import { LOCALE_META, DEFAULT_LOCALE, upTo } from '../i18n/config.mjs';
import { ROUTES, pathFor, guidePathFor } from '../i18n/routes.mjs';
import { ldArticle } from './jsonld.mjs';

export { SITE_URL, SITE_NAME, AUTHOR, AUTHOR_URL, GAME, absUrl };

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function banner(t, extra = '') {
  return `<div class="banner" data-undocumented="1"><strong>${t('common.undocumented')}</strong>${extra ? ' ' + extra : ''}</div>`;
}

export function infoBanner(html) {
  return `<div class="banner info">${html}</div>`;
}

export const paras = (arr) => (arr || []).map((p) => `<p>${esc(p)}</p>`).join('\n');

// Ancre stable depuis un nom ("Day to Die" -> "t-day-to-die") — partagée entre
// les cartes de tournois.html et les liens du calendrier.
export const slugAnchor = (name) => 't-' + String(name)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function priorityBadge(prio) {
  if (!prio) return '';
  const p = String(prio);
  const cls = /ranged/i.test(p) ? 'prio-ranged'
    : /high/i.test(p) ? 'prio-melee-high'
    : /mid/i.test(p) ? 'prio-melee-mid'
    : 'prio-melee-low';
  return `<span class="badge ${cls}">${esc(p)}</span>`;
}

// "11F", "32F (charge), 2F (release)" -> 11 / 32 ; null si absent
export function startupFrames(s) {
  const m = String(s ?? '').match(/(\d+)\s*F/i);
  return m ? parseInt(m[1], 10) : null;
}

// "73 (Normal, Fast), 69 (EX Mode, Very Fast)" -> {normal: 73, ex: 69}
export function speedValues(s) {
  const str = String(s ?? '');
  const normal = str.match(/([\d.]+)\s*\(Normal/i);
  const ex = str.match(/([\d.]+)\s*\(EX/i);
  const first = str.match(/^([\d.]+)/);
  return {
    normal: normal ? parseFloat(normal[1]) : first ? parseFloat(first[1]) : null,
    ex: ex ? parseFloat(ex[1]) : null,
    raw: str,
  };
}

// Diagramme SVG : barres de startup triées de la plus rapide à la plus lente.
// Barre plus courte = coup plus rapide (meilleur) ; les coups les plus rapides
// sont mis en avant (★ + pleine couleur), BRV et HP distingués par couleur.
export function startupChartSvg(t, moves, title) {
  // Les variantes d'un même coup (« X — Normal », « X — EX Mode »…) sont
  // fusionnées si leur startup est identique ; sinon la variante reste affichée
  // entre parenthèses. Lisibilité : une barre par donnée réellement distincte.
  const seen = new Set();
  const items = moves
    .map((m) => ({
      name: m.name,
      cat: m.cat || 'BRV',
      f: startupFrames(Array.isArray(m.startup) ? m.startup[0] : m.startup),
      prio: String(Array.isArray(m.priority) ? m.priority[0] : m.priority || ''),
    }))
    .filter((m) => m.f !== null && m.name)
    .map((m) => {
      const parts = m.name.split(' — ');
      const base = parts[0];
      const variant = parts[1] || null;
      return { ...m, base, variant };
    })
    .filter((m) => {
      const key = `${m.base}|${m.f}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((m) => ({
      ...m,
      label: m.variant && !/^normal$/i.test(m.variant) ? `${m.base} (${m.variant})` : m.base,
    }))
    .sort((a, b) => a.f - b.f);
  if (items.length < 2) return '';
  const minF = items[0].f;
  const isTop = (it) => it.f <= minF + 4; // coups quasi aussi rapides que le meilleur
  const rowH = 27, padL = 230, padR = 130, padT = 30, padB = 32;
  const w = 800;
  const maxF = Math.max(...items.map((i) => i.f));
  const chartW = w - padL - padR;
  const h = padT + items.length * rowH + padB;
  const color = (it) => (it.cat === 'HP' ? 'var(--gold)' : 'var(--violet)');
  const step = maxF > 60 ? 20 : 10;
  let grid = '';
  for (let f = step; f <= maxF; f += step) {
    const x = padL + (f / maxF) * chartW;
    grid += `<line x1="${x}" y1="${padT - 6}" x2="${x}" y2="${h - padB + 4}" stroke="var(--surface-2)" stroke-width="1"/>` +
      `<text x="${x}" y="${h - padB + 18}" fill="var(--muted)" font-size="11" text-anchor="middle">${f}F</text>`;
  }
  const bars = items.map((it, i) => {
    const y = padT + i * rowH;
    const bw = Math.max(3, (it.f / maxF) * chartW);
    const top = isTop(it);
    const label = it.label.length > 26 ? it.label.slice(0, 25) + '…' : it.label;
    const tooltip = t('guide.charts.startupTooltip', {
      name: it.name, cat: it.cat, frames: it.f, priority: it.prio || t('guide.charts.startupPriorityNA'),
    });
    return `<text x="${padL - 8}" y="${y + 15}" fill="${top ? 'var(--gold)' : 'var(--text)'}" font-size="12" font-weight="${top ? '700' : '400'}" text-anchor="end">${top ? '★ ' : ''}${esc(label)}</text>` +
      `<rect x="${padL}" y="${y + 4}" width="${bw}" height="${rowH - 10}" rx="3" fill="${color(it)}" opacity="${top ? 1 : 0.5}"><title>${esc(tooltip)}</title></rect>` +
      `<text x="${padL + bw + 6}" y="${y + 15}" fill="${top ? 'var(--text)' : 'var(--muted)'}" font-size="11" font-weight="${top ? '700' : '400'}">${it.f}F${it.prio ? ` · ${esc(it.prio)}` : ''}</text>`;
  }).join('');
  const legendY = 16;
  const legend = `<rect x="${padL}" y="${legendY - 9}" width="11" height="11" rx="2" fill="var(--violet)"/><text x="${padL + 16}" y="${legendY + 1}" fill="var(--muted)" font-size="11">${esc(t('guide.charts.startupLegendBrv'))}</text>` +
    `<rect x="${padL + 78}" y="${legendY - 9}" width="11" height="11" rx="2" fill="var(--gold)"/><text x="${padL + 94}" y="${legendY + 1}" fill="var(--muted)" font-size="11">${esc(t('guide.charts.startupLegendHp'))}</text>` +
    `<text x="${padL + 190}" y="${legendY + 1}" fill="var(--gold)" font-size="11">${esc(t('guide.charts.startupLegendStar'))}</text>`;
  return `<figure class="diagram" role="img" aria-label="${esc(title)}">
<figcaption>${esc(title)}</figcaption>
<div class="table-scroll"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:620px">
<title>${esc(t('guide.charts.startupSubtitle', { title }))}</title>
${grid}${legend}${bars}
</svg></div>
<p class="mv-desc">${t('guide.charts.startupDesc')}</p>
</figure>`;
}

// Diagramme SVG de chaînes : starters (One) -> bus central -> followups (Two)
export function chainSvg(t, starters, followups) {
  if (!starters.length || !followups.length) return '';
  const rowH = 34, pillW = 205, pillH = 26, gap = 90;
  const rows = Math.max(starters.length, followups.length);
  const w = pillW * 2 + gap * 2 + 20;
  const h = Math.max(rows * rowH + 20, 80);
  const busX = pillW + gap + 10;
  const midY = h / 2;
  const pill = (name, x, y, cls) =>
    `<rect x="${x}" y="${y}" width="${pillW}" height="${pillH}" rx="13" fill="var(--surface-2)" stroke="${cls === 'hp' ? 'var(--gold)' : 'var(--violet)'}" stroke-width="1.5"/>` +
    `<text x="${x + pillW / 2}" y="${y + 17}" fill="var(--text)" font-size="11.5" text-anchor="middle">${esc(name.length > 32 ? name.slice(0, 31) + '…' : name)}</text>`;
  let out = '';
  starters.forEach((n, i) => {
    const y = 10 + i * rowH + (rows - starters.length) * rowH / 2;
    out += pill(n, 10, y, 'brv');
    out += `<path d="M ${10 + pillW} ${y + pillH / 2} C ${10 + pillW + gap * 0.6} ${y + pillH / 2}, ${busX - gap * 0.4} ${midY}, ${busX} ${midY}" fill="none" stroke="var(--violet)" stroke-width="1.5" opacity="0.7"/>`;
  });
  out += `<circle cx="${busX}" cy="${midY}" r="5" fill="var(--gold)"/>`;
  followups.forEach((n, i) => {
    const y = 10 + i * rowH + (rows - followups.length) * rowH / 2;
    out += `<path d="M ${busX} ${midY} C ${busX + gap * 0.4} ${midY}, ${busX + gap * 0.6} ${y + pillH / 2}, ${busX + gap} ${y + pillH / 2}" fill="none" stroke="var(--gold)" stroke-width="1.5" opacity="0.8" marker-end="url(#arrow)"/>`;
    out += pill(n, busX + gap, y, 'hp');
  });
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:520px" role="img">
<title>${esc(t('guide.charts.chainTitle'))}</title>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--gold)"/></marker></defs>
${out}
</svg>`;
}

// Profil de mobilité : pour chaque vitesse, position du perso sur l'étendue du
// cast (piste min→max, tous les persos en points discrets, moyenne, rang).
// L'axe est orienté « rapide à gauche » (valeur basse = rapide).
export function mobilityChartSvg(t, char, castStats) {
  const rows = [
    [t('guide.charts.mobilityRows.run'), 'Run Speed'],
    [t('guide.charts.mobilityRows.dash'), 'Dash Speed'],
    [t('guide.charts.mobilityRows.fall'), 'Fall Speed'],
    [t('guide.charts.mobilityRows.fallAfterDodge'), 'Fall Speed Ratio After Dodge'],
  ].map(([label, key]) => {
    const stats = castStats?.[key];
    const me = speedValues(char.infobox?.[key]).normal;
    if (!stats || me === null) return null;
    const rank = stats.values.filter((v) => v < me).length + 1;
    return { label, me, ...stats, rank, n: stats.values.length };
  }).filter(Boolean);
  if (!rows.length) return '';
  const rowH = 46, padL = 150, padR = 170, padT = 24, padB = 26, w = 800;
  const chartW = w - padL - padR;
  const h = padT + rows.length * rowH + padB;
  const items = rows.map((r, i) => {
    const y = padT + i * rowH + rowH / 2;
    const span = Math.max(r.max - r.min, 0.001);
    const x = (v) => padL + ((v - r.min) / span) * chartW;
    const rankTxt = r.rank <= Math.ceil(r.n / 3) ? 'var(--success)' : r.rank > r.n - Math.ceil(r.n / 3) ? 'var(--danger)' : 'var(--muted)';
    const rankLabel = ordinal(t, r.rank);
    return (
      // piste min -> max
      `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--surface-2)" stroke-width="6" stroke-linecap="round"/>` +
      // points du cast
      r.values.map((v) => `<circle cx="${x(v)}" cy="${y}" r="2.6" fill="var(--muted)" opacity="0.45"/>`).join('') +
      // moyenne
      `<line x1="${x(r.avg)}" y1="${y - 11}" x2="${x(r.avg)}" y2="${y + 11}" stroke="var(--violet)" stroke-width="2" stroke-dasharray="3 2"><title>${esc(t('guide.charts.mobilityAvgTooltip', { avg: r.avg.toFixed(1) }))}</title></line>` +
      // le personnage
      `<circle cx="${x(r.me)}" cy="${y}" r="7" fill="var(--gold)" stroke="var(--bg)" stroke-width="2"><title>${esc(t('guide.charts.mobilityMeTooltip', { label: r.label, value: r.me, rank: rankLabel, total: r.n }))}</title></circle>` +
      `<text x="${padL - 10}" y="${y + 4}" fill="var(--text)" font-size="12.5" text-anchor="end">${esc(r.label)}</text>` +
      `<text x="${padL + chartW + 12}" y="${y + 4}" fill="${rankTxt}" font-size="12" font-weight="600">${esc(t('guide.charts.mobilityRank', { rank: rankLabel, total: r.n }))}</text>`
    );
  }).join('');
  const axis = `<text x="${padL}" y="${padT - 8}" fill="var(--success)" font-size="11">${esc(t('guide.charts.mobilityFaster'))}</text>` +
    `<text x="${padL + chartW}" y="${padT - 8}" fill="var(--danger)" font-size="11" text-anchor="end">${esc(t('guide.charts.mobilitySlower'))}</text>`;
  return `<figure class="diagram" role="img" aria-label="${esc(t('guide.charts.mobilityAria'))}">
<figcaption>${esc(t('guide.charts.mobilityCaption'))}</figcaption>
<div class="table-scroll"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:560px">
<title>${esc(t('guide.charts.mobilityTitle'))}</title>
${axis}${items}
</svg></div>
<p class="mv-desc">${t('guide.charts.mobilityDesc')}</p>
</figure>`;
}

// Ordinal d'un rang. Le français suffixe « ᵉ » (et « ᵉʳ » au premier), l'anglais
// distingue st/nd/rd/th — c'est une règle de langue, pas une chaîne à traduire :
// la mettre dans les catalogues obligerait à y lister 31 formes.
export function ordinal(t, n) {
  if (t.locale === 'en') {
    const rest10 = n % 10, rest100 = n % 100;
    if (rest10 === 1 && rest100 !== 11) return `${n}st`;
    if (rest10 === 2 && rest100 !== 12) return `${n}nd`;
    if (rest10 === 3 && rest100 !== 13) return `${n}rd`;
    return `${n}th`;
  }
  return n === 1 ? `${n}ᵉʳ` : `${n}ᵉ`;
}

// --- Maillage interne : personnages cités -> lien vers leur guide ---
// Appliqué à la prose des matchups, où un nom propre désigne nécessairement un
// personnage. Trois garde-fous contre les faux liens :
//  - les noms les plus longs passent d'abord (« Cloud of Darkness » avant tout
//    nom court, « The Emperor » avant « Emperor ») ;
//  - un nom suivi d'un mot capitalisé n'est pas lié : c'est un nom de coup
//    (« Jecht Beam », « Jecht Block ») et non une mention du personnage ;
//  - une seule occurrence liée par personnage et par section, pour que le
//    texte reste lisible.
// Le personnage de la page courante n'est jamais lié (auto-référence).
export function buildRoster(entries) {
  // Un même nom peut arriver deux fois (« Jecht » est à la fois le nom complet
  // du roster et un nom court) : sans déduplication il serait lié deux fois,
  // produisant un lien imbriqué.
  const seen = new Set();
  return entries
    .filter(({ name }) => !seen.has(name) && seen.add(name))
    .sort((a, b) => b.name.length - a.name.length)
    .map(({ name, slug }) => ({
      name,
      slug,
      re: new RegExp(`(?<![\\w-])(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w-])(?!\\s+[A-Z])`),
    }));
}

// `hrefFor(slug)` : fabrique du lien vers le guide d'un personnage, fournie par
// l'appelant — c'est elle qui porte la locale et la profondeur de la page.
export function linkRoster(html, { roster, currentSlug, hrefFor }) {
  if (!roster?.length) return html;
  let out = html;
  for (const { slug, re } of roster) {
    if (slug === currentSlug) continue;
    // On découpe sur les liens complets et les balises : les segments impairs
    // sont laissés intacts, ce qui interdit d'écrire un <a> dans un <a> (HTML
    // invalide) ou dans un attribut.
    let done = false;
    out = out.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/).map((seg, i) => {
      if (done || i % 2 === 1 || !seg) return seg;
      if (!re.test(seg)) return seg;
      done = true;
      return seg.replace(re, `<a href="${hrefFor(slug)}">$1</a>`);
    }).join('');
  }
  return out;
}

// Petites sources en pied de section (contenu issu de la passe externe)
export function sectionSources(t, urls) {
  if (!urls || !urls.length) return '';
  return `<p class="sources-list">${t('common.sourcesInline')} ${urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="external noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`).join(' · ')}</p>`;
}

export function sourcesSection(t, urls, limits) {
  const seen = new Set();
  const list = (urls || []).filter((u) => u && !seen.has(u) && seen.add(u));
  return `<ul class="sources-list">${list.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="external noopener">${esc(u)}</a></li>`).join('')}</ul>` +
    (limits && limits.length
      ? `<h3>${t('common.knownLimits')}</h3><ul class="sources-list">${limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : '');
}

// Sérialisation d'un bloc JSON-LD : `</` est neutralisé pour qu'une chaîne de
// données ne puisse pas fermer la balise <script> prématurément.
export function jsonLdScript(data) {
  if (!data) return '';
  const json = JSON.stringify(data, null, 0).replace(/<\//g, '<\\/');
  return `<script type="application/ld+json">${json}</script>`;
}

// --- Liens internes ---
// Fabrique des href d'une page : `path` est le chemin publié de la page courante
// ('fr/characters/prishe.html'), d'où se déduit la profondeur. Tous les liens du
// site passent par là — aucun template ne concatène de chemin à la main.
//
// `availability` — { routes: {clé: [locales]}, guides: {slug: [locales]} } —
// décrit ce qui est réellement publié. Pendant la traduction, une destination
// peut n'exister que dans une autre langue : le lien pointe alors la version qui
// existe plutôt que de mener à une page absente, et `pageLang` / `guideLang`
// disent laquelle, pour que l'appelant puisse l'annoncer (`hreflang`). Sans
// table de disponibilité, tout est supposé publié partout.
export function linksFor(path, locale, availability = null) {
  const up = upTo(path);
  const pick = (list) => {
    if (!list || !list.length || list.includes(locale)) return null;
    return list[0];
  };
  const routeLang = (key) => pick(availability?.routes?.[key]);
  const guideLang = (slug) => pick(availability?.guides?.[slug]);
  return {
    up,
    // Page transverse, par clé logique de src/i18n/routes.mjs
    page: (key) => `${up}${pathFor(key, routeLang(key) || locale)}`,
    pageLang: routeLang,
    // Attribut prêt à insérer dans un gabarit de phrase, pour les liens de la
    // prose qui peuvent traverser les langues le temps de la traduction. Pas de
    // `lang` : le libellé du lien, lui, est bien dans la langue de la page.
    pageLangAttr: (key) => { const l = routeLang(key); return l ? ` hreflang="${l}"` : ''; },
    // Guide d'un personnage
    guide: (slug) => `${up}${guidePathFor(slug, guideLang(slug) || locale)}`,
    guideLang,
    // Ressource partagée entre les langues (styles, scripts, images)
    asset: (rel) => `${up}${rel}`,
  };
}

// --- Balises d'alternance linguistique ---
// `alternates` : { locale -> chemin publié }. La réciprocité est garantie par
// construction : les deux versions d'une page reçoivent la même table, donc
// chacune pointe vers l'autre. Sans réciprocité, Google ignore les annotations.
//
// `x-default` désigne la version servie quand aucune langue déclarée ne
// convient : c'est exactement la définition de la langue par défaut du site, il
// suit donc DEFAULT_LOCALE et basculera tout seul sur l'anglais en Phase 5.
function hreflangLinks(alternates) {
  if (!alternates || Object.keys(alternates).length < 2) return '';
  const links = Object.entries(alternates)
    .map(([loc, p]) => `<link rel="alternate" hreflang="${LOCALE_META[loc].lang}" href="${esc(absUrl(p))}">`);
  const def = alternates[DEFAULT_LOCALE];
  if (def) links.push(`<link rel="alternate" hreflang="x-default" href="${esc(absUrl(def))}">`);
  return links.join('\n');
}

// `path` : chemin de la page telle qu'elle est publiée ('index.html',
// 'fr/characters/prishe.html'…). Il sert à composer le canonical, l'og:url et la
// profondeur des liens relatifs — obligatoire sur un project site GitHub Pages
// (voir src/site-config.mjs).
// `og` : { image, alt, width, height, type } — `image` est un chemin publié
// (ex. 'assets/og/prishe.png'), converti en URL absolue.
// `robots` : valeur de <meta name="robots"> ; omise par défaut (indexable).
// `seo` : raccourci pour les pages transverses — { path, ogImage, ogAlt, dates,
// ldType }. Il évite de recopier la même construction Open Graph + JSON-LD dans
// chaque template ; un `jsonLd` explicite (landing, guides, créateur) l'emporte.
export function pageShell({
  t, locale, title, description, path, jsPath, body, extraHead = '',
  og = null, jsonLd = null, robots = null, seo = null, alternates = null,
}) {
  const pagePath = path ?? seo?.path;
  const up = upTo(pagePath);
  const meta = LOCALE_META[locale];
  if (og === null && seo) {
    og = { image: seo.ogImage, alt: seo.ogAlt, width: 1200, height: 630, type: seo.ogType || 'article' };
  }
  if (jsonLd === null && seo && seo.ldType !== 'none') {
    jsonLd = ldArticle({
      type: seo.ldType || 'Article',
      headline: title,
      description,
      path: pagePath,
      locale,
      image: seo.ogImage,
      imageAlt: seo.ogAlt,
      section: seo.section,
      ...(seo.dates || {}),
    });
  }
  const canonical = absUrl(pagePath);
  const ogImage = og?.image ? absUrl(og.image) : null;
  const verif = [
    SITE_VERIFICATION.google && `<meta name="google-site-verification" content="${esc(SITE_VERIFICATION.google)}">`,
    SITE_VERIFICATION.bing && `<meta name="msvalidate.01" content="${esc(SITE_VERIFICATION.bing)}">`,
  ].filter(Boolean).join('\n');
  const ogAlternates = Object.keys(alternates || {})
    .filter((l) => l !== locale)
    .map((l) => `<meta property="og:locale:alternate" content="${LOCALE_META[l].ogLocale}">`);
  const social = [
    `<meta property="og:type" content="${esc(og?.type || 'website')}">`,
    `<meta property="og:site_name" content="${esc(t('site.name'))}">`,
    `<meta property="og:locale" content="${meta.ogLocale}">`,
    ...ogAlternates,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    ogImage && `<meta property="og:image" content="${esc(ogImage)}">`,
    ogImage && og.width && `<meta property="og:image:width" content="${og.width}">`,
    ogImage && og.height && `<meta property="og:image:height" content="${og.height}">`,
    ogImage && og.alt && `<meta property="og:image:alt" content="${esc(og.alt)}">`,
    `<meta name="twitter:card" content="${ogImage && og.width >= 600 ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    ogImage && `<meta name="twitter:image" content="${esc(ogImage)}">`,
    ogImage && og.alt && `<meta name="twitter:image:alt" content="${esc(og.alt)}">`,
  ].filter(Boolean).join('\n');
  const hreflang = hreflangLinks(alternates);
  return `<!DOCTYPE html>
<html lang="${meta.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${hreflang ? hreflang + '\n' : ''}${robots ? `<meta name="robots" content="${esc(robots)}">\n` : ''}<meta name="author" content="${esc(AUTHOR)}">
${social}
${verif ? verif + '\n' : ''}<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${up}assets/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="${up}assets/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}styles/main.css">
${jsonLdScript(jsonLd)}
${extraHead}
</head>
<body>
${body}
${langBannerData(t, locale, alternates, up)}
<script src="${up}scripts/lang.js" defer></script>
${jsPath ? `<script src="${up}${jsPath}" defer></script>` : ''}
</body>
</html>`;
}

// Données du bandeau de proposition linguistique, sérialisées pour le script
// client. Chaque entrée est rédigée dans SA langue : le bandeau qui propose le
// français à un visiteur francophone doit lui parler français, sur une page
// anglaise. Les catalogues portent donc chacun leur propre formulation.
//
// Rien n'est masqué ni redirigé côté serveur : la page servie reste la page
// demandée, le bandeau n'est qu'une proposition. C'est ce qui garantit que les
// deux versions restent indexables (§8 du cahier des charges).
function langBannerData(t, locale, alternates, up) {
  const others = Object.entries(alternates || {}).filter(([l]) => l !== locale);
  if (!others.length) return '';
  const payload = {};
  for (const [l, p] of others) {
    const lt = t.forLocale ? t.forLocale(l) : null;
    if (!lt) continue;
    payload[l] = {
      href: `${up}${p}`,
      lang: LOCALE_META[l].lang,
      text: lt('lang.bannerText'),
      action: lt('lang.bannerAction'),
      dismiss: lt('lang.bannerDismiss'),
      dismissAria: lt('lang.bannerDismissAria'),
    };
  }
  if (!Object.keys(payload).length) return '';
  return `<script type="application/json" id="lang-alternates">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

// Header global du site : bandeau titre + navigation, présent sur toutes les pages.
// `path` : chemin publié de la page courante, d'où se déduisent la profondeur des
// liens et la locale ; `active` marque le lien de la page courante ; `h1` réserve
// la balise h1 à la landing (les autres pages ont leur propre h1).
export function siteHeader(t, { path, locale, active = '', h1 = false, alternates = null, availability = null } = {}) {
  const L = linksFor(path, locale, availability);
  const groups = [
    { title: t('nav.groups.gameData'), items: [
      { key: 'index', href: L.page('home'), label: t('nav.items.characters'), lang: L.pageLang('home') },
      { key: 'aerith', href: L.guide('aerith'), label: t('nav.items.aerith'), lang: L.guideLang('aerith') },
      { key: 'feral', href: L.page('feralUnlock'), label: t('nav.items.feral'), lang: L.pageLang('feralUnlock') },
      { key: 'techniques', href: L.page('techniques'), label: t('nav.items.techniques'), lang: L.pageLang('techniques') },
    ] },
    // Entrée sans `items` : lien direct, sans panneau déroulant — il n'y a
    // qu'une destination, dérouler pour un seul choix serait un clic de trop.
    { title: t('nav.groups.buildCreator'), key: 'createur', href: L.page('buildCreator'), lang: L.pageLang('buildCreator') },
    { title: t('nav.groups.play'), items: [
      { key: 'install', href: L.page('install'), label: t('nav.items.install'), lang: L.pageLang('install') },
      { key: 'savedata', href: L.page('savedata'), label: t('nav.items.savedata'), lang: L.pageLang('savedata') },
      { key: 'multijoueur', href: L.page('multiplayer'), label: t('nav.items.multiplayer'), lang: L.pageLang('multiplayer') },
    ] },
    { title: t('nav.groups.tournaments'), items: [
      { key: 'participer', href: L.page('participate'), label: t('nav.items.participate'), lang: L.pageLang('participate') },
      { key: 'organiser', href: L.page('organize'), label: t('nav.items.organize'), lang: L.pageLang('organize') },
      { key: 'futurs', href: L.page('upcomingTournaments'), label: t('nav.items.upcoming'), lang: L.pageLang('upcomingTournaments') },
      { key: 'tournois', href: L.page('pastTournaments'), label: t('nav.items.past'), lang: L.pageLang('pastTournaments') },
      { key: 'tierlist', href: 'https://dissidia.wiki/Tier_List_(Dissidia_012)', label: t('nav.items.tierlist'), ext: true },
      { key: 'videos', href: 'https://replaytheater.app/?game=d012', label: t('nav.items.videos'), ext: true },
    ] },
  ];
  const extIco = '<svg class="ext-ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M5 2H2.2C1.5 2 1 2.5 1 3.2v6.6C1 10.5 1.5 11 2.2 11h6.6c.7 0 1.2-.5 1.2-1.2V7M7.5 1H11v3.5M11 1 5.8 6.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Une entrée dont la page n'existe pas encore dans cette langue pointe la
  // version publiée et le déclare, plutôt que de mener à une page absente.
  const link = (it) => `<a href="${it.href}"${it.key === active ? ' aria-current="page"' : ''}${it.lang ? ` hreflang="${it.lang}"` : ''}${it.ext ? ' target="_blank" rel="external noopener"' : ''}>${it.label}${it.ext ? extIco : ''}</a>`;
  const brand = `${esc(t('site.brandGame'))} <span class="gold">${esc(t('site.brandBracket'))}</span> <span class="sh-sub">${esc(t('site.brandSub'))}</span>`;
  return `<header class="site-header">
${h1 ? `<h1 class="sh-brand">${brand}</h1>` : `<a class="sh-brand" href="${L.page('home')}">${brand}</a>`}
<nav class="sh-groups" aria-label="${esc(t('nav.aria'))}">
${groups.map((g) => (g.items
    ? `<div class="sh-group${g.items.some((it) => it.key === active) ? ' is-active' : ''}">
<span class="sh-group-label">${g.title}</span>
<div class="sh-drop">
${g.items.map(link).join('\n')}
</div>
</div>`
    : `<a class="sh-group-label sh-group-link${g.key === active ? ' is-active' : ''}" href="${g.href}"${g.key === active ? ' aria-current="page"' : ''}${g.lang ? ` hreflang="${g.lang}"` : ''}>${g.title}</a>`)).join('\n')}
</nav>
${siteTools(t, locale, alternates, L, availability?.routes?.home)}<details class="sh-drawer">
<summary aria-label="${esc(t('nav.menu'))}"><span class="sh-burger" aria-hidden="true"></span></summary>
<nav class="sh-panel" aria-label="${esc(t('nav.ariaMobile'))}">
${groups.map((g) => (g.items
    ? `<p class="sh-cat">${g.title}</p>\n${g.items.map(link).join('\n')}`
    : link({ key: g.key, href: g.href, label: g.title, lang: g.lang }))).join('\n')}${drawerSwitcher(t, locale, alternates, L, availability?.routes?.home)}
</nav>
</details>
</header>`;
}

// Zone d'outils du header : sélecteur de langue, puis l'emplacement réservé à la
// barre de recherche (fonctionnalité suivante). Réserver la place maintenant
// évite d'avoir à remanier le header une deuxième fois.
function siteTools(t, locale, alternates, L, published) {
  const sw = langSwitcher(t, locale, alternates, L, { published });
  if (!sw) return '';
  return `<div class="sh-tools">
${sw}
</div>
`;
}

// Même sélecteur, dans le tiroir mobile.
function drawerSwitcher(t, locale, alternates, L, published) {
  const sw = langSwitcher(t, locale, alternates, L, { inDrawer: true, published });
  return sw ? `
${sw}` : '';
}

// Sélecteur de langue : codes compacts (EN / FR), jamais de drapeau — un drapeau
// désigne un pays, pas une langue. La langue courante n'est pas un lien vers
// elle-même mais un repère marqué `aria-current`.
function langSwitcher(t, locale, alternates, L, { inDrawer = false, published = null } = {}) {
  // Le sélecteur liste toutes les langues publiées, pas seulement celles où
  // CETTE page existe : une page sans équivalent renvoie vers l'accueil de la
  // langue cible plutôt que de disparaître du header. Les balises hreflang du
  // <head>, elles, restent strictement limitées aux équivalents réels — annoncer
  // une traduction inexistante serait un mensonge fait aux moteurs.
  const langs = published && published.length ? published : Object.keys(alternates || {});
  if (langs.length < 2) return '';
  const items = langs.map((l) => {
    const p = (alternates || {})[l] || pathFor('home', l);
    const m = LOCALE_META[l];
    if (l === locale) {
      return `<span class="lang-opt is-current" lang="${m.lang}" aria-current="true" title="${esc(t('lang.current', { label: m.label }))}">${esc(m.code)}</span>`;
    }
    return `<a class="lang-opt" href="${L.asset(p)}" lang="${m.lang}" hreflang="${m.lang}" title="${esc(m.label)}"><span aria-hidden="true">${esc(m.code)}</span><span class="sr-only">${esc(m.label)}</span></a>`;
  }).join('\n');
  // Le <nav> porte son propre aria-label : pas de libellé supplémentaire, qui
  // devrait porter un id — et cet id serait dupliqué, le sélecteur étant rendu
  // deux fois (header desktop et volet mobile).
  return `<nav class="lang-switch${inDrawer ? ' lang-switch-drawer' : ''}" aria-label="${esc(t('lang.switcherAria'))}">
${items}
</nav>`;
}

// Année de mise en ligne — figée : elle datera toujours la publication du site,
// pas la date du dernier build.
const COPYRIGHT_YEAR = 2026;
const REPO = 'https://github.com/Serial-Developer/duodecim-guides';

export function siteFooter(t) {
  return `<footer class="site"><div class="wrap">
<p class="foot-line">${t('footer.textsAndDesign', { year: COPYRIGHT_YEAR })} <strong>${AUTHOR}</strong> — <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="external noopener license">${t('footer.licenseLink')}</a>. ${t('footer.fanSite')}</p>
<p class="foot-line">${t('footer.gameDataFrom')} <a href="https://dissidia.wiki" target="_blank" rel="external noopener">dissidia.wiki</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="external noopener">CC BY 4.0</a>) ${t('footer.and')} <a href="https://finalfantasy.fandom.com" target="_blank" rel="external noopener">Final Fantasy Wiki</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="external noopener">CC BY-SA 3.0</a>).</p>
<details class="foot-more"><summary>${t('footer.moreSummary')}</summary>
<p>${t('footer.moreP1')}</p>
<p>${t('footer.moreP2Before')} <a href="https://web.archive.org" target="_blank" rel="external noopener">${t('footer.waybackLabel')}</a> ${t('footer.moreP2After')}</p>
<p>${t('footer.moreP3Before', { author: AUTHOR })} <a href="${ccUrl(t.locale)}" target="_blank" rel="external noopener license">${t('footer.ccByNcNd')}</a>${t('footer.moreP3After')} <a href="${REPO}/blob/main/NOTICE.md" target="_blank" rel="external noopener">NOTICE.md</a>.</p>
</details>
</div></footer>`;
}

// Creative Commons sert ses actes localisés sous /deed.<code> ; sans suffixe, la
// page s'affiche en anglais.
const ccUrl = (locale) => `https://creativecommons.org/licenses/by-nc-nd/4.0/${locale === 'en' ? '' : `deed.${locale}`}`;

export { ROUTES, pathFor, guidePathFor, LOCALE_META, DEFAULT_LOCALE };
