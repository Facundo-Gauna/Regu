// Cómo viene una cursada: las notas cargadas, el promedio y la mínima, contra unas referencias que fija el usuario.
//
// Es un resumen de hechos, NO una promesa: no dice "vas a promocionar". Las reglas de cada cátedra son muy distintas
// (hay promedios, mínimos por instancia, porcentajes, recuperatorios que mantienen o hacen perder la promoción), así que
// la regla general 8 / 6 se muestra siempre como "sin confirmar" hasta que el usuario la ajusta.

import type { Cursada, Evaluacion, Umbrales } from '../motor/tipos.ts';

export const UMBRALES_GENERALES: Umbrales = { promocion: 8, regular: 6 };

export type NivelNota = 'promocion' | 'regular' | 'debajo' | 'pendiente';

export interface FilaEvaluacion {
  evaluacion: Evaluacion;
  /** false si un recuperatorio con nota la reemplazó. */
  vigente: boolean;
  reemplazadaPor?: Evaluacion;
  nivel: NivelNota;
}

export interface Seguimiento {
  filas: FilaEvaluacion[];
  /** Evaluaciones vigentes con nota. */
  conNota: number;
  /** Evaluaciones vigentes sin nota todavía. */
  pendientes: Evaluacion[];
  promedio: number | null;
  /** El promedio redondeado al entero más próximo, como pide la Ord. 1549 para la nota de aprobación directa. */
  promedioRedondeado: number | null;
  minima: { nota: number; nombre: string } | null;
  umbrales: Umbrales;
  /** true si el usuario fijó los umbrales; si no, son la regla general sin confirmar. */
  umbralesPropios: boolean;
  enPromocion: number;
  enRegular: number;
  debajo: Evaluacion[];
}

export function nivelDe(nota: number | null, u: Umbrales): NivelNota {
  if (nota === null) return 'pendiente';
  return nota >= u.promocion ? 'promocion' : nota >= u.regular ? 'regular' : 'debajo';
}

export function seguimientoCursada(c: Pick<Cursada, 'evaluaciones' | 'umbrales'>): Seguimiento {
  const evaluaciones = c.evaluaciones ?? [];
  const umbrales = c.umbrales ?? UMBRALES_GENERALES;

  // Un recuperatorio con nota reemplaza a la evaluación que el usuario indicó
  const reemplazo = new Map<string, Evaluacion>();
  for (const e of evaluaciones) {
    if (e.tipo === 'recuperatorio' && e.reemplazaA && e.nota !== null && evaluaciones.some(o => o.id === e.reemplazaA && o.id !== e.id)) {
      reemplazo.set(e.reemplazaA, e);
    }
  }
  const filas: FilaEvaluacion[] = evaluaciones.map(e => ({
    evaluacion: e,
    vigente: !reemplazo.has(e.id),
    ...(reemplazo.has(e.id) ? { reemplazadaPor: reemplazo.get(e.id)! } : {}),
    nivel: nivelDe(e.nota, umbrales),
  }));

  const vigentes = filas.filter(f => f.vigente).map(f => f.evaluacion);
  const conNota = vigentes.filter(e => e.nota !== null);
  const suma = conNota.reduce((s, e) => s + e.nota!, 0);
  const promedio = conNota.length ? Math.round((suma / conNota.length) * 100) / 100 : null;
  const peor = conNota.reduce<Evaluacion | null>((m, e) => (m === null || e.nota! < m.nota! ? e : m), null);

  return {
    filas,
    conNota: conNota.length,
    pendientes: vigentes.filter(e => e.nota === null),
    promedio,
    promedioRedondeado: promedio === null ? null : Math.round(promedio),
    minima: peor ? { nota: peor.nota!, nombre: peor.nombre } : null,
    umbrales,
    umbralesPropios: c.umbrales !== undefined,
    enPromocion: conNota.filter(e => e.nota! >= umbrales.promocion).length,
    enRegular: conNota.filter(e => e.nota! >= umbrales.regular).length,
    debajo: conNota.filter(e => e.nota! < umbrales.regular),
  };
}

/** Un número con coma y hasta 2 decimales: 7,67 · 8. */
export function formatearNota(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

/** Una frase para la lista de materias: "Promedio 7,5 (2 notas)". null si no hay notas. */
export function resumenCorto(c: Pick<Cursada, 'evaluaciones' | 'umbrales'> | undefined): string | null {
  if (!c?.evaluaciones?.length) return null;
  const s = seguimientoCursada(c);
  if (s.promedio === null) return `${s.pendientes.length} sin nota`;
  return `Promedio ${formatearNota(s.promedio)} (${s.conNota} ${s.conNota === 1 ? 'nota' : 'notas'})`;
}
