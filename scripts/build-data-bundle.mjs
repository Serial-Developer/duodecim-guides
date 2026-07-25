// Assemble data/build/*.json + data/characters/*.json en un seul payload client.
//
// Le fichier produit est un script (window.BUILD_DATA = …) et non un JSON à
// fetcher : la page reste consultable en file:// comme le reste du site, et on
// évite une requête supplémentaire.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTERS } from './characters.mjs';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'));

const MOVE_COLS = ['id', 'name', 'cp', 'cpMastered', 'damage', 'startup', 'type', 'priority', 'effects', 'variants'];
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

export function buildDataBundle(ROOT) {
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
          if (m.variants && m.variants.length > 1) {
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
          moves.push({
            id: `${kind}:${key}:${m.name}`,
            name: m.name,
            ...cp,
            damage: m.damage || '',
            startup: m.startup || '',
            type: m.type || '',
            priority: m.priority || '',
            effects: m.effects || '',
            variants: [],
          });
        }
        for (const m of moves) m.variants = m.variants.length ? m.variants.join(' | ') : '';
        // L'intro n'est affichée qu'en première ligne : inutile d'embarquer la suite.
        const intro = group.intro ? group.intro.split('\n')[0].slice(0, 260) : null;
        if (moves.length) groups.push({ key, intro, moves: table(moves, MOVE_COLS) });
      }
      if (groups.length) attacks[kind] = groups;
    }

    characters.push({
      slug: def.slug,
      name: def.name,
      origin: def.origin,
      // Valeur brute de l'infobox : « Yes », « No », « Yes (Combos only) »…
      hpLinks: data.infobox?.['HP Links'] || null,
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
    abilities: abilities.groups.map((g) => ({
      key: g.key, label: g.label,
      abilities: g.abilities.map((a) => trim(a, ['id', 'name', 'cp', 'cpMastered', 'ap', 'description', 'notes', 'only', 'statBonus', 'documented'])),
    })),
    combinations: combinations.items.map((c) => trim(c, ['id', 'name', 'level', 'pieces', 'required', 'effects', 'documented'])),
    assists: assists.items.map((a) => ({ slug: a.slug, name: a.name, attacks: a.attacks, documented: a.documented })),
    summons: summonsOut,
  };
}
