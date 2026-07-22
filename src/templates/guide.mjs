// Template d'un guide personnage — structure imposée §7 du cahier des charges
import {
  esc, banner, infoBanner, paras, priorityBadge, startupChartSvg, mobilityChartSvg,
  chainSvg, sectionSources, sourcesSection, pageShell, siteFooter,
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

// Certaines cellules extraites embarquent la définition d'un terme du glossaire du
// wiki (tooltip « Hitbox » inliné sur sa propre ligne) : on retire les lignes de
// prose longue pour ne garder que la valeur.
const cleanVal = (v) => String(v ?? '').split('\n').filter((l) => !(l.trim().length > 60 && /\.\s*$/.test(l.trim()))).join(' ').trim();
// Valeur multi-variantes concaténée par « || » : premier segment pour l'affichage
// compact (le détail par variante vit dans les sous-fiches).
const firstVal = (v) => { const c = cleanVal(v); return c.includes('||') ? c.split('||')[0].trim() : c; };

function moveRows(m) {
  const variantHeader = m.variants && m.variants.length > 1
    ? `<tr><th></th>${m.variants.map((v) => `<th>${esc(v)}</th>`).join('')}</tr>`
    : '';
  const rows = FIELDS.map(([key, label]) => {
    let val = m[key];
    if (val === undefined || val === null || val === '' ) return '';
    const cells = Array.isArray(val) ? val : [val];
    if (cells.every((c) => c === '' || c === '-')) return '';
    const render = (raw, attr = '') => {
      const c = cleanVal(raw);
      let out = esc(c);
      if (key === 'priority') out = priorityBadge(c);
      if (key === 'startup' || key === 'damage' || key === 'cp' || key === 'exForce') out = `<span class="mono">${esc(c)}</span>`;
      return `<td${attr}>${out}</td>`;
    };
    // Valeur unique dans un tableau à variantes (ex. CP identique pour Switch /
    // On Hand / EX Mode) : elle vaut pour toutes les colonnes, on l'étale.
    if (m.variants && m.variants.length > 1 && cells.length === 1) {
      return `<tr><th>${label}</th>${render(cells[0], ` colspan="${m.variants.length}"`)}</tr>`;
    }
    return `<tr><th>${label}</th>${cells.map((c) => render(c)).join('')}</tr>`;
  }).join('');
  return variantHeader + rows;
}

// Vraies variantes (Switch/On Hand, Normal/EX Mode, niveaux de charge…) par
// opposition aux tableaux mal extraits dont la ligne « variantes » est en fait
// une ligne d'en-tête (Damage multiplier, Startup frame…) : ceux-là gardent le
// rendu en colonnes.
const isRealVariants = (m) => m.variants && m.variants.length > 1 &&
  m.variants.every((v) => !/multiplier|startup|cancel|assist|CP|force|priorit|effect|position|spawn|^type$/i.test(String(v)));

// Un coup à variantes est rendu comme un parent + une sous-fiche par variante,
// sur le modèle des niveaux de charge de Jecht ou des invocations de Yuna.
function variantChildren(m) {
  return m.variants.map((v, i) => {
    const sub = { ...m, variants: null };
    for (const [key] of FIELDS) {
      if (Array.isArray(m[key])) { sub[key] = m[key][i] ?? ''; continue; }
      const c = cleanVal(m[key]);
      if (c.includes('||')) { const parts = c.split('||').map((x) => x.trim()); sub[key] = parts[i] ?? parts[0]; }
    }
    const st = Array.isArray(m.startup) ? (m.startup[i] || '') : cleanVal(sub.startup ?? m.startup);
    const pr = Array.isArray(m.priority) ? m.priority[i] : m.priority;
    return `<details class="move variant" aria-label="${esc(m.name)} — ${esc(v)}">
<summary><span class="mv-name">${esc(v)}</span>
<span class="mv-meta">${esc(st)}</span>${priorityBadge(pr)}</summary>
<div class="mv-body"><div class="table-scroll"><table class="stats">${moveRows(sub)}</table></div></div>
</details>`;
  }).join('\n');
}

function moveAccordion(m, noteFr, ctx, asChild = false) {
  const startup = firstVal(Array.isArray(m.startup) ? m.startup[0] : m.startup);
  const prio = Array.isArray(m.priority) ? m.priority[0] : m.priority;
  let shot = '';
  if (m.image && ctx?.moveImages) {
    const fn = decodeURIComponent(m.image.split('/').pop());
    if (ctx.moveImages.has(`${ctx.slug}/${fn}`)) {
      shot = `<img class="mv-shot" src="../assets/moves/${ctx.slug}/${encodeURIComponent(fn)}" alt="Capture in-game : ${esc(m.name || 'coup')}" loading="lazy">`;
    }
  }
  // Variante (« X — Normal ») rendue en enfant indenté : seul le nom de la
  // variante est affiché, le nom complet reste accessible.
  const displayName = asChild ? m.name.split(' — ').slice(1).join(' — ') : (m.name || 'Coup sans nom');
  return `<details class="move${asChild ? ' variant' : ''}"${asChild ? ` aria-label="${esc(m.name)}"` : ''}>
<summary><span class="mv-name">${esc(displayName)}</span>
<span class="mv-meta">${esc(startup || '')}</span>${priorityBadge(prio)}</summary>
<div class="mv-body">
${shot}
${noteFr ? `<div class="mv-note"><p>${esc(noteFr)}</p></div>` : ''}
${m.rawRows?.length
    ? `<div class="table-scroll"><table class="data"><tr>${m.rawRows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${m.rawRows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`
    : isRealVariants(m)
      ? variantChildren(m)
      : `<div class="table-scroll"><table class="stats">${moveRows(m)}</table></div>`}
${(m.extraTables || []).map((t) => `<div class="table-scroll"><table class="data"><tr>${t.rows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${t.rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}
</div>
</details>`;
}

const GROUP_LABELS = { ground: 'Au sol', aerial: 'En l’air', followups: 'Followups', main: 'Liste' };

function movesGroup(groupKey, flow, ed, ctx, sect = '') {
  if (!flow || !flow.moves.length) return '';
  const label = GROUP_LABELS[groupKey] || groupKey;
  // L'intro brute du wiki (anglaise) n'est plus rendue : la note française
  // éditoriale groupNotes["section/groupe"] la remplace.
  const note = ed?.groupNotes?.[`${sect}/${groupKey}`];
  const chainRef = groupKey === 'followups'
    ? `<p class="mv-desc">Ces followups se greffent sur les braveries « (One) » — le <a href="#chaines">diagramme des chaînes</a> ci-dessous résume les embranchements.</p>`
    : '';
  // Une variante (« X — Normal ») est indentée sous son parent quand le coup
  // qui la précède partage la même base.
  const accordions = flow.moves.map((m, i) => {
    const base = (m.name || '').split(' — ')[0];
    const isVariant = (m.name || '').includes(' — ');
    const prevBase = i > 0 ? (flow.moves[i - 1].name || '').split(' — ')[0] : null;
    const asChild = isVariant && prevBase === base;
    return moveAccordion(m, ed?.moveNotes?.[m.name], ctx, asChild);
  });
  return `<h3>${esc(label)}</h3>
${note ? `<p class="mv-desc">${esc(note)}</p>` : ''}
${chainRef}
${accordions.join('\n')}`;
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

const escBr = (s) => esc(s).replace(/\n/g, '<br>');

function genericTables(tables) {
  return (tables || []).map((t) => {
    if (!t.rows?.length) return '';
    const [head, ...rest] = t.rows;
    return `<div class="table-scroll"><table class="data">
${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}
<tr>${head.map((c) => `<th>${escBr(c)}</th>`).join('')}</tr>
${rest.map((r) => `<tr>${r.map((c) => `<td>${escBr(c)}</td>`).join('')}</tr>`).join('\n')}
</table></div>`;
  }).join('\n');
}

// --- Builds : tableau « moveset équipé » ---
// Le wiki prévoit par build un tableau des coups à équiper (sol / en l'air), mais ne
// le remplit que pour une poignée de personnages ; ailleurs il ne reste que les
// en-têtes. Rendu tel quel, cela donne un tableau vide sur la quasi-totalité des
// fiches. On le rend proprement quand il est rempli, et on le remplace sinon par le
// budget CP du build en regard du coût de chaque coup — de quoi composer soi-même,
// sans rien inventer.
const MOVESET_HEAD = 'Bravery attacks';
const MOVESET_LABELS = { 'Bravery attacks': 'Braveries équipées', 'HP attacks': 'Attaques HP équipées' };
const SLOT_LABELS = { Ground: 'Au sol', Aerial: 'En l’air' };

// « 30 (15) » -> { base: 30, mastered: 15 }
function cpValue(m) {
  const str = String((Array.isArray(m.cp) ? m.cp[0] : m.cp) ?? '');
  const base = str.match(/^(\d+)/);
  if (!base) return null;
  const mastered = str.match(/\((\d+)\)/);
  return { base: parseInt(base[1], 10), mastered: mastered ? parseInt(mastered[1], 10) : null };
}

function movesetTable(rows) {
  const blocks = [];
  let cur = null;
  for (const r of rows) {
    if (r.length === 1 && /attacks$/i.test(r[0])) { cur = { title: r[0], head: null, body: [] }; blocks.push(cur); continue; }
    if (!cur) continue;
    if (!cur.head && r[0] === 'Ground') { cur.head = r; continue; }
    cur.body.push(r);
  }
  return blocks.filter((b) => b.body.length).map((b) => `<div class="table-scroll"><table class="data">
<caption>${esc(MOVESET_LABELS[b.title] || b.title)}</caption>
<tr>${(b.head || ['Ground', 'Aerial']).map((c) => `<th>${esc(SLOT_LABELS[c] || c)}</th>`).join('')}</tr>
${b.body.map((r) => `<tr>${r.map((c) => `<td>${escBr(c)}</td>`).join('')}</tr>`).join('\n')}
</table></div>`).join('\n');
}

// Emplacement d'équipement. Les clés « ground » / « aerial » sont les deux slots
// normaux ; toute autre clé est un nom de rôle ou de forme donné par le wiki
// (« Medic » chez Lightning), qui conditionne l'accès au coup.
const SLOT_NAMES = { ground: 'Au sol', aerial: 'En l’air', main: '—', followups: 'Follow-up', 'Follow-ups': 'Follow-up' };
const ONLY_LABELS = { midair: 'en l’air', ground: 'au sol' };

// Première ligne de context du type « Commando only. » -> condition d'accès au coup.
function onlyCondition(m) {
  const first = String(m.context || '').split('\n')[0].trim();
  const match = first.match(/^(.{1,28}?)\s+only\.?$/i);
  if (!match) return null;
  const raw = match[1].trim();
  return ONLY_LABELS[raw.toLowerCase()] || raw;
}

// `extra` (éditorial) prime sur la clé de groupe : le wiki source range parfois les
// coups par rôle plutôt que par emplacement, et une colonne dédiée dit alors mieux
// les choses. Quand une colonne éditoriale couvre déjà la condition d'accès, on
// n'ajoute pas le suffixe « X uniquement » déduit du context — ce serait redondant.
function slotCell(m, slotOverrides, hasExtraColumns) {
  const override = slotOverrides?.[m.name];
  if (override) return override;
  const slot = SLOT_NAMES[m.groupKey] ?? m.groupKey;
  const only = hasExtraColumns ? null : onlyCondition(m);
  if (!only) return slot;
  return slot === '—' ? `${only} uniquement` : `${slot} · ${only} uniquement`;
}

function cpBudgetPanel(cpTotals, allMoves, opts = {}) {
  const extra = (opts.columns || []).filter((c) => c?.header && c.values);
  const rows = allMoves
    .map((m) => ({
      name: m.name,
      cat: m.cat,
      type: opts.types?.[m.name] || (m.cat === 'HP' ? 'HP' : 'Bravery'),
      slot: slotCell(m, opts.slots, extra.length > 0),
      extra: extra.map((c) => c.values[m.name] || '—'),
      cp: cpValue(m),
    }))
    .filter((x) => x.name && x.cp);
  if (!rows.length) return '';
  rows.sort((a, b) => b.cp.base - a.cp.base || a.name.localeCompare(b.name, 'fr'));

  // Colonnes adaptatives : une colonne dont toutes les valeurs sont identiques (ou
  // vides) n'apprend rien au lecteur et n'est pas rendue.
  const informative = (vals) => new Set(vals.map((v) => String(v ?? '').trim())).size > 1;
  const cols = [
    { th: 'Coup', cell: (r) => esc(r.name), keep: true },
    { th: 'Type', cell: (r) => esc(r.type), vals: rows.map((r) => r.type) },
    { th: 'Où l’équiper', cell: (r) => esc(r.slot), vals: rows.map((r) => r.slot) },
    ...extra.map((c, i) => ({ th: esc(c.header), cell: (r) => esc(r.extra[i]), vals: rows.map((r) => r.extra[i]) })),
    { th: 'CP', cell: (r) => `<span class="mono">${r.cp.base}</span>`, keep: true },
    { th: 'CP maîtrisé', cell: (r) => `<span class="mono">${r.cp.mastered ?? '—'}</span>`, vals: rows.map((r) => r.cp.mastered ?? '') },
  ].filter((c) => c.keep || informative(c.vals));

  const totals = [...new Set(cpTotals.filter(Boolean))];
  const budget = totals.length ? ` — ${totals.join(' / ')} CP disponibles selon le build` : '';
  return `<figure class="diagram">
<figcaption>Composer son moveset : coût en CP des coups${esc(budget)}</figcaption>
<div class="table-scroll"><table class="data">
<tr>${cols.map((c) => `<th>${c.th}</th>`).join('')}</tr>
${rows.map((r) => `<tr>${cols.map((c) => `<td>${c.cell(r)}</td>`).join('')}</tr>`).join('\n')}
</table></div>
<p class="mv-desc">Le wiki laisse vide le tableau des coups équipés de ce ou ces builds : ce moveset n'est pas documenté. À défaut, voici le coût en CP de chaque coup, à mettre en regard du total du build. Les coups les plus chers sont en haut.</p>
${opts.note ? `<p class="mv-note">${esc(opts.note)}</p>` : ''}
${opts.sources?.length ? sectionSources(opts.sources) : ''}
</figure>`;
}

// Parcourt les tableaux de la section builds en mémorisant le total CP du build
// courant, pour l'associer au tableau de moveset qui le suit.
const isEmptyMoveset = (t) => t.rows?.[0]?.[0] === MOVESET_HEAD && t.rows.length <= 4;

// Pré-passe : total CP de chaque build dont le tableau de moveset est vide. Il faut
// les connaître tous avant de rendre, puisque le panneau s'affiche à la place du
// premier tableau vide rencontré — donc avant d'avoir vu les builds suivants.
function collectCpTotals(tableGroups) {
  const totals = [];
  for (const tables of tableGroups) {
    let currentCp = null;
    for (const t of tables || []) {
      if (!t.rows?.length) continue;
      if (t.rows[0][0] === 'Stats') currentCp = t.rows.find((r) => r[0] === 'CP')?.[1] ?? null;
      if (isEmptyMoveset(t) && currentCp) totals.push(currentCp);
    }
  }
  return totals;
}

// Rend les tableaux d'un groupe. Le panneau de repli prend la place du premier
// tableau de moveset vide (ctx.pending), là où le lecteur l'attend ; les suivants
// sont simplement omis pour ne pas répéter la même information.
// Les tables « Substitutes » du wiki portent une colonne Notes en prose anglaise,
// dont le contenu est déjà restitué en français dans l'éditorial des builds : la
// colonne est retirée au rendu.
function dropNotesColumn(t) {
  const i = t.rows?.[0]?.findIndex((c) => String(c).trim() === 'Notes');
  if (i === undefined || i < 0) return t;
  return { ...t, rows: t.rows.map((r) => r.filter((_, k) => k !== i)) };
}

function buildsTables(tables, ctx) {
  return (tables || []).map((t) => {
    if (!t.rows?.length) return '';
    if (t.rows[0][0] !== MOVESET_HEAD) return genericTables([dropNotesColumn(t)]);
    if (t.rows.length > 4) return movesetTable(t.rows);
    if (!ctx.pending) return '';
    const panel = ctx.pending;
    ctx.pending = null;
    return panel;
  }).join('\n');
}

// Loadout documenté par le wiki en prose plutôt qu'en tableau (cas Vaan :
// « Ground: … / Air: … »). L'éditorial le restitue via builds.movesetLoadout et
// on le rend comme un tableau de moveset rempli, à la place du panneau CP.
function loadoutTables(loadout) {
  const block = (caption, part) => {
    if (!part) return '';
    const g = part.ground || [], a = part.aerial || [];
    const rows = Array.from({ length: Math.max(g.length, a.length) }, (_, i) =>
      `<tr><td>${esc(g[i] || '')}</td><td>${esc(a[i] || '')}</td></tr>`).join('\n');
    if (!rows) return '';
    return `<div class="table-scroll"><table class="data">
<caption>${esc(caption)}</caption>
<tr><th>Au sol</th><th>En l’air</th></tr>
${rows}
</table></div>`;
  };
  return `${block('Braveries équipées', loadout.bravery)}
${block('Attaques HP équipées', loadout.hp)}
${loadout.note ? `<p class="mv-desc">${esc(loadout.note)}</p>` : ''}`;
}

function buildsSection(builds, allMoves, opts) {
  const subs = (builds?.subs || []).filter((sub) => sub.text.length || sub.tables.length);
  const groups = [builds?.tables, ...subs.map((s) => s.tables)];
  const totals = collectCpTotals(groups);
  // Le panneau est requis dès qu'un tableau de moveset est vide, même si aucun total
  // CP ne le précède (le budget est alors simplement omis de la légende).
  const needed = groups.some((g) => (g || []).some(isEmptyMoveset));
  const ctx = { pending: needed ? (opts?.loadout ? loadoutTables(opts.loadout) : cpBudgetPanel(totals, allMoves, opts)) : '' };
  const main = buildsTables(builds?.tables, ctx);
  const subsHtml = subs.map((sub) => `${sub.title ? `<h3>${esc(sub.title)}</h3>` : ''}${buildsTables(sub.tables, ctx)}`).join('\n');
  return `${main}\n${subsHtml}`;
}

// Diagramme des Skillchains (Prishe) : starter(s) --nom--> finisher(s)
function isSkillchainTable(t) {
  const head = (t.rows?.[0] || []).map((c) => c.toLowerCase());
  return head.includes('skillchain') && head.includes('starter') && head.includes('finisher');
}

function skillchainDiagram(t) {
  const pills = (cell) => cell.split('\n').map((n) => n.trim()).filter(Boolean)
    .map((n) => `<span class="pill">${esc(n)}</span>`).join('');
  const rows = t.rows.slice(1).map(([name, starter, finisher]) => `<div class="sc-row">
<span class="sc-name">${esc(name)}</span>
<div class="chain">${pills(starter)}<span class="arrow" aria-label="enchaîne vers">→</span>${pills(finisher)}</div>
</div>`).join('\n');
  return `<figure class="diagram" id="skillchains">
<figcaption>Diagramme des Skillchains</figcaption>
${rows}
<p class="mv-desc">Un Skillchain se déclenche en enchaînant un coup de la colonne de gauche (starter) sur un coup de la colonne de droite (finisher) — quand plusieurs pilules sont listées, n'importe laquelle convient.</p>
</figure>`;
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

// Regroupement éditorial des braveries (ex. rôles du Paradigm Shift de Lightning)
function regroupMoves(groups, spec) {
  if (!spec?.length) return groups;
  const all = new Map();
  for (const g of Object.values(groups || {})) g.moves.forEach((m) => m.name && all.set(m.name, m));
  const out = {};
  for (const { title, names } of spec) {
    const moves = names.map((n) => all.get(n)).filter(Boolean);
    names.forEach((n) => all.delete(n));
    if (moves.length) out[title] = { moves, intro: null };
  }
  if (all.size) out['Autres'] = { moves: [...all.values()], intro: null };
  return out;
}

// HP links : attaques HP qui se déclenchent en prolongement d'une bravery.
// Détection par les notes du wiki (« X is …'s HP link », « Branching from ») puis
// rattachement des déclinaisons partageant le même nom de base (A/B/C, ground/midair).
const HP_LINK_RE = /HP link|Branching from/i;
const hpLinkBase = (n) => String(n || '').replace(/ \((ground|midair)\)$/, '').replace(/ [A-F]$/, '');
function splitHpLinks(hpGroups, extraNames) {
  const flagged = new Set((extraNames || []).map(hpLinkBase));
  for (const g of Object.values(hpGroups || {}))
    g.moves.forEach((m) => { if (HP_LINK_RE.test(String(m.notes || '') + String(m.context || ''))) flagged.add(hpLinkBase(m.name)); });
  if (!flagged.size) return { groups: hpGroups, links: [] };
  const groups = {}; const links = [];
  for (const [k, g] of Object.entries(hpGroups || {})) {
    const keep = g.moves.filter((m) => !flagged.has(hpLinkBase(m.name)));
    links.push(...g.moves.filter((m) => flagged.has(hpLinkBase(m.name))));
    if (keep.length) groups[k] = { ...g, moves: keep };
  }
  return { groups, links };
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
  const secSrc = ed?.sourcesBySection || {};
  const overview = `<section id="overview"><h2>Vue d'ensemble</h2>
${ed?.overview?.length ? paras(ed.overview) : (s.overview?.documented ? edBanner || banner() : banner())}
${sectionSources(secSrc.overview)}
${forces}
<h3>Stats &amp; vitesses</h3>
${statsTable}
${mobilityChartSvg(char, castStats)}
</section>`;

  // --- 3. Coups ---
  const allMoves = [];
  for (const key of ['bravery', 'hp']) {
    const groups = s[key]?.groups || {};
    // La clé de groupe porte l'emplacement d'équipement (ground / aerial) ou, pour
    // quelques personnages, le rôle ou la forme qui débloque le coup (« Medic »
    // chez Lightning) : on la conserve pour le panneau de moveset.
    for (const [groupKey, g] of Object.entries(groups)) {
      allMoves.push(...g.moves.map((m) => ({ ...m, cat: key === 'hp' ? 'HP' : 'BRV', groupKey })));
    }
  }
  const braveryGroups = regroupMoves(s.bravery?.groups, ed?.moveRegroup?.bravery);
  const braveryHtml = s.bravery?.documented
    ? Object.entries(braveryGroups).map(([k, g]) => movesGroup(k, g, ed, ctx, 'bravery')).join('\n')
    : banner();
  const { groups: hpGroups, links: hpLinks } = splitHpLinks(s.hp?.groups, ed?.hpLinks);
  const hpHtml = s.hp?.documented
    ? Object.entries(hpGroups).map(([k, g]) => movesGroup(k, g, ed, ctx, 'hp')).join('\n')
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
${hpLinks.length ? `<h3 style="color:var(--gold)">HP links (Bravery → HP)</h3>
<p class="mv-desc">Attaques HP qui se déclenchent en prolongement d'une bravery précise — le « HP link ». Elles s'équipent comme les autres attaques HP.</p>
${ed?.groupNotes?.['hp/links'] ? `<p class="mv-desc">${esc(ed.groupNotes['hp/links'])}</p>` : ''}
${hpLinks.map((m) => moveAccordion(m, ed?.moveNotes?.[m.name], ctx)).join('\n')}` : ''}
<h3 style="color:var(--gold)">${esc(s.exMode?.title || 'EX Mode')} &amp; EX Burst</h3>
${exHtml}
${ed?.specialMoves?.length ? `<h3 style="color:var(--gold)">Coups spéciaux</h3>
<p class="mv-desc">Commandes particulières absentes des listes d'équipement : elles ne coûtent aucun CP et s'activent par une commande dédiée.</p>
${ed.specialMoves.map((sp) => `<details class="move"><summary><span class="mv-name">${esc(sp.name)}</span>
<span class="badge prio-melee-high">Coup spécial</span><span class="mv-meta">${esc(sp.input || '')}</span></summary>
<div class="mv-body"><div class="mv-note"><p>${esc(sp.desc)}</p></div>${sp.source ? sectionSources([sp.source]) : ''}</div>
</details>`).join('\n')}` : ''}
</section>`;

  // --- 4. Mécanique unique ---
  const uniqTables = s.uniqueMechanics?.tables || [];
  const scTables = uniqTables.filter(isSkillchainTable);
  const otherUniqTables = uniqTables.filter((t) => !isSkillchainTable(t));
  // Section rendue seulement si le personnage a une mécanique (wiki ou éditorial) :
  // pas de bloc « rien à signaler » sur les fiches sans mécanique.
  const hasUnique = !!(s.uniqueMechanics?.documented || ed?.uniqueMechanics?.intro?.length);
  const unique = !hasUnique ? '' : `<section id="unique"><h2>Mécanique unique</h2>
${ed?.uniqueMechanics?.intro?.length ? paras(ed.uniqueMechanics.intro) : edBanner || banner()}
${ed?.uniqueMechanics?.details?.length ? `<ul>${ed.uniqueMechanics.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
${s.uniqueMechanics?.documented ? `${scTables.map(skillchainDiagram).join('\n')}
${genericTables(otherUniqTables)}
${(s.uniqueMechanics.subs || []).map((sub) => genericTables(sub.tables)).join('\n')}` : ''}
</section>`;

  // --- 5. Plan de jeu & techniques avancées ---
  const combosRaw = s.combos?.documented
    ? [...(s.combos.text || []), ...(s.combos.subs || []).flatMap((x) => x.text)]
    : [];
  const gameplan = `<section id="gameplan"><h2>Plan de jeu &amp; techniques avancées</h2>
${ed?.gameplan?.length ? paras(ed.gameplan) : edBanner || banner()}
${ed?.advancedTech?.length ? `<h3>Techniques spécifiques</h3>${ed.advancedTech.map((t) => `<div class="card"><h3 style="margin-top:0">${esc(t.name)}</h3><p>${esc(t.desc)}</p>${t.video?.url ? `<p class="video-link"><a href="${esc(t.video.url)}" rel="external noopener">▶ ${esc(t.video.title || 'Vidéo de démonstration')}</a>${t.video.author ? ` — ${esc(t.video.author)}` : ''}${t.video.date ? ` (${esc(String(t.video.date))})` : ''}</p>` : ''}${t.source ? sectionSources([t.source]) : ''}</div>`).join('')}` : ''}
${sectionSources(secSrc.gameplan)}
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
${sectionSources(secSrc.matchups)}
<p>Vidéos de matchs : <a href="${esc(replayUrl)}" rel="external noopener">Replay Theater — matchs de ${esc(char.name)}</a>.</p>
</section>`;

  // --- 7. Builds ---
  const builds = `<section id="builds"><h2>Builds</h2>
${s.builds?.documented || ed?.builds?.philosophy?.length
    ? `${ed?.builds?.philosophy?.length ? paras(ed.builds.philosophy) : edBanner || banner()}
${buildsSection(s.builds, allMoves, {
    note: ed?.builds?.movesetNote,
    columns: ed?.builds?.movesetColumns,
    slots: ed?.builds?.movesetSlots,
    types: ed?.builds?.movesetTypes,
    sources: ed?.builds?.movesetSources,
    loadout: ed?.builds?.movesetLoadout,
  })}
${ed?.builds?.notes ? `<p class="mv-desc">${esc(ed.builds.notes)}</p>` : ''}
${sectionSources(secSrc.builds)}`
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
    ...Object.values(secSrc).flat(),
    ...((ed?.advancedTech || []).map((t) => t.source).filter(Boolean)),
    'https://dissidia.wiki/Tier_List_(Dissidia_012)',
    'https://dissidia.wiki/Tier_List_(Assist)',
  ];
  const sources = `<section id="sources"><h2>Sources</h2>
${sourcesSection(allSources, ed?.limits)}
</section>`;

  const nav = SECTIONS_NAV.filter(([id]) => id !== 'unique' || hasUnique);
  const tocLinks = nav.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('');
  const body = `<nav class="guide-top" aria-label="Sections du guide"><div class="chips-nav">
<a href="../index.html">← Sélection</a>
${nav.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}
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
