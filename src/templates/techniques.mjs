// Page transverse : techniques universelles, glitches, jeu en ligne
import { esc, paras, banner, pageShell, siteHeader, siteFooter } from './helpers.mjs';

function block(item) {
  if (!item) return '';
  return `<article class="card" id="${esc(item.id || '')}">
<h3 style="margin-top:0">${esc(item.name)}</h3>
${paras(item.summary)}
${item.howTo?.length ? `<h3>En pratique</h3><ul>${item.howTo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
${item.competitiveUse ? `<p><strong>Usage compétitif :</strong> ${esc(item.competitiveUse)}</p>` : ''}
${item.video?.url ? `<p class="video-link"><a href="${esc(item.video.url)}" target="_blank" rel="external noopener">▶ ${esc(item.video.title || 'Vidéo de démonstration')}</a>${item.video.author ? ` — ${esc(item.video.author)}` : ''}${item.video.date ? ` (${esc(String(item.video.date))})` : ''}</p>` : ''}
${item.source ? `<p class="sources-list"><a href="${esc(item.source)}" target="_blank" rel="external noopener">${esc(item.source)}</a></p>` : ''}
</article>`;
}

export function renderTechniques(shared) {
  if (!shared) {
    return pageShell({
      title: 'Techniques — Dissidia 012 [duodecim]',
      description: 'Techniques universelles de Dissidia 012 [duodecim].',
      cssPath: 'styles/main.css', jsPath: null,
      body: `<main class="wrap">${banner()}</main>${siteFooter()}`,
    });
  }
  const body = `${siteHeader({ active: 'techniques' })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">Techniques universelles &amp; glitches</h1>
<p class="mv-desc">Synthèse française des pages techniques de dissidia.wiki (CC BY 4.0). Ces techniques s'appliquent à tout le cast ; chaque guide y renvoie.</p>

<h2>Système de priorités</h2>
${shared.attackPriority ? paras(shared.attackPriority.summary) + `<p class="sources-list"><a href="${esc(shared.attackPriority.source)}" target="_blank" rel="external noopener">${esc(shared.attackPriority.source)}</a></p>` : banner()}

<h2>Techniques universelles</h2>
${(shared.techniques || []).map(block).join('\n')}

<h2>Glitches documentés</h2>
${(shared.glitches || []).map(block).join('\n')}

<h2>Jouer en ligne (PPSSPP)</h2>
<p class="mv-desc">Installation pas à pas de l'émulateur, mise en place du jeu et premier match : voir la page <a href="install.html">Installer Dissidia 012 sur PPSSPP</a>. La synthèse ci-dessous reprend le guide de dissidia.wiki.</p>
${shared.onlineSetup ? paras(shared.onlineSetup.summary) + `<p class="sources-list"><a href="${esc(shared.onlineSetup.source)}" target="_blank" rel="external noopener">${esc(shared.onlineSetup.source)}</a></p>` : banner()}

<h2>Glossaire</h2>
${shared.glossaryNote ? paras(shared.glossaryNote.summary) + `<p class="sources-list"><a href="${esc(shared.glossaryNote.source)}" target="_blank" rel="external noopener">${esc(shared.glossaryNote.source)}</a></p>` : banner()}
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Techniques universelles & glitches — Dissidia 012 [duodecim]',
    description: 'Blodge, dash feint, lock off, dodge punishment, Equip Glitch, Assist Storage Glitch et jeu en ligne PPSSPP — synthèse française de dissidia.wiki.',
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
