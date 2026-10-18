// Entrada común de las funciones que gastan API: revisa el permiso (código o pago) y anota el gasto.
import { responder, leerCuerpo, codigoValido, esDueno } from './comun.js';
import { revisarPago, revisarTope, anotarGasto } from './pago.js';
import { llamarClaude, costoDolares } from './claude.js';

// ctx = { dueno, ref, minutos }
async function autorizar(cuerpo) {
  if (codigoValido(cuerpo.codigo)) return { dueno: esDueno(cuerpo.codigo), ref: null, minutos: 0 };
  if (cuerpo.ref) {
    const p = await revisarPago(cuerpo.ref, cuerpo.guion);
    if (p.estado === 'pagado') return { dueno: false, ref: cuerpo.ref, minutos: p.minutos };
    throw Object.assign(new Error('Todavía no vemos tu pago aprobado.'), { status: 402 });
  }
  throw Object.assign(new Error('El código de acceso no es válido.'), { status: 401 });
}

export function manejador(fn) {
  return async (req, res) => {
    if (req.method !== 'POST') return responder(res, 405, { error: 'Usa POST.' });
    let cuerpo;
    try {
      cuerpo = await leerCuerpo(req);
    } catch {
      return responder(res, 400, { error: 'El cuerpo de la petición no es JSON válido.' });
    }
    try {
      const ctx = await autorizar(cuerpo);
      const r = await fn(cuerpo, ctx);
      return responder(res, 200, r);
    } catch (e) {
      console.error(e);
      return responder(res, e.status || 500, { error: e.message || 'Error interno.' });
    }
  };
}

// Con un pago, el desglose tiene que salir de ESE guion (no se puede colar otra historia).
const sinEspacios = (s) => String(s || '').replace(/\s+/g, '');
export function revisarFrases(ctx, guion, frases) {
  if (!ctx.ref) return;
  const largo = frases.map(sinEspacios).join('').length;
  if (largo > sinEspacios(guion).length * 1.1 + 200) {
    throw Object.assign(new Error('El desglose no corresponde a tu guion.'), { status: 400 });
  }
}

// Llama a Claude respetando el tope de gasto del pago y anotando lo que costó.
export async function gastar(ctx, opciones) {
  await revisarTope(ctx);
  const r = await llamarClaude(opciones);
  await anotarGasto(ctx, costoDolares(r.uso));
  return r;
}
