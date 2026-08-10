// Carte de build : le récapitulatif d'un build entier en un coup d'œil, pensé
// pour être lu — et capturé — d'un seul écran.
//
// Ce module n'est qu'une façade. Le rendu vit dans `src/scripts/build-card-view.js`,
// un script classique que le navigateur charge tel quel : le créateur de builds
// redessine la même carte à chaque modification, et elle doit être identique à
// celle que produit le build statique. Le dépôt a déjà vu deux rendus du même
// objet diverger — la grille d'attaques entre le créateur et cette carte,
// `move-shape` entre le payload et `guide.mjs` — et les deux fois le défaut est
// resté invisible longtemps. Une seule implémentation, deux points d'entrée.
//
// L'évaluation passe par `new Function` faute de mieux : le fichier ne peut être
// ni un module ESM (le navigateur du site doit rester consultable en `file://`,
// où `type="module"` est refusé par la politique d'origine) ni un `.cjs` (mime
// incertain sur GitHub Pages). Il est lu une fois, au chargement du module.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(ICI, '..', 'scripts', 'build-card-view.js');

// eslint-disable-next-line no-new-func
new Function(readFileSync(SOURCE, 'utf-8'))();

if (!globalThis.BuildCardView) throw new Error(`build-card-view.js n'a rien publié : ${SOURCE}`);

export const { hydrate, accessoryIcons, stylesOf, buildCard } = globalThis.BuildCardView;
