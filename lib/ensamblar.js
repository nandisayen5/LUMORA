// Ensamblado por código (Regla 0 de Velocidad): el modelo escribe solo lo único de cada número
// y este código pega la ficha ADN, la cadena fija, la cadena de enfoque y la firma, letra por letra.
import { ENFOQUE } from './adaptacion.js';

const limpiar = (s) =>
  String(s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/;/g, ',')
    .replace(/[*#`"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Inserta el estado dentro del paréntesis final de la ficha.
function fichaConEstado(ficha, estado) {
  const f = String(ficha).trim();
  const e = limpiar(estado);
  if (!e) return f;
  if (f.endsWith(')')) return f.slice(0, -1) + ', ' + e + ')';
  return f + ' (' + e + ')';
}

export function validarFichas(fichas) {
  const err = [];
  if (!fichas || typeof fichas !== 'object') return ['No llegó el objeto de fichas.'];
  if (!Array.isArray(fichas.personajes)) err.push('Falta la lista "personajes".');
  if (!Array.isArray(fichas.locaciones) || !fichas.locaciones.length) err.push('Falta la lista "locaciones".');
  for (const p of fichas.personajes || []) {
    if (!p.id || !p.ficha) err.push(`Personaje sin id o sin ficha: ${JSON.stringify(p).slice(0, 80)}`);
    else if (!String(p.ficha).trim().endsWith(')')) err.push(`La ficha de ${p.id} no termina en ")".`);
  }
  for (const l of fichas.locaciones || []) {
    if (!l.id || !l.cadenas) err.push(`Locación sin id o sin cadenas: ${JSON.stringify(l).slice(0, 80)}`);
    else {
      if (!l.cadenas.AMPLIA) err.push(`La locación ${l.id} no tiene cadena AMPLIA.`);
      if (!Object.keys(l.cadenas).some((k) => k.startsWith('CERCANA'))) err.push(`La locación ${l.id} no tiene cadena CERCANA.`);
    }
  }
  return err;
}

// Agrega personajes y locaciones nuevos sin tocar los que ya existen (lo canon no se reescribe).
export function fusionarNuevos(fichas, nuevos) {
  const r = { ...fichas, personajes: [...(fichas.personajes || [])], locaciones: [...(fichas.locaciones || [])] };
  const idsP = new Set(r.personajes.map((p) => p.id));
  const idsL = new Set(r.locaciones.map((l) => l.id));
  for (const p of nuevos?.personajes || []) if (p?.id && p?.ficha && !idsP.has(p.id)) { r.personajes.push(p); idsP.add(p.id); }
  for (const l of nuevos?.locaciones || []) {
    if (!l?.id || !l?.cadenas) continue;
    if (!idsL.has(l.id)) { r.locaciones.push(l); idsL.add(l.id); }
    else {
      // Si llega una cadena CERCANA nueva para una locación existente, se añade sin cambiar las que ya hay.
      const ex = r.locaciones.find((x) => x.id === l.id);
      const cad = { ...ex.cadenas };
      for (const [k, v] of Object.entries(l.cadenas)) if (!cad[k] && v) cad[k] = v;
      r.locaciones = r.locaciones.map((x) => (x.id === l.id ? { ...x, cadenas: cad } : x));
    }
  }
  return r;
}

/**
 * Arma las líneas finales de un lote. Devuelve { lineas, errores }.
 */
export function ensamblarLote(prompts, fichas, firma, desde, hasta) {
  const errores = [];
  const lineas = [];
  const P = new Map((fichas.personajes || []).map((p) => [p.id, p]));
  const L = new Map((fichas.locaciones || []).map((l) => [l.id, l]));
  const esperados = hasta - desde + 1;

  if (!Array.isArray(prompts)) return { lineas: [], errores: ['Falta la lista "prompts".'] };
  if (prompts.length !== esperados) errores.push(`Llegaron ${prompts.length} prompts y se pidieron ${esperados}.`);

  const orden = [...prompts].sort((a, b) => Number(a.n) - Number(b.n));
  orden.forEach((p, i) => {
    const n = desde + i;
    if (Number(p.n) !== n) errores.push(`Se esperaba el número ${n} y llegó ${p.n}.`);
    const loc = L.get(p.locacion);
    if (!loc) { errores.push(`Número ${p.n}: la locación "${p.locacion}" no existe en las fichas.`); return; }
    const cadena = loc.cadenas?.[p.cadena];
    if (!cadena) { errores.push(`Número ${p.n}: la locación ${p.locacion} no tiene la cadena "${p.cadena}".`); return; }
    const anio = limpiar(p.anio);
    const fondo = `${String(cadena).trim()}, ${limpiar(p.capa)}, Año ${anio}, ${ENFOQUE}; ${firma}`;

    if (p.tipo === 'A') {
      const per = P.get(p.personaje);
      if (!per) { errores.push(`Número ${p.n}: el personaje "${p.personaje}" no existe en las fichas.`); return; }
      if (!limpiar(p.accion)) { errores.push(`Número ${p.n}: falta la acción.`); return; }
      lineas.push(`_ ${fichaConEstado(per.ficha, p.estado)} — ${limpiar(p.accion)}; ${fondo}`);
    } else if (p.tipo === 'B') {
      const bloques = Array.isArray(p.bloques) ? p.bloques : [];
      if (bloques.length < 2) { errores.push(`Número ${p.n}: la Plantilla B necesita al menos 2 bloques.`); return; }
      const partes = [];
      for (const b of bloques) {
        const per = P.get(b.personaje);
        if (!per) { errores.push(`Número ${p.n}: el personaje "${b.personaje}" no existe en las fichas.`); return; }
        partes.push(`${fichaConEstado(per.ficha, b.estado)} — ${limpiar(b.accion)}`);
      }
      if (p.cadena !== 'AMPLIA') errores.push(`Número ${p.n}: la Plantilla B debe usar la cadena AMPLIA.`);
      lineas.push(`_ ${partes.join('; ')}; ${limpiar(p.camara)}; ${fondo}`);
    } else if (p.tipo === 'C') {
      if (!limpiar(p.sujeto) || !limpiar(p.accion)) { errores.push(`Número ${p.n}: falta el sujeto o la acción.`); return; }
      lineas.push(`_ ${limpiar(p.sujeto)} — ${limpiar(p.accion)}; ${fondo}`);
    } else {
      errores.push(`Número ${p.n}: tipo "${p.tipo}" desconocido (usa A, B o C).`);
    }
  });

  if (lineas.length !== esperados && !errores.length) errores.push('No se pudieron armar todas las líneas.');
  return { lineas, errores };
}

// FICHAS_MAESTRAS.md legible, para entregar al cliente.
export function fichasMarkdown(f, firma) {
  const s = [];
  s.push('# FICHAS_MAESTRAS\n');
  s.push('## Época y lugar\n' + (f.epoca_y_lugar || '') + '\n');
  s.push('## Clase social\n' + (f.clase_social || '') + '\n');
  s.push('## Personajes\n');
  for (const p of f.personajes || []) s.push(`### ${p.nombre || p.id} — ${p.version || ''} (${p.rige || ''})\n${p.ficha}\n`);
  s.push('## Grupos y objetos canon\n' + (f.grupos_y_objetos || '') + '\n');
  s.push('## Locaciones\n');
  for (const l of f.locaciones || []) {
    s.push(`### ${l.id} — ${l.nombre || ''}`);
    for (const [k, v] of Object.entries(l.cadenas || {})) s.push(`${k}:\n${v}\n`);
    if (l.notas) s.push('NOTAS:\n' + l.notas + '\n');
  }
  s.push('## Luz canon\n' + (f.luz_canon || '') + '\n');
  s.push('## Firma de estilo\n' + firma + '\n');
  return s.join('\n');
}
