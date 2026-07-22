// Ajout rapide d'un tournoi à venir au calendrier (relais manuel des annonces
// Discord). Pose les questions, écrit data/calendar/upcoming.json, rebuild.
// Usage : npm run add-tournoi
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = join(ROOT, 'data', 'calendar', 'upcoming.json');

// Itérateur plutôt que rl.question : les lignes reçues entre deux questions
// (entrée pipée) sont bufferisées au lieu d'être perdues.
const rl = createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();
const ask = async (q, { required = false, check = null } = {}) => {
  for (;;) {
    process.stdout.write(q);
    const { value, done } = await lines.next();
    if (done) { console.error('\nEntrée interrompue.'); process.exit(1); }
    const v = value.trim();
    if (!v && required) { console.log('  (champ obligatoire)'); continue; }
    if (v && check && !check(v)) { console.log('  (format invalide)'); continue; }
    return v || null;
  }
};

console.log('Nouveau tournoi à venir — champs facultatifs : entrée pour passer.\n');
const name = await ask('Nom du tournoi : ', { required: true });
const iso = await ask('Date (AAAA-MM-JJ) : ', { required: true, check: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) });
const url = await ask('Lien inscription/bracket (start.gg ou Challonge) : ', { required: true, check: (v) => /^https?:\/\//.test(v) });
const format = await ask('Format (ex. « Double élimination — FT2 ») : ');
const organisation = await ask('Organisation (ex. « Mericus, sur le Discord DISSIDIA ») : ');
const notes = await ask('Notes (règlement, conditions…) : ');
rl.close();

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
data.events.push(Object.fromEntries(Object.entries({ iso, name, url, format, organisation, notes }).filter(([, v]) => v)));
data.events.sort((a, b) => a.iso.localeCompare(b.iso));
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`\nAjouté à ${PATH}`);

execSync('npm run build && npm run qa', { cwd: ROOT, stdio: 'inherit' });
console.log('\nSite régénéré. Reste à commit/push pour publier.');
