# Guides Dissidia 012 [duodecim] — mémoire de travail

Site statique de guides compétitifs FR pour *Dissidia 012 [duodecim] Final Fantasy* (PSP, 2011).
**En ligne** : https://serial-developer.github.io/duodecim-guides/ · Repo : `Serial-Developer/duodecim-guides` · Déploiement auto : push sur `main` → GitHub Pages publie `dist/` (`.github/workflows/pages.yml` ; `dist/` est commité, aucun build en CI).

## Règles absolues (ne jamais transiger)
1. **Zéro invention** : chaque fait/chiffre vient de `data/` (extractions dissidia.wiki) ou d'une source externe vérifiée et citée. Section sans source → bandeau « non documenté ». Les enrichissements externes déclarent leurs URLs dans `sourcesBySection`.
2. **Dissidia 012 uniquement** — jamais de contenu Dissidia (2008), NT ou Opera Omnia. Boards GameFAQs interdits : 939394 (2008), 210982 (NT).
3. **Style** (docs/style-pass.md) : prose resserrée, un terme par concept. Bannis : « ender », « meter », « HP de branche » (la QA les détecte). Noms de coups/équipements en anglais ; termes FGC établis conservés (Wall Rush, chase, blodge, punish, gap closer…) ; sinon français naturel. Exception : Starter/Finisher dans les Skillchains de Prishe.
4. Orthographe française irréprochable, accents compris.

## Pipeline (npm run …)
`scrape` (wiki → cache/, jamais re-fetché) → `parse` (→ data/characters/*.json + meta.json) → `images` (Wayback → assets/) → `build` (→ dist/) → `qa` (ressources locales, ancres, anti-invention, termes bannis ; `qa:links` ajoute la vérification réseau) → `coverage` (reports/coverage.md).
Après TOUTE modification d'éditorial : `node scripts/build.mjs && node scripts/qa.mjs` puis commit incluant `dist/`.

## Architecture
- `data/characters/*.json` : extraction structurée par perso (infobox, coups avec frames, sections). Régénérés par `parse` — ne pas éditer à la main.
- `data/editorial/*.json` : prose FR (une fiche par perso + `_shared`, `_multiplayer`, `_install`, `_savedata`, `_tournois`, `_participer`, `_organiser`, `_feral-unlock`). C'est ICI qu'on écrit. Schéma : docs/editorial-guidelines.md ; enrichissements : docs/enrichment-pass.md.
- `src/templates/*.mjs` : templates JS (helpers.mjs contient `siteHeader` — le menu global à 3 catégories — et les générateurs SVG). `src/styles/main.css` : design system nuit violette/or, breakpoints 600/1024.
- `scripts/` : scrape, parse, parse-meta, fetch-images, fetch-move-images, clean-portraits, build, qa, coverage.
- `data/calendar/` : veille tournois automatique (workflow « Veille tournois » planifié).

## Pièges connus (durement acquis)
- **curl Windows → dissidia.wiki exige `--ssl-no-revoke`** ; préférer `fetch` de Node.
- **Toutes les images du wiki sont en panne** (301→404, `resources.dissidia.wiki` ET `/images/`) : portraits/icônes/screenshots viennent de la **Wayback Machine** (`https://web.archive.org/web/20260114if_/<url>`). 165 screenshots de coups n'ont jamais été archivés (reports/move-images-log.json). Aerith n'a aucun portrait (vérifié CDX). Les portraits ont été nettoyés d'un artefact gris au coin (scripts/clean-portraits.mjs) — le refaire si on re-télécharge.
- **GameFAQs renvoie 403 aux fetchers** : lire les pages dans le navigateur ; exclu du check auto de `qa:links`. **YouTube** vérifié via l'API oEmbed (une page watch morte répond 200). dissidiaforums.com est mort : passer par l'index CDX de la Wayback.
- **Le wiki a un balisage cassé** (tabber/tooltip) : le parseur gère marqueurs `|-|Nom=` et `Nom=`, variantes (« X — Level 2 », rendues indentées), tables annexes, sous-sections « Data comparison ». Coups sans nom = régression à corriger dans parse.mjs, pas dans les données.
- **Sessions parallèles** : d'autres sessions Claude travaillent parfois sur ce repo. TOUJOURS `git pull --rebase` avant de pousser ; en conflit, la structure distante gagne et on greffe son ajout (précédent : intégration de multijoueur.html dans le header global).
- File d'attente GitHub Actions parfois bloquée >10 min : `gh run cancel` + relance.

## État au 25/07/2026
Fait : 31 guides complets + fiches Aerith/Feral Chaos ; landing « Player Select » ; pages transverses (techniques, multijoueur, install, savedata, tournois ×3, organiser) ; header global 3 menus ; ~100 apports communautaires sourcés + vidéos ; passe de style intégrale (0 terme banni) ; QA 0/0 ; 265+ liens vérifiés.
Ouvert : rien de bloquant. Idées en attente de demande : tier list alternative post-2017 (n'existe pas sur le wiki), captures de coups manquantes si la Wayback les archive un jour, nom de domaine personnalisé (CNAME).
