// Dates de publication et de dernière modification, lues dans l'historique git.
//
// Elles alimentent `lastmod` du sitemap et `datePublished`/`dateModified` du
// JSON-LD. L'historique est la seule source honnête ici : la date du build
// changerait à chaque régénération et prétendrait à tort que le contenu a été
// mis à jour. Si git est indisponible (archive téléchargée, pas de dépôt), la
// fonction renvoie une map vide et les dates sont alors simplement omises.
import { execFileSync } from 'node:child_process';

const MARK = '__C__';

let cache = null;

export function gitDates(root) {
  if (cache) return cache;
  let out;
  // Dépôt superficiel (`actions/checkout` sans fetch-depth: 0) : git ne connaît
  // qu'un commit, tous les fichiers sembleraient créés ce jour-là et chaque
  // build réécrirait toutes les dates. Mieux vaut aucune date qu'une date fausse
  // — on renvoie donc une map vide, comme lorsque git est absent.
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: root, encoding: 'utf-8',
    }).trim();
    if (shallow === 'true') {
      console.warn('(dépôt git superficiel : dates de publication omises — voir fetch-depth dans les workflows)');
      cache = new Map();
      return cache;
    }
  } catch { /* git absent : le bloc suivant s'en charge */ }
  try {
    // Une seule passe sur tout l'historique : premier commit touchant un
    // fichier = création, dernier = modification.
    //
    // `--name-status -M` plutôt que `--name-only` : il signale les renommages
    // (`R100  ancien  nouveau`), ce qui permet de transporter l'historique vers
    // le nouveau chemin. Sans cela, un simple `git mv` ferait passer un fichier
    // pour neuf et `datePublished` mentirait — c'est arrivé en rangeant
    // l'éditorial par locale (data/editorial/*.json -> data/editorial/fr/).
    out = execFileSync('git', ['log', '--reverse', '-M', '--format=' + MARK + '%aI', '--name-status'], {
      cwd: root, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    console.warn('(git indisponible : dates de publication omises)');
    cache = new Map();
    return cache;
  }
  const map = new Map();
  const touch = (path, date) => {
    const e = map.get(path);
    if (e) e.modified = date;
    else map.set(path, { created: date, modified: date });
  };
  let date = null;
  for (const line of out.split('\n')) {
    const l = line.trimEnd();
    if (l.startsWith(MARK)) { date = l.slice(MARK.length); continue; }
    if (!l || !date) continue;
    const parts = l.split('\t');
    const status = parts[0];
    if (status[0] === 'R' && parts.length >= 3) {
      // Renommage : le nouveau chemin hérite de l'historique de l'ancien.
      // `R100` signale un déplacement à contenu identique — déplacer un fichier
      // ne modifie pas ce qu'il dit, donc `dateModified` ne bouge pas. Sans cette
      // nuance, ranger l'éditorial par locale aurait redaté les 33 fiches et
      // annoncé aux moteurs une mise à jour qui n'a pas eu lieu.
      const [, from, to] = parts;
      const prev = map.get(from);
      const untouched = status === 'R100';
      map.delete(from);
      map.set(to, {
        created: prev ? prev.created : date,
        modified: untouched && prev ? prev.modified : date,
      });
      continue;
    }
    if (parts.length >= 2) touch(parts[1], date);
  }
  cache = map;
  return cache;
}

// Dernière modification du CONTENU publié, en date seule (YYYY-MM-DD) : le
// maximum des dates de modification des fichiers qui produisent les pages.
// Alimente la mention « dernière mise à jour » du footer — qui, comme les dates
// du sitemap, ne doit jamais être la date du build : régénérer le site ne le met
// pas à jour. `null` si git est indisponible, et la mention est alors omise.
const CONTENT_PREFIXES = [
  'data/editorial/', 'data/characters/', 'data/build/', 'data/calendar/',
  'src/', 'locales/',
];

export function contentLastModified(root) {
  const map = gitDates(root);
  let latest = null;
  for (const [path, e] of map) {
    if (!CONTENT_PREFIXES.some((p) => path.startsWith(p))) continue;
    if (!latest || new Date(e.modified) > new Date(latest)) latest = e.modified;
  }
  return latest ? latest.slice(0, 10) : null;
}

// Dates agrégées d'un ensemble de fichiers sources : la plus ancienne création
// et la plus récente modification. Les fichiers inconnus de git (jamais
// commités) sont ignorés — ils n'ont pas de date de publication.
export function datesFor(root, files) {
  const map = gitDates(root);
  let created = null, modified = null;
  for (const f of files) {
    const e = map.get(f.replace(/\\/g, '/'));
    if (!e) continue;
    if (!created || e.created < created) created = e.created;
    if (!modified || e.modified > modified) modified = e.modified;
  }
  return { datePublished: created, dateModified: modified };
}
