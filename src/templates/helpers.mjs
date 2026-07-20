// Helpers partagés des templates
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

// Diagramme SVG : barres de startup triées (code couleur priorité)
export function startupChartSvg(moves, title) {
  const items = moves
    .map((m) => ({ name: m.name, f: startupFrames(Array.isArray(m.startup) ? m.startup[0] : m.startup), prio: String(Array.isArray(m.priority) ? m.priority[0] : m.priority || '') }))
    .filter((m) => m.f !== null && m.name)
    .sort((a, b) => a.f - b.f);
  if (items.length < 2) return '';
  const rowH = 26, padL = 210, padR = 46, padT = 26, padB = 30;
  const w = 760;
  const maxF = Math.max(...items.map((i) => i.f));
  const chartW = w - padL - padR;
  const h = padT + items.length * rowH + padB;
  const color = (p) => /ranged/i.test(p) ? 'var(--success)' : /high/i.test(p) ? 'var(--gold)' : /mid/i.test(p) ? 'var(--violet)' : 'var(--muted)';
  // graduations ~ tous les 10F
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
    return `<text x="${padL - 8}" y="${y + 15}" fill="var(--text)" font-size="12" text-anchor="end">${esc(it.name.length > 30 ? it.name.slice(0, 29) + '…' : it.name)}</text>` +
      `<rect x="${padL}" y="${y + 4}" width="${bw}" height="${rowH - 10}" rx="3" fill="${color(it.prio)}"><title>${esc(it.name)} : ${it.f}F (${esc(it.prio || 'priorité n.c.')})</title></rect>` +
      `<text x="${padL + bw + 6}" y="${y + 15}" fill="var(--muted)" font-size="11">${it.f}F</text>`;
  }).join('');
  return `<figure class="diagram" role="img" aria-label="${esc(title)}">
<figcaption>${esc(title)}</figcaption>
<div class="table-scroll"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:560px">
<title>${esc(title)}</title>
${grid}${bars}
</svg></div>
<p class="mv-desc">Startup en frames (60 i/s, données dissidia.wiki). Couleur : <span style="color:var(--muted)">Melee Low</span> · <span style="color:var(--violet)">Melee Mid</span> · <span style="color:var(--gold)">Melee High</span> · <span style="color:var(--success)">Ranged</span>.</p>
</figure>`;
}

// Profil de mobilité : valeurs brutes du perso vs moyenne du cast (plus bas = plus rapide)
export function mobilityChartSvg(char, castAvg) {
  const rows = [
    ['Course', 'Run Speed'],
    ['Dash', 'Dash Speed'],
    ['Chute', 'Fall Speed'],
    ['Chute post-esquive', 'Fall Speed Ratio After Dodge'],
  ].map(([label, key]) => ({
    label,
    me: speedValues(char.infobox?.[key]).normal,
    avg: castAvg[key],
  })).filter((r) => r.me !== null && r.avg);
  if (!rows.length) return '';
  const rowH = 34, padL = 150, padR = 60, padT = 12, padB = 26, w = 720;
  const maxV = Math.max(...rows.flatMap((r) => [r.me, r.avg])) * 1.15;
  const chartW = w - padL - padR;
  const h = padT + rows.length * rowH + padB;
  const bars = rows.map((r, i) => {
    const y = padT + i * rowH;
    const bw = Math.max(3, (r.me / maxV) * chartW);
    const ax = padL + (r.avg / maxV) * chartW;
    return `<text x="${padL - 8}" y="${y + 17}" fill="var(--text)" font-size="12" text-anchor="end">${r.label}</text>` +
      `<rect x="${padL}" y="${y + 6}" width="${bw}" height="${rowH - 16}" rx="3" fill="var(--violet)"><title>${r.label} : ${r.me} (moyenne du cast : ${r.avg.toFixed(1)})</title></rect>` +
      `<line x1="${ax}" y1="${y + 2}" x2="${ax}" y2="${y + rowH - 8}" stroke="var(--gold)" stroke-width="2" stroke-dasharray="3 2"><title>Moyenne du cast : ${r.avg.toFixed(1)}</title></line>` +
      `<text x="${padL + bw + 6}" y="${y + 17}" fill="var(--muted)" font-size="11">${r.me}</text>`;
  }).join('');
  return `<figure class="diagram" role="img" aria-label="Profil de mobilité comparé à la moyenne du cast">
<figcaption>Profil de mobilité (mode normal)</figcaption>
<div class="table-scroll"><svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="min-width:480px">
<title>Profil de mobilité : valeurs du personnage (barres) contre moyenne du cast (trait or)</title>
${bars}
</svg></div>
<p class="mv-desc">Valeurs brutes du wiki (page personnage) — <strong>plus la valeur est basse, plus le personnage est rapide</strong>. Trait pointillé or : moyenne des 31 personnages.</p>
</figure>`;
}

export function sourcesSection(urls, limitsFr) {
  const seen = new Set();
  const list = (urls || []).filter((u) => u && !seen.has(u) && seen.add(u));
  return `<ul class="sources-list">${list.map((u) => `<li><a href="${esc(u)}" rel="external noopener">${esc(u)}</a></li>`).join('')}</ul>` +
    (limitsFr && limitsFr.length
      ? `<h3>Limites connues</h3><ul class="sources-list">${limitsFr.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : '');
}

export function pageShell({ title, description, cssPath, jsPath, body, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssPath}">
${extraHead}
</head>
<body>
${body}
${jsPath ? `<script src="${jsPath}" defer></script>` : ''}
</body>
</html>`;
}

export function siteFooter() {
  return `<footer class="site"><div class="wrap">
<p>Site de fans non commercial. Personnages, artworks et éléments de jeu © Square Enix — <em>Dissidia 012 [duodecim] Final Fantasy</em> (PSP, 2011).</p>
<p>Contenu textuel adapté et traduit de <a href="https://dissidia.wiki" rel="external noopener">dissidia.wiki</a> (licence <a href="https://creativecommons.org/licenses/by/4.0/" rel="external noopener">CC BY 4.0</a>). Portraits et icônes : fichiers officiels du wiki récupérés via la <a href="https://web.archive.org" rel="external noopener">Wayback Machine</a> (CDN du wiki indisponible en juillet 2026).</p>
</div></footer>`;
}
