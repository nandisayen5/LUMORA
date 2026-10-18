// Llamada a la API de Claude desde el servidor.
// La clave vive en la variable secreta ANTHROPIC_API_KEY (Vercel > Settings > Environment Variables).
import { respuestaSimulada } from './simulacion.js';

const MODELO = process.env.MODELO || 'claude-opus-5-5';
const ESFUERZO = process.env.ESFUERZO || 'high';

// Precios en dólares por millón de tokens (Opus 5.5). Se pueden cambiar con variables.
const PRECIO = {
  entrada: Number(process.env.PRECIO_ENTRADA || 4),
  cacheEscritura: Number(process.env.PRECIO_CACHE_ESCRITURA || 5),
  cacheLectura: Number(process.env.PRECIO_CACHE_LECTURA || 0.2),
  salida: Number(process.env.PRECIO_SALIDA || 20),
};

export function costoDolares(u = {}) {
  return (
    ((u.input_tokens || 0) * PRECIO.entrada +
      (u.cache_creation_input_tokens || 0) * PRECIO.cacheEscritura +
      (u.cache_read_input_tokens || 0) * PRECIO.cacheLectura +
      (u.output_tokens || 0) * PRECIO.salida) /
    1e6
  );
}

export function sumarUso(a = {}, b = {}) {
  const r = {};
  for (const k of ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens']) {
    r[k] = (a[k] || 0) + (b[k] || 0);
  }
  return r;
}

/**
 * Llama a Claude con streaming (para que las respuestas largas no se corten).
 * system: texto del sistema (se guarda en caché).
 * bloques: [{texto, cache}] — partes del mensaje del usuario; las que llevan cache:true se guardan en caché.
 * tarea: nombre de la tarea (solo para el modo simulación).
 */
export async function llamarClaude({ system, bloques, maxTokens = 64000, esfuerzo = ESFUERZO, tarea = '', datos = {} }) {
  if (process.env.SIMULACION === '1') {
    await new Promise((r) => setTimeout(r, Number(process.env.SIMULACION_ESPERA || 0)));
    return { texto: respuestaSimulada(tarea, datos), uso: { input_tokens: 1000, output_tokens: 500 }, stop: 'end_turn' };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta la variable ANTHROPIC_API_KEY en el servidor.');

  const cuerpo = {
    model: MODELO,
    max_tokens: Number(process.env.MAX_TOKENS) || maxTokens,
    stream: true,
    output_config: { effort: esfuerzo },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: bloques.map((b) =>
          b.cache
            ? { type: 'text', text: b.texto, cache_control: { type: 'ephemeral' } }
            : { type: 'text', text: b.texto }
        ),
      },
    ],
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`La API respondió ${resp.status}: ${t.slice(0, 400)}`);
  }

  const lector = resp.body.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  let texto = '';
  let uso = {};
  let stop = '';

  const procesar = (bloque) => {
    const linea = bloque.split('\n').find((l) => l.startsWith('data:'));
    if (!linea) return;
    let ev;
    try {
      ev = JSON.parse(linea.slice(5).trim());
    } catch {
      return;
    }
    if (ev.type === 'message_start') uso = { ...uso, ...(ev.message?.usage || {}) };
    else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') texto += ev.delta.text;
    else if (ev.type === 'message_delta') {
      if (ev.usage) uso = { ...uso, ...ev.usage };
      if (ev.delta?.stop_reason) stop = ev.delta.stop_reason;
    } else if (ev.type === 'error') throw new Error('Error de la API: ' + JSON.stringify(ev.error));
  };

  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    let i;
    while ((i = buffer.indexOf('\n\n')) >= 0) {
      procesar(buffer.slice(0, i));
      buffer = buffer.slice(i + 2);
    }
  }
  if (buffer.trim()) procesar(buffer);
  return { texto, uso, stop };
}

// Saca el primer objeto JSON de una respuesta (con o sin bloque ```json).
export function extraerJSON(texto) {
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidato = bloque ? bloque[1] : texto;
  const a = candidato.indexOf('{');
  const b = candidato.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('La respuesta no trajo JSON.');
  return JSON.parse(candidato.slice(a, b + 1));
}
