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

  var STORAGE_KEY = 'dissidia012.builds.v1';
  var SCHEMA_VERSION = 1;
  var SLOTS = [
    { key: 'weapon', label: 'Arme' },
    { key: 'hand', label: 'Main' },
    { key: 'head', label: 'Tête' },
    { key: 'body', label: 'Corps' },
  ];
  var ACCESSORY_SLOTS = 10;
  var ACCESSORY_CATEGORIES = [
    { key: 'basic', label: 'Basic' },
    { key: 'booster', label: 'Booster' },
    { key: 'special', label: 'Special' },
    { key: 'trade', label: 'Trade' },
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
    mastered: false,
    showIllegal: false,
    dirty: false,
    activeTab: 'attack',
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
      toast('Enregistrement impossible : stockage du navigateur indisponible ou plein.', true);
      return false;
    }
  }

  // Validation stricte : un import ne doit jamais introduire de structure
  // inattendue, ni d'identifiant inconnu des données de jeu.
  function validateBuild(b) {
    if (!b || typeof b !== 'object') return { ok: false, error: 'Objet de build attendu.' };
    if (b.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: 'Version de schéma inconnue (' + b.schemaVersion + ', attendu ' + SCHEMA_VERSION + ').' };
    if (typeof b.character !== 'string' || !charBySlug[b.character]) return { ok: false, error: 'Personnage inconnu : ' + b.character + '.' };
    if (!Array.isArray(b.attacks) || !Array.isArray(b.abilities)) return { ok: false, error: 'Listes d’attaques ou d’abilities absentes.' };
    if (!b.equipment || typeof b.equipment !== 'object') return { ok: false, error: 'Bloc d’équipement absent.' };
    if (!Array.isArray(b.accessories)) return { ok: false, error: 'Liste d’accessoires absente.' };
    var badSlot = SLOTS.some(function (s) {
      var v = b.equipment[s.key];
      return v != null && (typeof v !== 'string' || !equipByUid[v]);
    });
    if (badSlot) return { ok: false, error: 'Équipement inconnu dans un emplacement.' };
    var badAcc = b.accessories.some(function (v) { return v != null && (typeof v !== 'string' || !accByUid[v]); });
    if (badAcc) return { ok: false, error: 'Accessoire inconnu.' };
    if (b.assist != null && !assistBySlug[b.assist]) return { ok: false, error: 'Assist inconnu : ' + b.assist + '.' };
    if (b.summon != null && !summonById[b.summon]) return { ok: false, error: 'Invocation inconnue : ' + b.summon + '.' };
    return { ok: true };
  }

  // Remet un build importé dans une forme sûre (longueurs, types, dates).
  function normalize(b) {
    var out = emptyBuild(b.character);
    out.id = typeof b.id === 'string' && b.id ? b.id : out.id;
    out.name = typeof b.name === 'string' ? b.name.slice(0, 60) : '';
    // Une attaque ou une ability ne s'équipe qu'une fois : on déduplique, sinon
    // un lien de partage bricolé gonflerait le coût en CP.
    var uniq = function (list, keep) {
      var seen = {};
      return list.filter(function (id) {
        if (typeof id !== 'string' || seen[id] || (keep && !keep(id))) return false;
        seen[id] = true;
        return true;
      });
    };
    out.attacks = uniq(b.attacks, null);
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
  function maxBooster() {
    return equippedAccessories().reduce(function (acc, a) {
      return a.category === 'booster' && a.multiplier ? acc * a.multiplier : acc;
    }, 1);
  }

  // Totaux = base niveau 100 + bonus des pièces équipées + abilities à bonus
  // conditionnel. Les effets d'accessoires (pourcentages, effets conditionnels)
  // n'entrent pas dans ces totaux : les sources ne les expriment pas en points.
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
    var categories = equipped.map(function (e) { return (e.category || '').toLowerCase(); });
    state.build.abilities.forEach(function (id) {
      var ab = abilityById[id];
      if (!ab || !ab.statBonus) return;
      var match = ab.statBonus.whenEquipping.some(function (want) {
        return categories.some(function (have) { return have === want || have === want + 's' || have.indexOf(want) === 0; });
      });
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
        ? { state: 'native', label: 'Exclusivité du personnage' }
        : { state: 'unavailable', label: 'Exclusivité d’un autre personnage' };
    }
    var native = (char.native[item.slot] || []).map(function (c) { return c.toLowerCase(); });
    if (!native.length) return { state: 'unknown', label: 'Catégories natives non documentées pour ce personnage' };
    var cat = (item.category || '').toLowerCase();
    var known = (D.equipmentCategories[item.slot] || []).map(function (c) { return c.toLowerCase(); });
    if (known.indexOf(cat) === -1) return { state: 'unknown', label: 'Catégorie « ' + item.category + ' » non rattachée à une liste native' };
    if (native.indexOf(cat) !== -1) return { state: 'native', label: 'Équipable nativement' };
    return { state: 'glitch', label: 'Nécessite l’Equip Glitch' };
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
      cp.used + ' sur ' + cp.max + ' CP — attaques ' + cp.attacks + ', abilities ' + cp.abilities + (over ? ' — budget dépassé' : ''));
    return cp;
  }

  function renderStatus(cp) {
    clear(statusBox);
    var problems = [];
    var infos = [];

    if (cp.used > cp.max) problems.push('Budget dépassé de ' + (cp.used - cp.max) + ' CP — build invalide.');
    if (cp.unknownCost.length) {
      infos.push('Coût en CP non documenté pour : ' + cp.unknownCost.join(', ') + '. Le total affiché est donc un minimum.');
    }
    cp.overEquipped.forEach(function (o) {
      problems.push(o + ' : la source ne documente la capacité que jusqu’à ' + D.capacity.max + ' CP, les exemplaires supplémentaires ne sont pas comptés.');
    });

    var illegal = [];
    equippedAccessories().forEach(function (a) { if (a.legal === false) illegal.push(a.name); });
    if (state.build.summon) {
      var sm = summonById[state.build.summon];
      if (sm && sm.legal === false) illegal.push(sm.name + ' (invocation)');
    }
    if (illegal.length) problems.push('Items illégaux en tournoi : ' + illegal.join(', ') + '.');

    var glitch = [];
    var unavailable = [];
    equippedEquipment().forEach(function (e) {
      var st = equipStatus(e);
      if (st.state === 'glitch') glitch.push(e.name);
      if (st.state === 'unavailable') unavailable.push(e.name);
    });
    if (unavailable.length) problems.push('Équipement non portable par ce personnage : ' + unavailable.join(', ') + '.');
    if (glitch.length) infos.push('Equip Glitch requis pour : ' + glitch.join(', ') + ' (jusqu’à 10 CP économisés par pièce).');

    var combos = activeCombinations();
    if (combos.length) infos.push('Set actif : ' + combos.map(function (c) { return c.name + ' — ' + c.effects; }).join(' ; '));

    var st = computeStats();
    var boost = maxBooster();
    var statLine = el('p', { class: 'bc-stat-line' });
    [['HP', st.totals.hp], ['CP', cp.max], ['BRV', st.totals.brv], ['ATK', st.totals.atk], ['DEF', st.totals.def], ['LUK', st.totals.luk]]
      .forEach(function (pair) {
        statLine.appendChild(el('span', { class: 'bc-stat' }, [
          el('strong', { text: pair[0] }), ' ', el('span', { text: pair[1] == null ? 'non documenté' : String(pair[1]) }),
        ]));
      });
    statLine.appendChild(el('span', { class: 'bc-stat' }, [
      el('strong', { text: 'Max Booster' }), ' ', el('span', { text: '×' + (Math.round(boost * 10) / 10) }),
    ]));
    statusBox.appendChild(statLine);

    if (st.appliedAbilities.length) {
      infos.push('Bonus d’ability appliqué : ' + st.appliedAbilities.join(', ') + '.');
    }

    problems.forEach(function (p) { statusBox.appendChild(el('p', { class: 'bc-alert bc-alert-error', text: p })); });
    infos.forEach(function (i) { statusBox.appendChild(el('p', { class: 'bc-alert bc-alert-info', text: i })); });
    statusBox.appendChild(el('p', {
      class: 'bc-alert bc-alert-muted',
      text: 'Totaux = statistiques de base au niveau 100 + bonus des pièces équipées. Les effets d’accessoires exprimés en pourcentage n’y sont pas intégrés.',
    }));
  }

  function refresh() {
    var cp = renderGauge();
    renderStatus(cp);
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

  function renderPanel(key) {
    if (!state.build.character) return;
    var panel = panels[key];
    clear(panel);
    if (key === 'attack') renderAttacks(panel);
    else if (key === 'abilities') renderAbilities(panel);
    else if (key === 'stuff') renderStuff(panel);
    else if (key === 'accessories') renderAccessories(panel);
    else if (key === 'assist') renderAssist(panel);
  }

  // --- Onglet Attaques ------------------------------------------------------
  var GROUP_LABELS = { ground: 'Au sol', aerial: 'En l’air', main: 'Principales', followups: 'Enchaînements' };
  function groupLabel(key) { return GROUP_LABELS[key] || key; }

  function renderAttacks(panel) {
    var char = charBySlug[state.build.character];
    if (char.hpLinks) {
      // La caveat n'a de sens que si le personnage en a : sinon la réponse est
      // complète telle quelle.
      var aDesLinks = !/^no\b/i.test(char.hpLinks);
      panel.appendChild(el('p', {
        class: 'bc-note',
        text: 'HP links : ' + char.hpLinks + '.' + (aDesLinks ? ' Les sources n’indiquent pas quelles attaques s’enchaînent — l’information reste au niveau du personnage.' : ''),
      }));
    }
    panel.appendChild(el('p', { class: 'bc-note', text: 'Le nombre d’emplacements d’attaques n’est documenté nulle part : seules les CP limitent la sélection ici.' }));

    [['bravery', 'Attaques Bravery'], ['hp', 'Attaques HP']].forEach(function (pair) {
      var groups = char.attacks[pair[0]];
      if (!groups || !groups.length) {
        panel.appendChild(el('p', { class: 'bc-alert bc-alert-muted', text: pair[1] + ' : non documentées pour ce personnage.' }));
        return;
      }
      panel.appendChild(el('h3', { text: pair[1] }));
      groups.forEach(function (g) {
        var fs = el('fieldset', { class: 'bc-group' }, [el('legend', { text: groupLabel(g.key) })]);
        if (g.intro) fs.appendChild(el('p', { class: 'bc-note', text: g.intro.split('\n')[0] }));
        var list = el('div', { class: 'bc-list' });
        g.moves.forEach(function (m) { list.appendChild(attackRow(m)); });
        fs.appendChild(list);
        panel.appendChild(fs);
      });
    });
  }

  function attackRow(m) {
    var checked = state.build.attacks.indexOf(m.id) !== -1;
    var input = el('input', { type: 'checkbox', checked: checked });
    input.addEventListener('change', function () {
      var i = state.build.attacks.indexOf(m.id);
      if (input.checked && i === -1) state.build.attacks.push(m.id);
      else if (!input.checked && i !== -1) state.build.attacks.splice(i, 1);
      markDirty();
      refresh();
    });
    var meta = [];
    if (m.damage) meta.push('dégâts ' + m.damage);
    if (m.startup) meta.push('startup ' + m.startup);
    if (m.type) meta.push(m.type);
    if (m.priority) meta.push(m.priority);
    if (m.variants) meta.push(m.variants);
    var row = el('label', { class: 'bc-row' }, [
      input,
      el('span', { class: 'bc-row-main' }, [
        el('span', { class: 'bc-row-name', text: m.name }),
        el('span', { class: 'bc-row-meta', text: meta.join(' · ') }),
      ]),
      el('span', { class: 'bc-cp', text: m.cp == null ? 'coût inconnu' : cpOf(m) + ' CP' }),
    ]);
    if (m.cp == null) row.appendChild(el('span', { class: 'bc-tag bc-tag-warn', title: 'Le wiki ne donne pas le coût en CP de ce coup', text: 'non documenté' }));
    return row;
  }

  // --- Onglet Abilities -----------------------------------------------------
  function renderAbilities(panel) {
    var slug = state.build.character;
    panel.appendChild(el('p', { class: 'bc-note', text: 'Coût affiché : ' + (state.mastered ? 'ability maîtrisée' : 'à l’achat') + '. La case « Coûts maîtrisés » bascule les deux.' }));
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

  function abilityRow(a) {
    var checked = state.build.abilities.indexOf(a.id) !== -1;
    var input = el('input', { type: 'checkbox', checked: checked });
    input.addEventListener('change', function () {
      var i = state.build.abilities.indexOf(a.id);
      if (input.checked && i === -1) state.build.abilities.push(a.id);
      else if (!input.checked && i !== -1) state.build.abilities.splice(i, 1);
      markDirty();
      refresh();
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
    if (a.only) row.appendChild(el('span', { class: 'bc-tag bc-tag-info', text: 'spécifique' }));
    if (!a.documented) row.appendChild(el('span', { class: 'bc-tag bc-tag-warn', text: 'non documenté' }));
    return row;
  }

  // --- Onglet Équipement ----------------------------------------------------
  var stuffFilters = { weapon: '', hand: '', head: '', body: '' };
  var stuffSort = { weapon: 'name', hand: 'name', head: 'name', body: 'name' };
  var stuffCategory = { weapon: '', hand: '', head: '', body: '' };

  function renderStuff(panel) {
    panel.appendChild(illegalToggle());
    SLOTS.forEach(function (slot) { panel.appendChild(slotSection(slot)); });
  }

  function slotSection(slot) {
    var current = state.build.equipment[slot.key] ? equipByUid[state.build.equipment[slot.key]] : null;
    var section = el('section', { class: 'bc-slot' });
    section.appendChild(el('h3', { text: slot.label + (current ? ' — ' + current.name : ' — vide') }));

    if (current) {
      var st = equipStatus(current);
      var line = el('p', { class: 'bc-current' }, [
        el('span', { text: fmtStats(current.stats) || 'stats non documentées' }),
        current.effects ? el('span', { class: 'bc-row-meta', text: ' · ' + current.effects }) : null,
      ]);
      if (st.state === 'glitch') line.appendChild(el('span', { class: 'bc-tag bc-tag-glitch', title: st.label, text: '⚙ Equip Glitch' }));
      if (st.state === 'unknown') line.appendChild(el('span', { class: 'bc-tag bc-tag-warn', title: st.label, text: 'non documenté' }));
      line.appendChild(el('button', {
        type: 'button', class: 'bc-btn bc-btn-small', text: 'Retirer',
        onclick: function () { state.build.equipment[slot.key] = null; markDirty(); renderPanel('stuff'); refresh(); },
      }));
      section.appendChild(line);
    }

    var cats = D.equipmentCategories[slot.key] || [];
    var bar = el('div', { class: 'bc-filters' });
    var search = el('input', { type: 'search', placeholder: 'Filtrer par nom…', value: stuffFilters[slot.key], 'aria-label': 'Filtrer les ' + slot.label });
    search.addEventListener('input', function () { stuffFilters[slot.key] = search.value; renderList(); });
    var catSel = el('select', { 'aria-label': 'Catégorie' }, [el('option', { value: '', text: 'Toutes catégories' })].concat(
      cats.concat(['Exclusive']).map(function (c) { return el('option', { value: c, text: c, selected: stuffCategory[slot.key] === c }); })
    ));
    catSel.addEventListener('change', function () { stuffCategory[slot.key] = catSel.value; renderList(); });
    var sortSel = el('select', { 'aria-label': 'Tri' }, [
      el('option', { value: 'name', text: 'Nom' }),
      el('option', { value: 'level', text: 'Niveau' }),
      el('option', { value: 'atk', text: 'ATK' }),
      el('option', { value: 'def', text: 'DEF' }),
      el('option', { value: 'hp', text: 'HP' }),
      el('option', { value: 'brv', text: 'BRV' }),
      el('option', { value: 'combination', text: 'Set d’équipement' }),
    ]);
    sortSel.value = stuffSort[slot.key];
    sortSel.addEventListener('change', function () { stuffSort[slot.key] = sortSel.value; renderList(); });
    bar.appendChild(search); bar.appendChild(catSel); bar.appendChild(sortSel);
    section.appendChild(bar);

    var listBox = el('div', { class: 'bc-list bc-list-scroll' });
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
      items.sort(function (a, b) {
        if (key === 'name') return a.name.localeCompare(b.name, 'fr');
        if (key === 'level') return (a.level || 0) - (b.level || 0) || a.name.localeCompare(b.name, 'fr');
        if (key === 'combination') {
          var an = a.combination ? a.combination.name : '￿';
          var bn = b.combination ? b.combination.name : '￿';
          return an.localeCompare(bn, 'fr') || a.name.localeCompare(b.name, 'fr');
        }
        return ((b.stats && b.stats[key]) || 0) - ((a.stats && a.stats[key]) || 0) || a.name.localeCompare(b.name, 'fr');
      });
      listBox.appendChild(el('p', { class: 'bc-count', text: items.length + ' pièce(s)' }));
      items.slice(0, 400).forEach(function (e) { listBox.appendChild(equipRow(slot, e)); });
      if (items.length > 400) listBox.appendChild(el('p', { class: 'bc-note', text: 'Affichage limité aux 400 premières — affinez le filtre.' }));
    }
    renderList();
    return section;
  }

  function equipRow(slot, e) {
    var selected = state.build.equipment[slot.key] === e.uid;
    var st = equipStatus(e);
    var btn = el('button', {
      type: 'button',
      class: 'bc-row bc-row-btn' + (selected ? ' is-selected' : ''),
      'aria-pressed': selected ? 'true' : 'false',
      onclick: function () {
        state.build.equipment[slot.key] = selected ? null : e.uid;
        markDirty();
        renderPanel('stuff');
        refresh();
      },
    }, [
      el('span', { class: 'bc-row-main' }, [
        el('span', { class: 'bc-row-name', text: e.name }),
        el('span', { class: 'bc-row-meta', text: [e.category, e.level ? 'niv. ' + e.level : '', fmtStats(e.stats), e.effects].filter(Boolean).join(' · ') }),
      ]),
    ]);
    if (st.state === 'glitch') btn.appendChild(el('span', { class: 'bc-tag bc-tag-glitch', title: st.label, text: '⚙' }));
    if (st.state === 'unknown') btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', title: st.label, text: '?' }));
    if (e.labyrinth) btn.appendChild(el('span', { class: 'bc-tag bc-tag-info', title: 'Obtenu dans le Labyrinthe', text: 'Lab' }));
    if (!e.documented) btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', text: 'non documenté' }));
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
      input, el('span', { text: 'Afficher les items illégaux en tournoi (ruleset ' + D.ruleset.name + ')' }),
    ]);
  }

  function renderAccessories(panel) {
    panel.appendChild(illegalToggle());

    var slotsBox = el('div', { class: 'bc-acc-slots' });
    for (var i = 0; i < ACCESSORY_SLOTS; i++) slotsBox.appendChild(accessorySlot(i));
    panel.appendChild(el('h3', { text: 'Emplacements (' + state.build.accessories.filter(Boolean).length + '/10)' }));
    panel.appendChild(slotsBox);

    panel.appendChild(el('h3', { text: 'Choisir un accessoire' }));
    var bar = el('div', { class: 'bc-filters' });
    var search = el('input', { type: 'search', placeholder: 'Filtrer par nom ou effet…', value: accFilter, 'aria-label': 'Filtrer les accessoires' });
    search.addEventListener('input', function () { accFilter = search.value; renderList(); });
    var catSel = el('select', { 'aria-label': 'Catégorie' }, [el('option', { value: '', text: 'Toutes catégories' })].concat(
      ACCESSORY_CATEGORIES.map(function (c) { return el('option', { value: c.key, text: c.label, selected: accCategory === c.key }); })
    ));
    catSel.addEventListener('change', function () { accCategory = catSel.value; renderList(); });
    bar.appendChild(search); bar.appendChild(catSel);
    panel.appendChild(bar);

    var listBox = el('div', { class: 'bc-list bc-list-scroll' });
    panel.appendChild(listBox);

    function renderList() {
      clear(listBox);
      var q = accFilter.toLowerCase();
      var items = D.accessories.filter(function (a) {
        if (!state.showIllegal && a.legal === false) return false;
        if (accCategory && a.category !== accCategory) return false;
        if (q && (a.name + ' ' + (a.effect || '') + ' ' + (a.requirements || '')).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      listBox.appendChild(el('p', { class: 'bc-count', text: items.length + ' accessoire(s)' }));
      items.slice(0, 400).forEach(function (a) { listBox.appendChild(accessoryRow(a)); });
      if (items.length > 400) listBox.appendChild(el('p', { class: 'bc-note', text: 'Affichage limité aux 400 premiers — affinez le filtre.' }));
    }
    renderList();
  }

  function accessorySlot(i) {
    var u = state.build.accessories[i];
    var a = u ? accByUid[u] : null;
    var box = el('div', { class: 'bc-acc-slot' + (a ? '' : ' is-empty') });
    box.appendChild(el('span', { class: 'bc-acc-index', text: String(i + 1) }));
    if (!a) {
      box.appendChild(el('span', { class: 'bc-row-meta', text: 'vide' }));
      return box;
    }
    box.appendChild(el('span', { class: 'bc-row-main' }, [
      el('span', { class: 'bc-row-name', text: a.name }),
      el('span', { class: 'bc-row-meta', text: [a.category, a.multiplier ? '×' + a.multiplier : '', a.effect || a.requirements].filter(Boolean).join(' · ') }),
    ]));
    if (a.legal === false) box.appendChild(el('span', { class: 'bc-tag bc-tag-illegal', title: illegalReason(a), text: 'illégal' }));
    box.appendChild(el('button', {
      type: 'button', class: 'bc-btn bc-btn-small', text: 'Retirer',
      onclick: function () { state.build.accessories[i] = null; markDirty(); renderPanel('accessories'); refresh(); },
    }));
    return box;
  }

  function accessoryRow(a) {
    var count = state.build.accessories.filter(function (u) { return u === a.uid; }).length;
    var full = state.build.accessories.indexOf(null) === -1;
    var btn = el('button', {
      type: 'button',
      class: 'bc-row bc-row-btn' + (count ? ' is-selected' : ''),
      disabled: full,
      onclick: function () {
        var free = state.build.accessories.indexOf(null);
        if (free === -1) return;
        state.build.accessories[free] = a.uid;
        markDirty();
        renderPanel('accessories');
        refresh();
      },
    }, [
      el('span', { class: 'bc-row-main' }, [
        el('span', { class: 'bc-row-name', text: a.name + (count ? ' ×' + count : '') }),
        el('span', { class: 'bc-row-meta', text: [a.category, a.boosterType, a.requirements, a.effect].filter(Boolean).join(' · ') }),
      ]),
    ]);
    if (a.multiplier) btn.appendChild(el('span', { class: 'bc-tag bc-tag-mult', text: '×' + a.multiplier }));
    if (a.legal === false) btn.appendChild(el('span', { class: 'bc-tag bc-tag-illegal', title: illegalReason(a), text: 'illégal' }));
    if (a.rank) btn.appendChild(el('span', { class: 'bc-tag bc-tag-info', title: 'Rang ' + a.rank, text: a.rank }));
    return btn;
  }

  // --- Onglet Assist & invocation -------------------------------------------
  function renderAssist(panel) {
    panel.appendChild(illegalToggle());

    panel.appendChild(el('h3', { text: 'Assist' }));
    panel.appendChild(el('p', { class: 'bc-note', text: 'Un assist par build. Feral Chaos n’existe pas en assist ; Aerith n’est jouable que sous cette forme.' }));
    var alist = el('div', { class: 'bc-list bc-list-scroll' });
    D.assists.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); }).forEach(function (a) {
      var selected = state.build.assist === a.slug;
      var btn = el('button', {
        type: 'button', class: 'bc-row bc-row-btn' + (selected ? ' is-selected' : ''), 'aria-pressed': selected ? 'true' : 'false',
        onclick: function () { state.build.assist = selected ? null : a.slug; markDirty(); renderPanel('assist'); refresh(); },
      }, [
        el('span', { class: 'bc-row-main' }, [
          el('span', { class: 'bc-row-name', text: a.name }),
          el('span', { class: 'bc-row-meta', text: a.attacks.map(function (x) { return x.name + (x.startup ? ' (' + x.startup + ')' : ''); }).join(' · ') }),
        ]),
      ]);
      if (!a.documented) btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', text: 'non documenté' }));
      alist.appendChild(btn);
    });
    panel.appendChild(alist);

    panel.appendChild(el('h3', { text: 'Invocation' }));
    panel.appendChild(el('p', { class: 'bc-note', text: 'Le ruleset de tournoi n’autorise que les counter summons : ' + D.ruleset.legalSummons.join(', ') + '.' }));
    var slist = el('div', { class: 'bc-list bc-list-scroll' });
    D.summons.filter(function (s) { return state.showIllegal || s.legal !== false; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); })
      .forEach(function (s) {
        var selected = state.build.summon === s.id;
        var btn = el('button', {
          type: 'button', class: 'bc-row bc-row-btn' + (selected ? ' is-selected' : ''), 'aria-pressed': selected ? 'true' : 'false',
          onclick: function () { state.build.summon = selected ? null : s.id; markDirty(); renderPanel('assist'); refresh(); },
        }, [
          el('span', { class: 'bc-row-main' }, [
            el('span', { class: 'bc-row-name', text: s.name }),
            el('span', { class: 'bc-row-meta', text: (s.text || '').split('\n')[0].slice(0, 150) }),
          ]),
        ]);
        if (s.legal === false) btn.appendChild(el('span', { class: 'bc-tag bc-tag-illegal', title: illegalReason(s), text: 'illégal' }));
        if (!s.documented) btn.appendChild(el('span', { class: 'bc-tag bc-tag-warn', title: 'Effet non documenté par nos sources', text: 'non documenté' }));
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
      if (state.dirty && !window.confirm('Le build en cours n’est pas enregistré. Changer de personnage l’écrasera. Continuer ?')) return;
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
    document.getElementById('bc-current-name').textContent = char ? 'Build de ' + char.name : 'Composer le build';
    document.getElementById('bc-build-name').value = state.build.name;
    document.getElementById('bc-notes').value = state.build.notes;
  }

  // --- Gestion des builds ---------------------------------------------------
  function toast(message, isError) {
    var box = document.getElementById('bc-toast');
    if (!box) {
      box = el('div', { id: 'bc-toast', class: 'bc-toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.className = 'bc-toast is-visible' + (isError ? ' is-error' : '');
    window.clearTimeout(box._t);
    box._t = window.setTimeout(function () { box.className = 'bc-toast'; }, 4000);
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
      box.appendChild(el('p', { class: 'bc-note', text: 'Aucun build enregistré pour l’instant.' }));
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
            el('span', { class: 'bc-row-name', text: b.name || 'Sans titre' }),
            el('span', { class: 'bc-row-meta', text: 'modifié le ' + new Date(b.modified).toLocaleDateString('fr-FR') }),
          ]),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: 'Charger', onclick: function () { loadBuild(b); } }),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: 'Dupliquer', onclick: function () { duplicateBuild(b); } }),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small', text: 'Renommer', onclick: function () { renameBuild(b); } }),
          el('button', { type: 'button', class: 'bc-btn bc-btn-small bc-btn-danger', text: 'Supprimer', onclick: function () { deleteBuild(b); } }),
        ]));
      });
    });
  }

  function loadBuild(b) {
    if (state.dirty && !window.confirm('Le build en cours n’est pas enregistré. Le remplacer ?')) return;
    state.build = normalize(b);
    state.build.id = b.id;
    state.dirty = false;
    applyCharacterUi();
    selectTab(state.activeTab, false);
    refresh();
    toast('Build « ' + (b.name || 'Sans titre') + ' » chargé.');
  }

  function duplicateBuild(b) {
    var copy = normalize(b);
    copy.id = uid();
    copy.name = (b.name || 'Sans titre') + ' (copie)';
    var builds = loadAll();
    builds.push(copy);
    if (saveAll(builds)) { renderSavedList(); toast('Copie créée.'); }
  }

  function renameBuild(b) {
    var next = window.prompt('Nouveau nom du build :', b.name || '');
    if (next === null) return;
    var builds = loadAll().map(function (x) { return x.id === b.id ? Object.assign({}, x, { name: next.trim().slice(0, 60), modified: new Date().toISOString() }) : x; });
    if (saveAll(builds)) { renderSavedList(); toast('Build renommé.'); }
  }

  function deleteBuild(b) {
    if (!window.confirm('Supprimer définitivement « ' + (b.name || 'Sans titre') + ' » ?')) return;
    if (saveAll(loadAll().filter(function (x) { return x.id !== b.id; }))) { renderSavedList(); toast('Build supprimé.'); }
  }

  document.getElementById('bc-save').addEventListener('click', function () {
    var snap = currentSnapshot();
    var check = validateBuild(snap);
    if (!check.ok) { toast('Enregistrement refusé : ' + check.error, true); return; }
    var builds = loadAll();
    var i = -1;
    builds.forEach(function (b, k) { if (b.id === snap.id) i = k; });
    if (i === -1) builds.push(snap); else builds[i] = snap;
    if (saveAll(builds)) {
      state.build = snap;
      state.dirty = false;
      renderSavedList();
      toast('Build enregistré.');
    }
  });

  document.getElementById('bc-new').addEventListener('click', function () {
    if (state.dirty && !window.confirm('Le build en cours n’est pas enregistré. Le remplacer par un build vide ?')) return;
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
    if (!builds.length) { toast('Aucun build enregistré à exporter.', true); return; }
    download('dissidia012-builds.json', JSON.stringify({ schemaVersion: SCHEMA_VERSION, builds: builds }, null, 2), 'application/json');
  });

  // Export secondaire à plat : une ligne par build, listes agrégées. Le JSON
  // reste le format d'échange de référence — le CSV perd la structure.
  document.getElementById('bc-export-csv').addEventListener('click', function () {
    var builds = loadAll();
    var snap = currentSnapshot();
    if (!builds.some(function (b) { return b.id === snap.id; })) builds = builds.concat([snap]);
    var cols = ['id', 'nom', 'personnage', 'attaques', 'abilities', 'arme', 'main', 'tete', 'corps', 'accessoires', 'assist', 'invocation', 'notes', 'modifie'];
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
    reader.onerror = function () { toast('Lecture du fichier impossible.', true); ev.target.value = ''; };
    reader.readAsText(file);
  });

  // Le contenu importé n'est jamais exécuté ni inséré en HTML : il est analysé,
  // validé champ par champ, puis normalisé.
  function importPayload(text) {
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { toast('Fichier illisible : ce n’est pas du JSON valide.', true); return; }

    var candidates = Array.isArray(parsed) ? parsed
      : parsed && Array.isArray(parsed.builds) ? parsed.builds
        : [parsed];
    if (parsed && parsed.builds && parsed.schemaVersion !== SCHEMA_VERSION) {
      toast('Version de collection inconnue (' + parsed.schemaVersion + ').', true);
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
      toast('Import refusé — ' + (rejected[0] || 'aucun build valide dans le fichier.'), true);
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
    toast(accepted.length + ' build(s) importé(s)' + (rejected.length ? ', ' + rejected.length + ' rejeté(s) : ' + rejected[0] : '') + '.', rejected.length > 0);
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
  // Le build voyage dans l'URL, encodé en base64url d'un JSON compact.
  function encodeBuild(b) {
    var compact = {
      v: b.schemaVersion, c: b.character, n: b.name,
      at: b.attacks, ab: b.abilities,
      eq: [b.equipment.weapon, b.equipment.hand, b.equipment.head, b.equipment.body],
      ac: b.accessories, as: b.assist, su: b.summon, no: b.notes,
    };
    var json = JSON.stringify(compact);
    var bytes = new TextEncoder().encode(json);
    var bin = '';
    bytes.forEach(function (x) { bin += String.fromCharCode(x); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeBuild(param) {
    var b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var c = JSON.parse(new TextDecoder().decode(bytes));
    return {
      schemaVersion: c.v, id: uid(), name: c.n || '', character: c.c,
      attacks: c.at || [], abilities: c.ab || [],
      equipment: { weapon: (c.eq || [])[0] || null, hand: (c.eq || [])[1] || null, head: (c.eq || [])[2] || null, body: (c.eq || [])[3] || null },
      accessories: c.ac || [], assist: c.as || null, summon: c.su || null, notes: c.no || '',
      created: new Date().toISOString(), modified: new Date().toISOString(),
    };
  }

  document.getElementById('bc-share').addEventListener('click', function () {
    var snap = currentSnapshot();
    var url = location.origin + location.pathname + '?build=' + encodeBuild(snap);
    var done = function () { toast('Lien copié dans le presse-papiers.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copiez ce lien :', url); });
    } else {
      window.prompt('Copiez ce lien :', url);
    }
  });

  function readSharedBuild() {
    var m = /[?&]build=([^&]+)/.exec(location.search);
    if (!m) return false;
    var b;
    try { b = decodeBuild(decodeURIComponent(m[1])); }
    catch (e) { toast('Le lien de partage est corrompu.', true); return false; }
    var check = validateBuild(b);
    if (!check.ok) { toast('Lien de partage refusé : ' + check.error, true); return false; }
    loadBuildSilently(b);
    state.dirty = true;
    toast('Build reçu par lien — enregistrez-le pour le conserver.');
    return true;
  }

  // --- Sources --------------------------------------------------------------
  var sourcesBox = document.getElementById('bc-sources');
  if (sourcesBox) {
    sourcesBox.appendChild(document.createTextNode('Sources : '));
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
  if (!readSharedBuild()) {
    root.hidden = true;
    document.getElementById('bc-manager').hidden = true;
  }
})();
