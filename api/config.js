import { CONFIG, responder } from '../lib/comun.js';
import { pagosActivos } from '../lib/pago.js';

// Datos públicos que la página necesita para calcular el precio (no gasta API).
// El número de WhatsApp NO se envía: solo si existe. El enlace pasa por /api/whatsapp.
export default function handler(req, res) {
  responder(res, 200, { ...CONFIG, whatsapp: !!CONFIG.whatsapp, pagos: pagosActivos() });
}
