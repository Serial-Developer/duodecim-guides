// Contrôle d'une traduction de prose éditoriale, fichier contre fichier.
//
// La règle absolue du projet est « zéro invention » : une traduction ne doit
// ajouter, retirer ni altérer aucun fait. Ce contrôle la rend mécanique.
//
// Sont vérifiés — toute divergence est une erreur :
//  1. structure identique (mêmes clés, mêmes longueurs de tableaux) ;
//  2. clés de `moveNotes` et `groupNotes` identiques : ce sont des noms de coups
//     et des identifiants de section, jamais du texte ;
//  3. mêmes URLs, mêmes `slug`, mêmes `date` ;
//  4. mêmes nombres, dans le même ordre : une frame, un coût en CP ou un
//     pourcentage qui change est un fait faux ;
//  5. les noms propres du jeu cités dans la version source se retrouvent à
//     l'identique — ils sont anglais à l'origine, les rétro-traduire serait la
//     faute la plus difficile à repérer à l'œil.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Champs qui ne sont pas de la prose : ils doivent être strictement égaux.
// `names` porte des listes de noms de coups (regroupements éditoriaux) : les
// traduire romprait le lien avec les données extraites, et la section
// disparaîtrait silencieusement du guide.
const VERBATIM = new Set(['slug', 'source', 'sources', 'url', 'date', 'video', 'names']);
// Clés dont les CLÉS d'objet sont des identifiants (noms de coups, sections).
const KEYED_BY_IDENTIFIER = new Set(['moveNotes', 'groupNotes', 'sourcesBySection', 'movesetSlots', 'movesetTypes', 'values']);

const URL_RE = /https?:\/\/[^\s"'<>)]+/g;
// Un nombre « significatif » : on ignore ceux collés à un mot (« One-Inch »).
const NUM_RE = /(?<![\w.])\d+(?:[.,]\d+)?(?![\w])/g;

const nums = (s) => (String(s).match(NUM_RE) || []).map((n) => n.replace(',', '.'));
const urls = (s) => String(s).match(URL_RE) || [];

function walk(a, b, path, out, verbatim = false) {
  const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a;
  const tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
  if (ta !== tb) { out.push(`${path} : type ${ta} d'un côté, ${tb} de l'autre`); return; }

  if (ta === 'array') {
    if (a.length !== b.length) { out.push(`${path} : ${a.length} entrée(s) contre ${b.length}`); return; }
    a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`, out, verbatim));
    return;
  }
  if (ta === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    const container = path.split(/[.[]/).map((x) => x.replace(/\]$/, ''))
      .filter((x) => x && !/^\d+$/.test(x)).pop();
    const isIdentifierMap = KEYED_BY_IDENTIFIER.has(container);
    for (const k of ka) {
      if (!(k in b)) { out.push(`${path}.${k} : clé absente de la traduction`); continue; }
      // `video` est un bloc de métadonnées (titre de la vidéo, auteur, date) :
      // rien n'y est traduisible, y compris son `title` — c'est le titre réel
      // d'une œuvre, pas une description.
      walk(a[k], b[k], `${path}.${k}`, out, verbatim || VERBATIM.has(k));
    }
    for (const k of kb) if (!(k in a)) out.push(`${path}.${k} : clé en trop dans la traduction`);
    if (isIdentifierMap) {
      // Ces clés sont des noms de coups : elles ne se traduisent jamais. La
      // boucle ci-dessus l'a déjà vérifié, on ne rappelle ici que le contexte.
      const lost = ka.filter((k) => !kb.includes(k));
      if (lost.length) out.push(`${path} : nom de coup traduit ou perdu — ${lost.join(', ')}`);
    }
    return;
  }
  if (ta === 'string') {
    // Nom du champ conteneur, indices de tableau ignorés : pour
    // « x.moveRegroup.bravery[0].names[2] », c'est bien « names ».
    const leaf = path.split(/[.[]/).map((x) => x.replace(/\]$/, ''))
      .filter((x) => x && !/^\d+$/.test(x)).pop();
    if (verbatim || VERBATIM.has(leaf) || /^https?:/.test(a)) {
      if (a !== b) out.push(`${path} : champ non traduisible modifié\n      source : ${a}\n      trad.  : ${b}`);
      return;
    }
    const na = nums(a).join(' '), nb = nums(b).join(' ');
    if (na !== nb) out.push(`${path} : nombres divergents — source « ${na || '(aucun)'} », traduction « ${nb || '(aucun)'} »`);
    const ua = urls(a).join(' '), ub = urls(b).join(' ');
    if (ua !== ub) out.push(`${path} : URLs divergentes — source « ${ua}  », traduction « ${ub} »`);
    return;
  }
  if (a !== b) out.push(`${path} : valeur ${JSON.stringify(a)} devenue ${JSON.stringify(b)}`);
}

// Noms propres du jeu attendus : ceux des coups extraits du wiki. Un nom présent
// dans la source doit se retrouver tel quel dans la traduction.
function properNouns(root, slug) {
  const p = join(root, 'data', 'characters', `${slug}.json`);
  if (!existsSync(p)) return [];
  const data = JSON.parse(readFileSync(p, 'utf-8'));
  const names = new Set();
  for (const key of ['bravery', 'hp']) {
    for (const g of Object.values(data.sections?.[key]?.groups || {})) {
      for (const m of g.moves || []) {
        if (!m.name) continue;
        // Le nom extrait porte souvent un suffixe de variante (« — EX Mode »)
        // ou de position dans la chaîne (« (One) », « (Two) »). C'est la BASE
        // qu'il faut compter : la prose cite « Raging Fists » bien plus souvent
        // que « Raging Fists (One) », et c'est cette forme nue qu'une
        // traduction risque de retraduire sans qu'on le voie.
        const base = m.name.split(' — ')[0].replace(/\s*\((?:One|Two)\)\s*$/i, '').trim();
        if (base) names.add(base);
      }
    }
  }
  // Noms homographes d'un mot courant : les compter produit du bruit sans rien
  // apprendre. « Combo » est le cas d'école — le français le capitalise en tête
  // de phrase (« Combo de cinq coups de poing »), l'anglais non (« a five-punch
  // combo »), et l'écart n'a rien à voir avec une traduction fautive. Le prix
  // est assumé : ces quelques noms échappent au comptage.
  const COMMON = new Set(['Holy', 'Banish', 'Combo']);
  return [...names].filter((n) => n.length >= 5 && !COMMON.has(n));
}

export function checkProseFile(root, slug, source, target) {
  const a = JSON.parse(readFileSync(join(root, 'data', 'editorial', source, `${slug}.json`), 'utf-8'));
  const b = JSON.parse(readFileSync(join(root, 'data', 'editorial', target, `${slug}.json`), 'utf-8'));
  const errors = [];
  const warnings = [];
  walk(a, b, slug, errors);

  // Noms propres du jeu : la disparition complète d'un nom est une erreur ; une
  // baisse du nombre d'occurrences est un avertissement, parce qu'une phrase
  // anglaise peut légitimement reprendre le nom par un pronom. C'est là que se
  // cachent les rétro-traductions — « Raging Fists » devenu « Furious Fists »
  // sur une occurrence parmi cinq ne se voit pas à l'œil.
  const srcText = JSON.stringify(a), dstText = JSON.stringify(b);
  for (const name of properNouns(root, slug)) {
    const inSrc = srcText.split(name).length - 1;
    const inDst = dstText.split(name).length - 1;
    if (inSrc === 0) continue;
    if (inDst === 0) errors.push(`nom du jeu « ${name} » cité ${inSrc} fois dans la source, absent de la traduction`);
    else if (inDst < inSrc) warnings.push(`nom du jeu « ${name} » : ${inSrc} occurrence(s) dans la source, ${inDst} dans la traduction — vérifier qu'aucune n'a été traduite`);
  }
  return { errors, warnings };
}

// Tous les fichiers traduits d'une locale.
export function checkProseLocale(root, source, target) {
  const dir = join(root, 'data', 'editorial', target);
  const out = { errors: {}, warnings: {} };
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const slug = f.replace(/\.json$/, '');
    if (!existsSync(join(root, 'data', 'editorial', source, f))) continue;
    const r = checkProseFile(root, slug, source, target);
    if (r.errors.length) out.errors[slug] = r.errors;
    if (r.warnings.length) out.warnings[slug] = r.warnings;
  }
  return out;
}
