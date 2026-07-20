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
