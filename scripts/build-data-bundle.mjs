// Assemble data/build/*.json + data/characters/*.json en un seul payload client.
//
// Le fichier produit est un script (window.BUILD_DATA = …) et non un JSON à
// fetcher : la page reste consultable en file:// comme le reste du site, et on
// évite une requête supplémentaire.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTERS } from './characters.mjs';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'));

const MOVE_COLS = ['id', 'name', 'cp', 'cpMastered', 'damage', 'startup', 'type', 'priority', 'effects', 'variants', 'style', 'parent'];

// Rapproche « Howling Fist (One) » de « Howling Fists (Two) » : le wiki n'est pas
// constant sur le pluriel, et l'enchaînement doit se rattacher à son coup d'origine.
// Deux formes de `variants` cohabitent dans les données :
//  - de vraies versions d'un même coup (« Normal », « Charged ») : le coup porte
//    alors ses propres dégâts, c'est un coup équipable normal ;
//  - des noms de colonnes (« CP (Mastered) », « Cancels »…) : la ligne n'est
//    qu'un en-tête, et les lignes suivantes sont ses déclinaisons.
// Même critère que src/templates/guide.mjs, pour que les deux rendus concordent.
const COLUMN_LABEL = /multiplier|startup|cancel|assist|CP|force|priorit|effect|position|spawn|^type$|^version$/i;
const isHeaderRow = (m) => Boolean(m.variants && m.variants.length > 1 && m.variants.some((v) => COLUMN_LABEL.test(String(v))));

const followKey = (name) => String(name || '')
  .replace(/\((one|two)\)/ig, '')
  .toLowerCase()
  .replace(/[^a-z ]/g, ' ')
  .split(/\s+/)
  .filter(Boolean)
  .map((w) => w.replace(/s$/, ''))
  .join(' ');
const EQUIP_COLS = ['uid', 'name', 'slot', 'category', 'level', 'stats', 'effects', 'combination', 'exclusiveTo', 'labyrinth', 'documented'];
const ACC_COLS = ['uid', 'name', 'category', 'boosterType', 'effect', 'requirements', 'multiplier', 'acquired', 'rank', 'breakable', 'legal', 'documented', 'ill'];

// « 20 (10) » -> { cp: 20, cpMastered: 10 }. Le wiki écrit parfois « 20 » seul.
function parseMoveCp(raw) {
  if (!raw) return { cp: null, cpMastered: null };
  const m = /^(\d+)\s*(?:\((\d+)\))?/.exec(String(raw).trim());
  if (!m) return { cp: null, cpMastered: null };
  return { cp: Number(m[1]), cpMastered: m[2] === undefined ? null : Number(m[2]) };
}

// Catégories équipables nativement, par personnage : on inverse la table
// « catégorie -> personnages » extraite des intros du Fandom.
function nativeByCharacter(equipment) {
  const out = {};
  const slotOfCategory = {};
  for (const [slot, cats] of Object.entries(equipment.categories)) {
    for (const c of cats) slotOfCategory[c] = slot;
  }
  for (const [category, slugs] of Object.entries(equipment.nativeByCategory)) {
    const slot = slotOfCategory[category];
    if (!slot) continue;
    for (const slug of slugs) {
      out[slug] = out[slug] || { weapon: [], hand: [], head: [], body: [] };
      out[slug][slot].push(category);
    }
  }
  return out;
}

// Les longues listes (équipements, accessoires, coups) répètent les mêmes clés
// des centaines de fois. On les sérialise en colonnes — { c: noms, r: lignes } —
// et le client les réhydrate. Environ 40 % de poids en moins sur ces sections.
function table(items, cols) {
  return {
    c: cols,
    r: items.map((it) => cols.map((k) => (it[k] === undefined || it[k] === '' ? null : it[k]))),
  };
}

// Un HP link est une attaque HP qui se branche sur une bravery. Le jeu l'écrit
// dans la description du coup (« Branching from Launch »), mais le wiki ne
// reprend cette forme que pour une poignée de personnages : le reste est en
// prose libre, non extractible sans risque. Les paires manquantes se déclarent à
// la main dans data/editorial/_build-creator.json.
const HP_LINK_PATTERNS = [
  /Branching from ([^.\[\n]{2,40})/i,
  /HP link from ([^.,\n]{2,40})/i,
];

function extractHpLinks(data, kindGroups) {
  const braveries = [];
  for (const g of kindGroups.bravery || []) for (const m of g.moves) braveries.push(m);
  const links = [];
  for (const g of kindGroups.hp || []) {
    for (const m of g.moves) {
      const raw = data.__notes[m.id] || '';
      for (const re of HP_LINK_PATTERNS) {
        const hit = re.exec(raw);
        if (!hit) continue;
        const cible = hit[1].trim().replace(/^(his|her|the)\s+/i, '');
        const parent = braveries.find((b) => b.name.toLowerCase() === cible.toLowerCase())
          || braveries.find((b) => cible.toLowerCase().indexOf(b.name.toLowerCase()) !== -1);
        if (parent) links.push({ from: parent.id, to: m.id, source: 'description du coup sur dissidia.wiki' });
        break;
      }
    }
  }
  return links;
}

export function buildDataBundle(ROOT, editorial = null) {
  const dir = join(ROOT, 'data', 'build');
  const equipment = readJson(join(dir, 'equipment.json'));
  const accessories = readJson(join(dir, 'accessories.json'));
  const abilities = readJson(join(dir, 'abilities.json'));
  const combinations = readJson(join(dir, 'combinations.json'));
  const assists = readJson(join(dir, 'assists.json'));
  const summons = readJson(join(dir, 'summons.json'));
  const ruleset = readJson(join(dir, 'ruleset.json'));
  const capacity = readJson(join(dir, 'capacity.json'));
  const baseStats = readJson(join(dir, 'base-stats.json'));

  const native = nativeByCharacter(equipment);

  const characters = [];
  for (const def of CHARACTERS) {
    const p = join(ROOT, 'data', 'characters', `${def.slug}.json`);
    if (!existsSync(p)) continue;
    const data = readJson(p);

    // Les coups gardent la structure de la page wiki du personnage : les groupes
    // portent les noms du jeu (ground/aerial, mais aussi « Medic » chez Lightning
    // ou « followups » chez Prishe).
    const attacks = {};
    const rawGroups = {};
    const notesById = {};
    for (const kind of ['bravery', 'hp']) {
      const section = data.sections?.[kind];
      if (!section?.groups) continue;
      const groups = [];
      for (const [key, group] of Object.entries(section.groups)) {
        // Le wiki présente certains coups comme un en-tête (`variants` porte les
        // colonnes d'un sous-tableau) suivi de ses déclinaisons. L'unité équipable
        // est l'en-tête ; les lignes suivantes le détaillent. Sans cette lecture,
        // deux déclinaisons homonymes de parents différents entrent en collision
        // (Jecht : « Ground (Up) » sous Jecht Block et sous 3rd Chain).
        const moves = [];
        let parent = null;
        for (const m of group.moves || []) {
          if (!m.name) continue;
          const cp = parseMoveCp(m.cp);
          if (isHeaderRow(m)) {
            parent = {
              id: `${kind}:${key}:${m.name}`,
              name: m.name,
              ...cp,
              damage: m.damage || '',
              startup: m.startup || '',
              type: m.type || '',
              priority: m.priority || '',
              effects: m.effects || '',
              variants: [],
            };
            moves.push(parent);
            continue;
          }
          if (parent) {
            // Le coût du coup est parfois porté par sa première déclinaison.
            if (parent.cp == null && cp.cp != null) { parent.cp = cp.cp; parent.cpMastered = cp.cpMastered; }
            parent.variants.push([m.name, m.damage || '', m.startup || ''].join(' · ').replace(/( · )+$/, ''));
            continue;
          }
          const id = `${kind}:${key}:${m.name}`;
          notesById[id] = (m.notes || '') + ' ' + (m.context || '');
          moves.push({
            id,
            name: m.name,
            ...cp,
            damage: m.damage || '',
            startup: m.startup || '',
            type: m.type || '',
            priority: m.priority || '',
            effects: m.effects || '',
            variants: [],
            style: m.style || null,
          });
        }
        for (const m of moves) m.variants = m.variants.length ? m.variants.join(' | ') : '';
        // L'intro n'est affichée qu'en première ligne : inutile d'embarquer la suite.
        const intro = group.intro ? group.intro.split('\n')[0].slice(0, 260) : null;
        if (moves.length) groups.push({ key, intro, moves, followUp: /^follow-?ups?$/i.test(key) });
      }

      // Un groupe nommé qui cohabite avec « Ground » et « Aerial » est un
      // paradigme, pas une posture : ses coups s'utilisent au sol comme en l'air
      // (le Medic de Lightning). On les verse donc dans les deux postures, où ils
      // occupent leurs propres emplacements.
      const STANCES = ['ground', 'aerial'];
      const hasStances = STANCES.every((s) => groups.some((g) => g.key === s));
      if (hasStances) {
        for (const g of groups.filter((x) => !STANCES.includes(x.key) && x.key !== 'main' && !x.followUp)) {
          for (const stance of STANCES) {
            const target = groups.find((x) => x.key === stance);
            for (const m of g.moves) {
              target.moves.push({ ...m, id: `${kind}:${stance}:${m.name}`, style: g.key });
            }
          }
          g.moves = [];
        }
      }

      // Un enchaînement prolonge un coup et n'occupe pas d'emplacement : quand son
      // nom désigne son origine (« (One) » → « (Two) »), on l'y rattache.
      const parents = new Map();
      for (const g of groups) {
        if (g.followUp) continue;
        for (const m of g.moves) parents.set(followKey(m.name), m.id);
      }
      for (const g of groups) {
        if (!g.followUp) continue;
        for (const m of g.moves) m.parent = parents.get(followKey(m.name)) || null;
      }

      const kept = groups.filter((g) => g.moves.length);
      rawGroups[kind] = kept;
      if (kept.length) attacks[kind] = kept.map((g) => ({ key: g.key, intro: g.intro, followUp: g.followUp, moves: table(g.moves, MOVE_COLS) }));
    }

    // HP links : extraits de la description du coup quand elle les nomme, puis
    // complétés par les paires déclarées à la main.
    const byName = {};
    for (const kind of ['bravery', 'hp']) for (const g of rawGroups[kind] || []) for (const m of g.moves) byName[`${kind}:${m.name.toLowerCase()}`] = m.id;
    const hpLinks = extractHpLinks({ __notes: notesById }, rawGroups);
    for (const decl of (editorial?.hpLinks || {})[def.slug] || []) {
      const from = byName['bravery:' + String(decl.from).toLowerCase()];
      const to = byName['hp:' + String(decl.to).toLowerCase()];
      if (!from) throw new Error(`_build-creator.json : hpLinks[${def.slug}] — bravery inconnue « ${decl.from} »`);
      if (!to) throw new Error(`_build-creator.json : hpLinks[${def.slug}] — attaque HP inconnue « ${decl.to} »`);
      if (!hpLinks.some((l) => l.from === from && l.to === to)) hpLinks.push({ from, to, source: decl.source || 'déclaré dans l’éditorial' });
    }

    characters.push({
      slug: def.slug,
      name: def.name,
      origin: def.origin,
      // Valeur brute de l'infobox : « Yes », « No », « Yes (Combos only) »…
      hpLinks: data.infobox?.['HP Links'] || null,
      // Paires bravery -> attaque HP réellement identifiées ; l'infobox ci-dessus
      // dit seulement si le personnage en a.
      links: hpLinks,
      native: native[def.slug] || { weapon: [], hand: [], head: [], body: [] },
      attacks,
      attacksDocumented: Object.keys(attacks).length > 0,
    });
  }

  const trim = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== '' && o[k] !== null).map((k) => [k, o[k]]));

  // Le payload est servi tel quel au navigateur : on retire ce qui est
  // redistribuable côté client (statsRaw se reformate depuis stats, id se déduit
  // de uid) et on borne la prose que l'interface ne montre que tronquée.
  const cut = (s, n) => (typeof s === 'string' && s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s);

  // Les motifs d'illégalité se répètent sur des dizaines d'items : on les
  // remplace par un code et une légende unique.
  const reasonCodes = new Map();
  const reasonFor = (item) => {
    if (!item.illegalReason) return null;
    if (!reasonCodes.has(item.illegalReason)) reasonCodes.set(item.illegalReason, 'r' + reasonCodes.size);
    return reasonCodes.get(item.illegalReason);
  };
  const accessoriesOut = accessories.items.map((i) => {
    const o = trim(i, ['uid', 'name', 'category', 'boosterType', 'effect', 'requirements', 'multiplier', 'acquired', 'rank', 'breakable', 'legal', 'documented']);
    const code = reasonFor(i);
    if (code) o.ill = code;
    return o;
  });
  const summonsOut = summons.items.map((i) => {
    const o = trim(i, ['id', 'name', 'legal', 'documented']);
    if (i.text) o.text = cut(i.text.split('\n')[0], 320);
    const code = reasonFor(i);
    if (code) o.ill = code;
    return o;
  });
  const illegalReasons = Object.fromEntries([...reasonCodes].map(([text, code]) => [code, text]));

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    capacity: { base: capacity.base, max: capacity.max, quote: capacity.quote, extenders: capacity.extenders, documented: capacity.documented },
    baseStats: { shared: baseStats.shared, byCharacter: baseStats.byCharacter, documented: baseStats.documented },
    ruleset: {
      id: ruleset.id, name: ruleset.name, url: ruleset.sources[0],
      itemRules: ruleset.itemRules.filter((r) => r.quote),
      legalSummons: ruleset.legalSummons,
      prohibitions: ruleset.prohibitions,
    },
    sources: {
      wiki: 'https://dissidia.wiki',
      fandom: 'https://finalfantasy.fandom.com',
      pages: [...new Set([...equipment.sources, ...accessories.sources, ...abilities.sources, ...combinations.sources, ...assists.sources, ...summons.sources, ...ruleset.sources, ...capacity.sources])],
    },
    characters,
    equipmentCategories: equipment.categories,
    illegalReasons,
    equipment: table(equipment.items, EQUIP_COLS),
    accessories: table(accessoriesOut, ACC_COLS),
    // Exclusions mutuelles : paliers dérivés du nommage du wiki + cas déclarés à
    // la main dans l'éditorial (le wiki ne les documente pas).
    abilityExclusions: (function () {
      const byName = new Map();
      for (const g of abilities.groups) for (const a of g.abilities) byName.set(a.name.toLowerCase(), a.id);
      const declared = (editorial?.abilityExclusions || []).map((x, i) => {
        const ids = (x.abilities || []).map((n) => {
          const id = byName.get(String(n).toLowerCase());
          if (!id) throw new Error(`_build-creator.json : ability inconnue dans abilityExclusions — « ${n} »`);
          return id;
        });
        return { id: 'declared-' + i, abilities: ids, reason: x.reason, source: x.source };
      });
      return [...abilities.exclusiveGroups, ...declared];
    })(),
    abilities: abilities.groups.map((g) => ({
      key: g.key, label: g.label,
      abilities: g.abilities.map((a) => trim(a, ['id', 'name', 'cp', 'cpMastered', 'ap', 'description', 'notes', 'only', 'statBonus', 'documented'])),
    })),
    combinations: combinations.items.map((c) => trim(c, ['id', 'name', 'level', 'pieces', 'required', 'effects', 'documented'])),
    assists: assists.items.map((a) => ({ slug: a.slug, name: a.name, attacks: a.attacks, documented: a.documented })),
    summons: summonsOut,
  };
}
