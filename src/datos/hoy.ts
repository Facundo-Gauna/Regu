// "Hoy" como fecha local AAAA-MM-DD.
// Se arma con los componentes locales y NO con toISOString(): ese devuelve la fecha en UTC y,
// pasadas las 21:00 en Argentina (UTC-3), ya marcaría el día siguiente, corriendo el ciclo, las inscripciones y el cierre de 48 h.

import type { Fecha } from '../motor/tipos.ts';

export function fechaLocal(d: Date = new Date()): Fecha {
  const a = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${dia}`;
}
