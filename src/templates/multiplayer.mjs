// Page Multijoueur : un scénario de connexion par section
import { esc, paras, banner, infoBanner, pageShell, siteHeader, siteFooter } from './helpers.mjs';

function scenario(sc) {
  const list = (points) => `<ul>${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
  return `<article class="card" id="${esc(sc.id)}">
<h2 style="margin-top:0.2rem">${esc(sc.title)}</h2>
${list(sc.points)}
${(sc.sub || []).map((s) => `<h3>${esc(s.title)}</h3>${list(s.points)}`).join('')}
</article>`;
}

export function renderMultiplayer(mp) {
  if (!mp) {
    return pageShell({
      title: 'Multijoueur — Dissidia 012 [duodecim]',
      description: 'Configurer le multijoueur de Dissidia 012 [duodecim].',
      cssPath: 'styles/main.css', jsPath: null,
      body: `${siteHeader({ active: 'multijoueur' })}<main class="wrap">${banner()}</main>${siteFooter()}`,
    });
  }
  const anchors = mp.scenarios.map((sc) => `<a href="#${esc(sc.id)}">${esc(sc.title.split(' — ')[0].split(' (')[0])}</a>`).join(' · ');
  const body = `${siteHeader({ active: 'multijoueur' })}
<main class="wrap" style="padding-bottom:3rem">
<h1 style="color:var(--gold)">Jouer en multijoueur</h1>
${paras(mp.intro)}
<p class="mv-desc">Aller au scénario : ${anchors}</p>
<p class="mv-desc">Pas encore installé ? Commencez par <a href="install.html">Installer Dissidia 012 sur PPSSPP</a>, et récupérez une <a href="savedata.html">savedata prête à jouer</a>.</p>
${mp.scenarios.map(scenario).join('\n')}
${infoBanner(esc(mp.note))}
<p class="sources-list">Source : <a href="${esc(mp.source)}" target="_blank" rel="external noopener">${esc(mp.source)}</a> (dissidia.wiki, CC BY 4.0).</p>
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Jouer en multijoueur — Dissidia 012 [duodecim]',
    description: 'Configurer le multijoueur de Dissidia 012 [duodecim] : PPSSPP en ligne (Radmin, ZeroTier), Android, crossplay PC-Android, deux instances locales — un scénario par section.',
    cssPath: 'styles/main.css',
    jsPath: null,
    body,
  });
}
