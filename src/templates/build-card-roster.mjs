// Banc d'essai de la carte de build sur les 31 personnages, variante 1 — le
// portrait en fond de carte. Son unique objet : vérifier qu'aucun cadrage ne
// gêne la lecture. Comme la page d'essai voisine, elle est hors sitemap, hors
// navigation et en noindex.
//
// Un seul build réel existe (celui de la page d'essai, décodé depuis un lien
// de partage) : les autres cartes sont des MAQUETTES. Leur garniture est tirée
// du payload — coups du personnage, équipements, accessoires, assists et
// invocations du jeu — mais l'assemblage est arbitraire et n'a aucune valeur de
// conseil. Rien n'est inventé pour autant : aucun nom n'est saisi à la main,
// tout vient des données. Chaque carte le déclare.
import { esc, pageShell, siteHeader, siteFooter } from './helpers.mjs';
import { buildCard, hydrate } from './build-card.mjs';

const SLOTS = ['weapon', 'hand', 'head', 'body'];
const ACCESSORY_SLOTS = 10;
const MAX_SLOTS = 3;

// Garniture déterministe : la même entrée donne toujours la même carte, sinon
// `dist/` afficherait un faux diff à chaque build. Les pas sont premiers avec
// les longueurs de catalogue, ce qui garantit dix accessoires distincts.
const PAS_ACCESSOIRE = 53;

function maquette(char, rang, data) {
  const equipement = hydrate(data.equipment);
  const accessoires = hydrate(data.accessories);

  const equipment = {};
  for (const slot of SLOTS) {
    const choix = equipement.filter((e) => e.slot === slot && (!e.exclusiveTo || e.exclusiveTo === char.slug));
    equipment[slot] = choix.length ? choix[(rang * 7 + slot.length) % choix.length].uid : null;
  }

  const accessories = Array.from({ length: ACCESSORY_SLOTS }, (_, i) => (
    accessoires.length ? accessoires[(rang * 11 + i * PAS_ACCESSOIRE) % accessoires.length].uid : null
  ));

  // Trois coups par catégorie, dans l'ordre où le personnage les porte. Une
  // catégorie, c'est le couple (groupe, style) — même définition que la carte,
  // sans quoi la maquette laisserait vides les grilles des personnages dont les
  // coups valent au sol comme en l'air. Les groupes d'enchaînements ne
  // consomment pas d'emplacement : ils sont écartés.
  const attacks = [];
  const attackSlots = [];
  for (const kind of ['bravery', 'hp']) {
    const parCat = {};
    for (const g of char.attacks?.[kind] || []) {
      if (g.followUp) continue;
      for (const m of hydrate(g.moves)) {
        const cat = `${g.key}|${m.style || ''}`;
        (parCat[cat] = parCat[cat] || []).push(m);
      }
    }
    for (const liste of Object.values(parCat)) {
      liste.slice(0, MAX_SLOTS).forEach((m, i) => { attacks.push(m.id); attackSlots.push(i); });
    }
  }

  // Quelques abilities par famille, pour que le panneau ne soit pas vide. Celles
  // qu'un `only` réserve à d'autres personnages sont écartées : une maquette
  // reste un assemblage arbitraire, pas un assemblage impossible.
  const abilities = [];
  (data.abilities || []).forEach((g, gi) => {
    const dispo = (g.abilities || []).filter((a) => !a.only || a.only.includes(char.slug));
    const combien = [6, 3, 4][gi] ?? 3;
    for (let i = 0; i < combien && dispo.length; i++) {
      abilities.push(dispo[(rang * 5 + i * 7) % dispo.length].id);
    }
  });

  const assists = data.assists || [];
  const summons = data.summons || [];
  return {
    character: char.slug,
    name: '',
    equipment,
    accessories,
    abilities: [...new Set(abilities)],
    attacks,
    attackSlots,
    assist: assists.length ? assists[(rang + 1) % assists.length].slug : null,
    summon: summons.length ? summons[(rang * 3) % summons.length].id : null,
  };
}

export function renderBuildCardRoster({ t, locale, reference, data, hasPortrait, sizeOf, path, alternates }) {
  const L = { asset: (p) => p };
  const persos = data.characters || [];

  const options = persos
    .map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`)
    .join('\n');

  const cartes = persos.map((char, rang) => {
    // Sephiroth garde le build réel de la page d'essai : il sert de témoin.
    const reel = reference && reference.character === char.slug;
    const build = reel ? reference : maquette(char, rang, data);
    const note = reel ? t('buildCard.rosterReal') : t('buildCard.rosterMock');
    return `<section class="bcr-item" data-bcr="${esc(char.slug)}">
<h2 class="bcr-name">${esc(char.name)} <span class="bcr-tag">${esc(note)}</span></h2>
${buildCard({ t, build, data, L, hasPortrait, sizeOf, variant: 'portrait-full' })}
</section>`;
  }).join('\n');

  const body = `${siteHeader(t, { path, locale, alternates, availability: {}, active: null })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(t('buildCard.rosterTitle'))}</h1>
<p class="mv-desc">${esc(t('buildCard.rosterLede'))}</p>
<p class="mv-desc">${esc(t('buildCard.rosterMockNote'))}</p>

<p class="bcr-bar">
<label for="bcr-pick">${esc(t('buildCard.rosterPick'))}</label>
<select id="bcr-pick">
<option value="*">${esc(t('buildCard.rosterAll'))}</option>
${options}
</select>
<label for="bcr-mode">${esc(t('buildCard.rosterMode'))}</label>
<select id="bcr-mode">
<option value="">${esc(t('buildCard.rosterModeCurrent'))}</option>
<option value="calque">${esc(t('buildCard.rosterModeScrim'))}</option>
<option value="attenue">${esc(t('buildCard.rosterModeDim'))}</option>
</select>
</p>

${cartes}
</main>
${siteFooter(t)}`;

  return pageShell({
    t,
    locale,
    path: 'build-card-roster.html',
    title: t('buildCard.rosterTitle'),
    description: t('buildCard.rosterLede'),
    robots: 'noindex, nofollow',
    jsPath: 'scripts/build-card-roster.js',
    jsonLd: '',
    og: {},
    body,
  });
}
