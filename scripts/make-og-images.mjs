// Images de partage (Open Graph) — 1200×630, une par personnage + une pour le
// site. Usage : node scripts/make-og-images.mjs [--force]
//
// Pourquoi les générer : les portraits du wiki font 256×256, trop petit pour la
// grande carte de Discord, Reddit ou X. Un lien partagé sans aperçu correct est
// un lien qui n'est pas cliqué — donc pas de visite et pas de lien entrant.
//
// Rien n'est appelé sur le réseau et aucune image n'est produite par IA : le
// visuel est un SVG composé ici (portrait officiel + texte), rendu par resvg.
//
// Police : le design system déclare `--font-display: "Cinzel", "Times New
// Roman", Georgia, serif`. Cinzel n'est pas installée localement (elle est
// servie par Google Fonts au navigateur) ; le rendu utilise donc le premier
// repli disponible sur la machine, exactement comme le ferait un visiteur sans
// accès à Google Fonts. Les images produites sont commitées, le rendu est donc
// figé une fois pour toutes.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { CHARACTERS, SPECIAL } from './characters.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'og');
const FORCE = process.argv.includes('--force');

const C = {
  bg: '#141021', surface: '#1d1734', surface2: '#272049',
  text: '#efeaf8', muted: '#a89ec6', gold: '#f0c05a', violet: '#9d86e8',
};

// Polices d'affichage candidates, dans l'ordre du design system. La première
// présente est utilisée ; si aucune ne l'est, resvg prend la police système par
// défaut (le texte reste lisible, le rendu est juste moins typé).
const FONT_DIRS = ['C:/Windows/Fonts', '/usr/share/fonts', '/Library/Fonts', join(ROOT, 'assets', 'fonts')]
  .filter((d) => existsSync(d));
const DISPLAY_CANDIDATES = ['Cinzel', 'Times New Roman', 'Georgia', 'DejaVu Serif', 'Liberation Serif'];

function pickDisplayFont() {
  // resvg résout les familles via les polices système chargées ; on vérifie
  // seulement quel nom de famille a une chance d'exister sur cette machine.
  const files = new Set();
  for (const d of FONT_DIRS) {
    try { for (const f of readdirSync(d)) files.add(f.toLowerCase()); } catch { /* dossier illisible */ }
  }
  const probe = { Cinzel: 'cinzel', 'Times New Roman': 'times', Georgia: 'georgia', 'DejaVu Serif': 'dejavuserif', 'Liberation Serif': 'liberationserif' };
  for (const fam of DISPLAY_CANDIDATES) {
    const needle = probe[fam];
    for (const f of files) if (f.includes(needle)) return fam;
  }
  return 'serif';
}

const DISPLAY_FONT = pickDisplayFont();

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const dataUri = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;

// Découpe un texte en lignes tenant dans `max` caractères (approximation
// suffisante : les taglines sont courtes et la police est connue).
function wrap(text, max, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; if (lines.length === maxLines) break; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[,;:]?$/, '') + '…';
  }
  return lines;
}

// Fond commun : nuit violette, halo, cadre or, bande de marque en bas.
function backdrop() {
  return `<defs>
<radialGradient id="halo" cx="0.28" cy="0.42" r="0.62">
<stop offset="0" stop-color="${C.surface2}"/>
<stop offset="1" stop-color="${C.bg}"/>
</radialGradient>
<linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${C.gold}" stop-opacity="0.9"/>
<stop offset="1" stop-color="${C.violet}" stop-opacity="0.25"/>
</linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#halo)"/>
<rect x="18" y="18" width="1164" height="594" fill="none" stroke="${C.surface2}" stroke-width="2" rx="14"/>
<rect x="0" y="618" width="1200" height="12" fill="url(#rule)"/>`;
}

function characterSvg({ name, origin, tagline, tier, portrait }) {
  const px = 100, py = 137, ps = 356; // portrait : carré, centré verticalement
  // Colonne de texte : le cadre du portrait s'arrête à px + ps + 16, il faut
  // partir franchement après, sinon le texte vient coller le trait doré.
  const tx = portrait ? px + ps + 16 + 60 : 96;
  const nameSize = name.length > 16 ? 62 : name.length > 12 ? 72 : 84;
  const taglineLines = wrap(tagline, 42, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
${backdrop()}
${portrait ? `<g>
<rect x="${px - 16}" y="${py - 16}" width="${ps + 32}" height="${ps + 32}" rx="18" fill="${C.surface}" stroke="${C.gold}" stroke-width="2" stroke-opacity="0.45"/>
<image x="${px}" y="${py}" width="${ps}" height="${ps}" href="${portrait}" preserveAspectRatio="xMidYMid meet"/>
</g>` : ''}
<text x="${tx}" y="182" font-family="${esc(DISPLAY_FONT)}" font-size="26" fill="${C.violet}" letter-spacing="3">GUIDE COMPÉTITIF</text>
<text x="${tx}" y="${182 + nameSize + 14}" font-family="${esc(DISPLAY_FONT)}" font-size="${nameSize}" font-weight="700" fill="${C.gold}">${esc(name)}</text>
${origin ? `<text x="${tx}" y="${182 + nameSize + 56}" font-family="${esc(DISPLAY_FONT)}" font-size="27" fill="${C.text}">${esc(origin)}</text>` : ''}
${taglineLines.map((l, i) => `<text x="${tx}" y="${182 + nameSize + 108 + i * 34}" font-family="Segoe UI, sans-serif" font-size="25" fill="${C.muted}">${esc(l)}</text>`).join('\n')}
${tier ? `<g>
<rect x="${tx}" y="${182 + nameSize + 108 + taglineLines.length * 34 + 14}" width="${160 + tier.length * 16}" height="42" rx="21" fill="${C.surface}" stroke="${C.gold}" stroke-width="1.5"/>
<text x="${tx + 20}" y="${182 + nameSize + 108 + taglineLines.length * 34 + 42}" font-family="Segoe UI, sans-serif" font-size="23" fill="${C.gold}">Tier ${esc(tier)} · 2017</text>
</g>` : ''}
<text x="1152" y="588" text-anchor="end" font-family="${esc(DISPLAY_FONT)}" font-size="25" fill="${C.muted}">Dissidia 012 <tspan fill="${C.gold}">[duodecim]</tspan></text>
</svg>`;
}

function siteSvg(portraits, { title, subtitle, tagline }) {
  // Bande de portraits : donne à voir qu'il s'agit du roster complet.
  const n = Math.min(portraits.length, 9);
  const size = 104, gap = 14;
  const totalW = n * size + (n - 1) * gap;
  const startX = (1200 - totalW) / 2;
  const y = 392;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
${backdrop()}
<text x="600" y="176" text-anchor="middle" font-family="${esc(DISPLAY_FONT)}" font-size="${title.length > 24 ? 60 : 70}" font-weight="700" fill="${C.gold}">${esc(title)}</text>
<text x="600" y="240" text-anchor="middle" font-family="${esc(DISPLAY_FONT)}" font-size="40" fill="${C.text}">${esc(subtitle)}</text>
<text x="600" y="304" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="26" fill="${C.muted}">${esc(tagline)}</text>
${portraits.slice(0, n).map((p, i) => `<g>
<rect x="${startX + i * (size + gap)}" y="${y}" width="${size}" height="${size}" rx="12" fill="${C.surface}" stroke="${C.surface2}" stroke-width="2"/>
<image x="${startX + i * (size + gap)}" y="${y}" width="${size}" height="${size}" href="${p}" preserveAspectRatio="xMidYMid meet"/>
</g>`).join('\n')}
</svg>`;
}

function render(svg, out) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontDirs: FONT_DIRS, loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
  }).render().asPng();
  writeFileSync(out, png);
}

// --- Exécution ---
mkdirSync(OUT, { recursive: true });

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);
const meta = readJson(join(ROOT, 'data', 'meta.json'));

// Tier réel par slug — repris de la même correspondance que le build
const TIER_NAME_TO_SLUG = {
  exdeath: 'exdeath', prishe: 'prishe', ultimecia: 'ultimecia', lightning: 'lightning',
  squall: 'squall-leonhart', jecht: 'jecht', zidane: 'zidane-tribal', sephiroth: 'sephiroth',
  kuja: 'kuja', cloud: 'cloud-strife', kefka: 'kefka-palazzo', firion: 'firion',
  'the emperor': 'the-emperor', 'warrior of light': 'warrior-of-light', 'onion knight': 'onion-knight',
  golbez: 'golbez', kain: 'kain-highwind', tidus: 'tidus', gilgamesh: 'gilgamesh',
  gabranth: 'gabranth', yuna: 'yuna', tifa: 'tifa-lockhart', shantotto: 'shantotto',
  garland: 'garland', vaan: 'vaan', terra: 'terra-branford', cecil: 'cecil-harvey',
  'cloud of darkness': 'cloud-of-darkness', laguna: 'laguna-loire', bartz: 'bartz-klauser',
};
const tierBySlug = {};
for (const e of meta?.tierList?.entries || []) {
  const slug = TIER_NAME_TO_SLUG[(e.name || '').toLowerCase()];
  if (slug) tierBySlug[slug] = e.tier;
}

let made = 0, skipped = 0;
for (const c of [...CHARACTERS, ...SPECIAL]) {
  // chaos.html n'est qu'une redirection : pas d'image de partage.
  if (c.slug === 'chaos') continue;
  const out = join(OUT, `${c.slug}.png`);
  if (existsSync(out) && !FORCE) { skipped++; continue; }
  const data = readJson(join(ROOT, 'data', 'characters', `${c.slug}.json`));
  const ed = readJson(join(ROOT, 'data', 'editorial', `${c.slug}.json`));
  const pFile = join(ROOT, 'assets', 'portraits', `${c.slug}.png`);
  render(characterSvg({
    name: data?.name || c.name,
    origin: data?.origin || '',
    // La tagline éditoriale, telle qu'écrite — jamais reformulée ici.
    tagline: ed?.tagline || ed?.archetype || '',
    tier: tierBySlug[c.slug] || null,
    portrait: existsSync(pFile) ? dataUri(pFile) : null,
  }), out);
  made++;
}

// Pages sans personnage unique : accueil et créateur de builds. La bande de
// portraits reprend les nouveaux venus de 012 (première rangée de l'écran de
// sélection) suivis des trois personnages du tier S.
{
  const featured = ['lightning', 'vaan', 'laguna-loire', 'yuna', 'kain-highwind', 'tifa-lockhart', 'prishe', 'exdeath', 'ultimecia'];
  const portraits = featured
    .map((s) => join(ROOT, 'assets', 'portraits', `${s}.png`))
    .filter(existsSync)
    .map(dataUri);
  const pages = [
    ['site', {
      title: 'Dissidia 012 [duodecim]',
      subtitle: 'Guides compétitifs français',
      tagline: '31 personnages · frame data · matchups · créateur de builds',
    }],
    ['createur-de-builds', {
      title: 'Créateur de builds',
      subtitle: 'Dissidia 012 [duodecim]',
      tagline: 'Attaques, abilities, équipement, accessoires · jauge de CP · règles tournoi',
    }],
  ];
  for (const [name, texts] of pages) {
    const out = join(OUT, `${name}.png`);
    if (existsSync(out) && !FORCE) { skipped++; continue; }
    render(siteSvg(portraits, texts), out);
    made++;
  }
}

console.log(`images OG : ${made} générée(s), ${skipped} déjà présente(s) — police d'affichage « ${DISPLAY_FONT} »${FORCE ? ' (--force)' : ''}`);
