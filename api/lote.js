import { fallo, CONFIG } from '../lib/comun.js';
import { manejador, gastar, revisarFrases } from '../lib/servidor.js';
import { costoDolares, sumarUso, extraerJSON } from '../lib/claude.js';
import { INSTR_PROMPTS } from '../lib/instrucciones.js';
import { ADAPT_PROMPTS, TAREA_LOTE, firmaDesdeEstilo } from '../lib/adaptacion.js';
import { ensamblarLote, fusionarNuevos, validarFichas, fichasMarkdown } from '../lib/ensamblar.js';
import { bloqueHistoria } from '../lib/historia.js';

export const config = { maxDuration: 300 };

export default manejador(async ({ guion, frases, fichas, bitacora, desde, hasta, estilo }, ctx) => {
  desde = parseInt(desde, 10);
  hasta = parseInt(hasta, 10);
  if (!Array.isArray(frases) || !frases.length) throw fallo('Falta el desglose.');
  revisarFrases(ctx, guion, frases);
  if (!(desde >= 1 && hasta >= desde && hasta <= frases.length)) throw fallo('El rango de números no es válido.');
  if (hasta - desde + 1 > CONFIG.tamanoLote) throw fallo(`Un lote tiene como máximo ${CONFIG.tamanoLote} números.`);
  const errF = validarFichas(fichas);
  if (errF.length) throw fallo('Las fichas no son válidas: ' + errF.join(' | '));

  const firma = firmaDesdeEstilo(estilo);
  const system = INSTR_PROMPTS + ADAPT_PROMPTS(firma, !!String(estilo || '').trim());
  const { bitacora: _b, ...fichasSinBitacora } = fichas;
  let uso = {};
  let aviso = '';
  let ultimoError = '';
  for (let intento = 1; intento <= 2; intento++) {
    const bloques = [
      { texto: bloqueHistoria(guion, frases), cache: true },
      { texto: 'FICHAS_MAESTRAS (JSON, fuente única de verdad):\n\n' + JSON.stringify(fichasSinBitacora, null, 1), cache: true },
      { texto: 'BITÁCORA DE CONTINUIDAD:\n\n' + (bitacora || '') + '\n' + TAREA_LOTE(desde, hasta) },
    ];
    if (aviso) bloques.push({ texto: aviso });
    const r = await gastar(ctx, { system, bloques, maxTokens: 64000, tarea: 'lote', datos: { desde, hasta, fichas } });
    uso = sumarUso(uso, r.uso);
    let errores = [];
    let salida = null;
    try {
      const data = extraerJSON(r.texto);
      const fichas2 = fusionarNuevos(fichas, data.nuevos);
      const { lineas, errores: e } = ensamblarLote(data.prompts, fichas2, firma, desde, hasta);
      errores = e;
      salida = {
        lineas,
        fichas: { ...fichas2, bitacora: data.bitacora || bitacora || '' },
        fichas_md: fichasMarkdown(fichas2, firma),
        bitacora: data.bitacora || bitacora || '',
      };
    } catch (e) {
      errores = [e.message];
    }
    if (!errores.length) return { ...salida, ...(ctx.dueno ? { uso, costo: costoDolares(uso) } : {}) };
    ultimoError = errores.slice(0, 6).join(' | ');
    aviso = 'Tu respuesta anterior tuvo estos errores: ' + ultimoError + '. Corrígelos y devuelve el JSON COMPLETO del lote.';
  }
  throw new Error('El lote no salió completo: ' + ultimoError);
});
