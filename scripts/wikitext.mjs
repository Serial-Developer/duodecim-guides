// Utilitaires de lecture du wikitext MediaWiki (pages Fandom du créateur de builds).
// Le HTML rendu de finalfantasy.fandom.com répond 403 aux fetchers : on parse la
// source. Les tables y sont régulières, ce qui donne une extraction plus sûre.

// Découpe `str` sur `sep` en ignorant les séparateurs imbriqués dans {{...}} ou [[...]].
export function splitTop(str, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < str.length; i++) {
    const two = str.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (depth === 0 && str.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += str[i];
  }
  out.push(cur);
  return out;
}

// Nom d'un fichier image cité dans une cellule ([[File:Dissidia-SRank-Icon.png]]).
export function fileRefs(str) {
  return [...str.matchAll(/\[\[File:([^|\]]+)/g)].map((m) => m[1].trim());
}

// Wikitext -> texte brut lisible. Les templates {{LA|cible|Affiché}} / {{A|Nom}}
// rendent leur dernier paramètre, comme le wiki.
export function plain(str) {
  if (str == null) return '';
  let s = String(str);
  s = s.replace(/\[\[File:[^\]]*\]\]/g, ' ');
  // Templates : on garde le dernier paramètre non nommé.
  for (let i = 0; i < 6; i++) {
    const next = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const parts = splitTop(inner, '|').map((p) => p.trim());
      const positional = parts.slice(1).filter((p) => !/^[a-z0-9_-]+\s*=/i.test(p));
      return positional.length ? positional[positional.length - 1] : parts[0];
    });
    if (next === s) break;
    s = next;
  }
  // Liens internes/externes.
  s = s.replace(/\[\[([^\][]*)\]\]/g, (_, inner) => {
    const parts = splitTop(inner, '|');
    return (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim();
  });
  s = s.replace(/\[(?:https?:)\/\/\S+\s+([^\]]+)\]/g, '$1');
  s = s.replace(/<br\s*\/?>/gi, ' · ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/'''''|'''|''/g, '');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&minus;/g, '−');
  return s.replace(/[ \t]+/g, ' ').replace(/\s*·\s*·\s*/g, ' · ').trim().replace(/^·\s*|\s*·$/g, '').trim();
}

// Sépare le préfixe d'attributs (`style="..."|contenu`, `width=5%|contenu`) du
// contenu, et remonte le colspan : une cellule qui couvre N colonnes est répétée
// N fois, sinon l'en-tête et les lignes de données se désalignent (la table des
// accessoires « Trade » a une colonne Description/Effect en colspan=2, ce qui
// décalait la lecture du rang).
function splitCell(cell) {
  const parts = splitTop(cell, '|');
  let attrs = '';
  let content = cell;
  if (parts.length >= 2) {
    const head = parts[0];
    if (/^[^[{]*=/.test(head) && !/\[\[|\{\{/.test(head)) {
      attrs = head;
      content = parts.slice(1).join('|');
    }
  }
  const m = /colspan\s*=\s*["']?(\d+)/i.exec(attrs);
  return { content: content.trim(), span: m ? Math.max(1, Number(m[1])) : 1 };
}

// Extrait toutes les tables d'une page wikitext.
// Retourne [{ attrs, rows: [[cellules brutes]] }] — la 1re ligne est l'en-tête
// quand la table en a un.
export function parseTables(wikitext) {
  const lines = wikitext.split('\n');
  const tables = [];
  let cur = null;
  let depth = 0;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('{|')) {
      depth++;
      if (depth === 1) { cur = { attrs: t.slice(2).trim(), rows: [] }; continue; }
    }
    if (!cur) continue;
    if (t.startsWith('|}')) {
      depth--;
      if (depth === 0) { tables.push(cur); cur = null; }
      continue;
    }
    if (depth > 1) continue; // tables imbriquées : ignorées

    if (t.startsWith('|-')) { cur.rows.push([]); continue; }
    if (t.startsWith('|+')) continue; // légende
    if (t.startsWith('!') || t.startsWith('|')) {
      if (!cur.rows.length) cur.rows.push([]);
      const row = cur.rows[cur.rows.length - 1];
      const sep = t.startsWith('!') ? '!!' : '||';
      for (const cell of splitTop(t.slice(1), sep)) {
        const { content, span } = splitCell(cell);
        for (let k = 0; k < span; k++) row.push(content);
      }
      continue;
    }
    // Continuation d'une cellule multi-lignes.
    if (cur.rows.length) {
      const row = cur.rows[cur.rows.length - 1];
      if (row.length) row[row.length - 1] += '\n' + t;
    }
  }
  return tables.map((tb) => ({ ...tb, rows: tb.rows.filter((r) => r.length) }));
}

// Découpe une page en sections hiérarchiques (== / === / ====).
// Retourne [{ level, title, body, path: [titres parents] }].
export function parseSections(wikitext) {
  const out = [];
  const re = /^(={2,5})\s*(.+?)\s*\1\s*$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(wikitext))) marks.push({ level: m[1].length, title: plain(m[2]), start: m.index, end: re.lastIndex });
  for (let i = 0; i < marks.length; i++) {
    const body = wikitext.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : wikitext.length);
    out.push({ level: marks[i].level, title: marks[i].title, body });
  }
  // Chemin des titres parents, par pile.
  const stack = [];
  for (const s of out) {
    while (stack.length && stack[stack.length - 1].level >= s.level) stack.pop();
    s.path = stack.map((p) => p.title);
    stack.push(s);
  }
  return out;
}

// « ATK +41 DEF -1 » -> { atk: 41, def: -1 } ; conserve la chaîne d'origine ailleurs.
export function parseStats(str) {
  const stats = {};
  const s = plain(str).replace(/[−–—]/g, '-');
  for (const m of s.matchAll(/\b(ATK|DEF|HP|BRV|LUK)\b\s*([+-]\s*\d+)/gi)) {
    stats[m[1].toLowerCase()] = parseInt(m[2].replace(/\s+/g, ''), 10);
  }
  return stats;
}

// Les noms de boosters ne diffèrent parfois que par un comparateur
// (« BRV ≥ Base Value » / « BRV ≤ Base Value ») : on les transcrit avant de
// réduire à [a-z0-9] pour ne pas fusionner deux items distincts.
export const slugify = (s) => plain(s)
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, '')
  // Les paliers d'abilities ne se distinguent que par « + », « ++ » ou « Ω » :
  // les réduire à [a-z0-9] confondrait Speed Boost, Speed Boost+ et Speed Boost++.
  .replace(/\+/g, '-plus').replace(/ω/g, '-omega')
  .replace(/≥|>=/g, '-ge-').replace(/≤|<=/g, '-le-')
  .replace(/>/g, '-gt-').replace(/</g, '-lt-').replace(/=/g, '-eq-')
  .replace(/%/g, '-pct')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Cible d'un lien/template de cellule : {{LA|Flamberge (gunblade)|Flamberge}}
// -> « Flamberge (gunblade) ». Sert à distinguer deux items homonymes.
export function linkTarget(raw) {
  if (!raw) return null;
  const tpl = /\{\{\s*(?:LA|A|L)\s*\|([^|}]+)/i.exec(raw);
  if (tpl) return tpl[1].trim();
  const lnk = /\[\[([^|\]]+)/.exec(raw);
  return lnk ? lnk[1].trim() : null;
}
