import { CONFIG } from '../lib/comun.js';

// Lleva al cliente a tu WhatsApp. Tu número vive solo en la variable secreta WHATSAPP (no está en la página).
export default function handler(req, res) {
  const numero = String(CONFIG.whatsapp || '').replace(/\D/g, '');
  if (!numero) { res.statusCode = 404; return res.end('WhatsApp no configurado'); }
  const texto = encodeURIComponent('Hola, vengo de Lumora. Tengo una consulta sobre mis prompts.');
  res.statusCode = 302;
  res.setHeader('location', `https://wa.me/${numero}?text=${texto}`);
  res.setHeader('cache-control', 'no-store');
  res.end();
}
