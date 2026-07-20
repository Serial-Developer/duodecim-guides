// Retire l'artefact des portraits officiels : un petit bloc de pixels gris
// opaques (~RGB 128-130) collé au coin haut-gauche des PNG du wiki (présent
// dans les fichiers d'origine, visible une fois l'image agrandie).
// Méthode : flood-fill depuis (0,0) limité aux pixels grisâtres opaques d'une
// zone 24x24 -> alpha 0. L'artwork, jamais connecté au coin par du gris pur,
// n'est pas affecté. Ré-encodage PNG RGBA sans filtre.
// Usage : node scripts/clean-portraits.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'portraits');

function decode(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ctype = buf[25];
  if (ctype !== 6) return null; // seuls les RGBA sont traités
  let idat = Buffer.alloc(0), off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat = Buffer.concat([idat, buf.subarray(off + 8, off + 8 + len)]);
    off += 12 + len;
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(idat);
  const stride = w * 4, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const ul = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let v = line[x];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + up) & 255;
      else if (f === 3) v = (v + ((a + up) >> 1)) & 255;
      else if (f === 4) {
        const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul)) & 255;
      }
      out[y * stride + x] = v;
    }
  }
  return { w, h, data: out };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
};

function encode({ w, h, data }) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ZONE = 24;
const isGrey = (r, g, b, a) => a > 40 && Math.abs(r - g) <= 8 && Math.abs(g - b) <= 8 && r >= 115 && r <= 145;

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.png'))) {
  const file = join(DIR, f);
  const img = decode(readFileSync(file));
  if (!img) { console.log(`skip  ${f} (pas RGBA)`); continue; }
  const { w, data } = img;
  const px = (x, y) => data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4);
  const start = px(0, 0);
  if (!isGrey(...start)) { console.log(`ok    ${f} (pas d'artefact)`); continue; }
  // flood-fill 4-connexe depuis (0,0), borné à la zone
  const seen = new Set(), queue = [[0, 0]];
  let cleared = 0;
  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= ZONE || y >= ZONE || seen.has(y * ZONE + x)) continue;
    seen.add(y * ZONE + x);
    const p = px(x, y);
    if (!isGrey(p[0], p[1], p[2], p[3])) continue;
    p[3] = 0;
    cleared++;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  writeFileSync(file, encode(img));
  console.log(`nettoyé ${f} (${cleared} px)`);
}
console.log('Terminé.');
