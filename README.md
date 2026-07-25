# Guides Dissidia 012 [duodecim] Final Fantasy

**Site en ligne : https://serial-developer.github.io/duodecim-guides/**

Site statique de guides compétitifs français pour les 31 personnages jouables de *Dissidia 012 [duodecim] Final Fantasy* (PSP, 2011), plus une fiche assist pour Aerith. Données extraites de [dissidia.wiki](https://dissidia.wiki) (CC BY 4.0), enrichies de sources communautaires d'époque (GameFAQs, dissidiaforums via la Wayback Machine, guides Steam, vidéos de joueurs) — chaque affirmation est sourcée.

Le déploiement est automatique : tout push sur `main` republie `dist/` via GitHub Actions (`.github/workflows/pages.yml`).

## Lancer le site

```
npx serve dist
```

ou ouvrir directement `dist/index.html` dans un navigateur.

## Re-générer

```
npm install          # une seule fois (cheerio)
npm run scrape       # récupère les pages wiki -> cache/ (jamais re-fetché si présent ; --force pour forcer)
npm run parse        # cache/ -> data/characters/*.json + data/meta.json
npm run scrape:build # sources du créateur de builds (dissidia.wiki + Final Fantasy Wiki) -> cache/
npm run parse:build  # cache/ -> data/build/*.json
npm run images       # portraits + icônes via la Wayback Machine -> assets/
npm run build        # data/ + src/ -> dist/
npm run qa           # vérifications : ressources locales, ancres, contrôle anti-invention
npm run qa:links     # idem + vérification réseau des liens externes
npm run coverage     # reports/coverage.md
```

## Ajouter / corriger un personnage

1. Vérifier son entrée dans `scripts/characters.mjs` (nom de page wiki, slug, icône).
2. `npm run scrape` puis `node scripts/parse.mjs <slug>`.
3. Rédiger/corriger `data/editorial/<slug>.json` (prose française — schéma dans `docs/editorial-guidelines.md`). Règle d'or : ne rien écrire qui ne soit adossé à `data/characters/<slug>.json` ou `data/meta.json`.
4. `npm run build && npm run qa`.

## Page « Installer sur PPSSPP »

`dist/install.html` explique l'installation de l'émulateur, la mise en place du jeu, les réglages, le jeu en local et en ligne — une section PC, une section mobile. Le contenu vit dans `data/editorial/_install.json` et le rendu dans `src/templates/install.mjs`.

La page part du principe que le joueur possède déjà un ISO obtenu légalement (dump de son propre UMD) : **aucune source de téléchargement n'y figure et il ne faut pas en ajouter**. Les faits sont adossés à la documentation officielle de PPSSPP et au guide `Online_Setup_(PPSSPP)` du wiki ; les sources sont listées section par section et en pied de page.

## Page « Créateur de builds »

`dist/createur-de-builds.html` permet de composer un build complet — attaques, abilities, équipement (arme / main / tête / corps), dix accessoires, assist et invocation — avec jauge de CP, contrôle de légalité tournoi et récapitulatif des statistiques. Tout se passe dans le navigateur : aucune donnée n'est envoyée nulle part.

**Re-scraper les données.** `npm run scrape:build` puis `npm run parse:build`. Le cache disque n'est jamais re-téléchargé sans `--force`, et les requêtes sont espacées de deux secondes. Les listes d'équipements et d'accessoires viennent du Final Fantasy Wiki (CC BY-SA) : ses pages `/wiki/…` répondent 403 aux fetchers, l'extraction passe donc par `api.php?action=parse&prop=wikitext`. Le reste vient de dissidia.wiki (CC BY 4.0). Couverture et trous connus : `reports/build-creator-coverage.md`.

**Schéma de build** (`schemaVersion: 1`) :

```json
{
  "schemaVersion": 1,
  "id": "b…", "name": "…", "character": "lightning",
  "attacks": ["bravery:ground:Launch"],
  "abilities": ["ground-evasion"],
  "equipment": { "weapon": "weapon:zantetsuken-weapon:lv100", "hand": null, "head": null, "body": null },
  "accessories": ["special::heros-spirit", null, null, null, null, null, null, null, null, null],
  "assist": "aerith", "summon": "rubicante", "notes": "…",
  "created": "…", "modified": "…"
}
```

Les identifiants d'équipements et d'accessoires combinent emplacement, nom, niveau et provenance : deux items homonymes (la Flamberge épée et la gunblade de Lightning) restent distincts.

**Formats d'échange.** Le JSON est la référence : export d'un build ou de toute la collection, réimport à l'identique après validation stricte (une version de schéma inconnue, un personnage ou un item introuvable sont refusés avec un message, jamais silencieusement). Le CSV est un export secondaire à plat — une ligne par build, listes agrégées — destiné au tableur. Le lien de partage encode le build en base64url dans l'URL (`?build=…`), sans fichier ni compte.

**Stockage.** Clé `dissidia012.builds.v1` du `localStorage`, plusieurs builds par personnage. Vider les données du site les efface : l'export JSON est la sauvegarde.

## Architecture

```
cache/            HTML bruts du wiki (non versionnés)
data/characters/  extraction structurée par perso (stats, coups, frames…)
data/build/       données du créateur de builds (équipements, accessoires, abilities…)
data/editorial/   prose française (rédigée, un JSON par perso + _shared.json + _install.json)
data/meta.json    tier lists, vitesses, techniques universelles
scripts/          scrape / parse / parse-meta / fetch-images / build / qa / coverage
                  + scrape-builddata / parse-builddata / build-data-bundle / wikitext
src/templates/    templates JS (landing « écran de sélection », guide, techniques, install)
src/scripts/      JS client (menu du site, calendrier, créateur de builds)
src/styles/       design system (nuit violette, Cinzel/Inter)
assets/           portraits + icônes (copiés dans dist/ au build)
dist/             site final
reports/          couverture, logs de scrape/parse
```

Les images officielles proviennent des fichiers du wiki via la Wayback Machine (le CDN `resources.dissidia.wiki` est en panne depuis ~2026). Attribution complète en pied de page du site.
