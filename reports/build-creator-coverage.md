# Créateur de builds — couverture des données

Généré pour la branche `feature/build-creator`. Régénérer les données :
`npm run scrape:build && npm run parse:build && npm run build && npm run qa`.

## Sources

| Domaine | Source | Licence |
|---|---|---|
| Abilities, assists, invocations, règles de tournoi, statistiques de base | [dissidia.wiki](https://dissidia.wiki) | CC BY 4.0 |
| Équipements, accessoires, sets (« Combination ») | [Final Fantasy Wiki](https://finalfantasy.fandom.com) | CC BY-SA |
| Attaques et leur coût en CP | `data/characters/*.json`, déjà extraits par le pipeline existant | CC BY 4.0 (dissidia.wiki) |

Les pages `Equipment_(Dissidia_012)` et `Accessories_(Dissidia_012)` de dissidia.wiki
n'existent pas (404, liens rouges) : le Final Fantasy Wiki les remplace. Les noms
d'items concordent entre les deux wikis — 21 items relevés dans les builds publiés
sur dissidia.wiki ont été retrouvés à l'identique.

Le HTML de `finalfantasy.fandom.com/wiki/…` répond 403 aux fetchers : l'extraction
passe par `api.php?action=parse&prop=wikitext`, qui livre la source des tables.

## Volumétrie

| Jeu de données | Entrées | Détail |
|---|---|---|
| Équipements | 670 | 355 armes, 111 main, 92 tête, 109 corps, 3 sans emplacement |
| dont exclusifs à un personnage | 113 | répartis sur les 31 personnages |
| Accessoires | 551 | 38 basic, 100 booster, 105 special, 308 trade |
| Abilities | 122 | 39 basic, 13 support, 70 extra |
| Sets d'équipement | 25 | 12 à trois pièces, 13 à quatre |
| Assists | 31 | 124 attaques (30 jouables + Aerith) |
| Invocations | 47 | 4 légales en tournoi (counter summons) |
| Attaques équipables | 431 | tous personnages confondus |

Payload servi au navigateur : `dist/scripts/build-data.js`, 309 ko (listes encodées
en colonnes, réhydratées côté client ; environ 80 ko une fois compressé à la volée).

## Modèle de calcul, et sa vérification

Les totaux affichés valent : statistiques de base au niveau 100 + bonus des pièces
équipées + bonus conditionnels d'abilities.

- Base commune à tout le cast : **HP 6999, CP 450, BRV 667, LUK 60**.
- ATK et DEF de base : par personnage, les 31 sont documentés.
- Capacité : **450 CP**, portée à **510** par deux Hero's Spirit (+15 chacun) et un
  Hero's Essence (+30). Les trois valeurs sont sourcées, et leur somme est vérifiée
  automatiquement par la QA.
- Max Booster : cumul multiplicatif des boosters équipés. Les boosters n'agissent
  que sur les effets d'accessoires, pas sur les statistiques d'équipement.

**Contrôle de bout en bout** : le build « Adamant Chains + EX » de Lightning publié
sur dissidia.wiki annonce HP 10972, BRV 957, ATK 177, DEF 185, LUK 60. L'outil
retrouve ces cinq valeurs exactement, y compris le +1000 HP apporté par l'ability
Master Guardsman, que la fiche du wiki mentionne en note.

## Ce qui n'est pas documenté (affiché comme tel, jamais comblé)

| Sujet | État | Traitement dans l'outil |
|---|---|---|
| Nombre d'emplacements d'attaques par catégorie | Introuvable dans les sources consultées | Aucune limite de nombre n'est imposée ; la contrainte appliquée est le budget de CP. Signalé dans l'onglet Attaques. |
| Quelles braveries mènent à quelle attaque HP (HP links) | **Résolu** : la catégorie `Bravery to HP abilities in Dissidia 012 Final Fantasy` du Final Fantasy Wiki recense les 19 attaques concernées, et la section « Bravery to HP Attacks » de chaque page personnage donne la bravery d'origine (colonne « Obtained ») | 31 paires sur 11 personnages, toutes résolues contre nos fiches. Des paires supplémentaires restent déclarables dans `hpLinks` de `data/editorial/_build-creator.json` |
| Coût en CP de 24 attaques sur 431 | Absent du wiki | Étiquette « non documenté » sur la ligne, et le total de CP est présenté comme un minimum dès qu'une de ces attaques est sélectionnée |
| Emplacement de 3 armures exclusives de Feral Chaos (Aegis of Strife, Calamitous Rage, Deafening Fissure) | Le Fandom ne donne pas l'emplacement, et aucune page de dissidia.wiki ne les couvre | `documented: false`, exclues des listes équipables, signalées ici |
| Effet de l'invocation Barbariccia | Citée comme counter summon légal par la page de règles, mais absente de la page Summons | Proposée (elle est légale), sans description, avec l'étiquette « non documenté » |
| Formule exacte du cumul des boosters | Jamais énoncée ; un exemple chiffré du guide de builds multijoueur (1,5 × 1,4 × 1,3 → le ×2,7 annoncé) confirme le cumul multiplicatif | Cumul multiplicatif appliqué, mention de la déduction dans les repères de la page |

## Défauts relevés dans les sources

- **Paliers d'abilities** : `Speed Boost`, `Speed Boost+` et `Speed Boost++` sont trois
  abilities distinctes ; les identifiants préservent donc `+` et `Ω`. Un cas résiste :
  le wiki liste deux « Jump Times Boost » (20 et 40 CP) sans le `+` du second. On ne
  corrige pas le nom affiché — l'identifiant est suffixé par le coût, et le parseur
  émet un avertissement.
- **Homonymes d'équipement** : « Flamberge » désigne une épée et la gunblade exclusive
  de Lightning ; « Claymore » existe en niveau 1 et en niveau 30 (version Labyrinthe).
  La clé unique combine emplacement, identifiant, niveau et provenance.
- **Coups homonymes** : chez Jecht, « Ground (Up) » existe sous « Jecht Block » et sous
  « 3rd Chain ». Le wiki présente ces coups comme un en-tête suivi de ses déclinaisons :
  l'unité équipable est l'en-tête, les déclinaisons sont affichées en détail.
- **« Summon Unused »** existe en deux exemplaires (condition sur soi / sur l'adversaire) :
  le type fait partie de la clé.
- **Tables incomplètes** signalées côté Fandom sur `Combination` et les sous-pages `Shop`
  (sans effet sur le créateur : seule l'obtention des items en pâtit).
- **Colonne en `colspan`** dans la table des accessoires « Trade » : elle décalait la
  lecture de toutes les colonnes suivantes, et le rang se perdait. Le lecteur de tables
  répète désormais une cellule sur le nombre de colonnes qu'elle couvre.
- **Les deux jeux se ressemblent au point de se confondre.** Dans la section « Bravery to
  HP Attacks » des pages personnages du Fandom cohabitent la table du Dissidia de 2008 et
  celle de 012. Aucun critère unique ne les sépare : chez Warrior of Light les deux portent
  la classe `DFF2008` et seule la légende cite « Dissidia 012 » ; chez Bartz les deux
  légendes disent « Dissidia » et seule la classe `D012` tranche. Le parseur essaie la
  légende, puis la classe, et refuse de choisir au hasard.
- **Un même coup nommé différemment d'un wiki à l'autre** : le Fandom écrit « Master Sonic
  Break » et « Master Slashing Blow » là où dissidia.wiki écrit « Sonic Break » et
  « Slashing Blow ». Le rapprochement ne tolère que le préfixe « Master », uniquement si le
  nom nu existe de notre côté, et chaque cas est consigné dans le payload
  (`aliasedHpLinks`).

## Règles de composition appliquées

| Règle | Origine |
|---|---|
| Trois emplacements par catégorie (posture × style) | Règle de jeu fournie par l'auteur du site |
| Les enchaînements et les attaques HP branchées n'occupent pas d'emplacement | idem |
| Un enchaînement n'est équipable que si son attaque de départ l'est | idem ; l'interface verrouille la branche et purge les sélections orphelines |
| Toute bravery « (One) » mène à n'importe quel enchaînement « (Two) » équipé | Les descriptions des enchaînements de Prishe indiquent « Branching from _ (One) », le tiret bas valant pour n'importe laquelle |
| Exemplaires d'un même accessoire : 1 pour un rang S, 2 pour un A, 3 pour un B, illimité pour un C | Règle de jeu fournie par l'auteur du site ; les rangs viennent du Final Fantasy Wiki |
| Paliers d'une même ability mutuellement exclusifs | Nommage du wiki (`+`, `++`, `Ω`) |
| Descent Speed Boost et Zero Gravity incompatibles | Confirmé par l'auteur ; les deux descriptions commencent par « Press X after jumping » |

## Légalité en tournoi

Ruleset retenu : **Tournament Rules 2017**, qui correspond au réglage in-game
« Official » — le seul des rulesets documentés qui laisse l'équipement libre, donc le
seul où un filtre de légalité a du sens. Chaque règle appliquée cite sa phrase source
dans `data/build/ruleset.json`, et la QA échoue si une citation manque.

33 accessoires sont marqués illégaux :

| Motif | Nombre |
|---|---|
| Accessoire brisable | 19 |
| Multiplicateur « Level Gap » | 9 |
| Multiplicateur « sans équipement » (Weaponless, Gloveless, Hatless, Armorless) | 4 |
| Rebellious Soul (Bonecrusher), banni nommément | 1 |

Les invocations sont limitées aux quatre counter summons (Barbariccia, Scarmiglione,
Cagnazzo, Rubicante). Aucun équipement listé n'est banni : les artefacts, seuls
équipements interdits par le ruleset, sont générés aléatoirement et n'ont pas de fiche
sur les wikis. Rien n'est masqué en silence : un interrupteur « Afficher les items
illégaux » les fait réapparaître, toujours étiquetés avec leur motif.

## Contrôles automatiques

`node scripts/qa.mjs` vérifie, en plus des contrôles existants du site :

- unicité des identifiants d'équipements, d'accessoires, d'abilities et de coups ;
- tout équipement sans emplacement porte `documented: false` ;
- tout item illégal porte un motif, et tout code de motif existe dans la légende ;
- le plafond de CP annoncé est bien la somme de ce que les sources documentent ;
- les 31 personnages ont leurs statistiques de base ;
- chaque set connaît son nombre de pièces requis, et liste au moins ce nombre ;
- chaque règle de légalité cite sa source.

État au moment de ce rapport : **0 erreur, 0 avertissement**.

## Scénarios vérifiés dans le navigateur

Cycle complet (créer, enregistrer, recharger, renommer, dupliquer, supprimer) ;
export JSON et réimport à l'identique ; export CSV à plat ; lien de partage ; bornes de
budget 450/455 et 510/515 ; imports refusés proprement (JSON invalide, version de
schéma inconnue, personnage inconnu, équipement inexistant) ; personnage sans HP link ;
movesets atypiques (Lightning et son groupe Medic, Prishe et ses enchaînements) ;
navigation des onglets au clavier ; les trois breakpoints.

Deux correctifs sont issus de ces passes : les URLs de sources provoquaient un
défilement horizontal sous 600 px, et l'ajout d'un quatrième menu au header faisait
déborder les panneaux déroulants des derniers groupes sur toutes les pages du site.
