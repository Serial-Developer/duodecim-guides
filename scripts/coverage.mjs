// Génère reports/coverage.md : couverture par perso, manques, choix, questions.
// Usage : node scripts/coverage.mjs
import { CHARACTERS, SPECIAL } from './characters.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : null);

const rows = [];
const allLimits = [];
for (const c of [...CHARACTERS, ...SPECIAL]) {
  if (c.slug === 'chaos') continue;
  const d = readJson(join(ROOT, 'data', 'characters', `${c.slug}.json`));
  const ed = readJson(join(ROOT, 'data', 'editorial', `${c.slug}.json`));
  if (!d) continue;
  const s = d.sections;
  const y = (b) => (b ? '✅' : '❌');
  rows.push(`| ${c.name} | ${s.bravery?.moveCount ?? 0}+${s.hp?.moveCount ?? 0} | ${y(s.overview?.documented && ed?.overview?.length)} | ${y(s.uniqueMechanics?.documented)} | ${y(ed?.matchups?.summary?.length)} | ${y(s.builds?.documented)} | ${y(ed?.assist)} | ${ed?.communityTech?.length || 0} | ${y(!!ed)} |`);
  if (ed?.limits?.length) allLimits.push(`### ${c.name}\n${ed.limits.map((l) => `- ${l}`).join('\n')}`);
}

const md = `# Rapport de couverture — guides Dissidia 012 [duodecim]

Généré par \`npm run coverage\`. Source principale : dissidia.wiki (CC BY 4.0), pages récupérées en juillet 2026 (cache local \`cache/\`).

## Couverture par personnage

Colonnes : coups extraits (BRV+HP) · vue d'ensemble rédigée · mécanique unique documentée sur le wiki · matchups exploitables · builds documentés · section assist · nb de tech communautaires sourcées · éditorial FR présent.

| Personnage | Coups | Vue d'ens. | Méca unique | Matchups | Builds | Assist | Tech comm. | Éditorial |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Choix arbitraires faits (à valider)

1. **Images via Wayback Machine.** Le CDN d'images du wiki (\`resources.dissidia.wiki\` ET \`dissidia.wiki/images/\`) est en panne totale (301 → 404, vérifié aussi dans un navigateur réel). Les portraits et icônes sont les fichiers officiels du wiki récupérés depuis web.archive.org (snapshots ~janvier 2026, signature PNG vérifiée) et copiés en local. Le pattern d'URL du cahier des charges était le bon — c'est le serveur qui est HS. Mention ajoutée au footer.
2. **Guide Prishe de référence absent.** Le fichier \`guide-prishe-dissidia012.html\` n'était pas dans le repo ; la structure §7 et le design system §8 du cahier des charges ont servi d'étalon à la place.
3. **Screenshots de coups non intégrés** (hébergés sur le CDN cassé ; récupérables un à un via Wayback si souhaité — ~250 fichiers).
4. **Chaos : aucune page générée** (boss hors sélection versus ; la fiche courte optionnelle reste possible, données parsées disponibles).
5. **Aerith sans portrait** : aucun \`ddff-port-aerith.png\` n'a jamais existé sur le CDN (vérifié via l'index CDX de la Wayback) ; sa page wiki ne contient aucune image.
6. **Descriptions anglaises des coups non affichées** (règle « jamais de copie verbatim ») : remplacées par les notes d'usage françaises ; les combos documentés sont rendus en notation d'origine (traités comme données).
7. **Emplacement du projet** : \`Projets/dissidia012-guides\` (la session Claude Code était ouverte sur un autre projet).
8. **Tier list** : la seule tier list chiffrée du wiki est celle de 2017 (tournoi + communautaire) ; les graphiques communautaires (weighted, blind pick…) sont des images cassées sur le wiki — seule la liste tournoi (texte) est exploitée.

## Manques transverses connus

- Sous-pages \`/Matchups\` : squelettes vides pour 27 persos sur 31 (remplies : Firion, Sephiroth, Tifa, Jecht) → bandeaux + synthèse depuis l'overview quand elle existe.
- Sous-pages \`/Starter_Guide\`, \`/Strategy\`, \`/Frame_Data\` : stubs généralisés sur le wiki.
- Tech communautaire : seules les références présentes sur le wiki ont été exploitées. Le minage GameFAQs (board 605802) et guides Steam (ex. Exdeath \`2333236279\`) reste à faire — voir Questions.
- Vérification responsive réelle (3 breakpoints) : la preview navigateur de la session a été bloquée par la politique locale ; CSS écrit pour 4/6/11 colonnes et testable via \`npx serve dist\`.

## Limites par personnage (déclarées par l'éditorial)

${allLimits.join('\n\n')}

## Questions ouvertes

1. Faut-il récupérer les ~250 screenshots de coups via la Wayback (alourdit le repo, complète les accordéons) ?
2. Lancer une passe « tech communautaire » sur GameFAQs/Steam/YouTube pour étoffer la section 9 des guides les plus joués ?
3. Fiche courte Chaos : oui ou non ?
4. Hébergement final (GitHub Pages / Netlify) et nom du projet ?
`;

writeFileSync(join(ROOT, 'reports', 'coverage.md'), md);
console.log(`coverage.md écrit (${rows.length} personnages)`);
