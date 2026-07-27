// Serveur statique de prévisualisation, sans dépendance.
//
// `python -m http.server` réinitialise la connexion sur les gros fichiers
// (ERR_CONNECTION_RESET sur dist/scripts/build-data.js, ~355 ko) : le créateur
// de builds démarre alors sans ses données, et rien ne se charge. Ce serveur-là
// diffuse en flux, ce qui règle le problème sans installer `serve`.
//
//   node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const PORT = Number(process.argv[2]) || 3210;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

createServer((req, res) => {
  // La query string ne fait pas partie du chemin ; `normalize` neutralise les
  // « ../ » qui sortiraient de dist/.
  const asked = decodeURIComponent(req.url.split('?')[0]);
  let rel = normalize(asked).replace(/^([/\\])+/, '');
  let file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  let info = null;
  try { info = statSync(file); } catch { /* traité juste après */ }
  if (info && info.isDirectory()) {
    file = join(file, 'index.html');
    try { info = statSync(file); } catch { info = null; }
  }
  if (!info) {
    // Le 404 du site est une vraie page : on la sert avec le bon code.
    try {
      const notFound = join(ROOT, '404.html');
      statSync(notFound);
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      createReadStream(notFound).pipe(res);
      return;
    } catch { res.writeHead(404).end('Not found'); return; }
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    // Prévisualisation : on veut voir le dernier build, pas le cache.
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`dist/ servi sur http://localhost:${PORT}`);
});
