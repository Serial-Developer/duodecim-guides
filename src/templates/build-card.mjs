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
const DIRECTIONS = ['neutral', 'back', 'forward'];
const DPAD_ICON = { back: 'dpad-left.png', forward: 'dpad-right.png' };

// Le libellé accessible dit la commande en toutes lettres — « Gauche + Cercle » —
// là où le dessin ne montre que des formes.
function keyIcon(t, L, sizeOf, kind, cmd) {
  const dir = DIRECTIONS[cmd] || 'neutral';
  const label = t(`buildCard.keys.${dir}`, { button: t(`buildCard.keys.${kind}`) });
  const glyphe = (fichier, cls) => `<img class="icon-d12 ${cls}" src="${L.asset(`assets/buttons-icons/${fichier}`)}" alt="" aria-hidden="true"${sizeOf(`buttons-icons/${fichier}`)} loading="lazy">`;
  const dpad = DPAD_ICON[dir]
    ? glyphe(DPAD_ICON[dir], 'bcard-dpad') + '<span class="bcard-plus" aria-hidden="true">+</span>'
    : '';
  // Le libellé porte la commande en toutes lettres ; les images n'ont donc pas
  // à la répéter, d'où leur alt vide.
  return `<span class="bcard-key" role="img" aria-label="${esc(label)}">${dpad}${glyphe(BUTTON_ICON[kind], 'bcard-btn')}</span>`;
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

function attackLine(t, L, sizeOf, kind, cmd, move) {
  return `<li class="bcard-line${move ? '' : ' is-empty'}">
${keyIcon(t, L, sizeOf, kind, cmd)}
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
    ['bravery|ground', 'bravery', 'groundBravery'],
    ['bravery|aerial', 'bravery', 'airBravery'],
    ['hp|ground', 'hp', 'groundHp'],
    ['hp|aerial', 'hp', 'airHp'],
  ];
  return blocs.map(([cat, kind, cle]) => {
    const cases = parCat[cat] || {};
    const lignes = [0, 1, 2].map((c) => attackLine(t, L, sizeOf, kind, c, cases[c])).join('\n');
    return `<section class="bcard-block">
<h3 class="bcard-h">${esc(t(`buildCard.${cle}`))}</h3>
<ul class="bcard-list">${lignes}</ul>
</section>`;
  }).join('\n');
}

// --- Carte -------------------------------------------------------------------
export function buildCard({ t, build, data, L, hasPortrait, sizeOf = () => '' }) {
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

  return `<article class="bcard">
<header class="bcard-head">
<div class="bcard-ids">
<p class="bcard-banner">${portrait(char.slug, t('buildCard.portraitAlt', { name: char.name }))}<span class="bcard-name">${esc(char.name)}</span></p>
<p class="bcard-banner bcard-banner-assist">${assist ? portrait(assist.slug, t('buildCard.assistAlt', { name: assist.name })) : '<span class="bcard-portrait-none" aria-hidden="true"></span>'}<span class="bcard-role">${esc(t('buildCard.assist'))}</span></p>
<p class="bcard-summon"><img class="icon-d12 bcard-summon-orb" src="${L.asset('assets/summon-icons/summon-orb.png')}" alt="${esc(t('buildCard.summon'))}" title="${esc(t('buildCard.summon'))}"${sizeOf('summon-icons/summon-orb.png')} loading="lazy"><span class="bcard-value">${summon ? esc(summon.name) : ''}</span></p>
</div>
<p class="bcard-title">${build.name ? esc(build.name) : `<span class="bcard-untitled">${esc(t('buildCard.untitled'))}</span>`}</p>
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
