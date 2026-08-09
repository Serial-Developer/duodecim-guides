// Assemble data/build/*.json + data/characters/*.json en un seul payload client.
//
// Le fichier produit est un script (window.BUILD_DATA = …) et non un JSON à
// fetcher : la page reste consultable en file:// comme le reste du site, et on
// évite une requête supplémentaire.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTERS } from './characters.mjs';
import { datesFor } from './git-dates.mjs';
import { isHeaderRow, cpFromRawRows, duplicatesHeaderRow, isTableTitle, isOrphanRow } from './move-shape.mjs';

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

// Sens du regard sur le portrait de l'écran de sélection : les deux camps se
// font face, les héros regardent vers la gauche, les autres vers la droite.
//
// Liste donnée par l'auteur du site et recoupée sur les 31 portraits. Elle ne
// se déduit pas du champ « Alignment » de l'infobox : quatre personnages y
// portent deux camps, un par épisode, et c'est le camp de l'autre épisode qui
// correspondrait au regard — un rapprochement que rien dans la source ne
// justifie. Une liste tenue à la main vaut mieux qu'une règle inventée.
//
// Aerith n'est pas dans ce cas : elle n'a pas de portrait Dissidia 012, le sien
// est un artwork Final Fantasy VII (voir NOTICE.md). Elle y figure quand même,
// sur décision de l'auteur, parce qu'elle apparaît en renfort à côté des dix-huit
// autres et que son artwork regarde du même côté qu'eux.
const REGARD_GAUCHE = new Set([
  'warrior-of-light', 'firion', 'onion-knight', 'cecil-harvey', 'bartz-klauser',
  'terra-branford', 'cloud-strife', 'squall-leonhart', 'zidane-tribal', 'tidus',
  'shantotto', 'prishe', 'vaan', 'lightning', 'laguna-loire', 'yuna',
  'tifa-lockhart', 'kain-highwind', 'aerith',
]);

// Ordre d'affichage des renforts, donné par l'auteur du site : les guerriers de
// Cosmos puis ceux de Chaos, chaque camp dans l'ordre de l'écran de sélection —
// les dix d'origine, puis ceux que Duodecim ajoute. Ce n'est ni l'ordre
// alphabétique, ni celui des épisodes : c'est celui dans lequel on cherche un
// assist quand on connaît le jeu.
//
// La liste reçue en comptait trente ; Aerith y manquait. Elle est placée
// derrière Tifa, du côté de Cosmos : le jeu la range en dernier de Final
// Fantasy VII, et cette liste-ci sépare les deux camps.
//
// L'ordre par épisode, lui, ne se déclare pas : c'est celui du tableau des
// assists, tel que la source le donne.
const ORDRE_ASSISTS = [
  'warrior-of-light', 'firion', 'onion-knight', 'cecil-harvey', 'bartz-klauser',
  'terra-branford', 'cloud-strife', 'squall-leonhart', 'zidane-tribal', 'tidus',
  'shantotto', 'lightning', 'vaan', 'laguna-loire', 'yuna', 'kain-highwind',
  'tifa-lockhart', 'aerith', 'prishe',
  'garland', 'the-emperor', 'cloud-of-darkness', 'golbez', 'exdeath',
  'kefka-palazzo', 'sephiroth', 'ultimecia', 'kuja', 'jecht', 'gabranth',
  'gilgamesh',
];

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

// Rapproche un nom de coup du Final Fantasy Wiki de celui de dissidia.wiki :
// ponctuation, casse et qualificatifs de posture varient d'un wiki à l'autre.
const moveKey = (name) => String(name || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\b(ground|grounded)\b/g, 'ground')
  .replace(/\b(midair|mid air|aerial|air)\b/g, 'midair')
  .split(/\s+/).filter(Boolean).join(' ');

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

  const hpLinkPairs = readJson(join(dir, 'hp-links.json'));
  const native = nativeByCharacter(equipment);
  const unresolvedLinks = [];
  // Tableaux du wiki ecartes du createur faute de coût — rapportes, jamais tus.
  const tableauxEcartes = [];
  // Déclarations de coût sans effet : nom inconnu, ou coût déjà donné par le wiki.
  const coutsRefuses = [];
  const aliasedAll = [];

  // Fichiers dont ce payload est la mise en forme : ils datent le bundle (voir
  // plus bas). Les chemins sont relatifs à la racine, en séparateurs POSIX,
  // comme les clés de l'index git.
  const sourceFiles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => `data/build/${f}`);

  const characters = [];
  for (const def of CHARACTERS) {
    const p = join(ROOT, 'data', 'characters', `${def.slug}.json`);
    if (!existsSync(p)) continue;
    sourceFiles.push(`data/characters/${def.slug}.json`);
    const data = readJson(p);

    // Les coups gardent la structure de la page wiki du personnage : les groupes
    // portent les noms du jeu (ground/aerial, mais aussi « Medic » chez Lightning
    // ou « followups » chez Prishe).
    const attacks = {};
    const rawGroups = {};
    const notesById = {};
    // Les coups déclarés retrouvés, toutes catégories confondues : une bravery ne
    // se trouve pas dans le tableau des attaques HP, et l'annoncer introuvable à
    // chaque passage aurait rapporté un manque qui n'existe pas.
    const coutsPoses = {};
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
        let header = null;
        let titreEnCours = null;
        for (const m of group.moves || []) {
          if (!m.name) continue;
          // Le coût est parfois resté dans le tableau brut : il y est, la source
          // le chiffre, seule l'extraction l'a laissé de côté.
          const cp = parseMoveCp(m.cp || cpFromRawRows(m));
          if (isHeaderRow(m)) {
            header = m;
            if (isTableTitle(group.moves || [], (group.moves || []).indexOf(m))) { parent = null; titreEnCours = m.name; continue; }
            titreEnCours = null;
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
              fromTable: true,
            };
            moves.push(parent);
            continue;
          }
          // Un coup autonome qui suit un tableau n'en est pas une déclinaison :
          // il porte son propre coût sans prolonger le nom du parent. Sans
          // cette sortie, tout ce qui suivait un tableau y était absorbé pour
          // toujours — « Jecht Beam », équipable à 30 (15) CP, disparaissait
          // ainsi derrière « Jecht Blade ».
          if (titreEnCours) continue;
          const prolongeLeParent = parent && m.name.indexOf(parent.name) === 0;
          if (parent && cp.cp != null && !prolongeLeParent) parent = null;

          if (parent) {
            // Une ligne déjà présente dans le tableau du parent en est un
            // doublon : le parseur a émis le tableau et ses lignes.
            if (duplicatesHeaderRow(header, m)) continue;
            // Ligne dont le tableau a perdu son titre : elle ne prolonge pas ce
            // coup-ci, elle ne se rattache a rien.
            if (isOrphanRow(header, m)) continue;
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
            // La description ne part pas dans le payload ; elle sert ici à lire
            // les enchaînements de bravery, que la source n'écrit qu'en prose
            // (« Branching from Multi-Hit. »). Elle suit la duplication des
            // paradigmes, sans quoi les coups reversés dans les deux postures
            // la perdraient.
            desc: m.description || '',
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
        for (const m of moves) { delete m.fromTable; m.variants = m.variants.length ? m.variants.join(' | ') : ''; }
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

      // Un tableau dont aucune ligne ne coûte de CP n'est pas une liste de coups
      // équipables : dans le jeu, tout ce qui s'équipe se paie. Deux tableaux du
      // wiki entraient pourtant dans le créateur comme des attaques —
      // « Tentacle Pain 1st » chez Cloud of Darkness, dont l'intro annonce
      // « All bravery attack starters share the following properties » et dont
      // la note décrit la posture à trois temps, et « Maelstrom Counterstrategy »
      // chez Exdeath, qui explique comment dévier Maelstrom. Le premier ouvrait
      // même une catégorie entière, avec ses trois commandes.
      //
      // Les enchaînements sont épargnés : le wiki ne les chiffre pas non plus —
      // les trois de Firion n'ont pas de coût — et ils ne s'équipent pas, ils
      // prolongent. Le coût des tableaux, lui, a déjà été récupéré plus haut
      // (`cpFromRawRows`) : un groupe qui n'en a toujours aucun n'en a pas.
      // Coûts déclarés à la main : dissidia.wiki écrit « ?? » là où le Final
      // Fantasy Wiki chiffre. On ne comble que les trous — une déclaration qui
      // écraserait un coût déjà donné est refusée et rapportée : arbitrer entre
      // deux sources n'est pas le rôle d'un fichier éditorial.
      for (const decl of ((editorial?.moveCosts || {})[def.slug] || [])) {
        for (const g of groups) {
          for (const m of g.moves) {
            if (moveKey(m.name) !== moveKey(decl.move)) continue;
            coutsPoses[moveKey(decl.move)] = true;
            if (m.cp != null) { coutsRefuses.push({ slug: def.slug, move: m.name, raison: 'déjà chiffré par le wiki' }); continue; }
            const chiffre = parseMoveCp(decl.cp);
            m.cp = chiffre.cp;
            if (chiffre.cpMastered != null) m.cpMastered = chiffre.cpMastered;
          }
        }
      }

      const sansCout = groups.filter((g) => !g.followUp && g.moves.length
        && !g.moves.some((m) => m.cp != null || m.cpMastered != null));
      for (const g of sansCout) tableauxEcartes.push({ slug: def.slug, kind, group: g.key, moves: g.moves.map((m) => m.name) });
      const kept = groups.filter((g) => g.moves.length && sansCout.indexOf(g) === -1);
      rawGroups[kind] = kept;
      if (kept.length) attacks[kind] = kept.map((g) => ({ key: g.key, intro: g.intro, followUp: g.followUp, moves: table(g.moves, MOVE_COLS) }));
    }

    // HP links : paires extraites du Final Fantasy Wiki, complétées par celles
    // déclarées à la main. Les noms sont résolus contre nos propres coups ; ceux
    // qui ne correspondent à rien sont rapportés plutôt que devinés.
    const byName = {};
    for (const kind of ['bravery', 'hp']) {
      for (const g of rawGroups[kind] || []) for (const m of g.moves) byName[`${kind}:${moveKey(m.name)}`] = m.id;
    }
    // Les deux wikis ne nomment pas toujours le coup pareil : le Final Fantasy
    // Wiki écrit « Master Sonic Break » là où dissidia.wiki écrit « Sonic Break ».
    // On ne tolère que ce préfixe, et seulement si le nom nu existe et que la
    // forme « Master … » n'existe pas de son côté — le rapprochement est tracé.
    const aliased = [];
    const resolve = (kind, name) => {
      const exact = byName[`${kind}:${moveKey(name)}`];
      if (exact) return exact;
      const nu = String(name).replace(/^\s*Master\s+/i, '');
      if (nu !== name) {
        const alt = byName[`${kind}:${moveKey(nu)}`];
        if (alt) { aliased.push({ slug: def.slug, wiki: name, retenu: nu }); return alt; }
      }
      return null;
    };
    const hpLinks = [];
    const sources = [
      ...hpLinkPairs.items.filter((l) => l.slug === def.slug).map((l) => ({ ...l, origine: l.source })),
      ...((editorial?.hpLinks || {})[def.slug] || []).map((l) => ({ ...l, origine: l.source || 'déclaré dans l’éditorial' })),
    ];
    for (const l of sources) {
      const from = resolve('bravery', l.from);
      const to = resolve('hp', l.to);
      if (!from || !to) {
        unresolvedLinks.push({ slug: def.slug, from: l.from, to: l.to, manquant: !from ? 'bravery' : 'attaque HP' });
        continue;
      }
      if (!hpLinks.some((x) => x.from === from && x.to === to)) hpLinks.push({ from, to, source: l.origine });
    }

    // Enchaînements de bravery à partenaire imposé. Le wiki ne les déclare nulle
    // part : il les écrit en tête de la description du coup — « Branching from
    // Multi-Hit. » —, exactement comme pour les attaques HP branchées, dont les
    // paires viennent par ailleurs du Final Fantasy Wiki. Ce sont les quatre
    // d'Onion Knight, et les seules du jeu : Extra Slice sous Multi-Hit,
    // Blizzaga sous Blizzard, Extra Lunge sous Turbo-Hit, Thundaga sous Thunder.
    //
    // Rien à voir avec les Skillchains de Prishe, qui vivent dans un groupe
    // « follow-ups » et acceptent n'importe quel partenaire : ceux-ci n'en ont
    // qu'un, et ne s'équipent pas seuls — le jeu les montre sous leur parent.
    const chains = [];
    const braveryParNom = {};
    for (const g of rawGroups.bravery || []) {
      if (g.followUp) continue;
      for (const m of g.moves) braveryParNom[moveKey(m.name)] = m.id;
    }
    for (const g of rawGroups.bravery || []) {
      if (g.followUp) continue;
      for (const m of g.moves) {
        const dit = /^\s*Branching from ([^.]+)\./.exec(m.desc || '');
        if (!dit) continue;
        const from = braveryParNom[moveKey(dit[1])];
        if (!from || from === m.id) {
          unresolvedLinks.push({ slug: def.slug, from: dit[1], to: m.name, manquant: 'bravery de départ' });
          continue;
        }
        chains.push({ from, to: m.id, source: data.url || null });
      }
    }
    for (const decl of ((editorial?.moveCosts || {})[def.slug] || [])) {
      if (!coutsPoses[moveKey(decl.move)]) coutsRefuses.push({ slug: def.slug, move: decl.move, raison: 'coup introuvable' });
    }
    for (const kind of ['bravery', 'hp']) for (const g of rawGroups[kind] || []) for (const m of g.moves) delete m.desc;

    // Braveries qui acceptent un enchaînement — non pas lequel : n'importe
    // quel « (Two) » convient sous n'importe quelle « (One) », et c'est tout le
    // principe des Skillchains de Prishe, où l'association choisie change
    // l'effet. Ce qui se restreint, c'est la liste des coups de départ : Banish
    // et Holy ne s'enchaînent pas.
    //
    // Le wiki la donne de deux façons :
    //  - par le nom, quand l'enchaînement désigne son origine (« Combo (One) »
    //    → « Combo (Two) ») : `parent`, résolu plus haut ;
    //  - en prose seulement, chez Firion (« Rope Knife, Lance Combo and Reel
    //    Axe can be followed up with one of three attacks ») : ces coups-là
    //    sont déclarés dans l'éditorial, comme les HP links.
    const starters = new Set();
    for (const kind of ['bravery', 'hp']) {
      for (const g of rawGroups[kind] || []) {
        if (!g.followUp) continue;
        for (const m of g.moves) if (m.parent) starters.add(m.parent);
      }
    }
    const declare = (editorial?.followUps || {})[def.slug];
    for (const nom of (declare?.starters || [])) {
      const id = resolve('bravery', nom);
      if (!id) {
        unresolvedLinks.push({ slug: def.slug, from: nom, to: '(enchaînement)', manquant: 'bravery de départ' });
        continue;
      }
      starters.add(id);
    }

    aliasedAll.push(...aliased);
    characters.push({
      slug: def.slug,
      name: def.name,
      origin: def.origin,
      // Sens du regard du portrait (voir REGARD_GAUCHE) : la carte de build s'en
      // sert pour ancrer le portrait du côté auquel le personnage tourne le dos.
      portraitFacing: REGARD_GAUCHE.has(def.slug) ? 'left' : 'right',
      // Valeur brute de l'infobox : « Yes », « No », « Yes (Combos only) »…
      hpLinks: data.infobox?.['HP Links'] || null,
      // Paires bravery -> attaque HP réellement identifiées ; l'infobox ci-dessus
      // dit seulement si le personnage en a.
      links: hpLinks,
      // Enchaînements de bravery à partenaire imposé (voir plus haut) : ceux-là
      // désignent leur origine et ne s'équipent que sous elle.
      chains,
      // Braveries qui acceptent un enchaînement. Lequel n'est pas contraint :
      // la réserve du personnage vaut pour chacune d'elles.
      followStarters: [...starters],
      // (rapprochements de noms consignés plus bas)
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
  // Effets d'invocation déclarés à la main : le wiki ne décrit pas toutes les
  // invocations que les règles de tournoi citent (Barbariccia n'a pas de section).
  const effetsDeclares = editorial?.summonEffects || {};
  for (const id of Object.keys(effetsDeclares)) {
    if (!summons.items.some((s) => s.id === id)) {
      throw new Error(`_build-creator.json : summonEffects — invocation inconnue « ${id} »`);
    }
  }
  const summonsOut = summons.items.map((i) => {
    const o = trim(i, ['id', 'name', 'legal', 'documented']);
    const declare = effetsDeclares[i.id];
    if (i.text) o.text = cut(i.text.split('\n')[0], 320);
    else if (declare?.text) { o.text = cut(declare.text, 320); o.documented = true; }
    const code = reasonFor(i);
    if (code) o.ill = code;
    return o;
  });
  const illegalReasons = Object.fromEntries([...reasonCodes].map(([text, code]) => [code, text]));

  return {
    schemaVersion: 1,
    // Date des données, pas du build : l'horodatage de la génération changeait à
    // chaque exécution et faisait apparaître un faux diff de 355 ko sur
    // dist/scripts/build-data.js, que le dépôt commite. Même raison que pour les
    // dates de pages (scripts/git-dates.mjs) : l'historique git est la seule
    // source honnête. `null` si git est indisponible, comme ailleurs.
    dataModified: datesFor(ROOT, sourceFiles).dateModified,
    capacity: { base: capacity.base, max: capacity.max, quote: capacity.quote, extenders: capacity.extenders, documented: capacity.documented },
    unresolvedHpLinks: unresolvedLinks,
    discardedTables: tableauxEcartes,
    rejectedMoveCosts: coutsRefuses,
    aliasedHpLinks: aliasedAll,
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
    // Le sens du regard voyage avec l'assist, pas seulement avec le personnage
    // jouable : Aerith n'est renfort que, et c'est en vignette de renfort que la
    // carte retourne les portraits pour qu'ils regardent tous du même côté.
    // `order` porte l'ordre d'affichage voulu ; le rang du tableau, lui, reste
    // celui des épisodes. Un renfort absent de la liste passerait en fin de
    // classement plutôt que de disparaître.
    assists: assists.items.map((a) => ({
      slug: a.slug, name: a.name, attacks: a.attacks, documented: a.documented,
      portraitFacing: REGARD_GAUCHE.has(a.slug) ? 'left' : 'right',
      order: ORDRE_ASSISTS.indexOf(a.slug) === -1 ? ORDRE_ASSISTS.length : ORDRE_ASSISTS.indexOf(a.slug),
    })),
    summons: summonsOut,
  };
}
