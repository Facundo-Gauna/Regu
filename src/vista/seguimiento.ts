// Cómo viene una cursada: las notas cargadas, el promedio y la mínima, contra unas referencias que fija el usuario.
//
// Es un resumen de hechos, NO una promesa: no dice "vas a promocionar". Las reglas de cada cátedra son muy distintas
// (hay promedios, mínimos por instancia, porcentajes, recuperatorios que mantienen o hacen perder la promoción), así que
// la regla general 8 / 6 se muestra siempre como "sin confirmar" hasta que el usuario la ajusta.

import { calcular, formatearTotal } from './estructura.ts';
import type { CondicionNotas, Cursada, Evaluacion, ReglaCursada, Umbrales } from '../motor/tipos.ts';

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
  /** true si el usuario fijó los umbrales; si no, son los de la planificación o la regla general sin confirmar. */
  umbralesPropios: boolean;
  /** De dónde salen las referencias: el usuario, la planificación de la cátedra o la regla general (sin confirmar). */
  origenUmbrales: 'usuario' | 'plantilla' | 'planificacion' | 'general';
  enPromocion: number;
  enRegular: number;
  debajo: Evaluacion[];
}

export function nivelDe(nota: number | null, u: Umbrales): NivelNota {
  if (nota === null) return 'pendiente';
  return nota >= u.promocion ? 'promocion' : nota >= u.regular ? 'regular' : 'debajo';
}

/** Las notas de referencia que salen de la regla de la cátedra (las que se usan para colorear), o null si no las define. */
export function umbralesDeRegla(regla: ReglaCursada | undefined): Umbrales | null {
  if (!regla || regla.tipo !== 'notas') return null;
  const promocion = regla.promocion?.promedioMin ?? regla.promocion?.cadaInstanciaMin;
  const regular = regla.regular?.promedioMin ?? regla.regular?.cadaInstanciaMin;
  return promocion !== undefined && regular !== undefined ? { promocion, regular } : null;
}

export function seguimientoCursada(c: Pick<Cursada, 'evaluaciones' | 'umbrales' | 'estructura'>, regla?: ReglaCursada): Seguimiento {
  const evaluaciones = c.evaluaciones ?? [];
  const deRegla = umbralesDeRegla(regla);
  const dePlantilla = c.estructura?.referencias;
  const umbrales = c.umbrales ?? dePlantilla ?? deRegla ?? UMBRALES_GENERALES;

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
    origenUmbrales: c.umbrales !== undefined ? 'usuario' : dePlantilla ? 'plantilla' : deRegla ? 'planificacion' : 'general',
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
export function resumenCorto(c: Pick<Cursada, 'evaluaciones' | 'umbrales' | 'estructura'> | undefined): string | null {
  if (!c?.evaluaciones?.length) return null;
  // Con estructura propia vale su promedio ponderado: no se muestra además el simple
  if (c.estructura) {
    const { umbrales } = seguimientoCursada(c);
    const { total } = calcular(c, umbrales);
    return total === null ? null : `Con lo cargado ${formatearTotal(total, umbrales)}`;
  }
  const s = seguimientoCursada(c);
  if (s.promedio === null) return `${s.pendientes.length} sin nota`;
  return `Promedio ${formatearNota(s.promedio)} (${s.conNota} ${s.conNota === 1 ? 'nota' : 'notas'})`;
}

// ---------------------------------------------------------------------------------------------------------------
// «Qué te falta»: compara las notas con la regla de la cátedra. Cada condición puede estar cumplida, incumplida o
// pendiente (todavía no hay notas suficientes para saberlo). Solo habla de las notas: la asistencia, los laboratorios y
// demás se devuelven aparte como «dependen de vos», porque la app no los conoce. Nunca dice «vas a promocionar».

export type EstadoCondicion = 'cumple' | 'no-cumple' | 'pendiente';

export interface ResultadoNivel {
  estado: EstadoCondicion;
  /** Una frase por cada cosa que se evaluó, en lenguaje natural. */
  detalles: string[];
}

export interface QueFalta {
  /** false si la regla es de texto: no se calcula y solo se muestra. */
  calculable: boolean;
  promocion?: ResultadoNivel;
  regular?: ResultadoNivel;
  dependeDeVos: string[];
}

const cumpleMin = (nota: number, min: number, estricto = false) => (estricto ? nota > min : nota >= min);
const textoMin = (min: number, estricto = false) => (estricto ? `más de ${formatearNota(min)}` : `${formatearNota(min)} o más`);

function evaluarCondicion(c: CondicionNotas, s: Seguimiento, total: number | null): ResultadoNivel {
  const vigentes = s.filas.filter(f => f.vigente && f.evaluacion.nota !== null).map(f => f.evaluacion);
  if (vigentes.length === 0) {
    const pide = [c.cadaInstanciaMin !== undefined ? `${textoMin(c.cadaInstanciaMin, c.estricto)} en cada instancia` : '', c.promedioMin !== undefined ? `promedio de ${textoMin(c.promedioMin, c.estricto)}` : ''].filter(Boolean).join(' y ');
    return { estado: 'pendiente', detalles: [`Se pide ${pide}. Todavía no cargaste notas.`] };
  }
  const faltan = total === null ? null : Math.max(0, total - vigentes.length);
  const detalles: string[] = [];
  const estados: EstadoCondicion[] = [];

  if (c.cadaInstanciaMin !== undefined) {
    const bajas = vigentes.filter(e => !cumpleMin(e.nota!, c.cadaInstanciaMin!, c.estricto));
    if (bajas.length) {
      estados.push('no-cumple');
      detalles.push(`Se pide ${textoMin(c.cadaInstanciaMin, c.estricto)} en cada instancia: ${bajas.map(e => `${e.nombre} (${formatearNota(e.nota!)})`).join(', ')} no llega. Mirá si la cátedra te deja recuperarla.`);
    } else if (faltan === 0) {
      estados.push('cumple');
      detalles.push(`Las ${vigentes.length} instancias cargadas llegan a ${textoMin(c.cadaInstanciaMin, c.estricto)}.`);
    } else {
      estados.push('pendiente');
      detalles.push(faltan === null ? `Hasta ahora todas llegan a ${textoMin(c.cadaInstanciaMin, c.estricto)}; no sé cuántas instancias faltan.` : `Hasta ahora todas llegan a ${textoMin(c.cadaInstanciaMin, c.estricto)}; te ${faltan === 1 ? 'falta 1 instancia' : `faltan ${faltan} instancias`}.`);
    }
  }

  if (c.promedioMin !== undefined) {
    const suma = vigentes.reduce((a, e) => a + e.nota!, 0);
    const promedio = suma / vigentes.length;
    if (faltan === 0) {
      const ok = cumpleMin(promedio, c.promedioMin, c.estricto);
      estados.push(ok ? 'cumple' : 'no-cumple');
      detalles.push(`Promedio ${formatearNota(promedio)}; se pide ${textoMin(c.promedioMin, c.estricto)}.`);
    } else if (faltan === null) {
      estados.push('pendiente');
      detalles.push(`Promedio hasta ahora ${formatearNota(promedio)}; se pide ${textoMin(c.promedioMin, c.estricto)}.`);
    } else {
      const necesario = (c.promedioMin * total! - suma) / faltan;
      if (necesario > 10 || (c.estricto && necesario >= 10)) {
        estados.push('no-cumple');
        detalles.push(`Para un promedio de ${textoMin(c.promedioMin, c.estricto)} ya no alcanza ni con 10 en lo que falta.`);
      } else {
        estados.push('pendiente');
        detalles.push(necesario <= 1 ? `Con lo cargado el promedio de ${textoMin(c.promedioMin, c.estricto)} ya está encaminado.` : `Para un promedio de ${textoMin(c.promedioMin, c.estricto)} necesitás ${c.estricto ? 'más de ' : 'al menos '}${formatearNota(Math.ceil(necesario * 100) / 100)} en ${faltan === 1 ? 'la instancia que falta' : `las ${faltan} que faltan, en promedio`}.`);
      }
    }
  }

  const estado: EstadoCondicion = estados.includes('no-cumple') ? 'no-cumple' : estados.every(e => e === 'cumple') ? 'cumple' : 'pendiente';
  return { estado, detalles };
}

export function queFalta(s: Seguimiento, regla: ReglaCursada): QueFalta {
  if (regla.tipo !== 'notas') return { calculable: false, dependeDeVos: regla.tambien };
  return {
    calculable: true,
    ...(regla.promocion ? { promocion: evaluarCondicion(regla.promocion, s, regla.instancias) } : {}),
    ...(regla.regular ? { regular: evaluarCondicion(regla.regular, s, regla.instancias) } : {}),
    dependeDeVos: regla.tambien,
  };
}
