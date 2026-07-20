// Roster exact Dissidia 012 [duodecim] — 31 persos jouables + Aerith (assist) + Chaos (boss, fiche courte)
// slug = slug du site (fichiers HTML/JSON) ; page = nom de page dissidia.wiki ; icon = slug icône
// découvert dans Tier_List_(Dissidia_012) (chara-icon) ; le portrait est extrait de chaque page perso.
export const CHARACTERS = [
  { slug: 'warrior-of-light', page: 'Warrior_of_Light_(Dissidia_012)', name: 'Warrior of Light', origin: 'Final Fantasy', icon: 'wol' },
  { slug: 'garland',          page: 'Garland_(Dissidia_012)',          name: 'Garland',          origin: 'Final Fantasy', icon: 'garland' },
  { slug: 'firion',           page: 'Firion_(Dissidia_012)',           name: 'Firion',           origin: 'Final Fantasy II', icon: 'firion' },
  { slug: 'the-emperor',      page: 'The_Emperor_(Dissidia_012)',      name: 'The Emperor',      origin: 'Final Fantasy II', icon: 'empy' },
  { slug: 'onion-knight',     page: 'Onion_Knight_(Dissidia_012)',     name: 'Onion Knight',     origin: 'Final Fantasy III', icon: 'ok' },
  { slug: 'cloud-of-darkness',page: 'Cloud_of_Darkness_(Dissidia_012)',name: 'Cloud of Darkness',origin: 'Final Fantasy III', icon: 'cod' },
  { slug: 'cecil-harvey',     page: 'Cecil_Harvey_(Dissidia_012)',     name: 'Cecil Harvey',     origin: 'Final Fantasy IV', icon: 'cecil' },
  { slug: 'golbez',           page: 'Golbez_(Dissidia_012)',           name: 'Golbez',           origin: 'Final Fantasy IV', icon: 'golbez' },
  { slug: 'kain-highwind',    page: 'Kain_Highwind_(Dissidia_012)',    name: 'Kain Highwind',    origin: 'Final Fantasy IV', icon: 'kain' },
  { slug: 'bartz-klauser',    page: 'Bartz_Klauser_(Dissidia_012)',    name: 'Bartz Klauser',    origin: 'Final Fantasy V', icon: 'bartz' },
  { slug: 'exdeath',          page: 'Exdeath_(Dissidia_012)',          name: 'Exdeath',          origin: 'Final Fantasy V', icon: 'exd' },
  { slug: 'gilgamesh',        page: 'Gilgamesh_(Dissidia_012)',        name: 'Gilgamesh',        origin: 'Final Fantasy V', icon: 'gilgamesh' },
  { slug: 'terra-branford',   page: 'Terra_Branford_(Dissidia_012)',   name: 'Terra Branford',   origin: 'Final Fantasy VI', icon: 'terra' },
  { slug: 'kefka-palazzo',    page: 'Kefka_Palazzo_(Dissidia_012)',    name: 'Kefka Palazzo',    origin: 'Final Fantasy VI', icon: 'kefka' },
  { slug: 'cloud-strife',     page: 'Cloud_Strife_(Dissidia_012)',     name: 'Cloud Strife',     origin: 'Final Fantasy VII', icon: 'cloud' },
  { slug: 'sephiroth',        page: 'Sephiroth_(Dissidia_012)',        name: 'Sephiroth',        origin: 'Final Fantasy VII', icon: 'sephi' },
  { slug: 'tifa-lockhart',    page: 'Tifa_Lockhart_(Dissidia_012)',    name: 'Tifa Lockhart',    origin: 'Final Fantasy VII', icon: 'tifa' },
  { slug: 'squall-leonhart',  page: 'Squall_Leonhart_(Dissidia_012)',  name: 'Squall Leonhart',  origin: 'Final Fantasy VIII', icon: 'squall' },
  { slug: 'ultimecia',        page: 'Ultimecia_(Dissidia_012)',        name: 'Ultimecia',        origin: 'Final Fantasy VIII', icon: 'ulti' },
  { slug: 'laguna-loire',     page: 'Laguna_Loire_(Dissidia_012)',     name: 'Laguna Loire',     origin: 'Final Fantasy VIII', icon: 'laguna' },
  { slug: 'zidane-tribal',    page: 'Zidane_Tribal_(Dissidia_012)',    name: 'Zidane Tribal',    origin: 'Final Fantasy IX', icon: 'zidane' },
  { slug: 'kuja',             page: 'Kuja_(Dissidia_012)',             name: 'Kuja',             origin: 'Final Fantasy IX', icon: 'kuja' },
  { slug: 'tidus',            page: 'Tidus_(Dissidia_012)',            name: 'Tidus',            origin: 'Final Fantasy X', icon: 'tidus' },
  { slug: 'jecht',            page: 'Jecht_(Dissidia_012)',            name: 'Jecht',            origin: 'Final Fantasy X', icon: 'jecht' },
  { slug: 'yuna',             page: 'Yuna_(Dissidia_012)',             name: 'Yuna',             origin: 'Final Fantasy X', icon: 'yuna' },
  { slug: 'shantotto',        page: 'Shantotto_(Dissidia_012)',        name: 'Shantotto',        origin: 'Final Fantasy XI', icon: 'totto' },
  { slug: 'prishe',           page: 'Prishe_(Dissidia_012)',           name: 'Prishe',           origin: 'Final Fantasy XI', icon: 'prishe' },
  { slug: 'vaan',             page: 'Vaan_(Dissidia_012)',             name: 'Vaan',             origin: 'Final Fantasy XII', icon: 'vaan' },
  { slug: 'gabranth',         page: 'Gabranth_(Dissidia_012)',         name: 'Gabranth',         origin: 'Final Fantasy XII', icon: 'gab' },
  { slug: 'lightning',        page: 'Lightning_(Dissidia_012)',        name: 'Lightning',        origin: 'Final Fantasy XIII', icon: 'light' },
  { slug: 'feral-chaos',      page: 'Feral_Chaos_(Dissidia_012)',      name: 'Feral Chaos',      origin: 'Dissidia Final Fantasy', icon: 'fc' },
];

// Cas particuliers (hors grille versus standard)
export const SPECIAL = [
  { slug: 'aerith', page: 'Aerith_Gainsborough_(Dissidia_012)', name: 'Aerith Gainsborough', origin: 'Final Fantasy VII', role: 'assist' },
  { slug: 'chaos',  page: 'Chaos_(Dissidia_012)',               name: 'Chaos',               origin: 'Dissidia Final Fantasy', role: 'boss' },
];

export const META_PAGES = [
  'Tier_List_(Dissidia_012)',
  'Tier_List_(Assist)',
  'Attack_Priority_(Dissidia_012)',
  'Movement_Speed_Ranking_(Dissidia_012)',
  'Glossary_(Dissidia_012)',
  'Multiplayer_Build_Guide_(Dissidia_012)',
  'Blodge',
  'Dash_feint',
  'Lock_Off',
  'Dodge_(Dissidia_012)',
  'Equip_Glitch_(Dissidia_012)',
  'Assist_Storage_Glitch',
  'Online_Setup_(PPSSPP)',
];
