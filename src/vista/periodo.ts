// Cuándo se puede cursar cada materia. Si el plan o los horarios lo dicen, no se elige.

import type { Cursada, DatosUsuario, Id, Plan } from '../motor/tipos.ts';

type ConRegimen = Pick<Plan['materias'][number], 'regimen' | 'regimenOrigen'>;
export type Periodo = Cursada['cuatrimestre'];

/** El período obligatorio, o null si el dato falta o se infirió (en ese caso lo elige el estudiante). */
export function periodoFijo(item: ConRegimen | undefined): Periodo | null {
  if (!item?.regimen) return null;
  return item.regimenOrigen === 'inferido' ? null : item.regimen;
}

export const NOMBRE_PERIODO: Record<Periodo, string> = { '1C': '1.er cuatrimestre', '2C': '2.º cuatrimestre', anual: 'anual' };

export interface PeriodoInvalido {
  materiaId: Id;
  cursadaId: string;
  actual: Periodo;
  correcto: Periodo;
}

/** Cursadas guardadas en un período en el que la materia no se dicta. Se avisan; no se tocan solas. */
export function periodosInvalidos(datos: DatosUsuario, plan: Plan): PeriodoInvalido[] {
  const items = [...plan.materias, ...plan.electivas];
  return datos.materias.flatMap(m => {
    const correcto = periodoFijo(items.find(i => i.id === m.materiaId));
    if (!correcto) return [];
    return m.cursadas.filter(c => c.cuatrimestre !== correcto).map(c => ({ materiaId: m.materiaId, cursadaId: c.id, actual: c.cuatrimestre, correcto }));
  });
}
