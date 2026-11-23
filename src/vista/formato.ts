// Formato de fechas y textos para mostrar. Las fechas son días calendario (AAAA-MM-DD): se formatean en UTC para que
// la zona horaria del dispositivo nunca corra el día.

import type { Fecha } from '../motor/index.ts';

const largo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const mesAnio = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const aDate = (f: Fecha) => new Date(`${f}T00:00:00Z`);

/** 23/11/2026 */
export function fechaCorta(f: Fecha): string {
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a}`;
}

/** 23/11 (sin año) */
export function diaMes(f: Fecha): string {
  const [, m, d] = f.split('-');
  return `${d}/${m}`;
}

/** lunes 23 de noviembre */
export function fechaLarga(f: Fecha): string {
  return largo.format(aDate(f)).replace(',', '');
}

export function mesYAnio(f: Fecha): string {
  return mesAnio.format(aDate(f));
}

/** "10/12 – 18/12/2026", o "10/12/2026" si es un solo día. */
export function rango(desde: Fecha, hasta: Fecha): string {
  if (desde === hasta) return fechaCorta(desde);
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
  return `${mismoAnio ? diaMes(desde) : fechaCorta(desde)} – ${fechaCorta(hasta)}`;
}

export function diasEntre(a: Fecha, b: Fecha): number {
  return Math.round((aDate(b).getTime() - aDate(a).getTime()) / 86_400_000);
}

/** "hoy", "mañana", "en 5 días", "hace 3 días". */
export function relativo(f: Fecha, hoy: Fecha): string {
  const d = diasEntre(hoy, f);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  return d > 0 ? `en ${d} días` : `hace ${-d} días`;
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function nombreCuatrimestre(c: '1C' | '2C' | 'anual'): string {
  return c === 'anual' ? 'Anual' : c === '1C' ? '1.er cuatrimestre' : '2.º cuatrimestre';
}
