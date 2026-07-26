// Helpers partagés des templates
import {
  SITE_URL, SITE_NAME, SITE_LOCALE, SITE_LANG, AUTHOR, AUTHOR_URL, GAME,
  SITE_VERIFICATION, absUrl,
} from '../site-config.mjs';
import { ldArticle } from './jsonld.mjs';

export { SITE_URL, SITE_NAME, AUTHOR, AUTHOR_URL, GAME, absUrl };

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const BANNER_TEXT = 'Section non documentée sur dissidia.wiki à ce jour — à compléter.';

export function banner(extra = '') {
  return `<div class="banner" data-undocumented="1"><strong>${BANNER_TEXT}</strong>${extra ? ' ' + extra : ''}</div>`;
}

export function infoBanner(html) {
  return `<div class="banner info">${html}</div>`;
}

export const paras = (arr) => (arr || []).map((p) => `<p>${esc(p)}</p>`).join('\n');

// Ancre stable depuis un nom ("Day to Die" -> "t-day-to-die") — partagée entre
// les cartes de tournois.html et les liens du calendrier.
export const slugAnchor = (name) => 't-' + String(name)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
export function startupChartSvg(moves, title) {
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
    return `<text x="${padL - 8}" y="${y + 15}" fill="${top ? 'var(--gold)' : 'var(--text)'}" font-size="12" font-weight="${top ? '700' : '400'}" text-anchor="end">${top ? '★ ' : ''}${esc(label)}</text>` +
      `<rect x="${padL}" y="${y + 4}" width="${bw}" height="${rowH - 10}" rx="3" fill="${color(it)}" opacity="${top ? 1 : 0.5}"><title>${esc(it.name)} (${it.cat}) : ${it.f}F — priorité ${esc(it.prio || 'n.c.')}</title></rect>` +
      `<text x="${padL + bw + 6}" y="${y + 15}" fill="${top ? 'var(--text)' : 'var(--muted)'}" font-size="11" font-weight="${top ? '700' : '400'}">${it.f}F${it.prio ? ` · ${esc(it.prio)}` : ''}</text>`;
  }).join('');
  const legendY = 16;
  const legend = `<rect x="${padL}" y="${legendY - 9}" width="11" height="11" rx="2" fill="var(--violet)"/><text x="${padL + 16}" y="${legendY + 1}" fill="var(--muted)" font-size="11">Bravery</text>` +
    `<rect x="${padL + 78}" y="${legendY - 9}" width="11" height="11" rx="2" fill="var(--gold)"/><text x="${padL + 94}" y="${legendY + 1}" fill="var(--muted)" font-size="11">Attaque HP</text>` +
    `<text x="${padL + 190}" y="${legendY + 1}" fill="var(--gold)" font-size="11">★ = parmi les plus rapides du kit</text>`;
  return `<figure class="diagram" role="img" aria-label="${esc(title)}">
<figcaption>${esc(title)}</figcaption>
<div class="table-scroll"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:620px">
<title>${esc(title)} — barre plus courte = coup plus rapide</title>
${grid}${legend}${bars}
</svg></div>
<p class="mv-desc"><strong>Barre plus courte = coup plus rapide.</strong> Startup en frames (60 i/s, données dissidia.wiki), priorité indiquée après la valeur. Les coups marqués ★ sont les plus rapides du kit — ce sont en général vos meilleurs outils de punish et de pression.</p>
</figure>`;
}

// Diagramme SVG de chaînes : starters (One) -> bus central -> followups (Two)
export function chainSvg(starters, followups) {
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
<title>Diagramme des chaînes : chaque bravery « One » peut enchaîner sur n'importe quel followup « Two » équipé</title>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--gold)"/></marker></defs>
${out}
</svg>`;
}

// Profil de mobilité : pour chaque vitesse, position du perso sur l'étendue du
// cast (piste min→max, tous les persos en points discrets, moyenne, rang).
// L'axe est orienté « rapide à gauche » (valeur basse = rapide).
export function mobilityChartSvg(char, castStats) {
  const rows = [
    ['Course', 'Run Speed'],
    ['Dash', 'Dash Speed'],
    ['Chute', 'Fall Speed'],
    ['Chute post-esquive', 'Fall Speed Ratio After Dodge'],
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
    return (
      // piste min -> max
      `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--surface-2)" stroke-width="6" stroke-linecap="round"/>` +
      // points du cast
      r.values.map((v) => `<circle cx="${x(v)}" cy="${y}" r="2.6" fill="var(--muted)" opacity="0.45"/>`).join('') +
      // moyenne
      `<line x1="${x(r.avg)}" y1="${y - 11}" x2="${x(r.avg)}" y2="${y + 11}" stroke="var(--violet)" stroke-width="2" stroke-dasharray="3 2"><title>Moyenne du cast : ${r.avg.toFixed(1)}</title></line>` +
      // le personnage
      `<circle cx="${x(r.me)}" cy="${y}" r="7" fill="var(--gold)" stroke="var(--bg)" stroke-width="2"><title>${r.label} : ${r.me} — ${r.rank}ᵉ plus rapide sur ${r.n}</title></circle>` +
      `<text x="${padL - 10}" y="${y + 4}" fill="var(--text)" font-size="12.5" text-anchor="end">${r.label}</text>` +
      `<text x="${padL + chartW + 12}" y="${y + 4}" fill="${rankTxt}" font-size="12" font-weight="600">${r.rank}ᵉ/${r.n} plus rapide</text>`
    );
  }).join('');
  const axis = `<text x="${padL}" y="${padT - 8}" fill="var(--success)" font-size="11">◀ plus rapide</text>` +
    `<text x="${padL + chartW}" y="${padT - 8}" fill="var(--danger)" font-size="11" text-anchor="end">plus lent ▶</text>`;
  return `<figure class="diagram" role="img" aria-label="Profil de mobilité : position du personnage dans le cast pour chaque vitesse">
<figcaption>Profil de mobilité (mode normal) — position dans le cast</figcaption>
<div class="table-scroll"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:560px">
<title>Pour chaque vitesse : point or = ce personnage, petits points = les 31 personnages, trait violet = moyenne. Plus à gauche = plus rapide.</title>
${axis}${items}
</svg></div>
<p class="mv-desc">Point <span style="color:var(--gold)">or</span> : ce personnage · petits points : le reste du cast · trait <span style="color:var(--violet)">violet</span> : moyenne. Valeurs du wiki, <strong>plus bas = plus rapide</strong> ; le rang à droite se lit directement (1ᵉʳ = le plus rapide).</p>
</figure>`;
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

export function linkRoster(html, { roster, currentSlug, base = '' }) {
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
      return seg.replace(re, `<a href="${base}characters/${slug}.html">$1</a>`);
    }).join('');
  }
  return out;
}

// Petites sources en pied de section (contenu issu de la passe externe)
export function sectionSources(urls) {
  if (!urls || !urls.length) return '';
  return `<p class="sources-list">Sources : ${urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="external noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}</a>`).join(' · ')}</p>`;
}

export function sourcesSection(urls, limitsFr) {
  const seen = new Set();
  const list = (urls || []).filter((u) => u && !seen.has(u) && seen.add(u));
  return `<ul class="sources-list">${list.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="external noopener">${esc(u)}</a></li>`).join('')}</ul>` +
    (limitsFr && limitsFr.length
      ? `<h3>Limites connues</h3><ul class="sources-list">${limitsFr.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : '');
}

// Sérialisation d'un bloc JSON-LD : `</` est neutralisé pour qu'une chaîne de
// données ne puisse pas fermer la balise <script> prématurément.
export function jsonLdScript(data) {
  if (!data) return '';
  const json = JSON.stringify(data, null, 0).replace(/<\//g, '<\\/');
  return `<script type="application/ld+json">${json}</script>`;
}

// `path` : chemin de la page telle qu'elle est publiée ('index.html',
// 'characters/prishe.html'…). Il sert à composer le canonical et l'og:url en
// URL absolue — obligatoire sur un project site GitHub Pages (voir
// src/site-config.mjs).
// `og` : { image, alt, width, height, type } — `image` est un chemin publié
// (ex. 'assets/og/prishe.png'), converti en URL absolue.
// `robots` : valeur de <meta name="robots"> ; omise par défaut (indexable).
// `seo` : raccourci pour les pages transverses — { path, ogImage, ogAlt, dates,
// ldType }. Il évite de recopier la même construction Open Graph + JSON-LD dans
// chaque template ; un `jsonLd` explicite (landing, guides, créateur) l'emporte.
export function pageShell({
  title, description, path, cssPath, jsPath, body, extraHead = '',
  og = null, jsonLd = null, robots = null, seo = null,
}) {
  // Favicon : même préfixe relatif que la feuille de style (pages racine vs characters/)
  const base = cssPath.startsWith('../') ? '../' : '';
  const pagePath = path ?? seo?.path;
  if (og === null && seo) {
    og = { image: seo.ogImage, alt: seo.ogAlt, width: 1200, height: 630, type: seo.ogType || 'article' };
  }
  if (jsonLd === null && seo && seo.ldType !== 'none') {
    jsonLd = ldArticle({
      type: seo.ldType || 'Article',
      headline: title,
      description,
      path: pagePath,
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
  const social = [
    `<meta property="og:type" content="${esc(og?.type || 'website')}">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:locale" content="${SITE_LOCALE}">`,
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
  return `<!DOCTYPE html>
<html lang="${SITE_LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${robots ? `<meta name="robots" content="${esc(robots)}">\n` : ''}<meta name="author" content="${esc(AUTHOR)}">
${social}
${verif ? verif + '\n' : ''}<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${base}assets/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="${base}assets/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssPath}">
${jsonLdScript(jsonLd)}
${extraHead}
</head>
<body>
${body}
${jsPath ? `<script src="${jsPath}" defer></script>` : ''}
</body>
</html>`;
}

// Header global du site : bandeau titre + navigation, présent sur toutes les pages.
// `base` préfixe les liens relatifs ('' à la racine, '../' dans characters/) ;
// `active` marque le lien de la page courante ; `h1` réserve la balise h1 à la
// landing (les autres pages ont leur propre h1).
export function siteHeader({ base = '', active = '', h1 = false } = {}) {
  const groups = [
    { title: 'Données du jeu', items: [
      { key: 'index', href: `${base}index.html`, label: 'Personnages' },
      { key: 'aerith', href: `${base}characters/aerith.html`, label: 'Assist : Aerith' },
      { key: 'feral', href: `${base}obtenir-feral-chaos.html`, label: 'Obtenir Feral Chaos' },
      { key: 'techniques', href: `${base}techniques.html`, label: 'Techniques &amp; glitches' },
    ] },
    // Entrée sans `items` : lien direct, sans panneau déroulant — il n'y a
    // qu'une destination, dérouler pour un seul choix serait un clic de trop.
    { title: 'Créateur de builds', key: 'createur', href: `${base}createur-de-builds.html` },
    { title: 'Jouer à Dissidia', items: [
      { key: 'install', href: `${base}install.html`, label: 'Installer sur PPSSPP' },
      { key: 'savedata', href: `${base}savedata.html`, label: 'Savedata prêtes à jouer' },
      { key: 'multijoueur', href: `${base}multijoueur.html`, label: 'Jouer en multijoueur' },
    ] },
    { title: 'Les tournois', items: [
      { key: 'participer', href: `${base}participer.html`, label: 'Participer aux tournois' },
      { key: 'organiser', href: `${base}organiser.html`, label: 'Organiser un tournoi' },
      { key: 'futurs', href: `${base}futurs-tournois.html`, label: 'Futurs tournois' },
      { key: 'tournois', href: `${base}tournois.html`, label: 'Tournois passés' },
      { key: 'tierlist', href: 'https://dissidia.wiki/Tier_List_(Dissidia_012)', label: 'Tier list tournoi 2017', ext: true },
      { key: 'videos', href: 'https://replaytheater.app/?game=d012', label: 'Vidéos de matchs', ext: true },
    ] },
  ];
  const extIco = '<svg class="ext-ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M5 2H2.2C1.5 2 1 2.5 1 3.2v6.6C1 10.5 1.5 11 2.2 11h6.6c.7 0 1.2-.5 1.2-1.2V7M7.5 1H11v3.5M11 1 5.8 6.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const link = (it) => `<a href="${it.href}"${it.key === active ? ' aria-current="page"' : ''}${it.ext ? ' target="_blank" rel="external noopener"' : ''}>${it.label}${it.ext ? extIco : ''}</a>`;
  const brand = `Dissidia 012 <span class="gold">[duodecim]</span> <span class="sh-sub">guides compétitifs</span>`;
  return `<header class="site-header">
${h1 ? `<h1 class="sh-brand">${brand}</h1>` : `<a class="sh-brand" href="${base}index.html">${brand}</a>`}
<nav class="sh-groups" aria-label="Navigation du site">
${groups.map((g) => (g.items
    ? `<div class="sh-group${g.items.some((it) => it.key === active) ? ' is-active' : ''}">
<span class="sh-group-label">${g.title}</span>
<div class="sh-drop">
${g.items.map(link).join('\n')}
</div>
</div>`
    : `<a class="sh-group-label sh-group-link${g.key === active ? ' is-active' : ''}" href="${g.href}"${g.key === active ? ' aria-current="page"' : ''}>${g.title}</a>`)).join('\n')}
</nav>
<details class="sh-drawer">
<summary aria-label="Menu"><span class="sh-burger" aria-hidden="true"></span></summary>
<nav class="sh-panel" aria-label="Navigation du site (mobile)">
${groups.map((g) => (g.items
    ? `<p class="sh-cat">${g.title}</p>\n${g.items.map(link).join('\n')}`
    : link({ key: g.key, href: g.href, label: g.title }))).join('\n')}
</nav>
</details>
</header>`;
}

// Année de mise en ligne — figée : elle datera toujours la publication du site,
// pas la date du dernier build.
const COPYRIGHT_YEAR = 2026;
const REPO = 'https://github.com/Serial-Developer/duodecim-guides';

export function siteFooter() {
  return `<footer class="site"><div class="wrap">
<p class="foot-line">Textes et design © ${COPYRIGHT_YEAR} <strong>${AUTHOR}</strong> — <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="external noopener license">code sous MIT, textes sous CC BY-NC-ND 4.0</a>. Site de fans non commercial : personnages et artworks © Square Enix.</p>
<p class="foot-line">Données de jeu adaptées de <a href="https://dissidia.wiki" target="_blank" rel="external noopener">dissidia.wiki</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="external noopener">CC BY 4.0</a>) et du <a href="https://finalfantasy.fandom.com" target="_blank" rel="external noopener">Final Fantasy Wiki</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="external noopener">CC BY-SA 3.0</a>).</p>
<details class="foot-more"><summary>Détail des licences et des sources</summary>
<p>Personnages, artworks et éléments de jeu © Square Enix — <em>Dissidia 012 [duodecim] Final Fantasy</em> (PSP, 2011) ; projet de fans sans affiliation ni approbation de Square Enix, toute demande de retrait des ayants droit sera honorée.</p>
<p>Frame data, movesets, tier list 2017 et techniques adaptés et traduits de dissidia.wiki (CC BY 4.0, réutilisation libre avec attribution) ; équipements, accessoires et compléments de moveset adaptés du Final Fantasy Wiki (CC BY-SA 3.0, partage à l’identique) — ces données restent sous la licence de leur source, que je ne peux pas restreindre. Portraits et icônes : fichiers officiels du wiki récupérés via la <a href="https://web.archive.org" target="_blank" rel="external noopener">Wayback Machine</a> (CDN du wiki indisponible en juillet 2026). Sources communautaires (GameFAQs, dissidiaforums, guides Steam, vidéos de joueurs) créditées section par section.</p>
<p>La prose française de ce site est signée ${AUTHOR} et diffusée sous <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr" target="_blank" rel="external noopener license">CC BY-NC-ND 4.0</a> : partage libre en citant l’auteur et en liant la page d’origine, sans usage commercial ni republication modifiée. Détail complet des sources : <a href="${REPO}/blob/main/NOTICE.md" target="_blank" rel="external noopener">NOTICE.md</a>.</p>
</details>
</div></footer>`;
}
