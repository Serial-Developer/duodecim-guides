// QA : (1) aucune ressource locale manquante, (2) contrôle anti-invention
// (chaque section rendue est adossée à documented:true OU affiche le bandeau),
// (3) liens externes vivants (option --links, requêtes réseau).
// Usage : node scripts/qa.mjs [--links]
import { CHARACTERS, SPECIAL } from './characters.mjs';
import * as cheerio from 'cheerio';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, DEFAULT_LOCALE, LOCALE_META, localeDir } from '../src/i18n/config.mjs';
import { guidePathFor } from '../src/i18n/routes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const errors = [];
const warns = [];

// --- 1. Ressources locales ---
// Découverte automatique : une liste écrite à la main finit par oublier une page
// (multijoueur.html a échappé aux contrôles jusqu'à cette passe). 404.html est
// traité à part, avec les contrôles de référencement.
// Le parcours est récursif : les arbres de langue sont des sous-dossiers de
// dist/ (dist/en/…), et une découverte à plat les manquerait entièrement.
const SKIP_DIRS = new Set(['assets', 'styles', 'scripts']);
function findHtml(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...findHtml(full));
    } else if (name.endsWith('.html') && !(dir === DIST && name === '404.html')) {
      out.push(full);
    }
  }
  return out;
}
const htmlFiles = findHtml(DIST);
// Locales réellement publiées : celles dont l'arbre existe dans dist/.
const builtLocales = LOCALES.filter((l) => existsSync(join(DIST, localeDir(l), 'index.html')));
const externalLinks = new Set();
for (const file of htmlFiles) {
  const $ = cheerio.load(readFileSync(file, 'utf-8'));
  const base = dirname(file);
  $('[src], [href]').each((_, el) => {
    const url = $(el).attr('src') || $(el).attr('href');
    if (!url || url.startsWith('#') || url.startsWith('data:')) return;
    if (/^https?:/.test(url)) {
      externalLinks.add(url);
      return;
    }
    // Une ancre ne fait pas partie du chemin, une query string non plus : les
    // cartes de build lient le créateur avec le build en paramètre.
    const target = join(base, url.split('#')[0].split('?')[0]);
    if (!existsSync(target)) errors.push(`${file.replace(DIST, 'dist')} -> ressource locale manquante : ${url}`);
  });
  // ancres internes
  const ids = new Set();
  $('[id]').each((_, el) => ids.add($(el).attr('id')));
  $('a[href^="#"]').each((_, el) => {
    const anchor = $(el).attr('href').slice(1);
    if (anchor && !ids.has(anchor)) errors.push(`${file.replace(DIST, 'dist')} -> ancre morte : #${anchor}`);
  });
}

// --- 2. Anti-invention ---
const BANNER = 'Section non documentée';
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);
for (const locale of builtLocales) for (const c of [...CHARACTERS, ...SPECIAL]) {
  if (c.slug === 'chaos') continue;
  const ed = readJson(join(ROOT, 'data', 'editorial', locale, `${c.slug}.json`));
  const htmlPath = join(DIST, guidePathFor(c.slug, locale));
  // Un guide sans prose dans cette langue n'est pas généré : c'est la règle de
  // repli du build, pas un manque. Son absence n'est une erreur que si la prose
  // existe.
  if (!existsSync(htmlPath)) {
    if (ed) errors.push(`guide manquant : ${c.slug} (${locale})`);
    continue;
  }
  const html = readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const data = readJson(join(ROOT, 'data', 'characters', `${c.slug}.json`));
  const s = data.sections;
  const who = `${c.slug} (${locale})`;

  // La section « Mécanique unique » n'existe que si le perso a une mécanique
  // (documentée par le wiki ou rédigée dans l'éditorial) : absente sinon, par design.
  const hasUnique = !!(s.uniqueMechanics?.documented || ed?.uniqueMechanics?.intro?.length);
  if (!hasUnique && $('#unique').length) errors.push(`${who} : section #unique présente alors que le personnage n'a pas de mécanique unique`);

  const checks = [
    // passe d'enrichissement : l'overview/les builds peuvent être remplis depuis des
    // sources externes (sourcesBySection) même si le wiki ne documente pas la section.
    ['overview', !!ed?.overview?.length],
    ...(hasUnique ? [['unique', !!(ed?.uniqueMechanics?.intro?.length)]] : []),
    ['gameplan', !!ed?.gameplan?.length],
    ...(c.slug === 'aerith' ? [] : [['matchups', !!(ed?.matchups?.summary?.length)]]),
    ['builds', !!ed?.builds?.philosophy?.length],
    ['community', !!ed?.communityTech?.length],
  ];
  for (const [id, hasContent] of checks) {
    const section = $(`#${id}`);
    if (!section.length) { errors.push(`${who} : section #${id} absente du HTML`); continue; }
    const hasBanner = section.find('.banner').length > 0;
    if (!hasContent && !hasBanner) {
      errors.push(`${who} : section #${id} sans données documentées ET sans bandeau`);
    }
  }
  // les notes de coups FR doivent correspondre à des coups existants
  if (ed?.moveNotes) {
    const moveNames = new Set();
    for (const key of ['bravery', 'hp']) {
      for (const g of Object.values(s[key]?.groups || {})) g.moves.forEach((m) => m.name && moveNames.add(m.name));
    }
    for (const name of Object.keys(ed.moveNotes)) {
      if (!moveNames.has(name)) warns.push(`${who} : moveNote « ${name} » ne correspond à aucun coup extrait (note non affichée)`);
    }
  }
}

// --- 2b. Cohérence terminologique (docs/style-pass.md) ---
// La liste est PAR LANGUE et ne peut pas être partagée : « ender » et « meter »
// sont bannis du français précisément parce que ce sont des anglicismes — en
// anglais, ce sont les termes communautaires normaux. La liste anglaise reste
// vide tant qu'aucune règle de style anglaise n'a été arrêtée.
const BANNED_TERMS = {
  fr: [
    [/HP de branche|branche HP|HP dérivé/i, '« HP de branche » -> HP link'],
    [/ender(s)?/i, '« ender » -> attaque HP de conclusion / reformuler'],
    [/meter/i, '« meter » -> jauges / ressources'],
  ],
  en: [],
};
for (const locale of builtLocales) {
  const dir = join(ROOT, 'data', 'editorial', locale);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const raw = readFileSync(join(dir, f), 'utf-8');
    for (const [re, hint] of BANNED_TERMS[locale] || []) {
      if (re.test(raw)) {
        // « finisher » est toléré dans le contexte Skillchain (fiche Prishe).
        if (f === 'prishe.json' && /finisher/i.test(raw) && !re.test(raw.replace(/finisher/gi, ''))) continue;
        warns.push(`terme banni dans ${locale}/${f} : ${hint}`);
      }
    }
  }
}

// --- 2c. Créateur de builds : intégrité du payload servi au navigateur ---
// Le fichier est du JS (window.BUILD_DATA = …) : on isole le JSON pour l'analyser
// sans l'exécuter.
{
  const bundlePath = join(DIST, 'scripts', 'build-data.js');
  if (!existsSync(bundlePath)) {
    errors.push('créateur de builds : dist/scripts/build-data.js absent');
  } else {
    const src = readFileSync(bundlePath, 'utf-8');
    const json = src.replace(/^window\.BUILD_DATA=/, '').replace(/;\s*$/, '');
    let D = null;
    try { D = JSON.parse(json); } catch (e) { errors.push(`créateur de builds : payload illisible (${e.message})`); }

    if (D) {
      const rows = (t) => (t && t.c ? t.r.map((r) => Object.fromEntries(t.c.map((k, i) => [k, r[i]]))) : []);
      const equipment = rows(D.equipment);
      const accessories = rows(D.accessories);

      if (D.characters.length !== CHARACTERS.length) errors.push(`créateur de builds : ${D.characters.length} personnages dans le payload, ${CHARACTERS.length} attendus`);

      // Identifiants uniques : le client indexe équipements et accessoires par uid.
      for (const [label, list] of [['équipement', equipment], ['accessoire', accessories]]) {
        const seen = new Set();
        for (const it of list) {
          if (!it.uid) errors.push(`créateur de builds : ${label} « ${it.name} » sans uid`);
          else if (seen.has(it.uid)) errors.push(`créateur de builds : uid ${label} en double — ${it.uid}`);
          seen.add(it.uid);
        }
      }

      // Un équipement sans emplacement ne doit jamais être proposé comme équipable :
      // il doit porter documented:false pour que l'interface l'étiquette.
      for (const it of equipment) {
        if (!it.slot && it.documented !== false) errors.push(`créateur de builds : « ${it.name} » sans emplacement mais marqué documenté`);
      }

      // Les motifs d'illégalité passent par une légende partagée.
      for (const it of accessories) {
        if (it.ill && !D.illegalReasons[it.ill]) errors.push(`créateur de builds : code d'illégalité inconnu « ${it.ill} » (${it.name})`);
        if (it.legal === false && !it.ill) errors.push(`créateur de builds : accessoire illégal sans motif — ${it.name}`);
      }
      for (const s of D.summons) {
        if (s.legal === false && !s.ill) errors.push(`créateur de builds : invocation illégale sans motif — ${s.name}`);
        if (s.documented === false && s.text) errors.push(`créateur de builds : invocation « ${s.name} » marquée non documentée mais porteuse d'un texte`);
      }

      // Le plafond de CP doit rester la somme de ce que les sources documentent.
      const computed = D.capacity.base + (D.capacity.extenders || []).reduce((s, e) => s + e.cp * e.maxEquipped, 0);
      if (computed !== D.capacity.max) errors.push(`créateur de builds : plafond CP incohérent (${computed} calculé, ${D.capacity.max} annoncé)`);

      // Statistiques de base : sans elles, les totaux affichés seraient faux.
      for (const c of CHARACTERS) {
        if (!D.baseStats.byCharacter[c.slug]) errors.push(`créateur de builds : statistiques ATK/DEF de base manquantes pour ${c.slug}`);
      }
      for (const k of ['hp', 'cp', 'brv', 'luk']) {
        if (typeof D.baseStats.shared[k] !== 'number') errors.push(`créateur de builds : statistique de base « ${k} » absente`);
      }

      // Un set sans nombre de pièces requis ne peut pas être évalué : il ne doit
      // pas être publié plutôt que d'être approximé.
      for (const c of D.combinations) {
        if (!c.required) errors.push(`créateur de builds : set « ${c.name} » sans nombre de pièces requis`);
        if (c.required && Object.keys(c.pieces || {}).length < c.required) {
          errors.push(`créateur de builds : set « ${c.name} » exige ${c.required} pièces mais n'en liste que ${Object.keys(c.pieces || {}).length}`);
        }
      }

      // Coûts CP : une attaque ou une ability sans coût connu doit être signalée.
      // Les identifiants doivent rester uniques, sinon deux paliers d'une même
      // ability (Speed Boost / Speed Boost+) se confondraient dans les builds.
      const abilityIds = new Set();
      for (const g of D.abilities) {
        for (const a of g.abilities) {
          if (a.cp == null && a.documented !== false) errors.push(`créateur de builds : ability « ${a.name} » sans coût CP mais marquée documentée`);
          if (abilityIds.has(a.id)) errors.push(`créateur de builds : identifiant d'ability en double — ${a.id} (${a.name})`);
          abilityIds.add(a.id);
        }
      }

      // Exclusions d'abilities : chaque groupe doit compter au moins deux
      // membres existants, et une même ability ne peut appartenir qu'à un seul
      // groupe (sinon cocher l'une en déséquiperait deux familles).
      const dansGroupe = new Map();
      for (const g of D.abilityExclusions || []) {
        if (!Array.isArray(g.abilities) || g.abilities.length < 2) {
          errors.push(`créateur de builds : groupe d'exclusion « ${g.id} » à moins de deux abilities`);
        }
        if (!g.reason || !g.source) errors.push(`créateur de builds : groupe d'exclusion « ${g.id} » sans motif ou sans source`);
        for (const id of g.abilities || []) {
          if (!abilityIds.has(id)) errors.push(`créateur de builds : exclusion « ${g.id} » — ability inconnue ${id}`);
          if (dansGroupe.has(id)) errors.push(`créateur de builds : ${id} apparaît dans deux groupes d'exclusion (${dansGroupe.get(id)} et ${g.id})`);
          dansGroupe.set(id, g.id);
        }
      }

      // Idem pour les coups : le client les référence par identifiant.
      for (const c of D.characters) {
        const moveIds = new Set();
        for (const kind of ['bravery', 'hp']) {
          for (const g of c.attacks[kind] || []) {
            for (const row of g.moves.r) {
              const id = row[g.moves.c.indexOf('id')];
              if (moveIds.has(id)) errors.push(`créateur de builds : identifiant de coup en double chez ${c.slug} — ${id}`);
              moveIds.add(id);
            }
          }
        }
      }

      // Le ruleset doit citer sa source pour chaque règle appliquée aux items.
      for (const r of D.ruleset.itemRules) {
        if (!r.quote) errors.push(`créateur de builds : règle « ${r.rule} » sans citation source`);
      }

      // HP links : chaque paire doit pointer sur des coups réellement présents,
      // une bravery vers une attaque HP, et aucune paire ne doit rester en
      // souffrance (sinon l'attaque HP disparaîtrait de l'interface).
      for (const c of D.characters) {
        const ids = new Set();
        for (const kind of ['bravery', 'hp']) {
          for (const g of c.attacks[kind] || []) for (const row of g.moves.r) ids.add(row[g.moves.c.indexOf('id')]);
        }
        for (const l of c.links || []) {
          if (!ids.has(l.from)) errors.push(`créateur de builds : HP link de ${c.slug} — bravery introuvable (${l.from})`);
          if (!ids.has(l.to)) errors.push(`créateur de builds : HP link de ${c.slug} — attaque HP introuvable (${l.to})`);
          if (l.from.indexOf('bravery:') !== 0 || l.to.indexOf('hp:') !== 0) {
            errors.push(`créateur de builds : HP link de ${c.slug} mal orienté (${l.from} -> ${l.to})`);
          }
          if (!l.source) errors.push(`créateur de builds : HP link de ${c.slug} sans source`);
        }
      }
      for (const u of D.unresolvedHpLinks || []) {
        errors.push(`créateur de builds : HP link non résolu chez ${u.slug} — ${u.to} <- ${u.from} (${u.manquant} introuvable)`);
      }
    }
  }
}

// --- 2d. Référencement : métadonnées, sitemap, images de partage ---
// Ce qui est vérifié ici est ce qui casse silencieusement : un canonical qui ne
// correspond pas à l'URL de la page, une image de partage en 404 (aperçu vide
// sur Discord), un title dupliqué (les moteurs n'en gardent qu'un), une page
// absente du sitemap (jamais découverte).
{
  const allHtml = [
    join(DIST, '404.html'),
    ...htmlFiles,
  ].filter(existsSync);

  const seenTitles = new Map();
  const seenDescs = new Map();
  const indexable = new Set();

  for (const file of allHtml) {
    const rel = file.replace(DIST, 'dist').replace(/\\/g, '/');
    const raw = readFileSync(file, 'utf-8');
    const $ = cheerio.load(raw);
    const path = rel.replace('dist/', '');
    const robots = ($('meta[name="robots"]').attr('content') || '').toLowerCase();
    const noindex = robots.includes('noindex');

    const title = ($('head > title').text() || '').trim();
    const desc = ($('meta[name="description"]').attr('content') || '').trim();
    const canonical = $('link[rel="canonical"]').attr('href') || '';

    // Une page en noindex (404, redirection) n'a pas à porter de description ni
    // de canonical vers elle-même : on ne contrôle que ce qui a du sens pour elle.
    if (!title) errors.push(`${rel} : <title> absent`);
    if (!noindex) {
      if (!desc) errors.push(`${rel} : meta description absente`);
      if (!canonical) errors.push(`${rel} : link rel="canonical" absent`);
    }
    if (canonical && !/^https:\/\//.test(canonical)) errors.push(`${rel} : canonical non absolu (${canonical})`);

    // Le canonical doit désigner la page elle-même — sauf sur une page de
    // redirection, dont le rôle est justement de pointer sa destination.
    if (canonical && !noindex) {
      const expected = path === 'index.html' ? '/' : `/${path}`;
      if (!canonical.endsWith(expected)) {
        errors.push(`${rel} : canonical ne correspond pas à la page (${canonical})`);
      }
    }

    if (title.length > 68) warns.push(`${rel} : title de ${title.length} caractères (tronqué au-delà de ~65)`);
    if (desc && (desc.length < 70 || desc.length > 170)) {
      warns.push(`${rel} : description de ${desc.length} caractères (viser 120-165)`);
    }

    if (!noindex) {
      indexable.add(path);
      if (seenTitles.has(title)) errors.push(`title dupliqué : ${rel} et ${seenTitles.get(title)}`);
      else seenTitles.set(title, rel);
      if (seenDescs.has(desc)) errors.push(`description dupliquée : ${rel} et ${seenDescs.get(desc)}`);
      else seenDescs.set(desc, rel);

      // Un seul h1 par page
      const h1 = $('h1').length;
      if (h1 !== 1) errors.push(`${rel} : ${h1} balise(s) h1 (une seule attendue)`);

      // Open Graph : les balises minimales pour un aperçu correct
      for (const prop of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name']) {
        if (!$(`meta[property="${prop}"]`).attr('content')) errors.push(`${rel} : ${prop} absent`);
      }
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (!ogImg) warns.push(`${rel} : og:image absent (aperçu sans visuel au partage)`);
      else {
        const local = join(DIST, ogImg.replace(/^https:\/\/[^/]+\/duodecim-guides\//, ''));
        if (!existsSync(local)) errors.push(`${rel} : og:image en 404 (${ogImg})`);
        if (!$('meta[property="og:image:alt"]').attr('content')) warns.push(`${rel} : og:image:alt absent`);
      }

      // JSON-LD : présent et syntaxiquement valide
      const ld = $('script[type="application/ld+json"]').first().html();
      if (!ld) errors.push(`${rel} : données structurées JSON-LD absentes`);
      else {
        try {
          const data = JSON.parse(ld);
          if (!data['@context'] || !data['@type']) errors.push(`${rel} : JSON-LD sans @context ou @type`);
        } catch (e) {
          errors.push(`${rel} : JSON-LD invalide (${e.message})`);
        }
      }
    }

    // Images : width/height obligatoires (sinon la page se décale au chargement)
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '(sans src)';
      if ($(el).attr('alt') === undefined) errors.push(`${rel} : <img> sans attribut alt (${src})`);
      if (!$(el).attr('width') || !$(el).attr('height')) {
        warns.push(`${rel} : <img> sans width/height (${src})`);
      }
    });
  }

  // Annotations d'alternance linguistique : la réciprocité est la condition de
  // leur prise en compte — si A déclare B, B doit déclarer A, sinon Google
  // ignore l'ensemble. On vérifie aussi que chaque cible existe réellement et
  // que x-default désigne bien la langue par défaut du site.
  {
    const declared = new Map();  // page -> { hreflang -> chemin }
    for (const file of allHtml) {
      const rel = file.replace(DIST, 'dist').replace(/\\/g, '/');
      const path = rel.replace('dist/', '');
      const $ = cheerio.load(readFileSync(file, 'utf-8'));
      if (($('meta[name="robots"]').attr('content') || '').includes('noindex')) continue;
      const map = {};
      $('link[rel="alternate"][hreflang]').each((_, el) => {
        const lang = $(el).attr('hreflang');
        const href = $(el).attr('href') || '';
        map[lang] = href.replace(/^https:\/\/[^/]+\/duodecim-guides\//, '') || 'index.html';
      });
      if (Object.keys(map).length) declared.set(path, map);
    }
    const defaultLang = LOCALE_META[DEFAULT_LOCALE].lang;
    for (const [path, map] of declared) {
      // Cibles existantes
      for (const [lang, target] of Object.entries(map)) {
        if (!existsSync(join(DIST, target))) {
          errors.push(`hreflang : ${path} déclare « ${lang} » vers une page absente (${target})`);
        }
      }
      // x-default sur la langue par défaut
      if (!map['x-default']) errors.push(`hreflang : ${path} sans x-default`);
      else if (map['x-default'] !== map[defaultLang]) {
        errors.push(`hreflang : ${path} — x-default (${map['x-default']}) ne pointe pas la langue par défaut « ${defaultLang} » (${map[defaultLang]})`);
      }
      // Auto-référence : une page doit se déclarer elle-même
      if (!Object.values(map).includes(path)) {
        errors.push(`hreflang : ${path} ne se déclare pas elle-même`);
      }
      // Réciprocité
      for (const [lang, target] of Object.entries(map)) {
        if (lang === 'x-default' || target === path) continue;
        const back = declared.get(target);
        if (!back) { errors.push(`hreflang : ${path} pointe ${target}, qui ne déclare aucune alternance`); continue; }
        if (!Object.values(back).includes(path)) {
          errors.push(`hreflang non réciproque : ${path} -> ${target}, mais pas l'inverse`);
        }
      }
    }
  }

  // Sitemap : couverture exacte des pages indexables
  const smFile = join(DIST, 'sitemap.xml');
  if (!existsSync(smFile)) errors.push('dist/sitemap.xml absent');
  else {
    const sm = readFileSync(smFile, 'utf-8');
    const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const paths = new Set(locs.map((l) => l.replace(/^https:\/\/[^/]+\/duodecim-guides\//, '')).map((p) => (p === '' ? 'index.html' : p)));
    for (const p of indexable) {
      if (!paths.has(p)) errors.push(`sitemap : page indexable absente (${p})`);
    }
    for (const p of paths) {
      if (!existsSync(join(DIST, p))) errors.push(`sitemap : URL sans fichier (${p})`);
      else if (!indexable.has(p)) errors.push(`sitemap : URL en noindex ou hors périmètre (${p})`);
    }
    if (locs.some((l) => !/^https:\/\//.test(l))) errors.push('sitemap : URL non absolue');
  }

  if (!existsSync(join(DIST, '404.html'))) errors.push('dist/404.html absent');
}

// --- 3. Liens externes (optionnel) ---
if (process.argv.includes('--links')) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // gamefaqs et challonge : 403 systématique pour les clients non-navigateur
  // (liens vérifiés à la main au moment de leur ajout ; Challonge refuse aussi
  // bien un fetch qu'un navigateur piloté) ; youtube : via oEmbed ci-dessous.
  const skip = /fonts\.(googleapis|gstatic)\.com|creativecommons\.org|web\.archive\.org|gamefaqs\.gamespot\.com|challonge\.com/;
  const toCheck = [...externalLinks].filter((u) => !skip.test(u));
  console.log(`Vérification de ${toCheck.length} liens externes uniques…`);
  let done = 0;
  for (const url of toCheck) {
    try {
      // YouTube : l'API oEmbed publique dit si la vidéo est disponible (une page
      // watch répond 200 même pour une vidéo supprimée)
      const yt = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
      const target = yt ? `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${yt[1]}&format=json` : url;
      const res = await fetch(target, {
        method: 'GET',
        headers: { 'User-Agent': 'dissidia012-guides-qa/0.1' },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      if (res.status >= 400) errors.push(`lien externe ${res.status} : ${url}`);
    } catch (e) {
      errors.push(`lien externe injoignable : ${url} (${e.message})`);
    }
    done++;
    if (done % 10 === 0) console.log(`  … ${done}/${toCheck.length}`);
    await sleep(800);
  }
}

console.log(`\nQA : ${errors.length} erreur(s), ${warns.length} avertissement(s)`);
if (warns.length) console.log('\nAvertissements :\n' + warns.map((w) => '  ~ ' + w).join('\n'));
if (errors.length) {
  console.log('\nErreurs :\n' + errors.map((e) => '  ! ' + e).join('\n'));
  process.exit(1);
}
