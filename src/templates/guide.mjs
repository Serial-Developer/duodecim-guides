// Template d'un guide personnage — structure imposée §7 du cahier des charges
import {
  esc, banner, infoBanner, paras, priorityBadge, startupChartSvg, mobilityChartSvg,
  chainSvg, sectionSources, sourcesSection, pageShell, siteHeader, siteFooter, linkRoster,
  linksFor, ordinal,
} from './helpers.mjs';
import { ldArticle } from './jsonld.mjs';
import { buildCard } from './build-card.mjs';
import { shareCode } from '../../scripts/wiki-builds.mjs';
import { isHeaderRow, duplicatesHeaderRow, isTableTitle, isOrphanRow } from '../../scripts/move-shape.mjs';

// Champs d'un coup, dans l'ordre d'affichage. Les clés sont celles des données
// extraites ; les libellés viennent du catalogue de la locale.
const FIELD_KEYS = ['damage', 'startup', 'type', 'priority', 'exForce', 'effects', 'cancels', 'assistGain', 'cp'];

// Certaines cellules extraites embarquent la définition d'un terme du glossaire du
// wiki (tooltip « Hitbox » inliné sur sa propre ligne) : on retire les lignes de
// prose longue pour ne garder que la valeur.
const cleanVal = (v) => String(v ?? '').split('\n').filter((l) => !(l.trim().length > 60 && /\.\s*$/.test(l.trim()))).join(' ').trim();
// Valeur multi-variantes concaténée par « || » : premier segment pour l'affichage
// compact (le détail par variante vit dans les sous-fiches).
const firstVal = (v) => { const c = cleanVal(v); return c.includes('||') ? c.split('||')[0].trim() : c; };

function moveRows(t, m) {
  const labels = t.table('guide.fields');
  const variantHeader = m.variants && m.variants.length > 1
    ? `<tr><th></th>${m.variants.map((v) => `<th>${esc(v)}</th>`).join('')}</tr>`
    : '';
  const rows = FIELD_KEYS.map((key) => {
    const label = labels[key];
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
function variantChildren(t, m) {
  return m.variants.map((v, i) => {
    const sub = { ...m, variants: null };
    for (const key of FIELD_KEYS) {
      if (Array.isArray(m[key])) { sub[key] = m[key][i] ?? ''; continue; }
      const c = cleanVal(m[key]);
      if (c.includes('||')) { const parts = c.split('||').map((x) => x.trim()); sub[key] = parts[i] ?? parts[0]; }
    }
    const st = Array.isArray(m.startup) ? (m.startup[i] || '') : cleanVal(sub.startup ?? m.startup);
    const pr = Array.isArray(m.priority) ? m.priority[i] : m.priority;
    return `<details class="move variant" aria-label="${esc(m.name)} — ${esc(v)}">
<summary><span class="mv-name">${esc(v)}</span>
<span class="mv-meta">${esc(st)}</span>${priorityBadge(pr)}</summary>
<div class="mv-body"><div class="table-scroll"><table class="stats">${moveRows(t, sub)}</table></div></div>
</details>`;
  }).join('\n');
}

function moveAccordion(t, m, note, ctx, asChild = false) {
  const startup = firstVal(Array.isArray(m.startup) ? m.startup[0] : m.startup);
  const prio = Array.isArray(m.priority) ? m.priority[0] : m.priority;
  let shot = '';
  if (m.image && ctx?.moveImages) {
    const fn = decodeURIComponent(m.image.split('/').pop());
    if (ctx.moveImages.has(`${ctx.slug}/${fn}`)) {
      const dim = ctx.sizeOf ? ctx.sizeOf(`moves/${ctx.slug}/${fn}`) : '';
      const alt = t('guide.moves.screenshotAlt', { name: m.name || t('guide.moves.screenshotAltFallback') });
      shot = `<img class="mv-shot" src="${ctx.L.asset(`assets/moves/${ctx.slug}/${encodeURIComponent(fn)}`)}" alt="${esc(alt)}"${dim} loading="lazy">`;
    }
  }
  // Variante (« X — Normal ») rendue en enfant indenté : seul le nom de la
  // variante est affiché, le nom complet reste accessible.
  const displayName = asChild ? m.name.split(' — ').slice(1).join(' — ') : (m.name || t('guide.moves.unnamed'));
  return `<details class="move${asChild ? ' variant' : ''}"${asChild ? ` aria-label="${esc(m.name)}"` : ''}>
<summary><span class="mv-name">${esc(displayName)}</span>
<span class="mv-meta">${esc(startup || '')}</span>${priorityBadge(prio)}</summary>
<div class="mv-body">
${shot}
${note ? `<div class="mv-note"><p>${esc(note)}</p></div>` : ''}
${m.rawRows?.length
    ? `<div class="table-scroll"><table class="data"><tr>${m.rawRows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${m.rawRows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`
    : isRealVariants(m)
      ? variantChildren(t, m)
      : `<div class="table-scroll"><table class="stats">${moveRows(t, m)}</table></div>`}
${(m.extraTables || []).map((tb) => `<div class="table-scroll"><table class="data"><tr>${tb.rows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${tb.rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}
</div>
</details>`;
}

function movesGroup(t, groupKey, flow, ed, ctx, sect = '') {
  if (!flow || !flow.moves.length) return '';
  const label = t.table('guide.groupLabels')[groupKey] || groupKey;
  // L'intro brute du wiki (anglaise) n'est plus rendue : la note éditoriale
  // groupNotes["section/groupe"] la remplace.
  const note = ed?.groupNotes?.[`${sect}/${groupKey}`];
  // Le diagramme n'est produit que pour les chaînes nommées « (One) → (Two) » :
  // sans elles (les followups directionnels de Firion, par exemple), le renvoi
  // pointerait vers une ancre inexistante.
  const hasChainDiagram = groupKey === 'followups' && flow.moves.some((m) => /\(Two\)/i.test(m.name || ''));
  const chainRef = hasChainDiagram ? `<p class="mv-desc">${t('guide.moves.chainRef')}</p>` : '';
  // Le wiki intercale des tableaux annexes — les enchaînements de Jecht, sous
  // le titre « 3rd Chain » — dont l'extraction produit à la fois une ligne de
  // titre et une ligne par entrée. Le titre ne chiffre rien : ce n'est pas un
  // coup, et ses entrées font double emploi avec le tableau qu'il porte.
  // S'y ajoutent les lignes d'un tableau annexe dont l'extraction a perdu le
  // titre — le « 2nd Chain » de Jecht : elles suivent un tableau sans en
  // prolonger le nom et sans porter de coût, faute d'être équipables.
  let header = null;
  let titre = null;
  const moves = flow.moves.filter((m, i) => {
    if (isHeaderRow(m)) {
      header = m;
      titre = isTableTitle(flow.moves, i) ? m.name : null;
      return !titre;
    }
    if (duplicatesHeaderRow(header, m)) return false;
    // Une ligne dont le tableau a perdu son titre ne se rattache à rien : elle
    // n'est pas un coup de ce groupe.
    if (isOrphanRow(header, m)) return false;
    // Les lignes d'un tableau-titre le suivent : elles ne sont pas des coups.
    return !titre;
  });
  if (!moves.length) return '';
  // Une variante (« X — Normal ») est indentée sous son parent quand le coup
  // qui la précède partage la même base.
  const accordions = moves.map((m, i) => {
    const base = (m.name || '').split(' — ')[0];
    const isVariant = (m.name || '').includes(' — ');
    const prevBase = i > 0 ? (moves[i - 1].name || '').split(' — ')[0] : null;
    const asChild = isVariant && prevBase === base;
    return moveAccordion(t, m, ed?.moveNotes?.[m.name], ctx, asChild);
  });
  return `<h3>${esc(label)}</h3>
${note ? `<p class="mv-desc">${esc(note)}</p>` : ''}
${chainRef}
${accordions.join('\n')}`;
}

function chainDiagram(t, braveryGroups) {
  const fu = braveryGroups?.followups;
  if (!fu || !fu.moves.length) return '';
  const starters = Object.entries(braveryGroups)
    .filter(([k]) => k !== 'followups')
    .flatMap(([, g]) => g.moves.map((m) => m.name))
    .filter((n) => n && /\(One\)/i.test(n));
  if (!starters.length) return '';
  return `<figure class="diagram" id="chaines">
<figcaption>${esc(t('guide.charts.chainCaption'))}</figcaption>
<div class="table-scroll">${chainSvg(t, starters, fu.moves.map((m) => m.name).filter(Boolean))}</div>
<p class="mv-desc">${t('guide.charts.chainDesc')}</p>
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

// « 30 (15) » -> { base: 30, mastered: 15 }
function cpValue(m) {
  const str = String((Array.isArray(m.cp) ? m.cp[0] : m.cp) ?? '');
  const base = str.match(/^(\d+)/);
  if (!base) return null;
  const mastered = str.match(/\((\d+)\)/);
  return { base: parseInt(base[1], 10), mastered: mastered ? parseInt(mastered[1], 10) : null };
}

function movesetTable(t, rows) {
  const movesetLabels = t.table('guide.movesetLabels');
  const slotLabels = t.table('guide.slotLabels');
  const blocks = [];
  let cur = null;
  for (const r of rows) {
    if (r.length === 1 && /attacks$/i.test(r[0])) { cur = { title: r[0], head: null, body: [] }; blocks.push(cur); continue; }
    if (!cur) continue;
    if (!cur.head && r[0] === 'Ground') { cur.head = r; continue; }
    cur.body.push(r);
  }
  return blocks.filter((b) => b.body.length).map((b) => `<div class="table-scroll"><table class="data">
<caption>${esc(movesetLabels[b.title] || b.title)}</caption>
<tr>${(b.head || ['Ground', 'Aerial']).map((c) => `<th>${esc(slotLabels[c] || c)}</th>`).join('')}</tr>
${b.body.map((r) => `<tr>${r.map((c) => `<td>${escBr(c)}</td>`).join('')}</tr>`).join('\n')}
</table></div>`).join('\n');
}

// Première ligne de context du type « Commando only. » -> condition d'accès au coup.
function onlyCondition(t, m) {
  const first = String(m.context || '').split('\n')[0].trim();
  const match = first.match(/^(.{1,28}?)\s+only\.?$/i);
  if (!match) return null;
  const raw = match[1].trim();
  return t.table('guide.onlyLabels')[raw.toLowerCase()] || raw;
}

// `extra` (éditorial) prime sur la clé de groupe : le wiki source range parfois les
// coups par rôle plutôt que par emplacement, et une colonne dédiée dit alors mieux
// les choses. Quand une colonne éditoriale couvre déjà la condition d'accès, on
// n'ajoute pas le suffixe « X uniquement » déduit du context — ce serait redondant.
//
// Les clés « ground » / « aerial » sont les deux emplacements normaux ; toute autre
// clé est un nom de rôle ou de forme donné par le wiki (« Medic » chez Lightning),
// qui conditionne l'accès au coup.
function slotCell(t, m, slotOverrides, hasExtraColumns) {
  const override = slotOverrides?.[m.name];
  if (override) return override;
  const slotNames = t.table('guide.slotNames');
  const slot = slotNames[m.groupKey] ?? m.groupKey;
  const only = hasExtraColumns ? null : onlyCondition(t, m);
  if (!only) return slot;
  return slot === '—'
    ? t('guide.builds.onlySuffix', { only })
    : t('guide.builds.slotAndOnly', { slot, only });
}

function cpBudgetPanel(t, cpTotals, allMoves, opts = {}) {
  const extra = (opts.columns || []).filter((c) => c?.header && c.values);
  const rows = allMoves
    .map((m) => ({
      name: m.name,
      cat: m.cat,
      type: opts.types?.[m.name] || (m.cat === 'HP' ? t('guide.builds.typeHp') : t('guide.builds.typeBravery')),
      slot: slotCell(t, m, opts.slots, extra.length > 0),
      extra: extra.map((c) => c.values[m.name] || '—'),
      cp: cpValue(m),
    }))
    .filter((x) => x.name && x.cp);
  if (!rows.length) return '';
  rows.sort((a, b) => b.cp.base - a.cp.base || a.name.localeCompare(b.name, t.locale));

  // Colonnes adaptatives : une colonne dont toutes les valeurs sont identiques (ou
  // vides) n'apprend rien au lecteur et n'est pas rendue.
  const informative = (vals) => new Set(vals.map((v) => String(v ?? '').trim())).size > 1;
  const cols = [
    { th: t('guide.builds.colMove'), cell: (r) => esc(r.name), keep: true },
    { th: t('guide.builds.colType'), cell: (r) => esc(r.type), vals: rows.map((r) => r.type) },
    { th: t('guide.builds.colSlot'), cell: (r) => esc(r.slot), vals: rows.map((r) => r.slot) },
    ...extra.map((c, i) => ({ th: esc(c.header), cell: (r) => esc(r.extra[i]), vals: rows.map((r) => r.extra[i]) })),
    { th: t('guide.builds.colCp'), cell: (r) => `<span class="mono">${r.cp.base}</span>`, keep: true },
    { th: t('guide.builds.colCpMastered'), cell: (r) => `<span class="mono">${r.cp.mastered ?? '—'}</span>`, vals: rows.map((r) => r.cp.mastered ?? '') },
  ].filter((c) => c.keep || informative(c.vals));

  const totals = [...new Set(cpTotals.filter(Boolean))];
  const budget = totals.length ? t('guide.builds.cpBudget', { totals: totals.join(' / ') }) : '';
  return `<figure class="diagram">
<figcaption>${esc(t('guide.builds.cpCaption', { budget }))}</figcaption>
<div class="table-scroll"><table class="data">
<tr>${cols.map((c) => `<th>${c.th}</th>`).join('')}</tr>
${rows.map((r) => `<tr>${cols.map((c) => `<td>${c.cell(r)}</td>`).join('')}</tr>`).join('\n')}
</table></div>
<p class="mv-desc">${t('guide.builds.cpDesc')}</p>
${opts.note ? `<p class="mv-note">${esc(opts.note)}</p>` : ''}
${opts.sources?.length ? sectionSources(t, opts.sources) : ''}
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
    for (const tb of tables || []) {
      if (!tb.rows?.length) continue;
      if (tb.rows[0][0] === 'Stats') currentCp = tb.rows.find((r) => r[0] === 'CP')?.[1] ?? null;
      if (isEmptyMoveset(tb) && currentCp) totals.push(currentCp);
    }
  }
  return totals;
}

// Rend les tableaux d'un groupe. Le panneau de repli prend la place du premier
// tableau de moveset vide (ctx.pending), là où le lecteur l'attend ; les suivants
// sont simplement omis pour ne pas répéter la même information.
// Les tables « Substitutes » du wiki portent une colonne Notes en prose anglaise,
// dont le contenu est déjà restitué dans l'éditorial des builds : la colonne est
// retirée au rendu.
function dropNotesColumn(tb) {
  const i = tb.rows?.[0]?.findIndex((c) => String(c).trim() === 'Notes');
  if (i === undefined || i < 0) return tb;
  return { ...tb, rows: tb.rows.map((r) => r.filter((_, k) => k !== i)) };
}

function buildsTables(t, tables, ctx) {
  return (tables || []).map((tb) => {
    if (!tb.rows?.length) return '';
    if (tb.rows[0][0] !== MOVESET_HEAD) return genericTables([dropNotesColumn(tb)]);
    if (tb.rows.length > 4) return movesetTable(t, tb.rows);
    if (!ctx.pending) return '';
    const panel = ctx.pending;
    ctx.pending = null;
    return panel;
  }).join('\n');
}

// Loadout documenté par le wiki en prose plutôt qu'en tableau (cas Vaan :
// « Ground: … / Air: … »). L'éditorial le restitue via builds.movesetLoadout et
// on le rend comme un tableau de moveset rempli, à la place du panneau CP.
function loadoutTables(t, loadout) {
  const slotLabels = t.table('guide.slotLabels');
  const block = (caption, part) => {
    if (!part) return '';
    const g = part.ground || [], a = part.aerial || [];
    const rows = Array.from({ length: Math.max(g.length, a.length) }, (_, i) =>
      `<tr><td>${esc(g[i] || '')}</td><td>${esc(a[i] || '')}</td></tr>`).join('\n');
    if (!rows) return '';
    return `<div class="table-scroll"><table class="data">
<caption>${esc(caption)}</caption>
<tr><th>${esc(slotLabels.Ground)}</th><th>${esc(slotLabels.Aerial)}</th></tr>
${rows}
</table></div>`;
  };
  return `${block(t('guide.builds.loadoutBravery'), loadout.bravery)}
${block(t('guide.builds.loadoutHp'), loadout.hp)}
${loadout.note ? `<p class="mv-desc">${esc(loadout.note)}</p>` : ''}`;
}

// --- Découpage de la section builds en builds distincts ---
// Le wiki présente ses builds dans un tabber : les tableaux se suivent à plat,
// et les noms des onglets survivent dans le texte brut sous la forme
// « |-|Hybrid (Damage)= ». Un nouveau build commence à chaque tableau « Stats ».
//
// Sans ce découpage, une fiche à deux builds affiche les deux descriptions puis
// les deux compositions — le lecteur doit faire l'aller-retour pour savoir de
// quel build on lui parle.
const BUILD_START = (tb) => tb.rows?.[0]?.[0] === 'Stats';
// Onglet resté à l'état de gabarit sur le wiki : « Build #2 », « build 3 »,
// « build 2=\nadd build here ». Il ne correspond à aucun tableau.
const EMPTY_TAB = /^build\s*#?\s*\d+\s*$/i;

function splitBuilds(builds) {
  const tables = builds?.tables || [];
  const groups = [];
  for (const tb of tables) {
    if (BUILD_START(tb) || !groups.length) groups.push({ name: null, tables: [] });
    groups[groups.length - 1].tables.push(tb);
  }
  // Noms d'onglets, dans l'ordre, gabarits vides écartés.
  const names = (builds?.text || [])
    .map((x) => String(x).trim())
    .filter((x) => x.startsWith('|-|'))
    .map((x) => x.replace(/^\|-\|/, '').replace(/=[\s\S]*$/, '').trim())
    .filter((x) => x && !EMPTY_TAB.test(x) && !/add build here/i.test(x));
  // On ne nomme que si le compte concorde : un décalage attribuerait à un build
  // le nom d'un autre, ce qui est pire que pas de nom du tout.
  if (names.length === groups.length) groups.forEach((g, i) => { g.name = names[i]; });
  return groups;
}

function buildsSection(t, builds, allMoves, opts) {
  // Un sous-bloc n'est retenu que s'il porte un contenu qui lui est propre. Sa
  // prose est celle du wiki, que la fiche ne rend pas (l'éditorial la remplace,
  // comme partout ailleurs) ; et un tableau de moveset laissé vide par le wiki
  // n'est pas un contenu — c'est un emplacement que le panneau des coûts en CP
  // vient occuper, panneau qui décrit la page entière et non ce bloc-là.
  // Sans ces deux exclusions, « Build Overview », « CP Allocation » et les
  // « Attacks » s'affichaient en titres vides ou coiffaient un tableau de CP
  // qu'ils ne décrivaient pas.
  const aDuContenu = (tb) => tb.rows?.length && !isEmptyMoveset(tb);
  const subs = (builds?.subs || []).filter((sub) => sub.tables.some(aDuContenu));
  const groups = [builds?.tables, ...subs.map((s) => s.tables)];
  const totals = collectCpTotals(groups);
  // Le panneau est requis dès qu'un tableau de moveset est vide, même si aucun total
  // CP ne le précède (le budget est alors simplement omis de la légende).
  const needed = groups.some((g) => (g || []).some(isEmptyMoveset));
  // Le panneau des coûts en CP occupait la place du tableau de moveset vide :
  // la carte porte désormais les coups du build et sa capacité, il fait double
  // emploi. Le relevé rédigé de l'éditorial (`movesetLoadout`) reste, lui : il
  // dit ce que le tableau du wiki taisait.
  const ctx = { pending: needed && opts?.loadout ? loadoutTables(t, opts.loadout) : '' };

  // Tous les builds passent par le même rendu, y compris quand il n'y en a
  // qu'un : sans cela le premier build n'avait pas de titre — la prose
  // enchaînait sur son tableau de stats — alors que les suivants, portés par
  // des sous-blocs, en avaient un. Le lecteur ne voyait pas où il commençait.
  const builtGroups = splitBuilds(builds);
  // La composition du build est désormais portée par sa carte : les tableaux
  // « Equipment » et « Bravery attacks » qu'elle reprend disparaissent, celui
  // des stats reste — ce sont les chiffres que la source annonce, que la carte
  // statique n'affiche pas.
  // Le tableau des stats les rejoint : sept valeurs n'ont pas besoin de toute
  // la largeur, et à côté de la carte elles se lisent avec elle.
  const REPRIS = new Set(['Equipment', 'Bravery attacks', 'Stats']);
  const avecCartes = !!opts?.cards?.length;
  const sansCarte = (tables) => (avecCartes ? tables.filter((tb) => !(tb.rows?.[0]?.length === 1 && REPRIS.has(tb.rows[0][0]))) : tables);
  const statsDe = (tables) => (tables || []).find((tb) => tb.rows?.[0]?.length === 1 && tb.rows[0][0] === 'Stats');
  const main = builtGroups.map((g, i) => {
    const desc = g.name ? opts?.perBuild?.[g.name] : null;
    // Le wiki ne nomme pas toujours son onglet (Firion). Plutôt que d'inventer
    // un nom, on numérote : le lecteur voit où le build commence, et rien n'est
    // affirmé sur ce qu'il est.
    const titre = g.name || (builtGroups.length > 1
      ? t('guide.builds.unnamedNumbered', { n: i + 1 })
      : t('guide.builds.unnamed'));
    return `<h3>${esc(titre)}</h3>
${desc?.length ? paras(desc) : ''}
${opts?.cards?.[i] ? `<div class="mv-card-row">${opts.cards[i]}<div class="mv-card-stats">${statsDe(g.tables) ? genericTables([statsDe(g.tables)]) : ''}${opts.cardLinks?.[i] ? `<p class="mv-card-open"><a class="bc-btn" href="${esc(opts.cardLinks[i])}">${esc(t('guide.builds.openInCreator'))}</a></p>` : ''}</div></div>` : ''}
${buildsTables(t, sansCarte(g.tables), ctx)}`;
  }).join('\n');

  // Un build peut arriver par un sous-bloc plutôt que par un groupe de tableaux
  // (le wiki n'est pas régulier là-dessus) : il reçoit alors sa description
  // éditoriale comme les autres, par le même `perBuild`, sans quoi seuls les
  // builds du premier type en auraient une.
  const subsHtml = subs.map((sub) => {
    const desc = sub.title ? opts?.perBuild?.[sub.title] : null;
    return `${sub.title ? `<h3>${esc(sub.title)}</h3>` : ''}
${desc?.length ? paras(desc) : ''}
${buildsTables(t, sub.tables, ctx)}`;
  }).join('\n');
  // Le panneau des coûts en CP prend normalement la place du premier tableau de
  // moveset vide. Si aucun n'a subsisté dans un bloc affiché, il se place en fin
  // de section : il porte sa propre légende et n'a pas besoin d'un titre hôte.
  const orphelin = ctx.pending || '';
  ctx.pending = null;
  return `${main}\n${subsHtml}\n${orphelin}\n${communityBuilds(t, opts?.community)}`;
}

// Builds relevés hors du wiki — guides et fils de forum. Ils n'ont pas de
// tableau : la source ne donne que de la prose. Chacun porte son nom et son
// auteur, plutôt que d'être noyé dans l'introduction de la section.
function communityBuilds(t, community) {
  const list = community?.builds || [];
  if (!list.length) return '';
  const blocs = list.map((b) => {
    // Le nom vient de la source ; sans lui on ne rend rien plutôt que
    // d'improviser un titre.
    if (!b.name) return '';
    const credit = b.source
      ? ` <span class="mv-meta">— ${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="external noopener">${esc(b.source)}</a>` : esc(b.source)}</span>`
      : '';
    return `<h4>${esc(b.name)}${credit}</h4>
${paras(b.text || [])}`;
  }).filter(Boolean).join('\n');
  if (!blocs) return '';
  return `<h3>${esc(t('guide.builds.communityTitle'))}</h3>
${community.intro?.length ? paras(community.intro) : ''}
${blocs}`;
}

// Diagramme des Skillchains (Prishe) : starter(s) --nom--> finisher(s)
function isSkillchainTable(tb) {
  const head = (tb.rows?.[0] || []).map((c) => c.toLowerCase());
  return head.includes('skillchain') && head.includes('starter') && head.includes('finisher');
}

function skillchainDiagram(t, tb) {
  const pills = (cell) => cell.split('\n').map((n) => n.trim()).filter(Boolean)
    .map((n) => `<span class="pill">${esc(n)}</span>`).join('');
  const rows = tb.rows.slice(1).map(([name, starter, finisher]) => `<div class="sc-row">
<span class="sc-name">${esc(name)}</span>
<div class="chain">${pills(starter)}<span class="arrow" aria-label="${esc(t('guide.charts.chainArrowAria'))}">→</span>${pills(finisher)}</div>
</div>`).join('\n');
  return `<figure class="diagram" id="skillchains">
<figcaption>${esc(t('guide.charts.skillchainCaption'))}</figcaption>
${rows}
<p class="mv-desc">${t('guide.charts.skillchainDesc')}</p>
</figure>`;
}

function heroChips(t, info) {
  if (!info) return '';
  const chips = [];
  const add = (label, val, cls = '') => { if (val) chips.push(`<span class="chip ${cls}">${label} <b>${esc(val)}</b></span>`); };
  const yes = t('guide.chips.yes'), no = t('guide.chips.no');
  add(t('guide.chips.fastestBrv'), info['Fastest BRV']);
  add(t('guide.chips.fastestHp'), info['Fastest HP']);
  add(t('guide.chips.dash'), (info['Dash Speed'] || '').split(',')[0]);
  add(t('guide.chips.atk'), (info['Base ATK (LV100)'] || '').split(' ')[0]);
  add(t('guide.chips.def'), (info['Base DEF (LV100)'] || '').split(' ')[0]);
  const oneHit = info['1-Hit HP'];
  if (oneHit) chips.push(`<span class="chip ${/^yes/i.test(oneHit) ? 'ok' : 'no'}">${t('guide.chips.oneHitHp')} <b>${/^yes/i.test(oneHit) ? yes : no}</b></span>`);
  const links = info['HP Links'];
  if (links) chips.push(`<span class="chip ${/^yes/i.test(links) ? 'ok' : 'no'}">${t('guide.chips.hpLinks')} <b>${/^yes/i.test(links) ? yes : no}</b></span>`);
  return `<div class="chips">${chips.join('')}</div>`;
}

// Regroupement éditorial des braveries (ex. rôles du Paradigm Shift de Lightning)
function regroupMoves(t, groups, spec) {
  if (!spec?.length) return groups;
  const all = new Map();
  for (const g of Object.values(groups || {})) g.moves.forEach((m) => m.name && all.set(m.name, m));
  const out = {};
  for (const { title, names } of spec) {
    const moves = names.map((n) => all.get(n)).filter(Boolean);
    names.forEach((n) => all.delete(n));
    if (moves.length) out[title] = { moves, intro: null };
  }
  if (all.size) out[t('guide.moves.othersGroup')] = { moves: [...all.values()], intro: null };
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

// --- Métadonnées de référencement ---
// Composées exclusivement depuis les champs déjà rédigés (`archetype`,
// `tagline`) et le tier réel : aucun fait n'est ajouté ici. Les expressions
// visées (« guide <perso> Dissidia 012 », « builds », « matchups ») sont dans
// la formulation naturelle, pas accumulées.

// Le title complet dépasse la largeur affichée par Google pour les noms longs :
// « [duodecim] » est alors retiré, le reste est identique.
const TITLE_BUDGET = 65;
export function guideTitle(t, name, isAssist) {
  // Une fiche assist n'a ni builds ni matchups : annoncer le contraire dans le
  // title promettrait un contenu absent de la page.
  const what = isAssist ? t('guide.seo.titleAssist') : t('guide.seo.titleGuide');
  const tail = isAssist ? t('guide.seo.titleTailAssist') : t('guide.seo.titleTailGuide');
  const full = t('guide.seo.titleFull', { name, what, tail });
  return full.length <= TITLE_BUDGET ? full : t('guide.seo.titleShort', { name, what, tail });
}

// Minuscule initiale de l'archétype pour l'insérer dans une phrase (tous les
// archétypes commencent par un nom commun : « Rushdown », « Zoneur »…).
const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

const DESC_BUDGET = 170;
export function guideDescription(t, { name, archetype, tier, isAssist }) {
  if (isAssist) {
    const lead = t('guide.seo.descAssistLead', { name });
    const keys = t('guide.seo.descAssistKeys');
    const d = `${lead}, ${lower1(archetype || '')}${keys}`;
    return archetype && d.length <= DESC_BUDGET ? d : lead + keys;
  }
  const who = tier ? t('guide.seo.descGuideWhoTier', { name, tier }) : name;
  // Le séparateur porte sa propre ponctuation : le français exige une espace
  // avant le deux-points, l'anglais la proscrit.
  const arche = archetype ? `${t('guide.seo.descArchetypeSep')}${lower1(archetype)}` : '';
  const lead = t('guide.seo.descGuideLead', { who });
  const keys = t('guide.seo.descGuideKeys');
  const d = lead + arche + keys;
  if (d.length <= DESC_BUDGET) return d;
  const noTier = t('guide.seo.descGuideLead', { who: name }) + arche + keys;
  return noTier.length <= DESC_BUDGET ? noTier : lead + keys;
}

// Ancres des sections : identiques dans toutes les langues, pour qu'un lien
// profond partagé (…#matchups) ouvre la bonne section quelle que soit la version.
const SECTION_IDS = ['meta', 'overview', 'unlock', 'moves', 'unique', 'gameplan', 'matchups', 'builds', 'assist', 'community', 'sources'];

export function renderGuide({
  char, ed, tierEntry, castStats, hasPortrait, moveImages, sizeOf, dates, ogImage,
  roster = [], t, locale, path, alternates, availability, buildCards = [], cardData = null,
}) {
  const L = linksFor(path, locale, availability);
  const ctx = { slug: char.slug, moveImages, sizeOf, L };
  const s = char.sections;
  // Personnage assist (non contrôlable) : pas de stats de déplacement, pas
  // d'EX Mode/EX Burst, pas de matchups — ces sections sont omises.
  const isAssist = char.slug === 'aerith';
  const noEd = !ed;
  const edBanner = noEd ? infoBanner(t('common.editorialPending')) : '';

  // --- 1. Hero ---
  // Texte alternatif du portrait. Deux exigences :
  //  - l'élision en français (« portrait d'Exdeath », pas « de Exdeath ») ;
  //  - dire ce que l'image montre réellement. Les 31 portraits sont les rendus
  //    de l'écran de sélection de Dissidia 012 ; Aerith, non jouable, n'en a
  //    aucun (vérifié dans l'index d'archives), le sien est son artwork Final
  //    Fantasy VII — l'annoncer « portrait Dissidia 012 » serait faux.
  // « y » est volontairement exclu : devant un Y semi-consonne le français ne
  // fait pas l'élision — on écrit « portrait de Yuna », jamais « d'Yuna ».
  const dus = (n) => (/^[aeiouàâäéèêëîïôöùûü]/i.test(n) ? `d’${n}` : `de ${n}`);
  const portraitAlt = char.slug === 'aerith'
    ? t('guide.portraitAltAerith')
    : t('guide.portraitAlt', { of: locale === 'fr' ? dus(char.name) : char.name });
  const hero = `<section class="hero" id="hero">
${hasPortrait ? `<img class="portrait" src="${L.asset(`assets/portraits/${char.slug}.png`)}" alt="${esc(portraitAlt)}"${sizeOf ? sizeOf(`portraits/${char.slug}.png`) : ''}>` : ''}
<div class="hero-id">
<p class="origin">${esc(char.origin)}</p>
<h1>${esc(char.name)}</h1>
${ed?.tagline ? `<p class="tagline">${esc(ed.tagline)}</p>` : ''}
${heroChips(t, char.infobox)}
</div>
</section>`;

  // --- 2b. Position dans la méta (section dédiée) ---
  // La tierNote éditoriale répète souvent le rang : on retire cette redite.
  const tierNoteClean = (ed?.tierNote || '')
    .replace(/^Class[ée]e?\s[^.]*tier list[^.]*\.\s*/iu, '')
    .replace(/^\d+ᵉ?e?\s+sur\s+30[^.]*\.\s*/iu, '')
    .trim();
  const metaSection = `<section id="meta"><h2>${t('guide.headings.meta')}</h2>
${tierEntry
    ? `<p><span class="badge prio-melee-high">${esc(t('guide.meta.tierBadge', { tier: tierEntry.tier }))}</span> <strong>${esc(t('guide.meta.rank', { rank: ordinal(t, tierEntry.rank) }))}</strong> ${t('guide.meta.tierListNote')}</p>`
    : `<p class="mv-desc">${t('guide.meta.unranked')}</p>`}
${tierNoteClean ? `<p>${esc(tierNoteClean)}</p>` : ''}
</section>`;

  // --- 2. Vue d'ensemble ---
  const statLabels = t.table('guide.statLabels');
  const statsTable = char.infobox
    ? `<div class="table-scroll"><table class="stats">${Object.entries(char.infobox)
        .map(([k, v]) => `<tr><th>${esc(statLabels[k] || k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>`
    : banner(t);
  const forces = ed?.strengths?.length || ed?.weaknesses?.length
    ? `<div class="two-col">
<div class="card strengths"><h3>${t('guide.headings.strengths')}</h3><ul>${(ed.strengths || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div class="card weaknesses"><h3>${t('guide.headings.weaknesses')}</h3><ul>${(ed.weaknesses || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div>` : '';
  const secSrc = ed?.sourcesBySection || {};
  const overview = `<section id="overview"><h2>${t('guide.headings.overview')}</h2>
${ed?.overview?.length ? paras(ed.overview) : (s.overview?.documented ? edBanner || banner(t) : banner(t))}
${sectionSources(t, secSrc.overview)}
${forces}
${isAssist ? '' : `<h3>${t('guide.headings.statsSpeeds')}</h3>
${statsTable}
${mobilityChartSvg(t, char, castStats)}`}
</section>`;

  // --- 2 bis. Déblocage (éditorial ; Aerith : DLC lié à Prologus) ---
  const unlockSec = ed?.unlock ? `<section id="unlock"><h2>${esc(ed.unlock.title || t('guide.headings.unlockDefault', { name: char.name }))}</h2>
${paras(ed.unlock.intro)}
${(ed.unlock.versions || []).map((v) => `<article class="card"><h3 style="margin-top:0">${esc(v.name)}</h3>
${paras(v.intro)}
${v.points?.length ? `<ul>${v.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</article>`).join('\n')}
${ed.unlock.note ? `<p class="mv-desc">${esc(ed.unlock.note)}</p>` : ''}
</section>` : '';

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
  const braveryGroups = regroupMoves(t, s.bravery?.groups, ed?.moveRegroup?.bravery);
  const braveryHtml = s.bravery?.documented
    ? Object.entries(braveryGroups).map(([k, g]) => movesGroup(t, k, g, ed, ctx, 'bravery')).join('\n')
    : banner(t);
  const { groups: hpGroups, links: hpLinks } = splitHpLinks(s.hp?.groups, ed?.hpLinks);
  const hpHtml = s.hp?.documented
    ? Object.entries(hpGroups).map(([k, g]) => movesGroup(t, k, g, ed, ctx, 'hp')).join('\n')
    : banner(t);
  const exHtml = s.exMode?.documented
    ? `${ed?.exMode?.summary?.length ? paras(ed.exMode.summary) : edBanner || ''}
${ed?.exMode?.burst ? `<p><strong>EX Burst :</strong> ${esc(ed.exMode.burst)}</p>` : ''}
${genericTables(s.exMode.tables)}`
    : banner(t);
  const moves = `<section id="moves"><h2>${t('guide.headings.moves')}</h2>
${startupChartSvg(t, allMoves, t('guide.charts.startupTitle', { name: char.name }))}
<h3 style="color:var(--gold)">${t('guide.headings.braveries')}</h3>
${braveryHtml}
${chainDiagram(t, s.bravery?.groups)}
<h3 style="color:var(--gold)">${t('guide.headings.hpAttacks')}</h3>
${hpHtml}
${hpLinks.length ? `<h3 style="color:var(--gold)">${t('guide.headings.hpLinks')}</h3>
<p class="mv-desc">${t('guide.moves.hpLinksDesc')}</p>
${ed?.groupNotes?.['hp/links'] ? `<p class="mv-desc">${esc(ed.groupNotes['hp/links'])}</p>` : ''}
${hpLinks.map((m) => moveAccordion(t, m, ed?.moveNotes?.[m.name], ctx)).join('\n')}` : ''}
${isAssist ? '' : `<h3 style="color:var(--gold)">${t('guide.headings.exModeBurst', { exMode: esc(s.exMode?.title || 'EX Mode') })}</h3>
${exHtml}`}
${ed?.specialMoves?.length ? `<h3 style="color:var(--gold)">${t('guide.headings.specialMoves')}</h3>
<p class="mv-desc">${t('guide.moves.specialMovesDesc')}</p>
${ed.specialMoves.map((sp) => `<details class="move"><summary><span class="mv-name">${esc(sp.name)}</span>
<span class="badge prio-melee-high">${t('guide.moves.specialBadge')}</span><span class="mv-meta">${esc(sp.input || '')}</span></summary>
<div class="mv-body"><div class="mv-note"><p>${esc(sp.desc)}</p></div>${sp.source ? sectionSources(t, [sp.source]) : ''}</div>
</details>`).join('\n')}` : ''}
</section>`;

  // --- 4. Mécanique unique ---
  const uniqTables = s.uniqueMechanics?.tables || [];
  const scTables = uniqTables.filter(isSkillchainTable);
  const otherUniqTables = uniqTables.filter((tb) => !isSkillchainTable(tb));
  // Section rendue seulement si le personnage a une mécanique (wiki ou éditorial) :
  // pas de bloc « rien à signaler » sur les fiches sans mécanique.
  const hasUnique = !!(s.uniqueMechanics?.documented || ed?.uniqueMechanics?.intro?.length);
  const unique = !hasUnique ? '' : `<section id="unique"><h2>${t('guide.headings.unique')}</h2>
${ed?.uniqueMechanics?.intro?.length ? paras(ed.uniqueMechanics.intro) : edBanner || banner(t)}
${ed?.uniqueMechanics?.details?.length ? `<ul>${ed.uniqueMechanics.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
${s.uniqueMechanics?.documented ? `${scTables.map((tb) => skillchainDiagram(t, tb)).join('\n')}
${genericTables(otherUniqTables)}
${(s.uniqueMechanics.subs || []).map((sub) => genericTables(sub.tables)).join('\n')}` : ''}
</section>`;

  // --- 5. Plan de jeu & techniques avancées ---
  const combosRaw = s.combos?.documented
    ? [...(s.combos.text || []), ...(s.combos.subs || []).flatMap((x) => x.text)]
    : [];
  const gameplan = `<section id="gameplan"><h2>${t('guide.headings.gameplan')}</h2>
${ed?.gameplan?.length ? paras(ed.gameplan) : edBanner || banner(t)}
${ed?.advancedTech?.length ? `<h3>${t('guide.headings.specificTech')}</h3>${ed.advancedTech.map((x) => `<div class="card"><h3 style="margin-top:0">${esc(x.name)}</h3><p>${esc(x.desc)}</p>${x.video?.url ? `<p class="video-link"><a href="${esc(x.video.url)}" target="_blank" rel="external noopener">▶ ${esc(x.video.title || t('guide.gameplan.videoFallback'))}</a>${x.video.author ? ` — ${esc(x.video.author)}` : ''}${x.video.date ? ` (${esc(String(x.video.date))})` : ''}</p>` : ''}${x.source ? sectionSources(t, [x.source]) : ''}</div>`).join('')}` : ''}
${sectionSources(t, secSrc.gameplan)}
${combosRaw.length ? `<details class="move"><summary><span class="mv-name">${t('guide.gameplan.combosSummary')}</span></summary><div class="mv-body">${combosRaw.map((c) => `<p class="mono">${esc(c)}</p>`).join('')}</div></details>` : ''}
<p class="mv-desc">${t('guide.gameplan.universalTech', { href: L.page('techniques'), langAttr: L.pageLangAttr('techniques') })}</p>
</section>`;

  // --- 6. Matchups ---
  const replayUrl = `https://replaytheater.app/?game=d012&c1=${encodeURIComponent(char.name)}`;
  // Les personnages cités dans les matchups deviennent des liens vers leur
  // guide : c'est là que le lecteur veut naviguer, et cela relie les 31 pages
  // entre elles au lieu de les laisser dépendre de la seule page d'accueil.
  const matchupProse = ed?.matchups?.summary?.length
    ? linkRoster(paras(ed.matchups.summary), { roster, currentSlug: char.slug, hrefFor: L.guide })
    : null;
  const matchups = isAssist ? '' : `<section id="matchups"><h2>${t('guide.headings.matchups')}</h2>
${matchupProse
    ? matchupProse
    : banner(t, s.matchups?.sources?.length
          ? t('guide.matchups.wikiSkeleton', { url: esc(s.matchups.sources[0]) })
          : t('guide.matchups.noWikiPage'))}
${sectionSources(t, secSrc.matchups)}
<p>${t('guide.matchups.replayLink', { url: esc(replayUrl), name: esc(char.name) })}</p>
</section>`;

  // --- 7. Builds ---
  const builds = `<section id="builds"><h2>${t('guide.headings.builds')}</h2>
${s.builds?.documented || ed?.builds?.philosophy?.length
    ? `${ed?.builds?.philosophy?.length ? paras(ed.builds.philosophy) : edBanner || banner(t)}
${buildsSection(t, s.builds, allMoves, {
    note: ed?.builds?.movesetNote,
    columns: ed?.builds?.movesetColumns,
    slots: ed?.builds?.movesetSlots,
    types: ed?.builds?.movesetTypes,
    sources: ed?.builds?.movesetSources,
    loadout: ed?.builds?.movesetLoadout,
    // Description propre à chaque build, indexée par le nom d'onglet du wiki :
    // elle s'affiche juste avant la composition qu'elle commente.
    perBuild: ed?.builds?.perBuild,
    // Builds relevés hors wiki (guides et forums), sans tableau : ils forment
    // leur propre bloc, chacun sous son nom et sa source.
    community: ed?.builds?.community,
    // Une carte par build, rendue par le build : c'est le même composant que le
    // créateur, nourri des identifiants que `wiki-builds.mjs` a résolus.
    // Chaque carte ouvre le créateur préremplie : c'est le même build, porté
    // par le lien de partage que le créateur relit déjà.
    cardLinks: buildCards.map((b) => `${L.page('buildCreator')}?build=${shareCode(b)}`),
    cards: cardData ? buildCards.map((b, i) => `<div class="mv-card-wrap">${buildCard({
      t, build: b, data: cardData, L, sizeOf,
      // Tous les personnages du jeu ont leur portrait, renforts compris.
      hasPortrait: () => true,
      variant: 'portrait-full',
      uid: `${char.slug}-${i}`,
      mastered: true,
      // Chaque build porte déjà un h3 dans la fiche : les panneaux de sa carte
      // se rangent dessous.
      hLevel: 4,
    })}</div>`) : [],
  })}
${ed?.builds?.notes ? `<p class="mv-desc">${esc(ed.builds.notes)}</p>` : ''}
${sectionSources(t, secSrc.builds)}`
    : banner(t)}
<p>${t('guide.builds.creatorLink', { name: esc(char.name), href: L.page('buildCreator'), langAttr: L.pageLangAttr('buildCreator') })}</p>
</section>`;

  // --- 8. Synergies d'assist ---
  const assist = `<section id="assist"><h2>${t('guide.headings.assist')}</h2>
${s.assist?.documented || ed?.assist
    ? `${ed?.assist?.asAssist?.length ? `<h3>${t('guide.headings.asAssist', { name: esc(char.name) })}</h3>${paras(ed.assist.asAssist)}` : ''}
${genericTables(s.assist?.tables)}
${ed?.assist?.recommended?.length ? `<h3>${t('guide.headings.recommendedAssists')}</h3><ul>${ed.assist.recommended.map((a) => `<li><strong>${esc(a.name)}</strong> — ${esc(a.why)}</li>`).join('')}</ul>` : ''}
${!ed?.assist ? edBanner || banner(t) : ''}`
    : banner(t)}
</section>`;

  // --- 9. Tech communautaire ---
  const community = `<section id="community"><h2>${t('guide.headings.community')}</h2>
${ed?.communityTech?.length
    ? ed.communityTech.map((x) => `<div class="card"><h3 style="margin-top:0">${esc(x.title)}${x.date ? ` <span class="badge">${esc(String(x.date))}</span>` : ''}</h3><p>${esc(x.desc)}</p>${x.source ? `<p class="sources-list"><a href="${esc(x.source)}" target="_blank" rel="external noopener">${esc(x.source)}</a></p>` : ''}</div>`).join('')
    : banner(t, t('guide.community.none'))}
</section>`;

  // --- 10. Sources ---
  const allSources = [
    char.url,
    ...(s.matchups?.documented ? s.matchups.sources || [] : []),
    ...(char.sources || []),
    ...((ed?.communityTech || []).map((x) => x.source)),
    ...Object.values(secSrc).flat(),
    ...((ed?.advancedTech || []).map((x) => x.source).filter(Boolean)),
    ...(ed?.unlock?.sources || []),
    'https://dissidia.wiki/Tier_List_(Dissidia_012)',
    'https://dissidia.wiki/Tier_List_(Assist)',
  ];
  const sources = `<section id="sources"><h2>${t('guide.headings.sources')}</h2>
${sourcesSection(t, allSources, ed?.limits)}
</section>`;

  const sectionLabels = t.table('guide.sections');
  const nav = SECTION_IDS
    .filter((id) => id !== 'unique' || hasUnique)
    .filter((id) => id !== 'matchups' || !isAssist)
    .filter((id) => id !== 'unlock' || ed?.unlock)
    .map((id) => [id, sectionLabels[id]]);
  const tocLinks = nav.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('');
  const body = `${siteHeader(t, { path, locale, alternates, availability, active: char.slug === 'aerith' ? 'aerith' : '' })}
<nav class="guide-top" aria-label="${esc(t('guide.navAria'))}"><div class="chips-nav">
<a href="${L.page('home')}">${t('common.backToSelect')}</a>
${nav.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join('')}
</div></nav>
<div class="guide-layout">
<nav class="guide-toc" aria-label="${esc(t('common.tocAria'))}"><ol>
<li><a href="${L.page('home')}" class="backlink">${t('common.backToSelect')}</a></li>
${tocLinks}
</ol></nav>
<main class="guide-main">
${hero}
${metaSection}
${overview}
${unlockSec}
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
${siteFooter(t)}`;

  const title = guideTitle(t, char.name, isAssist);
  const description = guideDescription(t, {
    name: char.name,
    archetype: ed?.archetype,
    tier: tierEntry?.tier,
    isAssist,
  });
  const imageAlt = t('guide.seo.ogAlt', { name: char.name });
  return pageShell({
    t,
    locale,
    title,
    description,
    path,
    alternates,
    jsPath: null,
    body,
    og: ogImage ? { image: ogImage, alt: imageAlt, width: 1200, height: 630, type: 'article' } : { type: 'article' },
    jsonLd: ldArticle({
      type: 'TechArticle',
      headline: title,
      description,
      path,
      locale,
      image: ogImage,
      imageAlt,
      section: isAssist ? t('guide.seo.sectionAssists') : t('guide.seo.sectionGuides'),
      ...dates,
    }),
  });
}
