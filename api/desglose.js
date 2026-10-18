import { fallo, contarPalabras } from '../lib/comun.js';
import { manejador, gastar } from '../lib/servidor.js';
import { costoDolares, sumarUso } from '../lib/claude.js';
import { INSTR_DESGLOSE } from '../lib/instrucciones.js';
import { ADAPT_DESGLOSE } from '../lib/adaptacion.js';

export const config = { maxDuration: 300 };

const comillas = (s) => s.replace(/[“”«»„]/g, '"').replace(/[‘’]/g, "'");
const normal = (s) => comillas(s).replace(/\s+/g, '');

function leerLineas(texto) {
  const frases = [];
  for (const l of texto.split('\n')) {
    const m = l.match(/^\s*(\d+)\s*[.)]\s*(.+?)\s*$/);
    if (!m) continue;
    let f = m[2].trim();
    if (/^["“]/.test(f) && /["”]$/.test(f)) f = f.slice(1, -1);
    if (f) frases.push(f);
  }
  return frases;
}

function primeraDiferencia(a, b) {
  const x = normal(a), y = normal(b);
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return i >= x.length && x.length === y.length ? -1 : x.slice(Math.max(0, i - 30), i + 30);
}

export default manejador(async ({ texto, inicio, guion }, ctx) => {
  texto = String(texto || '').trim();
  inicio = Math.max(1, parseInt(inicio, 10) || 1);
  if (!texto) throw fallo('Llegó una etapa vacía.');
  if (contarPalabras(texto) > 2500) throw fallo('La etapa es demasiado larga (máximo 2500 palabras).');
  // Con un pago, cada etapa tiene que ser un pedazo del guion pagado.
  if (ctx.ref && !normal(guion).includes(normal(texto))) throw fallo('Esta parte no pertenece a tu guion.');

  let uso = {};
  let mejor = null;
  let aviso = '';
  for (let intento = 1; intento <= 2; intento++) {
    const bloques = [{ texto: 'TEXTO DE ESTA ETAPA:\n\n' + texto }];
    if (aviso) bloques.push({ texto: aviso });
    const r = await gastar(ctx, {
      system: INSTR_DESGLOSE + ADAPT_DESGLOSE(inicio),
      bloques,
      maxTokens: 32000,
      esfuerzo: process.env.ESFUERZO_DESGLOSE || process.env.ESFUERZO || 'high',
      tarea: 'desglose',
      datos: { texto, inicio },
    });
    uso = sumarUso(uso, r.uso);
    const frases = leerLineas(r.texto);
    const dif = primeraDiferencia(texto, frases.join(' '));
    if (frases.length && dif === -1) { mejor = { frases, fiel: true }; break; }
    if (!mejor || frases.length > mejor.frases.length) mejor = { frases, fiel: false };
    aviso = `ATENCIÓN: en el intento anterior el texto unido de tus frases NO coincidió letra por letra con el original (la diferencia está cerca de: "${dif}"). Vuelve a desglosar TODA la etapa copiando el texto EXACTO, sin omitir, cambiar ni agregar nada.`;
  }
  if (!mejor.frases.length) throw new Error('El desglose llegó vacío.');
  return { ...mejor, ...(ctx.dueno ? { uso, costo: costoDolares(uso) } : {}) };
});
