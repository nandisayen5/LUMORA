// Base de datos pequeña (Upstash Redis, plan gratis desde Vercel > Storage).
// Si no está conectada, la página igual funciona, pero sin tope de gasto por pago.
const URL_DB = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN_DB = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const hayBaseDeDatos = () => !!(URL_DB && TOKEN_DB);

export async function redis(...comando) {
  if (!hayBaseDeDatos()) return null;
  const r = await fetch(URL_DB, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN_DB}`, 'content-type': 'application/json' },
    body: JSON.stringify(comando.map(String)),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Base de datos: ' + (j.error || r.status));
  return j.result;
}
