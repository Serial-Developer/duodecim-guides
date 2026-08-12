// Les builds publiés du wiki, convertis en builds de la carte.
//
// La page d'un personnage présente ses builds en tableaux : « Stats »,
// « Equipment », parfois les attaques et les abilities. Ce sont des noms écrits
// à la main, pas des identifiants ; et les deux pages du wiki n'écrivent pas la
// même chose pour la même pièce — « Opponent Summon Unused » ici, « Summon
// Unused » et sa condition là ; « BRV > Base Value » d'un côté, « BRV ≥ Base
// Value » de l'autre ; « Chainsaw (Equip Machines) » quand la pièce exige une
// ability. D'où les normalisations ci-dessous, et le journal : ce qui ne se
// résout pas est rapporté, jamais deviné.
//
// Les alternatives que la source propose (« Rubicante / None ») suivent trois
// règles, dans cet ordre :
//   1. une valeur précise ou rien           → la valeur précise
//   2. une valeur précise ou n'importe      → « au choix »
//   3. une valeur précise ou une autre      → la première valeur précise
// Et une section que la source ne précise pas du tout — ni attaques, ni
// abilities pour la plupart des builds — porte « au choix » une fois.

const ANY = 'any';
const SLOTS = { Weapon: 'weapon', Hand: 'hand', Head: 'head', Body: 'body' };
const ACCESSORY_SLOTS = 10;
// « Free choice », « Player Choice » : la source laisse la main au joueur.
// « None » n'en est pas — c'est l'absence, la règle 1 s'en occupe.
const AU_CHOIX = /^(any|free choice|player'?s? choice|accessory of your choice|your choice)$/i;
const RIEN = /^(none|n\/a|—|-{1,2}|\?+)$/i;

const hydrate = (t) => (t && t.c ? t.r.map((r) => Object.fromEntries(t.c.map((c, i) => [c, r[i]]))) : (t || []));

// La cellule porte parfois l'ability exigée par la pièce, à la ligne et entre
// parenthèses : « Chainsaw \n(Equip Machines) ». Elle nomme une contrainte, pas
// la pièce.
function nettoie(v) {
  return String(v || '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Le wiki écrit ses comparaisons en ASCII sur une page, en symboles sur l'autre.
function variantes(nom) {
  const v = [nom, nom.replace(/>/g, '≥').replace(/</g, '≤')];
  return [...new Set(v.flatMap((x) => [x, x.replace(/\s*%/g, '%')]))];
}

function trouve(pool, nom, opp) {
  for (const v of variantes(nom)) {
    let cands = pool.filter((x) => (x.name || '').toLowerCase() === v.toLowerCase());
    // Deux accessoires portent le même nom : le sien et celui de l'adversaire.
    // Le préfixe « Opponent » de la page builds tranche, l'identifiant aussi.
    if (cands.length > 1 && opp !== null) cands = cands.filter((x) => String(x.uid).includes(':OPP:') === opp);
    if (cands.length === 1) return cands[0];
    if (cands.length > 1) return { ambigu: cands.length };
  }
  return null;
}

// `prose` : les descriptions éditoriales des builds, dans l'ordre des onglets du
// wiki — le même que celui des tableaux. Elles nomment souvent les coups que le
// tableau de moveset a laissés vides : ce sont les builds meta du personnage, et
// un coup qu'elles citent est un coup du build, pas une invention. On ne les lit
// que pour un build dont la source ne donne aucune attaque, et le coup trouvé
// prend la première commande libre de sa propre catégorie (-1 le dit à
// `scanBuild`), faute que la prose exprime une direction.
export function buildsFromWiki(char, slug, data, journal = [], prose = []) {
  const equipement = hydrate(data.equipment);
  const accessoires = hydrate(data.accessories);
  const assists = hydrate(data.assists);
  const summons = hydrate(data.summons);
  const perso = (data.characters || []).find((c) => c.slug === slug);

  const abilitiesParNom = {};
  // Paliers d'une même ability : le payload les sépare par le coût dans
  // l'identifiant (`jump-times-boost` à 20 CP, `jump-times-boost-cp40` à 40).
  // La page builds, elle, ajoute un « + » au nom.
  const abilitiesParAlias = {};
  for (const g of data.abilities || []) for (const a of g.abilities || []) {
    const bas = a.name.toLowerCase();
    if (abilitiesParNom[bas] === undefined) abilitiesParNom[bas] = a.id;
    else abilitiesParAlias[`${bas}+`] = a.id;
  }
  // La liste de coups met le qualificatif entre crochets — « [Anti-air]
  // Particle Beam » —, le tableau de build ne les écrit pas. Les deux graphies
  // mènent au même coup : les six faisceaux de Cloud of Darkness en dépendaient.
  const sansCrochets = (n) => n.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();
  const coupsParNom = {};
  for (const kind of ['bravery', 'hp']) {
    for (const g of (perso?.attacks?.[kind] || [])) {
      for (const m of hydrate(g.moves)) {
        if (!m.name) continue;
        coupsParNom[m.name.toLowerCase()] = m.id;
        coupsParNom[sansCrochets(m.name).toLowerCase()] = m.id;
      }
    }
  }
  // Prolongement dont la source ne dit pas la version : « Branch: Bitter End »
  // quand le personnage en a deux. C'est la bravery qui précède qui tranche —
  // le lien HP la désigne, et c'est la règle du modèle : un prolongement se
  // rattache à l'attaque qu'il suit.
  const liens = perso?.links || [];
  const brancheDe = (parentId, nom) => {
    const bas = nom.toLowerCase();
    const cible = liens.filter((l) => l.from === parentId)
      .map((l) => l.to)
      .find((to) => String(to).toLowerCase().indexOf(bas) !== -1);
    return cible || null;
  };

  const bloque = (cle, brut) => {
    const parts = String(brut).split('/').map(nettoie).filter(Boolean);
    if (!parts.length) return null;
    const reste = parts.slice(1);
    if (reste.some((a) => AU_CHOIX.test(a))) return ANY;      // règle 2
    if (AU_CHOIX.test(parts[0])) return ANY;
    if (RIEN.test(parts[0])) return reste.length && !RIEN.test(reste[0]) ? bloque(cle, reste.join(' / ')) : null;
    let nom = parts[0];                                        // règles 1 et 3
    let pool = null;
    let opp = null;
    if (SLOTS[cle]) pool = equipement.filter((e) => e.slot === SLOTS[cle] && (!e.exclusiveTo || e.exclusiveTo === slug));
    else if (cle === 'accessory') {
      pool = accessoires;
      opp = /^opponent /i.test(nom);
      if (opp) nom = nom.replace(/^opponent\s+/i, '');
    } else if (cle === 'Assist') pool = assists;
    else if (cle === 'Summon') pool = summons;
    else return null;
    const it = trouve(pool, nom, opp);
    if (!it) { journal.push({ slug, cle, valeur: nom, raison: 'introuvable dans le payload' }); return null; }
    if (it.ambigu) { journal.push({ slug, cle, valeur: nom, raison: `${it.ambigu} candidats` }); return null; }
    return it.uid || it.slug || it.id;
  };

  // Les tableaux d'un même build se suivent : un nouveau commence à « Stats ».
  // Un build vient d'un groupe de tableaux ou d'un sous-bloc. Le sous-bloc porte
  // son titre — « Hybrid », « Damage (High Base BRV) » — que le wiki n'écrit
  // pas en onglet : cinq personnages ne nomment leurs builds que là.
  const tables = [
    ...(char.sections?.builds?.tables || []).map((tb) => ({ tb, titre: null })),
    ...(char.sections?.builds?.subs || []).flatMap((s) => (s.tables || []).map((tb) => ({ tb, titre: s.title || null }))),
  ];
  const groupes = [];
  for (const { tb, titre } of tables) {
    const tete = tb.rows?.[0];
    if (!tete) continue;
    // « Equipment | Replacement | Notes » propose des échanges, il ne compose
    // pas un build : seul le tableau à en-tête unique en est un.
    if (tete.length > 1) continue;
    if (tete[0] === 'Stats' || !groupes.length) groupes.push({ tables: [], titre });
    groupes[groupes.length - 1].tables.push(tb);
  }

  // Noms d'onglets du wiki, dans l'ordre — « |-|Adamant Chains + EX= ». Même
  // lecture que la fiche, y compris sa prudence : on ne nomme que si le compte
  // concorde, un décalage donnant à un build le nom d'un autre.
  const EMPTY_TAB = /^build\s*#?\s*\d+\s*$/i;
  const noms = (char.sections?.builds?.text || [])
    .map((x) => String(x).trim())
    .filter((x) => x.startsWith('|-|'))
    .map((x) => x.replace(/^\|-\|/, '').replace(/=[\s\S]*$/, '').trim())
    .filter((x) => x && !EMPTY_TAB.test(x) && !/add build here/i.test(x));

  const builds = [];
  for (const g of groupes) {
    const equipTable = g.tables.find((tb) => tb.rows[0][0] === 'Equipment');
    if (!equipTable) continue;
    const build = {
      schemaVersion: 1,
      character: slug,
      name: '',
      attacks: [],
      attackSlots: [],
      abilities: [],
      equipment: { weapon: null, hand: null, head: null, body: null },
      accessories: Array.from({ length: ACCESSORY_SLOTS }, () => null),
      assist: null,
      summon: null,
      notes: '',
    };
    let iAcc = 0;
    for (const [cle, valeur] of equipTable.rows.slice(1)) {
      if (!valeur) continue;
      if (SLOTS[cle]) build.equipment[SLOTS[cle]] = bloque(cle, valeur);
      else if (/^Accessory/.test(cle)) { if (iAcc < ACCESSORY_SLOTS) build.accessories[iAcc++] = bloque('accessory', valeur); }
      else if (cle === 'Assist') build.assist = bloque('Assist', valeur);
      else if (cle === 'Summon') build.summon = bloque('Summon', valeur);
    }

    // Attaques : la source les range en deux colonnes (sol, air) et préfixe la
    // direction. Nos commandes n'ont pas la même grammaire d'une posture à
    // l'autre — au sol c'est ← et →, en l'air ↑ et ↓ — donc une direction que la
    // posture ne connaît pas laisse la commande non exprimée (-1) plutôt que de
    // se ranger de force dans une case qui n'est pas la sienne.
    const moveset = g.tables.find((tb) => tb.rows[0][0] === 'Bravery attacks');
    for (const row of (moveset?.rows || []).slice(1)) {
      for (const [colonne, cellule] of row.entries()) {
        const brut = String(cellule || '').trim();
        if (!brut || /^(ground|aerial|hp attacks|bravery attacks)$/i.test(brut) || RIEN.test(brut)) continue;
        const direction = /^([↑↓←→])\s*\+\s*/.exec(brut);
        // « Branch: Rune Saber » : un prolongement, que notre modèle range
        // juste après l'attaque qu'il prolonge — c'est déjà l'ordre de la
        // source, il n'y a rien à déplacer.
        const nom = brut.replace(/^[↑↓←→]\s*\+\s*/, '').replace(/^branch\s*:\s*/i, '').trim();
        const aerien = colonne === 1;
        // La page builds nomme le coup sans sa posture, que la colonne porte ;
        // la liste de coups, elle, la met dans le nom.
        const precedent = build.attacks[build.attacks.length - 1];
        const id = coupsParNom[nom.toLowerCase()]
          || coupsParNom[`${nom} (${aerien ? 'midair' : 'ground'})`.toLowerCase()]
          || (/^branch\s*:/i.test(brut) && precedent ? brancheDe(precedent, nom) : null);
        if (!id) { journal.push({ slug, cle: 'attaque', valeur: nom, raison: 'coup inconnu' }); continue; }
        const cmd = !direction ? 0
          : (aerien && direction[1] === '↑') ? 1
            : (aerien && direction[1] === '↓') ? 2
              : (!aerien && direction[1] === '←') ? 1
                : (!aerien && direction[1] === '→') ? 2
                  : -1;
        build.attacks.push(id);
        build.attackSlots.push(cmd);
      }
    }

    for (const tb of g.tables) {
      // Le wiki intitule ce tableau « Actions » sur certaines pages et
      // « Basic Abilities » sur d'autres : c'est la meme sous-categorie, et
      // n'accepter que la seconde graphie faisait perdre TOUTES les abilities
      // des personnages concernes — Yuna en annoncait 0 pour 210 CP la ou sa
      // source en donne 19 pour 425. Le CP affiche etait donc faux, sans que
      // rien ne le signale.
      if (!['Basic Abilities', 'Actions', 'Support', 'Extra'].includes(tb.rows[0][0])) continue;
      for (const row of tb.rows.slice(1)) {
        const nom = nettoie(row[0]);
        // Certains tableaux d'abilities portent un second en-tête au milieu :
        // « Actions » n'est pas une ability, c'est le titre de sa colonne.
        if (!nom || RIEN.test(nom) || /^actions$/i.test(nom)) continue;
        // « Jump Times Boost+ » : le wiki oublie le « + » d'une des deux, que le
        // payload distingue par son coût — l'identifiant du palier supérieur
        // est suffixé de celui-ci. Le « + » de la page builds la désigne.
        const id = abilitiesParNom[nom.toLowerCase()]
          || (nom.endsWith('+') ? abilitiesParAlias[nom.toLowerCase()] : null);
        if (!id) { journal.push({ slug, cle: 'ability', valeur: nom, raison: 'ability inconnue' }); continue; }
        build.abilities.push(id);
      }
    }

    // Niveau : 100 sauf mention contraire dans la description du build. Les
    // builds publiés sont des builds de niveau 100 — c'est le niveau du jeu
    // compétitif —, et seule une note qui dit le contraire fait exception.
    const texteNiveau = String(prose[builds.length] || '');
    // Le motif doit désigner le personnage, pas n'importe quel « niveau » du
    // texte : « every LV2 Assist Change » parle du rang d'un assist, pas d'un
    // build de niveau 2. On exige donc le mot en toutes lettres, séparé de son
    // nombre, et une valeur qui soit un palier plausible.
    const mention = /\b(?:niveau|level)\s*:?\s*(\d{1,3})\b/i.exec(texteNiveau);
    const lu = mention ? Number(mention[1]) : 100;
    build.level = lu >= 1 && lu <= 100 ? lu : 100;
    if (build.level !== 100) journal.push({ slug, cle: 'niveau', valeur: String(build.level), raison: 'lu dans la description du build', releve: true });

    // Section muette : la source n'en dit rien, ce n'est pas qu'elle la laisse
    // vide. Le jeton le dit une fois pour toute la section.
    if (!build.attacks.length) {
      const texte = String(prose[builds.length] || '');
      if (texte) {
        // Les noms longs d'abord : « Army of One » avant « Army », sans quoi le
        // premier mangerait le second.
        const noms = Object.keys(coupsParNom).sort((a, b) => b.length - a.length);
        const bas = texte.toLowerCase();
        const vus = new Set();
        for (const n of noms) {
          // Le nom porte parfois sa posture : la prose, elle, ne l'écrit pas.
          const nu = n.replace(/\s*\((ground|midair)\)$/i, '');
          if (vus.has(coupsParNom[n]) || bas.indexOf(nu) === -1) continue;
          vus.add(coupsParNom[n]);
          build.attacks.push(coupsParNom[n]);
          build.attackSlots.push(-1);
          journal.push({ slug, cle: 'attaque', valeur: n, raison: 'relevée dans la prose du build', releve: true });
        }
      }
    }
    // Le jeton accompagne toujours les attaques, même quand la source en donne :
    // aucun build publié ne remplit la grille — Lightning n'a que deux braveries
    // en Ravageur sur trois commandes. Ce qui reste est laissé au joueur, et une
    // place vide le dirait à tort autrement.
    build.attacks.push(ANY);
    build.attackSlots.push(-1);
    if (!build.abilities.length) build.abilities = [ANY];
    if (g.titre) build.name = g.titre;
    builds.push(build);
  }
  // Les onglets nomment dans l'ordre, et seulement si le compte concorde — un
  // décalage donnerait à un build le nom d'un autre. Un titre de sous-bloc
  // déjà posé n'est pas écrasé pour autant.
  if (noms.length === builds.length) builds.forEach((b, i) => { b.name = noms[i]; });
  return builds;
}

// Lien de partage d'un build, à coller derrière `?build=` : le créateur relit
// ce format depuis toujours — la base64 brute du build compacté, sans préfixe.
// Les deux autres formats (binaire, deflate) sont plus courts mais l'un
// suppose les catalogues du navigateur et l'autre une compression que Node
// n'écrit pas de la même façon ; celui-ci n'a besoin de rien. Aucun risque de
// confusion de préfixe : la base64 d'un objet JSON commence toujours par « e ».
export function shareCode(b) {
  const c = {
    v: b.schemaVersion, c: b.character,
    at: b.attacks, sl: b.attackSlots, ab: b.abilities,
    eq: [b.equipment.weapon, b.equipment.hand, b.equipment.head, b.equipment.body],
    ac: b.accessories, as: b.assist, su: b.summon,
  };
  if (b.name) c.n = b.name;
  if (b.notes) c.no = b.notes;
  if ((b.level || 100) !== 100) c.lv = b.level;
  return Buffer.from(JSON.stringify(c), 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
