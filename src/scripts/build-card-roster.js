// Filtre du banc d'essai des cartes de build : le sélecteur ne masque que des
// sections déjà rendues, rien n'est construit à la volée. Sans script, toutes
// les cartes restent visibles — c'est le comportement utile par défaut sur une
// page dont l'objet est de les comparer.
(function () {
  'use strict';
  var sel = document.getElementById('bcr-pick');
  if (!sel) return;
  var cartes = Array.prototype.slice.call(document.querySelectorAll('[data-bcr]'));
  if (!cartes.length) return;

  function appliquer() {
    var choix = sel.value;
    for (var i = 0; i < cartes.length; i++) {
      cartes[i].hidden = choix !== '*' && cartes[i].getAttribute('data-bcr') !== choix;
    }
    // L'état vit dans l'URL : on peut envoyer le cas précis qui coince.
    var q = choix === '*' ? '' : '?perso=' + encodeURIComponent(choix);
    history.replaceState(null, '', location.pathname + q);
  }

  var demande = new URLSearchParams(location.search).get('perso');
  if (demande) {
    for (var j = 0; j < cartes.length; j++) {
      if (cartes[j].getAttribute('data-bcr') === demande) { sel.value = demande; break; }
    }
  }
  sel.addEventListener('change', appliquer);
  appliquer();
})();
