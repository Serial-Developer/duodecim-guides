# icon-dissidia-12

Icônes extraites des planches de textures de **Dissidia 012 [duodecim] Final Fantasy**
(dump PPSSPP). PNG 32 bits, transparence préservée, taille d'origine (non redimensionné).

## Contenu

**equipment/** — les 4 slots d'équipement
  equip-weapon (19×32) · equip-hand (24×28) · equip-head (26×29) · equip-body (26×29)

**summon/** — summon-orb (16×16)

**badges/** — badge-e-boxed (16×15) · badge-e-plain (7×9) · badge-new (26×11)
  badge-new-small (16×8) · badge-update (30×13)

**buttons/** — btn-triangle · btn-circle · btn-square · btn-cross (12×12)
  btn-l · btn-r (16×12) · btn-select · btn-start (29×12)
  dpad-neutral · dpad-up · dpad-down · dpad-left · dpad-right (15×15)
  stick-analog (16×11)

**Others directory not concerned by this file**

## Intégration web

Ce sont de très petites textures : sans le réglage ci-dessous elles deviennent floues
dès qu'on les agrandit.

```css
.icon-d12 {
  image-rendering: pixelated;   /* net à l'agrandissement */
  image-rendering: crisp-edges; /* repli anciens navigateurs */
}
```

Agrandir de préférence par multiples entiers (×2, ×3, ×4) pour un rendu parfaitement net.

## Attribution

Assets extraits du jeu — © Square Enix. Usage de fan, non commercial.
À mentionner dans la section d'attribution du site, au même titre que les portraits.
