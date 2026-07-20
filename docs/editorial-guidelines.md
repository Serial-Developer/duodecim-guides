# Consignes éditoriales — data/editorial/{slug}.json

## Mission
Pour chaque personnage assigné, lire `data/characters/{slug}.json` (données extraites de dissidia.wiki) et écrire `data/editorial/{slug}.json` : la prose FRANÇAISE du guide. Le site est généré en croisant les deux fichiers : les tableaux de stats et de coups viennent des données brutes, TOI tu fournis la synthèse rédigée.

## Règles absolues
1. **Zéro invention.** Chaque affirmation doit se déduire du contenu de `data/characters/{slug}.json` (champs `sections.*.text`, `moves[].notes/context/description`, `infobox`, tables) ou de `data/meta.json` (tier list 2017, tier list assist, vitesses). N'ajoute AUCUN fait de mémoire — pas de chiffre, pas de propriété de coup, pas de matchup non documenté. Dissidia 012 uniquement (jamais Dissidia 2008/NT/Opera Omnia).
2. **Si une section source est vide** (`documented: false` ou texte quasi nul) : mets `null` dans le champ correspondant. Le générateur affichera un bandeau « non documenté ». N'essaie pas de combler.
3. **Reformule en français** — jamais de copie verbatim de l'anglais. Les termes techniques restent en anglais quand c'est l'usage compétitif : Wall Rush, Chase, blodge, dash feint, punish, poke, zoning, EX Mode, EX Burst, EX Core, bravery/BRV, HP attack, assist, startup, frame(s), matchup. Les noms de coups restent en anglais EXACTEMENT comme dans les données (ils servent de clés).
4. **Ton** : guide compétitif, précis, direct, deuxième personne du pluriel (« vous ») ou tournures impersonnelles. Pas d'emphase creuse.
5. Orthographe française irréprochable (accents inclus).

## Schéma JSON de sortie (exactement ces clés)
```json
{
  "slug": "…",
  "tagline": "Accroche d'archétype, ≤ 90 caractères (ex. « Rushdown fragile à mixups aériens »)",
  "archetype": "Étiquette courte (ex. « Zoneur à pièges », « Rushdown mêlée »)",
  "overview": ["2 à 4 paragraphes FR — synthèse fidèle de sections.overview.text"],
  "tierNote": "1-2 phrases : position dans la tier list 2017 (meta.json) + ce qu'en dit l'overview. null si non classé (expliquer via limits).",
  "strengths": ["3 à 7 forces, phrases courtes, tirées des sources"],
  "weaknesses": ["2 à 6 faiblesses, idem"],
  "moveNotes": { "Nom Exact Du Coup": "1-3 phrases FR d'usage (synthèse de notes/context/description du coup). Clé = champ name du coup, à l'identique." },
  "exMode": { "summary": ["1-3 paragraphes FR sur le EX Mode (effets exacts documentés)"], "burst": "1-2 phrases sur l'EX Burst" },
  "uniqueMechanics": { "intro": ["paragraphes FR expliquant la mécanique"], "details": ["points additionnels si tables/subs présents"] },
  "gameplan": ["2 à 5 paragraphes : boucle de jeu, neutral, gestion EX/assist — synthèse d'overview + notes de coups + combos"],
  "advancedTech": [{ "name": "nom (garder l'anglais)", "desc": "explication FR" }],
  "matchups": { "summary": ["paragraphes FR"] },
  "builds": { "philosophy": ["paragraphes FR : philosophie des builds documentés, CP, équipement, Equip Glitch si mentionné"], "notes": "précisions éventuelles ou null" },
  "assist": { "asAssist": ["évaluation FR du perso en tant qu'assist (sections.assist + meta assistTierList)"], "recommended": [{ "name": "Nom", "why": "pourquoi, d'après les sources" }] },
  "communityTech": [{ "title": "…", "desc": "FR", "source": "URL exacte tirée de references/texte", "date": "AAAA ou null" }],
  "limits": ["Liste FR de ce que les sources ne documentent PAS pour ce perso (sections vides, données manquantes)"]
}
```
- Tout champ dont la source est vide → `null` (ou `[]` pour communityTech).
- `matchups` : `null` si `sections.matchups.stub` est true ET que l'overview ne contient rien d'exploitable sur les matchups.
- `uniqueMechanics` : `null` si `sections.uniqueMechanics.documented` est false. Ne transpose JAMAIS une mécanique d'un autre opus.
- `advancedTech` : uniquement les techniques SPÉCIFIQUES au perso trouvées dans les sources (souvent dans overview/combos/notes de coups). Les techniques universelles (blodge, dash feint…) sont traitées ailleurs — ne les liste pas, sauf interaction spécifique au perso documentée.
- `moveNotes` : couvre TOUS les coups qui ont notes/context/description non vides. Un coup sans info → ne pas inventer, omettre la clé.
- `communityTech` : uniquement ce qui est attribuable (References du wiki, mentions datées dans le texte). Rien → `[]`.

## Cas particuliers
- `aerith.json` : personnage ASSIST uniquement (DLC Prologus). Schéma identique mais : `tagline`/`archetype` orientés assist, `assist.asAssist` est la section principale (elle est Top tier assist d'après meta.json), `gameplan` = comment l'exploiter en tant qu'assist, sections joueur (builds, matchups…) → null.
- Écris du JSON STRICT (pas de virgule traînante, guillemets doubles échappés). Vérifie avec `node -e "JSON.parse(...)"` avant de terminer.
