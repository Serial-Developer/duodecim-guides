// cache/ -> data/build/*.json : données du créateur de builds.
//
// Deux origines, tracées item par item dans `sources` :
//  - dissidia.wiki (CC BY 4.0)          : abilities, assists, summons, règles de tournoi
//  - finalfantasy.fandom.com (CC BY-SA) : équipements, accessoires, sets (« Combination »)
//
// Les attaques ne sont PAS régénérées ici : elles vivent déjà dans
// data/characters/*.json (coût CP inclus, au format « 20 (10) »).
//
// Usage : node scripts/parse-builddata.mjs
import { load } from 'cheerio';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS } from './characters.mjs';
import { parseTables, parseSections, plain, parseStats, slugify, fileRefs, splitTop, linkTarget } from './wikitext.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'cache');
const OUT = join(ROOT, 'data', 'build');
mkdirSync(OUT, { recursive: true });

const wikiUrl = (page) => `https://dissidia.wiki/${page}`;
const fandomUrl = (page) => `https://finalfantasy.fandom.com/wiki/${page}`;
const readWiki = (page) => readFileSync(join(CACHE, page.replaceAll('/', '__') + '.html'), 'utf8');
const readFandom = (page) => readFileSync(join(CACHE, 'fandom', page + '.wikitext'), 'utf8');
const write = (name, data) => {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
  const n = Array.isArray(data.items) ? data.items.length : Array.isArray(data.entries) ? data.entries.length : null;
  console.log(`data/build/${name}${n === null ? '' : ` — ${n} entrées`}`);
};

const warnings = [];
const warn = (m) => { warnings.push(m); console.warn('  ! ' + m); };

// --- Correspondance noms wiki -> slugs du site -------------------------------
// Le Fandom lie « Cecil Harvey (Dissidia PSP) », dissidia.wiki écrit « Cecil ».
const SLUG_BY_NAME = new Map();
for (const c of CHARACTERS) {
  SLUG_BY_NAME.set(c.name.toLowerCase(), c.slug);
  SLUG_BY_NAME.set(c.name.split(' ')[0].toLowerCase(), c.slug);
}
for (const [alias, slug] of Object.entries({
  'the emperor': 'the-emperor', 'emperor mateus': 'the-emperor', 'emperor': 'the-emperor',
  'onion knight': 'onion-knight', 'cloud of darkness': 'cloud-of-darkness',
  'warrior of light': 'warrior-of-light', 'feral chaos': 'feral-chaos',
  'cloud': 'cloud-strife', 'terra': 'terra-branford', 'kefka': 'kefka-palazzo',
  'tifa': 'tifa-lockhart', 'squall': 'squall-leonhart', 'laguna': 'laguna-loire',
  'zidane': 'zidane-tribal', 'bartz': 'bartz-klauser', 'cecil': 'cecil-harvey',
  'kain': 'kain-highwind', 'lightning': 'lightning',
})) SLUG_BY_NAME.set(alias, slug);

const slugForName = (name) => SLUG_BY_NAME.get(plain(name).toLowerCase().trim()) || null;

// ============================================================================
// 1. Abilities — dissidia.wiki/Abilities_(Dissidia_012)
// ============================================================================
// La page utilise le balisage tabber cassé du wiki : les onglets apparaissent en
// texte « |-|Basic Abilities= » juste avant chaque table. On lit donc les tables
// dans l'ordre du document et on récupère l'intitulé qui les précède.
// Six extra abilities accordent une statistique sous condition d'équipement, par
// exemple « HP +1000 when equipping light armor, heavy armor, or chestplates. ».
// Le build « Adamant Chains » de Lightning publié sur le wiki n'atteint ses
// 10972 HP qu'avec ce bonus : il faut donc le modéliser pour retrouver ses stats.
// On ne reconnaît que cette forme exacte ; toute autre tournure reste informative.
function abilityStatBonus(description) {
  const m = /^\s*(ATK|DEF|HP|BRV|LUK)\s*([+-]\d+)\s+when equipping\s+(.+?)\.?\s*$/i.exec(description || '');
  if (!m) return null;
  const categories = m[3]
    .split(/,|\bor\b|\band\b/i)
    .map((s) => s.trim().replace(/s$/i, '').toLowerCase())
    .filter(Boolean);
  return {
    stat: m[1].toLowerCase(),
    value: Number(m[2]),
    // Radicaux au singulier : le client compare à la catégorie de la pièce équipée.
    whenEquipping: categories,
    raw: description.trim(),
  };
}

function parseAbilities() {
  const page = 'Abilities_(Dissidia_012)';
  const html = readWiki(page);
  const $ = load(html);
  const url = wikiUrl(page);

  const labels = [...html.matchAll(/\|-\|([^=\n]+)=/g)].map((m) => m[1].trim());
  const KEY = { 'Basic Abilities': 'basic', 'Support Abilities': 'support', 'Extra Abilities': 'extra' };

  const groups = [];
  $('#mw-content-text table').each((i, t) => {
    const head = $(t).find('tr').eq(0).find('th,td').map((j, c) => $(c).text().trim()).get();
    if (head[0] !== 'Ability') return; // ignore le bandeau de navigation en pied de page
    const label = labels[groups.length];
    const key = KEY[label];
    if (!key) { warn(`Abilities : onglet inattendu « ${label} » (table ${i})`); return; }

    const abilities = [];
    $(t).find('tr').slice(1).each((j, r) => {
      const c = $(r).find('td,th').map((k, x) => $(x).text().trim()).get();
      if (c.length < 2 || !c[0]) return;
      // « 10 (5) » = coût à l'achat (coût une fois l'ability maîtrisée)
      const m = /^(\d+)\s*\((\d+)\)$/.exec(c[1].replace(/\s+/g, ' ').trim());
      if (!m) warn(`Abilities : coût CP illisible pour « ${c[0] } » (« ${c[1]} »)`);
      const notes = (c[4] || '').trim();
      const description = (c[3] || '').trim();
      // « Lightning only. », « Terra, Kefka, Sephiroth and Kuja only »
      const only = /only/i.test(notes)
        ? notes.replace(/\.$/, '').split(/\bonly\b/i)[0].split(/,|\band\b/).map((s) => slugForName(s)).filter(Boolean)
        : [];
      abilities.push({
        id: slugify(c[0]),
        name: c[0],
        cp: m ? Number(m[1]) : null,
        cpMastered: m ? Number(m[2]) : null,
        ap: /^\d+$/.test(c[2] || '') ? Number(c[2]) : null,
        description,
        statBonus: abilityStatBonus(description),
        notes,
        only: only.length ? only : null,
        documented: Boolean(m),
        sources: [url],
      });
    });
    groups.push({ key, label, abilities });
  });

  for (const g of groups) if (!g.abilities.length) warn(`Abilities : groupe « ${g.label} » vide`);

  // Les identifiants doivent rester uniques : le client indexe les abilities par
  // id. Reste le cas d'un palier dont le wiki a perdu le « + » (Jump Times Boost
  // existe en 20 et 40 CP sous le même nom) : on ne renomme pas la source, on
  // suffixe l'identifiant par son coût.
  const seenIds = new Map();
  for (const g of groups) {
    for (const a of g.abilities) {
      if (!seenIds.has(a.id)) { seenIds.set(a.id, a); continue; }
      const other = seenIds.get(a.id);
      warn(`Abilities : « ${a.name} » (${a.cp} CP) et « ${other.name} » (${other.cp} CP) partagent l'identifiant ${a.id} — palier probablement mal orthographié sur le wiki`);
      a.id = `${a.id}-cp${a.cp}`;
      a.idDisambiguated = true;
      seenIds.set(a.id, a);
    }
  }
  // Exclusions mutuelles dérivables des sources : les paliers d'une même ability
  // (« Speed Boost », « Speed Boost+ », « Speed Boost++ ») sont des rangs d'un
  // même effet, pas des abilities cumulables — c'est le nommage du wiki qui le
  // dit. Les autres exclusions ne sont documentées nulle part sur le wiki : elles
  // sont déclarées à la main dans data/editorial/_build-creator.json.
  const families = new Map();
  for (const g of groups) {
    for (const a of g.abilities) {
      const base = a.name.replace(/\s*(\+\+?|Ω)\s*$/, '').trim();
      const key = `${g.key}|${base}`;
      if (!families.has(key)) families.set(key, { base, group: g.key, abilities: [] });
      families.get(key).abilities.push(a.id);
    }
  }
  const exclusiveGroups = [...families.values()]
    .filter((f) => f.abilities.length > 1)
    .map((f) => ({
      id: slugify(f.group + '-' + f.base),
      abilities: f.abilities,
      reason: `« ${f.base} » n'existe qu'en un seul palier à la fois.`,
      source: url,
    }));

  write('abilities.json', {
    generated: new Date().toISOString(),
    license: 'CC BY 4.0 — dissidia.wiki',
    sources: [url],
    groups,
    exclusiveGroups,
    entries: groups.flatMap((g) => g.abilities),
  });
  return groups;
}

// ============================================================================
// 2. Équipements — finalfantasy.fandom.com (armes + armures)
// ============================================================================
const SLOT_BY_ARMOR_PARENT = { 'Hand Armor': 'hand', 'Head Armor': 'head', 'Body Armor': 'body' };

// Les armures exclusives du Fandom sont listées par personnage, sans colonne
// d'emplacement. Deux pages de dissidia.wiki le documentent : Special_Effects
// (colonne « Type ») et le Multiplayer Build Guide (icône ddff-icon-equip-<slot>).
function slotLookupFromWiki() {
  const map = new Map();
  const sources = new Map();
  const remember = (name, slot, url) => {
    const key = plain(name).toLowerCase();
    if (!key || !slot) return;
    if (map.has(key) && map.get(key) !== slot) { warn(`Emplacement contradictoire pour « ${name} » : ${map.get(key)} vs ${slot}`); return; }
    map.set(key, slot);
    if (!sources.has(key)) sources.set(key, url);
  };

  const sePage = 'Special_Effects_(Dissidia_012)';
  const $ = load(readWiki(sePage));
  $('#mw-content-text table').each((i, t) => {
    $(t).find('tr').each((j, r) => {
      const c = $(r).find('td,th').map((k, x) => $(x).text().trim()).get();
      if (c.length < 2) return;
      const slot = { weapon: 'weapon', hand: 'hand', head: 'head', body: 'body' }[c[0].toLowerCase()];
      if (slot) remember(c[1], slot, wikiUrl(sePage));
    });
  });

  const mbgPage = 'Multiplayer_Build_Guide_(Dissidia_012)';
  const html = readWiki(mbgPage);
  for (const m of html.matchAll(/<dt>([^<]{1,60}?)\s*&lt;img&gt;<img src="[^"]*ddff-icon-equip-([a-z]+)\.png"/g)) {
    remember(m[1], m[2], wikiUrl(mbgPage));
  }
  return { map, sources };
}

// Les intros de catégorie donnent « Initially equipped by X, Y and Z. » : c'est la
// seule source structurée des catégories équipables nativement par personnage
// (l'infobox de dissidia.wiki est libellée de façon irrégulière).
function nativeCharacters(body) {
  const intro = body.split(/\{\|/)[0];
  const m = /Initially equipped by\s+([^.]+)\./i.exec(intro);
  if (!m) return null;
  const slugs = [];
  for (const link of m[1].matchAll(/\[\[([^\][]+)\]\]/g)) {
    const parts = splitTop(link[1], '|');
    const slug = slugForName(parts[parts.length - 1]);
    if (slug) slugs.push(slug); else warn(`Équipement : personnage non mappé « ${parts[parts.length - 1]} »`);
  }
  return slugs.length ? [...new Set(slugs)] : null;
}

function equipmentRows(body, { slot, category, exclusiveTo, url }) {
  const items = [];
  for (const table of parseTables(body)) {
    if (!/D012/.test(table.attrs)) continue; // écarte toute table Dissidia 2008
    const head = table.rows[0].map((c) => plain(c).toLowerCase());
    const iName = head.indexOf('name');
    if (iName === -1) continue;
    const iLevel = head.indexOf('level');
    const iStats = head.indexOf('stats');
    const iEffects = head.indexOf('effects');
    const iType = head.indexOf('type');

    for (const row of table.rows.slice(1)) {
      const name = plain(row[iName]);
      if (!name) continue;
      // Deux items peuvent partager un nom affiché (Flamberge épée / gunblade) :
      // la parenthèse de désambiguïsation du lien les distingue. On l'ignore quand
      // le lien pointe vers une page collective ({{LA|Lufenian equipment|…}}),
      // sinon toute la série se réduirait à un seul identifiant.
      const target = linkTarget(row[iName]);
      const disambiguated = target && target.toLowerCase().startsWith(name.toLowerCase() + ' (');
      const id = slugify(disambiguated ? target : name);
      const effectsRaw = iEffects === -1 ? '' : plain(row[iEffects]);
      const effects = /^n\/a$/i.test(effectsRaw) ? '' : effectsRaw;
      const statsRaw = iStats === -1 ? '' : plain(row[iStats]);
      const levelRaw = iLevel === -1 ? '' : plain(row[iLevel]);
      // « Mystic Mythril (1/3) » signale l'appartenance à un set d'équipement
      const combo = /^(.+?)\s*\((\d)\/(\d)\)/.exec(effects);
      items.push({
        id,
        name,
        slot,
        category: iType !== -1 && plain(row[iType]) ? plain(row[iType]) : category,
        level: /^\d+$/.test(levelRaw) ? Number(levelRaw) : null,
        stats: parseStats(statsRaw),
        statsRaw,
        effects,
        combination: combo ? { name: combo[1].trim(), pieces: Number(combo[3]) } : null,
        labyrinth: /\(Labyrinth\)/i.test(effects),
        exclusiveTo,
        documented: Boolean(statsRaw) && /^\d+$/.test(levelRaw),
        sources: [url],
      });
    }
  }
  return items;
}

function parseEquipment() {
  const items = [];
  const nativeByCategory = {};
  const categories = { weapon: [], hand: [], head: [], body: [] };
  const slotHint = slotLookupFromWiki();

  // --- Armes ---
  {
    const page = 'Dissidia_012_Final_Fantasy_weapons';
    const url = fandomUrl(page);
    const sections = parseSections(readFandom(page));
    for (const s of sections) {
      const top = s.path[0] || s.title;
      if (s.level !== 3) continue;
      if (/Other appearances|Behind the scenes/i.test(top)) continue;
      if (/Enemy Only/i.test(s.title)) continue;

      if (top === 'Weapons') {
        categories.weapon.push(s.title);
        const nat = nativeCharacters(s.body);
        if (nat) nativeByCategory[s.title] = nat;
        items.push(...equipmentRows(s.body, { slot: 'weapon', category: s.title, exclusiveTo: null, url }));
      } else if (top === 'Exclusive') {
        const slug = slugForName(s.title);
        if (!slug) { warn(`Armes exclusives : personnage non mappé « ${s.title} »`); continue; }
        items.push(...equipmentRows(s.body, { slot: 'weapon', category: 'Exclusive', exclusiveTo: slug, url }));
      }
    }
  }

  // --- Armures ---
  {
    const page = 'Dissidia_012_Final_Fantasy_armor';
    const url = fandomUrl(page);
    const sections = parseSections(readFandom(page));
    for (const s of sections) {
      const top = s.path[0] || s.title;
      if (/Other appearances|Behind the scenes/i.test(top)) continue;
      if (/Enemy Only/i.test(s.title) || s.path.some((p) => /Enemy Only/i.test(p))) continue;

      const slot = SLOT_BY_ARMOR_PARENT[top];
      if (slot && s.level === 3) {
        categories[slot].push(s.title);
        const nat = nativeCharacters(s.body);
        if (nat) nativeByCategory[s.title] = nat;
        items.push(...equipmentRows(s.body, { slot, category: s.title, exclusiveTo: null, url }));
      } else if (top === 'Other' && s.level === 3 && !/Exclusive/i.test(s.title)) {
        // « Machines » et « Special » regroupent des pièces des trois emplacements :
        // la table porte alors une colonne Type qui donne l'emplacement réel.
        for (const it of equipmentRows(s.body, { slot: null, category: s.title, exclusiveTo: null, url })) {
          const t = (it.category || '').toLowerCase();
          it.slot = t.includes('hand') ? 'hand' : t.includes('head') ? 'head' : t.includes('body') ? 'body'
            : slotHint.map.get(it.name.toLowerCase()) || null;
          it.category = s.title;
          if (!it.slot) { warn(`Armure « ${it.name} » (${s.title}) : emplacement non documenté`); it.documented = false; }
          items.push(it);
        }
      } else if (s.level === 4 && s.path.includes('Exclusive')) {
        const slug = slugForName(s.title);
        if (!slug) { warn(`Armures exclusives : personnage non mappé « ${s.title} »`); continue; }
        for (const it of equipmentRows(s.body, { slot: null, category: 'Exclusive', exclusiveTo: slug, url })) {
          // Le Fandom ne donne pas l'emplacement des armures exclusives : on le
          // reprend de dissidia.wiki, et on laisse l'item non documenté sinon.
          const key = it.name.toLowerCase();
          it.slot = slotHint.map.get(key) || null;
          it.category = 'Exclusive';
          if (it.slot) it.sources = [...it.sources, slotHint.sources.get(key)];
          else { warn(`Armure exclusive « ${it.name} » : emplacement non documenté`); it.documented = false; }
          items.push(it);
        }
      }
    }
  }

  // Un même nom peut désigner plusieurs items : la Claymore existe en niveau 1 et
  // en niveau 30 (version Labyrinthe). La clé unique intègre donc emplacement,
  // niveau et provenance Labyrinthe ; `id` reste le slug lisible du nom.
  const seen = new Map();
  const kept = [];
  for (const it of items) {
    const uid = `${it.slot}:${it.id}:lv${it.level ?? '?'}${it.labyrinth ? ':lab' : ''}`;
    if (seen.has(uid)) { warn(`Équipement en double ignoré : ${it.name} (${uid})`); continue; }
    it.uid = uid;
    seen.set(uid, it);
    kept.push(it);
  }

  write('equipment.json', {
    generated: new Date().toISOString(),
    license: 'CC BY-SA — finalfantasy.fandom.com',
    sources: [fandomUrl('Dissidia_012_Final_Fantasy_weapons'), fandomUrl('Dissidia_012_Final_Fantasy_armor')],
    categories,
    nativeByCategory,
    items: kept,
  });
  return { items: kept, categories, nativeByCategory };
}

// ============================================================================
// 3. Accessoires — finalfantasy.fandom.com
// ============================================================================
// Règles de légalité appliquées ici (ruleset « Tournament Rules 2017 » /
// paramètre in-game « Official »), chacune adossée à une phrase de la page de
// règles ; voir data/build/ruleset.json pour les citations.
function accessoryLegality(acc) {
  if (acc.labyrinth) return 'Exclusivité Labyrinthe : se brise à 100 % après le combat.';
  if (acc.breakable) return 'Accessoire brisable — banni par le ruleset officiel.';
  if (/^rebellious soul$/i.test(acc.name)) return 'Rebellious Soul (Bonecrusher) — banni nommément.';
  if (/^(weaponless|gloveless|hatless|armorless)$/i.test(acc.name)) return 'Multiplicateur « sans équipement » — désactivé par le ruleset officiel.';
  if (/^level gap/i.test(acc.name)) return 'Multiplicateur « Level Gap » — désactivé par le ruleset officiel.';
  return null;
}

const RANK_FROM_FILE = (files) => {
  for (const f of files) {
    const m = /Dissidia-([SABCDE])Rank-Icon/i.exec(f);
    if (m) return m[1].toUpperCase();
  }
  return null;
};
const BOOSTER_TYPE_FROM_FILE = (files) => {
  for (const f of files) {
    const m = /DFF-([A-Za-z]+)-Icon/i.exec(f);
    if (m) return m[1].toUpperCase();
  }
  return null;
};

function parseAccessories() {
  const page = 'Dissidia_012_Final_Fantasy_accessories';
  const url = fandomUrl(page);
  const sections = parseSections(readFandom(page));
  const items = [];

  const CATEGORY_BY_SECTION = {
    'Basic accessories': 'basic',
    'Booster accessories': 'booster',
    'Special accessories': 'special',
    'Trade accessories': 'trade',
  };

  for (const s of sections) {
    const labyrinth = /Labyrinth exclusive/i.test(s.title);
    // « Enemy only » : non obtenables par le joueur, hors périmètre du créateur.
    if (/Enemy only/i.test(s.title)) continue;
    if (/Other appearances|Behind the scenes/i.test(s.path[0] || s.title)) continue;
    const sectionCategory = CATEGORY_BY_SECTION[s.title];
    if (!sectionCategory && !labyrinth) continue;

    for (const table of parseTables(s.body)) {
      if (!/D012/.test(table.attrs)) continue;
      const head = table.rows[0].map((c) => plain(c).toLowerCase());
      const iName = head.indexOf('accessory');
      if (iName === -1) continue;
      // « Effect », « Description » ou « Description/Effect » selon les tables.
      const iEffect = head.findIndex((h) => /^(effect|description)/.test(h));
      const iType = head.indexOf('type');
      const iReq = head.indexOf('requirements');
      const iMult = head.indexOf('multiplier');
      const iAcq = head.indexOf('acquired');
      const iRank = head.indexOf('rank');

      for (const row of table.rows.slice(1)) {
        const name = plain(row[iName]);
        if (!name) continue;
        // Une colonne en colspan est répétée : on recolle ses cellules (les
        // accessoires « Trade » séparent la description de l'effet chiffré).
        let effect = '';
        if (iEffect !== -1) {
          const parts = [];
          for (let k = iEffect; k < head.length && head[k] === head[iEffect]; k++) {
            const v = plain(row[k]);
            if (v && parts.indexOf(v) === -1) parts.push(v);
          }
          effect = parts.join(' · ');
        }
        const typeFiles = iType === -1 ? [] : fileRefs(row[iType] || '');
        // En section Labyrinthe, l'icône de la colonne Type donne la catégorie.
        const iconCat = (BOOSTER_TYPE_FROM_FILE(typeFiles) || '').toLowerCase();
        const category = sectionCategory
          || (['basic', 'booster', 'special'].includes(iconCat) ? iconCat : 'special');
        const multRaw = iMult === -1 ? '' : plain(row[iMult]);
        const multMatch = /([\d.]+)\s*x/i.exec(multRaw) || (labyrinth ? /([\d.]+)x Booster/i.exec(effect) : null);

        const acc = {
          id: slugify(name),
          name,
          category,
          boosterType: category === 'booster' && !labyrinth ? BOOSTER_TYPE_FROM_FILE(typeFiles) : null,
          effect,
          requirements: iReq === -1 ? '' : plain(row[iReq]),
          multiplier: multMatch ? Number(multMatch[1]) : null,
          acquired: iAcq === -1 ? '' : plain(row[iAcq]),
          rank: iRank === -1 ? null : RANK_FROM_FILE(fileRefs(row[iRank] || '')),
          breakable: /breaks?\b/i.test(effect) || labyrinth,
          labyrinth,
          documented: true,
          sources: [url],
        };
        if (acc.category === 'booster' && acc.multiplier === null) {
          warn(`Accessoire booster sans multiplicateur : « ${acc.name} »`);
          acc.documented = false;
        }
        acc.illegalReason = accessoryLegality(acc);
        acc.legal = acc.illegalReason === null;
        items.push(acc);
      }
    }
  }

  // « Summon Unused » existe en type ETC et en type OPP : la clé doit inclure le type.
  const seen = new Map();
  const kept = [];
  for (const a of items) {
    const key = `${a.category}:${a.boosterType || ''}:${a.id}`;
    if (seen.has(key)) { warn(`Accessoire en double ignoré : ${a.name} (${key})`); continue; }
    a.uid = key;
    seen.set(key, a);
    kept.push(a);
  }

  write('accessories.json', {
    generated: new Date().toISOString(),
    license: 'CC BY-SA — finalfantasy.fandom.com',
    sources: [url],
    items: kept,
  });
  return kept;
}

// ============================================================================
// 4. Sets d'équipement (« Combination ») — page mixte 2008/012, filtrée sur D012
// ============================================================================
function parseCombinations() {
  const page = 'Combination';
  const url = fandomUrl(page);
  const sections = parseSections(readFandom(page));
  const items = [];

  for (const s of sections) {
    const inD012 = /Dissidia 012/i.test(s.title) || s.path.some((p) => /Dissidia 012/i.test(p));
    if (!inD012) continue;
    // « Three-item combinations » liste jusqu'à quatre pièces possibles, dont
    // trois suffisent à activer l'effet — c'est ce que note la mention « (1/3) »
    // portée par chaque pièce dans les listes d'équipement.
    const required = /Three-item/i.test(s.title) ? 3 : /Four-item/i.test(s.title) ? 4 : null;
    if (!required) continue;
    for (const table of parseTables(s.body)) {
      if (!/D012/.test(table.attrs)) continue;
      // L'en-tête tient sur deux lignes (« Equipment Pieces » en colspan, puis
      // Weapon/Hand/Head/Body) : on valide cette forme, puis on lit les lignes de
      // données à position fixe — 7 cellules, dans cet ordre.
      const head0 = table.rows[0].map((c) => plain(c).toLowerCase());
      const head1 = (table.rows[1] || []).map((c) => plain(c).toLowerCase());
      if (!head0.some((h) => h.includes('combination'))) continue;
      const SLOTS = ['weapon', 'hand', 'head', 'body'];
      if (!SLOTS.every((sl, k) => head1[k] === sl)) {
        warn(`Combination : en-tête inattendu (${head1.join('|')}) — table ignorée`);
        continue;
      }
      const [iName, iLevel, iEffects] = [0, 1, 6];

      for (const row of table.rows.slice(2)) {
        const name = plain(row[iName]);
        if (!name) continue;
        if (row.length !== 7) { warn(`Combination : ligne « ${name} » a ${row.length} cellules (7 attendues)`); continue; }
        const pieces = {};
        SLOTS.forEach((slot, k) => {
          // Une case peut proposer plusieurs pièces équivalentes (séparées par <br/>).
          const v = plain(row[2 + k]);
          if (v && !/^(—|-|n\/a)$/i.test(v)) pieces[slot] = v.split(' · ').map((x) => x.trim()).filter(Boolean);
        });
        const levelRaw = plain(row[iLevel]);
        items.push({
          id: slugify(name),
          name,
          level: /^\d+$/.test(levelRaw) ? Number(levelRaw) : null,
          pieces,
          required,
          pieceCount: Object.keys(pieces).length,
          effects: plain(row[iEffects]),
          documented: Object.keys(pieces).length > 0,
          sources: [url],
        });
      }
    }
  }
  if (!items.length) warn('Combination : aucune ligne Dissidia 012 extraite');
  write('combinations.json', {
    generated: new Date().toISOString(),
    license: 'CC BY-SA — finalfantasy.fandom.com',
    note: 'La page Combination porte un bandeau « table incomplète » côté Fandom.',
    sources: [url],
    items,
  });
  return items;
}

// ============================================================================
// 5. Assists — dissidia.wiki/Assist_(Dissidia_012)
// ============================================================================
function parseAssists() {
  const page = 'Assist_(Dissidia_012)';
  const url = wikiUrl(page);
  const $ = load(readWiki(page));
  const byChar = new Map();

  $('#mw-content-text table').each((i, t) => {
    const head = $(t).find('tr').eq(0).find('th,td').map((j, c) => $(c).text().trim()).get();
    if (head[0] !== 'Character') return;
    const idx = Object.fromEntries(head.map((h, k) => [h.toLowerCase(), k]));
    let currentSlug = null;
    let currentName = null;

    $(t).find('tr').slice(1).each((j, r) => {
      const vals = $(r).find('td,th').map((k, x) => $(x).text().trim()).get();
      if (!vals.length) return;
      // La colonne « Character » n'est renseignée que sur la première des quatre
      // lignes d'un personnage ; les suivantes la laissent vide.
      if (vals[0]) {
        currentName = vals[0];
        currentSlug = slugForName(vals[0]) || (/aerith/i.test(vals[0]) ? 'aerith' : null);
        if (!currentSlug) warn(`Assist : personnage non mappé « ${vals[0]} »`);
      }
      if (!currentSlug) return;
      const at = (key) => {
        const k = idx[key];
        return k === undefined ? '' : (vals[k] || '').trim();
      };
      const attack = at('attack');
      if (!attack) return;
      if (!byChar.has(currentSlug)) byChar.set(currentSlug, { slug: currentSlug, name: currentName, attacks: [], sources: [url] });
      byChar.get(currentSlug).attacks.push({
        name: attack,
        startup: at('startup'),
        spawnsNear: at('spawns near'),
        damageMultiplier: at('damage multiplier'),
        properties: at('additional properties'),
      });
    });
  });

  const items = [...byChar.values()].map((a) => ({ ...a, documented: a.attacks.length > 0 }));
  if (items.length < 30) warn(`Assist : seulement ${items.length} personnages extraits (31 attendus)`);
  write('assists.json', {
    generated: new Date().toISOString(),
    license: 'CC BY 4.0 — dissidia.wiki',
    note: 'Feral Chaos n’existe pas en assist ; Aerith n’est jouable qu’en assist.',
    sources: [url],
    items,
  });
  return items;
}

// ============================================================================
// 6. Summons — dissidia.wiki/Summons_(Dissidia_012)
// ============================================================================
// Seuls les counter summons sont légaux en tournoi (voir ruleset.json).
const COUNTER_SUMMONS = ['Barbariccia', 'Scarmiglione', 'Cagnazzo', 'Rubicante'];

function parseSummons() {
  const page = 'Summons_(Dissidia_012)';
  const url = wikiUrl(page);
  const $ = load(readWiki(page));
  const items = [];

  $('#mw-content-text h2').each((i, h) => {
    const name = $(h).text().trim();
    if (!name || /contents|navigation/i.test(name)) return;
    const paras = [];
    let node = $(h).parent().next();
    // Les titres sont encapsulés par MediaWiki : on avance jusqu'au titre suivant.
    for (let guard = 0; guard < 40 && node.length; guard++) {
      if (node.find('h2').length || node.is('h2')) break;
      const txt = node.text().trim();
      if (txt) paras.push(txt);
      node = node.next();
    }
    const text = paras.join('\n').replace(/\n{2,}/g, '\n').trim();
    if (!text) return;
    const legal = COUNTER_SUMMONS.includes(name);
    items.push({
      id: slugify(name),
      name,
      text,
      legal,
      illegalReason: legal ? null : 'Hors counter summons : banni par le ruleset de tournoi.',
      documented: Boolean(text),
      sources: [url],
    });
  });

  if (items.length < 40) warn(`Summons : ${items.length} entrées extraites (≈46 attendues)`);

  // Barbariccia est citée comme counter summon légal par la page de règles mais
  // n'a pas de section sur la page Summons : on la déclare sans en inventer l'effet.
  for (const name of COUNTER_SUMMONS) {
    if (items.some((s) => s.name === name)) continue;
    warn(`Summon « ${name} » cité par le ruleset mais absent de la page Summons — effet non documenté`);
    items.push({
      id: slugify(name), name, text: '', legal: true, illegalReason: null,
      documented: false,
      sources: [wikiUrl('Tournament_Rules_(Dissidia_012)')],
    });
  }
  write('summons.json', {
    generated: new Date().toISOString(),
    license: 'CC BY 4.0 — dissidia.wiki',
    sources: [url],
    items,
  });
  return items;
}

// ============================================================================
// 7. Ruleset de tournoi — dissidia.wiki/Tournament_Rules_(Dissidia_012)
// ============================================================================
// On ne retient que le ruleset 2017 / in-game « Official » : c'est le seul qui
// laisse l'équipement libre, donc le seul où un filtre de légalité a du sens.
function parseRuleset() {
  const page = 'Tournament_Rules_(Dissidia_012)';
  const url = wikiUrl(page);
  const $ = load(readWiki(page));
  const root = $('#mw-content-text');

  const listAfter = (headingText) => {
    const h = root.find('h2,h3').filter((i, e) => $(e).text().trim() === headingText).first();
    if (!h.length) return [];
    let node = h.parent().next();
    for (let guard = 0; guard < 12 && node.length; guard++) {
      const ul = node.is('ul') ? node : node.find('ul').first();
      if (ul.length) return ul.find('li').map((i, li) => $(li).text().trim()).get();
      node = node.next();
    }
    return [];
  };

  const prohibitions = listAfter('Prohibitions');
  const allowances = listAfter('Allowances');
  if (!prohibitions.length) warn('Ruleset : liste « Prohibitions » introuvable');

  // Citations qui justifient les filtres de légalité appliqués aux items.
  const notes = root.find('p').map((i, p) => $(p).text().trim()).get()
    .filter((t) => /Official|Breakable|Equip-less|Level Gap|artifact/i.test(t));

  write('ruleset.json', {
    generated: new Date().toISOString(),
    license: 'CC BY 4.0 — dissidia.wiki',
    id: 'tournament-rules-2017',
    name: 'Tournament Rules (2017) — ruleset in-game « Official »',
    sources: [url],
    prohibitions,
    allowances,
    notes,
    legalSummons: COUNTER_SUMMONS,
    itemRules: [
      { rule: 'breakable', label: 'Accessoires brisables bannis', quote: prohibitions.find((p) => /Breakable Items/i.test(p)) || null },
      { rule: 'artifact', label: 'Artefacts bannis', quote: prohibitions.find((p) => /Artifacts/i.test(p)) || null },
      { rule: 'bonecrusher', label: 'Rebellious Soul (Bonecrusher) banni', quote: prohibitions.find((p) => /Rebellious Soul/i.test(p)) || null },
      { rule: 'equipless-levelgap', label: 'Multiplicateurs « sans équipement » et « Level Gap » désactivés', quote: notes.find((n) => /Equip-less/i.test(n)) || null },
      { rule: 'summons', label: 'Summons bannis sauf counter summons', quote: prohibitions.find((p) => /summons are BANNED/i.test(p)) || null },
      { rule: 'feral-chaos', label: 'Feral Chaos banni en tournoi', quote: prohibitions.find((p) => /Feral Chaos/i.test(p)) || null },
    ],
  });
}

// ============================================================================
// 8. Capacité CP — dissidia.wiki/Statistic_(Dissidia_012) + valeurs fournies
// ============================================================================
function parseCapacity(accessories) {
  const page = 'Statistic_(Dissidia_012)';
  const url = wikiUrl(page);
  const text = load(readWiki(page))('#mw-content-text').text();
  const quote = (text.split('\n').find((l) => /510 CP/.test(l)) || '').trim();
  if (!quote) warn('Capacité : phrase sur les 510 CP introuvable dans Statistic');

  // Les accessoires qui étendent la capacité portent leur gain dans leur effet
  // (« CP +15 ») : on le lit plutôt que de le coder en dur. La page Statistic
  // documente la combinaison maximale (2 Hero's Spirit + 1 Hero's Essence),
  // d'où le plafond de 510 : 450 + 2×15 + 30.
  const extenders = accessories
    .map((a) => ({ acc: a, m: /^CP \+(\d+)$/.exec(a.effect) }))
    .filter((x) => x.m)
    .map((x) => ({
      name: x.acc.name,
      uid: x.acc.uid,
      cp: Number(x.m[1]),
      maxEquipped: /Spirit/i.test(x.acc.name) ? 2 : 1,
      sources: x.acc.sources,
    }));
  const computed = 450 + extenders.reduce((s, e) => s + e.cp * e.maxEquipped, 0);
  if (computed !== 510) warn(`Capacité : le cumul des extenseurs donne ${computed} CP, 510 attendus`);
  if (!extenders.length) warn('Capacité : aucun accessoire « CP +N » trouvé');

  write('capacity.json', {
    generated: new Date().toISOString(),
    license: 'CC BY 4.0 — dissidia.wiki ; CC BY-SA — finalfantasy.fandom.com',
    base: 450,
    max: computed,
    sources: [url, fandomUrl('Dissidia_012_Final_Fantasy_accessories')],
    quote: quote || null,
    extenders,
    documented: Boolean(quote) && computed === 510,
  });
}

// ============================================================================
// 9. Statistiques de base au niveau 100 — dissidia.wiki/Statistic_(Dissidia_012)
// ============================================================================
// HP / CP / BRV / LUK sont communs à tout le cast ; ATK et DEF sont par
// personnage. Les totaux d'un build sont donc calculables (base + bonus des
// pièces équipées), ce que confirment les builds publiés sur le wiki.
function parseBaseStats() {
  const page = 'Statistic_(Dissidia_012)';
  const url = wikiUrl(page);
  const $ = load(readWiki(page));
  const shared = {};
  const byCharacter = {};

  $('#mw-content-text table').each((i, t) => {
    const rows = $(t).find('tr');
    const first = rows.eq(0).find('th,td').map((j, c) => $(c).text().trim()).get();

    if (/Base ATK and DEF stats/i.test(first[0] || '')) {
      rows.slice(2).each((j, r) => {
        const c = $(r).find('td,th').map((k, x) => $(x).text().trim()).get();
        const slug = slugForName(c[0]);
        if (!slug) { if (c[0]) warn(`Stats de base : personnage non mappé « ${c[0]} »`); return; }
        const atk = parseInt(c[1], 10);
        const def = parseInt(c[2], 10);
        if (Number.isNaN(atk) || Number.isNaN(def)) { warn(`Stats de base illisibles pour ${slug}`); return; }
        // « 113 (+10 EX Mode) » : la note est conservée à part, pas dans le total.
        byCharacter[slug] = { atk, def, note: [c[1], c[2]].filter((v) => /\(/.test(v)).join(' ; ') || null };
      });
      return;
    }
    rows.each((j, r) => {
      const c = $(r).find('td,th').map((k, x) => $(x).text().trim()).get();
      if (c.length === 2 && /^(HP|CP|BRV|LUK)$/.test(c[0]) && /^\d+$/.test(c[1])) shared[c[0].toLowerCase()] = Number(c[1]);
    });
  });

  for (const k of ['hp', 'cp', 'brv', 'luk']) if (shared[k] === undefined) warn(`Stats de base : valeur « ${k} » introuvable`);
  const missing = CHARACTERS.filter((c) => !byCharacter[c.slug]).map((c) => c.slug);
  if (missing.length) warn(`Stats de base ATK/DEF manquantes : ${missing.join(', ')}`);

  write('base-stats.json', {
    generated: new Date().toISOString(),
    license: 'CC BY 4.0 — dissidia.wiki',
    sources: [url],
    note: 'Valeurs au niveau 100. HP/CP/BRV/LUK sont identiques pour tout le cast.',
    shared,
    byCharacter,
    documented: Object.keys(shared).length === 4 && missing.length === 0,
  });
}

// --- Exécution ---------------------------------------------------------------
for (const f of ['Abilities_(Dissidia_012)', 'Assist_(Dissidia_012)', 'Summons_(Dissidia_012)', 'Tournament_Rules_(Dissidia_012)', 'Statistic_(Dissidia_012)']) {
  if (!existsSync(join(CACHE, f + '.html'))) { console.error(`cache manquant : ${f} — lancer npm run scrape:build`); process.exit(1); }
}

console.log('Extraction des données de builds :');
parseAbilities();
parseEquipment();
const accessories = parseAccessories();
parseCombinations();
parseAssists();
parseSummons();
parseRuleset();
parseCapacity(accessories);
parseBaseStats();

writeFileSync(join(ROOT, 'reports', 'parse-builddata-log.json'), JSON.stringify({ generated: new Date().toISOString(), warnings }, null, 2) + '\n');
console.log(`\n${warnings.length} avertissement(s) — reports/parse-builddata-log.json`);
