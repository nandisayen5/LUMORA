import { fallo, contarPalabras, CONFIG } from '../lib/comun.js';
import { manejador, gastar, revisarFrases } from '../lib/servidor.js';
import { costoDolares, sumarUso, extraerJSON } from '../lib/claude.js';
import { INSTR_PROMPTS } from '../lib/instrucciones.js';
import { ADAPT_PROMPTS, TAREA_FICHAS, firmaDesdeEstilo } from '../lib/adaptacion.js';
import { validarFichas, fichasMarkdown } from '../lib/ensamblar.js';
import { bloqueHistoria } from '../lib/historia.js';

export const config = { maxDuration: 300 };

export default manejador(async ({ guion, frases, estilo, rapido }, ctx) => {
  guion = String(guion || '').trim();
  if (!guion || !Array.isArray(frases) || !frases.length) throw fallo('Faltan el guion o el desglose.');
  const limite = Math.ceil(CONFIG.maximoMinutos * CONFIG.palabrasPorMinuto * 1.15);
  if (contarPalabras(guion) > limite) throw fallo('El guion supera el máximo permitido por compra.');
  revisarFrases(ctx, guion, frases);

  const firma = firmaDesdeEstilo(estilo);
  const system = INSTR_PROMPTS + ADAPT_PROMPTS(firma, !!String(estilo || '').trim());
  let uso = {};
  let aviso = '';
  for (let intento = 1; intento <= 2; intento++) {
    const bloques = [{ texto: bloqueHistoria(guion, frases), cache: true }, { texto: TAREA_FICHAS }];
    if (aviso) bloques.push({ texto: aviso });
    // Si el primer intento no alcanzó a terminar a tiempo, la página pide el modo rápido (esfuerzo medio).
    const esfuerzo = rapido ? 'medium' : process.env.ESFUERZO || 'high';
    const r = await gastar(ctx, { system, bloques, maxTokens: 64000, esfuerzo, tarea: 'fichas', datos: {} });
    uso = sumarUso(uso, r.uso);
    let fichas, errores;
    try {
      fichas = extraerJSON(r.texto);
      errores = validarFichas(fichas);
    } catch (e) {
      errores = [e.message];
    }
    if (!errores.length) {
      return {
        fichas,
        fichas_md: fichasMarkdown(fichas, firma),
        bitacora: fichas.bitacora || '',
        ...(ctx.dueno ? { uso, costo: costoDolares(uso) } : {}),
      };
    }
    aviso = 'Tu respuesta anterior tuvo estos problemas: ' + errores.join(' | ') + '. Corrígelos y devuelve el JSON completo de FICHAS_MAESTRAS.';
  }
  throw new Error('No se pudieron crear las fichas. Intenta de nuevo.');
});
