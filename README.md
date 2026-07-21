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

## Architecture

```
cache/            HTML bruts du wiki (non versionnés)
data/characters/  extraction structurée par perso (stats, coups, frames…)
data/editorial/   prose française (rédigée, un JSON par perso + _shared.json + _install.json)
data/meta.json    tier lists, vitesses, techniques universelles
scripts/          scrape / parse / parse-meta / fetch-images / build / qa / coverage
src/templates/    templates JS (landing « écran de sélection », guide, techniques, install)
src/styles/       design system (nuit violette, Cinzel/Inter)
assets/           portraits + icônes (copiés dans dist/ au build)
dist/             site final
reports/          couverture, logs de scrape/parse
```

Les images officielles proviennent des fichiers du wiki via la Wayback Machine (le CDN `resources.dissidia.wiki` est en panne depuis ~2026). Attribution complète en pied de page du site.
