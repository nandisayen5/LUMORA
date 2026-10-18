import { responder, leerCuerpo } from '../lib/comun.js';
import { revisarPago } from '../lib/pago.js';

// Revisa si el pedido ya está pagado (cuando el cliente vuelve de Mercado Pago).
export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Usa POST.' });
  try {
    const { ref, guion } = await leerCuerpo(req);
    const r = await revisarPago(ref, String(guion || '').trim());
    return responder(res, 200, r);
  } catch (e) {
    console.error(e);
    return responder(res, e.status || 500, { error: e.message || 'No se pudo revisar el pago.' });
  }
}
