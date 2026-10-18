import { manejador } from '../lib/servidor.js';

// Revisa el código de acceso (o el pago) sin gastar nada de API.
export default manejador(async (_cuerpo, ctx) => ({ ok: true, dueno: ctx.dueno }));
