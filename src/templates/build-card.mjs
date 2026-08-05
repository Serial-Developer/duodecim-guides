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
import { esc } from './helpers.mjs';

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
export function accessoryIcons(t, L, item) {
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

// --- Lignes ------------------------------------------------------------------
function slotLine(label, valeur, extra = '', ic = null, labelBrut = false) {
  return `<li class="bcard-line${valeur ? '' : ' is-empty'}">
<span class="bcard-slot">${labelBrut ? label : esc(label)}</span>
<span class="bcard-value">${ic?.avant || ''}${valeur ? esc(valeur) : ''}${ic?.apres || ''}${extra}</span>
</li>`;
}

function attackLine(t, L, sizeOf, kind, cmd, move, stance) {
  return `<li class="bcard-line${move ? '' : ' is-empty'}">
${keyIcon(t, L, sizeOf, kind, cmd, stance)}
<span class="bcard-value">${move ? esc(move.name) : ''}</span>
</li>`;
}

// --- Attaques ----------------------------------------------------------------
// Chaque coup retenu est replacé sur sa commande, dans sa catégorie. Le nom d'un
// coup pouvant contenir « : » (« Magic Arts: Flame »), on résout par l'index des
// coups du personnage et jamais en découpant l'identifiant.
function attackIndex(char) {
  const byId = {};
  for (const kind of ['bravery', 'hp']) {
    for (const g of char?.attacks?.[kind] || []) {
      for (const m of hydrate(g.moves)) byId[m.id] = { move: m, kind, groupKey: g.key, followUp: !!g.followUp };
    }
  }
  return byId;
}

function attackGrid(t, L, sizeOf, build, char) {
  const index = attackIndex(char);
  // catégorie -> commande -> coup
  const parCat = {};
  (build.attacks || []).forEach((id, i) => {
    const info = index[id];
    // Un enchaînement prolonge un coup et n'occupe pas de commande : la carte
    // montre les emplacements, il n'y a donc pas sa place.
    if (!info || info.followUp) return;
    const cat = `${info.kind}|${info.groupKey}`;
    const cmd = Number((build.attackSlots || [])[i]);
    const cases = (parCat[cat] = parCat[cat] || {});
    const place = cmd >= 0 && cmd < MAX_SLOTS && !cases[cmd]
      ? cmd
      : [0, 1, 2].find((c) => !cases[c]);
    if (place !== undefined) cases[place] = info.move;
  });

  const blocs = [
    ['bravery|ground', 'bravery', 'groundBravery', 'ground'],
    ['bravery|aerial', 'bravery', 'airBravery', 'aerial'],
    ['hp|ground', 'hp', 'groundHp', 'ground'],
    ['hp|aerial', 'hp', 'airHp', 'aerial'],
  ];
  return blocs.map(([cat, kind, cle, stance]) => {
    const cases = parCat[cat] || {};
    const lignes = [0, 1, 2].map((c) => attackLine(t, L, sizeOf, kind, c, cases[c], stance)).join('\n');
    return `<section class="bcard-block">
<h3 class="bcard-h">${esc(t(`buildCard.${cle}`))}</h3>
<ul class="bcard-list">${lignes}</ul>
</section>`;
  }).join('\n');
}

// --- Carte -------------------------------------------------------------------
// `variant` ne change que la place du portrait du personnage : par défaut la
// vignette de l'en-tête ; `portrait-full` et `portrait-tall` la sortent en
// bandeau à gauche, sur toute la hauteur de la carte ou sur celle du seul
// en-tête. Le nom reste en haut dans les trois cas.
export function buildCard({ t, build, data, L, hasPortrait, sizeOf = () => '', variant = '' }) {
  const char = (data.characters || []).find((c) => c.slug === build.character);
  if (!char) return '';
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
    return slotLine(icone, item?.name || '', '', null, true);
  }).join('\n');

  const accLignes = Array.from({ length: ACCESSORY_SLOTS }, (_, i) => {
    const item = build.accessories?.[i] ? acc[build.accessories[i]] : null;
    const precision = item && homonymes[item.name] > 1 && item.requirements
      ? `<span class="bcard-note">${esc(item.requirements)}</span>`
      : '';
    const ic = accessoryIcons(t, L, item);
    return slotLine(String(i + 1), item?.name || '', precision, ic);
  }).join('\n');

  // Bandeau latéral : le portrait quitte l'en-tête pour la gauche de la carte.
  const aside = variant && hasPortrait(char.slug)
    ? `<div class="bcard-aside"><img src="${L.asset(`assets/portraits/${char.slug}.png`)}" alt="${esc(t('buildCard.portraitAlt', { name: char.name }))}" width="512" height="512" loading="lazy"></div>`
    : '';

  return `<article class="bcard${aside ? ` bcard-has-aside bcard-${variant}` : ''}">
${aside}
<header class="bcard-head">
<div class="bcard-ids">
<p class="bcard-banner">${aside ? '' : portrait(char.slug, t('buildCard.portraitAlt', { name: char.name }))}<span class="bcard-name">${esc(char.name)}</span></p>
<p class="bcard-title">${build.name ? esc(build.name) : `<span class="bcard-untitled">${esc(t('buildCard.untitled'))}</span>`}</p>
</div>
<div class="bcard-side">
<p class="bcard-banner bcard-banner-assist">${assist ? portrait(assist.slug, t('buildCard.assistAlt', { name: assist.name })) : '<span class="bcard-portrait-none" aria-hidden="true"></span>'}<span class="bcard-role">${esc(t('buildCard.assist'))}</span></p>
<p class="bcard-summon"><img class="icon-d12 bcard-summon-orb" src="${L.asset('assets/summon-icons/summon-orb.png')}" alt="${esc(t('buildCard.summon'))}" title="${esc(t('buildCard.summon'))}"${sizeOf('summon-icons/summon-orb.png')} loading="lazy"><span class="bcard-value">${summon ? esc(summon.name) : ''}</span></p>
</div>
</header>

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
${attackGrid(t, L, sizeOf, build, char)}
</div>
</div>

<footer class="bcard-foot">
<span class="bcard-credit">${esc(t('buildCard.credit'))}</span>
<span class="bcard-url">${esc(t('buildCard.creditUrl'))}</span>
</footer>
</article>`;
}
