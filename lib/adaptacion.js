// Notas que el sistema agrega DESPUÉS de las instrucciones originales de Nando.
// No cambian ninguna ley: solo explican que el trabajo ocurre dentro de una página
// (sin chat ni archivos) y en qué forma devolver la respuesta para que el código la arme.

export const FIRMA_POR_DEFECTO =
  'Estilo: Cartoon 2D, thick black outline, clean lineart, flat colors, cel shading, vector style, low detail background';

export const ENFOQUE = 'Sharp focus, all in focus, deep depth of field, f/32, no blur, everything sharp';

export function firmaDesdeEstilo(estilo) {
  const limpio = String(estilo || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[;]/g, ',')
    .replace(/[*#`"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^estilo\s*:\s*/i, '');
  return limpio ? 'Estilo: ' + limpio : FIRMA_POR_DEFECTO;
}

export const ADAPT_DESGLOSE = (inicio) => `

════════════════════════════════════════
MODO PÁGINA AUTOMÁTICA (lo agrega el sistema)
════════════════════════════════════════
Estás trabajando dentro de una página web, sin chat. Todas tus reglas de desglose se cumplen igual, palabra por palabra.
1. Lo que recibes abajo es UNA ETAPA de la historia. Desglosa TODO ese texto, de la primera a la última palabra, sin saltar nada.
2. La numeración de esta etapa empieza en el número ${inicio}.
3. Responde SOLO con las líneas numeradas, una por línea, en el formato: número, punto, espacio y la frase entre comillas dobles.
4. No escribas títulos, comentarios ni la línea de "Etapa finalizada": el sistema ya sabe dónde termina.`;

export const ADAPT_PROMPTS = (firma, estiloPropio) => `

════════════════════════════════════════
MODO PÁGINA AUTOMÁTICA (lo agrega el sistema; manda solo sobre las partes del documento que hablan de chat, archivos o de qué responder en el chat)
════════════════════════════════════════
Estás trabajando dentro de una página web, sin chat y sin herramienta de archivos. TODO lo demás del documento se cumple igual: las 14 leyes, las plantillas A, B y C, la persistencia, la calidad cinematográfica, el ángulo variado, la actuación.

1. MEMORIA ESCRITA: FICHAS_MAESTRAS y la BITÁCORA te llegan en cada mensaje en formato JSON. Esa es tu fuente única de verdad. Usa los "id" de personajes y locaciones tal cual.

2. LA REGLA 0 LA EJECUTA EL SERVIDOR: el código del servidor arma cada línea final exactamente como dice la Regla 0 de Velocidad:
   "_ " + FICHA ADN completa (con el estado dentro del paréntesis) + " — " + lo único del momento + "; " + CADENA FIJA (AMPLIA o CERCANA, la que indiques) + ", " + capa del momento + ", Año " + año + ", " + cadena de enfoque + "; " + firma de estilo.
   En la Plantilla B pega la FICHA ADN completa de cada personaje en su bloque, une los bloques con "; " y después pone tu bloque de cámara.
   Tú escribes SOLO lo único de cada número en los campos JSON que se piden. JAMÁS copies dentro de tus campos la ficha ADN, la cadena fija de la locación, la palabra "Año", la cadena de enfoque ni la firma: el código las pega letra por letra.

3. FIRMA DE ESTILO DE ESTE CLIENTE: ${firma}
   Esta firma reemplaza a la firma "Estilo: Cartoon 2D..." en todo el documento.${
     estiloPropio
       ? `
   Este cliente eligió su propio estilo visual. La lista negra de la Ley 7 se aplica solo si su estilo es dibujo 2D plano; si no lo es, describe la luz y los materiales de forma coherente con su estilo. Todas las demás leyes siguen exactamente iguales.`
       : ''
   }

4. RESPUESTA: respondes SOLO con un objeto JSON válido dentro de un bloque \`\`\`json, sin ningún texto antes ni después. No escribas "Listo:", ni "Archivos memorizados", ni explicaciones.

5. DENTRO DE CADA CAMPO DE TEXTO: una sola línea, sin saltos de línea, sin comillas dobles, sin asteriscos, sin almohadillas, sin acentos graves y sin punto y coma (el punto y coma lo pone el código como separador). Usa comas.`;

export const TAREA_FICHAS = `
═══ TAREA: FASE 1 — MEMORIZACIÓN ═══
Arriba tienes el GUION COMPLETO y su DESGLOSE NUMERADO. Lee, analiza y memoriza todo como dice la Fase 1 y la Ley 2. Si falta un dato visual, invéntalo ahora, coherente con la época, el lugar y la clase social: desde este momento es CANON.
Crea FICHAS_MAESTRAS con TODO el contenido obligatorio de la Ley 2 y devuélvelas en este JSON (no generes ni un solo prompt):

\`\`\`json
{
  "epoca_y_lugar": "país, región, años, estación, clima, geografía, fauna y la lista cerrada de lo que SÍ existe (construcciones, materiales, herramientas, transportes, fuentes de luz, ropa y peinados)",
  "clase_social": "nivel económico de cada personaje o familia y cómo se ve",
  "personajes": [
    {
      "id": "ID_EN_MAYUSCULAS_V1",
      "nombre": "Nombre exacto como aparecerá en el prompt",
      "version": "V1",
      "rige": "desde qué número rige esta versión",
      "ficha": "Nombre (edad exacta, sexo, estatura y complexión, tono de piel, forma de la cara, ojos, cejas, nariz, boca, pelo, marcas permanentes, prenda de arriba, prenda de abajo, calzado, accesorios)"
    }
  ],
  "grupos_y_objetos": "cadenas fijas de grupos (gente de ambiente, animales en grupo) y objetos canon, cada uno descrito siempre con las mismas palabras",
  "locaciones": [
    {
      "id": "L01",
      "nombre": "nombre de la locación",
      "cadenas": {
        "AMPLIA": "cadena fija amplia completa, con posiciones fijas",
        "CERCANA-1": "cadena fija cercana del punto 1, mínimo 15 palabras, mismas palabras que la amplia"
      },
      "notas": "de qué lado entra la luz principal y qué ambiente tiene a cada hora"
    }
  ],
  "luz_canon": "palabras clave de luz de la Ley 8 para cada momento del día que use la historia",
  "bitacora": "bitácora inicial: día, hora, clima, estado del suelo y estado físico de cada personaje al empezar la historia"
}
\`\`\`

Reglas del JSON:
- Una versión de personaje = un objeto en "personajes" (V1, V2...). Si la historia tiene saltos de tiempo (Ley 9), crea ya todas las versiones que el guion necesita.
- Cada "ficha" empieza con el nombre del personaje y termina con el paréntesis de cierre ")".
- Un personaje sin nombre recibe un NOMBRE DE ROL FIJO (Ley 10).
- Exterior e interior son locaciones distintas. Cada locación tiene "AMPLIA" y al menos una "CERCANA-1".
`;

export const TAREA_LOTE = (desde, hasta) => `
═══ TAREA: FASE 2 Y 3 — PROMPTS DE LOS NÚMEROS ${desde} AL ${hasta} ═══
Antes de escribir, relee FICHAS_MAESTRAS y ubica cada número dentro del guion (Ley 11). Genera UN prompt por CADA número del ${desde} al ${hasta}, en orden, sin saltar ni fusionar ninguno, cumpliendo TODAS las leyes.

Devuelve este JSON:

\`\`\`json
{
  "nuevos": {
    "personajes": [ { "id": "...", "nombre": "...", "version": "V1", "rige": "...", "ficha": "Nombre (...)" } ],
    "locaciones": [ { "id": "...", "nombre": "...", "cadenas": { "AMPLIA": "...", "CERCANA-1": "..." }, "notas": "..." } ]
  },
  "prompts": [
    {
      "n": ${desde},
      "tipo": "A",
      "personaje": "ID de la versión vigente",
      "estado": "estado actual del cuerpo y de la ropa según la bitácora, o vacío",
      "accion": "acción física del instante, expresión, detalle de cuerpo, anclaje, plano y ángulo de cámara, frase de escala, centrado en el encuadre",
      "locacion": "L01",
      "cadena": "AMPLIA o CERCANA-1, CERCANA-2...",
      "capa": "luz del momento y de qué lado viene, atmósfera, clima y estado del suelo, ambiente: vida de fondo",
      "anio": "año exacto"
    },
    {
      "n": 0,
      "tipo": "B",
      "bloques": [
        { "personaje": "ID", "estado": "...", "accion": "acción, expresión corporal, detalle de cuerpo, anclaje, a la izquierda del centro del encuadre" },
        { "personaje": "ID", "estado": "...", "accion": "acción, expresión corporal, detalle de cuerpo, anclaje, a la derecha del centro del encuadre" }
      ],
      "camara": "plano entero o plano general, cámara alejada, frase de escala, exactamente N personajes en primer plano, cuerpos enteros dentro del cuadro, agrupados en el centro del encuadre, espacio visible entre sus cuerpos, y el punto exacto de contacto si lo hay",
      "locacion": "L01",
      "cadena": "AMPLIA",
      "capa": "...",
      "anio": "..."
    },
    {
      "n": 0,
      "tipo": "C",
      "sujeto": "objeto o lugar protagonista: material, forma, color y estado",
      "accion": "lo que ocurre en ese instante, anclaje, plano y ángulo de cámara, frase de escala, centrado en el encuadre",
      "locacion": "L01",
      "cadena": "AMPLIA o CERCANA-N",
      "capa": "...",
      "anio": "..."
    }
  ],
  "bitacora": "bitácora actualizada al cierre de este lote: día y hora, clima, estado del suelo, estado físico de cada personaje y qué lleva en cada mano, último número completado"
}
\`\`\`

Reglas del JSON:
- "prompts" tiene EXACTAMENTE ${hasta - desde + 1} objetos, con "n" del ${desde} al ${hasta}.
- "tipo": "A" (un personaje), "B" (varios personajes, solo por la excepción de la Ley 1, con "cadena": "AMPLIA") o "C" (sin personaje).
- Si en este lote nace un personaje o una locación, escríbelo primero en "nuevos" con su ficha completa y después úsalo por su "id". Si no nace nada, deja las listas vacías.
- Lo que el personaje lleva en las manos va en "accion" (anclaje), nunca en "estado".
- La capa del momento se repite palabra por palabra dentro de una misma escena hasta que la historia la cambie.
`;
