// Lecture de la forme d'une ligne de coup, partagée par le payload du créateur
// et le gabarit des fiches — les deux rendus doivent s'accorder.
//
// Le wiki n'a pas de format unique : un coup y est tantôt une ligne, tantôt un
// tableau à déclinaisons, tantôt un tableau annexe dont le titre passe pour un
// coup. Ces trois lectures-là sont le minimum commun.

// Une ligne dont les « variantes » sont en fait des en-têtes de colonnes est un
// tableau, pas une déclinaison : c'est le coup équipable, et les lignes qui la
// suivent le détaillent.
const COLUMN_LABEL = /multiplier|startup|cancel|assist|CP|force|priorit|effect|position|spawn|^type$|^version$/i;
export const isHeaderRow = (m) => Boolean(
  m.variants && m.variants.length > 1 && m.variants.some((v) => COLUMN_LABEL.test(String(v)))
);

// Le coût d'un coup à tableau ne remonte pas toujours dans `cp` : il reste dans
// la ligne de valeurs qui suit l'en-tête « CP (Mastered) ». C'est le cas des
// blocs de Jecht et d'Exdeath, des armes de Laguna et des invocations de Yuna —
// 24 coups au total, affichés jusqu'ici comme non documentés alors que la
// source les chiffre.
export function cpFromRawRows(m) {
  const rows = m.rawRows || [];
  for (let i = 0; i < rows.length - 1; i++) {
    const col = rows[i].findIndex((c) => /^CP \(Master/i.test(String(c).trim()));
    if (col === -1) continue;
    const value = String((rows[i + 1] || [])[col] || '').trim();
    if (/^\d+\s*\(\d+\)$/.test(value)) return value;
  }
  return null;
}

// Une ligne qui reprend mot pour mot une ligne du tableau annexe qui la précède
// en est un doublon : le parseur a émis le tableau *et* ses lignes. Les trois
// déclinaisons de « 3rd Chain » chez Jecht se retrouvent ainsi en double.
export function duplicatesHeaderRow(header, m) {
  if (!header || !header.rawRows || !m.name) return false;
  return header.rawRows.some((row) => String(row[0] || '').trim() === m.name.trim());
}

// Une ligne orpheline : l'extraction a perdu le titre de son tableau, et elle
// flotte donc à la suite du tableau précédent, sans rapport avec lui. Le
// « 2nd Chain » de Jecht est dans ce cas — « Ground (Neutral) », « Ground (Up) »
// et « Air (Neutral) » passaient pour des braveries aériennes alors que leurs
// notes disent « Neutral 2 from Jecht Rush ».
//
// Quatre conditions réunies, et chacune est nécessaire :
//  - elle suit un tableau, donc elle en dépend ;
//  - elle n'y figure pas, sinon c'est un doublon (`duplicatesHeaderRow`) ;
//  - elle ne prolonge pas son nom, sinon c'est une déclinaison (les niveaux de
//    charge de Jecht, les versions EX Mode de Yuna) ;
//  - elle ne porte aucun coût, donc elle ne s'équipe pas.
// Sur les 31 personnages, seules les trois lignes de Jecht les remplissent.
export function isOrphanRow(header, m) {
  if (!header || isHeaderRow(m)) return false;
  if (duplicatesHeaderRow(header, m)) return false;
  if (String(m.name || '').indexOf(header.name) === 0) return false;
  return !m.cp && !cpFromRawRows(m);
}

// « 3rd Chain » nomme un tableau d'enchaînements, il ne s'équipe pas. Trois
// conditions le distinguent d'un vrai coup, et il faut les trois :
//  - il ne chiffre rien, ni coût ni dégâts ;
//  - il précède des lignes, donc il en est le titre — sans quoi on écarterait
//    les coups d'Aerith, qui n'ont pas de coût faute d'être jouables ;
//  - aucune de ces lignes ne prolonge son nom, sinon ce sont ses déclinaisons
//    (« Ultimate Jecht Shot — Level 1 »), et lui le coup qu'elles détaillent.
export function isTableTitle(moves, i) {
  const m = moves[i];
  if (!isHeaderRow(m) || m.cp || cpFromRawRows(m) || m.damage) return false;
  const suite = [];
  for (let j = i + 1; j < moves.length && !isHeaderRow(moves[j]); j++) suite.push(moves[j]);
  if (!suite.length) return false;
  return !suite.some((s) => String(s.name || '').indexOf(m.name) === 0);
}
