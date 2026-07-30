/* Créateur de builds — Dissidia 012 [duodecim]
   Vanilla JS, sans dépendance. Les données de jeu arrivent par
   window.BUILD_DATA (scripts/build-data.js), généré depuis data/build/.

   Principes tenus dans tout ce fichier :
   - rien n'est bloquant à la saisie : un build hors budget ou avec des items
     illégaux reste modifiable et sauvegardable, seulement signalé ;
   - aucune donnée absente n'est comblée : ce qui n'est pas documenté est affiché
     comme tel, jamais deviné ;
   - rien n'est envoyé nulle part : stockage local uniquement. */
(function () {
  'use strict';

  var D = window.BUILD_DATA;
  var root = document.getElementById('bc-editor');
  if (!D || !root) return;

  // Libellés de l'outil, injectés par le template dans la langue de la page
  // (voir src/i18n/build-creator-strings.mjs). Ce script est servi tel quel aux
  // deux langues : il ne contient donc aucun texte.
  var BC = window.BC_I18N || { locale: 'fr', ui: {}, app: {} };
  function T(key, params) {
    var node = BC.app;
    var parts = key.split('.');
    for (var i = 0; i < parts.length && node != null; i++) node = node[parts[i]];
    if (node == null) return '⟨' + key + '⟩';
    if (!params) return String(node);
    return String(node).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m;
    });
  }
  // Tri alphabétique dans la langue affichée (« é » se range avec « e »).
  function byName(a, b) { return a.name.localeCompare(b.name, BC.locale); }

  var STORAGE_KEY = 'dissidia012.builds.v1';
  var SCHEMA_VERSION = 1;
  var SLOTS = [
    { key: 'weapon', label: T('slots.weapon') },
    { key: 'hand', label: T('slots.hand') },
    { key: 'head', label: T('slots.head') },
    { key: 'body', label: T('slots.body') },
  ];
  var ACCESSORY_SLOTS = 10;
  // Plafond du nombre d'attaques d'un build : le format binaire du lien de
  // partage code leur nombre sur 5 bits. Aucun build légitime n'en approche —
  // c'est un garde-fou contre un lien bricolé, pas une règle du jeu.
  var MAX_ATTACKS = 31;
  // Nombre d'exemplaires d'un même accessoire, selon son rang : 1 pour un rang S,
  // 2 pour un A, 3 pour un B, sans limite pour un C. Un accessoire sans rang
  // documenté n'est pas contraint — on le signale plutôt que de deviner.
  var RANK_COPY_LIMIT = { S: 1, A: 2, B: 3, C: Infinity };
  var ACCESSORY_CATEGORIES = [
    { key: 'basic', label: T('accCategories.basic') },
    { key: 'booster', label: T('accCategories.booster') },
    { key: 'special', label: T('accCategories.special') },
    { key: 'trade', label: T('accCategories.trade') },
  ];

  // Les longues listes voyagent en colonnes ({ c: noms, r: lignes }) pour ne pas
  // répéter les clés des centaines de fois : on les remet en objets ici.
  function hydrate(t) {
    if (!t || !t.c) return t || [];
    return t.r.map(function (row) {
      var o = {};
      t.c.forEach(function (key, i) { if (row[i] !== null) o[key] = row[i]; });
      return o;
    });
  }
  D.equipment = hydrate(D.equipment);
  D.accessories = hydrate(D.accessories);
  D.characters.forEach(function (c) {
    ['bravery', 'hp'].forEach(function (kind) {
      (c.attacks[kind] || []).forEach(function (g) { g.moves = hydrate(g.moves); });
    });
  });

  // --- Index des données ----------------------------------------------------
  var charBySlug = {};
  D.characters.forEach(function (c) { charBySlug[c.slug] = c; });
  var equipByUid = {};
  D.equipment.forEach(function (e) { equipByUid[e.uid] = e; });
  var accByUid = {};
  D.accessories.forEach(function (a) { accByUid[a.uid] = a; });
  var abilityById = {};
  D.abilities.forEach(function (g) { g.abilities.forEach(function (a) { abilityById[a.id] = a; }); });
  var assistBySlug = {};
  D.assists.forEach(function (a) { assistBySlug[a.slug] = a; });
  var summonById = {};
  D.summons.forEach(function (s) { summonById[s.id] = s; });

  // --- Utilitaires ----------------------------------------------------------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) node.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // « ATK +41 DEF -1 » reconstitué depuis l'objet stats (le payload ne transporte
  // pas la chaîne d'origine, qui en est la simple mise en forme).
  var STAT_ORDER = ['hp', 'brv', 'atk', 'def', 'luk'];
  function fmtStats(stats) {
    if (!stats) return '';
    return STAT_ORDER.filter(function (k) { return stats[k] != null; })
      .map(function (k) { return k.toUpperCase() + ' ' + (stats[k] > 0 ? '+' : '') + stats[k]; })
      .join(' ');
  }
  // Les motifs d'illégalité sont mutualisés dans une légende (item.ill = code).
  function illegalReason(item) { return item && item.ill ? D.illegalReasons[item.ill] : null; }

  // Un build hors budget reste valide au sens du stockage : « invalide » ne
  // désigne ici que l'état signalé à l'utilisateur.
  function emptyBuild(slug) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id: uid(),
      name: '',
      character: slug || null,
      attacks: [],
      abilities: [],
      equipment: { weapon: null, hand: null, head: null, body: null },
      accessories: new Array(ACCESSORY_SLOTS).fill(null),
      assist: null,
      summon: null,
      notes: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
  }

  var state = {
    build: emptyBuild(null),
    // Les builds de tournoi se composent avec des éléments maîtrisés : c'est le
    // coût réduit qui sert de référence, d'où la valeur par défaut.
    mastered: true,
    showIllegal: false,
    dirty: false,
    activeTab: 'attack',
    // Boosters écartés du multiplicateur actif. Un booster ne s'applique que si
    // sa condition de combat est remplie (« When your HP is 100% ») : cela
    // dépend de la situation, pas du build. Ces cases ne sont donc ni
    // enregistrées, ni exportées, ni transportées par le lien de partage — tout
    // est actif par défaut, ce qui redonne le Max Booster du récapitulatif.
    // La clé associe l'emplacement et la pièce qui l'occupe : changer
    // d'accessoire suffit à rendre une case obsolète inopérante.
    boostersOff: {},
  };

  // --- Stockage -------------------------------------------------------------
  function loadAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.builds)) return [];
      return parsed.builds.filter(function (b) { return validateBuild(b).ok; });
    } catch (e) { return []; }
  }
  function saveAll(builds) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, builds: builds }));
      return true;
    } catch (e) {
      toast(T('err.storageFull'), true);
      return false;
    }
  }

  // Validation stricte : un import ne doit jamais introduire de structure
  // inattendue, ni d'identifiant inconnu des données de jeu.
  function validateBuild(b) {
    if (!b || typeof b !== 'object') return { ok: false, error: T('err.notObject') };
    if (b.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: T('err.schema', { found: b.schemaVersion, expected: SCHEMA_VERSION }) };
    if (typeof b.character !== 'string' || !charBySlug[b.character]) return { ok: false, error: T('err.character', { name: b.character }) };
    if (!Array.isArray(b.attacks) || !Array.isArray(b.abilities)) return { ok: false, error: T('err.lists') };
    if (!b.equipment || typeof b.equipment !== 'object') return { ok: false, error: T('err.equipBlock') };
    if (!Array.isArray(b.accessories)) return { ok: false, error: T('err.accList') };
    var badSlot = SLOTS.some(function (s) {
      var v = b.equipment[s.key];
      return v != null && (typeof v !== 'string' || !equipByUid[v]);
    });
    if (badSlot) return { ok: false, error: T('err.unknownEquip') };
    var badAcc = b.accessories.some(function (v) { return v != null && (typeof v !== 'string' || !accByUid[v]); });
    if (badAcc) return { ok: false, error: T('err.unknownAcc') };
    if (b.assist != null && !assistBySlug[b.assist]) return { ok: false, error: T('err.unknownAssist', { name: b.assist }) };
    if (b.summon != null && !summonById[b.summon]) return { ok: false, error: T('err.unknownSummon', { name: b.summon }) };
    return { ok: true };
  }

  // Remet un build importé dans une forme sûre (longueurs, types, dates).
  function normalize(b) {
    var out = emptyBuild(b.character);
    out.id = typeof b.id === 'string' && b.id ? b.id : out.id;
    out.name = typeof b.name === 'string' ? b.name.slice(0, 60) : '';
    // Une ability ne s'équipe qu'une fois : on déduplique, sinon un lien de
    // partage bricolé gonflerait le coût en CP. Une attaque, si : Vaan peut
    // poser trois fois Crossbow (ground) sur ses braveries au sol. Seul le
    // nombre est borné, sur ce que le format binaire sait transporter.
    var uniq = function (list, keep) {
      var seen = {};
      return list.filter(function (id) {
        if (typeof id !== 'string' || seen[id] || (keep && !keep(id))) return false;
        seen[id] = true;
        return true;
      });
    };
    out.attacks = (Array.isArray(b.attacks) ? b.attacks : [])
      .filter(function (id) { return typeof id === 'string'; })
      .slice(0, MAX_ATTACKS);
    out.abilities = uniq(b.abilities, function (id) { return !!abilityById[id]; });
    SLOTS.forEach(function (s) { out.equipment[s.key] = b.equipment[s.key] || null; });
    out.accessories = new Array(ACCESSORY_SLOTS).fill(null);
    b.accessories.slice(0, ACCESSORY_SLOTS).forEach(function (v, i) { out.accessories[i] = v || null; });
    out.assist = b.assist || null;
    out.summon = b.summon || null;
    out.notes = typeof b.notes === 'string' ? b.notes.slice(0, 2000) : '';
    out.created = typeof b.created === 'string' ? b.created : out.created;
    out.modified = new Date().toISOString();
    return out;
  }

  // --- Calculs --------------------------------------------------------------
  function attackById(char, id) {
    var found = null;
    ['bravery', 'hp'].forEach(function (kind) {
      (char.attacks[kind] || []).forEach(function (g) {
        g.moves.forEach(function (m) { if (m.id === id) found = m; });
      });
    });
    return found;
  }

  function cpOf(entry) {
    if (!entry) return 0;
    if (state.mastered && entry.cpMastered != null) return entry.cpMastered;
    return entry.cp != null ? entry.cp : 0;
  }

  function equippedAccessories() {
    return state.build.accessories.map(function (u) { return u ? accByUid[u] : null; }).filter(Boolean);
  }
  function equippedEquipment() {
    return SLOTS.map(function (s) { return state.build.equipment[s.key] ? equipByUid[state.build.equipment[s.key]] : null; }).filter(Boolean);
  }

  // Capacité maximale : 450 + gains des accessoires extenseurs, plafonnés au
  // nombre d'exemplaires documenté (2 Hero's Spirit + 1 Hero's Essence = 510).
  function capacity() {
    var bonus = 0;
    var over = [];
    (D.capacity.extenders || []).forEach(function (ext) {
      var count = state.build.accessories.filter(function (u) { return u === ext.uid; }).length;
      if (count > ext.maxEquipped) over.push(ext.name + ' ×' + count);
      bonus += Math.min(count, ext.maxEquipped) * ext.cp;
    });
    return { max: D.capacity.base + bonus, overEquipped: over };
  }

  function computeCp() {
    var char = charBySlug[state.build.character];
    var attacks = 0;
    // Un coût absent des sources n'est pas un coût nul : on le compte pour zéro
    // faute de mieux, mais on le signale pour que le total se lise comme un
    // minimum et non comme une valeur exacte.
    var unknown = [];
    state.build.attacks.forEach(function (id) {
      var m = attackById(char, id);
      if (m && m.cp == null) unknown.push(m.name);
      attacks += cpOf(m);
    });
    var abilities = 0;
    state.build.abilities.forEach(function (id) {
      var a = abilityById[id];
      if (a && a.cp == null) unknown.push(a.name);
      abilities += cpOf(a);
    });
    var cap = capacity();
    return {
      attacks: attacks, abilities: abilities, used: attacks + abilities,
      max: cap.max, overEquipped: cap.overEquipped, unknownCost: unknown,
    };
  }

  // Cumul multiplicatif des boosters équipés. Confirmé par l'exemple chiffré du
  // guide de builds multijoueur (1.5 × 1.4 × 1.3 = le ×2.7 annoncé).
  //
  // Le produit brut donne 2.7299… : on arrête le multiplicateur à la décimale
  // que la source imprime, une fois pour toutes, et c'est cette valeur-là qui
  // sert ensuite au calcul. Sans cet arrondi unique, le panneau afficherait
  // ×2,7 tout en multipliant par 2,7299 — un écart que le lecteur retrouverait
  // au bout de sa propre multiplication.
  function roundMultiplier(value) { return Math.round(value * 10) / 10; }

  function maxBooster() {
    return roundMultiplier(equippedAccessories().reduce(function (acc, a) {
      return a.category === 'booster' && a.multiplier ? acc * a.multiplier : acc;
    }, 1));
  }

  // Boosters équipés, dans l'ordre des emplacements. L'emplacement fait partie
  // de l'identité : deux exemplaires d'un même booster se cochent séparément.
  function equippedBoosters() {
    var out = [];
    state.build.accessories.forEach(function (u, index) {
      var a = u ? accByUid[u] : null;
      if (!a || a.category !== 'booster' || !a.multiplier) return;
      out.push({ key: index + ':' + a.uid, item: a });
    });
    return out;
  }

  // Multiplicateur réellement retenu : le produit des seuls boosters cochés.
  // Tant qu'on ne décoche rien, il vaut le Max Booster.
  function activeBooster() {
    return roundMultiplier(equippedBoosters().reduce(function (acc, b) {
      return state.boostersOff[b.key] ? acc : acc * b.item.multiplier;
    }, 1));
  }

  // Une ability conditionnée à un équipement nomme sa catégorie au singulier
  // (« when equipping hairpins or headbands » -> « hairpin », « headband ») ;
  // les pièces, elles, portent la catégorie du wiki. On rapproche les deux.
  function equippedCategories() {
    return equippedEquipment().map(function (e) { return (e.category || '').toLowerCase(); });
  }
  function categoryEquipped(want, categories) {
    return categories.some(function (have) { return have === want || have === want + 's' || have.indexOf(want) === 0; });
  }

  // Totaux = base niveau 100 + bonus des pièces équipées + abilities à bonus
  // conditionnel. Les modificateurs en pourcentage n'entrent pas dans ces
  // totaux : les sources ne les expriment pas en points. Ils sont cumulés à
  // part, dans le panneau des statistiques détaillées.
  function computeStats() {
    var char = charBySlug[state.build.character];
    var base = D.baseStats.byCharacter[state.build.character] || {};
    var totals = {
      hp: D.baseStats.shared.hp,
      brv: D.baseStats.shared.brv,
      luk: D.baseStats.shared.luk,
      atk: base.atk != null ? base.atk : null,
      def: base.def != null ? base.def : null,
    };
    var equipped = equippedEquipment();
    equipped.forEach(function (e) {
      Object.keys(e.stats || {}).forEach(function (k) {
        if (totals[k] == null) return;
        totals[k] += e.stats[k];
      });
    });
    // Bonus d'abilities : « BRV +100 when equipping hairpins or headbands ».
    var applied = [];
    var categories = equippedCategories();
    state.build.abilities.forEach(function (id) {
      var ab = abilityById[id];
      if (!ab || !ab.statBonus) return;
      var match = ab.statBonus.whenEquipping.some(function (want) { return categoryEquipped(want, categories); });
      if (!match) return;
      if (totals[ab.statBonus.stat] == null) return;
      totals[ab.statBonus.stat] += ab.statBonus.value;
      applied.push(ab.name);
    });
    return { totals: totals, appliedAbilities: applied, unknownAtkDef: base.atk == null, character: char };
  }

  // Un équipement est portable nativement si sa catégorie figure parmi celles du
  // personnage ; ses armes/armures exclusives le sont aussi. Sinon, il passe par
  // l'Equip Glitch — sauf quand la source ne documente pas la catégorie.
  function equipStatus(item) {
    var char = charBySlug[state.build.character];
    if (item.exclusiveTo) {
      return item.exclusiveTo === char.slug
        ? { state: 'native', label: T('equipState.exclusiveOwn') }
        : { state: 'unavailable', label: T('equipState.exclusiveOther') };
    }
    var native = (char.native[item.slot] || []).map(function (c) { return c.toLowerCase(); });
    if (!native.length) return { state: 'unknown', label: T('equipState.noNative') };
    var cat = (item.category || '').toLowerCase();
    var known = (D.equipmentCategories[item.slot] || []).map(function (c) { return c.toLowerCase(); });
    if (known.indexOf(cat) === -1) return { state: 'unknown', label: T('equipState.unknownCategory', { category: item.category }) };
    if (native.indexOf(cat) !== -1) return { state: 'native', label: T('equipState.native') };
    return { state: 'glitch', label: T('equipState.needsGlitch') };
  }

  function itemLegality(item) {
    // Aucun équipement listé n'est banni par le ruleset : les artefacts, seuls
    // équipements interdits, sont générés aléatoirement et n'ont pas de fiche.
    if (item.legal === false) return { legal: false, reason: illegalReason(item) };
    return { legal: true, reason: null };
  }

  // --- Sets d'équipement actifs --------------------------------------------
  // Un set « à trois pièces » peut en lister quatre : trois suffisent. On compte
  // donc les emplacements pourvus par une pièce de la série, et on compare au
  // nombre requis par la source.
  function activeCombinations() {
    var names = equippedEquipment().map(function (e) { return e.name; });
    return D.combinations.filter(function (c) {
      if (!c.required) return false;
      var matched = Object.keys(c.pieces).filter(function (slot) {
        return c.pieces[slot].some(function (piece) { return names.indexOf(piece) !== -1; });
      }).length;
      return matched >= c.required;
    });
  }

  // --- Statistiques détaillées ---------------------------------------------
  // Les sources n'ont pas de champ « modificateur de dégâts » : elles écrivent
  // l'effet en clair sur la pièce (« Physical Damage +7% »), dans un ordre et
  // une orthographe qui varient d'une page de wiki à l'autre. On relit donc ces
  // chaînes ici, en trois temps : découper en atomes, reconnaître le libellé,
  // additionner. Un atome dont le libellé n'est pas dans la table ci-dessous
  // n'est jamais interprété — il est réaffiché mot pour mot, faute de quoi un
  // effet non prévu disparaîtrait de l'écran sans que personne le sache.
  //
  // `from` liste toutes les orthographes rencontrées dans les sources pour un
  // même effet : le Final Fantasy Wiki écrit « Magic Damage » sur les
  // équipements et « Magical Damage » sur les accessoires, « Defence » sur
  // certaines pages et « Defense » sur d'autres. Rapprocher deux graphies d'un
  // même effet n'est pas une interprétation ; en inventer un le serait.
  var DETAIL_STATS = [
    { key: 'damage', group: 'damage', unit: '%', from: ['damage'] },
    { key: 'physicalDamage', group: 'damage', unit: '%', from: ['physical damage'] },
    { key: 'magicDamage', group: 'damage', unit: '%', from: ['magic damage', 'magical damage'] },
    { key: 'wallRushDamage', group: 'damage', unit: '%', from: ['wall rush damage'] },
    { key: 'wallRushBrvDamage', group: 'damage', unit: '%', from: ['wall rush brv damage', 'wall rush bravery damage'] },
    { key: 'wallRushHpDamage', group: 'damage', unit: '%', from: ['wall rush hp damage'] },
    { key: 'chaseBrvDamage', group: 'damage', unit: '%', from: ['chase brv damage'] },
    { key: 'exModeDamage', group: 'damage', unit: '%', from: ['ex mode damage'] },
    { key: 'exRevengeDamage', group: 'damage', unit: '%', from: ['ex revenge damage'] },
    { key: 'magicCounterStrength', group: 'damage', unit: '%', from: ['magic counter strength'] },
    { key: 'damageNearDeath', group: 'damage', unit: '%', from: ['damage boost near death'] },
    { key: 'iaiStrike', group: 'damage', unit: '%', from: ['iai strike'] },
    { key: 'exIaiStrike', group: 'damage', unit: '%', from: ['ex iai strike'] },
    { key: 'assistIaiStrike', group: 'damage', unit: '%', from: ['assist iai strike'] },

    { key: 'defense', group: 'defense', unit: '%', from: ['defense', 'defence'] },
    { key: 'physicalDefense', group: 'defense', unit: '%', from: ['physical defense', 'physical defence', 'physical def'] },
    { key: 'magicDefense', group: 'defense', unit: '%', from: ['magic defense', 'magical defense', 'magic defence', 'magical defence'] },
    { key: 'wallRushDefense', group: 'defense', unit: '%', from: ['wall rush defense', 'wall rush defence'] },
    { key: 'wallRushBrvDefense', group: 'defense', unit: '%', from: ['wall rush brv defense', 'wall rush brv defence'] },
    { key: 'wallRushHpDefense', group: 'defense', unit: '%', from: ['wall rush hp defense', 'wall rush hp defence'] },
    { key: 'chaseBrvDefense', group: 'defense', unit: '%', from: ['chase brv defense', 'chase brv defence'] },
    { key: 'stageDefense', group: 'defense', unit: '%', from: ['stage defense', 'stage defence'] },
    { key: 'warpDefense', group: 'defense', unit: '%', from: ['warp defense', 'warp defence'] },
    { key: 'banishTrapDefense', group: 'defense', unit: '%', from: ['banish trap defense', 'banish trap defence'] },
    { key: 'foeCritRate', group: 'defense', unit: '%', from: ['foe’s critical hit rate', 'foe\'s critical hit rate'] },

    { key: 'initialBravery', group: 'brv', unit: '%', from: ['initial bravery'] },
    { key: 'initialHp', group: 'brv', unit: '%', from: ['initial hp'] },
    { key: 'brvRecovery', group: 'brv', unit: '%', from: ['brv recovery', 'bravery recovery'] },
    { key: 'regen', group: 'brv', unit: '%', from: ['regen', 'regen rate'] },
    { key: 'brvOnDodge', group: 'brv', unit: '%', from: ['brv boost on dodge'] },
    { key: 'brvOnBlock', group: 'brv', unit: '%', from: ['brv boost on block'] },
    { key: 'brvOnQuickmove', group: 'brv', unit: '%', from: ['brv boost on quickmove'] },
    { key: 'brvOnStageDestruction', group: 'brv', unit: '%', from: ['brv boost on stage destruction', 'brv boost during stage destruction'] },
    { key: 'lastChance', group: 'brv', unit: '%', from: ['last chance'] },

    { key: 'initialExForce', group: 'ex', unit: '%', from: ['initial ex force'] },
    { key: 'exForceAbsorption', group: 'ex', unit: '%', from: ['ex force absorption'] },
    { key: 'exCoreAbsorption', group: 'ex', unit: '%', from: ['ex core absorption'] },
    { key: 'exIntakeRange', group: 'ex', unit: 'm', from: ['ex intake range', 'ex intake', 'ex force absorption range'] },
    { key: 'exModeDuration', group: 'ex', unit: '%', from: ['ex mode duration'] },
    { key: 'exRevengeDuration', group: 'ex', unit: '%', from: ['ex revenge duration'] },
    { key: 'exGaugeDepletion', group: 'ex', unit: '%', from: ['ex gauge depletion'] },

    { key: 'initialAssistCharge', group: 'assist', unit: '%', from: ['initial assist charge'] },
    { key: 'assistGaugeCharge', group: 'assist', unit: '%', from: ['assist gauge charge'] },
    { key: 'assistGaugeDuration', group: 'assist', unit: '%', from: ['assist gauge duration'] },
    { key: 'assistGaugeDepletion', group: 'assist', unit: '%', from: ['assist gauge depletion'] },
    { key: 'astChargeOnDamage', group: 'assist', unit: '%', from: ['ast charge on damage'] },

    { key: 'experienceValue', group: 'misc', unit: '%', from: ['experience value', 'exp'] },
    { key: 'ap', group: 'misc', unit: '%', from: ['ap', 'ap earned'] },
    { key: 'pp', group: 'misc', unit: '%', from: ['pp'] },
    { key: 'gil', group: 'misc', unit: '%', from: ['gil', 'gil earned in battle'] },
    { key: 'dropRate', group: 'misc', unit: '%', from: ['drop rate'] },
    { key: 'battlegenRate', group: 'misc', unit: '%', from: ['battlegen rate'] },
    { key: 'accessoryBreakability', group: 'misc', unit: '%', from: ['accessory breakability', 'accessories breakability'] },
    { key: 'summonRecharge', group: 'misc', unit: '', from: ['summon recharge'] },

    // Bonus en points portés par les accessoires. Les statistiques de base et
    // les bonus d'équipement vivent dans la ligne de totaux ; ceux-ci n'y
    // figurent pas, et le panneau le dit.
    { key: 'hp', group: 'flat', unit: '', from: ['hp'] },
    { key: 'brv', group: 'flat', unit: '', from: ['brv', 'brave'] },
    { key: 'atk', group: 'flat', unit: '', from: ['atk'] },
    { key: 'def', group: 'flat', unit: '', from: ['def'] },
    { key: 'luk', group: 'flat', unit: '', from: ['luk', 'luck'] },
    { key: 'cp', group: 'flat', unit: '', from: ['cp'] },
  ];
  var DETAIL_GROUP_ORDER = ['damage', 'defense', 'brv', 'ex', 'assist', 'misc', 'flat'];

  // Deux effets énoncés d'un seul tenant : « EX Force & Core Absorption +25% »
  // porte un seul nombre pour deux statistiques. On ne le devine pas, on le
  // déclare — la liste est courte et fermée.
  var DETAIL_COMPOUND = {
    'ex force & core absorption': ['exForceAbsorption', 'exCoreAbsorption'],
    'ex mode & ex revenge duration': ['exModeDuration', 'exRevengeDuration'],
  };

  var DETAIL_BY_LABEL = {};
  DETAIL_STATS.forEach(function (s) { s.from.forEach(function (label) { DETAIL_BY_LABEL[label] = s.key; }); });
  var DETAIL_BY_KEY = {};
  DETAIL_STATS.forEach(function (s) { DETAIL_BY_KEY[s.key] = s; });

  // « Adamant Chains (1/4) » sur une pièce dit son appartenance à un set, pas un
  // effet : les sets ont leurs propres effets, comptés une fois le set actif.
  var SET_PIECE_MARK = /\(\s*\d+\s*\/\s*\d+\s*\)$/;
  // Le wiki suffixe l'effet des pièces exclusives au Labyrinthe. C'est la pièce
  // qui est réservée au mode, pas l'effet qui s'y limiterait : elle porte déjà
  // son propre marqueur, on retire donc le doublon.
  var LABYRINTH_MARK = /\s*\(Labyrinth\)$/i;
  var ATOM_SUFFIX = /^(.+?)\s*([+-]\s*\d+(?:\.\d+)?)\s*(%|m)?$/;
  var ATOM_PREFIX = /^([+-]\s*\d+(?:\.\d+)?)\s*(%|m)?\s+(.+)$/;

  function detailLabelKeys(label) {
    var norm = String(label).toLowerCase().replace(/\s+/g, ' ').trim();
    if (DETAIL_COMPOUND[norm]) return DETAIL_COMPOUND[norm];
    return DETAIL_BY_LABEL[norm] ? [DETAIL_BY_LABEL[norm]] : null;
  }

  // Découpe un champ d'effets en atomes. Les séparateurs sont « · » et le retour
  // à la ligne. « & » ne sépare que si ses deux membres portent un nombre : sans
  // cela, « EX Force & Core Absorption +25% » serait coupé en deux dont un sans
  // valeur. La virgule et le point ne séparent jamais — ils appartiennent à des
  // effets rédigés en phrase, qu'on préfère laisser entiers plutôt que hacher.
  function effectAtoms(text) {
    var out = [];
    String(text || '').split(/·|\n/).forEach(function (chunk) {
      var part = chunk.trim().replace(LABYRINTH_MARK, '').replace(/\.$/, '').trim();
      if (!part) return;
      var pieces = [part];
      if (part.indexOf('&') !== -1) {
        var split = part.split('&');
        if (split.every(function (p) { return /[+-]\s*\d/.test(p); })) pieces = split;
      }
      pieces.forEach(function (p) { if (p.trim()) out.push(p.trim()); });
    });
    return out;
  }

  // Un atome donne soit des valeurs chiffrées rattachées à des statistiques
  // connues, soit rien — auquel cas il ressort tel quel.
  function readAtom(atom) {
    if (SET_PIECE_MARK.test(atom)) return null;
    var label;
    var value;
    var m = ATOM_PREFIX.exec(atom);
    if (m) { value = m[1]; label = m[3]; }
    else {
      m = ATOM_SUFFIX.exec(atom);
      if (!m) return { raw: atom };
      label = m[1]; value = m[2];
    }
    var keys = detailLabelKeys(label);
    if (!keys) return { raw: atom };
    // L'unité affichée est celle de la table, pas celle de la chaîne : c'est la
    // statistique qui a une unité, pas chacune de ses formulations.
    return { keys: keys, value: Number(value.replace(/\s/g, '')) };
  }

  // « Damage +5% when equipping swords, daggers, greatswords, or katana. » :
  // un modificateur en pourcentage soumis à la catégorie équipée. Le parseur de
  // données ne retient que les bonus en points (statBonus), d'où cette relecture
  // ici — même découpage des catégories que scripts/parse-builddata.mjs.
  var ABILITY_PERCENT = /^\s*(.+?)\s*([+-]\d+)%\s+when equipping\s+(.+?)\.?\s*$/i;
  function abilityPercentBonus(ability) {
    var m = ABILITY_PERCENT.exec(ability && ability.description || '');
    if (!m) return null;
    var keys = detailLabelKeys(m[1]);
    if (!keys) return null;
    var wanted = m[3].split(/,|\bor\b|\band\b/i)
      .map(function (s) { return s.trim().replace(/s$/i, '').toLowerCase(); })
      .filter(Boolean);
    return { keys: keys, value: Number(m[2]), whenEquipping: wanted };
  }

  // Cumul des modificateurs portés par le build : équipements, accessoires, sets
  // actifs et abilities conditionnelles. Les effets de même nom sont additionnés
  // — c'est la lecture la plus simple des sources, qui énoncent chaque effet
  // isolément et ne disent jamais comment deux d'entre eux se combinent en jeu.
  // Le panneau le déclare plutôt que de laisser croire à une formule vérifiée.
  //
  // Le multiplicateur des boosters ne porte que sur les effets des accessoires,
  // jamais sur ceux des équipements, des sets ou des abilities : c'est la règle
  // que donne le guide de builds multijoueur. Et parmi ces effets, seuls ceux
  // exprimés en pourcentage sont multipliés — la source oppose les « accessory
  // effects » aux « statistics », et un LUK +4 porté à +10,8 ou une recharge
  // d'invocation à +2,7 ne voudraient rien dire. Ce que les sources ne tranchent
  // pas reste donc intact plutôt que d'être multiplié au jugé.
  function computeDetailStats(multiplier) {
    var totals = {};
    var others = [];
    var otherSeen = {};

    function add(sourceName, text, numericOnly, boosted) {
      effectAtoms(text).forEach(function (atom) {
        var read = readAtom(atom);
        if (!read) return;
        if (read.raw) {
          if (numericOnly) return;
          var seen = sourceName + ' ' + read.raw;
          if (otherSeen[seen]) { otherSeen[seen].count++; return; }
          otherSeen[seen] = { name: sourceName, text: read.raw, count: 1 };
          others.push(otherSeen[seen]);
          return;
        }
        read.keys.forEach(function (key) {
          var factor = boosted && DETAIL_BY_KEY[key].unit === '%' ? multiplier : 1;
          var value = read.value * factor;
          if (!totals[key]) totals[key] = { value: 0, from: [] };
          totals[key].value += value;
          totals[key].from.push({ name: sourceName, value: value });
        });
      });
    }

    equippedEquipment().forEach(function (e) { add(e.name, e.effects, false, false); });
    // Les matériaux d'échange portent une description d'ambiance là où les
    // autres accessoires portent un effet : on n'en garde que le chiffré.
    equippedAccessories().forEach(function (a) { add(a.name, a.effect, a.category === 'trade', true); });
    activeCombinations().forEach(function (c) { add(c.name, c.effects, false, false); });

    var categories = equippedCategories();
    state.build.abilities.forEach(function (id) {
      var ab = abilityById[id];
      var bonus = ab && abilityPercentBonus(ab);
      if (!bonus) return;
      if (!bonus.whenEquipping.some(function (want) { return categoryEquipped(want, categories); })) return;
      bonus.keys.forEach(function (key) {
        if (!totals[key]) totals[key] = { value: 0, from: [] };
        totals[key].value += bonus.value;
        totals[key].from.push({ name: ab.name, value: bonus.value });
      });
    });

    return { totals: totals, others: others };
  }

  // --- Rendu : jauge et panneau d'état -------------------------------------
  var gauge = {
    wrap: document.getElementById('bc-gauge-wrap'),
    meter: document.getElementById('bc-gauge'),
    attacks: document.getElementById('bc-gauge-attacks'),
    abilities: document.getElementById('bc-gauge-abilities'),
    used: document.getElementById('bc-gauge-used'),
    max: document.getElementById('bc-gauge-max'),
    a: document.getElementById('bc-gauge-a'),
    b: document.getElementById('bc-gauge-b'),
  };
  var statusBox = document.getElementById('bc-status');

  function renderGauge() {
    var cp = computeCp();
    var over = cp.used > cp.max;
    var scale = Math.max(cp.max, cp.used) || 1;
    gauge.attacks.style.width = (cp.attacks / scale * 100) + '%';
    gauge.abilities.style.width = (cp.abilities / scale * 100) + '%';
    gauge.wrap.classList.toggle('is-over', over);
    gauge.used.textContent = String(cp.used);
    gauge.max.textContent = String(cp.max);
    gauge.a.textContent = String(cp.attacks);
    gauge.b.textContent = String(cp.abilities);
    gauge.meter.setAttribute('aria-valuemax', String(cp.max));
    gauge.meter.setAttribute('aria-valuenow', String(cp.used));
    gauge.meter.setAttribute('aria-valuetext',
      T('gauge.valueText', { used: cp.used, max: cp.max, attacks: cp.attacks, abilities: cp.abilities })
      + (over ? T('gauge.over') : ''));
    return cp;
  }

  function renderStatus(cp) {
    clear(statusBox);
    var problems = [];
    var infos = [];

    if (cp.used > cp.max) problems.push(T('status.overBudget', { over: cp.used - cp.max }));
    if (cp.unknownCost.length) {
      infos.push(T('status.unknownCost', { list: cp.unknownCost.join(', ') }));
    }
    cp.overEquipped.forEach(function (o) {
      problems.push(T('status.overCapacity', { name: o, max: D.capacity.max }));
    });

    // Un build importé ou reçu par lien peut dépasser la limite d'exemplaires.
    var dejaVu = {};
    equippedAccessories().forEach(function (a) {
      if (dejaVu[a.uid]) return;
      dejaVu[a.uid] = true;
      var limite = copyLimit(a);
      var n = copiesOf(a.uid);
      if (limite !== null && limite !== Infinity && n > limite) {
        problems.push(T('status.tooManyCopies', { name: a.name, count: n, max: limite, rank: a.rank }));
      }
      if (limite === null) infos.push(T('status.unknownRank', { name: a.name }));
    });

    var illegal = [];
    equippedAccessories().forEach(function (a) { if (a.legal === false) illegal.push(a.name); });
    if (state.build.summon) {
      var sm = summonById[state.build.summon];
      if (sm && sm.legal === false) illegal.push(sm.name + ' ' + T('status.summonSuffix'));
    }
    if (illegal.length) problems.push(T('status.illegalItems', { list: illegal.join(', ') }));

    var glitch = [];
    var unavailable = [];
    equippedEquipment().forEach(function (e) {
      var st = equipStatus(e);
      if (st.state === 'glitch') glitch.push(e.name);
      if (st.state === 'unavailable') unavailable.push(e.name);
    });
    if (unavailable.length) problems.push(T('status.notWearable', { list: unavailable.join(', ') }));
    if (glitch.length) infos.push(T('status.glitchNeeded', { list: glitch.join(', ') }));

    var combos = activeCombinations();
    if (combos.length) infos.push(T('status.activeSet', { list: combos.map(function (c) { return c.name + ' — ' + c.effects; }).join(' ; ') }));

    var st = computeStats();
    var boost = maxBooster();
    var statLine = el('p', { class: 'bc-stat-line' });
    [['HP', st.totals.hp], ['CP', cp.max], ['BRV', st.totals.brv], ['ATK', st.totals.atk], ['DEF', st.totals.def], ['LUK', st.totals.luk]]
      .forEach(function (pair) {
        statLine.appendChild(el('span', { class: 'bc-stat' }, [
          el('strong', { text: pair[0] }), ' ', el('span', { text: pair[1] == null ? T('status.undocumented') : String(pair[1]) }),
        ]));
      });
    statLine.appendChild(el('span', { class: 'bc-stat' }, [
      el('strong', { text: T('equipment.maxBooster') }), ' ', el('span', { text: fmtMultiplier(boost) }),
    ]));
    statusBox.appendChild(statLine);

    if (st.appliedAbilities.length) {
      infos.push(T('status.abilityBonus', { list: st.appliedAbilities.join(', ') }));
    }

    // Seuls les messages qui dépendent du build restent dans le panneau collant :
    // l'explication du mode de calcul, invariable, vit dans les repères de la page.
    problems.forEach(function (p) { statusBox.appendChild(el('p', { class: 'bc-alert bc-alert-error', text: p })); });
    infos.forEach(function (i) { statusBox.appendChild(el('p', { class: 'bc-alert bc-alert-info', text: i })); });
  }

  // Le panneau détaillé vit hors de `bc-status`, que renderStatus vide à chaque
  // rendu : le <details> reste ainsi le même élément d'un bout à l'autre de la
  // session, et son état ouvert/fermé survit à toute modification du build.
  var detail = {
    count: document.getElementById('bc-detail-count'),
    main: document.getElementById('bc-detail-main'),
    boosters: document.getElementById('bc-detail-boosters'),
  };

  function fmtModifier(value, unit) {
    var n = Math.round(value * 10) / 10;
    return (n > 0 ? '+' : '') + n + unit;
  }
  // Le séparateur décimal appartient à la langue : le ×1,5 des règles de tournoi
  // s'écrit ×1.5 en anglais.
  function fmtMultiplier(value) {
    return '×' + value.toLocaleString(BC.locale);
  }

  // Colonne de gauche : les modificateurs cumulés, multiplicateur déjà appliqué
  // aux contributions d'accessoires. Elle se redessine seule quand on coche un
  // booster, pour que la case gardée le focus ne soit pas recréée sous le doigt.
  function renderDetailMain() {
    if (!detail.main) return;
    clear(detail.main);
    var d = computeDetailStats(activeBooster());
    var shown = 0;

    DETAIL_GROUP_ORDER.forEach(function (group) {
      var rows = DETAIL_STATS.filter(function (s) { return s.group === group && d.totals[s.key]; });
      if (!rows.length) return;
      shown += rows.length;
      detail.main.appendChild(el('h3', { class: 'bc-detail-group', text: T('detail.groups.' + group) }));
      if (group === 'flat') detail.main.appendChild(el('p', { class: 'bc-detail-note', text: T('detail.flatNote') }));
      var list = el('dl', { class: 'bc-detail-list' });
      rows.forEach(function (s) {
        var slot = d.totals[s.key];
        list.appendChild(el('dt', { text: T('detail.stats.' + s.key) }));
        list.appendChild(el('dd', {}, [
          el('span', { class: 'bc-detail-value', text: fmtModifier(slot.value, s.unit) }),
          el('span', {
            class: 'bc-detail-from',
            text: slot.from.map(function (f) { return f.name + ' ' + fmtModifier(f.value, s.unit); }).join(' · '),
          }),
        ]));
      });
      detail.main.appendChild(list);
    });

    // Ce que l'outil ne sait pas chiffrer est reproduit tel quel : un effet non
    // reconnu doit rester lisible, jamais être escamoté.
    if (d.others.length) {
      detail.main.appendChild(el('h3', { class: 'bc-detail-group', text: T('detail.others') }));
      var others = el('ul', { class: 'bc-detail-others' });
      d.others.forEach(function (o) {
        others.appendChild(el('li', {}, [
          el('strong', { text: o.name + (o.count > 1 ? ' ×' + o.count : '') }), ' ', o.text,
        ]));
      });
      detail.main.appendChild(others);
    }

    if (!shown && !d.others.length) {
      detail.main.appendChild(el('p', { class: 'bc-detail-note', text: T('detail.empty') }));
    }
    if (detail.count) {
      detail.count.textContent = shown === 1 ? T('detail.countOne') : T('detail.countMany', { count: shown });
    }
  }

  // Colonne de droite : les boosters équipés, un par ligne. Décocher revient à
  // dire « cette condition n'est pas remplie » — le multiplicateur tombe, et la
  // colonne de gauche est recalculée.
  function renderDetailBoosters() {
    if (!detail.boosters) return;
    clear(detail.boosters);
    var list = equippedBoosters();
    detail.boosters.appendChild(el('h3', { class: 'bc-detail-group', text: T('detail.boosters.title') }));
    if (!list.length) {
      detail.boosters.appendChild(el('p', { class: 'bc-detail-note', text: T('detail.boosters.none') }));
      return;
    }

    var totalValue = el('span', { class: 'bc-booster-total-value', text: fmtMultiplier(activeBooster()) });
    list.forEach(function (b) {
      var on = !state.boostersOff[b.key];
      var box = el('input', {
        type: 'checkbox',
        checked: on,
        onchange: function (ev) {
          if (ev.target.checked) delete state.boostersOff[b.key];
          else state.boostersOff[b.key] = true;
          totalValue.textContent = fmtMultiplier(activeBooster());
          renderDetailMain();
        },
      });
      detail.boosters.appendChild(el('label', { class: 'bc-booster' }, [
        box,
        el('span', { class: 'bc-booster-text' }, [
          el('span', { class: 'bc-booster-name' }, [
            el('span', { text: b.item.name }),
            el('span', { class: 'bc-booster-mult', text: fmtMultiplier(b.item.multiplier) }),
          ]),
          b.item.requirements ? el('span', { class: 'bc-booster-req', text: b.item.requirements }) : null,
        ]),
      ]));
    });

    detail.boosters.appendChild(el('p', { class: 'bc-booster-total' }, [
      el('span', { text: T('detail.boosters.total') }), totalValue,
    ]));
    detail.boosters.appendChild(el('p', { class: 'bc-detail-note', text: T('detail.boosters.scope') }));
  }

  function renderDetailStats() {
    renderDetailBoosters();
    renderDetailMain();
  }

  function refresh() {
    var cp = renderGauge();
    renderStatus(cp);
    renderDetailStats();
    renderSavedList();
  }

  function markDirty() { state.dirty = true; }

  // --- Rendu : onglets ------------------------------------------------------
  var panels = {};
  ['attack', 'abilities', 'stuff', 'accessories', 'assist'].forEach(function (k) {
    panels[k] = document.getElementById('bc-panel-' + k);
  });
  var tabButtons = [].slice.call(document.querySelectorAll('.bc-tab'));

  function selectTab(key, focus) {
    state.activeTab = key;
    tabButtons.forEach(function (btn) {
      var on = btn.dataset.tab === key;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
      if (on && focus) btn.focus();
    });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== key; });
    renderPanel(key);
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { selectTab(btn.dataset.tab, false); });
    btn.addEventListener('keydown', function (ev) {
      var i = tabButtons.indexOf(btn);
      var next = null;
      if (ev.key === 'ArrowRight') next = tabButtons[(i + 1) % tabButtons.length];
      else if (ev.key === 'ArrowLeft') next = tabButtons[(i - 1 + tabButtons.length) % tabButtons.length];
      else if (ev.key === 'Home') next = tabButtons[0];
      else if (ev.key === 'End') next = tabButtons[tabButtons.length - 1];
      if (!next) return;
      ev.preventDefault();
      selectTab(next.dataset.tab, true);
    });
  });

  // Un déplacement d'attaque redessine l'onglet : la poignée qu'on manipulait
  // disparaît avec lui. On redonne donc le focus à celle de l'attaque déplacée,
  // sans quoi une suite de flèches au clavier serait interrompue à chaque coup.
  var pendingFocus = null;

  function renderPanel(key) {
    if (!state.build.character) return;
    var panel = panels[key];
    clear(panel);
    if (key === 'attack') renderAttacks(panel);
    else if (key === 'abilities') renderAbilities(panel);
    else if (key === 'stuff') renderStuff(panel);
    else if (key === 'accessories') renderAccessories(panel);
    else if (key === 'assist') renderAssist(panel);
    if (pendingFocus) {
      var handle = panel.querySelector('[data-drag-handle="' + cssEscape(pendingFocus) + '"]');
      pendingFocus = null;
      if (handle) handle.focus({ preventScroll: true });
    }
  }

  // Les identifiants de coups portent espaces, parenthèses et « & » (« bravery:
  // ground:Dart & Weave (ground) ») : ils ne peuvent pas entrer tels quels dans
  // un sélecteur.
  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
    return String(value).replace(/[^\w-]/g, function (c) { return '\\' + c; });
  }

  // --- Fenêtre de choix -----------------------------------------------------
  // Les onglets de sélection déroulaient jusqu'à 400 lignes sous les
  // emplacements : on ne voyait plus ce qu'on était en train d'équiper. Le
  // choix passe donc par une fenêtre, ouverte depuis l'emplacement à remplir.
  //
  // Pas de <dialog> : le site doit rester consultable en file:// et dans des
  // navigateurs embarqués. Le piège au clavier est donc tenu à la main —
  // sans lui, la tabulation repart derrière la fenêtre et on ne sait plus où
  // l'on est.
  var modal = null;

  function closeModal() {
    if (!modal) return;
    var m = modal;
    modal = null;
    document.removeEventListener('keydown', m.onKey, true);
    if (m.back.parentNode) m.back.parentNode.removeChild(m.back);
    document.body.classList.remove('bc-modal-open');
    if (m.opener && m.opener.focus) m.opener.focus({ preventScroll: true });
  }

  function focusables(root) {
    var list = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(list, function (n) { return !n.disabled && n.offsetParent !== null; });
  }

  // `fill(body, close)` peuple la fenêtre. On lui passe `close` pour qu'une
  // ligne choisie referme sans avoir à connaître la mécanique.
  function openModal(title, subtitle, fill) {
    closeModal();
    var opener = document.activeElement;
    var titleId = 'bc-modal-title';
    var body = el('div', { class: 'bc-modal-body' });
    var box = el('div', { class: 'bc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('div', { class: 'bc-modal-head' }, [
        el('div', { class: 'bc-modal-titles' }, [
          el('h3', { id: titleId, text: title }),
          subtitle ? el('p', { class: 'bc-note', text: subtitle }) : null,
        ]),
        el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: T('modal.close'), onclick: function () { closeModal(); } }),
      ]),
      body,
    ]);
    var back = el('div', { class: 'bc-modal-back' }, [box]);
    back.addEventListener('mousedown', function (e) { if (e.target === back) closeModal(); });

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(box);
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);

    modal = { back: back, box: box, body: body, onKey: onKey, opener: opener };
    document.body.appendChild(back);
    document.body.classList.add('bc-modal-open');
    fill(body, closeModal);
    var f = focusables(box);
    // Le champ de recherche d'abord quand il y en a un : on ouvre la fenêtre
    // pour chercher, pas pour lire le bouton de fermeture.
    var search = box.querySelector('input[type="search"]');
    (search || f[0] || box).focus({ preventScroll: true });
    return closeModal;
  }

  // Un emplacement : sa commande à gauche, son contenu au milieu, ses actions à
  // droite. Vide, la ligne entière est le bouton qui ouvre la fenêtre.
  function slotRow(opts) {
    var badge = el('span', { class: 'bc-slot-badge', title: opts.inputTitle || '', text: opts.input || '' });
    if (!opts.filled) {
      return el('button', {
        type: 'button', class: 'bc-slot-row is-empty', onclick: opts.onAssign,
        'aria-label': (opts.inputTitle ? opts.inputTitle + ' — ' : '') + T('slots.assign'),
      }, [
        badge,
        el('span', { class: 'bc-slot-main' }, [el('span', { class: 'bc-slot-empty', text: T('slots.empty') })]),
        el('span', { class: 'bc-slot-plus', 'aria-hidden': 'true', text: '+' }),
      ]);
    }
    var row = el('div', {
      class: 'bc-slot-row' + (opts.className ? ' ' + opts.className : '') + (opts.handle ? ' has-handle' : ''),
      'data-drag-id': opts.dragId || false,
    });
    if (opts.handle) row.appendChild(opts.handle);
    row.appendChild(badge);
    row.appendChild(opts.main);
    var actions = el('span', { class: 'bc-slot-actions' });
    (opts.actions || []).forEach(function (a) { if (a) actions.appendChild(a); });
    actions.appendChild(el('button', {
      type: 'button', class: 'bc-btn bc-btn-small', text: T('slots.change'), onclick: opts.onAssign,
    }));
    actions.appendChild(el('button', {
      type: 'button', class: 'bc-btn bc-btn-small bc-btn-danger', text: T('equipment.remove'), onclick: opts.onRemove,
    }));
    row.appendChild(actions);
    return row;
  }

  // --- Onglet Attaques ------------------------------------------------------
  function groupLabel(key) { return T('groupLabels.' + key) || key; }

  // Trois emplacements par catégorie d'attaque. Une catégorie est définie par le
  // couple (sol/air, style) : les styles d'un personnage — paradigmes de
  // Lightning, jobs de Cecil, moveset EX de Gabranth — ont chacun leurs
  // emplacements. Les enchaînements prolongent un coup et n'en consomment pas.
  var MAX_SLOTS = 3;

  // Découpe un groupe en sous-groupes de style, dans l'ordre d'apparition.
  function byStyle(moves) {
    var out = [];
    var index = {};
    moves.forEach(function (m) {
      var s = m.style || '';
      if (index[s] === undefined) { index[s] = out.length; out.push({ style: m.style || null, moves: [] }); }
      out[index[s]].moves.push(m);
    });
    return out;
  }

  // Un prolongement qui ne se rattache plus à rien est retiré : retirer une
  // bravery emporte l'enchaînement et le HP link qu'elle portait. La lecture
  // positionnelle les signale d'elle-même.
  function pruneOrphanBranches() {
    var char = charBySlug[state.build.character];
    if (!char) return;
    var scan = scanBuild(char);
    if (!scan.orphans.length) return;
    var jeter = {};
    scan.orphans.forEach(function (p) { jeter[p] = true; });
    state.build.attacks = state.build.attacks.filter(function (id, pos) { return !jeter[pos]; });
  }

  // Commandes des trois emplacements d'une catégorie, dans l'ordre où l'écran
  // « Abilities » du jeu les présente : stick neutre, puis les deux directions.
  // La bravery part au rond, l'attaque HP au carré — c'est la seule différence
  // entre les deux colonnes. Le jeu est la source ici : ni dissidia.wiki ni le
  // Final Fantasy Wiki ne publient de table des commandes (voir
  // `undocumented.attackSlots`).
  var SLOT_INPUTS = ['neutral', 'back', 'forward'];
  var KIND_BUTTON = { bravery: '○', hp: '□' };
  var DIRECTION_GLYPH = { neutral: '', back: '←', forward: '→' };
  function inputGlyph(kind, i) {
    var dir = DIRECTION_GLYPH[SLOT_INPUTS[i]];
    return (dir ? dir + ' ' : '') + KIND_BUTTON[kind];
  }
  function inputTitle(kind, i) {
    return T('attacks.input.' + SLOT_INPUTS[i], { button: KIND_BUTTON[kind] });
  }

  // Descriptif court d'un coup, commun à la grille et à la fenêtre de choix.
  function moveMeta(m) {
    var meta = [];
    if (m.damage) meta.push(T('attacks.damage', { value: m.damage }));
    if (m.startup) meta.push(T('attacks.startup', { value: m.startup }));
    if (m.type) meta.push(m.type);
    if (m.priority) meta.push(m.priority);
    if (m.variants) meta.push(m.variants);
    return meta.join(' · ');
  }
  function cpTag(m) {
    return el('span', { class: 'bc-cp', text: m.cp == null ? T('attacks.unknownCost') : cpOf(m) + ' CP' });
  }

  // Une même attaque peut occuper plusieurs commandes : Vaan pose trois fois
  // Crossbow (ground) sur ses braveries au sol. Rien ici ne repère donc une
  // attaque équipée par son identifiant — deux exemplaires seraient
  // indiscernables — mais toujours par sa place dans la liste.
  //
  // Cette liste n'a pas d'autre structure que son ordre. On en tire tout le
  // reste par une lecture positionnelle : chaque prolongement — enchaînement
  // « (Two) » ou attaque HP branchée — se rattache à l'attaque qui le précède
  // immédiatement. Le lien de partage transportant les attaques dans l'ordre,
  // la lecture est la même de l'autre côté.
  function attackIndex(char) {
    var byId = {};
    var linkParent = {};
    (char.links || []).forEach(function (l) { linkParent[l.to] = l.from; });
    // Un enchaînement ne prolonge que les braveries que la source lui donne :
    // Banish et Holy, chez Prishe, n'en portent aucun. Un même enchaînement
    // peut en revanche servir plusieurs braveries (les trois de Firion).
    var followParents = {};
    var followsByParent = {};
    (char.follows || []).forEach(function (f) {
      (followParents[f.to] = followParents[f.to] || {})[f.from] = true;
      (followsByParent[f.from] = followsByParent[f.from] || []).push(f.to);
    });
    ['bravery', 'hp'].forEach(function (kind) {
      (char.attacks[kind] || []).forEach(function (g) {
        g.moves.forEach(function (m) {
          byId[m.id] = {
            move: m, kind: kind, groupKey: g.key, style: m.style || null,
            followUp: !!g.followUp,
            catKey: kind + '|' + g.key + '|' + (m.style || ''),
          };
        });
      });
    });
    return {
      byId: byId, linkParent: linkParent,
      followParents: followParents, followsByParent: followsByParent,
    };
  }

  function scanBuild(char) {
    var index = attackIndex(char);
    var slots = [];
    var orphans = [];
    state.build.attacks.forEach(function (id, pos) {
      var info = index.byId[id];
      if (!info) { orphans.push(pos); return; }
      var parentId = index.linkParent[id];
      if (info.followUp || parentId) {
        var last = slots[slots.length - 1];
        // Un prolongement n'existe pas sans l'attaque qu'il prolonge, et une
        // attaque n'en porte qu'un de chaque sorte.
        var champ = info.followUp ? 'follow' : 'link';
        var recevable = last && !last[champ] && (info.followUp
          ? !!(index.followParents[id] && index.followParents[id][last.id])
          : parentId === last.id);
        if (!recevable) { orphans.push(pos); return; }
        last[champ] = { id: id, pos: pos, move: info.move };
        return;
      }
      slots.push({ id: id, pos: pos, move: info.move, info: info, follow: null, link: null });
    });
    return { slots: slots, orphans: orphans, index: index };
  }

  // Les positions occupées par un emplacement : la sienne, puis celles de ses
  // prolongements, qui la suivent immédiatement.
  function slotPositions(slot) {
    var out = [slot.pos];
    if (slot.link) out.push(slot.link.pos);
    if (slot.follow) out.push(slot.follow.pos);
    return out.sort(function (a, b) { return a - b; });
  }

  // Réécrit la liste depuis la structure lue : c'est le seul moyen de déplacer
  // un emplacement avec ce qui s'y rattache sans tenir de comptabilité d'index.
  function writeSlots(slots) {
    var next = [];
    slots.forEach(function (s) {
      next.push(s.id);
      if (s.link) next.push(s.link.id);
      if (s.follow) next.push(s.follow.id);
    });
    state.build.attacks = next;
  }

  function removeAt(positions) {
    positions.slice().sort(function (a, b) { return b - a; })
      .forEach(function (p) { state.build.attacks.splice(p, 1); });
    afterAttackChange();
  }
  function appendAttack(id) {
    state.build.attacks.push(id);
    afterAttackChange();
  }
  function replaceAt(pos, id) {
    state.build.attacks[pos] = id;
    afterAttackChange();
  }
  // Un prolongement se range juste après l'attaque qu'il prolonge : c'est ce
  // rattachement positionnel que relit `scanBuild`.
  function attachTo(slot, id) {
    var apres = Math.max.apply(null, slotPositions(slot));
    state.build.attacks.splice(apres + 1, 0, id);
    afterAttackChange();
  }

  // Déplacer un emplacement le fait changer de commande. On permute dans la
  // structure lue, puis on réécrit : les prolongements suivent leur attaque.
  function reorderWithin(char, catKey, from, to) {
    var scan = scanBuild(char);
    var mine = scan.slots.filter(function (s) { return s.info.catKey === catKey; });
    if (from === to || to < 0 || to >= mine.length) return;
    var ordre = mine.slice();
    ordre.splice(to, 0, ordre.splice(from, 1)[0]);
    var k = 0;
    var next = scan.slots.map(function (s) { return s.info.catKey === catKey ? ordre[k++] : s; });
    writeSlots(next);
    pendingFocus = catKey + '#' + to;
    markDirty();
    keepScroll(null, function () { renderPanel('attack'); refresh(); });
  }

  // --- Déplacer une attaque d'une commande à l'autre -------------------------
  // On la fait glisser par sa poignée. Les Pointer Events couvrent souris,
  // doigt et stylet du même code ; le glisser-déposer HTML5, lui, ne répond pas
  // au doigt, et le créateur se consulte largement sur téléphone.
  //
  // Le clavier n'est pas laissé de côté : la poignée reste un bouton, et les
  // flèches haut/bas y déplacent l'attaque sans saisie préalable. Un
  // glisser-déposer seul rendrait l'outil inutilisable sans souris.
  var drag = null;

  function endDrag(apply) {
    if (!drag) return;
    var d = drag;
    drag = null;
    document.removeEventListener('pointermove', d.onMove);
    document.removeEventListener('pointerup', d.onUp);
    document.removeEventListener('pointercancel', d.onCancel);
    document.removeEventListener('keydown', d.onKey, true);
    d.row.classList.remove('is-dragging');
    d.rows.forEach(function (r) { r.classList.remove('is-drop-target'); });
    document.body.classList.remove('bc-dragging');
    if (apply && d.moved && d.to !== d.from) reorderWithin(d.char, d.catKey, d.from, d.to);
  }

  function startDrag(handle, char, catKey, index, ev) {
    var row = handle.parentNode;
    while (row && row.className.indexOf('bc-slot-row') === -1) row = row.parentNode;
    if (!row) return;
    var rows = Array.prototype.slice.call(row.parentNode.querySelectorAll('.bc-slot-row[data-drag-id]'));
    if (rows.length < 2) return;
    var d = {
      char: char, catKey: catKey, from: index, to: index, row: row, rows: rows,
      startY: ev.clientY, moved: false,
    };
    d.onMove = function (e) {
      if (!drag) return;
      if (!d.moved && Math.abs(e.clientY - d.startY) < 4) return;
      d.moved = true;
      // On vise la ligne survolée : c'est ce que l'œil attend, et cela reste
      // juste même si les lignes n'ont pas toutes la même hauteur (un
      // embranchement HP en allonge une).
      d.rows.forEach(function (r, i) {
        var box = r.getBoundingClientRect();
        if (e.clientY >= box.top && e.clientY <= box.bottom) d.to = i;
      });
      d.rows.forEach(function (r, i) { r.classList.toggle('is-drop-target', d.moved && i === d.to && i !== d.from); });
    };
    d.onUp = function () { endDrag(true); };
    d.onCancel = function () { endDrag(false); };
    d.onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); endDrag(false); } };
    drag = d;
    row.classList.add('is-dragging');
    document.body.classList.add('bc-dragging');
    document.addEventListener('pointermove', d.onMove);
    document.addEventListener('pointerup', d.onUp);
    document.addEventListener('pointercancel', d.onCancel);
    document.addEventListener('keydown', d.onKey, true);
  }

  // La poignée est repérée par sa commande, non par l'attaque qui l'occupe :
  // deux exemplaires de la même attaque partageraient sinon le même repère.
  function dragHandle(char, catKey, index) {
    var btn = el('button', {
      type: 'button', class: 'bc-drag-handle',
      'aria-label': T('slots.reorder'), title: T('slots.reorder'),
      'data-drag-handle': catKey + '#' + index,
    }, [el('span', { 'aria-hidden': 'true', text: '⠿' })]);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); reorderWithin(char, catKey, index, index - 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); reorderWithin(char, catKey, index, index + 1); }
    });
    btn.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      // Sans cela, le doigt fait défiler la page au lieu de déplacer la ligne.
      e.preventDefault();
      startDrag(btn, char, catKey, index, e);
    });
    return btn;
  }

  function afterAttackChange() {
    pruneOrphanBranches();
    markDirty();
    keepScroll(null, function () { renderPanel('attack'); refresh(); });
  }

  // Ce qu'une catégorie (sol/air × style) peut recevoir : tout son groupe, moins
  // les attaques HP branchées — celles-là vivent sous leur bravery. La liste
  // n'exclut pas ce qui est déjà posé : la même attaque peut occuper plusieurs
  // commandes.
  function categoryMoves(group, style, linkParent) {
    return byStyle(group.moves).filter(function (sub) { return (sub.style || null) === (style || null); })
      .reduce(function (acc, sub) { return acc.concat(sub.moves); }, [])
      .filter(function (m) { return !linkParent[m.id]; });
  }

  function renderAttacks(panel) {
    var char = charBySlug[state.build.character];
    if (char.hpLinks) {
      var aDesLinks = !/^no\b/i.test(char.hpLinks);
      panel.appendChild(el('p', {
        class: 'bc-note',
        text: T('attacks.hpLinks', { value: char.hpLinks }) + (aDesLinks ? T('attacks.hpLinksNoDetail') : ''),
      }));
    }
    panel.appendChild(el('p', { class: 'bc-note', text: T('attacks.slotsNote') }));

    var scan = scanBuild(char);
    var linksByParent = {};
    (char.links || []).forEach(function (l) { (linksByParent[l.from] = linksByParent[l.from] || []).push(l.to); });
    var moveById = {};
    Object.keys(scan.index.byId).forEach(function (id) { moveById[id] = scan.index.byId[id].move; });

    [['bravery', T('attacks.braveryTitle')], ['hp', T('attacks.hpTitle')]].forEach(function (pair) {
      var kind = pair[0];
      var groups = char.attacks[kind];
      if (!groups || !groups.length) {
        panel.appendChild(el('p', { class: 'bc-alert bc-alert-muted', text: T('attacks.notDocumented', { title: pair[1] }) }));
        return;
      }
      panel.appendChild(el('h3', { text: pair[1] }));

      var poolIntro = (groups.filter(function (g) { return g.followUp; })[0] || {}).intro;

      groups.forEach(function (g) {
        if (g.followUp) return;
        // Un personnage à styles (paradigmes de Lightning, jobs de Cecil,
        // moveset EX de Gabranth) a une grille par style : ce sont bien des
        // emplacements distincts dans le jeu.
        var styles = byStyle(g.moves).map(function (sub) { return sub.style || null; });
        styles.forEach(function (style) {
          var choix = categoryMoves(g, style, scan.index.linkParent);
          if (!choix.length) return;
          panel.appendChild(attackCategory({
            char: char, scan: scan, kind: kind, group: g, style: style,
            choix: choix, poolIntro: poolIntro,
            linksByParent: linksByParent, moveById: moveById,
          }));
        });
      });
    });
  }

  function attackCategory(ctx) {
    var kind = ctx.kind;
    var catKey = kind + '|' + ctx.group.key + '|' + (ctx.style || '');
    var titre = groupLabel(ctx.group.key) + (ctx.style ? ' — ' + ctx.style : '');
    var mine = ctx.scan.slots.filter(function (s) { return s.info.catKey === catKey; });

    var fs = el('fieldset', { class: 'bc-group' }, [
      el('legend', {}, [
        el('span', { text: titre + ' ' }),
        el('span', { class: 'bc-slots' + (mine.length >= MAX_SLOTS ? ' is-full' : ''), text: mine.length + '/' + MAX_SLOTS }),
      ]),
    ]);
    if (ctx.group.intro) fs.appendChild(el('p', { class: 'bc-note', text: ctx.group.intro.split('\n')[0] }));

    var grid = el('div', { class: 'bc-slot-grid' });
    for (var i = 0; i < MAX_SLOTS; i++) {
      (function (index) {
        var slot = mine[index];
        var ouvrir = function () {
          openMoveChooser(titre + ' · ' + inputTitle(kind, index), ctx.choix, slot ? slot.move : null, function (choisi) {
            if (slot) replaceAt(slot.pos, choisi.id);
            else appendAttack(choisi.id);
          });
        };
        if (!slot) {
          grid.appendChild(slotRow({
            input: inputGlyph(kind, index), inputTitle: inputTitle(kind, index),
            filled: false, onAssign: ouvrir,
          }));
          return;
        }
        var m = slot.move;
        var main = el('span', { class: 'bc-slot-main' }, [
          el('span', { class: 'bc-row-name', text: m.name }),
          el('span', { class: 'bc-row-meta', text: moveMeta(m) }),
        ]);
        var actions = [cpTag(m)];
        if (m.cp == null) actions.push(el('span', { class: 'bc-tag bc-tag-warn', title: T('attacks.unknownCostTitle'), text: T('status.undocumented') }));
        grid.appendChild(slotRow({
          input: inputGlyph(kind, index), inputTitle: inputTitle(kind, index),
          filled: true, main: main, actions: actions,
          dragId: catKey + '#' + index,
          handle: mine.length > 1 ? dragHandle(ctx.char, catKey, index) : null,
          onAssign: ouvrir,
          // Retirer une attaque emporte ce qui s'y rattachait.
          onRemove: function () { removeAt(slotPositions(slot)); },
        }));

        // Embranchements, dans la forme que le jeu leur donne : un trait sous
        // l'attaque, et la touche qui les déclenche. Le carré pour une attaque
        // HP, le rond pour un enchaînement de bravery.
        var liens = (ctx.linksByParent[slot.id] || []).map(function (id) { return ctx.moveById[id]; }).filter(Boolean);
        if (liens.length) {
          grid.appendChild(branchRow(slot, 'link', liens, KIND_BUTTON.hp,
            T('attacks.hpLinkAdd'), T('attacks.hpLinkFor', { name: m.name })));
        }
        // Seules les braveries que la source désigne portent un enchaînement.
        var suites = (ctx.scan.index.followsByParent[slot.id] || [])
          .map(function (id) { return ctx.moveById[id]; }).filter(Boolean);
        if (suites.length) {
          grid.appendChild(branchRow(slot, 'follow', suites, KIND_BUTTON.bravery,
            T('attacks.followupAdd'), T('attacks.followupFor', { name: m.name }), ctx.poolIntro));
        }
      }(i));
    }
    fs.appendChild(grid);
    return fs;
  }

  // Un prolongement rattaché à une attaque : enchaînement de bravery ou attaque
  // HP branchée. Les deux se comportent pareil, seule la touche change.
  function branchRow(slot, champ, choix, glyph, addLabel, titreFenetre, intro) {
    var courant = slot[champ];
    var box = el('div', { class: 'bc-branch-row' });
    box.appendChild(el('span', {
      class: 'bc-slot-badge bc-badge-branch',
      title: T('attacks.input.link', { button: glyph }), text: '└ ' + glyph,
    }));
    if (!courant) {
      box.appendChild(el('button', {
        type: 'button', class: 'bc-branch-add',
        onclick: function () {
          openMoveChooser(titreFenetre, choix, null, function (choisi) { attachTo(slot, choisi.id); }, intro);
        },
      }, [el('span', { text: addLabel }), el('span', { class: 'bc-slot-plus', 'aria-hidden': 'true', text: '+' })]));
      return box;
    }
    box.appendChild(el('span', { class: 'bc-slot-main' }, [
      el('span', { class: 'bc-row-name', text: courant.move.name }),
      el('span', { class: 'bc-row-meta', text: moveMeta(courant.move) }),
    ]));
    box.appendChild(el('span', { class: 'bc-slot-actions' }, [
      cpTag(courant.move),
      el('button', {
        type: 'button', class: 'bc-btn bc-btn-small', text: T('slots.change'),
        onclick: function () {
          openMoveChooser(titreFenetre, choix, courant.move, function (choisi) { replaceAt(courant.pos, choisi.id); }, intro);
        },
      }),
      el('button', {
        type: 'button', class: 'bc-btn bc-btn-small bc-btn-danger', text: T('equipment.remove'),
        onclick: function () { removeAt([courant.pos]); },
      }),
    ]));
    return box;
  }

  // Fenêtre de choix d'un coup. Recherche par nom, et par effet : c'est souvent
  // « celui qui fait Wall Rush » qu'on cherche, pas un nom précis.
  function openMoveChooser(title, choix, courant, onPick, intro) {
    var sous = courant ? T('attacks.replacing', { name: courant.name }) : (intro ? intro.split('\n')[0] : null);
    openModal(title, sous, function (body, close) {
      var section = el('div', { class: 'bc-chooser' });
      var listBox = el('div', { class: 'bc-list bc-list-scroll' });
      var q = '';
      var search = el('input', { type: 'search', placeholder: T('attacks.filterName'), 'aria-label': T('attacks.filterName') });
      search.addEventListener('input', function () { q = search.value.toLowerCase(); paint(); });
      section.appendChild(el('div', { class: 'bc-filters' }, [search]));
      section.appendChild(listBox);
      body.appendChild(section);
      function paint() {
        clear(listBox);
        var items = choix.filter(function (m) {
          return !q || (m.name + ' ' + (m.effects || '') + ' ' + (m.type || '') + ' ' + (m.priority || '')).toLowerCase().indexOf(q) !== -1;
        });
        if (!items.length) { listBox.appendChild(el('p', { class: 'bc-note', text: T('attacks.noneAvailable') })); return; }
        items.forEach(function (m) {
          listBox.appendChild(el('button', {
            type: 'button', class: 'bc-row bc-row-btn', 'data-uid': m.id,
            onclick: function () { close(); onPick(m); },
          }, [
            el('span', { class: 'bc-row-main' }, [
              el('span', { class: 'bc-row-name', text: m.name }),
              el('span', { class: 'bc-row-meta', text: moveMeta(m) + (m.effects ? ' · ' + m.effects : '') }),
            ]),
            cpTag(m),
          ]));
        });
      }
      paint();
    });
  }

  // --- Onglet Abilities -----------------------------------------------------
  function renderAbilities(panel) {
    var slug = state.build.character;
    panel.appendChild(el('p', { class: 'bc-note', text: T('abilities.costNote', { mode: state.mastered ? T('abilities.modeMastered') : T('abilities.modePurchase') }) }));
    D.abilities.forEach(function (g) {
      var usable = g.abilities.filter(function (a) { return !a.only || a.only.indexOf(slug) !== -1; });
      if (!usable.length) return;
      var fs = el('fieldset', { class: 'bc-group' }, [el('legend', { text: g.label })]);
      var list = el('div', { class: 'bc-list' });
      usable.forEach(function (a) { list.appendChild(abilityRow(a)); });
      fs.appendChild(list);
      panel.appendChild(fs);
    });
  }

  // Abilities incompatibles entre elles : cocher l'une décoche l'autre.
  function conflictsWith(id) {
    var out = [];
    (D.abilityExclusions || []).forEach(function (g) {
      if (g.abilities.indexOf(id) === -1) return;
      g.abilities.forEach(function (other) {
        if (other !== id && state.build.abilities.indexOf(other) !== -1) out.push({ id: other, reason: g.reason });
      });
    });
    return out;
  }
  function exclusionPartners(id) {
    var names = [];
    (D.abilityExclusions || []).forEach(function (g) {
      if (g.abilities.indexOf(id) === -1) return;
      g.abilities.forEach(function (other) {
        if (other !== id && abilityById[other]) names.push(abilityById[other].name);
      });
    });
    return names;
  }

  function abilityRow(a) {
    var checked = state.build.abilities.indexOf(a.id) !== -1;
    var input = el('input', { type: 'checkbox', checked: checked });
    input.addEventListener('change', function () {
      var i = state.build.abilities.indexOf(a.id);
      if (input.checked && i === -1) {
        var conflits = conflictsWith(a.id);
        conflits.forEach(function (c) {
          var k = state.build.abilities.indexOf(c.id);
          if (k !== -1) state.build.abilities.splice(k, 1);
        });
        state.build.abilities.push(a.id);
        if (conflits.length) {
          toast(T(conflits.length > 1 ? 'abilities.removedMany' : 'abilities.removedOne', {
            list: conflits.map(function (c) { return abilityById[c.id].name; }).join(', '),
            reason: conflits[0].reason,
          }));
        }
      } else if (!input.checked && i !== -1) {
        state.build.abilities.splice(i, 1);
      }
      markDirty();
      keepScroll(null, function () { renderPanel('abilities'); refresh(); });
    });
    var children = [
      input,
      el('span', { class: 'bc-row-main' }, [
        el('span', { class: 'bc-row-name', text: a.name }),
        el('span', { class: 'bc-row-meta', text: a.description || '' }),
      ]),
      el('span', { class: 'bc-cp', text: a.cp == null ? 'CP ?' : cpOf(a) + ' CP' }),
    ];
    var row = el('label', { class: 'bc-row' }, children);
    if (a.only) row.appendChild(el('span', { class: 'bc-tag bc-tag-info', text: T('abilities.specific') }));
    var partenaires = exclusionPartners(a.id);
    if (partenaires.length) {
      row.appendChild(el('span', {
        class: 'bc-tag bc-tag-excl',
        title: T('abilities.incompatible', { list: partenaires.join(', ') }),
        text: '⊘',
      }));
    }
    if (!a.documented) row.appendChild(el('span', { class: 'bc-tag bc-tag-warn', text: T('status.undocumented') }));
    return row;
  }

  // --- Onglet Équipement ----------------------------------------------------
  var stuffFilters = { weapon: '', hand: '', head: '', body: '' };
  var stuffSort = { weapon: 'name', hand: 'name', head: 'name', body: 'name' };
  var stuffCategory = { weapon: '', hand: '', head: '', body: '' };
  // Sens du tri, par emplacement. Le comparateur garde son ordre naturel (A→Z
  // pour un nom, décroissant pour une stat) ; ce drapeau ne fait que l'inverser.
  var stuffDesc = { weapon: false, hand: false, head: false, body: false };

  // Sélectionner une pièce reconstruit tout le panneau : le DOM est remplacé,
  // la page remonte en haut de la section et la liste interne repart à zéro —
  // on cherchait des gantelets, on se retrouve au titre « Mains ». On capture
  // donc les positions avant le rendu pour les rendre après, et on redonne le
  // focus à la ligne cliquée (le lecteur d'écran ne repart pas du début non plus).
  // Toutes les listes de l'onglet sont relevées, pas seulement celle qu'on
  // vient de toucher : un onglet en affiche plusieurs (les quatre emplacements
  // d'équipement, les accessoires et leurs slots), et le rendu les remplace
  // toutes. Chacune est repérée par son `data-slot`.
  function keepScroll(uid, fn) {
    var y = window.scrollY;
    var saved = {};
    var before = document.querySelectorAll('.bc-list-scroll[data-slot]');
    for (var i = 0; i < before.length; i++) saved[before[i].getAttribute('data-slot')] = before[i].scrollTop;
    fn();
    var after = document.querySelectorAll('.bc-list-scroll[data-slot]');
    for (var j = 0; j < after.length; j++) {
      var v = saved[after[j].getAttribute('data-slot')];
      if (v != null) after[j].scrollTop = v;
    }
    window.scrollTo(0, y);
    if (uid) {
      var row = document.querySelector('.bc-row-btn[data-uid="' + uid + '"]');
      if (row) row.focus({ preventScroll: true });
    }
  }

  function renderStuff(panel) {
    panel.appendChild(illegalToggle());
    var grid = el('div', { class: 'bc-slot-grid' });
    SLOTS.forEach(function (slot) { grid.appendChild(equipSlotRow(slot)); });
    panel.appendChild(grid);
  }

  // Une ligne par emplacement ; la liste et ses filtres vivent dans la fenêtre.
  function equipSlotRow(slot) {
    var current = state.build.equipment[slot.key] ? equipByUid[state.build.equipment[slot.key]] : null;
    var ouvrir = function () {
      openModal(slot.label, current ? T('attacks.replacing', { name: current.name }) : null, function (body, close) {
        body.appendChild(slotChooser(slot, close));
      });
    };
    if (!current) {
      return slotRow({
        input: slot.label, inputTitle: slot.label, filled: false, onAssign: ouvrir,
      });
    }
    var st = equipStatus(current);
    var main = el('span', { class: 'bc-slot-main' }, [
      el('span', { class: 'bc-row-name', text: current.name }),
      el('span', { class: 'bc-row-meta', text: [fmtStats(current.stats) || T('equipment.noStats'), current.effects].filter(Boolean).join(' · ') }),
    ]);
    var actions = [];
    if (current.level) actions.push(el('span', { class: 'bc-tag bc-tag-info', text: 'Lv ' + current.level }));
    if (st.state === 'glitch') actions.push(el('span', { class: 'bc-tag bc-tag-glitch', title: st.label, text: T('equipment.glitchTag') }));
    if (st.state === 'unknown') actions.push(el('span', { class: 'bc-tag bc-tag-warn', title: st.label, text: T('status.undocumented') }));
    return slotRow({
      input: slot.label, inputTitle: slot.label, filled: true, main: main, actions: actions,
      onAssign: ouvrir,
      onRemove: function () {
        state.build.equipment[slot.key] = null;
        markDirty();
        keepScroll(null, function () { renderPanel('stuff'); refresh(); });
      },
    });
  }

  function slotChooser(slot, close) {
    var section = el('div', { class: 'bc-chooser' });
    var cats = D.equipmentCategories[slot.key] || [];
    var bar = el('div', { class: 'bc-filters' });
    var search = el('input', { type: 'search', placeholder: T('equipment.filterName'), value: stuffFilters[slot.key], 'aria-label': T('equipment.filterAria', { slot: slot.label }) });
    search.addEventListener('input', function () { stuffFilters[slot.key] = search.value; renderList(); });
    var catSel = el('select', { 'aria-label': T('equipment.category') }, [el('option', { value: '', text: T('equipment.allCategories') })].concat(
      cats.concat(['Exclusive']).map(function (c) { return el('option', { value: c, text: c, selected: stuffCategory[slot.key] === c }); })
    ));
    catSel.addEventListener('change', function () { stuffCategory[slot.key] = catSel.value; renderList(); });
    var sortSel = el('select', { 'aria-label': T('equipment.sort') }, [
      el('option', { value: 'name', text: T('equipment.sortName') }),
      el('option', { value: 'level', text: T('equipment.sortLevel') }),
      el('option', { value: 'atk', text: 'ATK' }),
      el('option', { value: 'def', text: 'DEF' }),
      el('option', { value: 'hp', text: 'HP' }),
      el('option', { value: 'brv', text: 'BRV' }),
      el('option', { value: 'combination', text: T('equipment.sortSet') }),
    ]);
    sortSel.value = stuffSort[slot.key];
    sortSel.addEventListener('change', function () { stuffSort[slot.key] = sortSel.value; renderList(); });
    // Bascule du sens de tri : une flèche, pas un second menu déroulant — deux
    // états n'en méritent pas un. `aria-pressed` porte l'état pour l'assistance.
    var dirBtn = el('button', { type: 'button', class: 'bc-btn bc-btn-small bc-sort-dir' });
    function paintDir() {
      var desc = stuffDesc[slot.key];
      dirBtn.textContent = desc ? '↓' : '↑';
      dirBtn.setAttribute('aria-pressed', desc ? 'true' : 'false');
      dirBtn.setAttribute('aria-label', T('equipment.sortDir'));
      dirBtn.title = desc ? T('equipment.sortDesc') : T('equipment.sortAsc');
    }
    dirBtn.addEventListener('click', function () { stuffDesc[slot.key] = !stuffDesc[slot.key]; paintDir(); renderList(); });
    paintDir();
    bar.appendChild(search); bar.appendChild(catSel); bar.appendChild(sortSel); bar.appendChild(dirBtn);
    section.appendChild(bar);

    var listBox = el('div', { class: 'bc-list bc-list-scroll', 'data-slot': slot.key });
    section.appendChild(listBox);

    function renderList() {
      clear(listBox);
      var q = stuffFilters[slot.key].toLowerCase();
      var items = D.equipment.filter(function (e) {
        if (e.slot !== slot.key) return false;
        var st = equipStatus(e);
        if (st.state === 'unavailable') return false;
        if (stuffCategory[slot.key] && e.category !== stuffCategory[slot.key]) return false;
        if (q && e.name.toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      var key = stuffSort[slot.key];
      var sign = stuffDesc[slot.key] ? -1 : 1;
      items.sort(function (a, b) {
        if (key === 'name') return sign * byName(a, b);
        if (key === 'level') return sign * ((a.level || 0) - (b.level || 0) || byName(a, b));
        if (key === 'combination') {
          var an = a.combination ? a.combination.name : '￿';
          var bn = b.combination ? b.combination.name : '￿';
          return sign * (an.localeCompare(bn, BC.locale) || byName(a, b));
        }
        return sign * (((b.stats && b.stats[key]) || 0) - ((a.stats && a.stats[key]) || 0) || byName(a, b));
      });
      listBox.appendChild(el('p', { class: 'bc-count', text: T('equipment.pieces', { count: items.length }) }));
      items.slice(0, 400).forEach(function (e) { listBox.appendChild(equipRow(slot, e, close)); });
      if (items.length > 400) listBox.appendChild(el('p', { class: 'bc-note', text: T('equipment.limit400') }));
    }
    renderList();
    return section;
  }

  function equipRow(slot, e, close) {
    var selected = state.build.equipment[slot.key] === e.uid;
    var st = equipStatus(e);
    var btn = el('button', {
      type: 'button',
      class: 'bc-row bc-row-btn' + (selected ? ' is-selected' : ''),
      'aria-pressed': selected ? 'true' : 'false',
      'data-uid': e.uid,
      onclick: function () {
        state.build.equipment[slot.key] = selected ? null : e.uid;
        markDirty();
        if (close) close();
        keepScroll(null, function () {
          renderPanel('stuff');
          refresh();
        });
      },
    }, [
      el('span', { class: 'bc-row-main' }, [
        el('span', { class: 'bc-row-name', text: e.name }),
        el('span', { class: 'bc-row-meta', text: [e.category, e.level ? T('equipment.levelShort', { level: e.level }) : '', fmtStats(e.stats), e.effects].filter(Boolean).join(' · ') }),
      ]),
    ]);
    if (st.state === 'glitch') btn.appendChild(el('span', { class: 'bc-tag bc-tag-glitch', title: st.label, text: '⚙' }));
    if (st.state === 'unknown') btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', title: st.label, text: '?' }));
    if (e.labyrinth) btn.appendChild(el('span', { class: 'bc-tag bc-tag-info', title: T('equipment.labyrinth'), text: T('equipment.labTag') }));
    if (!e.documented) btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', text: T('status.undocumented') }));
    return btn;
  }

  // --- Onglet Accessoires ---------------------------------------------------
  var accFilter = '';
  var accCategory = '';

  function illegalToggle() {
    var input = el('input', { type: 'checkbox', checked: state.showIllegal });
    input.addEventListener('change', function () {
      state.showIllegal = input.checked;
      renderPanel(state.activeTab);
    });
    return el('label', { class: 'bc-field bc-field-inline bc-illegal-toggle' }, [
      input, el('span', { text: T('equipment.showIllegal', { ruleset: D.ruleset.name }) }),
    ]);
  }

  function renderAccessories(panel) {
    panel.appendChild(illegalToggle());
    panel.appendChild(el('h3', { text: T('accessories.slotsTitle', { count: state.build.accessories.filter(Boolean).length + '/' + ACCESSORY_SLOTS }) }));
    var grid = el('div', { class: 'bc-slot-grid' });
    for (var i = 0; i < ACCESSORY_SLOTS; i++) grid.appendChild(accessorySlot(i));
    panel.appendChild(grid);
  }

  function accessorySlot(i) {
    var u = state.build.accessories[i];
    var a = u ? accByUid[u] : null;
    var ouvrir = function () {
      openModal(T('accessories.slotTitle', { index: i + 1 }), a ? T('attacks.replacing', { name: a.name }) : null, function (body, close) {
        body.appendChild(accessoryChooser(i, close));
      });
    };
    if (!a) {
      return slotRow({ input: String(i + 1), inputTitle: T('accessories.slotTitle', { index: i + 1 }), filled: false, onAssign: ouvrir });
    }
    var main = el('span', { class: 'bc-slot-main' }, [
      el('span', { class: 'bc-row-name', text: a.name }),
      el('span', { class: 'bc-row-meta', text: [a.category, a.effect || a.requirements].filter(Boolean).join(' · ') }),
    ]);
    var actions = [];
    if (a.multiplier) actions.push(el('span', { class: 'bc-tag bc-tag-mult', text: '×' + a.multiplier }));
    if (a.rank) actions.push(el('span', { class: 'bc-tag bc-tag-info', title: T('accessories.rank', { rank: a.rank }), text: a.rank }));
    if (a.legal === false) actions.push(el('span', { class: 'bc-tag bc-tag-illegal', title: illegalReason(a), text: T('accessories.illegal') }));
    return slotRow({
      input: String(i + 1), inputTitle: T('accessories.slotTitle', { index: i + 1 }),
      filled: true, main: main, actions: actions,
      onAssign: ouvrir,
      onRemove: function () {
        state.build.accessories[i] = null;
        markDirty();
        keepScroll(null, function () { renderPanel('accessories'); refresh(); });
      },
    });
  }

  // Le choix se fait pour un emplacement précis : la limite d'exemplaires se
  // compte donc sans l'occupant actuel, qu'on est justement en train de
  // remplacer — sans quoi un rang S déjà posé s'interdirait lui-même.
  function accessoryChooser(index, close) {
    var section = el('div', { class: 'bc-chooser' });
    var bar = el('div', { class: 'bc-filters' });
    var search = el('input', { type: 'search', placeholder: T('accessories.filterNameEffect'), value: accFilter, 'aria-label': T('accessories.filterAria') });
    search.addEventListener('input', function () { accFilter = search.value; renderList(); });
    var catSel = el('select', { 'aria-label': T('equipment.category') }, [el('option', { value: '', text: T('equipment.allCategories') })].concat(
      ACCESSORY_CATEGORIES.map(function (c) { return el('option', { value: c.key, text: c.label, selected: accCategory === c.key }); })
    ));
    catSel.addEventListener('change', function () { accCategory = catSel.value; renderList(); });
    bar.appendChild(search); bar.appendChild(catSel);
    section.appendChild(bar);

    var listBox = el('div', { class: 'bc-list bc-list-scroll', 'data-slot': 'acc' });
    section.appendChild(listBox);

    function renderList() {
      clear(listBox);
      var q = accFilter.toLowerCase();
      var items = D.accessories.filter(function (a) {
        if (!state.showIllegal && a.legal === false) return false;
        if (accCategory && a.category !== accCategory) return false;
        if (q && (a.name + ' ' + (a.effect || '') + ' ' + (a.requirements || '')).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      listBox.appendChild(el('p', { class: 'bc-count', text: T('accessories.count', { count: items.length }) }));
      items.slice(0, 400).forEach(function (a) { listBox.appendChild(accessoryRow(a, index, close)); });
      if (items.length > 400) listBox.appendChild(el('p', { class: 'bc-note', text: T('accessories.limit400') }));
    }
    renderList();
    return section;
  }

  function copyLimit(a) {
    return a.rank && RANK_COPY_LIMIT[a.rank] !== undefined ? RANK_COPY_LIMIT[a.rank] : null;
  }
  function copiesOf(uid) {
    return state.build.accessories.filter(function (u) { return u === uid; }).length;
  }

  function accessoryRow(a, index, close) {
    // L'occupant de l'emplacement visé ne se compte pas contre lui-même : on le
    // remplace, on ne l'ajoute pas.
    var count = copiesOf(a.uid) - (state.build.accessories[index] === a.uid ? 1 : 0);
    var limite = copyLimit(a);
    var atteinte = limite !== null && count >= limite;
    var btn = el('button', {
      type: 'button',
      class: 'bc-row bc-row-btn' + (count ? ' is-selected' : '') + (atteinte ? ' is-disabled' : ''),
      disabled: atteinte,
      title: atteinte
        ? T(limite > 1 ? 'accessories.rankLimitMany' : 'accessories.rankLimitOne', { rank: a.rank, max: limite })
        : '',
      'data-uid': a.uid,
      onclick: function () {
        state.build.accessories[index] = a.uid;
        markDirty();
        if (close) close();
        keepScroll(null, function () {
          renderPanel('accessories');
          refresh();
        });
      },
    }, [
      el('span', { class: 'bc-row-main' }, [
        el('span', { class: 'bc-row-name', text: a.name + (count ? ' ×' + count : '') }),
        el('span', { class: 'bc-row-meta', text: [a.category, a.boosterType, a.requirements, a.effect].filter(Boolean).join(' · ') }),
      ]),
    ]);
    if (limite !== null && limite !== Infinity) {
      btn.appendChild(el('span', {
        class: 'bc-tag' + (atteinte ? ' bc-tag-warn' : ' bc-tag-info'),
        title: T(limite > 1 ? 'accessories.rankLimitMany' : 'accessories.rankLimitOne', { rank: a.rank, max: limite }),
        text: count + '/' + limite,
      }));
    }
    if (a.multiplier) btn.appendChild(el('span', { class: 'bc-tag bc-tag-mult', text: '×' + a.multiplier }));
    if (a.legal === false) btn.appendChild(el('span', { class: 'bc-tag bc-tag-illegal', title: illegalReason(a), text: T('accessories.illegal') }));
    if (a.rank) btn.appendChild(el('span', { class: 'bc-tag bc-tag-info', title: T('accessories.rank', { rank: a.rank }), text: a.rank }));
    return btn;
  }

  // --- Onglet Assist & invocation -------------------------------------------
  function renderAssist(panel) {
    panel.appendChild(illegalToggle());

    panel.appendChild(el('h3', { text: T('assist.title') }));
    panel.appendChild(el('p', { class: 'bc-note', text: T('assist.note') }));
    var alist = el('div', { class: 'bc-list bc-list-scroll', 'data-slot': 'assist' });
    D.assists.slice().sort(function (a, b) { return byName(a, b); }).forEach(function (a) {
      var selected = state.build.assist === a.slug;
      var btn = el('button', {
        type: 'button', class: 'bc-row bc-row-btn' + (selected ? ' is-selected' : ''), 'aria-pressed': selected ? 'true' : 'false',
        'data-uid': a.slug,
        onclick: function () {
          state.build.assist = selected ? null : a.slug;
          markDirty();
          keepScroll(a.slug, function () { renderPanel('assist'); refresh(); });
        },
      }, [
        el('span', { class: 'bc-row-main' }, [
          el('span', { class: 'bc-row-name', text: a.name }),
          el('span', { class: 'bc-row-meta', text: a.attacks.map(function (x) { return x.name + (x.startup ? ' (' + x.startup + ')' : ''); }).join(' · ') }),
        ]),
      ]);
      if (!a.documented) btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', text: T('status.undocumented') }));
      alist.appendChild(btn);
    });
    panel.appendChild(alist);

    panel.appendChild(el('h3', { text: T('assist.summonTitle') }));
    panel.appendChild(el('p', { class: 'bc-note', text: T('assist.summonNote', { list: D.ruleset.legalSummons.join(', ') }) }));
    var slist = el('div', { class: 'bc-list bc-list-scroll', 'data-slot': 'summon' });
    D.summons.filter(function (s) { return state.showIllegal || s.legal !== false; })
      .sort(function (a, b) { return byName(a, b); })
      .forEach(function (s) {
        var selected = state.build.summon === s.id;
        var btn = el('button', {
          type: 'button', class: 'bc-row bc-row-btn' + (selected ? ' is-selected' : ''), 'aria-pressed': selected ? 'true' : 'false',
          'data-uid': s.id,
          onclick: function () {
            state.build.summon = selected ? null : s.id;
            markDirty();
            keepScroll(s.id, function () { renderPanel('assist'); refresh(); });
          },
        }, [
          el('span', { class: 'bc-row-main' }, [
            el('span', { class: 'bc-row-name', text: s.name }),
            el('span', { class: 'bc-row-meta', text: (s.text || '').split('\n')[0].slice(0, 150) }),
          ]),
        ]);
        if (s.legal === false) btn.appendChild(el('span', { class: 'bc-tag bc-tag-illegal', title: illegalReason(s), text: 'illégal' }));
        if (!s.documented) btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', title: T('assist.undocumentedEffect'), text: T('status.undocumented') }));
        slist.appendChild(btn);
      });
    panel.appendChild(slist);
  }

  // --- Sélection du personnage ---------------------------------------------
  var rosterButtons = [].slice.call(document.querySelectorAll('.bc-char'));
  rosterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slug = btn.dataset.slug;
      if (slug === state.build.character) return;
      if (state.dirty && !window.confirm(T('manager.confirmChangeChar'))) return;
      setCharacter(slug);
    });
  });

  function setCharacter(slug) {
    state.build = emptyBuild(slug);
    state.dirty = false;
    applyCharacterUi();
    selectTab('attack', false);
    refresh();
  }

  function applyCharacterUi() {
    rosterButtons.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.slug === state.build.character ? 'true' : 'false'); });
    root.hidden = !state.build.character;
    document.getElementById('bc-manager').hidden = !state.build.character;
    var char = charBySlug[state.build.character];
    document.getElementById('bc-current-name').textContent = char ? T('manager.buildOf', { name: char.name }) : BC.ui.step2Default;
    document.getElementById('bc-build-name').value = state.build.name;
    document.getElementById('bc-notes').value = state.build.notes;
  }

  // --- Gestion des builds ---------------------------------------------------
  function hideToast(box) {
    box.className = 'bc-toast';
    window.clearTimeout(box._t);
  }

  function toast(message, isError) {
    var box = document.getElementById('bc-toast');
    if (!box) {
      box = el('div', { id: 'bc-toast', class: 'bc-toast', role: 'status', 'aria-live': 'polite' }, [
        el('span', { class: 'bc-toast-text' }),
        el('button', {
          type: 'button', class: 'bc-toast-close', 'aria-label': T('manager.closeMessage'), title: T('manager.close'),
          onclick: function () { hideToast(box); },
        }, ['×']),
      ]);
      document.body.appendChild(box);
    }
    box.querySelector('.bc-toast-text').textContent = message;
    box.className = 'bc-toast is-visible' + (isError ? ' is-error' : '');
    window.clearTimeout(box._t);
    box._t = window.setTimeout(function () { hideToast(box); }, 6000);
  }

  function currentSnapshot() {
    var b = JSON.parse(JSON.stringify(state.build));
    b.name = document.getElementById('bc-build-name').value.trim().slice(0, 60);
    b.notes = document.getElementById('bc-notes').value.slice(0, 2000);
    b.modified = new Date().toISOString();
    return b;
  }

  function renderSavedList() {
    var box = document.getElementById('bc-saved-list');
    if (!box) return;
    clear(box);
    var builds = loadAll();
    if (!builds.length) {
      box.appendChild(el('p', { class: 'bc-note', text: T('manager.noBuilds') }));
      return;
    }
    var byChar = {};
    builds.forEach(function (b) { (byChar[b.character] = byChar[b.character] || []).push(b); });
    Object.keys(byChar).sort().forEach(function (slug) {
      var char = charBySlug[slug];
      box.appendChild(el('h3', { text: char ? char.name : slug }));
      byChar[slug].forEach(function (b) {
        box.appendChild(el('div', { class: 'bc-saved' }, [
          el('span', { class: 'bc-row-main' }, [
            el('span', { class: 'bc-row-name', text: b.name || T('manager.untitled') }),
            el('span', { class: 'bc-row-meta', text: T('manager.modifiedOn', { date: new Date(b.modified).toLocaleDateString(BC.locale) }) }),
          ]),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: T('manager.load'), onclick: function () { loadBuild(b); } }),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: T('manager.duplicate'), onclick: function () { duplicateBuild(b); } }),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: T('manager.rename'), onclick: function () { renameBuild(b); } }),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small bc-btn-danger', text: T('manager.delete'), onclick: function () { deleteBuild(b); } }),
        ]));
      });
    });
  }

  function loadBuild(b) {
    if (state.dirty && !window.confirm(T('manager.confirmReplace'))) return;
    state.build = normalize(b);
    state.build.id = b.id;
    state.dirty = false;
    applyCharacterUi();
    selectTab(state.activeTab, false);
    refresh();
    toast(T('manager.loaded', { name: b.name || T('manager.untitled') }));
  }

  function duplicateBuild(b) {
    var copy = normalize(b);
    copy.id = uid();
    copy.name = (b.name || T('manager.untitled')) + T('manager.copySuffix');
    var builds = loadAll();
    builds.push(copy);
    if (saveAll(builds)) { renderSavedList(); toast(T('manager.copyCreated')); }
  }

  function renameBuild(b) {
    var next = window.prompt(T('manager.promptRename'), b.name || '');
    if (next === null) return;
    var builds = loadAll().map(function (x) { return x.id === b.id ? Object.assign({}, x, { name: next.trim().slice(0, 60), modified: new Date().toISOString() }) : x; });
    if (saveAll(builds)) { renderSavedList(); toast(T('manager.renamed')); }
  }

  function deleteBuild(b) {
    if (!window.confirm(T('manager.confirmDelete', { name: b.name || T('manager.untitled') }))) return;
    if (saveAll(loadAll().filter(function (x) { return x.id !== b.id; }))) { renderSavedList(); toast(T('manager.deleted')); }
  }

  document.getElementById('bc-save').addEventListener('click', function () {
    var snap = currentSnapshot();
    var check = validateBuild(snap);
    if (!check.ok) { toast(T('manager.saveRefused', { error: check.error }), true); return; }
    var builds = loadAll();
    var i = -1;
    builds.forEach(function (b, k) { if (b.id === snap.id) i = k; });
    if (i === -1) builds.push(snap); else builds[i] = snap;
    if (saveAll(builds)) {
      state.build = snap;
      state.dirty = false;
      renderSavedList();
      toast(T('manager.saved'));
    }
  });

  document.getElementById('bc-new').addEventListener('click', function () {
    if (state.dirty && !window.confirm(T('manager.confirmNew'))) return;
    setCharacter(state.build.character);
  });

  document.getElementById('bc-build-name').addEventListener('input', markDirty);
  document.getElementById('bc-notes').addEventListener('input', markDirty);

  document.getElementById('bc-mastered').addEventListener('change', function (ev) {
    state.mastered = ev.target.checked;
    renderPanel(state.activeTab);
    refresh();
  });

  // --- Export / import ------------------------------------------------------
  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function safeName(s) { return (s || 'build').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'build'; }

  document.getElementById('bc-export').addEventListener('click', function () {
    var snap = currentSnapshot();
    download('dissidia012-' + safeName(snap.character + '-' + snap.name) + '.json', JSON.stringify(snap, null, 2), 'application/json');
  });

  document.getElementById('bc-export-all').addEventListener('click', function () {
    var builds = loadAll();
    if (!builds.length) { toast(T('manager.noneToExport'), true); return; }
    download('dissidia012-builds.json', JSON.stringify({ schemaVersion: SCHEMA_VERSION, builds: builds }, null, 2), 'application/json');
  });

  // Export secondaire à plat : une ligne par build, listes agrégées. Le JSON
  // reste le format d'échange de référence — le CSV perd la structure.
  document.getElementById('bc-export-csv').addEventListener('click', function () {
    var builds = loadAll();
    var snap = currentSnapshot();
    if (!builds.some(function (b) { return b.id === snap.id; })) builds = builds.concat([snap]);
    var cols = ['id', 'name', 'character', 'attacks', 'abilities', 'weapon', 'hand', 'head', 'body', 'accessories', 'assist', 'summon', 'notes', 'modified']
      .map(function (c) { return T('manager.csv.' + c); });
    var esc = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [cols.map(esc).join(',')];
    builds.forEach(function (b) {
      var nameOf = function (uidv, index) { return uidv && index[uidv] ? index[uidv].name : ''; };
      lines.push([
        b.id, b.name, b.character,
        b.attacks.join(' | '),
        b.abilities.map(function (id) { return abilityById[id] ? abilityById[id].name : id; }).join(' | '),
        nameOf(b.equipment.weapon, equipByUid), nameOf(b.equipment.hand, equipByUid),
        nameOf(b.equipment.head, equipByUid), nameOf(b.equipment.body, equipByUid),
        b.accessories.map(function (u) { return nameOf(u, accByUid); }).filter(Boolean).join(' | '),
        b.assist || '', b.summon || '', b.notes, b.modified,
      ].map(esc).join(','));
    });
    download('dissidia012-builds.csv', '﻿' + lines.join('\r\n'), 'text/csv');
  });

  document.getElementById('bc-import').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      importPayload(String(reader.result));
      ev.target.value = '';
    };
    reader.onerror = function () { toast(T('manager.readError'), true); ev.target.value = ''; };
    reader.readAsText(file);
  });

  // Le contenu importé n'est jamais exécuté ni inséré en HTML : il est analysé,
  // validé champ par champ, puis normalisé.
  function importPayload(text) {
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { toast(T('manager.notJson'), true); return; }

    var candidates = Array.isArray(parsed) ? parsed
      : parsed && Array.isArray(parsed.builds) ? parsed.builds
        : [parsed];
    if (parsed && parsed.builds && parsed.schemaVersion !== SCHEMA_VERSION) {
      toast(T('err.collectionSchema', { found: parsed.schemaVersion, expected: SCHEMA_VERSION }), true);
      return;
    }

    var accepted = [];
    var rejected = [];
    candidates.forEach(function (c, i) {
      var check = validateBuild(c);
      if (check.ok) accepted.push(normalize(c));
      else rejected.push('#' + (i + 1) + ' : ' + check.error);
    });

    if (!accepted.length) {
      toast(T('manager.importRefused', { reason: rejected[0] || T('manager.noValidBuild') }), true);
      return;
    }
    var builds = loadAll();
    accepted.forEach(function (b) {
      var i = -1;
      builds.forEach(function (x, k) { if (x.id === b.id) i = k; });
      if (i === -1) builds.push(b); else builds[i] = b;
    });
    if (!saveAll(builds)) return;
    renderSavedList();
    loadBuildSilently(accepted[0]);
    toast(T('manager.imported', {
      count: accepted.length,
      rejected: rejected.length ? T('manager.importedRejected', { count: rejected.length, first: rejected[0] }) : '',
    }), rejected.length > 0);
  }

  function loadBuildSilently(b) {
    state.build = normalize(b);
    state.build.id = b.id;
    state.dirty = false;
    applyCharacterUi();
    selectTab('attack', false);
    refresh();
  }

  // --- Lien de partage ------------------------------------------------------
  // Le build voyage dans l'URL. Le JSON compact est très répétitif — douze
  // identifiants d'attaques préfixés « bravery:ground: », vingt-quatre slugs
  // d'abilities — et sa base64 dépassait 1500 caractères, illisible et hachée
  // par les clients de messagerie. On le dégonfle donc au deflate avant de
  // l'encoder : environ un tiers de la longueur, sans table de correspondance
  // qui deviendrait fausse à la première mise à jour des données.
  //
  // Le résultat porte le préfixe « z » ; sans lui, le paramètre est lu comme
  // l'ancienne base64 brute — les liens déjà partagés continuent de s'ouvrir.
  var ZIP = 'z';
  var BIN = 'c';

  // --- Encodage binaire (préfixe « c ») --------------------------------------
  // Le jeu est figé depuis 2011 : équipements, accessoires, abilities et coups
  // ne bougeront plus. On peut donc remplacer chaque identifiant par son rang
  // dans un catalogue trié — un accessoire tient sur 10 bits au lieu de la
  // trentaine d'octets de « booster:ATK:pre-ex-revenge ». Les catalogues sont
  // reconstruits à l'identique des deux côtés depuis le payload, il n'y a donc
  // aucune table à transporter ni à maintenir.
  //
  // Le tri par identifiant rend l'ordre indépendant de la façon dont le wiki
  // est extrait : corriger une donnée (les CP de Wall Jump, par exemple) ne
  // déplace rien. Seul un AJOUT d'entrée décalerait les rangs suivants — d'où
  // l'empreinte des catalogues placée en tête du lien : si elle ne correspond
  // pas, on refuse le lien au lieu de charger un build faux, et le format
  // « z » reste disponible.
  var catalogs = null;
  function catalogsOf() {
    if (catalogs) return catalogs;
    var sorted = function (a) { return a.slice().sort(); };
    var abilities = [];
    D.abilities.forEach(function (g) { g.abilities.forEach(function (a) { abilities.push(a.id); }); });
    catalogs = {
      chars: sorted(D.characters.map(function (c) { return c.slug; })),
      abilities: sorted(abilities),
      equipment: sorted(D.equipment.map(function (e) { return e.uid; })),
      accessories: sorted(D.accessories.map(function (a) { return a.uid; })),
      assists: sorted(D.assists.map(function (a) { return a.slug; })),
      summons: sorted(D.summons.map(function (s) { return s.id; })),
      attacks: {},
    };
    D.characters.forEach(function (c) {
      var ids = [];
      ['bravery', 'hp'].forEach(function (kind) {
        (c.attacks[kind] || []).forEach(function (g) {
          g.moves.forEach(function (m) { ids.push(m.id); });
        });
      });
      catalogs.attacks[c.slug] = sorted(ids);
    });
    return catalogs;
  }

  // Empreinte FNV-1a repliée sur 8 bits : elle ne protège pas d'une attaque,
  // seulement d'un décalage de catalogue entre l'émetteur et le lecteur.
  function catalogStamp() {
    var c = catalogsOf();
    var seed = [c.chars.length, c.abilities.length, c.equipment.length, c.accessories.length,
      c.assists.length, c.summons.length].join(',')
      + '|' + c.equipment[0] + '|' + c.equipment[c.equipment.length - 1]
      + '|' + c.accessories[0] + '|' + c.abilities[c.abilities.length - 1];
    var h = 0x811c9dc5;
    for (var i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ((h >>> 24) ^ (h >>> 16) ^ (h >>> 8) ^ h) & 0xff;
  }

  function bits(n) { var b = 1; while ((1 << b) < n) b++; return b; }

  function BitWriter() { this.bytes = []; this.cur = 0; this.n = 0; }
  BitWriter.prototype.put = function (value, width) {
    for (var i = width - 1; i >= 0; i--) {
      this.cur = (this.cur << 1) | ((value >> i) & 1);
      if (++this.n === 8) { this.bytes.push(this.cur); this.cur = 0; this.n = 0; }
    }
  };
  BitWriter.prototype.done = function () {
    if (this.n) this.bytes.push(this.cur << (8 - this.n));
    return new Uint8Array(this.bytes);
  };

  function BitReader(bytes) { this.b = bytes; this.i = 0; }
  BitReader.prototype.get = function (width) {
    var v = 0;
    for (var k = 0; k < width; k++) {
      var byte = this.b[this.i >> 3];
      if (byte === undefined) throw new Error('lien tronqué');
      v = (v << 1) | ((byte >> (7 - (this.i & 7))) & 1);
      this.i++;
    }
    return v;
  };

  // Un identifiant absent du catalogue (donnée retirée entre-temps) fait
  // échouer l'encodage compact : l'appelant retombe alors sur le format « z ».
  function idx(list, value) {
    var i = list.indexOf(value);
    if (i < 0) throw new Error('hors catalogue : ' + value);
    return i;
  }

  function encodeCompact(b) {
    var c = catalogsOf();
    var atk = c.attacks[b.character] || [];
    var w = new BitWriter();
    w.put(catalogStamp(), 8);
    w.put(idx(c.chars, b.character), bits(c.chars.length));
    // Attaques : longueur puis rangs, dans le catalogue du personnage.
    var attacks = b.attacks || [];
    w.put(attacks.length, 5);
    for (var i = 0; i < attacks.length; i++) w.put(idx(atk, attacks[i]), bits(atk.length));
    // Abilities : un bit par entrée du catalogue — plus court qu'une liste de
    // rangs dès qu'on en équipe une dizaine, et de longueur constante.
    var owned = {};
    (b.abilities || []).forEach(function (id) { owned[id] = 1; });
    for (var j = 0; j < c.abilities.length; j++) w.put(owned[c.abilities[j]] ? 1 : 0, 1);
    // Emplacements : 0 = vide, sinon rang + 1.
    var eqw = bits(c.equipment.length + 1);
    ['weapon', 'hand', 'head', 'body'].forEach(function (slot) {
      var u = b.equipment[slot];
      w.put(u ? idx(c.equipment, u) + 1 : 0, eqw);
    });
    var accw = bits(c.accessories.length + 1);
    var acc = b.accessories || [];
    w.put(acc.length, 5);
    for (var k = 0; k < acc.length; k++) w.put(acc[k] ? idx(c.accessories, acc[k]) + 1 : 0, accw);
    w.put(b.assist ? idx(c.assists, b.assist) + 1 : 0, bits(c.assists.length + 1));
    w.put(b.summon ? idx(c.summons, b.summon) + 1 : 0, bits(c.summons.length + 1));
    // Nom et notes en UTF-8 : ce sont les seuls champs libres, et les seuls qui
    // rallongent vraiment le lien. Vides, ils ne coûtent que leur compteur.
    [b.name || '', b.notes || ''].forEach(function (text) {
      var u8 = new TextEncoder().encode(text.slice(0, 255));
      w.put(u8.length, 8);
      for (var t = 0; t < u8.length; t++) w.put(u8[t], 8);
    });
    return BIN + b64url(w.done());
  }

  function decodeCompact(param) {
    var c = catalogsOf();
    var r = new BitReader(unb64url(param));
    if (r.get(8) !== catalogStamp()) throw new Error('catalogues différents');
    var slug = c.chars[r.get(bits(c.chars.length))];
    var atk = c.attacks[slug] || [];
    var attacks = [];
    var n = r.get(5);
    for (var i = 0; i < n; i++) attacks.push(atk[r.get(bits(atk.length))]);
    var abilities = [];
    for (var j = 0; j < c.abilities.length; j++) if (r.get(1)) abilities.push(c.abilities[j]);
    var eqw = bits(c.equipment.length + 1);
    var eq = ['weapon', 'hand', 'head', 'body'].map(function () {
      var v = r.get(eqw);
      return v ? c.equipment[v - 1] : null;
    });
    var accw = bits(c.accessories.length + 1);
    var acc = [];
    var m = r.get(5);
    for (var k = 0; k < m; k++) { var a = r.get(accw); acc.push(a ? c.accessories[a - 1] : null); }
    var as = r.get(bits(c.assists.length + 1));
    var su = r.get(bits(c.summons.length + 1));
    var texts = [0, 0].map(function () {
      var len = r.get(8);
      var u8 = new Uint8Array(len);
      for (var t = 0; t < len; t++) u8[t] = r.get(8);
      return new TextDecoder().decode(u8);
    });
    return {
      schemaVersion: 1, id: uid(), name: texts[0], character: slug,
      attacks: attacks, abilities: abilities,
      equipment: { weapon: eq[0], hand: eq[1], head: eq[2], body: eq[3] },
      accessories: acc, assist: as ? c.assists[as - 1] : null,
      summon: su ? c.summons[su - 1] : null, notes: texts[1],
      created: new Date().toISOString(), modified: new Date().toISOString(),
    };
  }

  function b64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function unb64url(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function compactBuild(b) {
    var compact = {
      v: b.schemaVersion, c: b.character,
      at: b.attacks, ab: b.abilities,
      eq: [b.equipment.weapon, b.equipment.hand, b.equipment.head, b.equipment.body],
      ac: b.accessories, as: b.assist, su: b.summon,
    };
    // Un nom ou des notes vides n'ont pas à occuper l'URL.
    if (b.name) compact.n = b.name;
    if (b.notes) compact.no = b.notes;
    return compact;
  }

  // Rend une promesse : la compression native est asynchrone. Sans elle
  // (navigateur ancien), on retombe sur la base64 brute, qui reste lisible par
  // tout le monde.
  function encodeBuild(b) {
    // Format binaire d'abord : c'est le plus court, et il n'a besoin de rien
    // d'autre que le payload déjà chargé.
    try { return Promise.resolve(encodeCompact(b)); } catch (e) { /* repli ci-dessous */ }
    var bytes = new TextEncoder().encode(JSON.stringify(compactBuild(b)));
    if (typeof CompressionStream !== 'function') return Promise.resolve(b64url(bytes));
    try {
      var cs = new CompressionStream('deflate-raw');
      var writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      return new Response(cs.readable).arrayBuffer().then(function (buf) {
        return ZIP + b64url(new Uint8Array(buf));
      }, function () { return b64url(bytes); });
    } catch (e) {
      return Promise.resolve(b64url(bytes));
    }
  }

  // Rend une promesse, la décompression étant asynchrone elle aussi. Trois
  // formats coexistent : binaire (« c »), deflate (« z ») et la base64 brute
  // d'origine, sans préfixe — les liens partagés avant chaque changement
  // continuent tous de s'ouvrir.
  function decodeBuild(param) {
    if (param.charAt(0) === BIN) return Promise.resolve(decodeCompact(param.slice(1)));
    if (param.charAt(0) !== ZIP) return Promise.resolve(fromJsonBytes(unb64url(param)));
    var packed = unb64url(param.slice(1));
    var ds = new DecompressionStream('deflate-raw');
    var writer = ds.writable.getWriter();
    writer.write(packed);
    writer.close();
    return new Response(ds.readable).arrayBuffer().then(function (buf) {
      return fromJsonBytes(new Uint8Array(buf));
    });
  }

  function fromJsonBytes(bytes) {
    var c = JSON.parse(new TextDecoder().decode(bytes));
    return {
      schemaVersion: c.v, id: uid(), name: c.n || '', character: c.c,
      attacks: c.at || [], abilities: c.ab || [],
      equipment: { weapon: (c.eq || [])[0] || null, hand: (c.eq || [])[1] || null, head: (c.eq || [])[2] || null, body: (c.eq || [])[3] || null },
      accessories: c.ac || [], assist: c.as || null, summon: c.su || null, notes: c.no || '',
      created: new Date().toISOString(), modified: new Date().toISOString(),
    };
  }

  function shareUrl(base) {
    return encodeBuild(currentSnapshot()).then(function (code) {
      return (base || location.origin + location.pathname) + '?build=' + code;
    });
  }

  document.getElementById('bc-share').addEventListener('click', function () {
    shareUrl().then(function (url) {
      var done = function () { toast(T('manager.linkCopied')); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { window.prompt(T('manager.promptCopyLink'), url); });
      } else {
        window.prompt(T('manager.promptCopyLink'), url);
      }
    });
  });

  // Changer de langue depuis le créateur emporte le build en cours — y compris
  // les retouches faites depuis l'ouverture du lien, que la query string de la
  // page ne connaît pas. lang.js a déjà recopié cette query string ; on la
  // remplace ici par l'état réel.
  var langLinks = document.querySelectorAll('.lang-switch a[hreflang]');
  for (var li = 0; li < langLinks.length; li++) {
    (function (a) {
      a.addEventListener('click', function (ev) {
        if (!state.build || !state.build.character) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return; // ouverture dans un onglet
        ev.preventDefault();
        shareUrl(a.href.split('?')[0]).then(function (url) { location.href = url; },
          function () { location.href = a.href; });
      });
    })(langLinks[li]);
  }

  // Le décodage étant asynchrone, l'application reste affichée le temps de la
  // décompression, puis se replie sur l'écran de sélection si le lien est
  // illisible — c'est ce que faisait la version synchrone en rendant `false`.
  function collapseApp() {
    root.hidden = true;
    document.getElementById('bc-manager').hidden = true;
  }

  function readSharedBuild() {
    var m = /[?&]build=([^&]+)/.exec(location.search);
    if (!m) return false;
    decodeBuild(decodeURIComponent(m[1])).then(function (b) {
      var check = validateBuild(b);
      if (!check.ok) { toast(T('manager.linkRefused', { error: check.error }), true); collapseApp(); return; }
      loadBuildSilently(b);
      state.dirty = true;
      toast(T('manager.linkReceived'));
    }, function () { toast(T('manager.linkCorrupt'), true); collapseApp(); });
    return true;
  }

  // --- Sources --------------------------------------------------------------
  var sourcesBox = document.getElementById('bc-sources');
  if (sourcesBox) {
    sourcesBox.appendChild(document.createTextNode(T('sources.inline') + ' '));
    D.sources.pages.forEach(function (u, i) {
      if (i) sourcesBox.appendChild(document.createTextNode(' · '));
      sourcesBox.appendChild(el('a', { href: u, target: '_blank', rel: 'external noopener', text: u.replace(/^https?:\/\/(www\.)?/, '') }));
    });
  }

  window.addEventListener('beforeunload', function (ev) {
    if (!state.dirty) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  // --- Démarrage ------------------------------------------------------------
  applyCharacterUi();
  renderSavedList();
  if (!readSharedBuild()) collapseApp();
})();
