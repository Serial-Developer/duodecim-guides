// Landing « Player Select » : mise à jour animée du panneau d'infos et du
// portrait au survol/focus + navigation clavier dans la grille.
(function () {
  var grid = document.getElementById('char-grid');
  if (!grid) return;
  var npName = document.getElementById('np-name');
  var npOrigin = document.getElementById('np-origin');
  var npSub = document.getElementById('np-sub');
  var npPortrait = document.getElementById('np-portrait');
  var links = Array.prototype.slice.call(grid.querySelectorAll('a'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = null;
  var pending = 0;

  // Précharge les portraits pour un crossfade sans à-coup
  links.forEach(function (a) {
    var img = new Image();
    img.src = a.getAttribute('data-portrait');
  });

  function apply(a) {
    npName.textContent = a.getAttribute('data-name');
    npOrigin.textContent = a.getAttribute('data-origin');
    var tier = a.getAttribute('data-tier');
    var tagline = a.getAttribute('data-tagline');
    npSub.innerHTML = '';
    if (tier) {
      var b = document.createElement('span');
      b.className = 'badge prio-melee-high';
      b.textContent = 'Tier ' + tier;
      npSub.appendChild(b);
    }
    npSub.appendChild(document.createTextNode(tagline || ''));
    if (npPortrait) npPortrait.src = a.getAttribute('data-portrait');
  }

  function show(a) {
    if (current === a) return;
    current = a;
    if (reduced) { apply(a); return; }
    var token = ++pending;
    [npName, npOrigin, npSub].forEach(function (el) { el.classList.add('switching'); });
    if (npPortrait) npPortrait.classList.add('switching');
    setTimeout(function () {
      if (token !== pending) return;
      apply(a);
      [npName, npOrigin, npSub].forEach(function (el) { el.classList.remove('switching'); });
      if (npPortrait) npPortrait.classList.remove('switching');
    }, 160);
  }

  links.forEach(function (a) {
    a.addEventListener('mouseenter', function () { show(a); });
    a.addEventListener('focus', function () { show(a); });
  });

  // Flèches : gauche/droite dans la rangée, haut/bas entre rangées (position conservée)
  var rows = Array.prototype.slice.call(grid.querySelectorAll('.char-row')).map(function (row) {
    return Array.prototype.slice.call(row.querySelectorAll('a'));
  });
  function locate(el) {
    for (var r = 0; r < rows.length; r++) {
      var c = rows[r].indexOf(el);
      if (c !== -1) return { r: r, c: c };
    }
    return null;
  }
  grid.addEventListener('keydown', function (e) {
    var pos = locate(document.activeElement);
    if (!pos) return;
    var target = null;
    if (e.key === 'ArrowRight') target = rows[pos.r][pos.c + 1] || (rows[pos.r + 1] || [])[0];
    else if (e.key === 'ArrowLeft') target = rows[pos.r][pos.c - 1] || (rows[pos.r - 1] || []).slice(-1)[0];
    else if (e.key === 'ArrowDown' && rows[pos.r + 1]) {
      var ratio = pos.c / Math.max(1, rows[pos.r].length - 1);
      target = rows[pos.r + 1][Math.round(ratio * (rows[pos.r + 1].length - 1))];
    } else if (e.key === 'ArrowUp' && rows[pos.r - 1]) {
      var ratio2 = pos.c / Math.max(1, rows[pos.r].length - 1);
      target = rows[pos.r - 1][Math.round(ratio2 * (rows[pos.r - 1].length - 1))];
    }
    if (target) {
      e.preventDefault();
      target.focus();
    }
  });
})();
