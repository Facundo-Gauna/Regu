// Utilidades de fechas AAAA-MM-DD. Se opera en UTC para evitar problemas de zona horaria:
// las fechas representan días calendario de Argentina, sin hora.

import type { Fecha } from './tipos.ts';

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

function aDate(f: Fecha): Date {
  if (!FORMATO.test(f)) throw new Error(`Fecha inválida: ${f}`);
  const d = new Date(`${f}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== f) throw new Error(`Fecha inválida: ${f}`);
  return d;
}

function aFecha(d: Date): Fecha {
  return d.toISOString().slice(0, 10);
}

export function esFechaValida(f: string): boolean {
  try {
    aDate(f);
    return true;
  } catch {
    return false;
  }
}

export function sumarDias(f: Fecha, dias: number): Fecha {
  const d = aDate(f);
  d.setUTCDate(d.getUTCDate() + dias);
  return aFecha(d);
}

export function sumarAnios(f: Fecha, anios: number): Fecha {
  const [a, m, d] = f.split('-').map(Number) as [number, number, number];
  // 29/2 → 28/2 en años no bisiestos
  const candidata = `${String(a + anios).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return esFechaValida(candidata) ? candidata : sumarDias(`${a + anios}-${String(m).padStart(2, '0')}-01`, d - 2);
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(f: Fecha): number {
  return aDate(f).getUTCDay();
}

export function esHabil(f: Fecha, feriados: ReadonlySet<Fecha>): boolean {
  const ds = diaSemana(f);
  return ds !== 0 && ds !== 6 && !feriados.has(f);
}

/** Retrocede `n` días hábiles desde `f` (sin contar `f`). */
export function restarDiasHabiles(f: Fecha, n: number, feriados: ReadonlySet<Fecha>): Fecha {
  let actual = f;
  let restantes = n;
  while (restantes > 0) {
    actual = sumarDias(actual, -1);
    if (esHabil(actual, feriados)) restantes--;
  }
  return actual;
}

export function entre(f: Fecha, desde: Fecha | null, hasta: Fecha | null): boolean {
  return (desde === null || f >= desde) && (hasta === null || f <= hasta);
}

export function maxFecha(a: Fecha, b: Fecha): Fecha {
  return a >= b ? a : b;
}

/** Formato para mostrar: 15/12/2026. */
export function formatear(f: Fecha): string {
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a}`;
}
