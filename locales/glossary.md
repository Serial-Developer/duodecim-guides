# Glossaire terminologique EN ↔ FR

Ce fichier fige les correspondances entre les termes anglais et français du site.
**L'anglais fait référence** : les noms du jeu sont anglais à l'origine (ce sont
ceux de dissidia.wiki, la source), et la version française les a conservés tels
quels. Traduire vers l'anglais ne consiste donc jamais à retraduire un terme,
mais à restituer sa forme d'origine.

Il complète `docs/style-pass.md`, qui régit la prose française, et sert de
référence à toute traduction — humaine ou outillée.

## Règle cardinale : ce qui ne se traduit jamais

Ces éléments sont des **noms propres** : ils s'écrivent à l'identique dans toutes
les langues, sans exception ni adaptation.

| Catégorie | Exemples |
|---|---|
| Personnages | Warrior of Light, Cloud of Darkness, Feral Chaos, Onion Knight |
| Attaques | Rising Beat, Crushing Blow, Jecht Beam, Nukumi Manju |
| EX Modes et EX Bursts | Trance, Paradigm Shift, Omega Weapon |
| Abilities | Speed Boost+, Jump Times Boost, Riposte |
| Équipements et accessoires | Adamant Chains, Flamberge, Max Booster, Kaiser Knuckles |
| Assists et invocations | Odin, Ifrit, Alexander |
| Rôles et formes | Commando, Ravager, Medic |
| Sets d'équipement | Adamant Chains, Genji |
| Rulesets | Duodecim 22-1, Japan Ranked, Modern Alternate Rules |
| Glitches nommés | Equip Glitch, Assist Storage Glitch |

Un contrôle automatique le vérifie : `npm run i18n:check` compare les chaînes,
et la QA relit chaque page. Tout nom propre présent dans une version doit se
retrouver à l'identique dans l'autre.

Ne se traduisent pas non plus : les **sigles de statistiques** (ATK, DEF, HP,
BRV, CP, LUK), les **unités** (F pour frames) et les **chiffres**.

## Termes FGC conservés en français

Le français du site garde ces termes anglais parce qu'ils sont ceux de la
communauté compétitive — les traduire rendrait le texte moins clair, pas plus.
En anglais, ils sont simplement le mot normal.

Wall Rush · Chase · EX Mode · EX Burst · EX Revenge · EX Force · EX Core ·
assist · bravery / BRV · HP attack · HP link · startup · frame(s) · blodge ·
dash feint · dodge cancel · punish · poke · zoning · mixup · whiff · keepaway ·
rushdown · spacing · camping · trade · setup · tick · buffer · gap closer

Exception documentée : **Starter** et **Finisher** restent tels quels en français
dans le contexte des Skillchains de Prishe (terminologie du wiki).

## Vocabulaire descriptif

Ce que le français traduit, et sa forme anglaise de retour. La colonne « français »
suit `docs/style-pass.md` — un seul terme par concept.

| Anglais | Français | Note |
|---|---|---|
| Base damage | Dégâts de base | libellé de champ |
| Priority | Priorité | |
| Effects | Effets | |
| Cancels | Cancels | terme du jeu, non traduit |
| Assist gain | Gain d'assist | |
| CP (mastered) | CP (maîtrisé) | |
| Ground | Au sol | emplacement d'équipement |
| Aerial / midair | En l'air | le wiki emploie les deux |
| Followups | Followups | conservé en français |
| Run Speed | Vitesse de course | libellé de stat, tableau seul |
| Dash Speed | Vitesse de dash | |
| Fall Speed | Vitesse de chute | |
| Fall Speed Ratio After Dodge | Chute après esquive | abrégé en français, faute de place |
| Exclusive weapons | Armes exclusives | |
| Alignment | Camp | |
| Original game | Jeu d'origine | |
| Equipment set | Set d'équipement | |
| Equip slot | Où l'équiper | libellé de colonne |
| Tournament-illegal | Illégal en tournoi | |
| Not documented | Non documenté | bandeau et étiquettes |
| Gameplan | Plan de jeu | titre de section |
| Advanced tech | Techniques avancées | |
| Community tech | Tech communautaire | |
| Unique mechanic | Mécanique unique | |
| Matchups | Matchups | conservé en français |
| Builds | Builds | conservé en français |
| Overview | Vue d'ensemble | |
| Strengths / Weaknesses | Forces / Faiblesses | |

## Pièges de traduction relevés

- **« ender », « meter »** sont **bannis du français** (anglicismes) et signalés
  par la QA — mais ce sont les termes anglais normaux. La liste des termes bannis
  est donc **par langue** (`scripts/qa.mjs`), jamais partagée.
- **Le pluriel ne se met pas dans un gabarit.** Écrire `{count} équipé{s}` ne se
  traduit pas : l'anglais n'accorde pas « equipped ». Deux clés explicites, une
  par forme (`…One` / `…Many`).
- **L'élision française** (« portrait d'Exdeath », « de Yuna ») est une règle de
  langue, pas une chaîne : elle vit dans le code, appliquée à la seule locale
  française.
- **Les ordinaux** (1ᵉʳ / 1st, 2ᵉ / 2nd) suivent la même logique — `ordinal()`
  dans `src/templates/helpers.mjs`.
- **L'espace avant les deux-points** est obligatoire en français, proscrite en
  anglais. Elle appartient à la chaîne traduite, pas au gabarit qui l'entoure.
- **L'ordre des dates** diffère (« 3 mars 2026 » / « March 3, 2026 ») : le nom du
  mois vient du catalogue, l'ordre du code.
