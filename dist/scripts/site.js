// JS minimal de la landing : nameplate + navigation clavier en grille
(function () {
  var grid = document.getElementById('char-grid');
  if (!grid) return;
  var npName = document.getElementById('np-name');
  var npOrigin = document.getElementById('np-origin');
  var links = Array.prototype.slice.call(grid.querySelectorAll('a'));

  function show(a) {
    npName.textContent = a.getAttribute('data-name');
    npOrigin.textContent = a.getAttribute('data-origin');
  }
  links.forEach(function (a) {
    a.addEventListener('mouseenter', function () { show(a); });
    a.addEventListener('focus', function () { show(a); });
  });

  // Flèches : déplacement dans la grille (colonnes calculées depuis le layout réel)
  function cols() {
    var style = window.getComputedStyle(grid);
    return style.gridTemplateColumns.split(' ').length || 1;
  }
  grid.addEventListener('keydown', function (e) {
    var idx = links.indexOf(document.activeElement);
    if (idx === -1) return;
    var c = cols();
    var next = null;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + c;
    else if (e.key === 'ArrowUp') next = idx - c;
    if (next !== null && links[next]) {
      e.preventDefault();
      links[next].focus();
    }
  });
})();
