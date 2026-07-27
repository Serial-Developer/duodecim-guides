// Proposition de langue et mémorisation du choix.
//
// Trois règles, dans cet ordre :
//  1. l'URL demandée est toujours servie telle quelle — aucune redirection,
//     jamais, y compris depuis la racine. Un lien partagé ouvre la langue de
//     l'URL partagée, et un robot voit exactement la page qu'il a demandée :
//     c'est ce qui garantit que les deux versions restent indexables ;
//  2. si le navigateur réclame une langue publiée qui n'est pas celle de la
//     page, un bandeau discret et fermable la propose — dans cette langue-là ;
//  3. le choix (suivre ou refuser) est mémorisé et le bandeau ne revient plus.
//
// Le choix manuel du sélecteur de langue prime sur tout : il est enregistré au
// clic et vaut refus définitif du bandeau pour les autres langues.
(function () {
  var STORE = 'dissidia012.lang.v1';
  var doc = document.documentElement;
  var current = (doc.getAttribute('lang') || '').toLowerCase();

  function read() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function write(patch) {
    var v = read();
    for (var k in patch) v[k] = patch[k];
    try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* mode privé : le bandeau reviendra, sans casse */ }
  }

  // Le sélecteur enregistre le choix explicite de l'utilisateur.
  //
  // Il transporte aussi la query string : les liens du header sont statiques,
  // et changer de langue depuis un build partagé (?build=…) faisait perdre le
  // build. La même page dans l'autre langue est la même application, ses
  // paramètres valent donc des deux côtés. Le créateur de builds réécrit ensuite
  // ces mêmes liens avec son état vivant — les modifications non partagées
  // survivent alors elles aussi.
  var qs = location.search;
  var switches = document.querySelectorAll('.lang-switch a[hreflang]');
  for (var i = 0; i < switches.length; i++) {
    (function (a) {
      if (qs && a.getAttribute('href').indexOf('?') === -1) a.href = a.href + qs;
      a.addEventListener('click', function () {
        write({ chosen: a.getAttribute('hreflang'), dismissed: true });
      });
    })(switches[i]);
  }

  var el = document.getElementById('lang-alternates');
  if (!el) return;
  var alternates;
  try { alternates = JSON.parse(el.textContent); } catch (e) { return; }

  var saved = read();
  if (saved.dismissed) return;

  // Première langue réclamée par le navigateur qui soit publiée ici et
  // différente de celle de la page. `navigator.languages` est classé par
  // préférence : on respecte cet ordre plutôt que de chercher le français.
  var wanted = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];
  var target = null;
  for (var j = 0; j < wanted.length && !target; j++) {
    var base = String(wanted[j]).toLowerCase().split('-')[0];
    if (base === current) return;  // le navigateur préfère déjà cette page
    if (alternates[base]) target = alternates[base];
  }
  if (!target) return;

  var bar = document.createElement('div');
  bar.className = 'lang-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('lang', target.lang);

  var txt = document.createElement('span');
  txt.className = 'lang-bar-text';
  txt.textContent = target.text;

  var go = document.createElement('a');
  go.className = 'lang-bar-go';
  go.href = target.href + (qs && target.href.indexOf('?') === -1 ? qs : '');
  go.setAttribute('hreflang', target.lang);
  go.textContent = target.action;
  go.addEventListener('click', function () {
    write({ chosen: target.lang, dismissed: true });
  });

  var close = document.createElement('button');
  close.type = 'button';
  close.className = 'lang-bar-close';
  close.textContent = target.dismiss;
  close.setAttribute('aria-label', target.dismissAria);
  close.addEventListener('click', function () {
    write({ chosen: current, dismissed: true });
    bar.parentNode.removeChild(bar);
  });

  bar.appendChild(txt);
  bar.appendChild(go);
  bar.appendChild(close);
  document.body.insertBefore(bar, document.body.firstChild);
})();
