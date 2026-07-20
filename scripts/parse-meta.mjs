// Parse les pages transverses -> data/meta.json
// Usage : node scripts/parse-meta.mjs
import { META_PAGES } from './characters.mjs';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'cache');
const cachePath = (page) => join(CACHE, page.replaceAll('/', '__') + '.html');

function cleanText(s) {
  return (s || '')
    .replace(/\{\{#tooltip:\s*([^|{}]*)\|[^}]*\}\}/g, '$1')
    .replace(/\{\{#tooltip:\s*/g, '')
    .replace(/\}\}/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

// Extrait sections {title, level, text[], tables[]} d'une page, en s'arrêtant à Navigation
function extractPage(page) {
  const file = cachePath(page);
  if (!existsSync(file)) return null;
  const $ = cheerio.load(readFileSync(file, 'utf-8'));
  const $content = $('#mw-content-text .mw-parser-output').first();
  $content.find('style').remove();
  const sections = [];
  let current = { title: null, level: 0, text: [], tables: [] };
  sections.push(current);
  for (const el of $content.children().toArray()) {
    const $el = $(el);
    if ($el.hasClass('mw-heading')) {
      const h = $el.find('h1,h2,h3,h4').first();
      const title = cleanText(h.text());
      if (/^(navigation)$/i.test(title)) break;
      current = { title, level: parseInt((h[0]?.tagName || 'h2').slice(1), 10), text: [], tables: [] };
      sections.push(current);
      continue;
    }
    const tag = el.tagName?.toLowerCase();
    if (tag === 'table') {
      const rows = $(el)
        .find('> tbody > tr')
        .toArray()
        .map((tr) => $(tr).find('> th, > td').toArray().map((c) => cleanText($(c).text())));
      current.tables.push({ caption: cleanText($(el).find('caption').first().text()) || null, rows });
      continue;
    }
    if (['p', 'ul', 'ol', 'dl', 'blockquote'].includes(tag)) {
      const t = cleanText($(el).text());
      if (t) current.text.push(t);
    }
  }
  return { page, url: `https://dissidia.wiki/${page}`, sections: sections.filter((s) => s.text.length || s.tables.length) };
}

const pages = {};
for (const p of META_PAGES) {
  const data = extractPage(p);
  if (data) pages[p] = data;
  else console.warn(`SKIP ${p}`);
}

// --- Tier list 2017 (tournoi) : structurée depuis la table ---
function structureTierList() {
  const tl = pages['Tier_List_(Dissidia_012)'];
  if (!tl) return null;
  const sec = tl.sections.find((s) => /tournament/i.test(s.title || ''));
  const entries = [];
  let tier = null;
  const scan = (cells) => {
    for (const c of cells) {
      const t = c.match(/^(S|A\+?|B|C|D|E|F)\s*Tier$/i);
      if (t) { tier = t[1].toUpperCase(); continue; }
      const m = c.match(/^(\d+)(?:st|nd|rd|th)$/);
      if (m) { entries.push({ rank: parseInt(m[1], 10), tier, name: null }); continue; }
      if (c && entries.length && entries[entries.length - 1].name === null) entries[entries.length - 1].name = c;
    }
  };
  for (const tbl of sec?.tables || []) for (const row of tbl.rows) scan(row);
  return {
    year: 2017,
    method: sec?.text.find((t) => /MU values|professional opinion/i.test(t)) || null,
    staff: 'Ehx, Yunoa, Wheelz, JT, Blakklite, Dart',
    entries,
    note: 'Feral Chaos non classé (absent de la liste tournoi 2017).',
    source: tl.url,
  };
}

// --- Tier list assist : depuis la table Ranking ---
function structureAssistTiers() {
  const tl = pages['Tier_List_(Assist)'];
  if (!tl) return null;
  const tiers = {};
  let current = null;
  for (const s of tl.sections) {
    for (const tbl of s.tables) {
      for (const row of tbl.rows) {
        for (const cell of row) {
          const t = cell.match(/^(Top|High|Mid|Low|Bottom)\s*Tier$/i);
          if (t) { current = t[1]; tiers[current] = tiers[current] || []; continue; }
          if (current && cell) {
            tiers[current].push(...cell.split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean));
          }
        }
      }
    }
  }
  const perAssist = tl.sections
    .filter((s) => /tier$/i.test(s.title || '') || /^(top|high|mid|low|bottom)/i.test(s.title || ''))
    .map((s) => ({ title: s.title, text: s.text }));
  return {
    author: 'Muggshotter',
    tiers,
    commentary: perAssist,
    note: "Feral Chaos n'est pas disponible comme assist.",
    source: tl.url,
  };
}

const meta = {
  generated: null, // horodatage ajouté hors script (déterminisme)
  tierList: structureTierList(),
  assistTierList: structureAssistTiers(),
  movementSpeed: pages['Movement_Speed_Ranking_(Dissidia_012)'] || null,
  attackPriority: pages['Attack_Priority_(Dissidia_012)'] || null,
  glossary: pages['Glossary_(Dissidia_012)'] || null,
  multiplayerBuildGuide: pages['Multiplayer_Build_Guide_(Dissidia_012)'] || null,
  techniques: {
    blodge: pages['Blodge'] || null,
    dashFeint: pages['Dash_feint'] || null,
    lockOff: pages['Lock_Off'] || null,
    dodge: pages['Dodge_(Dissidia_012)'] || null,
  },
  glitches: {
    equipGlitch: pages['Equip_Glitch_(Dissidia_012)'] || null,
    assistStorageGlitch: pages['Assist_Storage_Glitch'] || null,
  },
  onlineSetup: pages['Online_Setup_(PPSSPP)'] || null,
};

writeFileSync(join(ROOT, 'data', 'meta.json'), JSON.stringify(meta, null, 2));
const tlEntries = meta.tierList?.entries?.length ?? 0;
const assistTiers = Object.entries(meta.assistTierList?.tiers || {}).map(([k, v]) => `${k}:${v.length}`).join(' ');
console.log(`meta.json écrit — tierList: ${tlEntries} entrées, assists: ${assistTiers}`);
