// Template d'un guide personnage — structure imposée §7 du cahier des charges
import {
  esc, banner, infoBanner, paras, priorityBadge, startupChartSvg, mobilityChartSvg,
  chainSvg, sourcesSection, pageShell, siteFooter,
} from './helpers.mjs';

const FIELDS = [
  ['damage', 'Dégâts de base'],
  ['startup', 'Startup'],
  ['type', 'Type'],
  ['priority', 'Priorité'],
  ['exForce', 'EX Force'],
  ['effects', 'Effets'],
  ['cancels', 'Cancels'],
  ['assistGain', "Gain d'assist"],
  ['cp', 'CP (maîtrisé)'],
];

function moveRows(m) {
  const variantHeader = m.variants && m.variants.length > 1
    ? `<tr><th></th>${m.variants.map((v) => `<th>${esc(v)}</th>`).join('')}</tr>`
    : '';
  const rows = FIELDS.map(([key, label]) => {
    let val = m[key];
    if (val === undefined || val === null || val === '' ) return '';
    const cells = Array.isArray(val) ? val : [val];
    if (cells.every((c) => c === '' || c === '-')) return '';
    const render = (c, i) => {
      let out = esc(c);
      if (key === 'priority') out = priorityBadge(c);
      if (key === 'startup' || key === 'damage' || key === 'cp' || key === 'exForce') out = `<span class="mono">${esc(c)}</span>`;
      return `<td>${out}</td>`;
    };
    return `<tr><th>${label}</th>${cells.map(render).join('')}</tr>`;
  }).join('');
  return variantHeader + rows;
}

function moveAccordion(m, noteFr, ctx) {
  const startup = Array.isArray(m.startup) ? m.startup[0] : m.startup;
  const prio = Array.isArray(m.priority) ? m.priority[0] : m.priority;
  let shot = '';
  if (m.image && ctx?.moveImages) {
    const fn = decodeURIComponent(m.image.split('/').pop());
    if (ctx.moveImages.has(`${ctx.slug}/${fn}`)) {
      shot = `<img class="mv-shot" src="../assets/moves/${ctx.slug}/${encodeURIComponent(fn)}" alt="Capture in-game : ${esc(m.name || 'coup')}" loading="lazy">`;
    }
  }
  return `<details class="move">
<summary><span class="mv-name">${esc(m.name || 'Coup sans nom')}</span>
<span class="mv-meta">${esc(startup || '')}</span>${priorityBadge(prio)}</summary>
<div class="mv-body">
${shot}
${noteFr ? `<div class="mv-note"><p>${esc(noteFr)}</p></div>` : ''}
${m.rawRows?.length
    ? `<div class="table-scroll"><table class="data"><tr>${m.rawRows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${m.rawRows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`
    : `<div class="table-scroll"><table class="stats">${moveRows(m)}</table></div>`}
</div>
</details>`;
}

const GROUP_LABELS = { ground: 'Au sol', aerial: 'En l’air', followups: 'Followups', main: 'Liste' };

function movesGroup(groupKey, flow, ed, ctx) {
  if (!flow || !flow.moves.length) return '';
  const label = GROUP_LABELS[groupKey] || groupKey;
  const chainRef = groupKey === 'followups'
    ? `<p class="mv-desc">Ces followups se greffent sur les braveries « (One) » — le <a href="#chaines">diagramme des chaînes</a> ci-dessous résume les embranchements.</p>`
    : '';
  return `<h3>${esc(label)}</h3>
${flow.intro ? `<p class="mv-desc">${esc(flow.intro.split('\n')[0])}</p>` : ''}
${chainRef}
${flow.moves.map((m) => moveAccordion(m, ed?.moveNotes?.[m.name], ctx)).join('\n')}`;
}

function chainDiagram(braveryGroups) {
  const fu = braveryGroups?.followups;
  if (!fu || !fu.moves.length) return '';
  const starters = Object.entries(braveryGroups)
    .filter(([k]) => k !== 'followups')
    .flatMap(([, g]) => g.moves.map((m) => m.name))
    .filter((n) => n && /\(One\)/i.test(n));
  if (!starters.length) return '';
  return `<figure class="diagram" id="chaines">
<figcaption>Diagramme des chaînes One → Two</figcaption>
<div class="table-scroll">${chainSvg(starters, fu.moves.map((m) => m.name).filter(Boolean))}</div>
<p class="mv-desc">Chaque bravery « (One) » (à gauche) peut enchaîner sur n'importe quel followup « (Two) » équipé (à droite) — le followup est choisi à l'équipement, pas pendant le combo. Détail de chaque coup dans les accordéons ci-dessus.</p>
</figure>`;
}

function genericTables(tables) {
  return (tables || []).map((t) => {
    if (!t.rows?.length) return '';
    const [head, ...rest] = t.rows;
    return `<div class="table-scroll"><table class="data">
${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}
<tr>${head.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
${rest.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n')}
</table></div>`;
  }).join('\n');
}

const STAT_LABELS = {
  'Name': 'Nom', 'Original game': "Jeu d'origine", 'Base ATK (LV100)': 'ATK de base (LV100)',
  'Base DEF (LV100)': 'DEF de base (LV100)', 'Run Speed': 'Vitesse de course', 'Dash Speed': 'Vitesse de dash',
  'Fall Speed': 'Vitesse de chute', 'Fall Speed Ratio After Dodge': 'Chute après esquive',
  'Fastest BRV': 'BRV la plus rapide', 'Fastest HP': 'HP la plus rapide', '1-Hit HP': 'HP en 1 coup',
  'HP Links': 'HP links', 'Command Block': 'Command block', 'Weapon': 'Armes', 'Armor': 'Armures',
  'Exclusive weapons': 'Armes exclusives', 'Alignment': 'Camp', 'Voice Actor (JP)': 'Doubleur (JP)',
  'Voice Actor (ENG)': 'Doubleur (ENG)',
};

function heroChips(info) {
  if (!info) return '';
  const chips = [];
  const add = (label, val, cls = '') => { if (val) chips.push(`<span class="chip ${cls}">${label} <b>${esc(val)}</b></span>`); };
  add('BRV la + rapide', info['Fastest BRV']);
  add('HP la + rapide', info['Fastest HP']);
  add('Dash', (info['Dash Speed'] || '').split(',')[0]);
  add('ATK', (info['Base ATK (LV100)'] || '').split(' ')[0]);
  add('DEF', (info['Base DEF (LV100)'] || '').split(' ')[0]);
  const oneHit = info['1-Hit HP'];
  if (oneHit) chips.push(`<span class="chip ${/^yes/i.test(oneHit) ? 'ok' : 'no'}">HP 1 coup <b>${/^yes/i.test(oneHit) ? 'Oui' : 'Non'}</b></span>`);
  const links = info['HP Links'];
  if (links) chips.push(`<span class="chip ${/^yes/i.test(links) ? 'ok' : 'no'}">HP links <b>${/^yes/i.test(links) ? 'Oui' : 'Non'}</b></span>`);
  return `<div class="chips">${chips.join('')}</div>`;
}

const SECTIONS_NAV = [
  ['meta', 'Méta'], ['overview', "Vue d'ensemble"], ['moves', 'Coups'], ['unique', 'Mécanique unique'],
  ['gameplan', 'Plan de jeu'], ['matchups', 'Matchups'], ['builds', 'Builds'],
  ['assist', 'Assists'], ['community', 'Tech communautaire'], ['sources', 'Sources'],
];

export function renderGuide({ char, ed, tierEntry, castStats, hasPortrait, moveImages }) {
  const ctx = { slug: char.slug, moveImages };
  const s = char.sections;
  const noEd = !ed;
  const edBanner = noEd ? infoBanner('Contenu éditorial français en cours de rédaction — données brutes ci-dessous.') : '';

  // --- 1. Hero ---
  const hero = `<section class="hero" id="hero">
${hasPortrait ? `<img class="portrait" src="../assets/portraits/${char.slug}.png" alt="Portrait officiel de ${esc(char.name)} dans Dissidia 012 [duodecim]">` : ''}
<div class="hero-id">
<p class="origin">${esc(char.origin)}</p>
<h1>${esc(char.name)}</h1>
${ed?.tagline ? `<p class="tagline">${esc(ed.tagline)}</p>` : ''}
${heroChips(char.infobox)}
</div>
</section>`;

  // --- 2b. Position dans la méta (section dédiée) ---
  // La tierNote éditoriale répète souvent le rang : on retire cette redite.
  const tierNoteClean = (ed?.tierNote || '')
    .replace(/^Class[ée]e?\s[^.]*tier list[^.]*\.\s*/iu, '')
    .replace(/^\d+ᵉ?e?\s+sur\s+30[^.]*\.\s*/iu, '')
    .trim();
  const metaSection = `<section id="meta"><h2>Position dans la méta</h2>
${tierEntry
    ? `<p><span class="badge prio-melee-high">Tier ${esc(tierEntry.tier)}</span> <strong>${tierEntry.rank}ᵉ sur 30</strong> — tier list tournoi 2017 de <a href="https://dissidia.wiki/Tier_List_(Dissidia_012)" rel="external noopener">dissidia.wiki</a> (moitié valeurs de matchups, moitié avis de joueurs experts).</p>`
    : `<p class="mv-desc">Non classé dans la tier list tournoi 2017.</p>`}
${tierNoteClean ? `<p>${esc(tierNoteClean)}</p>` : ''}
</section>`;

  // --- 2. Vue d'ensemble ---
  const statsTable = char.infobox
    ? `<div class="table-scroll"><table class="stats">${Object.entries(char.infobox)
        .map(([k, v]) => `<tr><th>${esc(STAT_LABELS[k] || k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>`
    : banner();
  const forces = ed?.strengths?.length || ed?.weaknesses?.length
    ? `<div class="two-col">
<div class="card strengths"><h3>Forces</h3><ul>${(ed.strengths || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div class="card weaknesses"><h3>Faiblesses</h3><ul>${(ed.weaknesses || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div>` : '';
  const overview = `<section id="overview"><h2>Vue d'ensemble</h2>
${ed?.overview?.length ? paras(ed.overview) : (s.overview?.documented ? edBanner || banner() : banner())}
${forces}
<h3>Stats &amp; vitesses</h3>
${statsTable}
${mobilityChartSvg(char, castStats)}
</section>`;

  // --- 3. Coups ---
  const allMoves = [];
  for (const key of ['bravery', 'hp']) {
    const groups = s[key]?.groups || {};
    for (const g of Object.values(groups)) {
      allMoves.push(...g.moves.map((m) => ({ ...m, cat: key === 'hp' ? 'HP' : 'BRV' })));
    }
  }
  const braveryHtml = s.bravery?.documented
    ? Object.entries(s.bravery.groups).map(([k, g]) => movesGroup(k, g, ed, ctx)).join('\n')
    : banner();
  const hpHtml = s.hp?.documented
    ? Object.entries(s.hp.groups).map(([k, g]) => movesGroup(k, g, ed, ctx)).join('\n')
    : banner();
  const exHtml = s.exMode?.documented
    ? `${ed?.exMode?.summary?.length ? paras(ed.exMode.summary) : edBanner || ''}
${ed?.exMode?.burst ? `<p><strong>EX Burst :</strong> ${esc(ed.exMode.burst)}</p>` : ''}
${genericTables(s.exMode.tables)}`
    : banner();
  const moves = `<section id="moves"><h2>Coups</h2>
${startupChartSvg(allMoves, `Startup des coups de ${char.name}`)}
<h3 style="color:var(--gold)">Braveries</h3>
${braveryHtml}
${chainDiagram(s.bravery?.groups)}
<h3 style="color:var(--gold)">Attaques HP</h3>
${hpHtml}
<h3 style="color:var(--gold)">${esc(s.exMode?.title || 'EX Mode')} &amp; EX Burst</h3>
${exHtml}
</section>`;

  // --- 4. Mécanique unique ---
  const unique = `<section id="unique"><h2>Mécanique unique</h2>
${s.uniqueMechanics?.documented
    ? `${ed?.uniqueMechanics?.intro?.length ? paras(ed.uniqueMechanics.intro) : edBanner || banner()}
${ed?.uniqueMechanics?.details?.length ? `<ul>${ed.uniqueMechanics.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
${genericTables(s.uniqueMechanics.tables)}
${(s.uniqueMechanics.subs || []).map((sub) => genericTables(sub.tables)).join('\n')}`
    : banner(`<a href="${esc(char.url)}" rel="external noopener">Page wiki du personnage</a> — pas de section « Unique Mechanics » dédiée ; le cas échéant, la mécanique du personnage est couverte dans la vue d'ensemble et les coups.`)}
</section>`;

  // --- 5. Plan de jeu & techniques avancées ---
  const combosRaw = s.combos?.documented
    ? [...(s.combos.text || []), ...(s.combos.subs || []).flatMap((x) => x.text)]
    : [];
  const gameplan = `<section id="gameplan"><h2>Plan de jeu &amp; techniques avancées</h2>
${ed?.gameplan?.length ? paras(ed.gameplan) : edBanner || banner()}
${ed?.advancedTech?.length ? `<h3>Techniques spécifiques</h3>${ed.advancedTech.map((t) => `<div class="card"><h3 style="margin-top:0">${esc(t.name)}</h3><p>${esc(t.desc)}</p>${t.video?.url ? `<p class="video-link"><a href="${esc(t.video.url)}" rel="external noopener">▶ ${esc(t.video.title || 'Vidéo de démonstration')}</a>${t.video.author ? ` — ${esc(t.video.author)}` : ''}${t.video.date ? ` (${esc(String(t.video.date))})` : ''}</p>` : ''}</div>`).join('')}` : ''}
${combosRaw.length ? `<details class="move"><summary><span class="mv-name">Combos documentés (notation d'origine, dissidia.wiki)</span></summary><div class="mv-body">${combosRaw.map((c) => `<p class="mono">${esc(c)}</p>`).join('')}</div></details>` : ''}
<p class="mv-desc">Techniques universelles (blodge, dash feint, lock off, dodge punishment) : voir la page <a href="../techniques.html">Techniques &amp; glitches</a>.</p>
</section>`;

  // --- 6. Matchups ---
  const replayUrl = `https://replaytheater.app/?game=d012&c1=${encodeURIComponent(char.name)}`;
  const matchups = `<section id="matchups"><h2>Matchups</h2>
${s.matchups?.documented && ed?.matchups?.summary?.length
    ? paras(ed.matchups.summary)
    : ed?.matchups?.summary?.length
      ? paras(ed.matchups.summary)
      : banner(s.matchups?.sources?.length
          ? `La sous-page <a href="${esc(s.matchups.sources[0])}" rel="external noopener">Matchups du wiki</a> est un squelette vide à ce jour.`
          : `Aucune page de matchups n'existe sur le wiki pour ce personnage.`)}
<p>Vidéos de matchs : <a href="${esc(replayUrl)}" rel="external noopener">Replay Theater — matchs de ${esc(char.name)}</a>.</p>
</section>`;

  // --- 7. Builds ---
  const builds = `<section id="builds"><h2>Builds</h2>
${s.builds?.documented
    ? `${ed?.builds?.philosophy?.length ? paras(ed.builds.philosophy) : edBanner || banner()}
${genericTables(s.builds.tables)}
${(s.builds.subs || []).map((sub) => `${sub.title ? `<h3>${esc(sub.title)}</h3>` : ''}${genericTables(sub.tables)}`).join('\n')}
${ed?.builds?.notes ? `<p class="mv-desc">${esc(ed.builds.notes)}</p>` : ''}`
    : banner()}
</section>`;

  // --- 8. Synergies d'assist ---
  const assist = `<section id="assist"><h2>Synergies d'assist</h2>
${s.assist?.documented || ed?.assist
    ? `${ed?.assist?.asAssist?.length ? `<h3>${esc(char.name)} en tant qu'assist</h3>${paras(ed.assist.asAssist)}` : ''}
${genericTables(s.assist?.tables)}
${ed?.assist?.recommended?.length ? `<h3>Assists recommandées</h3><ul>${ed.assist.recommended.map((a) => `<li><strong>${esc(a.name)}</strong> — ${esc(a.why)}</li>`).join('')}</ul>` : ''}
${!ed?.assist ? edBanner || banner() : ''}`
    : banner()}
</section>`;

  // --- 9. Tech communautaire ---
  const community = `<section id="community"><h2>Tech communautaire</h2>
${ed?.communityTech?.length
    ? ed.communityTech.map((t) => `<div class="card"><h3 style="margin-top:0">${esc(t.title)}${t.date ? ` <span class="badge">${esc(String(t.date))}</span>` : ''}</h3><p>${esc(t.desc)}</p>${t.source ? `<p class="sources-list"><a href="${esc(t.source)}" rel="external noopener">${esc(t.source)}</a></p>` : ''}</div>`).join('')
    : banner('Aucune trouvaille communautaire attribuable relevée dans les sources récupérées pour ce personnage.')}
</section>`;

  // --- 10. Sources ---
  const allSources = [
    char.url,
    ...(s.matchups?.documented ? s.matchups.sources || [] : []),
    ...(char.sources || []),
    ...((ed?.communityTech || []).map((t) => t.source)),
    'https://dissidia.wiki/Tier_List_(Dissidia_012)',
    'https://dissidia.wiki/Tier_List_(Assist)',
  ];
  const sources = `<section id="sources"><h2>Sources</h2>
${sourcesSection(allSources, ed?.limits)}
</section>`;

  const tocLinks = SECTIONS_NAV.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('');
  const body = `<nav class="guide-top" aria-label="Sections du guide"><div class="chips-nav">
<a href="../index.html">← Sélection</a>
${SECTIONS_NAV.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}
</div></nav>
<div class="guide-layout">
<nav class="guide-toc" aria-label="Sommaire"><ol>
<li><a href="../index.html" class="backlink">← Sélection</a></li>
${tocLinks}
</ol></nav>
<main class="guide-main">
${hero}
${metaSection}
${overview}
${moves}
${unique}
${gameplan}
${matchups}
${builds}
${assist}
${community}
${sources}
</main>
</div>
${siteFooter()}`;

  return pageShell({
    title: `${char.name} — Guide Dissidia 012 [duodecim]`,
    description: `Guide compétitif français de ${char.name} dans Dissidia 012 [duodecim] Final Fantasy : frame data, plan de jeu, builds, assists.`,
    cssPath: '../styles/main.css',
    jsPath: null,
    body,
  });
}
