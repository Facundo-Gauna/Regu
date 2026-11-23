// Consultas sobre el calendario académico: ciclos lectivos, inscripciones y cierres.

import type { Calendario, CalendarioUsuario, Cuatrimestre, Fecha, PeriodoExamen } from './tipos.ts';
import { entre, formatear, restarDiasHabiles, sumarAnios, sumarDias } from './fechas.ts';

function fusionar<T>(base: T[], extra: T[] | undefined, clave: (x: T) => string | number): T[] {
  if (!extra?.length) return base;
  const nuevas = new Map(extra.map(x => [clave(x), x]));
  return [...base.filter(x => !nuevas.has(clave(x))), ...extra];
}

/** Calendario de referencia + lo que cargó el usuario. No modifica el original. */
export function aplicarCalendarioUsuario(cal: Calendario, extra: CalendarioUsuario | undefined): Calendario {
  if (!extra) return cal;
  return {
    ...cal,
    ciclosLectivos: fusionar(cal.ciclosLectivos, extra.ciclosLectivos, c => c.id),
    cuatrimestres: fusionar(cal.cuatrimestres, extra.cuatrimestres, q => q.id).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    periodosExamen: fusionar(cal.periodosExamen, extra.periodosExamen, p => p.id).sort((a, b) => a.desde.localeCompare(b.desde)),
    feriados: fusionar(cal.feriados, extra.feriados, f => f.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
}

export interface RangoCiclo {
  ciclo: number;
  inicio: Fecha;
  fin: Fecha;
  /** true si alguna fecha no está en el calendario y se estimó. */
  estimado: boolean;
}

/** Fin estimado de un ciclo cuando el calendario no lo trae: mediados de marzo del año siguiente. */
const FIN_TIPICO = '03-14';

export class ConsultaCalendario {
  readonly cal: Calendario;
  readonly feriados: ReadonlySet<Fecha>;
  private readonly ciclos: Calendario['ciclosLectivos'];

  constructor(cal: Calendario) {
    this.cal = cal;
    this.feriados = new Set(cal.feriados.map(f => f.fecha));
    this.ciclos = [...cal.ciclosLectivos].sort((a, b) => a.id - b.id);
  }

  /** Fin del ciclo `id`: del calendario o estimado a partir del ciclo conocido más cercano. */
  finCiclo(id: number): { fin: Fecha; estimado: boolean } {
    const conocido = this.ciclos.find(c => c.id === id);
    if (conocido) return { fin: conocido.fin, estimado: false };
    const ref = this.ciclos.reduce<(typeof this.ciclos)[number] | undefined>(
      (mejor, c) => (!mejor || Math.abs(c.id - id) < Math.abs(mejor.id - id) ? c : mejor),
      undefined,
    );
    if (ref) return { fin: sumarAnios(ref.fin, id - ref.id), estimado: true };
    return { fin: `${id + 1}-${FIN_TIPICO}`, estimado: true };
  }

  /** Rango completo del ciclo: empieza el día siguiente al fin del ciclo anterior (o en su inicio de clases si se conoce). */
  rangoCiclo(id: number): RangoCiclo {
    const fin = this.finCiclo(id);
    const anterior = this.finCiclo(id - 1);
    const conocido = this.ciclos.find(c => c.id === id);
    const inicio = conocido?.inicio ?? sumarDias(anterior.fin, 1);
    return { ciclo: id, inicio, fin: fin.fin, estimado: fin.estimado || (!conocido?.inicio && anterior.estimado) };
  }

  /** Ciclo lectivo al que pertenece una fecha. Los días entre el fin de un ciclo y el inicio de clases del siguiente cuentan para el siguiente. */
  cicloDe(fecha: Fecha): number {
    const anio = Number(fecha.slice(0, 4));
    for (const candidato of [anio - 1, anio]) {
      const anterior = this.finCiclo(candidato - 1).fin;
      const fin = this.finCiclo(candidato).fin;
      if (fecha > anterior && fecha <= fin) return candidato;
    }
    return fecha.slice(5) > FIN_TIPICO ? anio : anio - 1;
  }

  /** Último día para inscribirse a una mesa: N horas hábiles antes (48 h = 2 días hábiles). */
  cierreInscripcionFinal(fechaExamen: Fecha): Fecha {
    const horas = this.cal.reglas?.cierreInscripcionFinalHorasHabiles ?? 48;
    return restarDiasHabiles(fechaExamen, Math.ceil(horas / 24), this.feriados);
  }

  /** Períodos de examen con la inscripción abierta en `fecha` (según el inicio del período). */
  periodosConInscripcionAbierta(fecha: Fecha): PeriodoExamen[] {
    return this.cal.periodosExamen.filter(
      p => p.inscripcionDesde !== null && entre(fecha, p.inscripcionDesde, this.cierreInscripcionFinal(p.hasta)),
    );
  }

  /** Próximo período de examen que todavía no terminó. */
  proximoPeriodo(fecha: Fecha): PeriodoExamen | undefined {
    return [...this.cal.periodosExamen].sort((a, b) => a.desde.localeCompare(b.desde)).find(p => p.hasta >= fecha);
  }

  /** Ventana de inscripción a cursado: confirmada en el calendario o estimada. */
  ventanaInscripcionCursado(ciclo: number, cuatrimestre: Cuatrimestre):
    | { desde: Fecha; hasta: Fecha; estimada: boolean; inicioCursado: Fecha }
    | undefined {
    const q = this.cal.cuatrimestres.find(c => c.ciclo === ciclo && c.cuatrimestre === cuatrimestre);
    if (!q) return undefined;
    if (q.inscripcion) return { ...q.inscripcion, estimada: false, inicioCursado: q.inicio };
    const antes = this.cal.reglas?.inscripcionCursadoDiasAntes ?? 14;
    const despues = this.cal.reglas?.inscripcionCursadoDiasDespues ?? 14;
    return { desde: sumarDias(q.inicio, -antes), hasta: sumarDias(q.inicio, despues), estimada: true, inicioCursado: q.inicio };
  }

  /** Próxima ventana de inscripción a cursado que todavía no cerró. */
  proximaInscripcionCursado(fecha: Fecha) {
    const ventanas = this.cal.cuatrimestres
      .map(q => this.ventanaInscripcionCursado(q.ciclo, q.cuatrimestre)!)
      .map((v, i) => ({ ...v, cuatrimestre: this.cal.cuatrimestres[i]!.cuatrimestre, ciclo: this.cal.cuatrimestres[i]!.ciclo }))
      .filter(v => v.hasta >= fecha)
      .sort((a, b) => a.desde.localeCompare(b.desde));
    return ventanas[0];
  }

  describirCiclo(id: number): string {
    const r = this.rangoCiclo(id);
    return `ciclo ${id} (${formatear(r.inicio)} – ${formatear(r.fin)}${r.estimado ? ', estimado' : ''})`;
  }
}
