// Condición de estudiante regular en la carrera (Ord. 1549 7.4):
// hay que aprobar 2 materias por ciclo lectivo; el ciclo de ingreso no cuenta.
// Se recupera automáticamente al aprobar 2 materias en un ciclo (7.4.2).

import type { Contexto } from './contexto.ts';
import { entre } from './fechas.ts';
import type { RangoCiclo } from './calendario.ts';

export const MATERIAS_POR_CICLO = 2;

export interface EstudianteRegular {
  regular: boolean;
  razon: string;
  ciclo: RangoCiclo;
  /** Materias aprobadas en el ciclo actual (por directa o final; las equivalencias no cuentan). */
  aprobadasCicloActual: number;
  aprobadasCicloAnterior: number;
  meta: number;
  /** Cuántas faltan en el ciclo actual para asegurar la condición del ciclo siguiente. */
  faltanEsteCiclo: number;
}

function aprobadasEn(ctx: Contexto, rango: RangoCiclo): number {
  let n = 0;
  for (const info of ctx.estados.values()) {
    if (info.estado === 'aprobada' && info.forma !== 'equivalencia' && info.fechaAprobacion && entre(info.fechaAprobacion, rango.inicio, rango.fin)) n++;
  }
  return n;
}

export function estudianteRegular(ctx: Contexto): EstudianteRegular {
  const ingreso = ctx.usuario.perfil.anioIngreso;
  const ciclo = ctx.cal.rangoCiclo(ctx.ciclo);
  const actual = aprobadasEn(ctx, ciclo);
  const anterior = aprobadasEn(ctx, ctx.cal.rangoCiclo(ctx.ciclo - 1));
  const base = {
    ciclo,
    aprobadasCicloActual: actual,
    aprobadasCicloAnterior: anterior,
    meta: MATERIAS_POR_CICLO,
    faltanEsteCiclo: Math.max(0, MATERIAS_POR_CICLO - actual),
  };

  if (ctx.ciclo <= ingreso) return { ...base, regular: true, razon: 'Ciclo de ingreso: sos estudiante regular' };
  if (ctx.ciclo - 1 === ingreso) return { ...base, regular: true, razon: 'El ciclo de ingreso no se computa: sos estudiante regular' };
  if (actual >= MATERIAS_POR_CICLO) return { ...base, regular: true, razon: `Aprobaste ${actual} materias en el ciclo ${ctx.ciclo}` };
  if (anterior >= MATERIAS_POR_CICLO) return { ...base, regular: true, razon: `Aprobaste ${anterior} materias en el ciclo ${ctx.ciclo - 1}` };
  return {
    ...base,
    regular: false,
    razon: `En el ciclo ${ctx.ciclo - 1} aprobaste ${anterior} de ${MATERIAS_POR_CICLO} materias: sos estudiante no regular. Lo recuperás aprobando ${base.faltanEsteCiclo} más en este ciclo (podés inscribirte en al menos 1 materia)`,
  };
}
