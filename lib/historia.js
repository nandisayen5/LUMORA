// Bloque con el guion y el desglose. Se arma SIEMPRE igual para que la API lo guarde en caché
// y en cada lote se cobre casi nada por volver a leerlo.
export function bloqueHistoria(guion, frases) {
  return (
    'GUION COMPLETO:\n\n' +
    String(guion).trim() +
    '\n\nDESGLOSE NUMERADO (cada número es un momento de la película):\n\n' +
    frases.map((f, i) => `${i + 1}. "${f}"`).join('\n')
  );
}
