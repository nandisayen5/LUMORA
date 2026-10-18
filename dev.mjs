// Servidor local SOLO para probar en esta computadora (no se usa en Vercel).
// Uso: SIMULACION=1 CODIGOS_ACCESO=prueba CODIGO_DUENO=dueno node dev.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PUBLIC = path.resolve('public');
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const nombre = url.pathname.slice(5).replace(/[^a-z]/g, '');
    try {
      const mod = await import(`./api/${nombre}.js`);
      return mod.default(req, res);
    } catch (e) {
      res.statusCode = 404; return res.end('no existe');
    }
  }
  const f = path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!f.startsWith(PUBLIC) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('content-type', f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
server.listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
