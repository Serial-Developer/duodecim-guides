// Corrections déclarées sur une cellule du tableau d'un coup.
//
// `moveCosts` comble un trou : dissidia.wiki écrit « ?? », le Final Fantasy Wiki
// chiffre, et une déclaration qui écraserait une valeur déjà donnée est refusée
// — arbitrer entre deux sources n'est pas le rôle d'un fichier éditorial.
// Ici, c'est justement d'arbitrage qu'il s'agit : les deux wikis se contredisent
// sur une cellule, et la déclaration dit laquelle est retenue. D'où la garde :
// chaque correction rappelle la valeur qu'elle remplace (`was`), et une
// correction dont la valeur d'origine a changé est refusée plutôt qu'appliquée.
// Un re-scrape qui rectifie la source ne peut donc pas laisser vivre en silence
// un arbitrage devenu faux.
//
// Les deux lectures des données de personnage l'appliquent — la fiche
// (build.mjs) et le payload du créateur (build-data-bundle.mjs) — sinon la même
// attaque se lirait différemment d'une page à l'autre.

const SECTIONS = ['bravery', 'hp'];

function movesOf(data) {
  const out = [];
  for (const section of SECTIONS) {
    const groups = data?.sections?.[section]?.groups || {};
    for (const group of Object.values(groups)) {
      for (const m of group?.moves || []) out.push(m);
    }
  }
  return out;
}

// `decls` : { "<slug>": [{ move, field, variant?, was, value, source }] }.
// `variant` se compte comme la source l'écrit, à partir de 1 ; sans lui, le
// champ est une valeur unique. Retourne le journal des corrections refusées.
export function applyMoveFixes(slug, data, decls, journal = []) {
  for (const decl of ((decls || {})[slug] || [])) {
    const cibles = movesOf(data).filter((m) => m.name === decl.move);
    if (!cibles.length) { journal.push({ slug, ...decl, raison: 'coup introuvable' }); continue; }
    for (const m of cibles) {
      const champ = m[decl.field];
      const i = decl.variant ? decl.variant - 1 : null;
      const actuel = i === null ? champ : (Array.isArray(champ) ? champ[i] : undefined);
      if (actuel === undefined) { journal.push({ slug, ...decl, raison: 'champ ou variante absent' }); continue; }
      if (actuel !== decl.was) { journal.push({ slug, ...decl, raison: `la source dit « ${actuel} », plus « ${decl.was} »` }); continue; }
      if (i === null) m[decl.field] = decl.value; else champ[i] = decl.value;
    }
  }
  return journal;
}
