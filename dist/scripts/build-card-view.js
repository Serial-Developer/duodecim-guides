// Rendu de la carte de build — SOURCE UNIQUE, partagée par le build statique
// (fiches, pages d'essai) et par le navigateur (créateur de builds).
//
// Script classique sans import ni export : le navigateur le charge par balise
// <script>, et src/templates/build-card.mjs l'évalue puis en réexporte l'API.
// Le dépôt a déjà vu deux rendus du même objet diverger — la grille d'attaques
// entre le créateur et cette carte, et move-shape entre le payload et guide.mjs.
// Une seule implémentation ferme la porte.
//
// Il ne connaît que l'objet build et le payload : ni DOM, ni état, ni réseau.
(function () {
  'use strict';

  // Reprise de helpers.mjs : ce fichier ne peut rien importer.
  const esc = (s) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Carte de build : le récapitulatif d'un build entier en un coup d'œil, pensé
// pour être lu — et capturé — d'un seul écran.
//
// Composant réutilisable : il ne lit que l'objet build du créateur (le même que
// le stockage local et le lien de partage) et le payload des données de jeu. Il
// est donc utilisable aussi bien sur une fiche perso que dans le créateur, sans
// rien connaître de leur contexte.
//
// La grille est toujours complète : un emplacement vide reste affiché. C'est ce
// qui permet de lire un build « en creux » — voir ce qui n'est pas équipé est
// aussi informatif que voir ce qui l'est.


const SLOTS = ['weapon', 'hand', 'head', 'body'];
const ACCESSORY_SLOTS = 10;
const MAX_SLOTS = 3;

// Les longues listes du payload voyagent en colonnes : on les remet en objets,
// exactement comme le fait le créateur côté navigateur.
function hydrate(t) {
  if (!t || !t.c) return t || [];
  return t.r.map((row) => {
    const o = {};
    t.c.forEach((key, i) => { if (row[i] !== null) o[key] = row[i]; });
    return o;
  });
}

// --- Icônes de touches -------------------------------------------------------
// Icônes du jeu, extraites de ses planches de textures : le rond déclenche une
// bravery, le carré une attaque HP, et la croix directionnelle porte le
// modificateur. Elles sont minuscules (12 à 15 px) et s'agrandissent au double
// sans lissage — voir `image-rendering: pixelated` dans la feuille de style.
const BUTTON_ICON = { bravery: 'btn-circle.png', hp: 'btn-square.png' };
// Les deux directions d'un emplacement ne sont pas les mêmes au sol et en
// l'air : le sol se dirige à l'horizontale, l'air à la verticale. Une seule
// table pour les deux affichait « Gauche + Cercle » sur des coups aériens.
const DIRECTIONS = {
  ground: ['neutral', 'back', 'forward'],
  aerial: ['neutral', 'up', 'down'],
};
// Le jeu compose une commande dirigée en trois temps : une flèche, le stick
// analogique, puis le bouton. C'est bien le stick — la croix directionnelle
// existe dans les planches de textures mais ne sert pas ici. La flèche, elle,
// n'a pas d'équivalent extrait : elle est tracée, dans la couleur du texte.
const CHEVRON = {
  back: 'M11 3 L5 9 L11 15',
  forward: 'M7 3 L13 9 L7 15',
  up: 'M3 11 L9 5 L15 11',
  down: 'M3 7 L9 13 L15 7',
};

// Le bouton seul, sans direction : c'est ce que porte un prolongement.
function buttonIcon(t, L, sizeOf, kind) {
  const fichier = BUTTON_ICON[kind];
  const label = t(`buildCard.keys.${kind}`);
  return `<img class="icon-d12 bcard-btn" src="${L.asset(`assets/buttons-icons/${fichier}`)}" alt="${esc(label)}" title="${esc(label)}"${sizeOf(`buttons-icons/${fichier}`)} loading="lazy">`;
}

// Le libellé accessible dit la commande en toutes lettres — « Gauche + Cercle » —
// là où le dessin ne montre que des formes.
function keyIcon(t, L, sizeOf, kind, cmd, stance) {
  const dir = (DIRECTIONS[stance] || DIRECTIONS.ground)[cmd] || 'neutral';
  const label = t(`buildCard.keys.${dir}`, { button: t(`buildCard.keys.${kind}`) });
  const glyphe = (fichier, cls) => `<img class="icon-d12 ${cls}" src="${L.asset(`assets/buttons-icons/${fichier}`)}" alt="" aria-hidden="true"${sizeOf(`buttons-icons/${fichier}`)} loading="lazy">`;
  // Sans direction, la commande se réduit au bouton : le jeu n'affiche pas le
  // stick au neutre.
  const direction = CHEVRON[dir]
    ? `<svg class="bcard-chevron" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="${CHEVRON[dir]}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${glyphe('stick-analog.png', 'bcard-stick')}<span class="bcard-plus" aria-hidden="true">+</span>`
    : '';
  // Le libellé porte la commande en toutes lettres ; les images n'ont donc pas
  // à la répéter, d'où leur alt vide.
  return `<span class="bcard-key" role="img" aria-label="${esc(label)}">${direction}${glyphe(BUTTON_ICON[kind], 'bcard-btn')}</span>`;
}

// --- Icônes d'accessoire -----------------------------------------------------
// Quatorze icônes couvrent les 551 accessoires : quatre rangs et dix types de
// booster. Elles s'associent par `rank` et `boosterType`, déjà portés par la
// donnée — aucune table de correspondance à tenir.
//
// Disposition reprise du jeu : le type devant le nom, le rang derrière. Un
// accessoire qui n'est pas un booster n'a que son rang.
function accessoryIcons(t, L, item) {
  if (!item) return { avant: '', apres: '' };
  const img = (fichier, label, quoi) => `<img class="acc-icon acc-icon-${quoi}" src="${L.asset(`assets/accessory-icons/${fichier}`)}" alt="${esc(label)}" title="${esc(label)}" width="16" height="16" loading="lazy">`;
  const categorie = item.category
    ? img(`cat-${item.category}.png`, t('accessories.categoryIcon', { category: t(`accessories.categories.${item.category}`) || item.category }), 'cat')
    : '';
  const type = item.boosterType
    ? img(`type-${item.boosterType}.png`, t('accessories.typeIcon', { type: item.boosterType }), 'type')
    : '';
  return {
    avant: categorie + type,
    apres: item.rank ? img(`rank-${item.rank}.png`, t('accessories.rankIcon', { rank: item.rank }), 'rank') : '',
  };
}

// Le `t` du build statique expose `has()`, celui du créateur non : il n'a que
// les clés de son propre catalogue. On teste donc la clé sans le supposer.
function aCle(t, cle) {
  if (typeof t.has === 'function') return t.has(cle);
  const v = t(cle);
  return !!v && v !== cle && !/^⟨.*⟩$/.test(v);
}

// --- Lignes ------------------------------------------------------------------
// `hook` est la poignée du créateur : la ligne devient un bouton porteur de son
// emplacement. Vide sur les pages statiques, où la carte se lit sans se toucher.
function slotLine(label, valeur, extra = '', ic = null, labelBrut = false, hook = '') {
  const dedans = `<span class="bcard-slot">${labelBrut ? label : esc(label)}</span>
<span class="bcard-value">${ic?.avant || ''}${valeur ? esc(valeur) : ''}${ic?.apres || ''}${extra}</span>`;
  return `<li class="bcard-line${valeur ? '' : ' is-empty'}${hook ? ' is-live' : ''}">${
    hook ? `<button type="button" class="bcard-hit"${hook}>${dedans}</button>` : dedans
  }</li>`;
}

function attackLine(t, L, sizeOf, kind, cmd, move, stance, branches = [], hook = '', hookBranche = () => '') {
  // Un prolongement se lit sous l'attaque qu'il prolonge, sans commande : il
  // n'occupe pas d'emplacement, c'est le coup parent qui le déclenche.
  const sous = branches.map((b, i) => {
    const dedans = `<span class="bcard-key">${buttonIcon(t, L, sizeOf, b.kind)}</span>
<span class="bcard-value">${esc(b.move.name)}</span>`;
    const h = hookBranche(b, i);
    return `<li class="bcard-line bcard-branch${h ? ' is-live' : ''}">${
      h ? `<button type="button" class="bcard-hit"${h}>${dedans}</button>` : dedans
    }</li>`;
  }).join('\n');
  const dedans = `${keyIcon(t, L, sizeOf, kind, cmd, stance)}
<span class="bcard-value">${move ? esc(move.name) : ''}</span>`;
  return `<li class="bcard-line${move ? '' : ' is-empty'}${hook ? ' is-live' : ''}">${
    hook ? `<button type="button" class="bcard-hit"${hook}>${dedans}</button>` : dedans
  }</li>
${sous}`;
}

// --- Attaques ----------------------------------------------------------------
// Chaque coup retenu est replacé sur sa commande, dans sa catégorie. Le nom d'un
// coup pouvant contenir « : » (« Magic Arts: Flame »), on résout par l'index des
// coups du personnage et jamais en découpant l'identifiant.
function attackIndex(char) {
  const byId = {};
  for (const kind of ['bravery', 'hp']) {
    for (const g of char?.attacks?.[kind] || []) {
      for (const m of hydrate(g.moves)) {
        byId[m.id] = { move: m, kind, groupKey: g.key, style: m.style || '', followUp: !!g.followUp };
      }
    }
  }
  return byId;
}

// Une catégorie d'emplacements, c'est le triplet (bravery/HP, groupe, style) —
// la définition qu'en donne le créateur, et donc l'écran du jeu. Les quatre
// blocs figés d'avant (sol/air × bravery/HP) ne couvraient pas les personnages
// dont les coups valent au sol comme en l'air : Exdeath, Kefka, Ultimecia,
// Kuja et Vaan rangent les leurs sous « main », et la carte les perdait tous.
// Elle ignorait aussi les styles, si bien que les trois paradigmes de Lightning
// se disputaient trois emplacements au lieu d'en avoir trois chacun.
const STANCE = { ground: 'ground', aerial: 'aerial' };
const BLOCK_KEY = {
  'bravery|ground': 'groundBravery',
  'bravery|aerial': 'airBravery',
  'bravery|main': 'mainBravery',
  'hp|ground': 'groundHp',
  'hp|aerial': 'airHp',
  'hp|main': 'mainHp',
};

// Les catégories du personnage, dans l'ordre où ses coups les déclarent.
function categories(char) {
  const vues = new Set();
  const out = [];
  for (const kind of ['bravery', 'hp']) {
    for (const g of char?.attacks?.[kind] || []) {
      if (g.followUp) continue;
      for (const m of hydrate(g.moves)) {
        const style = m.style || '';
        const cat = `${kind}|${g.key}|${style}`;
        if (vues.has(cat)) continue;
        vues.add(cat);
        out.push({ cat, kind, groupKey: g.key, style });
      }
    }
  }
  return out;
}

// Le style ne complète le titre que faute d'onglets : quand ils sont là, ils le
// disent déjà, et « Braveries au sol — Dark Knight » sous un onglet « Dark
// Knight » ne fait que répéter.
function blockTitle(t, { kind, groupKey, style }, onglets) {
  const cle = BLOCK_KEY[`${kind}|${groupKey}`];
  const base = cle && aCle(t, `buildCard.${cle}`)
    ? t(`buildCard.${cle}`)
    : t('buildCard.otherBlock', { kind: t(`buildCard.kinds.${kind}`), group: groupKey });
  return style && !onglets ? `${base} — ${style}` : base;
}

// Les styles d'un personnage, dans l'ordre d'apparition. Un seul style — ou
// aucun — ne justifie pas d'onglets.
function stylesOf(char) {
  const vus = [];
  for (const c of categories(char)) if (c.style && !vus.includes(c.style)) vus.push(c.style);
  return vus.length > 1 ? vus : [];
}

// Un prolongement — HP link ou enchaînement de bravery — se rattache à
// l'attaque qui le précède immédiatement dans la liste : c'est la seule forme
// que le build lui donne, et la lecture que fait le créateur. Il n'occupe pas
// d'emplacement. Sans cette lecture, le Somersault de Tifa mangeait une des
// trois commandes d'attaque HP au sol et le quatrième coup disparaissait.
function branchesOf(build, index, char) {
  const liens = {};
  for (const l of char?.links || []) (liens[l.from] = liens[l.from] || new Set()).add(l.to);
  const starters = new Set(char?.followStarters || []);
  const attaches = {};
  (build.attacks || []).forEach((id, i) => {
    if (!i) return;
    const info = index[id];
    const parent = index[(build.attacks || [])[i - 1]];
    if (!info || !parent || parent.followUp) return;
    const estLien = info.kind === 'hp' && liens[parent.move.id]?.has(id);
    const estEnchainement = info.followUp && starters.has(parent.move.id);
    if (estLien || estEnchainement) attaches[i] = i - 1;
  });
  return attaches;
}

function attackGrid(t, L, sizeOf, build, char, styles, live) {
  const index = attackIndex(char);
  const attaches = branchesOf(build, index, char);
  // catégorie -> commande -> { coup, prolongements }
  const parCat = {};
  const parPos = {};
  (build.attacks || []).forEach((id, i) => {
    const info = index[id];
    // Un enchaînement qui ne prolonge rien n'a pas d'emplacement non plus : la
    // carte montre les commandes, il n'y a pas sa place.
    if (!info || info.followUp || attaches[i] !== undefined) return;
    const cat = `${info.kind}|${info.groupKey}|${info.style}`;
    const cmd = Number((build.attackSlots || [])[i]);
    const cases = (parCat[cat] = parCat[cat] || {});
    const place = cmd >= 0 && cmd < MAX_SLOTS && !cases[cmd]
      ? cmd
      : [0, 1, 2].find((c) => !cases[c]);
    if (place !== undefined) { cases[place] = { move: info.move, branches: [] }; parPos[i] = cases[place]; }
  });
  // Deuxième passe : les prolongements rejoignent leur parent une fois posé.
  Object.entries(attaches).forEach(([i, p]) => {
    const info = index[(build.attacks || [])[i]];
    if (info && parPos[p]) parPos[p].branches.push(info);
  });

  return categories(char).map((c) => {
    const cases = parCat[c.cat] || {};
    // Un coup « main » vaut au sol comme en l'air : sa direction est celle du
    // sol, la seule que la source décrive.
    const stance = STANCE[c.groupKey] || 'ground';
    const lignes = [0, 1, 2].map((i) => attackLine(
      t, L, sizeOf, c.kind, i, cases[i]?.move, stance, cases[i]?.branches || [],
      live ? ` data-bc="attack" data-cat="${esc(c.cat)}" data-cmd="${i}"` : '',
      live ? (b) => ` data-bc="branch" data-id="${esc(b.move.id)}"` : () => '',
    )).join('\n');
    // Un bloc rattaché à un style ne s'affiche qu'avec son onglet. Un bloc sans
    // style — les attaques HP de Cecil, communes aux deux jobs — reste visible.
    const rang = styles.indexOf(c.style);
    const marque = rang >= 0 ? ` data-si="${rang + 1}"` : '';
    return `<section class="bcard-block"${marque}>
<h3 class="bcard-h">${esc(blockTitle(t, c, styles.length > 0))}</h3>
<ul class="bcard-list">${lignes}</ul>
</section>`;
  }).join('\n');
}

// --- Abilities ---------------------------------------------------------------
// Trois familles, telles que le payload les livre : basic, support, extra. Elles
// n'ont pas d'emplacements — seule la capacité en points les borne —, la carte
// liste donc ce qui est équipé, sans ligne vide de réserve. Une famille sans
// rien garde sa ligne estompée : lire un build en creux vaut ici aussi.
function abilitiesPanel(t, build, data, live) {
  const equipees = new Set(build.abilities || []);
  return (data.abilities || []).map((g) => {
    const liste = (g.abilities || []).filter((a) => equipees.has(a.id));
    const lignes = liste.length
      ? liste.map((a) => `<li class="bcard-line"><span class="bcard-value">${esc(a.name)}</span></li>`).join('\n')
      : '<li class="bcard-line is-empty"><span class="bcard-value"></span></li>';
    const titre = aCle(t, `buildCard.abilityGroups.${g.key}`) ? t(`buildCard.abilityGroups.${g.key}`) : g.label;
    return `<section class="bcard-block">
<h3 class="bcard-h">${esc(titre)}</h3>
<ul class="bcard-list">${lignes}</ul>
${live ? `<p class="bcard-add"><button type="button" class="bcard-btn-add" data-bc="abilities" data-group="${esc(g.key)}">${esc(t('buildCard.editAbilities'))}</button></p>` : ''}
</section>`;
  }).join('\n');
}

// --- Capacité ----------------------------------------------------------------
// Même calcul que le créateur, au même endroit que le reste du rendu : le coût
// des attaques et des abilities d'un côté, la capacité de base augmentée des
// accessoires extenseurs de l'autre.
//
// Un coût absent des sources n'est pas un coût nul : il compte pour zéro faute
// de mieux, mais il ressort dans `unknown` pour que le total se lise comme un
// minimum et jamais comme une valeur exacte.
function capacityOf(build, data, mastered = true) {
  const char = (data.characters || []).find((c) => c.slug === build.character);
  const index = attackIndex(char);
  const cout = (e) => {
    if (!e) return 0;
    if (mastered && e.cpMastered != null) return e.cpMastered;
    return e.cp != null ? e.cp : 0;
  };
  const inconnus = [];
  let used = 0;
  for (const id of build.attacks || []) {
    const m = index[id]?.move;
    if (m && m.cp == null) inconnus.push(m.name);
    used += cout(m);
  }
  const parId = {};
  for (const g of data.abilities || []) for (const a of g.abilities || []) parId[a.id] = a;
  for (const id of build.abilities || []) {
    const a = parId[id];
    if (a && a.cp == null) inconnus.push(a.name);
    used += cout(a);
  }
  let bonus = 0;
  for (const ext of data.capacity?.extenders || []) {
    const n = (build.accessories || []).filter((u) => u === ext.uid).length;
    bonus += Math.min(n, ext.maxEquipped) * ext.cp;
  }
  return { used, max: (data.capacity?.base || 0) + bonus, unknown: inconnus };
}

// --- Carte -------------------------------------------------------------------
// `variant` ne change que la place du portrait du personnage : par défaut la
// vignette de l'en-tête ; `portrait-full` et `portrait-tall` la sortent en
// bandeau à gauche, sur toute la hauteur de la carte ou sur celle du seul
// en-tête. Le nom reste en haut dans les trois cas.
// `live` bascule la carte en mode créateur : chaque emplacement devient un
// bouton porteur de sa position, et une troisième languette accueille les
// statistiques. La carte ne sait rien de ce qui les remplit — elle pose les
// poignées, le créateur les écoute.
function buildCard({ t, build, data, L, hasPortrait, sizeOf = () => '', variant = '', uid = '', mastered = true, live = false }) {
  const char = (data.characters || []).find((c) => c.slug === build.character);
  if (!char) return '';
  // Les onglets de style passent par des boutons radio, sans JavaScript : la
  // carte doit rester autonome partout où on la pose. Le nom du groupe doit être
  // unique dans la page — deux cartes du même personnage cohabitent sur le banc
  // d'essai —, d'où l'identifiant facultatif.
  const styles = stylesOf(char);
  const grpId = `bcs-${uid || char.slug}`;
  const equipement = hydrate(data.equipment);
  const accessoires = hydrate(data.accessories);
  const byUid = (list) => Object.fromEntries(list.map((x) => [x.uid, x]));
  const eq = byUid(equipement);
  const acc = byUid(accessoires);
  const assist = (data.assists || []).find((a) => a.slug === build.assist);
  const summon = (data.summons || []).find((s) => s.id === build.summon);

  const portrait = (slug, alt) => (hasPortrait(slug)
    ? `<img src="${L.asset(`assets/portraits/${slug}.png`)}" alt="${esc(alt)}" width="56" height="56" loading="lazy">`
    : '<span class="bcard-portrait-none" aria-hidden="true"></span>');

  // Deux accessoires peuvent porter le même nom — « Summon Unused » existe pour
  // sa propre invocation et pour celle de l'adversaire. Sans leur condition, la
  // carte semblerait répéter la même ligne par erreur.
  const homonymes = {};
  (build.accessories || []).forEach((u) => { if (u && acc[u]) homonymes[acc[u].name] = (homonymes[acc[u].name] || 0) + 1; });

  // Chaque emplacement porte l'icône que le jeu lui donne, à la place de son
  // nom : l'écran d'équipement se lit ainsi d'un coup d'œil, sans libellé.
  const equipLignes = SLOTS.map((slot) => {
    const item = build.equipment?.[slot] ? eq[build.equipment[slot]] : null;
    const nom = t(`buildCard.slots.${slot}`);
    const icone = `<img class="icon-d12 bcard-equip-icon" src="${L.asset(`assets/equipment-icons/equip-${slot}.png`)}" alt="${esc(nom)}" title="${esc(nom)}"${sizeOf(`equipment-icons/equip-${slot}.png`)} loading="lazy">`;
    return slotLine(icone, item?.name || '', '', null, true, live ? ` data-bc="equip" data-slot="${slot}"` : '');
  }).join('\n');

  const accLignes = Array.from({ length: ACCESSORY_SLOTS }, (_, i) => {
    const item = build.accessories?.[i] ? acc[build.accessories[i]] : null;
    const precision = item && homonymes[item.name] > 1 && item.requirements
      ? `<span class="bcard-note">${esc(item.requirements)}</span>`
      : '';
    const ic = accessoryIcons(t, L, item);
    return slotLine(String(i + 1), item?.name || '', precision, ic, false, live ? ` data-bc="acc" data-i="${i}"` : '');
  }).join('\n');

  // Bandeau latéral : le portrait quitte l'en-tête pour le fond de la carte.
  // Les portraits de l'écran de sélection se font face — Cosmos regarde vers la
  // gauche, Chaos vers la droite. Un portrait qui regarde vers l'extérieur de la
  // carte la fuit : on l'ancre donc du côté auquel il tourne le dos, et le fondu
  // part dans l'autre sens.
  const aside = variant && hasPortrait(char.slug)
    ? `<div class="bcard-aside"><img src="${L.asset(`assets/portraits/${char.slug}.png`)}" alt="${esc(t('buildCard.portraitAlt', { name: char.name }))}" width="512" height="512" loading="lazy"></div>`
    : '';
  const regard = char.portraitFacing === 'left' ? ' bcard-faces-left' : '';

  // Radios d'onglets, en tête de carte. La feuille de style les relie à leurs
  // panneaux par `:has()` sur la carte : un sélecteur de position aurait lié les
  // deux groupes entre eux, leur nombre variant d'un personnage à l'autre.
  const radios = [
    `<input class="bcard-panel-radio" type="radio" name="${esc(grpId)}-p" id="${esc(grpId)}-p1" value="gear" checked>`,
    `<input class="bcard-panel-radio" type="radio" name="${esc(grpId)}-p" id="${esc(grpId)}-p2" value="abilities">`,
    live ? `<input class="bcard-panel-radio" type="radio" name="${esc(grpId)}-p" id="${esc(grpId)}-p3" value="stats">` : '',
    ...styles.map((s, i) => (
      `<input class="bcard-style-radio" type="radio" name="${esc(grpId)}" id="${esc(grpId)}-${i + 1}" value="${i + 1}"${i === 0 ? ' checked' : ''}>`
    )),
  ].join('\n');

  // Languettes de panneau, attachées au bord supérieur de la carte.
  // La languette « Stats » n'existe qu'en mode vivant : les statistiques
  // détaillées se lisent dans les chaînes d'effets à l'affichage, et c'est le
  // créateur qui sait le faire. Une page statique n'a rien à y mettre.
  const languettes = `<p class="bcard-flaps" role="group" aria-label="${esc(t('buildCard.panelTabs'))}">
<label class="bcard-flap" data-panel="gear" for="${esc(grpId)}-p1">${esc(t('buildCard.panelGear'))}</label>
<label class="bcard-flap" data-panel="abilities" for="${esc(grpId)}-p2">${esc(t('buildCard.panelAbilities'))}</label>
${live ? `<label class="bcard-flap" data-panel="stats" for="${esc(grpId)}-p3">${esc(t('buildCard.panelStats'))}</label>` : ''}
</p>`;

  const onglets = styles.length
    ? `<p class="bcard-tabs" role="group" aria-label="${esc(t('buildCard.styleTabs'))}">${styles.map((s, i) => (
      `<label class="bcard-tab" data-si="${i + 1}" for="${esc(grpId)}-${i + 1}">${esc(s)}</label>`
    )).join('')}</p>`
    : '';

  return `<article class="bcard${aside ? ` bcard-has-aside bcard-${variant}${regard}` : ''}${styles.length ? ' bcard-has-styles' : ''}">
${radios}
${languettes}
${aside}
<header class="bcard-head">
${(() => {
  const renforts = `<p class="bcard-banner bcard-banner-assist">${live ? '<button type="button" class="bcard-hit" data-bc="assist">' : ''}${assist ? portrait(assist.slug, t('buildCard.assistAlt', { name: assist.name })) : '<span class="bcard-portrait-none" aria-hidden="true"></span>'}<span class="bcard-role">${esc(t('buildCard.assist'))}</span>${live ? '</button>' : ''}</p>
<p class="bcard-summon">${live ? '<button type="button" class="bcard-hit" data-bc="summon">' : ''}<img class="icon-d12 bcard-summon-orb" src="${L.asset('assets/summon-icons/summon-orb.png')}" alt="${esc(t('buildCard.summon'))}" title="${esc(t('buildCard.summon'))}"${sizeOf('summon-icons/summon-orb.png')} loading="lazy"><span class="bcard-value">${summon ? esc(summon.name) : ''}</span>${live ? '</button>' : ''}</p>`;
  // Les deux renforts se rangent sous le nom du personnage quand le portrait
  // couvre la carte, sous le nom du build sinon : à gauche le fond laisse la
  // place, à droite il l'occuperait.
  const aGauche = variant === 'portrait-full';
  return `<div class="bcard-ids">
<p class="bcard-banner">${aside ? '' : portrait(char.slug, t('buildCard.portraitAlt', { name: char.name }))}<span class="bcard-name">${esc(char.name)}</span></p>
${aGauche ? renforts : ''}
</div>
<div class="bcard-side">
<p class="bcard-title">${build.name ? esc(build.name) : `<span class="bcard-untitled">${esc(t('buildCard.untitled'))}</span>`}</p>
${aGauche ? '' : renforts}
</div>`;
})()}
${onglets}
</header>

<div class="bcard-panels">
<div class="bcard-body">
<div class="bcard-col">
<section class="bcard-block">
<h3 class="bcard-h">${esc(t('buildCard.equipment'))}</h3>
<ul class="bcard-list">${equipLignes}</ul>
</section>
<section class="bcard-block">
<h3 class="bcard-h">${esc(t('buildCard.accessories'))}</h3>
<ul class="bcard-list bcard-list-acc">${accLignes}</ul>
</section>
</div>
<div class="bcard-col">
${attackGrid(t, L, sizeOf, build, char, styles, live)}
</div>
</div>

<div class="bcard-body bcard-abilities">
${abilitiesPanel(t, build, data, live)}
</div>
${live ? `<div class="bcard-body bcard-stats">
<section class="bcard-block"><h3 class="bcard-h">${esc(t('buildCard.panelStats'))}</h3><div id="bc-detail-main"></div></section>
<section class="bcard-block"><h3 class="bcard-h">${esc(t('buildCard.panelBoosters'))}</h3><div id="bc-detail-boosters"></div></section>
</div>` : ''}
</div>

${(() => {
  // Le pied porte la capacité : c'est la contrainte qui structure un build, et
  // elle manquait à la carte. Le crédit qu'il portait avant fait double emploi
  // avec le pied de page du site.
  const cp = capacityOf(build, data, mastered);
  const part = cp.max ? Math.min(100, Math.round((cp.used / cp.max) * 100)) : 0;
  const trop = cp.used > cp.max;
  const titre = cp.unknown.length ? ` title="${esc(t('buildCard.cpUnknown', { list: cp.unknown.join(', ') }))}"` : '';
  return `<footer class="bcard-foot${trop ? ' is-over' : ''}"${titre}>
<span class="bcard-cp-label">${esc(t('buildCard.capacity'))}</span>
<span class="bcard-gauge" role="img" aria-label="${esc(t('buildCard.cpGauge', { used: cp.used, max: cp.max }))}"><span class="bcard-gauge-fill" style="width:${part}%"></span></span>
<span class="bcard-cp-value">${cp.used} / ${cp.max} CP${cp.unknown.length ? ' <abbr class="bcard-cp-min">≥</abbr>' : ''}</span>
</footer>`;
})()}
</article>`;
}

  globalThis.BuildCardView = { hydrate, accessoryIcons, stylesOf, buildCard };
})();
