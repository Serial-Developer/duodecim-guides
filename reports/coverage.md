# Rapport de couverture — guides Dissidia 012 [duodecim]

Généré par `npm run coverage`. Source principale : dissidia.wiki (CC BY 4.0), pages récupérées en juillet 2026 (cache local `cache/`).

## Couverture par personnage

Colonnes : coups extraits (BRV+HP) · vue d'ensemble rédigée · mécanique unique documentée sur le wiki · matchups exploitables · builds documentés · section assist · nb de tech communautaires sourcées · éditorial FR présent.

| Personnage | Coups | Vue d'ens. | Méca unique | Matchups | Builds | Assist | Tech comm. | Éditorial |
|---|---|---|---|---|---|---|---|---|
| Warrior of Light | 10+9 | ✅ | ❌ | ✅ | ✅ | ✅ | 1 | ✅ |
| Garland | 10+6 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Firion | 11+8 | ✅ | ❌ | ✅ | ✅ | ✅ | 6 | ✅ |
| The Emperor | 8+6 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Onion Knight | 12+8 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Cloud of Darkness | 5+9 | ✅ | ❌ | ✅ | ✅ | ✅ | 1 | ✅ |
| Cecil Harvey | 6+6 | ✅ | ✅ | ❌ | ✅ | ✅ | 0 | ✅ |
| Golbez | 7+8 | ✅ | ❌ | ❌ | ✅ | ✅ | 1 | ✅ |
| Kain Highwind | 7+7 | ✅ | ✅ | ✅ | ✅ | ✅ | 1 | ✅ |
| Bartz Klauser | 7+5 | ✅ | ❌ | ❌ | ✅ | ✅ | 0 | ✅ |
| Exdeath | 9+5 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Gilgamesh | 8+6 | ✅ | ✅ | ❌ | ✅ | ✅ | 0 | ✅ |
| Terra Branford | 11+6 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Kefka Palazzo | 8+4 | ✅ | ❌ | ✅ | ✅ | ✅ | 15 | ✅ |
| Cloud Strife | 11+6 | ✅ | ❌ | ✅ | ✅ | ✅ | 4 | ✅ |
| Sephiroth | 8+7 | ✅ | ❌ | ✅ | ✅ | ✅ | 1 | ✅ |
| Tifa Lockhart | 10+7 | ✅ | ✅ | ✅ | ✅ | ✅ | 0 | ✅ |
| Squall Leonhart | 9+6 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Ultimecia | 4+4 | ✅ | ❌ | ❌ | ✅ | ✅ | 0 | ✅ |
| Laguna Loire | 12+4 | ✅ | ❌ | ❌ | ✅ | ✅ | 0 | ✅ |
| Zidane Tribal | 9+8 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Kuja | 6+4 | ❌ | ❌ | ❌ | ✅ | ✅ | 0 | ✅ |
| Tidus | 12+11 | ✅ | ❌ | ❌ | ✅ | ✅ | 10 | ✅ |
| Jecht | 4+5 | ✅ | ✅ | ✅ | ✅ | ✅ | 1 | ✅ |
| Yuna | 18+5 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Shantotto | 8+6 | ❌ | ❌ | ❌ | ✅ | ✅ | 0 | ✅ |
| Prishe | 18+4 | ✅ | ✅ | ✅ | ✅ | ✅ | 0 | ✅ |
| Vaan | 8+4 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Gabranth | 8+4 | ✅ | ✅ | ✅ | ✅ | ✅ | 5 | ✅ |
| Lightning | 16+5 | ✅ | ❌ | ❌ | ✅ | ✅ | 0 | ✅ |
| Feral Chaos | 8+6 | ✅ | ❌ | ✅ | ✅ | ✅ | 0 | ✅ |
| Aerith Gainsborough | 2+2 | ✅ | ❌ | ❌ | ❌ | ✅ | 0 | ✅ |

## Choix arbitraires faits (à valider)

1. **Images via Wayback Machine.** Le CDN d'images du wiki (`resources.dissidia.wiki` ET `dissidia.wiki/images/`) est en panne totale (301 → 404, vérifié aussi dans un navigateur réel). Les portraits et icônes sont les fichiers officiels du wiki récupérés depuis web.archive.org (snapshots ~janvier 2026, signature PNG vérifiée) et copiés en local. Le pattern d'URL du cahier des charges était le bon — c'est le serveur qui est HS. Mention ajoutée au footer.
2. **Guide Prishe de référence absent.** Le fichier `guide-prishe-dissidia012.html` n'était pas dans le repo ; la structure §7 et le design system §8 du cahier des charges ont servi d'étalon à la place.
3. **Screenshots de coups : couverture partielle** — 195 des 360 captures référencées par le wiki ont pu être récupérées via la Wayback (les 165 autres n'ont jamais été archivées, détail dans `reports/move-images-log.json`). Les accordéons n'affichent la capture que lorsqu'elle existe.
4. **Chaos : fiche courte** générée (`characters/chaos.html`) — validé par Jonath ; la page wiki ne contient qu'une phrase, la fiche est minimale et renvoie vers Feral Chaos.
5. **Aerith sans portrait** : aucun `ddff-port-aerith.png` n'a jamais existé sur le CDN (vérifié via l'index CDX de la Wayback) ; sa page wiki ne contient aucune image.
6. **Descriptions anglaises des coups non affichées** (règle « jamais de copie verbatim ») : remplacées par les notes d'usage françaises ; les combos documentés sont rendus en notation d'origine (traités comme données).
7. **Emplacement du projet** : `Projets/dissidia012-guides` (la session Claude Code était ouverte sur un autre projet).
8. **Tier list** : la seule tier list chiffrée du wiki est celle de 2017 (tournoi + communautaire) ; les graphiques communautaires (weighted, blind pick…) sont des images cassées sur le wiki — seule la liste tournoi (texte) est exploitée.

## Manques transverses connus

- Sous-pages `/Matchups` : squelettes vides pour 27 persos sur 31 (remplies : Firion, Sephiroth, Tifa, Jecht) → bandeaux + synthèse depuis l'overview quand elle existe.
- Sous-pages `/Starter_Guide`, `/Strategy`, `/Frame_Data` : stubs généralisés sur le wiki.
- Tech communautaire : seules les références présentes sur le wiki ont été exploitées. Le minage GameFAQs (board 605802) et guides Steam (ex. Exdeath `2333236279`) reste à faire — voir Questions.
- Vérification responsive réelle (3 breakpoints) : la preview navigateur de la session a été bloquée par la politique locale ; CSS écrit pour 4/6/11 colonnes et testable via `npx serve dist`.

## Limites par personnage (déclarées par l'éditorial)

### Warrior of Light
- Page matchups du wiki à l'état de stub : aucun matchup détaillé n'est documenté.
- Aucune mécanique unique documentée (section absente des sources).
- Section combos solo marquée « Main article pending » : seuls deux combos solo et trois combos assist (Sephiroth) sont détaillés.
- Valeurs d'assist gain des coups non renseignées dans les données.
- Startup exact des HP links (Rune Saber, Bitter End) inconnu (« ? » dans les tables), tout comme certains décomptes d'EX Force et de Comrade's Vow des combos (« ??? »).
- Un seul build documenté (hybride Seal of Lufenia) ; pas de variantes détaillées (l'article builds dédié n'est pas inclus dans les données).

### Garland
- Page matchups du wiki à l'état de stub : aucun matchup détaillé n'est documenté.
- Aucune mécanique unique documentée (section absente des sources).
- Section références vide : aucune source communautaire datée ou attribuable (les mentions « Video » des tables de combos ne comportent pas d'URL dans les données).
- Article combos dédié (« Garland (Combos) ») non inclus : seuls deux combos solo et le combo EX Revenge sont détaillés.
- Valeurs d'assist gain des coups non renseignées, et décomptes Comrade's Vow des combos inconnus (« ??? »).
- Hitbox de Chain Cast incomplètement documentée (« requires further research ») et conditions exactes des frappes derrière le block non établies.
- Les tables des deux builds ne listent pas les braveries et HP équipés (lignes vides dans les données).

### Firion
- Aucune mécanique unique documentée (section absente des sources).
- Article combos dédié (« Firion (Combos) » et « Firion Combos (Kuja Assist) ») non inclus : seuls deux combos solo et quatre combos Kuja sont détaillés.
- Valeurs d'assist gain des coups non renseignées ; startup des follow-ups et de Double Trouble inconnu (« ? »/« ?? »), certains décomptes EX/Comrade's Vow des combos incomplets (« ??? » ou approximations).
- Matchups documentés pour 9 adversaires seulement (sur 30) ; les fiches Cloud of Darkness, Cecil et Golbez sont marquées « REVISION COMING SOON » et Cecil n'a pas de verdict.
- Article builds dédié (« Firion (012) Builds ») non inclus : un seul build Side by Side est détaillé.
- Les références YouTube ne sont pas datées (champ date à null) et l'une d'elles n'a pas de libellé exploitable (URL brute).

### The Emperor
- Page matchups dédiée non documentée (stub) : la synthèse matchups repose uniquement sur l'overview et les notes de coups.
- Aucune mécanique unique documentée (section absente des sources).
- Aucune référence externe (section References vide) : pas de communityTech attribuable ; le combo Starfall loop mentionne une vidéo sans URL exploitable.
- Article combos dédié (« The Emperor (Combos) ») non inclus : seuls trois combos solo et trois combos Jecht sont détaillés.
- Page builds dédiée (« The Emperor (012) Builds ») non incluse : un seul build Side by Side + haute bravery est détaillé.
- Valeurs d'assist gain des coups non renseignées dans les données, et décomptes « Opponent Assist (Comrade's Vow) » des combos marqués « ??? ».

### Onion Knight
- La page Matchups du wiki est une ébauche (stub) : aucune analyse détaillée par matchup, seules les mentions de l'overview sont exploitables.
- La section Combos est vide (non documentée) : aucune route de combo chiffrée n'est disponible.
- Aucune mécanique unique n'est documentée pour ce personnage (section absente du wiki).
- Le gain de jauge d'assist par coup n'est pas renseigné (colonnes vides) et plusieurs startups de coups de branche sont notés « ?? ».
- Les builds sont donnés uniquement en tables d'équipement, sans texte explicatif détaillé.
- La section References est vide : aucune tech communautaire attribuable ou datée.

### Cloud of Darkness
- La page Matchups du wiki est une ébauche (stub) : aucune analyse détaillée par matchup.
- Aucune mécanique unique documentée (section absente du wiki) — les stances en trois temps sont décrites dans les notes de coups, pas dans une section dédiée.
- Aucune évaluation rédigée du personnage en tant qu'assist (section « Assist Overview » vide) : seuls la table de données et le classement Low de la meta sont disponibles.
- Combos incomplets de l'aveu même du wiki (« This section does not show all combos right now ») ; les dégâts et gains d'EX des combos assist Jecht sont notés « ??? ».
- Le coût CP de Tentacle of Pain est partiellement inconnu (« ?? (30) ») et le gain de jauge d'assist par coup n'est pas renseigné.

### Cecil Harvey
- La page Matchups du wiki est une ébauche (stub) et l'overview ne contient pas d'analyse exploitable par matchup : section matchups laissée à null.
- Le moveset bravery documenté est incomplet (6 coups détaillés seulement) : Valiant Blow, Dark Cannon, Paladin Arts et Shadow Lance apparaissent dans l'infobox, les combos ou les données d'assist sans fiche de coup détaillée.
- Aucune évaluation rédigée de Cecil en tant qu'assist : seuls la table de données et le classement Mid de la meta sont disponibles.
- Dans les tables de combos, les valeurs « Opponent Assist (Comrade's Vow) » sont notées « ??? » et certains gains d'EX sont partiels.
- Le gain de jauge d'assist par coup n'est pas renseigné (colonnes vides).
- La section References est vide : aucune tech communautaire attribuable ou datée.

### Golbez
- Page matchups dédiée non documentée (stub) et aucun matchup nommé dans l'overview : champ matchups à null.
- Aucune mécanique unique documentée (section absente des sources).
- Section combos non documentée : aucun combo détaillé dans les données.
- Sector Ray (ground) sans notes d'usage : seul le tableau de données existe, la clé est omise de moveNotes.
- Section assist non documentée en prose : asAssist se limite à la tier list assist (meta) et au tableau de données ; synergies réduites à une phrase (Kuja, Jecht).
- Builds : un seul build (Seal of Lufenia) sans philosophie rédigée ni coups équipés ; le second emplacement de build est vide ; booster max non renseigné.
- Données incomplètes dans les tableaux : Fall Speed « ?? », startup de Cosmic Ray « ?? », valeurs d'assist gain absentes.
- Aucun texte de synthèse sur l'EX Mode au-delà de la liste d'effets et du tableau Black Fang ; dégâts et détails de l'EX Burst limités au tableau.

### Kain Highwind
- Page matchups à l'état d'ébauche (stub) : aucun contenu dédié aux matchups.
- Section combos vide dans les sources (sous-section « Solo » sans texte ni tableau).
- Le tableau Strengths/Weaknesses de l'overview est vide : forces et faiblesses reconstruites uniquement depuis le texte.
- Pas d'évaluation rédigée du rôle d'assist : seules les données chiffrées et deux noms de synergies (« Kuja, Onion Knight ») sont fournis.
- Rising Drive, Sky Rave, Gungnir et Dragon's Fang (midair) n'ont pas de notes d'usage dédiées, seulement des descriptions courtes et des mentions dans l'overview.
- Données de Lancet incomplètes (AP de maîtrise non renseignés).

### Bartz Klauser
- Overview très courte (trois phrases descriptives) : la synthèse repose surtout sur le tableau forces/faiblesses et les notes de coups.
- Page matchups à l'état d'ébauche (stub) : aucun contenu.
- Section combos vide (sous-section « Solo » sans texte ni tableau).
- Aucune mécanique unique documentée (documented: false).
- Aucune référence communautaire dans les sources.
- Second build (« Build #2 ») entièrement vide.
- Données incomplètes : startup et priorité de Flare incertains (« ? »), notes minimales pour les HP attacks (Hellfire, Dark Flame, Ragnarok Blade, Luminous Shard), niveau de déblocage et AP de Goblin Punch non renseignés.

### Exdeath
- Page matchups à l'état d'ébauche (stub) : aucun contenu dédié, la synthèse matchups repose sur l'overview et la contre-stratégie Maelstrom.
- Section combos vide (sous-section « Solo » sans texte ni tableau).
- Aucune mécanique unique marquée comme documentée (documented: false) : les guard counters et block cancels sont décrits dans l'intro de la section bravery, pas dans une section dédiée.
- Pas de notes d'usage individuelles pour les coups : les moveNotes s'appuient sur les descriptions, les données de frames et l'overview.
- Table de contre-stratégie Maelstrom incomplète dans l'extraction : une seule entrée (« Quo Vadis ») sans personnage lisible, la liste des attaques capables de dévier n'est donc pas exploitable.
- Second build (« Build #2 ») entièrement vide.
- Aucune référence communautaire dans les sources.
- Données partielles : dégâts non chiffrés (« - ») sur Delta Attack et Almagest, vitesse de course « ?? » dans l'infobox.

### Gilgamesh
- Aucune note d'usage par coup dans les sources : moveNotes est synthétisé à partir des descriptions officielles, des données de frames et des mentions de l'overview et de la mécanique unique.
- Page matchups dédiée non documentée (stub) et aucun matchup nommé dans l'overview : champ matchups à null.
- Section combos non documentée : aucun combo détaillé (seul l'enchaînement Double Trouble > Hurricane au plafond est mentionné via la rétention d'armes).
- Builds : un seul build (Hybrid (EX)) sans philosophie rédigée ni coups équipés ; le second emplacement de build est vide.
- Synergies d'assist réduites à une phrase générique (aucun assist recommandé nommément hors le Kuja du build).
- Aucune référence externe (section References vide) : pas de communityTech attribuable.
- Valeurs d'assist gain des coups non renseignées ; le texte de l'EX Burst est tronqué dans la source (« Select Excalipoor to... ») et l'effet exact d'Excalipoor dans le Burst n'y est pas explicité.

### Terra Branford
- Page matchups à l'état d'ébauche (stub) : aucune analyse par personnage, seuls des repères issus de l'overview.
- Section combos non documentée (sous-section Solo vide dans les sources).
- Onglets de synergies d'assist (Jecht, Aerith, Kuja) vides : la recommandation n'est pas argumentée au-delà d'une phrase.
- Aucune mécanique unique documentée pour Terra.
- Aucune référence communautaire (section References vide), d'où un communityTech vide.
- Startup inconnu pour Firaga et Ultima (« ? » dans les données) ; gain de jauge d'assist non renseigné pour tous les coups ; un variant aérien de Blizzard Combo est listé sans nom.
- La liste des attaques équipées dans les builds n'est pas renseignée dans les tables extraites.

### Kefka Palazzo
- Page matchups dédiée non documentée (stub) : la synthèse matchups repose uniquement sur l'overview et les notes de coups (Lightning, Onion Knight, Sephiroth, Gilgamesh, Jecht, Vaan, Cloud, Prishe).
- Aucune mécanique unique documentée (section absente des sources).
- Combos : seules les routes solo sont listées (en notation abrégée, sans dégâts ni conditions détaillées) ; aucun combo d'assist chiffré.
- Builds : coups équipés non renseignés pour les deux builds, summon absent du build High Initial EX.
- Assist : aucune évaluation en prose de Kefka en tant qu'assist (données de table et tier Low de meta uniquement) ; valeurs d'assist gain des coups non renseignées.
- Les références YouTube ne sont pas datées (champ date à null) ; le startup de la seconde salve EX de Scatter-Spray Blizzaga est inconnu (« ?? »).

### Cloud Strife
- La page matchups dédiée est une ébauche (stub) : aucune analyse détaillée par personnage n'est documentée, seuls quelques éléments de l'overview et des synergies d'assist sont exploitables.
- Aucune mécanique unique n'est documentée pour Cloud (section absente du wiki).
- La startup de Finishing Touch et d'Omnislash Version 5 n'est pas renseignée (« ? » dans les données), tout comme la priorité d'Omnislash Version 5.
- Les valeurs de gain de jauge assist (assistGain) sont vides pour tous les coups.
- Les références vidéo du wiki ne comportent ni auteur ni date.

### Sephiroth
- Aucune mécanique unique n'est documentée pour Sephiroth (section absente du wiki).
- Un seul matchup est détaillé (Prishe) ; le reste du cast n'est pas couvert.
- La section synergies d'assist se limite à une phrase (« fonctionne avec la plupart des assists viables en tournoi ») : les recommandations ci-dessus sont reconstituées depuis l'overview et le matchup Prishe.
- Le second build est entièrement vide et les sélections d'attaques des builds ne sont pas renseignées.
- Les valeurs de gain de jauge assist (assistGain) sont vides pour tous les coups, et les dégâts de Heaven's Light ne sont pas chiffrés (« - »).
- L'unique référence du wiki est une URL sans titre, auteur ni date.

### Tifa Lockhart
- La section Combos du wiki est vide (documented: false) : aucun combo détaillé chiffré n'est fourni, seules les indications des notes de coups et de builds ont été utilisées.
- Aucune référence externe (section References vide) : pas de communityTech attribuable.
- Le tableau Forces/Faiblesses de l'overview est vide dans les données ; forces et faiblesses ont été déduites du texte de l'overview, des notes de coups et des matchups.
- Les gains de jauge d'assist (assistGain) ne sont renseignés pour aucun coup.
- Le startup de Somersault est inconnu dans les données (« ? »), et le type de dégâts de l'EX Burst est noté « ?? ».

### Squall Leonhart
- Pas de section « mécaniques uniques » : le wiki la marque non documentée (documented: false) pour Squall.
- La page matchups est un stub sans contenu : le résumé des matchups repose uniquement sur les indices de l'overview.
- Aucune référence externe (section References vide) : pas de communityTech attribuable.
- La statistique LUK des builds n'est jamais renseignée (« -- »), et les gains de jauge d'assist (assistGain) sont vides pour tous les coups.
- Les listes d'attaques recommandées par build (tableaux « Bravery attacks / HP attacks ») sont vides dans les données extraites, contrairement à celles de Tifa.

### Ultimecia
- Aucun combo n'est documenté (section combos vide, documented: false) : le gameplan repose uniquement sur l'overview et les notes de coups.
- La page matchups est une ébauche (stub) et l'overview ne cite aucun personnage adverse : la section matchups est donc laissée à null.
- La section assist est marquée non documentée : seules la table de données brutes et la mention « Kuja » en synergie existent, sans évaluation rédigée.
- Knight's Axe et Knight's Arrow n'ont aucune note d'usage ; Shockwave Pulsar et Hell's Judgement n'ont que leur description d'une ligne ; les dégâts de Shockwave Pulsar et d'Apocalypse ne sont pas chiffrés (« - »).
- Aucune mécanique unique n'est documentée ; le second build est entièrement vide et les sélections d'attaques des builds manquent ; la table Time Crush est en grande partie vide (dégâts, priorité, type non renseignés).
- Aucune référence externe (section references vide) : communityTech est donc un tableau vide ; les valeurs assistGain sont vides pour tous les coups.

### Laguna Loire
- Pas de table forces/faiblesses sur la page wiki : les listes ci-dessus sont dérivées de la prose de l'overview et des notes de coups.
- Frame data très incomplète : Machine Gun, Grenade Bomb, Pummel, Missile Barrage et Electro Shield n'ont ni startup, ni priorité, ni EX Force chiffrés dans les données (seuls les multiplicateurs de dégâts sont présents) ; les dégâts de Ragnarok Blade et Split Laser ne sont pas chiffrés (« - »).
- Aucun combo n'est documenté (section combos vide, documented: false).
- La page matchups est une ébauche (stub) et l'overview ne cite aucun adversaire : matchups laissé à null. Seules mentions ponctuelles dans les notes de coups : clash de Ragnarok Buster avec Maelstrom/Holy, punish de Quick Hit au Split Laser.
- La section assist se réduit à trois noms (« Yuna, Jecht, Aerith. ») sans aucune justification, et aucune donnée de Laguna en tant qu'assist n'existe : les recommandations sont livrées telles quelles.
- Aucune mécanique unique documentée ; aucune référence externe (communityTech vide) ; second build vide et sélections d'attaques manquantes ; valeurs assistGain vides.

### Zidane Tribal
- Page matchups du wiki à l'état de stub : aucune analyse par personnage.
- Section combos vide dans les sources : aucune route de combo documentée.
- Pas de notes d'usage détaillées pour Solution 9, Stellar Circle 5 et Grand Lethal (seule la description du jeu est disponible) ; Tidal Flame, Swift Attack, Tempest, Shift Break et Free Energy ne sont documentés qu'indirectement via l'overview et la section builds.
- Section assist quasi vide : une seule phrase de synergies, et aucune donnée sur les coups de Zidane en tant qu'assist.
- Aucune référence communautaire (vidéos, liens datés) listée dans les sources.
- Pas de mécanique unique documentée pour ce personnage.
- Le tableau Forces/Faiblesses du wiki est vide et le champ assist gain des coups n'est pas renseigné.

### Kuja
- Overview du wiki non rédigé : aucune synthèse d'archétype, aucune liste de forces/faiblesses, aucun historique compétitif côté joueur — d'où les champs overview, strengths et weaknesses à null.
- Aucun gameplan joueur documenté (overview vide, section combos vide, notes de coups limitées aux descriptions du jeu) — gameplan à null.
- Page matchups à l'état de stub, sans contenu exploitable dans l'overview — matchups à null.
- Pas de mécanique unique documentée — uniqueMechanics à null.
- Aucune technique avancée spécifique à Kuja joueur dans les sources — advancedTech à null.
- Notes de coups joueur limitées aux descriptions officielles et aux intros de sections (variantes de distance, plafond de 16 coups en coin) : aucune analyse d'usage compétitif coup par coup.
- Section builds sans texte : un seul build en tableaux bruts, second onglet vide, aucune recommandation d'attaques.
- Aucune référence communautaire listée ; champ assist gain des coups non renseigné.

### Tidus
- L'overview extrait du wiki est presque exclusivement consacré à l'EX Mode : aucune synthèse générale d'archétype, de neutral ou d'historique compétitif n'y figure — l'accroche et l'archétype sont déduits des notes de coups et de la section builds.
- Page matchups à l'état de stub et overview sans contenu matchup — matchups à null ; les adaptations par adversaire ne sont documentées qu'à travers les builds (anti-Emperor, anti-Sephiroth) et les recommandations d'attaques.
- Pas de mécanique unique documentée — uniqueMechanics à null.
- Aucune fiche chiffrée de l'EX Burst (nom, dégâts, déroulé) dans les données ; seuls les effets de l'EX Mode sont listés, et Mirror Dash comme Caladbolg (DODGE) ne sont pas expliqués.
- Un seul combo solo documenté (Dart & Weave > DC > Hop Step) ; la page combos dédiée n'est pas extraite.
- Champ assist gain des coups non renseigné ; deux références vidéo du wiki sont listées sans titre (URL brute).

### Jecht
- Extraction des braveries et des HP très fragmentaire : Jecht Rush, Jecht Stream, Jecht Block, Triumphant Grasp et Ultimate Jecht Shot n'ont pas de fiche individuelle dans les données, et plusieurs entrées de coups (Neutral 3, Jecht Blade niveau 1) sont dépourvues de nom — leurs informations ont été reversées dans le gameplan et les autres sections.
- Section combos non documentée : la page de combos dédiée mentionnée par le wiki n'est pas extraite.
- Matchups : seul The Emperor est rédigé ; le reste de la page n'est qu'une liste de noms sans analyse.
- Builds : la page principale « Jecht (012) Builds » n'est pas extraite ; seuls deux builds (Side by Side et Hybrid Seal of Lufenia) figurent dans les données, et certaines sous-sections (Basic Abilities et CP Allocation du build Lufenia) sont vides.
- Champ assist gain des coups non renseigné ; startups absents sur les chaînes de combo extraites.
- Le build Center of the World est cité mais jamais détaillé dans les sources.

### Yuna
- La page matchups du wiki est un stub : aucune analyse détaillée par personnage.
- La section assist de la page prévoit des onglets Tidus, Jecht et Sephiroth, mais seuls les contenus concernant Kuja sont renseignés.
- Le second build (« Build #2 ») est un gabarit vide : stats, équipement et attaques non renseignés.
- Aucune référence communautaire datée ou sourcée (section References vide) : communityTech laissé vide.
- Pas de section « Unique Mechanics » documentée pour Yuna : champ laissé à null.

### Shantotto
- Pas de texte d'overview sur la page (seul le tableau forces/faiblesses est renseigné) : champ overview laissé à null et gameplan reconstruit uniquement depuis ce tableau.
- La page matchups du wiki est un stub et aucune information de matchup n'apparaît ailleurs : champ matchups laissé à null.
- Aucune section combos renseignée (sous-section Solo vide) malgré la conversion présentée comme sa force principale.
- Notes d'usage détaillées absentes pour la plupart des coups (Stun, Bind, Bio, Retribution et les six Spirit Magic n'ont que la description du jeu et les frame data) ; la note d'A Couple Attacks est tronquée dans les données sources.
- Aucune technique avancée spécifique nommée dans les sources : advancedTech laissé à null.
- Pas de section « Unique Mechanics » documentée : champ laissé à null.
- Section assist non documentée au-delà d'une phrase ; valeurs d'assist gain absentes des tableaux de coups ; section References vide : communityTech laissé vide.

### Prishe
- La page matchups du wiki est un stub : aucune analyse détaillée par personnage (seuls les exemples cités dans l'overview ont pu être repris).
- Aucune section combos renseignée (sous-section Solo vide) : pas de routes de combo détaillées au-delà des mentions de l'overview et de la section Skillchain.
- Le timing exact de la charge raccourcie de One Inch Punch (Two) en finisher est explicitement non documenté dans les sources.
- Aucune technique avancée spécifique nommée en dehors des Skillchains (traitées dans uniqueMechanics) : advancedTech laissé à null.
- Le second build (« Build #2 ») est un gabarit vide et les slots d'attaques du build principal ne sont pas renseignés.
- Valeurs d'assist gain absentes des tableaux de coups ; section References vide : communityTech laissé vide.

### Vaan
- La page matchups du wiki est un stub : seuls les repères de l'overview et de la note de Greatsword (Cecil, Cloud, Squall) ont pu être repris.
- Aucune section combos renseignée (sous-section Solo vide) : les « combos infinis » mentionnés dans l'overview ne sont détaillés nulle part.
- Pas de section « Unique Mechanics » documentée : le Switch n'est décrit que dans l'overview et l'intro des braveries, d'où uniqueMechanics laissé à null et la mécanique traitée dans overview et gameplan.
- Notes d'usage détaillées absentes pour la plupart des coups : seuls Sword & Shield (version EX) et Greatsword ont de vraies notes ; le reste se limite aux descriptions du jeu et aux frame data.
- Le second build (« Build #2 ») est un gabarit vide ; valeurs d'assist gain absentes des tableaux de coups.
- Section References vide et aucune mention communautaire datée : communityTech laissé vide.

### Gabranth
- Section combos non documentée : l'onglet « Solo » de la page est vide.
- Page matchups dédiée à l'état d'ébauche (stub) ; seules les tendances générales de l'overview sont reprises ici.
- Section assist marquée non documentée : uniquement un tableau de données et une phrase de synergies (Kuja, Jecht).
- Deuxième emplacement de build entièrement vide dans les données.
- Valeurs manquantes dans les tables : gain d'assist des coups non renseigné, dégâts et EX Force d'EX Charge notés « ? ».

### Lightning
- La page matchups du wiki est un stub sans contenu, et l'overview ne détaille aucun matchup nommé : matchups à null.
- La section « mécaniques uniques » est marquée non documentée sur le wiki : le Paradigm Shift n'est décrit que dans l'overview et la partie EX Mode de la page (repris ici dans overview, exMode et gameplan), d'où uniqueMechanics à null.
- La section assist est marquée non documentée (une seule phrase générique) : l'évaluation de Lightning en tant qu'assist repose uniquement sur la tier list assist de meta-lite.json.
- Aucune référence externe (section References vide) : communityTech vide.
- Frame data incomplète : startup de Flourish of Steel inconnu (« ? »), dégâts de Crushing Blow non renseignés (« - »), champs cancels et assistGain vides pour tous les coups.
- Les vidéos de combos et la vidéo du magic block de Thunderfall sont mentionnées sans URL exploitable.

### Feral Chaos
- Non classé dans la tier list 2017 : absent de la liste tournoi (note de meta-lite.json), l'overview précisant qu'il a été banni la majeure partie de la vie du jeu pour ses matchups polarisants — d'où tierNote à null.
- La page matchups dédiée est un stub sans contenu : le résumé matchups repose uniquement sur l'overview.
- Aucun combo solo : la page l'indique explicitement et la section combos est marquée non documentée — aucune table de combos exploitables.
- Section assist marquée non documentée : une seule phrase générique sur les assists viables en tournoi.
- Pas de section « mécaniques uniques » dédiée sur le wiki : ses restrictions innées (réduction de bravery, verrous EX/Assist, coûts CP exponentiels) ne sont décrites que dans l'overview — uniqueMechanics à null.
- Le troisième build est entièrement vide et le loadout de coups du build Side By Side n'est pas renseigné dans les données extraites.
- Aucune référence externe (section References vide) : communityTech vide.
- Champs cancels et assistGain vides pour tous les coups ; dégâts de Flagro Maximus non renseignés (« - »).

### Aerith Gainsborough
- Personnage assist uniquement : aucune donnée joueur — statistiques d'infobox toutes à « - », sections EX Mode, mécaniques uniques, combos, builds et assist marquées non documentées. Les champs joueur (exMode, uniqueMechanics, builds) sont donc à null.
- Non classée dans la tier list joueur 2017 (assist uniquement) : tierNote à null.
- La section overview extraite ne contient aucune présentation rédigée — uniquement un combo de Cloud et une mention de vidéo : l'overview ci-dessus est synthétisé à partir des notes de ses quatre coups d'assist et de meta-lite.json.
- Le champ « name » des coups est vide dans les données : les intitulés de groupes (Cure, Seal Evil, Planet Protector, Holy) servent de clés dans moveNotes.
- Frame data incomplète : startup, position, spawn, effets et priorités listés comme variantes sans valeurs (« ? »), et la sous-section « Seal Evil combos » est vide.
- Page matchups en stub et aucune référence externe : matchups à null et communityTech vide.

## Questions ouvertes

1. Passe « tech communautaire » GameFAQs/Steam/YouTube pour étoffer la section 9 : validée par Jonath, **en attente de son go**.
2. Hébergement : local pour le moment (décision Jonath) ; GitHub Pages/Netlify possibles sans modification.
