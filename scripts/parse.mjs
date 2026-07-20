// Parse les HTML cachés de dissidia.wiki -> data/characters/{slug}.json
// Usage : node scripts/parse.mjs [slug ...]
import { CHARACTERS, SPECIAL } from './characters.mjs';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'cache');
const OUT = join(ROOT, 'data', 'characters');
mkdirSync(OUT, { recursive: true });

const cachePath = (page) => join(CACHE, page.replaceAll('/', '__') + '.html');

// Nettoie les artefacts de templates MediaWiki mal rendus ({{#tooltip: ...}}, etc.)
function cleanText(s) {
  return (s || '')
    .replace(/\{\{#tooltip:\s*([^|{}]*)\|[^}]*\}\}/g, '$1')
    .replace(/\{\{#tooltip:\s*/g, '')
    .replace(/\}\}/g, '')
    .replace(/&lt;\/?tabber&gt;/g, '')
    .replace(/<\/?tabber>/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

// Texte d'un élément avec les <br> convertis en sauts de ligne (sinon cheerio
// colle les segments : « Combo<br>Howling Fist » -> « ComboHowling Fist »)
function brText($, el) {
  const $c = $(el).clone();
  $c.find('br').replaceWith('\n');
  return $c.text();
}

// Libellés des lignes de table de coups : le rendu cassé de {{#tooltip}} remplace
// certains labels par leur texte d'infobulle -> mapping par mots-clés.
function rowKey(label) {
  const l = label.toLowerCase();
  if (l.includes('baseline damage')) return 'damage';
  if (l.includes('time it takes for this attack')) return 'startup';
  if (l.includes('damage type')) return 'type';
  if (l.includes('priority')) return 'priority';
  if (l.includes('ex that can be gained') || l.includes('ex force')) return 'exForce';
  if (l.startsWith('effects')) return 'effects';
  if (l.includes('cancelled into')) return 'cancels';
  if (l.includes('assist gauge filled') || l.startsWith('assist gain')) return 'assistGain';
  if (l.startsWith('cp')) return 'cp';
  if (l.includes('wall rush')) return 'wallRush';
  return null;
}

function parseMoveTable($, table) {
  const move = { variants: null };
  const matrix = [];
  const rows = $(table).find('> tbody > tr').toArray();
  for (const tr of rows) {
    matrix.push($(tr).find('> th, > td').toArray().map((c) => cleanText($(c).text())));
  }
  for (const tr of rows) {
    const ths = $(tr).find('> th').toArray();
    const tds = $(tr).find('> td').toArray();
    // Ligne image (th rowspan avec img)
    if (ths.length === 1 && tds.length === 0) {
      const img = $(ths[0]).find('img').attr('src');
      if (img) move.image = img;
      continue;
    }
    // Ligne d'en-tête de variantes : <th></th><th>Normal</th><th>Charged</th>
    if (ths.length > 1 && tds.length === 0) {
      const labels = ths.map((t) => cleanText($(t).text())).filter(Boolean);
      if (labels.length) move.variants = labels;
      continue;
    }
    // Ligne descriptive finale : <td><i>desc</i></td><td>Unlocked...</td><td>Mastered...</td>
    if (ths.length === 0 && tds.length >= 1) {
      const it = $(tds[0]).find('i').first();
      const desc = cleanText(it.length ? it.text() : $(tds[0]).text());
      if (desc && !/^Unlocked|^Mastered/.test(desc)) move.description = desc;
      continue;
    }
    if (ths.length === 1 && tds.length >= 1) {
      const key = rowKey(cleanText($(ths[0]).text()));
      if (!key) continue;
      const vals = tds.map((td) => cleanText(brText($, td)));
      move[key] = vals.length === 1 ? vals[0] : vals;
    }
  }
  // Table au format non standard (ex. assists : Startup/Position/Spawn/Effect en
  // en-têtes de colonnes) : aucune ligne-champ reconnue -> garder la matrice brute.
  const hasFields = FIELD_KEYS.some((k) => k in move);
  if (!hasFields && matrix.length) move.rawRows = matrix.filter((r) => r.length > 1);
  return move;
}
const FIELD_KEYS = ['damage', 'startup', 'type', 'priority', 'exForce', 'effects', 'cancels', 'assistGain', 'cp'];

// Découpe un flux d'éléments (p, table, div...) en coups. Marqueurs de nom :
// "|-|Nom=" (tabber standard) et "Nom=" seul en fin de ligne (tabber alternatif,
// ex. Jecht "Level 1="). Les variantes "Level N" sont qualifiées par le dernier
// nom de coup complet ("Jecht Rush — Level 2").
// Dernier recours pour nommer un coup : le nom de fichier de son screenshot
// (ex. Brv_cloud_of_darkness_tentacle_of_pain_1st.jpeg -> "Tentacle Of Pain 1st")
function nameFromImage(url, charWords) {
  const base = decodeURIComponent(url.split('/').pop() || '').replace(/\.\w+$/, '');
  const tokens = base.split('_').filter((t) => t && !/^(brv|hp|ex)$/i.test(t) && !charWords.has(t.toLowerCase()));
  if (!tokens.length) return null;
  return tokens.map((t) => t[0].toUpperCase() + t.slice(1)).join(' ');
}

function parseMovesFlow($, elems, charWords = new Set()) {
  const moves = [];
  const intro = [];
  let pendingName = null;
  let pendingNotes = [];
  let lastMove = null;
  let lastBaseName = null;

  // Marqueur de VARIANTE (et non de coup) : qualifié par le dernier nom complet
  const VARIANT = /^((level|phase|stage)\s*\d+|normal|ex mode|charged|uncharged|max(\s*charge)?|grounded|midair)$/i;
  const setPending = (rawName, rest) => {
    let name = rawName.trim();
    if (VARIANT.test(name)) {
      if (lastBaseName) name = `${lastBaseName} — ${name}`;
    } else {
      lastBaseName = name;
    }
    pendingName = name;
    pendingNotes = rest && rest.trim() ? [rest.trim()] : [];
    lastMove = null;
  };

  for (const el of elems) {
    const tag = el.tagName?.toLowerCase();
    if (tag === 'table' && $(el).hasClass('wikitable')) {
      const move = parseMoveTable($, el);
      // Table annexe (comparatif, interactions...) sans nom en attente : c'est un
      // complément du coup précédent, pas un coup autonome.
      if (move.rawRows && !pendingName && lastMove) {
        lastMove.extraTables = [...(lastMove.extraTables || []), { caption: null, rows: move.rawRows }];
        continue;
      }
      move.name = pendingName
        || cleanText($(el).find('caption').first().text())
        || (move.image ? nameFromImage(move.image, charWords) : null);
      if (pendingNotes.length) move.context = pendingNotes.join('\n');
      moves.push(move);
      lastMove = move;
      pendingName = null;
      pendingNotes = [];
      continue;
    }
    if (tag === 'p' || tag === 'ul' || tag === 'dl' || tag === 'ol') {
      const text = cleanText($(el).text());
      if (!text) continue;
      for (const line of text.split('\n')) {
        // un même segment peut contenir du texte + un ou plusieurs marqueurs |-|Nom=
        const parts = line.split(/\|-\|/);
        const head = parts[0].trim();
        if (head) {
          // marqueur tabber alternatif : « Nom= » seul (le = termine la ligne)
          const alt = head.match(/^([A-Za-z][^=]{0,44})=$/);
          if (alt) {
            setPending(alt[1], '');
          } else if (pendingName) {
            pendingNotes.push(head);
          } else if (lastMove) {
            lastMove.notes = ((lastMove.notes || '') + '\n' + head).trim();
          } else {
            intro.push(head);
          }
        }
        for (let i = 1; i < parts.length; i++) {
          const m = parts[i].match(/^([^=]+)=\s*([\s\S]*)$/);
          if (m) setPending(m[1], m[2]);
        }
      }
    }
  }
  return { intro: intro.join('\n') || null, moves };
}

const KNOWN_SECTIONS = [
  { id: 'overview', match: /^overview$/i },
  { id: 'bravery', match: /^bravery attacks$/i },
  { id: 'hp', match: /^hp attacks$/i },
  { id: 'exMode', match: /^ex mode/i },
  { id: 'uniqueMechanics', match: /^unique mechanic/i },
  { id: 'combos', match: /^combos$/i },
  { id: 'builds', match: /^builds?$/i },
  { id: 'assist', match: /^assists?$/i },
  { id: 'references', match: /^references$/i },
  { id: 'navigation', match: /^navigation$/i },
  { id: 'roadmap', match: /^wiki roadmap/i },
];

// Découpe mw-parser-output en sections top-level par titres connus (niveau h variable
// selon les pages), avec sous-sections pour les autres titres.
function splitSections($, $content) {
  const sections = [];
  let current = null;
  let sub = null;
  for (const el of $content.children().toArray()) {
    const $el = $(el);
    const isHeading = $el.hasClass('mw-heading');
    if (isHeading) {
      const title = cleanText($el.find('h1,h2,h3,h4').first().text());
      const known = KNOWN_SECTIONS.find((k) => k.match.test(title));
      if (known) {
        current = { id: known.id, title, elems: [], subs: [] };
        sections.push(current);
        sub = null;
        continue;
      }
      if (current) {
        sub = { title, elems: [] };
        current.subs.push(sub);
        continue;
      }
    }
    if (!current) {
      // avant la première section connue : préambule (infobox, nav perso, intro)
      if (!sections.preamble) sections.preamble = [];
      sections.preamble.push(el);
      continue;
    }
    (sub ? sub.elems : current.elems).push(el);
  }
  return sections;
}

function textOf($, elems) {
  const out = [];
  for (const el of elems) {
    const tag = el.tagName?.toLowerCase();
    if (tag === 'p' || tag === 'ul' || tag === 'ol' || tag === 'dl' || tag === 'blockquote') {
      const t = cleanText($(el).text());
      if (t) out.push(t);
    }
  }
  return out;
}

// Les templates {{#tooltip}} du wiki remplacent certains libellés par leur texte
// d'infobulle : on les remappe vers des libellés courts (français).
const LABEL_MAP = [
  [/baseline damage/i, 'Dégâts de base'],
  [/time it takes for this attack/i, 'Startup'],
  [/^damage type/i, 'Type'],
  [/^priority/i, 'Priorité'],
  [/ex that can be gained|ex force/i, 'EX Force'],
  [/cancelled into/i, 'Cancels'],
  [/assist gauge filled/i, "Gain d'assist"],
  [/^cp \(mastered\)/i, 'CP (maîtrisé)'],
];

function cleanCell(s) {
  let t = cleanText(s)
    .replace(/<\/?img[^>]*>/gi, '')  // fragments <img …> littéraux des templates cassés
    .replace(/^Unlocked at\s*level/i, 'Débloqué au niveau')
    .replace(/^Mastered at\s*(.*)$/i, 'Maîtrisé à $1')
    .trim();
  for (const [re, label] of LABEL_MAP) {
    if (re.test(t)) return label;
  }
  return t;
}

// Tables génériques -> matrice de cellules texte (nettoyées)
function tablesOf($, elems) {
  const out = [];
  for (const el of elems) {
    if (el.tagName?.toLowerCase() === 'table') {
      const caption = cleanCell($(el).find('caption').first().text()) || null;
      const rows = $(el)
        .find('> tbody > tr')
        .toArray()
        .map((tr) => $(tr).find('> th, > td').toArray().map((c) => cleanCell(brText($, c))))
        // lignes sans aucune valeur utile (vides ou « - ») : bruit des templates
        .filter((cells) => cells.some((c) => c && c !== '-'))
        .filter((cells) => !(cells.length > 1 && cells.slice(1).every((c) => c === '' || c === '-')));
      // une table réduite à une ligne est un squelette vide (ex. « Build #2 » non rempli)
      if (rows.length >= 2) out.push({ caption, rows });
    }
  }
  return out;
}

function parseInfobox($, elems) {
  const candidates = [];
  for (const el of elems) {
    if (el.tagName?.toLowerCase() === 'table') candidates.push(el);
    else $(el).find('table').each((_, t) => candidates.push(t));
  }
  for (const el of candidates) {
    const text = $(el).text();
    if (!text.includes('Base ATK')) continue;
    const info = {};
    for (const tr of $(el).find('tr').toArray()) {
      const cells = $(tr).find('> th, > td').toArray();
      if (cells.length === 2) {
        const key = cleanText($(cells[0]).text());
        const val = cleanText($(cells[1]).text());
        if (key && val) info[key] = val;
      }
    }
    return info;
  }
  return null;
}

function isStub(text) {
  if (!text) return true;
  const boiler = /(The idea is to be a condensed version|A match-?up page for the character|page for the character)/i;
  return text.length < 400 || boiler.test(text);
}

function parseCharacter(char) {
  const file = cachePath(char.page);
  if (!existsSync(file)) {
    console.warn(`SKIP ${char.slug}: pas de cache`);
    return null;
  }
  const html = readFileSync(file, 'utf-8');
  const $ = cheerio.load(html);
  const $content = $('#mw-content-text .mw-parser-output').first();

  const sections = splitSections($, $content);
  const bySec = Object.fromEntries(sections.map((s) => [s.id, s]));
  const preamble = sections.preamble || [];

  const portraitMatch = html.match(/https:\/\/resources\.dissidia\.wiki\/ddff\/portraits\/[^"'\s)]+\.png/);
  const infobox = parseInfobox($, preamble);

  const data = {
    slug: char.slug,
    name: char.name,
    page: char.page,
    url: `https://dissidia.wiki/${char.page}`,
    origin: char.origin,
    icon: char.icon || null,
    portraitUrl: portraitMatch ? portraitMatch[0] : null,
    infobox,
    sections: {},
  };

  // Overview
  if (bySec.overview) {
    const text = textOf($, bySec.overview.elems);
    data.sections.overview = { documented: text.length > 0, text, tables: tablesOf($, bySec.overview.elems), sources: [data.url] };
  } else data.sections.overview = { documented: false };

  // Bravery / HP : sous-sections Ground/Aerial/Followups, ou flux direct
  for (const key of ['bravery', 'hp']) {
    const sec = bySec[key];
    if (!sec) {
      data.sections[key] = { documented: false };
      continue;
    }
    // Les segments (contenu direct + sous-sections) sont parcourus dans l'ordre :
    // ground/aerial/followups changent de groupe ; les autres titres (« Data
    // comparison », « X's frame data »…) sont des continuations du groupe courant.
    // Exception : une sous-section au nom propre contenant exactement une table
    // sans nom est un coup nommé d'après son titre (pages assist : h2 « Cure »).
    const GENERIC_SUB = /data comparison|frame data|^notes?$/i;
    const segs = [{ title: null, elems: sec.elems }, ...sec.subs.map((s) => ({ title: s.title, elems: s.elems }))];
    const order = [];
    const merged = {};
    let cur = 'main';
    const standalone = [];
    for (const seg of segs) {
      const t = (seg.title || '').toLowerCase();
      if (t.includes('ground')) cur = 'ground';
      else if (t.includes('aerial') || t.includes('midair')) cur = 'aerial';
      else if (t.includes('followup')) cur = 'followups';
      else if (seg.title && !GENERIC_SUB.test(seg.title)) {
        // titre spécifique : peut être un coup nommé isolé (à vérifier après parse)
        standalone.push(seg);
        continue;
      }
      if (!merged[cur]) { merged[cur] = []; order.push(cur); }
      merged[cur].push(...seg.elems);
    }
    const charWords = new Set(char.page.replace(/_\(Dissidia_012\)$/, '').toLowerCase().split('_'));
    const groups = {};
    for (const k of order) {
      const flow = parseMovesFlow($, merged[k], charWords);
      if (flow.moves.length || flow.intro) groups[k] = flow;
    }
    for (const seg of standalone) {
      const flow = parseMovesFlow($, seg.elems, charWords);
      if (flow.moves.length === 1 && !flow.moves[0].name) flow.moves[0].name = seg.title;
      if (flow.moves.length) groups[seg.title] = flow;
    }
    const count = Object.values(groups).reduce((n, g) => n + g.moves.length, 0);
    data.sections[key] = { documented: count > 0, groups, moveCount: count, sources: [data.url] };
  }

  // EX Mode
  if (bySec.exMode) {
    data.sections.exMode = {
      documented: true,
      title: bySec.exMode.title,
      text: textOf($, bySec.exMode.elems),
      tables: tablesOf($, bySec.exMode.elems),
      subs: bySec.exMode.subs.map((s) => ({ title: s.title, text: textOf($, s.elems), tables: tablesOf($, s.elems) })),
      sources: [data.url],
    };
  } else data.sections.exMode = { documented: false };

  // Mécanique unique
  if (bySec.uniqueMechanics) {
    data.sections.uniqueMechanics = {
      documented: true,
      title: bySec.uniqueMechanics.title,
      text: textOf($, bySec.uniqueMechanics.elems),
      tables: tablesOf($, bySec.uniqueMechanics.elems),
      subs: bySec.uniqueMechanics.subs.map((s) => ({ title: s.title, text: textOf($, s.elems), tables: tablesOf($, s.elems) })),
      sources: [data.url],
    };
  } else data.sections.uniqueMechanics = { documented: false };

  // Combos, Builds, Assist : texte + tables + sous-sections (l'éditorial s'appuiera dessus)
  for (const key of ['combos', 'builds', 'assist']) {
    const sec = bySec[key];
    if (!sec) {
      data.sections[key] = { documented: false };
      continue;
    }
    const payload = {
      text: textOf($, sec.elems),
      tables: tablesOf($, sec.elems),
      subs: sec.subs.map((s) => ({ title: s.title, text: textOf($, s.elems), tables: tablesOf($, s.elems) })),
      sources: [data.url],
    };
    const size = payload.text.join('').length +
      payload.subs.reduce((n, s) => n + s.text.join('').length + s.tables.length * 50, 0) +
      payload.tables.length * 50;
    payload.documented = size > 100;
    data.sections[key] = payload;
  }

  // Références (liens externes)
  if (bySec.references) {
    const refs = [];
    $(bySec.references.elems).find('a[href^="http"]').each((_, a) => {
      refs.push({ text: cleanText($(a).text()), url: $(a).attr('href') });
    });
    for (const el of bySec.references.elems) {
      $(el).find('a[href^="http"]').each((_, a) => refs.push({ text: cleanText($(a).text()), url: $(a).attr('href') }));
    }
    const seen = new Set();
    data.sections.references = {
      documented: refs.length > 0,
      links: refs.filter((r) => !seen.has(r.url) && seen.add(r.url)),
    };
  } else data.sections.references = { documented: false, links: [] };

  // Matchups (sous-page)
  const muFile = cachePath(char.page + '/Matchups');
  if (existsSync(muFile)) {
    const mu$ = cheerio.load(readFileSync(muFile, 'utf-8'));
    const cont = mu$('#mw-content-text .mw-parser-output').first();
    cont.find('style, .navbox').remove();
    // coupe à partir de Navigation
    let txt = '';
    for (const el of cont.children().toArray()) {
      const $el = mu$(el);
      if ($el.hasClass('mw-heading') && /navigation/i.test($el.text())) break;
      txt += ' ' + mu$(el).text();
    }
    // retire la nav perso (première wikitable de liens)
    txt = cleanText(txt.replace(/General\s+Starter Guide\s+Combos\s+Strategy[\s\S]{0,200}?Resources/, ''));
    const stub = isStub(txt);
    data.sections.matchups = {
      documented: !stub,
      stub,
      text: stub ? null : txt,
      sources: [`https://dissidia.wiki/${char.page}/Matchups`],
    };
  } else data.sections.matchups = { documented: false, stub: true };

  data.sources = [data.url, ...(data.sections.references.links || []).map((r) => r.url)];
  return data;
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const all = [...CHARACTERS, ...SPECIAL];
const targets = only.length ? all.filter((c) => only.includes(c.slug)) : all;

const summary = [];
for (const char of targets) {
  const data = parseCharacter(char);
  if (!data) continue;
  writeFileSync(join(OUT, `${char.slug}.json`), JSON.stringify(data, null, 2));
  const s = data.sections;
  summary.push({
    slug: char.slug,
    braveryMoves: s.bravery?.moveCount ?? 0,
    hpMoves: s.hp?.moveCount ?? 0,
    overview: !!s.overview?.documented,
    exMode: !!s.exMode?.documented,
    unique: !!s.uniqueMechanics?.documented,
    combos: !!s.combos?.documented,
    builds: !!s.builds?.documented,
    assist: !!s.assist?.documented,
    matchups: !!s.matchups?.documented,
    portrait: !!data.portraitUrl,
    infobox: !!data.infobox,
  });
  console.log(`ok  ${char.slug}  brv:${s.bravery?.moveCount ?? 0} hp:${s.hp?.moveCount ?? 0} ex:${s.exMode?.documented ? 'y' : 'N'} uniq:${s.uniqueMechanics?.documented ? 'y' : '-'} builds:${s.builds?.documented ? 'y' : 'N'} mu:${s.matchups?.documented ? 'y' : 'stub'}`);
}
writeFileSync(join(ROOT, 'reports', 'parse-summary.json'), JSON.stringify(summary, null, 2));
console.log(`\n${summary.length} personnages parsés -> data/characters/`);
