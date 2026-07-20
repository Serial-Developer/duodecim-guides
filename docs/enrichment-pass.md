# Passe d'enrichissement — combler les sections vides avec des sources compétitives vérifiées

## Contexte
Certaines sections des guides sont vides parce que dissidia.wiki ne les documente pas. Cette passe les comble avec des sources compétitives EXTERNES vérifiées. La règle « zéro invention » devient : **zéro affirmation sans source vérifiée et citée**.

## Sources acceptables (par ordre de préférence)
1. FAQs/guides GameFAQs de Dissidia 012 (board `605802`, jeu `999740`) — souvent très complets (builds avec équipement, matchups). ⚠️ GameFAQs renvoie 403 aux fetchers : ouvrir les pages dans le navigateur intégré (Browser pane) pour les lire.
2. Threads d'époque du board GameFAQs 605802.
3. Guides Steam Community sur Dissidia 012.
4. dissidiaforums.com via la Wayback Machine (web.archive.org — le forum d'époque de la scène) ; chercher via `web.archive.org/web/*/dissidiaforums.com/*`.
5. Reddit (threads argumentés seulement).
6. Descriptions/contenus de vidéos YouTube de joueurs reconnus (Dissidia Mediawiki, Muggshotter…).

## Règles absolues
1. **Dissidia 012 [duodecim] uniquement** — écarter 2008/NT/Opera Omnia (boards GameFAQs 939394 = 2008, 210982 = NT : INTERDITS).
2. **Chaque URL vérifiée** (page en ligne et contenu réellement lu). Wayback OK pour les sites morts.
3. **Attribution systématique** : chaque section remplie liste ses URLs dans `sourcesBySection` (voir schéma). Auteur/date dans le texte quand pertinent (« d'après le guide de X, 2012 »).
4. Français, reformulé (jamais de traduction verbatim). Termes compétitifs en anglais.
5. **Ne modifier QUE les champs listés** ; ne jamais écraser du contenu existant non vide (compléter seulement). Valider chaque JSON avec node.
6. Si aucune source fiable n'existe pour une section : la laisser telle quelle (le bandeau « non documenté » est honnête).
7. En cas de sources contradictoires entre elles : présenter les deux points de vue attribués, ou s'abstenir.

## Champs autorisés dans data/editorial/{slug}.json
- `overview`, `gameplan`, `strengths`, `weaknesses` : uniquement s'ils sont null/vides actuellement.
- `matchups`: `{ "summary": ["paragraphes FR"] }` — uniquement si null actuellement.
- `builds.philosophy` (si null) et `builds.notes` ; pour un build alternatif documenté chez une source (équipement complet), le décrire en prose dans `philosophy` avec attribution.
- `advancedTech[]` : ajouter des entrées `{ "name", "desc", "source": "URL" }` (le champ source est rendu sous la carte).
- `sourcesBySection`: `{ "overview": [urls], "gameplan": [urls], "matchups": [urls], "builds": [urls] }` — OBLIGATOIRE pour chaque section remplie par cette passe.
- `limits` : retirer les entrées devenues fausses, ajouter ce qui reste introuvable.

## Qualité attendue
Matchups : 2-4 paragraphes utiles (adversaires clés nommés, pourquoi ça gagne/perd, outils à utiliser) valent mieux qu'une liste exhaustive creuse. Builds : stats cibles, pièces d'équipement nommées, accessoires, invocation, et le pourquoi. Toujours ancré dans la source.
