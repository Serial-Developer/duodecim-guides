# Passe vidéos & sources communautaires — consignes

## Objectif
Enrichir les JSON éditoriaux avec des vidéos et trouvailles communautaires **vérifiées**, trouvées sur le web (YouTube, GameFAQs board `605802-dissidia-012-duodecim-final-fantasy`, guides Steam, replaytheater.app). En priorité : associer une vidéo de démonstration à chaque technique détaillée.

## Règles absolues
1. **Dissidia 012 [duodecim] (PSP, 2011) uniquement.** Écarte impitoyablement tout contenu Dissidia (2008), Dissidia NT/Arcade (2015+) et Opera Omnia (mobile). Indices de confusion : "NT", "PS4", "arcade", "Opera Omnia", "DFFOO", roster avec Noctis/Ramza/Ace = mauvais opus. En cas de doute → ne pas inclure.
2. **Chaque URL doit être vérifiée** : fais un WebFetch de la page et confirme (a) qu'elle répond, (b) que le titre/contenu mentionne bien Dissidia 012/duodecim ET le sujet visé. Une vidéo YouTube injoignable ou privée → ne pas inclure.
3. **Attribution** : titre exact, auteur/chaîne, année si visible. Pas de contenu manifestement généré par IA.
4. **Ne modifie que les champs listés ci-dessous.** Ne touche à rien d'autre dans les JSON. Valide chaque fichier modifié avec `node -e "JSON.parse(require('fs').readFileSync('<chemin>','utf8'))"`.
5. Textes descriptifs en **français** (les titres d'œuvres restent tels quels).
6. Qualité > quantité : 1 à 4 ajouts par personnage suffisent. Zéro ajout est acceptable si rien de fiable n'existe.

## Champs à modifier

### data/editorial/_shared.json (agent techniques uniquement)
Pour chaque entrée de `techniques[]` et `glitches[]`, ajouter si trouvé :
```json
"video": { "url": "…", "title": "titre exact", "author": "chaîne/auteur", "date": "AAAA ou null" }
```

### data/editorial/{slug}.json (agents personnages)
- Ajouter des entrées à `communityTech[]` (schéma existant : `{"title", "desc", "source", "date"}`) — vidéos de guides/combos d'époque, threads GameFAQs à setups, guides Steam. `desc` = 1-2 phrases FR sur ce que la source apporte. Ne pas dupliquer les entrées existantes.
- Sur les entrées EXISTANTES de `advancedTech[]` : ajouter `"video": {"url", "title", "author", "date"}` UNIQUEMENT si la vidéo démontre précisément cette technique.

## Pistes de recherche
- YouTube : « dissidia 012 {perso} guide », « dissidia duodecim {perso} combo », série « The Essential Guide to Learning {perso} » (2011).
- GameFAQs : `gamefaqs.gamespot.com/boards/605802-dissidia-012-duodecim-final-fantasy` (threads d'époque).
- Steam Community : guides Dissidia 012 (ex. guide Exdeath id 2333236279).
- replaytheater.app/?game=d012&c1={Perso} existe déjà dans les guides — inutile de l'ajouter.
