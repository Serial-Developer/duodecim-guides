// Libellés du créateur de builds injectés dans la page (window.BC_I18N).
//
// src/scripts/build-creator.js est servi tel quel à toutes les langues : il ne
// peut donc pas contenir de texte. Cette fonction rassemble ce dont il a besoin
// depuis le catalogue de la locale rendue, et c'est le seul endroit à compléter
// quand l'outil gagne un libellé.
export function buildCreatorStrings(t) {
  return {
    locale: t.locale,
    ui: t.table('buildCreator'),
    app: t.table('buildCreatorApp'),
    // Le rendu partagé de la carte lit ses libellés par le même `T` : il lui
    // faut donc les deux tables qu'il utilise, sans quoi le créateur affiche des
    // clés nues là où le build statique affiche du texte.
    buildCard: t.table('buildCard'),
    accessories: t.table('accessories'),
  };
}
