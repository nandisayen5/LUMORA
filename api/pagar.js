import { responder, leerCuerpo, direccionPublica } from '../lib/comun.js';
import { crearPreferencia } from '../lib/pago.js';

// Crea el cobro en Mercado Pago para ESTE guion. No gasta nada de API de Claude.
export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Usa POST.' });
  try {
    const { guion } = await leerCuerpo(req);
    const r = await crearPreferencia(String(guion || '').trim(), direccionPublica(req));
    return responder(res, 200, r);
  } catch (e) {
    console.error(e);
    return responder(res, e.status || 500, { error: e.message || 'No se pudo crear el pago.' });
  }
}
