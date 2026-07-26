# Sources et licences

Ce document recense l'origine de chaque contenu du site
[Guides Dissidia 012 [duodecim]](https://serial-developer.github.io/duodecim-guides/)
et la licence qui s'y applique. Le texte juridique complet est dans [LICENSE](LICENSE).

## En une phrase

Le code et le design sont sous MIT, les textes français que j'ai écrits sont sous
CC BY-NC-ND 4.0, les données de jeu restent sous la licence de leur wiki
d'origine (que je ne peux pas modifier), et tout ce qui vient du jeu appartient à
Square Enix.

## 1. Ce que j'ai écrit — © 2026 Serial

| Contenu | Emplacement | Licence |
|---|---|---|
| Scripts de pipeline, templates, design system | `scripts/`, `src/` | MIT |
| Prose française : vues d'ensemble, plans de jeu, matchups, philosophies de build, notes de coups, forces/faiblesses, taglines, archétypes | `data/editorial/*.json` | CC BY-NC-ND 4.0 |
| Pages transverses : techniques, installation, savedata, multijoueur, tournois, participer, organiser, obtenir Feral Chaos | `data/editorial/_*.json` | CC BY-NC-ND 4.0 |
| Images de partage (composition originale à partir des portraits officiels) | `assets/og/` | CC BY-NC-ND 4.0 pour la composition ; les portraits restent © Square Enix |
| Diagrammes SVG (frame data, mobilité, chaînes) | générés par `src/templates/helpers.mjs` | MIT pour le code, CC BY 4.0 pour les données représentées |

Attribution demandée pour les textes : **Serial —
https://serial-developer.github.io/duodecim-guides/**

## 2. Données de jeu — sous licence de leur source

Je ne détiens aucun droit sur ces données et **ne peux pas restreindre leur
réutilisation par des tiers**. Les licences ci-dessous s'appliquent, y compris si
vous les récupérez depuis ce site.

### dissidia.wiki — CC BY 4.0

<https://dissidia.wiki> · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Frame data (startup, priorité, dégâts, CP, EX Force, cancels), infobox et stats
de mobilité, movesets, EX Modes, tier list du tournoi 2017 et sa méthodologie,
techniques universelles et glitches, glossaire, guide de build multijoueur,
données du créateur de builds hors équipements et accessoires.

Extrait par `scripts/scrape.mjs` puis `scripts/parse.mjs` vers
`data/characters/*.json` et `data/meta.json`.

Réutilisation libre, y compris commerciale et modifiée, avec attribution.

### Final Fantasy Wiki — CC BY-SA 3.0

<https://finalfantasy.fandom.com> · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)

Équipements (670) et accessoires (551) du créateur de builds, compléments de
moveset (rôles et jobs par coup, coups spéciaux).

Extrait par `scripts/scrape-builddata.mjs` vers `data/build/equipment.json` et
`data/build/accessories.json`.

**Clause de partage à l'identique** : toute œuvre dérivée de ces contenus doit
être diffusée sous CC BY-SA 3.0 ou une licence compatible. Cette obligation
prime sur la licence CC BY-NC-ND que j'applique à mes textes originaux : les
passages qui adaptent cette source restent modifiables sous CC BY-SA 3.0.

### Portraits, icônes et captures de coups

Fichiers officiels du wiki, indisponibles depuis son CDN (301 → 404 en juillet
2026) et récupérés via la **[Wayback Machine](https://web.archive.org)** —
`assets/portraits/`, `assets/icons/`, `assets/moves/`.

Ce sont des éléments du jeu : © Square Enix (voir § 4). La Wayback Machine n'est
qu'un moyen d'accès, elle ne confère aucun droit supplémentaire.

**Exception — le portrait d'Aerith** (`assets/portraits/aerith.png`). Aerith
n'étant pas jouable, elle n'a aucun portrait d'écran de sélection : sa page
dissidia.wiki ne contient aucune image, et l'index d'archives ne conserve d'elle
qu'une icône de 128×32 pixels. Son portrait est donc un **artwork officiel de
*Final Fantasy VII*** (© Square Enix), mis au format carré du site sans
recadrage du sujet. Ce n'est pas un rendu de Dissidia 012, et les textes
alternatifs du site le disent explicitement.

## 3. Sources communautaires citées

Droits détenus par leurs auteurs. Elles sont citées nommément et liées dans les
sections « Sources » du site ; aucune n'est reproduite intégralement.

| Source | Usage |
|---|---|
| [GameFAQs](https://gamefaqs.gamespot.com) (board 605171) | Guides de personnages et discussions d'époque (2011-2013) |
| [dissidiaforums.com](https://web.archive.org/web/*/dissidiaforums.com) (site disparu, lu via la Wayback Machine) | Analyses compétitives, tier list communautaire 2012 |
| Pastebin | Listes de builds et rulesets de tournoi partagés par la communauté |
| YouTube | Vidéos de démonstration et de matchs, créditées par chaîne |
| [Steam Community](https://steamcommunity.com) | Guides d'émulation et de configuration |
| [start.gg](https://start.gg), [Challonge](https://challonge.com) | Brackets et résultats de tournois |
| [PPSSPP](https://ppsspp.org) | Documentation officielle de l'émulateur |
| [Discord DISSIDIA](https://discord.gg/a44rneC) | Annonces de tournois, règlements |
| [Replay Theater](https://replaytheater.app/?game=d012) | Rediffusions de matchs |

## 4. Propriété de Square Enix

*Dissidia 012 [duodecim] Final Fantasy* (PSP, 2011), ses personnages, leurs noms,
artworks, portraits, icônes, captures d'écran et tout élément du jeu sont la
propriété de **© SQUARE ENIX CO., LTD.** Tous droits réservés.
*Final Fantasy* est une marque déposée de Square Enix.

Ce site est un **projet de fans non commercial**, sans affiliation ni approbation
de Square Enix, à visée documentaire sur un jeu de 2011. Aucune revendication de
propriété n'est faite sur ces éléments. Toute demande de retrait de la part des
ayants droit sera honorée.

## 5. Outils

| Outil | Licence | Usage |
|---|---|---|
| [Node.js](https://nodejs.org) | MIT | Exécution du pipeline |
| [cheerio](https://cheerio.js.org) | MIT | Extraction HTML du wiki |
| [@resvg/resvg-js](https://github.com/yisibl/resvg-js) | MPL-2.0 | Rendu des images de partage |
| [Cinzel](https://fonts.google.com/specimen/Cinzel), [Inter](https://fonts.google.com/specimen/Inter) | SIL Open Font License 1.1 | Typographie, servies par Google Fonts |

## Signaler un problème d'attribution

Une source manquante, mal créditée ou mal licenciée est un bug : ouvrez une
[issue](https://github.com/Serial-Developer/duodecim-guides/issues) et elle sera
corrigée.
