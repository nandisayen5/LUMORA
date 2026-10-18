// Utilidades compartidas por las funciones del servidor.

export const CONFIG = {
  // El precio se muestra en dólares; Mercado Pago Perú cobra en soles al tipo de cambio de abajo.
  precioMinuto: Number(process.env.PRECIO_MINUTO || 1.2),
  tipoCambio: Number(process.env.TIPO_CAMBIO || 3.46),
  moneda: process.env.MONEDA || 'PEN',
  minimoMinutos: Number(process.env.MINIMO_MINUTOS || 10),
  maximoMinutos: Number(process.env.MAXIMO_MINUTOS || 40),
  palabrasPorMinuto: Number(process.env.PALABRAS_POR_MINUTO || 150),
  tamanoLote: 50,
  whatsapp: process.env.WHATSAPP || '',
};

// Códigos de acceso válidos (separados por coma) y código del dueño (ve los costos).
function codigos() {
  return String(process.env.CODIGOS_ACCESO || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function esDueno(codigo) {
  const d = String(process.env.CODIGO_DUENO || '').trim();
  return !!d && String(codigo || '').trim() === d;
}

export function codigoValido(codigo) {
  const c = String(codigo || '').trim();
  if (!c) return false;
  return esDueno(c) || codigos().includes(c);
}

export async function leerCuerpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const partes = [];
  for await (const c of req) partes.push(c);
  const t = Buffer.concat(partes).toString('utf8');
  return t ? JSON.parse(t) : {};
}

export function responder(res, status, datos) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(datos));
}

export const contarPalabras = (t) => (String(t || '').trim().match(/\S+/g) || []).length;

// Error por datos mal enviados (no se reintenta).
export function fallo(mensaje) {
  return Object.assign(new Error(mensaje), { status: 400 });
}

// Dirección pública de la página (para que Mercado Pago devuelva al cliente aquí).
export function direccionPublica(req) {
  if (process.env.URL_PUBLICA) return process.env.URL_PUBLICA.replace(/\/+$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || (String(host).startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
