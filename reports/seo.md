# Passe de référencement et de paternité — rapport

Branche `feature/seo` · 26 juillet 2026 · 44 pages HTML, 43 indexables.

## 1. Audit initial

### Situation d'hébergement (vérifiée via l'API GitHub)

| Point | Constat |
|---|---|
| Type de site | **Project site** — `https://serial-developer.github.io/duodecim-guides/` |
| `cname` | `null` — aucun domaine personnalisé |
| `build_type` | `workflow` (l'artefact `dist/` est servi tel quel) |
| `custom_404` | `false` |
| Repo user site `Serial-Developer.github.io` | **inexistant** (404 sur l'API) |

Deux conséquences structurantes : toute URL absolue doit inclure le segment
`/duodecim-guides` (d'où la constante unique `SITE_URL`), et `.nojekyll` est
inutile — avec `build_type: workflow` l'artefact ne passe pas par Jekyll, et
`dist/` ne contient de toute façon aucun fichier commençant par un underscore.

### Problèmes classés par impact

**Bloquant — le site ne pouvait pas être découvert**

1. Aucun `sitemap.xml`. Sans lien entrant et sans sitemap soumis, Google n'avait
   aucun point d'entrée vers les 44 pages.
2. Aucun `canonical`. Rien n'identifiait l'original — c'est aussi le pilier
   technique de la paternité.

**Fort**

3. Aucune balise Open Graph ni Twitter Card : un lien partagé sur Discord ou
   Reddit s'affichait en texte nu. C'est ce qui plafonne le taux de clic, donc
   les liens entrants, donc l'indexation.
4. Aucune donnée structurée JSON-LD.
5. Pas de `404.html`.

**Moyen**

6. Titles et descriptions interchangeables. Ils existaient sur les 44 pages et
   aucun n'était dupliqué, mais les 31 guides partageaient le même gabarit avec
   le seul nom qui changeait, sans exploiter `archetype` ni `tagline` — pourtant
   renseignés sur les 32 fiches. Aucune requête longue n'était ciblée.
7. 227 balises `<img>` sans `width`/`height` → décalage de mise en page au
   chargement (CLS).
8. Maillage interne faible : les personnages cités dans les matchups
   n'étaient pas liés à leur guide.

**Déjà conforme — aucune intervention**

- **Crawlabilité.** Le risque principal identifié dans le cahier des charges
  était déjà écarté : la grille « Player Select » est du HTML statique avec de
  vrais `<a href>`. Les 31 guides étaient atteignables sans JavaScript.
- `<html lang="fr">`, `charset`, `viewport` corrects partout ; un seul `<h1>` par
  page ; tous les `<img>` avec un `alt` descriptif ; `font-display: swap` déjà
  présent ; `:focus-visible` et `prefers-reduced-motion` en place.

### Écarts constatés avec le cahier des charges

- Le brief supposait les métadonnées absentes : elles existaient et étaient
  uniques. Le travail a donc été un enrichissement, pas une création.
- Le brief redoutait une grille rendue en JavaScript : elle était statique.
- `.nojekyll` demandé mais inutile ici (justifié ci-dessus).
- Le footer d'attribution **existait déjà** (Square Enix, CC BY 4.0, CC BY-SA
  3.0). Il manquait la mention de copyright et le lien vers la licence.
- `package.json` déclarait `"license": "ISC"` sans aucun fichier `LICENSE` —
  incohérence corrigée.
- Pas de `SearchAction` dans le JSON-LD : le site n'a pas de recherche interne,
  la déclarer aurait envoyé les moteurs vers une URL inexistante.

## 2. Corrections apportées

### Fondations

- **`src/site-config.mjs`** : source unique pour `SITE_URL`, la signature, le
  jeu documenté et les balises de vérification des moteurs. `absUrl()` compose
  toutes les URLs absolues du site.
- **`canonical` absolu** sur les 43 pages indexables.
- **`404.html`** aux couleurs du site, en `noindex, follow`, avec liens de
  retour. Ses liens et sa feuille de style sont en URL absolue : GitHub Pages le
  sert pour toute URL manquante à n'importe quelle profondeur, où un chemin
  relatif se résoudrait depuis un dossier inexistant.
- **`width`/`height` sur les 289 `<img>`** du site, dimensions lues dans les
  en-têtes PNG/JPEG (`scripts/image-size.mjs`).
- **`characters/chaos.html`** (page de redirection) passe en `noindex`, avec un
  canonical absolu vers sa destination, et reste hors du sitemap.

### Métadonnées

- **Gabarit de title** : `Prishe — Guide Dissidia 012 [duodecim] : coups,
  builds, matchups`. Au-delà de 65 caractères, `[duodecim]` est retiré
  automatiquement — c'est le cas des noms longs (Warrior of Light, Cloud of
  Darkness).
- **Descriptions composées** depuis `archetype`, `tagline` et le tier réel :
  *« Guide compétitif de Prishe (tier S) dans Dissidia 012 [duodecim] : rushdown
  défensif à chaînes de braveries. Frame data, plan de jeu, builds et
  matchups. »* Aucun fait n'est ajouté ; si un champ manque, le gabarit se
  replie au lieu d'inventer.
- **Open Graph et Twitter Card** complets, `summary_large_image`, image en URL
  absolue avec dimensions et texte alternatif.
- **34 images de partage 1200×630** (`scripts/make-og-images.mjs`) : portrait
  officiel, nom, jeu d'origine, tagline et tier, dans l'identité violette/or du
  site. Aucun appel réseau, aucune image générée par IA.
- **JSON-LD** : `WebSite` sur l'accueil, `TechArticle`/`Article` sur les guides
  et les pages transverses, `WebApplication` sur le créateur de builds. Toutes
  les pages partagent la même entité `VideoGame` et le même auteur, ce qui
  rattache le site à un sujet et à une signature identifiables.
- **Dates réelles** : `datePublished` et `dateModified` viennent de l'historique
  git des fichiers sources (`scripts/git-dates.mjs`), jamais de la date du
  build — qui prétendrait à tort que le contenu a changé à chaque régénération.
  Sans git disponible, les dates sont omises plutôt que fabriquées.
- **`sitemap.xml`** bâti depuis les pages réellement écrites au build : il ne
  peut ni lister une URL inexistante ni oublier une page. `changefreq` et
  `priority` sont volontairement absents (ignorés par Google depuis des années).
- **`humans.txt`**.

### Maillage interne

- Les personnages cités dans la prose des matchups deviennent des liens vers
  leur guide. Trois garde-fous contre les faux liens : les noms les plus longs
  passent d'abord, un nom suivi d'un mot capitalisé n'est pas lié (c'est un nom
  de coup — « Jecht Beam », non le personnage), et une seule occurrence est liée
  par personnage. Les noms ambigus sont explicitement exclus : « Cloud » peut
  désigner Cloud Strife ou Cloud of Darkness, « Chaos » le boss ou Feral Chaos.
- Lien contextuel vers le créateur de builds dans la section Builds de chaque
  guide, en plus du header global.
- Résultat : **profondeur de crawl maximale de 1** depuis l'accueil, les 43
  pages atteignables sans JavaScript.

### Paternité et licence

- **`LICENSE`** en quatre sections : code et design sous MIT ; textes français
  originaux sous CC BY-NC-ND 4.0 ; données de jeu sous la licence de leur source
  (CC BY 4.0 dissidia.wiki, CC BY-SA 3.0 Final Fantasy Wiki) ; propriété Square
  Enix.
- **`NOTICE.md`** : origine, emplacement et licence de chaque contenu, plus les
  sources communautaires citées et les outils.
- **Footer** sur les 44 pages : copyright « © 2026 Serial », lien vers la
  licence, attributions, et un `<details>` détaillant les régimes.
- **`package.json`** : `license: MIT`, auteur, homepage, repository.
- **README** : licence en tableau, procédure de référencement pas-à-pas,
  architecture à jour.

### Contrôles ajoutés à la QA

`npm run qa` vérifie désormais, en plus des contrôles existants : canonical
présent, absolu et correspondant à la page ; title et description présents,
uniques et de longueur raisonnable ; un seul `h1` ; balises Open Graph
minimales ; image OG existant réellement sur le disque ; JSON-LD parsable avec
`@context` et `@type` ; `alt` et `width`/`height` sur chaque image ; couverture
exacte du sitemap dans les deux sens (aucune page indexable absente, aucune URL
sans fichier, aucune page `noindex` listée) ; présence du `404.html`.

**Bug préexistant découvert et corrigé** : la liste des pages contrôlées par la
QA était écrite à la main et **oubliait `multijoueur.html`**. Cette page
n'était vérifiée par aucun test — ni ressources locales, ni ancres mortes. La
liste est maintenant découverte en lisant `dist/`.

## 3. Résultats des vérifications

| Contrôle | Résultat |
|---|---|
| `npm run qa` | **0 erreur, 0 avertissement** |
| Titles dupliqués | aucun (43 pages indexables) |
| Descriptions dupliquées | aucune |
| Titles > 65 caractères | aucun |
| Descriptions hors 70–170 caractères | aucune |
| JSON-LD valides | 43/43, `@context` et `@type` présents |
| Images OG en 404 | aucune |
| `<img>` sans `alt` | 0 sur 289 |
| `<img>` sans `width`/`height` | 0 sur 289 |
| Sitemap | 43 URLs, couverture exacte dans les deux sens |
| Crawl sans JavaScript | 43 pages atteintes, profondeur max 1 |
| Débordement horizontal (375 / 768 / 1265 px) | aucun |
| Créateur de builds | fonctionnel (sélection, jauge de CP, 5 onglets, payload chargé) |
| Player Select | fonctionnel (survol et focus clavier) |
| Focus visible, contrastes | inchangés — aucune couleur du design system modifiée |

## 4. Choix faits, et pourquoi

- **Signature « Serial »** et non « Serial-Developer » : c'est le pseudo réel,
  le suffixe GitHub n'étant qu'un contournement de nom déjà pris.
- **Nom en tête du title** plutôt que la requête (« Guide Prishe Dissidia
  012 ») : meilleur pour le clic et la reconnaissance du site, sans perte —
  Google ne privilégie pas l'ordre des mots.
- **Pas de `robots.txt`.** Voir la section « Se faire indexer » du README : les
  robots ne le liraient pas depuis un sous-dossier, et son absence autorise tout
  le crawl. Sa seule fonction utile est remplacée par la soumission directe du
  sitemap.
- **Police des images de partage.** Le design system déclare
  `--font-display: "Cinzel", "Times New Roman", Georgia, serif`. Cinzel n'est pas
  installée localement (elle est servie au navigateur par Google Fonts) : les
  images utilisent **Times New Roman**, le premier repli déclaré, plutôt que de
  télécharger un fichier de police. Les images étant commitées, le rendu est
  figé une fois pour toutes.
- **Pas de page « À propos » dédiée.** Le footer enrichi porte déjà signature,
  licence et attributions sur les 44 pages. Une page supplémentaire aurait été
  pauvre en contenu. C'est une amélioration possible si vous voulez appuyer le
  signal d'expertise (qui écrit, sur quelle base) que Google valorise.
- **Une seule image OG par page transverse** (celle du site) : dix visuels
  presque identiques n'auraient rien apporté. L'accueil et le créateur de builds
  ont chacun le leur.

## 5. Limites connues

- **Aucun effet immédiat n'est garanti.** Cette passe rend le site indexable et
  partageable ; elle ne crée pas de lien entrant. Sur un domaine `github.io`
  sans backlink, comptez une à trois semaines avant l'apparition, et l'essentiel
  du positionnement viendra ensuite des partages communautaires.
- **Les descriptions préexistantes de cinq pages transverses ont été
  resserrées** (feral-chaos passait de 230 à 150 caractères, notamment) : la fin
  était tronquée dans les résultats. Aucun fait retiré, seules les redites et
  les énumérations surchargées.
- **Le maillage des matchups ne lie pas « Cloud » ni « Chaos »** seuls
  (ambigus), et manque un personnage cité juste avant un mot capitalisé. C'est
  le prix d'une règle qui ne produit jamais de lien faux.
- **Le `404.html` référence sa CSS en URL absolue de production** : consulté en
  local hors ligne, il s'affiche sans style. C'est le compromis nécessaire pour
  qu'il fonctionne à toute profondeur en production.
- **Aucune image de partage pour `characters/chaos.html`** : c'est une
  redirection, pas un contenu.
- **`SITE_VERIFICATION` est vide** : les balises de vérification n'apparaîtront
  qu'après remplissage (voir la checklist).
- **IndexNow non implémenté.** Le ping demande une clé à publier à la racine du
  domaine — impossible sur un project site, pour la même raison que
  `robots.txt`. L'import Bing depuis Search Console couvre le besoin.

## 6. Ce qu'il reste à faire à la main, par ordre de priorité

1. **Fusionner `feature/seo` dans `main`** et vérifier le déploiement
   (Actions → « Deploy GitHub Pages »).
2. **Google Search Console** : créer la propriété *Préfixe d'URL*, coller la
   valeur de vérification dans `SITE_VERIFICATION.google`, rebuild + commit,
   vérifier, soumettre `sitemap.xml`, demander l'indexation de l'accueil, du
   créateur de builds et de deux ou trois guides. Procédure détaillée dans le
   README.
3. **Bing Webmaster Tools** : importer depuis Search Console (le plus rapide).
4. **Tester les aperçus de partage** : coller une URL de guide dans un salon
   Discord privé, et dans <https://cards-dev.twitter.com/validator> ou
   <https://www.opengraph.xyz>. C'est le contrôle que je ne peux pas faire à
   votre place — il exige que le site soit déployé.
5. **Partages communautaires** — le seul levier qui compte vraiment ensuite :
   Discord DISSIDIA, r/DissidiaOO, board GameFAQs 605171, et éventuellement un
   lien depuis dissidia.wiki. Un lien depuis le wiki source aurait le plus de
   poids.
6. **Optionnel** : page « À propos / Crédits » ; repo `Serial-Developer.github.io`
   pour un vrai `robots.txt` ; nom de domaine personnalisé (qui débloquerait
   `robots.txt`, IndexNow et une propriété Search Console de type Domaine).
