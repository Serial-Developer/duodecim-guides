# Guides Dissidia 012 [duodecim] — mémoire de travail

Site statique de guides compétitifs FR pour *Dissidia 012 [duodecim] Final Fantasy* (PSP, 2011).
**En ligne** : https://serial-developer.github.io/duodecim-guides/ · Repo : `Serial-Developer/duodecim-guides` · Déploiement auto : push sur `main` → GitHub Pages publie `dist/` (`.github/workflows/pages.yml` ; `dist/` est commité, aucun build en CI).

## Règles absolues (ne jamais transiger)
1. **Zéro invention** : chaque fait/chiffre vient de `data/` (extractions dissidia.wiki) ou d'une source externe vérifiée et citée. Section sans source → bandeau « non documenté ». Les enrichissements externes déclarent leurs URLs dans `sourcesBySection`.
2. **Dissidia 012 uniquement** — jamais de contenu Dissidia (2008), NT ou Opera Omnia. Boards GameFAQs interdits : 939394 (2008), 210982 (NT).
3. **Style** (docs/style-pass.md) : prose resserrée, un terme par concept. Bannis : « ender », « meter », « HP de branche » (la QA les détecte). Noms de coups/équipements en anglais ; termes FGC établis conservés (Wall Rush, chase, blodge, punish, gap closer…) ; sinon français naturel. Exception : Starter/Finisher dans les Skillchains de Prishe.
4. Orthographe française irréprochable, accents compris.

## Pipeline (npm run …)
`scrape` (wiki → cache/, jamais re-fetché) → `parse` (→ data/characters/*.json + meta.json) → `images` (Wayback → assets/) → `og` (images de partage 1200×630 → assets/og/, `--force` pour régénérer) → `build` (→ dist/, plus sitemap.xml/404.html/humans.txt) → `qa` (ressources locales, ancres, anti-invention, termes bannis, intégrité du créateur de builds, métadonnées de référencement et couverture du sitemap ; `qa:links` ajoute la vérification réseau) → `coverage` (reports/coverage.md).
Créateur de builds : `scrape:build` puis `parse:build` (→ data/build/*.json), consommés par `build` qui émet `dist/scripts/build-data.js`.
`i18n:check` : clés manquantes, paramètres d'interpolation perdus, couverture de la prose, chaînes en dur.
Après TOUTE modification d'éditorial : `node scripts/build.mjs && node scripts/qa.mjs` puis commit incluant `dist/`.

## Architecture
- `data/characters/*.json` : extraction structurée par perso (infobox, coups avec frames, sections). Régénérés par `parse` — ne pas éditer à la main.
- `data/build/*.json` : données du créateur de builds (equipment, accessories, abilities, combinations, assists, summons, ruleset, capacity, base-stats). Régénérés par `parse:build` — ne pas éditer à la main. Équipements et accessoires viennent du **Final Fantasy Wiki** (CC BY-SA), le reste de dissidia.wiki.
- `data/editorial/<locale>/*.json` : prose par langue (une fiche par perso + `_shared`, `_multiplayer`, `_install`, `_savedata`, `_tournois`, `_participer`, `_organiser`, `_feral-unlock`). C'est ICI qu'on écrit. Schéma : docs/editorial-guidelines.md ; enrichissements : docs/enrichment-pass.md.
- `locales/<locale>.json` : chaînes d'interface (513 clés). `locales/glossary.md` fige les correspondances EN ↔ FR, l'anglais faisant référence.
- `src/i18n/` : `config.mjs` (**`DEFAULT_LOCALE`** — la constante de bascule, `fr` aujourd'hui), `routes.mjs` (chemins publiés par langue), `t.mjs` (catalogues et repli).
- `src/templates/*.mjs` : templates JS (helpers.mjs contient `siteHeader` — le menu global à 3 catégories —, `pageShell` qui centralise toutes les métadonnées, `siteFooter` avec le copyright, `linkRoster` pour le maillage interne, et les générateurs SVG ; jsonld.mjs pour schema.org). `src/styles/main.css` : design system nuit violette/or, breakpoints 600/1024.
- `src/site-config.mjs` : **source unique** de `SITE_URL`, de la signature (« Serial ») et des balises de vérification Search Console/Bing. Le site est un *project site* GitHub Pages (`…github.io/duodecim-guides/`) : toute URL absolue doit inclure ce segment, passer par `absUrl()`.
- `scripts/` : scrape, parse, parse-meta, fetch-images, fetch-move-images, clean-portraits, build, qa, coverage.
- `data/calendar/` : veille tournois automatique (workflow « Veille tournois » planifié).

## Pièges de l'internationalisation
- **`DEFAULT_LOCALE` décide qui est à la racine.** La langue par défaut est publiée à la racine de `dist/`, les autres sous leur préfixe. Elle vaut **`en` depuis le 27/07/2026** : l'anglais est à la racine, le français sous `/fr/`.
- **`build.mjs` n'efface jamais `dist/`** : il écrit par-dessus. Sans conséquence tant que l'arborescence est stable, mais toute bascule de `DEFAULT_LOCALE` déplace les 44 pages de chaque langue et laisse l'ancien arbre en place — la QA a signalé 236 erreurs (titres dupliqués, `x-default` incohérents, sitemap incomplet). Le remède : `Remove-Item dist -Recurse -Force` puis `node scripts/build.mjs`. Tout `dist/` est régénérable (assets copiés depuis `assets/`, scripts depuis `src/`, HTML et sitemap générés) — aucun fichier n'y est écrit à la main.
- **Une page sans prose dans une langue n'est pas générée** : pas de page à moitié traduite, pas de `hreflang` vers le vide. Exception : la landing (aucune prose propre). Un lien vers une page non traduite vise la version publiée et le déclare (`hreflang` sur le `<a>`).
- **Le sélecteur de langue liste toutes les langues publiées**, même sur une page sans équivalent (repli sur l'accueil de la langue cible) ; les `hreflang` du `<head>`, eux, restent limités aux équivalents réels.
- **Aucune redirection, jamais** : l'URL demandée est toujours servie. C'est ce qui garde les deux versions indexables. Le bandeau de `src/scripts/lang.js` propose, il ne redirige pas — et il est rédigé dans la langue proposée, pas dans celle de la page.
- **Les termes bannis de `qa.mjs` sont par langue** : « ender » et « meter » sont des anglicismes en français, des mots normaux en anglais.
- **Le pluriel ne se met pas dans un gabarit** (`{count} équipé{s}` ne se traduit pas) : deux clés, une par forme. Idem pour l'élision, les ordinaux, l'espace avant « : » et l'ordre des dates — voir `locales/glossary.md`.
- **`git-dates.mjs` suit les renommages** (`git log -M`) : sans cela un `git mv` ferait passer un fichier pour neuf. Un renommage pur (`R100`) ne touche pas `dateModified`.
- **`src/scripts/build-creator.js` ne contient aucun texte** : ses libellés arrivent par `window.BC_I18N` (`src/i18n/build-creator-strings.mjs`). C'est là qu'on ajoute une chaîne.
- **Images de partage par langue** (`assets/og/<locale>/`) : elles portent du texte, `npm run og` les génère pour chaque langue ayant de la prose.

## Pièges connus (durement acquis)
- **curl Windows → dissidia.wiki exige `--ssl-no-revoke`** ; préférer `fetch` de Node.
- **Toutes les images du wiki sont en panne** (301→404, `resources.dissidia.wiki` ET `/images/`) : portraits/icônes/screenshots viennent de la **Wayback Machine** (`https://web.archive.org/web/20260114if_/<url>`). 165 screenshots de coups n'ont jamais été archivés (reports/move-images-log.json). Les portraits ont été nettoyés d'un artefact gris au coin (scripts/clean-portraits.mjs) — le refaire si on re-télécharge.
- **Aerith n'a aucun portrait Dissidia 012** (pas jouable, donc pas d'écran de sélection) : sa page wiki est sans image et l'index CDX n'a qu'une icône 128×32 (un gros plan du visage, pas une planche de 4 vignettes comme les autres). `assets/portraits/aerith.png` est donc un **artwork Final Fantasy VII**, mis au carré 512×512 ; l'alt du template et NOTICE.md le déclarent — ne pas le présenter comme un portrait 012.
- **finalfantasy.fandom.com sert du WebP même pour une URL en `.png`** : resvg ne le décode pas (image vide, ~2 ko). Ajouter `?format=original` à l'URL du fichier pour obtenir le PNG réel. L'en-tête `Accept` ne suffit pas.
- **Portraits : toujours carrés** (256 ou 512). Le CSS ne pilote que la largeur (`.hero img.portrait`), un portrait au ratio libre rendrait le hero deux fois plus haut que les autres.
- **GameFAQs renvoie 403 aux fetchers** : lire les pages dans le navigateur ; exclu du check auto de `qa:links`. **YouTube** vérifié via l'API oEmbed (une page watch morte répond 200). dissidiaforums.com est mort : passer par l'index CDX de la Wayback.
- **Le wiki a un balisage cassé** (tabber/tooltip) : le parseur gère marqueurs `|-|Nom=` et `Nom=`, variantes (« X — Level 2 », rendues indentées), tables annexes, sous-sections « Data comparison ». Coups sans nom = régression à corriger dans parse.mjs, pas dans les données.
- **Sessions parallèles** : d'autres sessions Claude travaillent parfois sur ce repo. TOUJOURS `git pull --rebase` avant de pousser ; en conflit, la structure distante gagne et on greffe son ajout (précédent : intégration de multijoueur.html dans le header global).
- File d'attente GitHub Actions parfois bloquée >10 min : `gh run cancel` + relance.

## Pièges du créateur de builds
- **finalfantasy.fandom.com renvoie 403 sur `/wiki/…`** : passer par `api.php?action=parse&prop=wikitext`. Attention aux pages jumelles Dissidia 2008 (filtrer sur la classe CSS `D012`).
- **Homonymes** : « Flamberge » (épée / gunblade de Lightning), « Claymore » (niv. 1 / niv. 30 Labyrinthe), « Summon Unused » (soi / adversaire), paliers d'abilities (`Speed Boost` / `+` / `++`, `Ω`). Les identifiants intègrent ce qui les distingue — ne pas « simplifier » les slugs.
- **Le wiki oublie le `+` d'un « Jump Times Boost »** (20 et 40 CP sous le même nom) : l'identifiant est suffixé par le coût, le nom affiché reste fidèle.
- **Coups à déclinaisons** : une ligne portant `variants` est le coup équipable, les lignes suivantes en sont les versions (Jecht : « Ground (Up) » existe sous deux parents).
- **Sets « à trois pièces » listent quatre pièces** : trois suffisent (d'où la mention « (1/3) » sur chaque pièce).
- **Le payload est déterministe** : `dist/scripts/build-data.js` (355 ko, commité) ne doit changer que si les données changent. Son champ `dataModified` vient de git (`datesFor` sur `data/build/*.json` + `data/characters/*.json`), jamais de `new Date()` — sinon chaque build produit un faux diff de 355 ko. Aucun code ne lit ce champ (ni `build-creator.js`, ni `qa.mjs`) : il est purement informatif.
- **Vérification de référence** : le build « Adamant Chains + EX » de Lightning du wiki (HP 10972, BRV 957, ATK 177, DEF 185) doit être retrouvé exactement — c'est le test qui valide le modèle de calcul.
- Le serveur de preview `python -m http.server` coupe parfois le chargement de `build-data.js` (~310 ko) : recharger. `npx serve dist` ne présente pas le problème.

## Pièges du référencement
- **`robots.txt` est impossible ici** : les robots ne le lisent qu'à la racine du domaine (`serial-developer.github.io/robots.txt`), servie par un repo user site qui n'existe pas. Un fichier dans `dist/` serait ignoré. Son absence = tout le crawl autorisé ; le sitemap se soumet directement en Search Console. Idem pour IndexNow (clé à la racine).
- **`.nojekyll` inutile** : `build_type: workflow`, l'artefact n'est pas traité par Jekyll.
- **Les dates viennent de git**, jamais du build (`scripts/git-dates.mjs`) : sinon chaque régénération prétendrait que le contenu a changé. Sans git, les dates sont omises.
- **Le `404.html` a ses liens et sa CSS en URL absolue** : GitHub Pages le sert à n'importe quelle profondeur, un chemin relatif se résoudrait depuis un dossier inexistant. Conséquence assumée : sans style en local hors ligne.
- **Maillage des matchups** : « Cloud » et « Chaos » ne sont jamais liés (ambigus), et un nom suivi d'un mot capitalisé non plus (c'est un nom de coup, « Jecht Beam »). Ne pas « améliorer » cette règle sans traiter les faux positifs.
- **Images OG** : générées par `npm run og` avec Times New Roman (repli du design system — Cinzel n'est pas installée localement, elle est servie par Google Fonts). Commitées dans `assets/og/`, donc rendu figé.
- La liste des pages contrôlées par `qa.mjs` est **découverte en lisant `dist/`** — la version écrite à la main oubliait `multijoueur.html`, qui n'a été contrôlée par aucun test jusqu'au 26/07/2026.

## État au 26/07/2026
Fait : 31 guides complets + fiches Aerith/Feral Chaos ; landing « Player Select » ; pages transverses (techniques, multijoueur, install, savedata, tournois ×3, organiser) ; header global 3 menus ; ~100 apports communautaires sourcés + vidéos ; passe de style intégrale (0 terme banni) ; QA 0/0 ; 265+ liens vérifiés.
Créateur de builds en ligne (createur-de-builds.html, sous-menu dédié) : 5 onglets, jauge CP 450/510, règles du jeu appliquées (3 emplacements par catégorie posture × style, enchaînements et HP links imbriqués sans emplacement, 12 groupes d'exclusions d'abilities, exemplaires d'accessoires 1/2/3 selon rang S/A/B), localStorage, export JSON/CSV, lien de partage. 670 équipements, 551 accessoires, 122 abilities, 31 HP links, 25 sets. Le modèle de calcul est validé contre le build « Adamant Chains » de Lightning du wiki.

Passe de référencement et de paternité (branche `feature/seo`, rapport dans `reports/seo.md`) : canonical absolu, Open Graph et Twitter Cards avec 34 images 1200×630, JSON-LD (WebSite/TechArticle/Article/WebApplication), sitemap.xml généré au build, 404.html, humans.txt, titles et descriptions composés depuis `archetype`/`tagline`/tier, maillage interne des matchups, width/height sur les 289 images, LICENSE (MIT + CC BY-NC-ND 4.0) et NOTICE.md, footer signé « © 2026 Serial ». QA 0/0, 43 pages atteignables sans JS à profondeur 1.

Internationalisation (branche `feature/i18n`, rapport dans `reports/i18n.md`) : socle bilingue EN/FR, français par défaut. 513 clés d'interface traduites des deux côtés (y compris les ~200 libellés du créateur de builds, désormais injectés par `window.BC_I18N`), routage par langue, sélecteur dans le header, bandeau de proposition sans aucune redirection, `hreflang` réciproques contrôlés par la QA, sitemap multilingue, images de partage par langue, `npm run i18n:check`. QA 0/0. **La prose anglaise est complète depuis le 26/07/2026** : 41/41 fichiers, 120 836 mots, 43 pages publiées de chaque côté, 86 URLs au sitemap. **Bascule faite le 27/07/2026** : `DEFAULT_LOCALE = 'en'`, l'anglais à la racine, le français sous `/fr/`. À faire à la main en conséquence : resoumettre le sitemap en Search Console, les anciennes URLs françaises de la racine servant désormais l'anglais (aucune redirection n'est possible ni souhaitée).

Ouvert : rien de bloquant. **À faire à la main** (checklist complète en fin de `reports/seo.md`) : créer la propriété Search Console de type *Préfixe d'URL*, remplir `SITE_VERIFICATION` dans `src/site-config.mjs`, soumettre le sitemap, importer dans Bing, puis partager sur le Discord DISSIDIA et r/DissidiaOO — c'est le seul levier de positionnement restant. Idées en attente de demande : page « À propos / Crédits », tier list alternative post-2017 (n'existe pas sur le wiki), captures de coups manquantes si la Wayback les archive un jour, nom de domaine personnalisé (débloquerait robots.txt et IndexNow).

