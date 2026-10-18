// Respuestas falsas para probar la página SIN gastar API (variable SIMULACION=1).
export function respuestaSimulada(tarea, datos) {
  if (tarea === 'desglose') {
    const partes = String(datos.texto)
      .split(/(?<=[.!?…])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return partes.map((p, i) => `${datos.inicio + i}. "${p}"`).join('\n');
  }
  if (tarea === 'fichas') {
    return '```json\n' + JSON.stringify({
      epoca_y_lugar: 'Perú, sierra del sur, 1890 (simulación).',
      clase_social: 'Campesino pobre (simulación).',
      personajes: [
        { id: 'PROTA_V1', nombre: 'El Protagonista', version: 'V1', rige: 'desde el número 1', ficha: 'El Protagonista (40 años, hombre, alto y flaco, piel morena, camisa de tocuyo color hueso, pantalón de bayeta azul, ojotas de cuero, sombrero de paja)' },
        { id: 'VECINO_V1', nombre: 'el Vecino', version: 'V1', rige: 'desde el número 1', ficha: 'el Vecino (35 años, hombre, robusto, piel morena clara, camisa granate, pantalón gris, ojotas de cuero)' },
      ],
      grupos_y_objetos: 'gallinas coloradas (simulación)',
      locaciones: [
        { id: 'L01', nombre: 'Plaza', cadenas: { AMPLIA: 'plaza del pueblito andino, tierra apisonada ocre, casitas de adobe blanqueado, capillita al fondo a la izquierda', 'CERCANA-1': 'plaza del pueblito, suelo de tierra apisonada ocre con piedritas, muro de adobe blanqueado detrás con una puerta azul desteñido' }, notas: 'luz desde la izquierda' },
      ],
      luz_canon: 'MAÑANA: Morning light, cool temperature, long shadows, pale sunrise sky',
      bitacora: 'Domingo, media mañana, 1890 (simulación).',
    }) + '\n```';
  }
  if (tarea === 'lote') {
    if (process.env.SIM_FALLO_LOTE && Number(process.env.SIM_FALLO_LOTE) === datos.desde && datos.hasta - datos.desde >= 49) {
      throw new Error('Simulación: este lote de 50 tardó demasiado.');
    }
    const prompts = [];
    for (let n = datos.desde; n <= datos.hasta; n++) {
      const capa = 'luz de media mañana desde la izquierda, aire seco, ambiente: palomas sobre los techos';
      if (n % 7 === 0) prompts.push({ n, tipo: 'C', sujeto: 'Una lata de hojalata vieja', accion: `descansa sobre el muro (simulación ${n}), plano detalle, la lata llena el cuadro, centrado en el encuadre`, locacion: 'L01', cadena: 'CERCANA-1', capa, anio: '1890' });
      else if (n % 11 === 0) prompts.push({ n, tipo: 'B', bloques: [ { personaje: 'PROTA_V1', estado: '', accion: `estrecha la mano (simulación ${n}), a la izquierda del centro del encuadre` }, { personaje: 'VECINO_V1', estado: '', accion: 'estrecha la mano, a la derecha del centro del encuadre' } ], camara: 'plano entero, cámara alejada, exactamente 2 personajes en primer plano, agrupados en el centro del encuadre', locacion: 'L01', cadena: 'AMPLIA', capa, anio: '1890' });
      else prompts.push({ n, tipo: 'A', personaje: 'PROTA_V1', estado: n > 20 ? 'polvo en las ojotas' : '', accion: `mira al frente (simulación ${n}), plano medio, el cuerpo de la cintura a la cabeza llena el cuadro, centrado en el encuadre`, locacion: 'L01', cadena: n % 2 ? 'CERCANA-1' : 'AMPLIA', capa, anio: '1890' });
    }
    return '```json\n' + JSON.stringify({ nuevos: { personajes: [], locaciones: [] }, prompts, bitacora: `Último número completado: ${datos.hasta} (simulación).` }) + '\n```';
  }
  return '';
}
