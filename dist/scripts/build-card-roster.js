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
    var q = [];
    if (choix !== '*') q.push('perso=' + encodeURIComponent(choix));
    if (mode && mode.value) q.push('fond=' + encodeURIComponent(mode.value));
    history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : ''));
  }

  // Traitement du fond : le mode vit sur <body>, la feuille de style fait le
  // reste. Comme le personnage, il se garde dans l'URL.
  var mode = document.getElementById('bcr-mode');
  if (mode) {
    var poser = function () {
      if (mode.value) document.body.setAttribute('data-bcard-mode', mode.value);
      else document.body.removeAttribute('data-bcard-mode');
    };
    var demandeMode = new URLSearchParams(location.search).get('fond');
    if (demandeMode) mode.value = demandeMode;
    mode.addEventListener('change', function () { poser(); appliquer(); });
    poser();
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
