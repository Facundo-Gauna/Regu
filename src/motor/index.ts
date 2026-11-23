// Punto de entrada del motor de Regu.
// evaluar() es una función pura: mismos datos + misma fecha → mismo resultado.

import type { Calendario, DatosUsuario, Fecha, Id, Plan, PeriodoExamen } from './tipos.ts';
import { crearContexto, type Contexto } from './contexto.ts';
import type { InfoEstado } from './estado.ts';
import { cuatrimestreDeInicio, puedeCursar, puedeIniciarRequisito, puedeRendir, type Disponibilidad, type DisponibilidadRendir } from './disponibilidad.ts';
import { progresoPaquetes, progresoTitulos, type ProgresoPaquete, type ProgresoTitulo } from './progreso.ts';
import { estudianteRegular, type EstudianteRegular } from './regularidad.ts';

export interface ResumenMateria {
  id: Id;
  nombre: string;
  clase: 'materia' | 'electiva';
  nivel: number | null;
  regimen: Plan['materias'][number]['regimen'];
  /** Cuatrimestre en que se inscribe (las anuales en el 1C). */
  inicia: '1C' | '2C' | null;
  estado: InfoEstado;
  cursar: Disponibilidad;
  rendir: DisponibilidadRendir;
}

export interface Resumen {
  fecha: Fecha;
  ciclo: number;
  materias: ResumenMateria[];
  paquetes: ProgresoPaquete[];
  requisitos: { id: Id; nombre: string; estado: string; iniciar: Disponibilidad }[];
  titulos: ProgresoTitulo[];
  estudianteRegular: EstudianteRegular;
  calendario: {
    inscripcionesFinalAbiertas: (PeriodoExamen & { cierre: Fecha })[];
    proximoPeriodoExamen?: PeriodoExamen;
    proximaInscripcionCursado?: ReturnType<Contexto['cal']['proximaInscripcionCursado']>;
  };
}

export function evaluar(plan: Plan, calendario: Calendario, usuario: DatosUsuario, fecha: Fecha): Resumen {
  const ctx = crearContexto(plan, calendario, usuario, fecha);
  const paquetes = progresoPaquetes(ctx);

  const materias: ResumenMateria[] = [...ctx.cursables.values()].map(item => ({
    id: item.id,
    nombre: item.nombre,
    clase: item.clase,
    nivel: item.clase === 'materia' ? item.nivel : null,
    regimen: item.regimen,
    inicia: cuatrimestreDeInicio(item.regimen),
    estado: ctx.estados.get(item.id)!,
    cursar: puedeCursar(ctx, item.id),
    rendir: puedeRendir(ctx, item.id, paquetes),
  }));

  return {
    fecha,
    ciclo: ctx.ciclo,
    materias,
    paquetes,
    requisitos: ctx.plan.requisitos.map(r => ({
      id: r.id,
      nombre: r.nombre,
      estado: ctx.estadoRequisitos.get(r.id)?.estado ?? 'pendiente',
      iniciar: puedeIniciarRequisito(ctx, r.id),
    })),
    titulos: progresoTitulos(ctx, paquetes),
    estudianteRegular: estudianteRegular(ctx),
    calendario: {
      inscripcionesFinalAbiertas: ctx.cal.periodosConInscripcionAbierta(fecha).map(p => ({ ...p, cierre: ctx.cal.cierreInscripcionFinal(p.hasta) })),
      proximoPeriodoExamen: ctx.cal.proximoPeriodo(fecha),
      proximaInscripcionCursado: ctx.cal.proximaInscripcionCursado(fecha),
    },
  };
}

export { crearContexto } from './contexto.ts';
export { puedeCursar, puedeRendir, puedeIniciarRequisito, finExcepcionCorrelativas } from './disponibilidad.ts';
export { calcularEstado, MAX_APLAZOS } from './estado.ts';
export { ConsultaCalendario, aplicarCalendarioUsuario } from './calendario.ts';
export { progresoPaquetes, progresoTitulos } from './progreso.ts';
export { estudianteRegular } from './regularidad.ts';
export type * from './tipos.ts';
export type { InfoEstado, EstadoMateria } from './estado.ts';
export type { Disponibilidad, DisponibilidadRendir, Falta } from './disponibilidad.ts';
export type { EstudianteRegular } from './regularidad.ts';
export type { ProgresoPaquete, ProgresoTitulo } from './progreso.ts';
export type { RangoCiclo } from './calendario.ts';
