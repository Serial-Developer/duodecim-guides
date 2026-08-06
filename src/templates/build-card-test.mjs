// Banc d'essai de la carte de build. Cette page n'appartient pas au site : elle
// n'est ni au sitemap, ni dans la navigation, et se déclare en noindex. Elle
// n'existe que pour juger le rendu de la carte avant de l'intégrer aux fiches
// perso et au créateur.
//
// Elle affiche deux fois le composant : le build de référence, puis un build
// volontairement lacunaire — c'est sur celui-là qu'on vérifie que la grille
// tient debout quand tout n'est pas rempli.
import { esc, pageShell, siteHeader, siteFooter } from './helpers.mjs';
import { buildCard } from './build-card.mjs';

export function renderBuildCardTest({ t, locale, build, source, data, hasPortrait, sizeOf, path, alternates }) {
  const L = { asset: (p) => p };

  // Même personnage, presque rien d'équipé : une arme, deux accessoires, une
  // seule attaque, ni assist ni invocation, et pas de nom.
  const lacunaire = {
    character: build.character,
    name: '',
    attacks: [build.attacks[0]],
    attackSlots: [2],
    equipment: { weapon: build.equipment.weapon, hand: null, head: null, body: null },
    accessories: [build.accessories[0], null, null, build.accessories[3], null, null, null, null, null, null],
    assist: null,
    summon: null,
  };

  const body = `${siteHeader(t, { path, locale, alternates, availability: {}, active: null })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">${esc(t('buildCard.testTitle'))}</h1>
<p class="mv-desc">${esc(t('buildCard.testLede'))}</p>
<p class="mv-desc"><a href="${esc(source)}" target="_blank" rel="external noopener">${esc(t('buildCard.testSource'))}</a></p>
<p class="mv-desc"><a href="build-card-roster.html">${esc(t('buildCard.testRosterLink'))}</a></p>

<h2>${esc(t('buildCard.testComplete'))}</h2>
${buildCard({ t, build, data, L, hasPortrait, sizeOf, uid: 'complet' })}

<h2>${esc(t('buildCard.testPartial'))}</h2>
<p class="mv-desc">${esc(t('buildCard.testPartialLede'))}</p>
${buildCard({ t, build: lacunaire, data, L, hasPortrait, sizeOf, uid: 'lacunaire' })}

<h2>${esc(t('buildCard.testPortraitFull'))}</h2>
<p class="mv-desc">${esc(t('buildCard.testPortraitFullLede'))}</p>
${buildCard({ t, build, data, L, hasPortrait, sizeOf, variant: 'portrait-full', uid: 'full' })}

<h2>${esc(t('buildCard.testPortraitTall'))}</h2>
<p class="mv-desc">${esc(t('buildCard.testPortraitTallLede'))}</p>
${buildCard({ t, build, data, L, hasPortrait, sizeOf, variant: 'portrait-tall', uid: 'tall' })}
</main>
${siteFooter(t)}`;

  return pageShell({
    t,
    locale,
    path: 'build-card-test.html',
    title: t('buildCard.testTitle'),
    description: t('buildCard.testLede'),
    robots: 'noindex, nofollow',
    jsonLd: '',
    og: {},
    body,
  });
}
