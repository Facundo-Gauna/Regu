// Cuentas de una cursada con estructura propia: partes ponderadas, cada una con sus evaluaciones.
//
// Igual que el resto del seguimiento, NO promete resultados: dice qué pasa con lo cargado y qué haría falta.

import type { CriterioAprobacion, CondicionNotas, Cursada, Evaluacion, ParteCursada, Umbrales } from '../motor/tipos.ts';
import { formatearNota, type EstadoCondicion, type ResultadoNivel } from './seguimiento.ts';

export const MINIMO_PARTE_GENERAL = 6;
/** Tolerancia para que «exactamente 7» no quede en 6,999999… */
const EPS = 1e-9;

export interface ItemParte {
  evaluacion: Evaluacion;
  /** El recuperatorio que la reemplaza, si lo hay. */
  reemplazo?: Evaluacion;
  /** Un recuperatorio cargado todavía sin nota. */
  pendiente?: Evaluacion;
  /** La nota que cuenta (la del recuperatorio si la reemplazó). */
  nota: number | null;
  /** Fracción dentro de la parte, de 0 a 1. */
  fraccion: number;
}

export interface ParteCalculada {
  parte: ParteCursada;
  /** Fracción de la nota total, de 0 a 1. */
  fraccion: number;
  items: ItemParte[];
  /** Promedio ponderado de lo cargado. */
  nota: number | null;
  completa: boolean;
  estado: 'aprobada' | 'desaprobada' | 'pendiente';
  /** Un problema en los porcentajes: mientras esté, no se concluye nada. */
  aviso?: string;
}

export interface CalculoEstructura {
  partes: ParteCalculada[];
  sinParte: Evaluacion[];
  total: number | null;
  minimoParte: number;
  /** true si el mínimo por parte es el general, no uno que fijó el alumno. */
  minimoSinConfirmar: boolean;
  promocion: ResultadoNivel;
  regular: ResultadoNivel;
}

/** Como formatearNota, pero sin redondear hacia arriba un valor que no llega: nunca «7 · no alcanza». */
export function formatearContra(n: number, minimo: number): string {
  if (n >= minimo - EPS) return formatearNota(n);
  return formatearNota(Math.floor(n * 100 + EPS) / 100);
}

export function formatearTotal(n: number, u: Umbrales): string {
  const engañoso = [u.promocion, u.regular].find(t => n < t - EPS && Math.round(n * 100) / 100 >= t);
  return formatearContra(n, engañoso ?? 0);
}

function fracciones(items: Evaluacion[], nombre: string): { f: number[]; aviso?: string } {
  const iguales = items.map(() => 1 / items.length);
  const conPeso = items.filter(e => e.peso !== undefined).length;
  if (conPeso === 0) return { f: iguales };
  if (conPeso < items.length) return { f: iguales, aviso: `En «${nombre}» poné porcentaje en todas o en ninguna.` };
  const suma = items.reduce((s, e) => s + e.peso!, 0);
  const f = items.map(e => e.peso! / suma);
  return Math.abs(suma - 100) > 0.01 ? { f, aviso: `Los porcentajes de «${nombre}» suman ${formatearNota(suma)} %, no 100.` } : { f };
}

export function calcular(c: Pick<Cursada, 'evaluaciones' | 'estructura'>, umbrales: Umbrales, criterio?: CriterioAprobacion | null): CalculoEstructura {
  const evaluaciones = c.evaluaciones ?? [];
  const partes = c.estructura?.partes ?? [];
  const minimoParte = c.estructura?.sinMinimo ? 0 : (c.estructura?.minimoParte ?? MINIMO_PARTE_GENERAL);

  // Un recuperatorio que apunta a otra evaluación existente no es un ítem aparte: ocupa su lugar
  const reemplazos = new Map<string, Evaluacion>();
  const sonReemplazo = new Set<string>();
  const pendientes = new Map<string, Evaluacion>();
  for (const e of evaluaciones) {
    if (e.tipo !== 'recuperatorio' || !e.reemplazaA || !evaluaciones.some(o => o.id === e.reemplazaA && o.id !== e.id)) continue;
    sonReemplazo.add(e.id);
    if (e.nota !== null) reemplazos.set(e.reemplazaA, e);
    else pendientes.set(e.reemplazaA, e);
  }
  const propias = evaluaciones.filter(e => !sonReemplazo.has(e.id));
  const idsPartes = new Set(partes.map(p => p.id));
  const sumaPartes = partes.reduce((s, p) => s + p.peso, 0);

  const calculadas: ParteCalculada[] = partes.map(parte => {
    const suyas = propias.filter(e => e.parte === parte.id);
    const { f, aviso } = fracciones(suyas, parte.nombre);
    const items: ItemParte[] = suyas.map((e, i) => {
      const r = reemplazos.get(e.id);
      const sinNota = r ? undefined : pendientes.get(e.id);
      return { evaluacion: e, ...(r ? { reemplazo: r } : {}), ...(sinNota ? { pendiente: sinNota } : {}), nota: r ? r.nota : e.nota, fraccion: f[i]! };
    });
    const cargado = items.filter(i => i.nota !== null);
    const peso = cargado.reduce((s, i) => s + i.fraccion, 0);
    const nota = cargado.length ? cargado.reduce((s, i) => s + i.fraccion * i.nota!, 0) / peso : null;
    const completa = items.length > 0 && cargado.length === items.length;
    const estado = !completa || aviso ? 'pendiente' : nota! >= minimoParte - EPS ? 'aprobada' : 'desaprobada';
    return { parte, fraccion: parte.peso / sumaPartes, items, nota, completa, estado, ...(aviso ? { aviso } : {}) };
  });

  let suma = 0;
  let pesoCargado = 0;
  for (const p of calculadas) {
    for (const i of p.items) {
      if (i.nota === null) continue;
      const w = p.fraccion * i.fraccion;
      suma += w * i.nota;
      pesoCargado += w;
    }
  }
  const total = pesoCargado > 0 ? suma / pesoCargado : null;

  const nivel = (general: number, condicion?: CondicionNotas): ResultadoNivel => {
    // Sin criterio propio se pide ese promedio; con criterio, lo que diga: cada nota, el promedio o las dos
    const minimo = condicion ? condicion.promedioMin : general;
    const cada = condicion?.cadaInstanciaMin;
    const avisos = calculadas.flatMap(p => (p.aviso ? [p.aviso] : []));
    if (avisos.length) return { estado: 'pendiente', detalles: avisos };
    const detalles: string[] = [];
    let estado: EstadoCondicion = 'pendiente';
    const flojas = calculadas.filter(p => p.estado === 'desaprobada');
    for (const p of flojas) detalles.push(`«${p.parte.nombre}» (${formatearContra(p.nota!, minimoParte)}) no llega a ${formatearNota(minimoParte)}. Mirá si la cátedra te deja recuperarla.`);
    const bajas = cada === undefined ? [] : calculadas.flatMap(p => p.items).filter(i => i.nota !== null && i.nota < cada - EPS);
    if (bajas.length) detalles.push(`Se pide ${formatearNota(cada!)} o más en cada nota: ${bajas.map(i => `${i.evaluacion.nombre} (${formatearNota(i.nota!)})`).join(', ')} no llega.`);
    const mal = flojas.length > 0 || bajas.length > 0;

    const pendiente = Math.max(0, 1 - pesoCargado);
    const completo = pendiente < EPS && calculadas.every(p => p.completa);
    if (minimo === undefined) {
      if (!mal) detalles.push(completo ? `Todas las notas llegan a ${formatearNota(cada!)}.` : `Hasta ahora todas llegan a ${formatearNota(cada!)}.`);
      estado = mal ? 'no-cumple' : completo ? 'cumple' : 'pendiente';
    } else if (pendiente < EPS) {
      const alcanza = suma >= minimo - EPS;
      detalles.push(`Promedio ${formatearContra(suma, minimo)}; se pide ${formatearNota(minimo)} o más.`);
      estado = alcanza && !mal && calculadas.every(p => p.estado === 'aprobada') ? 'cumple' : 'no-cumple';
    } else {
      const necesario = (minimo - suma) / pendiente;
      if (necesario > 10 + EPS) {
        detalles.push(`Para ${formatearNota(minimo)} de promedio ya no alcanza ni con 10 en lo que falta.`);
        estado = 'no-cumple';
      } else if (necesario <= 1) {
        detalles.push(`Con lo cargado, el promedio de ${formatearNota(minimo)} ya está encaminado.`);
      } else {
        detalles.push(`Para ${formatearNota(minimo)} de promedio necesitás ${formatearNota(Math.ceil((necesario - EPS) * 100) / 100)} en lo que falta.`);
      }
      if (mal) estado = 'no-cumple';
    }
    return { estado, detalles };
  };

  return {
    partes: calculadas,
    sinParte: propias.filter(e => !e.parte || !idsPartes.has(e.parte)),
    total,
    minimoParte,
    minimoSinConfirmar: c.estructura?.minimoParte === undefined,
    promocion: nivel(umbrales.promocion, criterio?.promocion),
    regular: nivel(umbrales.regular, criterio?.regular),
  };
}
