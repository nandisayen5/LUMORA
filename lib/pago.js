// Cobro con Mercado Pago (Checkout Pro).
// La clave vive en la variable secreta MP_ACCESS_TOKEN (Vercel > Settings > Environment Variables).
// Cada pago queda amarrado a UN guion exacto (huella SHA-256) y a sus minutos: no sirve para otra historia.
import { createHash, randomBytes } from 'node:crypto';
import { CONFIG, contarPalabras, fallo } from './comun.js';
import { redis } from './redis.js';

const API_MP = process.env.MP_API_URL || 'https://api.mercadopago.com';
const TOKEN_MP = () => process.env.MP_ACCESS_TOKEN || '';
const simulando = () => process.env.SIMULACION === '1' && !TOKEN_MP();

export const pagosActivos = () => !!TOKEN_MP() || process.env.SIMULACION === '1';

export function huella(guion) {
  const t = String(guion || '').replace(/\r\n?/g, '\n').trim();
  return createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 24);
}

// Minutos y monto que se cobran por un guion (mismo cálculo que ve el cliente).
export function cotizar(guion) {
  const palabras = contarPalabras(guion);
  const reales = Math.max(1, Math.ceil(palabras / CONFIG.palabrasPorMinuto));
  if (palabras < 30) throw fallo('El guion es demasiado corto.');
  if (reales > CONFIG.maximoMinutos) throw fallo(`El guion pasa de ${CONFIG.maximoMinutos} minutos. Divídelo en partes.`);
  const minutos = Math.max(CONFIG.minimoMinutos, reales);
  const dolares = Math.round(minutos * CONFIG.precioMinuto * 100) / 100;
  // Mercado Pago Perú cobra en soles: dólares × tipo de cambio, redondeado al sol entero hacia arriba.
  const soles = Math.ceil(dolares * CONFIG.tipoCambio - 1e-9);
  return { palabras, minutos, dolares, centavos: soles * 100, monto: soles };
}

// Referencia del pedido: np-<minutos>m-<centavos>c-<huella>-<azar>
export function leerReferencia(ref) {
  const m = String(ref || '').match(/^np-(\d+)m-(\d+)c-([0-9a-f]{24})-([0-9a-f]{8,})$/);
  if (!m) return null;
  return { minutos: Number(m[1]), centavos: Number(m[2]), huella: m[3] };
}

export async function crearPreferencia(guion, base) {
  const { minutos, centavos, monto, dolares } = cotizar(guion);
  const ref = `np-${minutos}m-${centavos}c-${huella(guion)}-${randomBytes(6).toString('hex')}`;
  if (simulando()) {
    return { ref, minutos, monto, dolares, url: `${base}/?collection_status=approved&status=approved&external_reference=${ref}` };
  }
  if (!TOKEN_MP()) throw fallo('Los pagos todavía no están activados.');
  const r = await fetch(`${API_MP}/checkout/preferences`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN_MP()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: 'lumora-historia', title: `Lumora: prompts para tu historia (${minutos} min)`, quantity: 1, unit_price: monto, currency_id: CONFIG.moneda }],
      external_reference: ref,
      back_urls: { success: `${base}/`, pending: `${base}/`, failure: `${base}/` },
      auto_return: 'approved',
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.init_point) throw new Error('Mercado Pago no creó el pago: ' + (j.message || r.status));
  const url = TOKEN_MP().startsWith('TEST-') && j.sandbox_init_point ? j.sandbox_init_point : j.init_point;
  return { ref, minutos, monto, dolares, url };
}

/**
 * Revisa en Mercado Pago que el pedido esté pagado y que corresponda a ESTE guion.
 * Devuelve { estado: 'pagado' | 'pendiente' | 'sin_pago', minutos }.
 */
export async function revisarPago(ref, guion) {
  const datos = leerReferencia(ref);
  if (!datos) throw Object.assign(new Error('El pedido no es válido.'), { status: 401 });
  if (huella(guion) !== datos.huella) throw Object.assign(new Error('Este pago es de otra historia.'), { status: 401 });
  const ok = { estado: 'pagado', minutos: datos.minutos };

  if (simulando()) return ok;
  if (await redis('GET', `pago:${ref}`).catch(() => null)) return ok;
  if (!TOKEN_MP()) throw new Error('Los pagos todavía no están activados.');

  const q = new URLSearchParams({ external_reference: ref, sort: 'date_created', criteria: 'desc' });
  const r = await fetch(`${API_MP}/v1/payments/search?${q}`, { headers: { authorization: `Bearer ${TOKEN_MP()}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('No se pudo revisar el pago en Mercado Pago (' + r.status + ').');
  const pagos = (j.results || []).filter((p) => p.external_reference === ref);
  const aprobado = pagos.find((p) => p.status === 'approved' && Number(p.transaction_amount) * 100 >= datos.centavos - 1);
  if (aprobado) {
    await redis('SET', `pago:${ref}`, String(aprobado.id), 'EX', 60 * 60 * 24 * 60).catch(() => null);
    return ok;
  }
  if (pagos.some((p) => ['pending', 'in_process', 'authorized'].includes(p.status))) return { estado: 'pendiente', minutos: datos.minutos };
  return { estado: 'sin_pago', minutos: datos.minutos };
}

/* ── Tope de gasto por pago (protege tus créditos de API) ── */
const topePorMinuto = () => Number(process.env.TOPE_DOLARES_MINUTO || 1);

export async function revisarTope(ctx) {
  if (!ctx.ref) return;
  const gastado = Number((await redis('GET', `gasto:${ctx.ref}`).catch(() => 0)) || 0);
  if (gastado >= ctx.minutos * topePorMinuto()) {
    throw Object.assign(new Error('Esta historia llegó a su límite de uso. Escríbenos por WhatsApp y lo resolvemos.'), { status: 402 });
  }
}

export async function anotarGasto(ctx, dolares) {
  if (!ctx.ref || !(dolares > 0)) return;
  await redis('INCRBYFLOAT', `gasto:${ctx.ref}`, dolares.toFixed(4)).catch(() => null);
  await redis('EXPIRE', `gasto:${ctx.ref}`, 60 * 60 * 24 * 60).catch(() => null);
}
