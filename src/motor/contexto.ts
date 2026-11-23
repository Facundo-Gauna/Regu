// Contexto inmutable de una evaluación: plan (con correcciones), calendario, datos del usuario,
// fecha de consulta y el estado ya calculado de cada materia.

import type { Calendario, CorreccionPlan, DatosUsuario, Electiva, EstadoRequisitoUsuario, Fecha, Id, MateriaPlan, Plan, Requisito } from './tipos.ts';
import { aplicarCalendarioUsuario, ConsultaCalendario } from './calendario.ts';
import { aplicarExcepcionUltimaMateria, calcularEstado, type InfoEstado } from './estado.ts';

export type Cursable = (MateriaPlan & { clase: 'materia' }) | (Electiva & { clase: 'electiva' });

export interface Contexto {
  plan: Plan;
  cal: ConsultaCalendario;
  usuario: DatosUsuario;
  fecha: Fecha;
  ciclo: number;
  /** Materias obligatorias y electivas del catálogo, por id. */
  cursables: Map<Id, Cursable>;
  requisitos: Map<Id, Requisito>;
  estados: Map<Id, InfoEstado>;
  estadoRequisitos: Map<Id, EstadoRequisitoUsuario>;
}

export function crearContexto(planOriginal: Plan, calendario: Calendario, usuario: DatosUsuario, fecha: Fecha): Contexto {
  const plan = aplicarCorreccionesPlan(planOriginal, usuario.correccionesPlan ?? []);
  const cal = new ConsultaCalendario(aplicarCalendarioUsuario(calendario, usuario.calendario));
  const ciclo = cal.cicloDe(fecha);

  const cursables = new Map<Id, Cursable>();
  for (const m of plan.materias) cursables.set(m.id, { ...m, clase: 'materia' });
  for (const e of plan.electivas) cursables.set(e.id, { ...e, clase: 'electiva' });

  const datosPorMateria = new Map(usuario.materias.map(m => [m.materiaId, m]));
  const estados = new Map<Id, InfoEstado>();
  for (const id of cursables.keys()) estados.set(id, calcularEstado(id, datosPorMateria.get(id), fecha, ciclo));

  // Excepción de última materia: si todas las demás obligatorias están aprobadas, no aplica el límite de aplazos.
  const obligatorias = plan.materias.map(m => m.id);
  for (const id of obligatorias) {
    const info = estados.get(id)!;
    if (info.motivoRecursar === 'aplazos' && obligatorias.every(o => o === id || estados.get(o)!.estado === 'aprobada')) {
      estados.set(id, aplicarExcepcionUltimaMateria(info));
    }
  }

  return {
    plan,
    cal,
    usuario,
    fecha,
    ciclo,
    cursables,
    requisitos: new Map(plan.requisitos.map(r => [r.id, r])),
    estados,
    estadoRequisitos: new Map(usuario.requisitos.map(r => [r.requisitoId, r])),
  };
}

export function nombreDe(ctx: Contexto, id: Id): string {
  return ctx.cursables.get(id)?.nombre ?? ctx.requisitos.get(id)?.nombre ?? ctx.plan.paquetesElectivas.find(p => p.id === id)?.nombre ?? id;
}

/** Aplica las correcciones del usuario sobre una copia del plan. Las correcciones a ítems inexistentes se ignoran. */
export function aplicarCorreccionesPlan(plan: Plan, correcciones: CorreccionPlan[]): Plan {
  if (correcciones.length === 0) return plan;
  const copia = structuredClone(plan);
  const items: Record<string, unknown>[] = [...copia.materias, ...copia.electivas, ...copia.requisitos, ...copia.paquetesElectivas] as unknown as Record<string, unknown>[];
  for (const c of correcciones) {
    const item = items.find(i => i['id'] === c.ref);
    if (!item) continue;
    const partes = c.campo.split('.');
    let destino: Record<string, unknown> = item;
    for (const p of partes.slice(0, -1)) {
      const siguiente = destino[p];
      if (typeof siguiente !== 'object' || siguiente === null) {
        destino = {};
        break;
      }
      destino = siguiente as Record<string, unknown>;
    }
    destino[partes.at(-1)!] = structuredClone(c.valor);
  }
  return copia;
}
