// Cierre de cursadas: cuándo termina cada cursada y qué hay que preguntarle al usuario.
//
// El motor trata como "cursando" cualquier cursada cuyo resultado todavía no ocurrió, y cuenta los aplazos desde
// la fecha de cierre (`fechaResultado`). Nada convierte "cursando" en "regular" solo: por eso Inicio le pregunta
// al usuario cómo le fue cuando termina el cuatrimestre.

import type { ConsultaCalendario, Cursada, DatosUsuario, Fecha, ResultadoCursada } from '../motor/index.ts';

export interface FinCursada {
  fecha: Fecha;
  /** true si el fin no está en el calendario y se estimó. */
  estimada: boolean;
}

/** Fecha de fin de una cursada según el calendario. Las anuales terminan con el 2.º cuatrimestre. null = el calendario no lo trae. */
export function finDeCursada(cal: ConsultaCalendario, ciclo: number, cuatrimestre: Cursada['cuatrimestre']): FinCursada | null {
  const buscado = cuatrimestre === 'anual' ? '2C' : cuatrimestre;
  const q = cal.cal.cuatrimestres.find(c => c.ciclo === ciclo && c.cuatrimestre === buscado);
  return q ? { fecha: q.fin, estimada: false } : null;
}

export type ResultadoFormulario = { cursada: Omit<Cursada, 'id'> } | { error: string };

/**
 * Arma una cursada a partir de lo que cargó el usuario. Para un resultado que no sea "cursando" hace falta la fecha
 * de cierre: sale del calendario o la tiene que dar el usuario (sin ella se contarían mal los aplazos).
 */
export function construirCursada(
  cal: ConsultaCalendario,
  entrada: { ciclo: number; cuatrimestre: Cursada['cuatrimestre']; resultado: ResultadoCursada; fechaResultado?: Fecha },
): ResultadoFormulario {
  const { ciclo, cuatrimestre, resultado } = entrada;
  if (!Number.isInteger(ciclo) || ciclo < 1990 || ciclo > 2200) return { error: 'El ciclo lectivo no es válido' };
  if (resultado === 'cursando') return { cursada: { ciclo, cuatrimestre, resultado } };
  const fecha = entrada.fechaResultado || finDeCursada(cal, ciclo, cuatrimestre)?.fecha;
  if (!fecha) return { error: `El calendario no trae el fin de ${cuatrimestre === 'anual' ? 'el cursado anual' : `el ${cuatrimestre}`} ${ciclo}: indicá la fecha de cierre` };
  return { cursada: { ciclo, cuatrimestre, resultado, fechaResultado: fecha } };
}

export interface CursadaPorCerrar {
  materiaId: string;
  cursadaId: string;
  ciclo: number;
  cuatrimestre: Cursada['cuatrimestre'];
  fin: Fecha;
}

/** Cursadas marcadas como "cursando" cuyo cuatrimestre ya terminó: hay que preguntar cómo salió. */
export function cursadasPorCerrar(datos: DatosUsuario, cal: ConsultaCalendario, hoy: Fecha): CursadaPorCerrar[] {
  const out: CursadaPorCerrar[] = [];
  for (const m of datos.materias) {
    const ultima = m.cursadas.at(-1);
    if (!ultima || ultima.resultado !== 'cursando') continue;
    const fin = finDeCursada(cal, ultima.ciclo, ultima.cuatrimestre);
    if (fin && fin.fecha <= hoy) out.push({ materiaId: m.materiaId, cursadaId: ultima.id, ciclo: ultima.ciclo, cuatrimestre: ultima.cuatrimestre, fin: fin.fecha });
  }
  return out.sort((a, b) => a.fin.localeCompare(b.fin));
}

/**
 * Fecha con la que se registra el resultado de una cursada que el usuario declara hoy.
 * Es hoy, con tope en el fin del cuatrimestre: si la fecha fuera la del fin de cursado y todavía no llegó, el motor seguiría
 * mostrando "cursando" hasta ese día y el cambio parecería no haber funcionado.
 */
export function fechaDeCierre(cal: ConsultaCalendario, ciclo: number, cuatrimestre: Cursada['cuatrimestre'], hoy: Fecha): Fecha {
  const fin = finDeCursada(cal, ciclo, cuatrimestre);
  return fin && fin.fecha < hoy ? fin.fecha : hoy;
}

/** Ciclo y período en que conviene empezar a cursar una materia: el de su régimen, y el del año siguiente si ya terminó. */
export function periodoSugerido(cal: ConsultaCalendario, regimen: '1C' | '2C' | 'anual' | null, hoy: Fecha, cicloActual: number): { ciclo: number; cuatrimestre: Cursada['cuatrimestre'] } {
  const cuatrimestre: Cursada['cuatrimestre'] = regimen ?? '1C';
  const fin = finDeCursada(cal, cicloActual, cuatrimestre);
  return { ciclo: fin && fin.fecha < hoy ? cicloActual + 1 : cicloActual, cuatrimestre };
}
