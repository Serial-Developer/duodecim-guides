# Passe de style — resserrer, clarifier, harmoniser

## Mission
Réécrire la prose française des JSON éditoriaux pour la rendre plus courte, plus claire et cohérente dans ses termes — SANS changer aucun fait, aucun chiffre, aucun nom de coup, aucune clé JSON, aucune URL, aucune structure.

## Règle 1 — Resserrer les paragraphes
Un paragraphe a le droit d'être long pour expliquer, jamais pour tourner autour du pot. Cible : retirer 10 à 20 % des mots des paragraphes verbeux sans perdre une seule information. Traquer : « purement et simplement », « par ailleurs » en chaîne, « il convient de noter que », doubles subordonnées, répétitions d'une phrase à l'autre.

Étalon (validé par Jonath) — avant :
> « Si aucun coup d'un rôle n'est équipé, ce rôle disparaît purement et simplement de la rotation en combat — ne pas équiper de bravery Medic permet ainsi de basculer directement entre Commando et Ravager. Le rôle Commando confère par ailleurs un bonus passif de +1 ATK, qui s'applique aussi à l'EX Burst »

Après :
> « Si on retire tous les coups d'un rôle, il disparaît de la rotation en combat — retirer les attaques du rôle Medic permet de basculer directement entre Commando et Ravager. En outre, le rôle Commando confère un bonus passif de +1 ATK, applicable aussi à l'EX Burst. »

## Règle 2 — Un seul terme par concept, le bon
Les noms d'attaques, de rôles, d'équipements restent en anglais (ils le sont dans le jeu). Mais le vocabulaire descriptif doit être cohérent sur tout le site :

| Interdit | À utiliser |
|---|---|
| « HP de branche », « branche HP », « HP dérivé » | **HP link** |
| « ender », « ender HP », « finisher HP » (hors Skillchain) | **attaque HP de conclusion**, ou reformuler (« pour conclure le combo ») |
| « meter », « économie de meter » | **jauges**, **ressources** |
| « damage » seul | **dégâts** |
| « range » seul | **portée** |

Exceptions : « Starter »/« Finisher » restent tels quels dans le contexte des Skillchains de Prishe (terminologie du wiki) ; les termes FGC établis restent en anglais : Wall Rush, Chase, EX Mode/Burst/Revenge/Force/Core, assist, bravery/BRV, HP attack, HP link, startup, frame(s), blodge, dash feint, dodge cancel, punish, poke, zoning, mixup, whiff, keepaway, rushdown, spacing, camping, trade, setup, tick, buffer.

Étalon — avant : « HP de branche accessible uniquement en rôle Commando, à la suite de Launch. C'est l'ender HP le plus dommageable en dégâts de bravery de ses combos d'assist. »
Après : « HP link accessible uniquement en rôle Commando, à la suite de Launch. C'est l'attaque HP qui inflige le plus de dégâts de bravery dans ses combos d'assist. »

## Règle 3 — Pas d'anglais gratuit
Si un mot n'est ni un nom du jeu ni un terme FGC établi et qu'un mot français naturel existe, utiliser le français. « Son économie de meter est un moteur central » → « L'économie de ses jauges est un moteur central ».

## Ce qu'on ne touche PAS
- Les faits, chiffres, frames, noms de coups/équipements/personnages, attributions (« d'après X, 2012 »), URLs, champs `sources*`, clés JSON, structure des objets/tableaux.
- Les champs non-prose (`slug`, `video`, `source`, `date`…).
- L'anglais des titres d'œuvres et citations de titres de threads/vidéos.

## Procédure
1. Lire le JSON éditorial du personnage, réécrire uniquement les valeurs de prose : `tagline`, `overview`, `tierNote`, `strengths`, `weaknesses`, `moveNotes` (valeurs), `exMode`, `uniqueMechanics`, `gameplan`, `advancedTech[].desc`, `matchups.summary`, `builds.philosophy/notes`, `assist.asAssist` et `recommended[].why`, `communityTech[].desc`, `limits`.
2. Vérifier avec `node -e "JSON.parse(...)"` après chaque fichier.
3. `node scripts/qa.mjs` doit rester à 0 erreur (les clés de `moveNotes` ne changent jamais).
