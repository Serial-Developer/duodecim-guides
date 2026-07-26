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
    out = execFileSync('git', ['log', '--reverse', '--format=' + MARK + '%aI', '--name-only'], {
      cwd: root, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    console.warn('(git indisponible : dates de publication omises)');
    cache = new Map();
    return cache;
  }
  const map = new Map();
  let date = null;
  for (const line of out.split('\n')) {
    const l = line.trimEnd();
    if (l.startsWith(MARK)) { date = l.slice(MARK.length); continue; }
    if (!l || !date) continue;
    const e = map.get(l);
    if (e) e.modified = date;
    else map.set(l, { created: date, modified: date });
  }
  cache = map;
  return cache;
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
