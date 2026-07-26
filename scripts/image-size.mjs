// Dimensions intrinsèques d'une image, lues dans son en-tête (PNG et JPEG —
// les deux seuls formats présents dans assets/). Elles servent à écrire
// width/height sur chaque <img> : sans eux le navigateur ne peut pas réserver
// la place avant le chargement, et la page se décale (CLS).
import { readFileSync } from 'node:fs';

export function imageSize(file) {
  let b;
  try { b = readFileSync(file); } catch { return null; }
  // PNG : signature 8 octets puis chunk IHDR (largeur/hauteur en big-endian)
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // JPEG : parcours des segments jusqu'au premier SOF (Start Of Frame)
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 (hors DHT/JPG/DAC)
      const isSof = marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xda)) { i += 2; continue; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

// Attributs prêts à insérer dans une balise <img> ('' si format non reconnu :
// mieux vaut aucun attribut qu'une dimension fausse, qui déformerait l'image).
export function sizeAttrs(file) {
  const s = imageSize(file);
  return s ? ` width="${s.width}" height="${s.height}"` : '';
}
