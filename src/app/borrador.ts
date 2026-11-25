// Borrador de «Contanos»: queda en este navegador hasta que se envía. localStorage puede fallar (modo privado).
import type { ContextoFeedback, TipoFeedback } from '../vista/feedback.ts';

const CLAVE = 'regu.contanos.borrador';

export interface Borrador {
  tipo: TipoFeedback;
  mensaje: string;
  incluirTecnico: boolean;
  /** El aviso desde donde se escribió: es parte del mensaje aunque se retome desde Más. */
  contexto?: ContextoFeedback | undefined;
}

export function leerBorrador(): Borrador | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Borrador | null;
    return b && typeof b.mensaje === 'string' && typeof b.tipo === 'string' ? b : null;
  } catch {
    return null;
  }
}

export function guardarBorrador(b: Borrador): void {
  try {
    if (b.mensaje) localStorage.setItem(CLAVE, JSON.stringify(b));
    else localStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento: no hay borrador */ }
}

export function borrarBorrador(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch { /* nada que borrar */ }
}
