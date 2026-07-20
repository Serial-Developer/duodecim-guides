// Fiche courte de Chaos — boss non jouable, hors sélection versus (périmètre §3)
import { esc, paras, pageShell, siteFooter } from './helpers.mjs';

export function renderChaos({ char, ed, hasPortrait }) {
  const body = `<main class="wrap" style="padding-bottom:3rem">
<p style="padding-top:1.2rem"><a href="../index.html">← Sélection des personnages</a></p>
<section class="hero">
${hasPortrait ? `<img class="portrait" src="../assets/portraits/${char.slug}.png" alt="Portrait de Chaos dans Dissidia 012 [duodecim]">` : ''}
<div class="hero-id">
<p class="origin">${esc(char.origin)}</p>
<h1>${esc(char.name)}</h1>
${ed?.tagline ? `<p class="tagline">${esc(ed.tagline)}</p>` : ''}
</div>
</section>
${ed?.overview?.length ? paras(ed.overview) : ''}
<div class="banner info">Chaos est un boss des modes solo, non sélectionnable en versus : il n'a pas de guide compétitif. Sa forme jouable, <a href="feral-chaos.html">Feral Chaos</a>, a le sien. Page wiki : <a href="${esc(char.url)}" rel="external noopener">${esc(char.url)}</a>.</div>
</main>
${siteFooter()}`;
  return pageShell({
    title: 'Chaos — Dissidia 012 [duodecim]',
    description: 'Fiche courte de Chaos, boss non jouable de Dissidia 012 [duodecim] Final Fantasy.',
    cssPath: '../styles/main.css',
    jsPath: null,
    body,
  });
}
