// Veille tournois : sonde les sources publiques et met à jour data/calendar/.
//
// Sources :
//  - start.gg (API GraphQL officielle) -> data/calendar/auto.json
//    Tournois Duodecim à venir et passés, avec dates fiables : placés
//    directement sur le calendrier.
//  - Discord (dormant) -> data/calendar/inbox.json
//    Messages contenant un lien Challonge/start.gg ou un mot-clé tournoi :
//    enregistrés comme candidats à confirmer à la main (pas de date fiable).
//    Nécessite un bot avec accès en lecture au canal : #announcements de
//    DISSIDIA est un canal texte classique (non suivable en miroir), il faut
//    donc que le staff du serveur invite le bot (canal : 192750086273499136)
//    ou convertisse le canal en canal d'annonces. En attendant : relais
//    manuel via npm run add-tournoi.
//
// Variables d'environnement (chaque source est sautée si la sienne manque) :
//  STARTGG_TOKEN      token API start.gg (https://start.gg/admin/profile/developer)
//  DISCORD_BOT_TOKEN  token du bot présent dans le serveur miroir personnel
//  DISCORD_CHANNEL_ID id du canal miroir qui suit #announcements
//
// En cas d'erreur d'une source, les données précédentes sont conservées.
// Usage : node scripts/watch-tournaments.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAL = join(ROOT, 'data', 'calendar');
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : fallback);
const writeJson = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

let changed = false;

// URLs de tournois déjà connues (documentés, confirmés ou auto-détectés) :
// sert à ne pas re-proposer un candidat déjà traité.
function knownUrls() {
  const urls = new Set();
  const norm = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '').toLowerCase();
  const tournois = readJson(join(ROOT, 'data', 'editorial', '_tournois.json'), { tournois: [] });
  for (const t of tournois.tournois) for (const l of t.liens || []) urls.add(norm(l.url));
  for (const f of ['upcoming.json', 'auto.json']) {
    for (const e of readJson(join(CAL, f), { events: [] }).events) if (e.url) urls.add(norm(e.url));
  }
  return { urls, norm };
}

// --- 1. start.gg ---
async function pollStartgg() {
  const token = process.env.STARTGG_TOKEN;
  if (!token) { console.log('start.gg : STARTGG_TOKEN absent, source sautée'); return; }

  const gql = async (query, variables) => {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join(' | '));
    return j.data;
  };

  // Id du jeu (résolu à chaque run : deux appels par jour, autant rester simple)
  const vg = await gql(
    `query ($name: String) { videogames(query: {filter: {name: $name}, perPage: 30}) { nodes { id name displayName } } }`,
    { name: 'dissidia' },
  );
  const game = (vg.videogames?.nodes || []).find((n) => /012|duodecim/i.test(`${n.name} ${n.displayName || ''}`));
  if (!game) throw new Error('jeu Duodecim introuvable dans videogames : ' + JSON.stringify(vg.videogames?.nodes?.map((n) => n.name)));

  const tQuery = `query ($vid: ID!, $upcoming: Boolean, $past: Boolean) {
    tournaments(query: {perPage: 50, sortBy: "startAt asc", filter: {videogameIds: [$vid], upcoming: $upcoming, past: $past}}) {
      nodes { name slug startAt numAttendees }
    }
  }`;
  const [up, past] = await Promise.all([
    gql(tQuery, { vid: game.id, upcoming: true, past: false }),
    gql(tQuery, { vid: game.id, upcoming: false, past: true }),
  ]);
  const toEvent = (n) => ({
    iso: new Date(n.startAt * 1000).toISOString().slice(0, 10),
    name: n.name,
    url: `https://www.start.gg/${n.slug}`,
    joueurs: n.numAttendees || null,
    source: 'start.gg',
  });
  const events = [...(up.tournaments?.nodes || []), ...(past.tournaments?.nodes || [])]
    .filter((n) => n.startAt)
    .map(toEvent)
    .sort((a, b) => a.iso.localeCompare(b.iso));

  const autoPath = join(CAL, 'auto.json');
  const prev = readJson(autoPath, { events: [] });
  if (JSON.stringify(prev.events) !== JSON.stringify(events)) {
    writeJson(autoPath, { ...prev, fetchedAt: new Date().toISOString(), events });
    changed = true;
    console.log(`start.gg : ${events.length} tournois (mise à jour)`);
  } else {
    console.log(`start.gg : ${events.length} tournois (inchangé)`);
  }
}

// --- 2. Miroir Discord ---
async function pollDiscord() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channel) { console.log('Discord : DISCORD_BOT_TOKEN/DISCORD_CHANNEL_ID absents, source sautée'); return; }

  const res = await fetch(`https://discord.com/api/v10/channels/${channel}/messages?limit=100`, {
    headers: { Authorization: `Bot ${token}`, 'User-Agent': 'duodecim-guides-watch/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — le bot a-t-il accès au canal ?`);
  const messages = await res.json();

  const inboxPath = join(CAL, 'inbox.json');
  const inbox = readJson(inboxPath, { candidates: [], handled: [] });
  const seen = new Set([...inbox.candidates.map((c) => c.messageId), ...(inbox.handled || [])]);
  const { urls, norm } = knownUrls();
  const LINK_RE = /https?:\/\/(?:www\.)?(?:challonge\.com\/[\w-]+|start\.gg\/tournament\/[\w-]+)/gi;
  const KEYWORD_RE = /tourn(?:ament|ey|oi)|bracket|sign\s?-?ups?/i;

  let added = 0;
  for (const m of messages) {
    if (seen.has(m.id)) continue;
    const content = m.content || '';
    const links = [...content.matchAll(LINK_RE)].map((x) => x[0]);
    if (!links.length && !KEYWORD_RE.test(content)) continue;
    // tous les liens déjà connus -> rien de neuf
    if (links.length && links.every((l) => urls.has(norm(l)))) continue;
    inbox.candidates.push({
      messageId: m.id,
      at: (m.timestamp || '').slice(0, 10),
      author: m.author?.username || null,
      excerpt: content.slice(0, 300),
      links,
    });
    added++;
  }
  if (added) {
    inbox.candidates.sort((a, b) => a.at.localeCompare(b.at));
    writeJson(inboxPath, inbox);
    changed = true;
    console.log(`Discord : ${added} candidat(s) ajouté(s) dans inbox.json`);
  } else {
    console.log('Discord : aucun nouveau candidat');
  }
}

// Chaque source est indépendante : l'échec de l'une ne bloque pas l'autre,
// et ne détruit jamais les données précédentes.
for (const [name, fn] of [['start.gg', pollStartgg], ['Discord', pollDiscord]]) {
  try { await fn(); } catch (e) { console.error(`${name} : ERREUR — ${e.message}`); process.exitCode = 0; }
}

// Tampon de dernière vérification : mis à jour si quelque chose a changé, ou
// une fois par semaine (garde le dépôt actif pour que GitHub ne désactive pas
// le cron, et date l'info « dernière vérification » affichée sur le site).
const lcPath = join(CAL, 'last-check.json');
const lc = readJson(lcPath, { lastCheck: null });
const staleWeek = !lc.lastCheck || Date.now() - Date.parse(lc.lastCheck) > 6 * 24 * 3600e3;
if (changed || staleWeek) {
  writeJson(lcPath, { lastCheck: new Date().toISOString() });
  changed = true;
}

console.log(changed ? 'Des fichiers ont changé.' : 'Rien de neuf.');
