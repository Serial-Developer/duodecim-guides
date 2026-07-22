// Calendrier des tournois : grille mensuelle navigable, événements injectés
// au build dans #cal-data. Sans JS, la liste « À venir » reste lisible.
(function () {
  var dataEl = document.getElementById('cal-data');
  var grid = document.getElementById('cal-grid');
  if (!dataEl || !grid) return;

  var events = [];
  try { events = JSON.parse(dataEl.textContent).events || []; } catch (e) { return; }

  var byDay = {};
  events.forEach(function (e) { (byDay[e.iso] = byDay[e.iso] || []).push(e); });
  var sortedDays = Object.keys(byDay).sort();

  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

  var label = document.getElementById('cal-label');
  var list = document.getElementById('cal-month-list');
  var now = new Date();
  var todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  var view = { y: now.getFullYear(), m: now.getMonth() };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }

  function chip(e, full) {
    var a = document.createElement('a');
    a.className = 'cal-ev cal-ev-' + (e.iso >= todayIso ? 'up' : 'past');
    a.href = e.url;
    if (/^https?:/.test(e.url)) { a.target = '_blank'; a.rel = 'external noopener'; }
    a.textContent = full ? e.name : e.name.replace(/\s*[—(].*$/, '');
    a.title = e.name;
    return a;
  }

  function render() {
    label.textContent = MOIS[view.m] + ' ' + view.y;
    grid.innerHTML = '';
    JOURS.forEach(function (j) {
      var h = document.createElement('div');
      h.className = 'cal-head';
      h.textContent = j;
      grid.appendChild(h);
    });
    var offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
    var days = new Date(view.y, view.m + 1, 0).getDate();
    for (var i = 0; i < offset; i++) {
      var padCell = document.createElement('div');
      padCell.className = 'cal-cell cal-pad';
      grid.appendChild(padCell);
    }
    for (var d = 1; d <= days; d++) {
      var key = iso(view.y, view.m, d);
      var cell = document.createElement('div');
      cell.className = 'cal-cell' + (key === todayIso ? ' cal-today' : '');
      var num = document.createElement('span');
      num.className = 'cal-num';
      num.textContent = d;
      cell.appendChild(num);
      (byDay[key] || []).forEach(function (e) { cell.appendChild(chip(e, false)); });
      grid.appendChild(cell);
    }
    // Liste des événements du mois affiché (lisible en mobile, où les
    // pastilles de la grille sont réduites)
    list.innerHTML = '';
    var monthDays = sortedDays.filter(function (k) { return k.indexOf(view.y + '-' + pad(view.m + 1)) === 0; });
    if (monthDays.length) {
      var ul = document.createElement('ul');
      ul.className = 'cal-list';
      monthDays.forEach(function (k) {
        byDay[k].forEach(function (e) {
          var li = document.createElement('li');
          var when = document.createElement('strong');
          when.textContent = parseInt(k.slice(8), 10) + ' ' + MOIS[view.m];
          li.appendChild(when);
          li.appendChild(document.createTextNode(' — '));
          li.appendChild(chip(e, true));
          ul.appendChild(li);
        });
      });
      list.appendChild(ul);
    } else {
      var p = document.createElement('p');
      p.className = 'cal-empty';
      p.textContent = 'Aucun tournoi ce mois-ci.';
      list.appendChild(p);
    }
  }

  function move(delta) {
    view.m += delta;
    while (view.m < 0) { view.m += 12; view.y--; }
    while (view.m > 11) { view.m -= 12; view.y++; }
    render();
  }

  // Saute au mois du tournoi précédent/suivant par rapport au mois affiché
  // (l'historique est clairsemé : 2014, 2022, 2024-2026)
  function jump(dir) {
    var cur = view.y + '-' + pad(view.m + 1);
    var target = null;
    if (dir > 0) {
      for (var i = 0; i < sortedDays.length; i++) {
        if (sortedDays[i].slice(0, 7) > cur) { target = sortedDays[i]; break; }
      }
    } else {
      for (var j = sortedDays.length - 1; j >= 0; j--) {
        if (sortedDays[j].slice(0, 7) < cur) { target = sortedDays[j]; break; }
      }
    }
    if (target) {
      view.y = parseInt(target.slice(0, 4), 10);
      view.m = parseInt(target.slice(5, 7), 10) - 1;
      render();
    }
  }

  document.getElementById('cal-prev').addEventListener('click', function () { move(-1); });
  document.getElementById('cal-next').addEventListener('click', function () { move(1); });
  document.getElementById('cal-jump-prev').addEventListener('click', function () { jump(-1); });
  document.getElementById('cal-jump-next').addEventListener('click', function () { jump(1); });
  document.getElementById('cal-today').addEventListener('click', function () {
    view.y = now.getFullYear(); view.m = now.getMonth(); render();
  });

  render();
})();
