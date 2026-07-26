# Guides Dissidia 012 [duodecim] Final Fantasy

**Site en ligne : https://serial-developer.github.io/duodecim-guides/**

Site statique de guides compétitifs français pour les 31 personnages jouables de *Dissidia 012 [duodecim] Final Fantasy* (PSP, 2011), plus une fiche assist pour Aerith et un créateur de builds. Données extraites de [dissidia.wiki](https://dissidia.wiki) (CC BY 4.0), enrichies de sources communautaires d'époque (GameFAQs, dissidiaforums via la Wayback Machine, guides Steam, vidéos de joueurs) — chaque affirmation est sourcée.

Aucun framework, aucune dépendance au runtime : 44 pages HTML statiques générées par des scripts Node, hébergées sur GitHub Pages.

Le déploiement est automatique : tout push sur `main` republie `dist/` via GitHub Actions (`.github/workflows/pages.yml`). `dist/` est commité — il n'y a aucun build en CI.

## Licence en bref

| Contenu | Licence |
|---|---|
| Code, scripts, templates, design | [MIT](LICENSE) |
| Textes français originaux (`data/editorial/`) | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr) — © 2026 Serial |
| Données de jeu (frame data, movesets, tier list) | CC BY 4.0, dissidia.wiki |
| Équipements et accessoires | CC BY-SA 3.0, Final Fantasy Wiki |
| Personnages, artworks, éléments de jeu | © Square Enix — site de fans non commercial |

Détail source par source : **[NOTICE.md](NOTICE.md)**.

## Lancer le site

```
npx serve dist
```

ou ouvrir directement `dist/index.html` dans un navigateur.

## Re-générer

```
npm install          # une seule fois (cheerio, @resvg/resvg-js)
npm run scrape       # récupère les pages wiki -> cache/ (jamais re-fetché si présent ; --force pour forcer)
npm run parse        # cache/ -> data/characters/*.json + data/meta.json
npm run scrape:build # sources du créateur de builds (dissidia.wiki + Final Fantasy Wiki) -> cache/
npm run parse:build  # cache/ -> data/build/*.json
npm run images       # portraits + icônes via la Wayback Machine -> assets/
npm run og           # images de partage 1200×630 -> assets/og/ (--force pour régénérer)
npm run build        # data/ + src/ -> dist/ (+ sitemap.xml, 404.html, humans.txt)
npm run qa           # vérifications : ressources locales, ancres, anti-invention, métadonnées, sitemap
npm run qa:links     # idem + vérification réseau des liens externes
npm run coverage     # reports/coverage.md
```

Après toute modification d'éditorial : `npm run build && npm run qa`, puis commit **incluant `dist/`**.

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

## Référencement

Tout est généré au build depuis les données existantes — aucune balise n'est écrite à la main page par page.

| Élément | Généré par | Sortie |
|---|---|---|
| `<title>`, description, canonical, Open Graph, Twitter Card | `pageShell()` dans `src/templates/helpers.mjs` | dans chaque `<head>` |
| Titles/descriptions des guides | `guideTitle()` / `guideDescription()` dans `src/templates/guide.mjs`, à partir de `archetype`, `tagline` et du tier réel | 32 fiches |
| JSON-LD (`WebSite`, `TechArticle`, `Article`, `WebApplication`) | `src/templates/jsonld.mjs` | 43 pages |
| `sitemap.xml`, `404.html`, `humans.txt` | `scripts/seo.mjs`, appelé par `build.mjs` | `dist/` |
| Images de partage 1200×630 | `scripts/make-og-images.mjs` | `assets/og/` |
| `lastmod`, `datePublished`, `dateModified` | `scripts/git-dates.mjs` (historique git, jamais la date du build) | sitemap + JSON-LD |

L'URL du site vit dans **une seule constante**, `SITE_URL` de [`src/site-config.mjs`](src/site-config.mjs). GitHub Pages sert ce dépôt comme *project site* (`…github.io/duodecim-guides/`) : toute URL absolue doit inclure ce segment, et un chemin relatif casserait canonical, sitemap et `og:image`.

### Se faire indexer (à faire une fois, à la main)

**1. Google Search Console** — <https://search.google.com/search-console>

1. « Ajouter une propriété » → type **Préfixe d'URL** (pas « Domaine » : celui-ci exige un accès DNS que GitHub Pages ne donne pas sur un sous-domaine `github.io`).
2. Saisir exactement `https://serial-developer.github.io/duodecim-guides/` — avec le slash final. Une propriété de préfixe d'URL ne couvre que ce chemin.
3. Vérification : choisir **Balise HTML**, copier la valeur de l'attribut `content` (pas la balise entière), la coller dans `SITE_VERIFICATION.google` de [`src/site-config.mjs`](src/site-config.mjs), puis `npm run build && npm run qa` et commiter en incluant `dist/`. Attendre le déploiement (Actions → « Deploy GitHub Pages », ~1 min), puis cliquer « Vérifier ».
   *Alternative si la balise pose problème : la méthode « Fichier HTML » demande un fichier à la racine du domaine, hors de portée sur un project site. Rester sur la balise.*
4. Sitemaps → soumettre `sitemap.xml` (chemin relatif, la console le préfixe).
5. Inspection de l'URL → coller l'accueil → « Demander l'indexation ». Répéter pour `createur-de-builds.html`, `techniques.html` et deux ou trois guides des personnages les plus recherchés (Exdeath, Prishe, Lightning). Le quota est d'une dizaine de demandes par jour : le sitemap se charge du reste.

**2. Bing Webmaster Tools** — <https://www.bing.com/webmasters>

Le plus rapide est **« Importer depuis Google Search Console »** : propriété, vérification et sitemap sont reprises en un clic. Sinon, ajouter le site manuellement et coller la valeur de `msvalidate.01` dans `SITE_VERIFICATION.bing`, même procédure que ci-dessus. Bing alimente aussi DuckDuckGo et Ecosia.

**3. Pas de `robots.txt`** — et c'est sans conséquence. Les robots ne lisent ce fichier qu'à la racine du domaine (`https://serial-developer.github.io/robots.txt`), servie par un repo `Serial-Developer.github.io` qui n'existe pas ; un `robots.txt` dans `dist/` serait servi sous `/duodecim-guides/` et **ignoré**. Son absence équivaut à « tout le crawl est autorisé », et sa seule fonction utile — déclarer la ligne `Sitemap:` — est remplie par la soumission directe ci-dessus. Pour en avoir un malgré tout, il faudrait créer le repo user site et y placer le fichier.

**4. Comptez en semaines.** Un site neuf sans lien entrant met généralement une à trois semaines à apparaître. Le levier qui compte ensuite n'est pas technique : ce sont les liens entrants (Discord DISSIDIA, r/DissidiaOO, GameFAQs, wiki) — les aperçus Open Graph sont là pour rendre ces partages cliquables.

## Architecture

```
cache/            HTML bruts du wiki (non versionnés)
data/characters/  extraction structurée par perso (stats, coups, frames…)
data/build/       données du créateur de builds (équipements, accessoires, abilities…)
data/editorial/   prose française (rédigée, un JSON par perso + _shared.json + _install.json)
data/meta.json    tier lists, vitesses, techniques universelles
scripts/          scrape / parse / parse-meta / fetch-images / build / qa / coverage
                  + scrape-builddata / parse-builddata / build-data-bundle / wikitext
                  + seo / git-dates / image-size / make-og-images
src/site-config.mjs  SITE_URL, signature, balises de vérification des moteurs
src/templates/    templates JS (landing « écran de sélection », guide, techniques, install)
                  + jsonld.mjs (données structurées schema.org)
src/scripts/      JS client (menu du site, calendrier, créateur de builds)
src/styles/       design system (nuit violette, Cinzel/Inter)
assets/           portraits + icônes + images de partage (copiés dans dist/ au build)
dist/             site final (+ sitemap.xml, 404.html, humans.txt)
reports/          couverture, logs de scrape/parse, rapport de référencement
LICENSE           MIT (code) + CC BY-NC-ND 4.0 (textes) + licences des sources
NOTICE.md         origine et licence de chaque contenu
```

Les images officielles proviennent des fichiers du wiki via la Wayback Machine (le CDN `resources.dissidia.wiki` est en panne depuis ~2026). Attribution complète en pied de page du site.
