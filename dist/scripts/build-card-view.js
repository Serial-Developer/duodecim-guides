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

// « Au choix » : une entrée laissée à la main du joueur. Ce n'est pas un vide —
// un emplacement vide dit « rien ici », celui-ci dit « ce que vous voulez ». Les
// builds publiés en sont pleins : le wiki propose une pièce « ou celle de votre
// choix », et laisse des sections entières non précisées. La valeur vaut pour
// n'importe quelle entrée de la carte, d'où un seul jeton pour toutes.
const ANY = 'any';
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

// --- Marqueur d'Equip Glitch -------------------------------------------------
// Une pièce dont la catégorie n'est pas native se porte quand même, au prix
// d'une manipulation — l'Equip Glitch. La carte le signale sur la ligne de la
// pièce, comme le jeu pose le rang derrière un accessoire.
//
// Elle ne le calcule pas : l'état d'un équipement dépend des catégories natives
// du personnage, et le seul endroit qui les lit est `equipStatus`, dans le
// créateur. Il descend jusqu'ici emplacement par emplacement. Un deuxième calcul
// du même état, c'est précisément ce que ce fichier existe pour empêcher.
//
// La roue dentée est tracée, comme le chevron des commandes : le jeu n'a pas
// d'icône pour une manipulation qui lui échappe, et le caractère « ⚙ » passe en
// emoji couleur sur plusieurs systèmes — sur une carte de taille figée, une
// image dont la hauteur dépend du poste ne va pas.
//
// Huit dents autour d'un moyeu évidé. Elle se lit à 13 px : des dents plus fines
// ou un moyeu plus petit donnaient un astérisque, pas une roue. Les dents
// s'arrêtent à 7,8 — leur épaisseur de 2,4 les mène pile au bord du cadre, et
// une dent plus longue serait rognée à plat aux quatre points cardinaux.
const GEAR = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r) => `${(9 + Math.cos(a) * r).toFixed(2)} ${(9 + Math.sin(a) * r).toFixed(2)}`;
  return `M${p(5.6)}L${p(7.8)}`;
}).join('');

function glitchFlag(t) {
  const label = t('buildCard.needsGlitch');
  return `<span class="bcard-flag" role="img" aria-label="${esc(label)}" title="${esc(label)}"><svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="4.6" fill="none" stroke="currentColor" stroke-width="3"/><path d="${GEAR}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>`;
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

// Un identifiant d'attaque porte espaces, parenthèses et « & » : il ne peut pas
// servir tel quel d'attribut `id`.
const idSafe = (s) => String(s).replace(/[^\w-]+/g, '-');

// Repli des prolongements : une case à cocher dans la ligne du parent, et les
// lignes qui la suivent se cachent avec elle. Pas de script — la carte se lit
// aussi sur une page statique, où le même pliage doit marcher. C'est la méthode
// de ses languettes, appliquée plus bas.
function foldToggle(t, id) {
  return `<input class="bcard-fold" type="checkbox" id="${esc(id)}" aria-label="${esc(t('buildCard.foldBranches'))}">
<label class="bcard-fold-tab" for="${esc(id)}" title="${esc(t('buildCard.foldBranches'))}"><svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M4 7 L9 12 L14 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></label>`;
}

function attackLine(t, L, sizeOf, kind, cmd, move, stance, branches = [], hook = '', hookBranche = () => '', foldId = '') {
  // Un prolongement se lit sous l'attaque qu'il prolonge, sans commande : il
  // n'occupe pas d'emplacement, c'est le coup parent qui le déclenche. Son
  // bouton dit lequel : le rond pour un enchaînement de bravery, le carré pour
  // une attaque HP branchée — la touche qu'on presse dans le jeu.
  //
  // Une place vide en est une aussi : sur la carte vivante, une bravery qui
  // accepte un prolongement montre la ligne où il irait, comme un emplacement
  // libre montre le sien. Sans elle, retirer un prolongement le rendrait
  // impossible à reposer.
  const sous = branches.map((b, i) => {
    const dedans = `<span class="bcard-key">${buttonIcon(t, L, sizeOf, b.kind)}</span>
<span class="bcard-value">${b.move ? esc(b.move.name) : ''}</span>`;
    const h = hookBranche(b, i);
    return `<li class="bcard-line bcard-branch${b.move ? '' : ' is-empty'}${h ? ' is-live' : ''}">${
      h ? `<button type="button" class="bcard-hit"${h}>${dedans}</button>` : dedans
    }</li>`;
  }).join('\n');
  const dedans = `${keyIcon(t, L, sizeOf, kind, cmd, stance)}
<span class="bcard-value">${move ? esc(move.name) : ''}</span>`;
  // La poignée de repli ne s'affiche que s'il y a quelque chose à replier, et
  // elle se range au bout de la ligne : posée devant, elle décalait les icônes
  // de commande des seules attaques qui portent un prolongement, et la colonne
  // ne s'alignait plus.
  const plier = foldId && branches.length ? foldToggle(t, foldId) : '';
  return `<li class="bcard-line${move ? '' : ' is-empty'}${hook ? ' is-live' : ''}${plier ? ' has-fold' : ''}">${
    hook ? `<button type="button" class="bcard-hit"${hook}>${dedans}</button>` : dedans
  }${plier}</li>
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

// Un prolongement — HP link ou enchaînement de bravery — se range juste après
// l'attaque qu'il prolonge : c'est la seule forme que le build lui donne. Il
// n'occupe pas d'emplacement. Sans cette lecture, le Somersault de Tifa
// mangeait une des trois commandes d'attaque HP au sol et le quatrième coup
// disparaissait.
//
// Il se rattache au dernier **emplacement** rencontré, et non à l'entrée qui le
// précède : une attaque en porte deux à la fois — le Multi-Hit d'Onion Knight
// ouvre sur Extra Slice au rond et sur Swordshower au carré, et le jeu les
// affiche tous deux sous lui. En visant l'entrée précédente, la carte perdait
// le second : il passait pour une attaque et mangeait une commande. C'est mot
// pour mot la lecture de `scanBuild`, côté créateur — une place par sorte.
function branchesOf(build, index, char) {
  const liens = {};
  const parentDe = {};
  for (const l of char?.links || []) {
    (liens[l.from] = liens[l.from] || new Set()).add(l.to);
    parentDe[l.to] = l.from;
  }
  // Enchaînement de bravery à partenaire imposé : les quatre d'Onion Knight. Il
  // se lit au rond comme les autres enchaînements, mais n'accepte que son
  // origine et ne s'équipe pas seul.
  const chaines = {};
  const chaineDe = {};
  for (const c of char?.chains || []) {
    (chaines[c.from] = chaines[c.from] || new Set()).add(c.to);
    chaineDe[c.to] = c.from;
  }
  const starters = new Set(char?.followStarters || []);
  const attaches = {};
  const pris = {};
  let dernier = -1;
  (build.attacks || []).forEach((id, i) => {
    const info = index[id];
    if (!info) return;
    // Un prolongement ne s'équipe jamais seul : ou il prolonge, ou il ne tient
    // pas dans le build.
    if (!info.followUp && !parentDe[id] && !chaineDe[id]) { dernier = i; return; }
    const parent = dernier >= 0 ? index[(build.attacks || [])[dernier]] : null;
    const champ = parentDe[id] ? 'link' : 'follow';
    const recevable = parent && !(pris[dernier] || {})[champ] && (chaineDe[id]
      ? chaineDe[id] === parent.move.id
      : (info.followUp ? starters.has(parent.move.id) : liens[parent.move.id]?.has(id)));
    if (!recevable) return;
    attaches[i] = dernier;
    (pris[dernier] = pris[dernier] || {})[champ] = true;
  });
  return { attaches, liens, parentDe, chaines, chaineDe, starters };
}

function attackGrid(t, L, sizeOf, build, char, styles, live, grpId, H = 'h3') {
  const index = attackIndex(char);
  const { attaches, liens: liensDe, parentDe, chaines, chaineDe, starters } = branchesOf(build, index, char);
  // catégorie -> commande -> { coup, prolongements }
  const parCat = {};
  const parPos = {};
  const enAttente = {};
  (build.attacks || []).forEach((id, i) => {
    const info = index[id];
    // Un prolongement n'a pas d'emplacement, qu'il en trouve un à prolonger ou
    // non : la carte montre les commandes, il n'y a pas sa place.
    if (!info || info.followUp || parentDe[id] || chaineDe[id]) return;
    const cat = `${info.kind}|${info.groupKey}|${info.style}`;
    (enAttente[cat] = enAttente[cat] || []).push({ i, info, cmd: Number((build.attackSlots || [])[i]) });
  });
  // Les demandes explicites d'abord, les autres ensuite dans l'ordre de la
  // liste : c'est mot pour mot la règle de `scanBuild`, côté créateur. Placer
  // en une seule passe donnait un autre résultat dès qu'une commande non
  // exprimée précédait une commande demandée — la carte montrait alors une
  // grille que le créateur ne lisait pas comme elle, et le déplacement d'une
  // attaque, qui s'appuie sur cette correspondance, aurait visé à côté.
  Object.keys(enAttente).forEach((cat) => {
    const cases = (parCat[cat] = parCat[cat] || {});
    const poser = (e, place) => { cases[place] = { move: e.info.move, branches: [] }; parPos[e.i] = cases[place]; };
    enAttente[cat].forEach((e) => { if (e.cmd >= 0 && e.cmd < MAX_SLOTS && !cases[e.cmd]) poser(e, e.cmd); });
    enAttente[cat].forEach((e) => {
      if (parPos[e.i]) return;
      const libre = [0, 1, 2].find((c) => !cases[c]);
      if (libre !== undefined) poser(e, libre);
    });
  });
  // Deuxième passe : les prolongements rejoignent leur parent une fois posé.
  Object.entries(attaches).forEach(([i, p]) => {
    const info = index[(build.attacks || [])[i]];
    if (info && parPos[p]) parPos[p].branches.push(info);
  });

  // Ce qu'une attaque peut recevoir : une attaque HP branchée si la source lui
  // en associe une, un enchaînement si elle en désigne un ou si elle figure
  // parmi les braveries de départ. Les deux à la fois arrivent, et se posent
  // ensemble — c'est ce que montre l'écran du jeu sous Multi-Hit.
  //
  // La réserve d'enchaînements, elle, est commune à tout le personnage : elle
  // n'occupe pas d'emplacement, et n'importe laquelle prolonge n'importe quelle
  // bravery de départ.
  const reserve = {};
  for (const kind of ['bravery', 'hp']) {
    for (const g of char?.attacks?.[kind] || []) if (g.followUp && hydrate(g.moves).length) reserve[kind] = kind;
  }

  // Les lignes de prolongement d'un emplacement : celles qui portent un coup,
  // puis, sur la carte vivante, celles qui restent à pourvoir.
  function branchLines(place, kind) {
    const rows = (place?.branches || []).map((info) => ({
      kind: info.kind, move: info.move, champ: (chaineDe[info.move.id] || info.followUp) ? 'follow' : 'link',
    }));
    if (!live || !place) return rows;
    const aLien = rows.some((r) => r.champ === 'link');
    const aSuite = rows.some((r) => r.champ === 'follow');
    if (!aLien && liensDe[place.move.id]?.size) rows.push({ kind: 'hp', move: null, champ: 'link' });
    // Un enchaînement à partenaire imposé ouvre la même ligne qu'un
    // enchaînement à réserve commune : c'est le même bouton, seule la liste
    // proposée change.
    const peutSuivre = chaines[place.move.id]?.size
      || (starters.has(place.move.id) && reserve[kind]);
    if (!aSuite && peutSuivre) rows.push({ kind: 'bravery', move: null, champ: 'follow' });
    return rows;
  }

  // Section laissée au choix du joueur : les emplacements libres le disent, au
  // lieu de passer pour des places que le build aurait laissées vides.
  const auChoix = (build.attacks || []).indexOf(ANY) !== -1 ? { name: t('buildCard.any') } : null;

  return categories(char).map((c) => {
    const cases = parCat[c.cat] || {};
    // Un coup « main » vaut au sol comme en l'air : sa direction est celle du
    // sol, la seule que la source décrive.
    const stance = STANCE[c.groupKey] || 'ground';
    const lignes = [0, 1, 2].map((i) => attackLine(
      t, L, sizeOf, c.kind, i, cases[i]?.move || auChoix, stance, branchLines(cases[i], c.kind),
      live ? ` data-bc="attack" data-cat="${esc(c.cat)}" data-cmd="${i}"` : '',
      // Le prolongement se désigne par l'emplacement qui le porte et par sa
      // sorte, jamais par le coup posé : deux exemplaires du même coup seraient
      // indiscernables, et une place vide n'en a pas.
      live ? (b) => ` data-bc="branch" data-cat="${esc(c.cat)}" data-cmd="${i}" data-champ="${b.champ}"` : () => '',
      `${grpId}-f-${idSafe(c.cat)}-${i}`,
    )).join('\n');
    // Un bloc rattaché à un style ne s'affiche qu'avec son onglet. Un bloc sans
    // style — les attaques HP de Cecil, communes aux deux jobs — reste visible.
    const rang = styles.indexOf(c.style);
    const marque = rang >= 0 ? ` data-si="${rang + 1}"` : '';
    return `<section class="bcard-block"${marque}>
<${H} class="bcard-h">${esc(blockTitle(t, c, styles.length > 0))}</${H}>
<ul class="bcard-list">${lignes}</ul>
</section>`;
  }).join('\n');
}

// --- Abilities ---------------------------------------------------------------
// Trois familles, telles que le payload les livre : basic, support, extra. Elles
// n'ont pas d'emplacements — seule la capacité en points les borne —, la carte
// liste donc ce qui est équipé, sans ligne vide de réserve. Une famille sans
// rien garde sa ligne estompée : lire un build en creux vaut ici aussi.
function abilitiesPanel(t, build, data, live, H = 'h3') {
  const equipees = new Set(build.abilities || []);
  // Une section laissée au choix du joueur porte le jeton une seule fois : les
  // trois familles l'affichent alors, faute de savoir laquelle il visait.
  const auChoix = equipees.has(ANY);
  return (data.abilities || []).map((g) => {
    const liste = (g.abilities || []).filter((a) => equipees.has(a.id));
    const lignes = liste.length
      ? liste.map((a) => `<li class="bcard-line"><span class="bcard-value">${esc(a.name)}</span></li>`).join('\n')
      : `<li class="bcard-line${auChoix ? '' : ' is-empty'}"><span class="bcard-value">${auChoix ? esc(t('buildCard.any')) : ''}</span></li>`;
    const titre = aCle(t, `buildCard.abilityGroups.${g.key}`) ? t(`buildCard.abilityGroups.${g.key}`) : g.label;
    return `<section class="bcard-block">
<${H} class="bcard-h">${esc(titre)}</${H}>
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
  let attaques = 0;
  for (const id of build.attacks || []) {
    const m = index[id]?.move;
    if (m && m.cp == null) inconnus.push(m.name);
    attaques += cout(m);
  }
  let abilities = 0;
  const parId = {};
  for (const g of data.abilities || []) for (const a of g.abilities || []) parId[a.id] = a;
  for (const id of build.abilities || []) {
    const a = parId[id];
    if (a && a.cp == null) inconnus.push(a.name);
    abilities += cout(a);
  }
  let bonus = 0;
  for (const ext of data.capacity?.extenders || []) {
    const n = (build.accessories || []).filter((u) => u === ext.uid).length;
    bonus += Math.min(n, ext.maxEquipped) * ext.cp;
  }
  return { attaques, abilities, used: attaques + abilities, max: (data.capacity?.base || 0) + bonus, unknown: inconnus };
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
// `glitch` marque les emplacements d'équipement qui exigent l'Equip Glitch, par
// clé d'emplacement : le créateur le calcule, la carte le montre.
// `compact` resserre la carte pour un écran étroit : la double colonne de
// l'équipement et des attaques n'y tient pas, chacune prend donc sa languette,
// les onglets de style descendent dans celle des attaques, et une quatrième
// accueille les statistiques que le créateur affiche à côté de la carte au
// large. Le portrait, lui, revient dans l'en-tête — c'est l'affaire de
// `variant`, que l'appelant laisse vide.
// `hLevel` : le rang des titres de panneau dans le plan de la page hôte. La
// carte les écrit en h3 chez elle — sous le titre de niveau 2 du créateur —,
// mais dans une fiche de personnage chaque build porte déjà un h3 : ses
// panneaux passent alors en h4, pour ne pas se lire comme des frères du titre
// qu'ils détaillent. Seule la balise change ; la classe `bcard-h`, qui porte
// toute la mise en forme, ne bouge pas.
function buildCard({ t, build, data, L, hasPortrait, sizeOf = () => '', variant = '', uid = '', mastered = true, live = false, glitch = {}, compact = false, hLevel = 3 }) {
  const H = `h${Math.min(Math.max(Number(hLevel) || 3, 2), 6)}`;
  // Niveau du personnage : il décide de ce qui peut s'équiper — une pièce se
  // porte à partir du niveau qu'elle exige, jamais avant. Il se règle sur la
  // carte, au bout de l'en-tête de l'équipement, là où il commande. Sur une
  // carte figée il ne s'affiche que s'il n'est pas 100 : c'est la valeur par
  // défaut, et un build de tournoi ne parle pas d'autre chose.
  const niveau = Math.min(Math.max(Number(build.level) || 100, 1), 100);
  const niveauChamp = live
    ? `<span class="bcard-lvl"><label for="bcl-${esc(uid || 'x')}">${esc(t('buildCard.levelShort'))}</label><input id="bcl-${esc(uid || 'x')}" type="number" min="1" max="100" step="1" value="${niveau}" data-bc="level" title="${esc(t('buildCard.level'))}" inputmode="numeric"></span>`
    : (niveau !== 100 ? `<span class="bcard-lvl">${esc(t('buildCard.levelValue', { level: niveau }))}</span>` : '');
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
  const assistAuChoix = build.assist === ANY;
  const summonAuChoix = build.summon === ANY;

  const portrait = (slug, alt, miroir = '') => (hasPortrait(slug)
    ? `<img class="${miroir}" src="${L.asset(`assets/portraits/${slug}.png`)}" alt="${esc(alt)}" width="56" height="56" loading="lazy">`
    : '<span class="bcard-portrait-none" aria-hidden="true"></span>');

  // Deux accessoires peuvent porter le même nom — « Summon Unused » existe pour
  // sa propre invocation et pour celle de l'adversaire. Sans leur condition, la
  // carte semblerait répéter la même ligne par erreur.
  const homonymes = {};
  (build.accessories || []).forEach((u) => { if (u && acc[u]) homonymes[acc[u].name] = (homonymes[acc[u].name] || 0) + 1; });

  // Chaque emplacement porte l'icône que le jeu lui donne, à la place de son
  // nom : l'écran d'équipement se lit ainsi d'un coup d'œil, sans libellé.
  const auChoix = t('buildCard.any');
  // Une entrée porte soit un identifiant, soit le jeton « au choix » : le nom
  // affiché vient de l'un ou de l'autre, et l'emplacement n'est vide que si elle
  // ne porte ni l'un ni l'autre.
  const valeurDe = (brut, item) => (item ? item.name : (brut === ANY ? auChoix : ''));

  const equipLignes = SLOTS.map((slot) => {
    const pose = build.equipment?.[slot];
    const item = pose && pose !== ANY ? eq[pose] : null;
    const nom = t(`buildCard.slots.${slot}`);
    const icone = `<img class="icon-d12 bcard-equip-icon" src="${L.asset(`assets/equipment-icons/equip-${slot}.png`)}" alt="${esc(nom)}" title="${esc(nom)}"${sizeOf(`equipment-icons/equip-${slot}.png`)} loading="lazy">`;
    // Un emplacement vide ne peut rien exiger : la marque suit la pièce.
    const marque = item && glitch[slot] ? glitchFlag(t) : '';
    return slotLine(icone, valeurDe(pose, item), marque, null, true, live ? ` data-bc="equip" data-slot="${slot}"` : '');
  }).join('\n');

  const accLignes = Array.from({ length: ACCESSORY_SLOTS }, (_, i) => {
    const pose = build.accessories?.[i];
    const item = pose && pose !== ANY ? acc[pose] : null;
    const precision = item && homonymes[item.name] > 1 && item.requirements
      ? `<span class="bcard-note">${esc(item.requirements)}</span>`
      : '';
    const ic = accessoryIcons(t, L, item);
    return slotLine(String(i + 1), valeurDe(pose, item), precision, ic, false, live ? ` data-bc="acc" data-i="${i}"` : '');
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
  const panneaux = compact
    ? [
      { key: 'stuff', label: t('buildCard.panelGear') },
      { key: 'attacks', label: t('buildCard.panelAttacks') },
      { key: 'abilities', label: t('buildCard.panelAbilities') },
      { key: 'stats', label: t('buildCard.panelStats') },
    ]
    : [
      { key: 'gear', label: t('buildCard.panelGear') },
      { key: 'abilities', label: t('buildCard.panelAbilities') },
    ];
  const radios = [
    ...panneaux.map((p, i) => (
      `<input class="bcard-panel-radio" type="radio" name="${esc(grpId)}-p" id="${esc(grpId)}-p${i + 1}" value="${p.key}"${i === 0 ? ' checked' : ''}>`
    )),
    ...styles.map((s, i) => (
      `<input class="bcard-style-radio" type="radio" name="${esc(grpId)}" id="${esc(grpId)}-${i + 1}" value="${i + 1}"${i === 0 ? ' checked' : ''}>`
    )),
  ].join('\n');

  // Languettes de panneau, attachées au bord supérieur de la carte.
  // La languette « Stats » n'existe qu'en mode vivant : les statistiques
  // détaillées se lisent dans les chaînes d'effets à l'affichage, et c'est le
  // créateur qui sait le faire. Une page statique n'a rien à y mettre.
  const languettes = `<p class="bcard-flaps" role="group" aria-label="${esc(t('buildCard.panelTabs'))}">
${panneaux.map((p, i) => `<label class="bcard-flap" data-panel="${p.key}" for="${esc(grpId)}-p${i + 1}">${esc(p.label)}</label>`).join('\n')}
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
  // Sur l'écran de sélection les deux camps se font face : les héros regardent
  // vers la gauche, les autres vers la droite. En vignette d'assist, seule au
  // coin de la carte, cette moitié-là tourne le dos à tout le reste — on la
  // retourne pour que tous les renforts regardent du même côté. Le sens est
  // porté par l'assist lui-même, jamais déduit d'un camp : quatre personnages
  // changent de camp d'un épisode à l'autre, et Aerith n'est renfort que.
  const miroir = assist?.portraitFacing === 'left' ? ' is-mirrored' : '';
  const renforts = `<p class="bcard-banner bcard-banner-assist">${live ? '<button type="button" class="bcard-hit" data-bc="assist">' : ''}${assist ? `<span class="bcard-face${miroir}" data-assist="${esc(assist.slug)}">${portrait(assist.slug, t('buildCard.assistAlt', { name: assist.name }))}</span>` : (assistAuChoix
    // Le renfort laissé au choix porte la plaque au point d'interrogation, celle
    // que le jeu montre à un emplacement non déterminé.
    ? `<span class="bcard-face is-any"><img src="${L.asset('assets/portraits/any.png')}" alt="${esc(t('buildCard.any'))}" title="${esc(t('buildCard.any'))}" width="56" height="56" loading="lazy"></span>`
    : '<span class="bcard-portrait-none" aria-hidden="true"></span>')}<span class="bcard-role">${esc(t('buildCard.assist'))}</span>${live ? '</button>' : ''}</p>
<p class="bcard-summon">${live ? '<button type="button" class="bcard-hit" data-bc="summon">' : ''}<img class="icon-d12 bcard-summon-orb" src="${L.asset('assets/summon-icons/summon-orb.png')}" alt="${esc(t('buildCard.summon'))}" title="${esc(t('buildCard.summon'))}"${sizeOf('summon-icons/summon-orb.png')} loading="lazy"><span class="bcard-value">${summon ? esc(summon.name) : (summonAuChoix ? esc(t('buildCard.any')) : '')}</span>${live ? '</button>' : ''}</p>`;
  // Les deux renforts se rangent sous le nom du personnage quand le portrait
  // couvre la carte, sous le nom du build sinon : à gauche le fond laisse la
  // place, à droite il l'occuperait.
  const aGauche = variant === 'portrait-full';
  const titre = `<p class="bcard-title">${build.name ? esc(build.name) : `<span class="bcard-untitled">${esc(t('buildCard.untitled'))}</span>`}</p>`;
  // À l'étroit, le nom du build rejoint celui du personnage : les deux se lisent
  // à côté du portrait, l'un sous l'autre. Séparés, ils s'empilaient sur deux
  // lignes de même poids sans qu'on sache laquelle nomme quoi.
  return `<div class="bcard-ids">
<p class="bcard-banner">${aside ? '' : portrait(char.slug, t('buildCard.portraitAlt', { name: char.name }), compact && char.portraitFacing === 'left' ? 'is-mirrored' : '')}<span class="bcard-name">${esc(char.name)}</span></p>
${compact ? titre : ''}
${aGauche ? renforts : ''}
</div>
<div class="bcard-side">
${compact ? '' : titre}
${aGauche ? '' : renforts}
</div>`;
})()}
${compact ? '' : onglets}
</header>

<div class="bcard-panels">
${(() => {
  const colonneStuff = `<div class="bcard-col">
<section class="bcard-block">
<${H} class="bcard-h">${esc(t('buildCard.equipment'))}${niveauChamp}</${H}>
<ul class="bcard-list">${equipLignes}</ul>
</section>
<section class="bcard-block">
<${H} class="bcard-h">${esc(t('buildCard.accessories'))}</${H}>
<ul class="bcard-list bcard-list-acc">${accLignes}</ul>
</section>
</div>`;
  const colonneAttaques = `<div class="bcard-col">
${attackGrid(t, L, sizeOf, build, char, styles, live, grpId, H)}
</div>`;
  const abilities = `<div class="bcard-body bcard-abilities">
${abilitiesPanel(t, build, data, live, H)}
</div>`;
  // À l'étroit, les onglets de style suivent les attaques dans leur languette :
  // ils ne commandent qu'elles, et l'en-tête n'a pas la place.
  if (!compact) return `<div class="bcard-body bcard-gear">${colonneStuff}${colonneAttaques}</div>
${abilities}`;
  return `<div class="bcard-body bcard-stuff">${colonneStuff}</div>
<div class="bcard-body bcard-attacks">${onglets}${colonneAttaques}</div>
${abilities}
<div class="bcard-body bcard-stats"></div>`;
})()}
</div>

${live ? '' : (() => {
  // Le pied porte la capacité : c'est la contrainte qui structure un build, et
  // elle manquait à la carte. Le crédit qu'il portait avant fait double emploi
  // avec le pied de page du site.
  //
  // Le créateur, lui, a déjà sa jauge de CP à côté de la carte, et elle en dit
  // plus — la part des attaques et celle des abilities. Deux lectures du même
  // nombre à quelques centimètres l'une de l'autre, c'en est une de trop : le
  // pied ne sert que là où rien d'autre ne porte la capacité.
  const cp = capacityOf(build, data, mastered);
  const pour = (n) => (cp.max ? Math.min(100, Math.round((n / cp.max) * 100)) : 0);
  const trop = cp.used > cp.max;
  const titre = cp.unknown.length ? ` title="${esc(t('buildCard.cpUnknown', { list: cp.unknown.join(', ') }))}"` : '';
  return `<footer class="bcard-foot${trop ? ' is-over' : ''}"${titre}>
<span class="bcard-cp-label">${esc(t('buildCard.capacity'))}</span>
<span class="bcard-gauge" role="img" aria-label="${esc(t('buildCard.cpGauge', { used: cp.used, max: cp.max }))}"><span class="bcard-gauge-fill bc-gauge-attacks" style="width:${pour(cp.attaques)}%"></span><span class="bcard-gauge-fill bc-gauge-abilities" style="width:${pour(cp.abilities)}%"></span></span>
<span class="bcard-cp-value">${cp.used} / ${cp.max} CP${cp.unknown.length ? ' <abbr class="bcard-cp-min">≥</abbr>' : ''}</span>
</footer>`;
})()}
</article>`;
}

  globalThis.BuildCardView = { hydrate, accessoryIcons, stylesOf, buildCard };
})();
