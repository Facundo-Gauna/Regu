// ¿Puedo cursar? ¿Puedo rendir? Aplica correlativas del plan y excepciones de la Ord. 1549.

import type { Fecha, Id, Regimen } from './tipos.ts';
import { nombreDe, type Contexto } from './contexto.ts';
import { formatear } from './fechas.ts';
import { progresoPaquetes, requisitoCumplido, type ProgresoPaquete } from './progreso.ts';
import type { EstadoMateria } from './estado.ts';

export interface Falta {
  id: Id;
  nombre: string;
  /** Qué condición se exige. */
  requerido: 'regular' | 'aprobada' | 'cumplido';
  /** Estado actual del ítem que falta. */
  estadoActual: EstadoMateria | 'pendiente' | 'en-curso' | 'incompleto' | 'no-especificado';
}

export interface Disponibilidad {
  puede: boolean;
  /** Explicación en lenguaje natural del resultado. */
  razones: string[];
  faltan: Falta[];
  /** Excepción reglamentaria aplicada, si la hubo. */
  excepcion?: string;
  advertencias: string[];
}

export interface DisponibilidadRendir extends Disponibilidad {
  /** Hasta cuándo no se exigen las correlativas para rendir (Ord. 1549 7.2.2). */
  sinCorrelativasHasta?: Fecha;
  sinCorrelativasHastaEstimado?: boolean;
  /** El final es solo teórico (práctica promocionada). */
  soloTeorico: boolean;
}

const ESTADOS_REGULAR_O_MAS: ReadonlySet<EstadoMateria> = new Set(['regular', 'aprobada']);

function advertenciasDeDatos(ctx: Contexto, id: Id): string[] {
  const item = ctx.cursables.get(id) ?? ctx.requisitos.get(id);
  return (item?.verificar ?? []).map(v => `Dato a verificar: ${v}`);
}

function faltaMateria(ctx: Contexto, id: Id, requerido: 'regular' | 'aprobada'): Falta | undefined {
  const estado = ctx.estados.get(id)?.estado ?? 'no-cursada';
  const ok = requerido === 'aprobada' ? estado === 'aprobada' : ESTADOS_REGULAR_O_MAS.has(estado);
  return ok ? undefined : { id, nombre: nombreDe(ctx, id), requerido, estadoActual: estado };
}

function textoFaltas(faltan: Falta[]): string {
  // Qué hay que hacer con cada una (no en qué estado está): "(aprobada)" se leía como un estado y no como un faltante.
  return faltan.map(f => `${f.nombre} (${f.requerido === 'regular' ? 'falta regularizar' : f.requerido === 'aprobada' ? 'falta aprobar' : 'falta cumplir'})`).join(', ');
}

// ---------- Cursar ----------

/**
 * Excepción de últimas materias (Ord. 1549 5.3.1): si lo que falta cursar no supera la carga del último nivel,
 * se puede cursar sin correlativas. Sin carga horaria en el plan, se aproxima por cantidad de materias.
 */
function excepcionUltimasMaterias(ctx: Contexto, id: Id): string | undefined {
  const pendientes = ctx.plan.materias.filter(m => !ESTADOS_REGULAR_O_MAS.has(ctx.estados.get(m.id)!.estado));
  if (!pendientes.some(m => m.id === id)) return undefined;
  const ultimoNivel = ctx.plan.materias.filter(m => m.nivel === ctx.plan.niveles);
  const carga = ctx.plan.cargaHorariaUltimoNivel;
  if (carga != null && pendientes.every(m => m.horas != null)) {
    const horas = pendientes.reduce((s, m) => s + (m.horas ?? 0), 0);
    if (horas <= carga) return `Te faltan ${horas} h de cursado, no más que el último nivel (${carga} h): podés cursar sin correlativas (Ord. 1549 5.3.1)`;
    return undefined;
  }
  if (pendientes.length <= ultimoNivel.length) {
    return `Te faltan cursar ${pendientes.length} materias, no más que las del último nivel (${ultimoNivel.length}): podés cursar sin correlativas (Ord. 1549 5.3.1; aproximado por cantidad, el plan no trae horas)`;
  }
  return undefined;
}

export function puedeCursar(ctx: Contexto, id: Id): Disponibilidad {
  const item = ctx.cursables.get(id);
  if (!item) return { puede: false, razones: [`'${id}' no existe en el plan`], faltan: [], advertencias: [] };
  const info = ctx.estados.get(id)!;
  const advertencias = advertenciasDeDatos(ctx, id);

  if (info.estado === 'aprobada') return { puede: false, razones: ['Ya está aprobada'], faltan: [], advertencias };
  if (info.estado === 'cursando') return { puede: false, razones: ['La estás cursando'], faltan: [], advertencias };
  if (info.estado === 'regular') {
    return {
      puede: false,
      razones: ['Ya está regular: para recursarla hace falta autorización del director de carrera (Ord. 1549 5.3.2)'],
      faltan: [],
      advertencias,
    };
  }

  const c = item.correlativas.cursar;
  const faltan = [
    ...c.regularizadas.map(r => faltaMateria(ctx, r, 'regular')),
    ...c.aprobadas.map(r => faltaMateria(ctx, r, 'aprobada')),
  ].filter((f): f is Falta => f !== undefined);

  const razones: string[] = [];
  if (info.estado === 'recursar') razones.push(info.motivoRecursar === 'aplazos' ? 'Tenés que recursarla por aplazos' : 'Tenés que recursarla');

  if (faltan.length === 0) {
    razones.push(c.regularizadas.length + c.aprobadas.length === 0 ? 'No tiene correlativas para cursar' : 'Cumplís todas las correlativas para cursar');
    return { puede: true, razones, faltan, advertencias };
  }

  const excepcion = item.clase === 'materia' ? excepcionUltimasMaterias(ctx, id) : undefined;
  if (excepcion) {
    return {
      puede: true,
      razones: [...razones, `Te faltan: ${textoFaltas(faltan)}`],
      faltan,
      excepcion,
      advertencias: [...advertencias, 'Para rendir el final se van a exigir las correlativas'],
    };
  }
  return { puede: false, razones: [...razones, `Te faltan: ${textoFaltas(faltan)}`], faltan, advertencias };
}

/** Cuatrimestre en que se puede inscribir: las anuales empiezan en el 1C. null = régimen desconocido. */
export function cuatrimestreDeInicio(regimen: Regimen): '1C' | '2C' | null {
  if (regimen === 'anual' || regimen === '1C') return '1C';
  if (regimen === '2C') return '2C';
  return null;
}

// ---------- Rendir ----------

/** Fin del ciclo lectivo siguiente al del cursado: hasta ahí no se exigen correlativas para rendir (Ord. 1549 7.2.2). */
export function finExcepcionCorrelativas(ctx: Contexto, cicloCursado: number): { hasta: Fecha; estimado: boolean } {
  const { fin, estimado } = ctx.cal.finCiclo(cicloCursado + 1);
  return { hasta: fin, estimado };
}

function faltasRendir(ctx: Contexto, id: Id, paquetes: () => ProgresoPaquete[]): Falta[] {
  const item = ctx.cursables.get(id)!;
  const req = item.correlativas.rendir.aprobadas;
  if (req !== 'todas') return req.map(r => faltaMateria(ctx, r, 'aprobada')).filter((f): f is Falta => f !== undefined);

  // "TODAS": el resto de las obligatorias, los paquetes de electivas y los requisitos, salvo los que también dicen "todas".
  const exigeTodas = (x: { correlativas: { rendir: { aprobadas: unknown } } }) => x.correlativas.rendir.aprobadas === 'todas';
  const faltan: Falta[] = [];
  for (const m of ctx.plan.materias) {
    if (m.id === id || exigeTodas(m)) continue;
    const f = faltaMateria(ctx, m.id, 'aprobada');
    if (f) faltan.push(f);
  }
  for (const p of paquetes()) {
    if (p.cumplido !== true) {
      faltan.push({ id: p.id, nombre: p.nombre, requerido: 'cumplido', estadoActual: p.cumplido === null ? 'no-especificado' : 'incompleto' });
    }
  }
  for (const r of ctx.plan.requisitos) {
    if (r.id === id || exigeTodas(r)) continue;
    if (!requisitoCumplido(ctx, r.id)) {
      const estado = ctx.estadoRequisitos.get(r.id)?.estado === 'en-curso' ? 'en-curso' : 'pendiente';
      faltan.push({ id: r.id, nombre: r.nombre, requerido: 'cumplido', estadoActual: estado });
    }
  }
  return faltan;
}

export function puedeRendir(ctx: Contexto, id: Id, paquetesCache?: ProgresoPaquete[]): DisponibilidadRendir {
  const item = ctx.cursables.get(id);
  const vacio = { faltan: [], advertencias: [], soloTeorico: false };
  if (!item) return { ...vacio, puede: false, razones: [`'${id}' no existe en el plan`] };
  const info = ctx.estados.get(id)!;
  const advertencias = advertenciasDeDatos(ctx, id);

  if (info.estado === 'aprobada') {
    const razones = ['Ya está aprobada'];
    if (info.pendienteRegistrarMesa) razones.push('Falta registrar la aprobación directa inscribiéndote a una mesa');
    return { ...vacio, puede: false, razones, advertencias };
  }
  if (info.estado !== 'regular') {
    const motivo: Record<Exclude<EstadoMateria, 'aprobada' | 'regular'>, string> = {
      'no-cursada': 'Para rendir tenés que regularizarla primero (no hay examen libre en esta materia)',
      cursando: 'La estás cursando: vas a poder rendir cuando la regularices',
      recursar: info.motivoRecursar === 'aplazos' ? `Llegaste a ${info.aplazos} aplazos: hay que recursarla (Ord. 1549 8.2.6)` : 'Quedaste libre: hay que recursarla',
    };
    return { ...vacio, puede: false, razones: [motivo[info.estado]], advertencias };
  }

  let paquetes: ProgresoPaquete[] | undefined = paquetesCache;
  const faltan = faltasRendir(ctx, id, () => (paquetes ??= progresoPaquetes(ctx)));
  const soloTeorico = info.promocionPractica;
  if (soloTeorico) advertencias.push('Tenés la práctica promocionada: el final es solo teórico');

  const razones = [`Regular (${info.aplazos} de 4 aplazos usados)`];
  const ciclo = info.cursadaVigente?.ciclo;
  const excepcion = ciclo !== undefined ? finExcepcionCorrelativas(ctx, ciclo) : undefined;
  const base = {
    soloTeorico,
    advertencias,
    ...(excepcion ? { sinCorrelativasHasta: excepcion.hasta, sinCorrelativasHastaEstimado: excepcion.estimado } : {}),
  };

  if (faltan.length === 0) {
    return { ...base, puede: true, razones: [...razones, 'Cumplís las correlativas para rendir'], faltan };
  }
  if (excepcion && ctx.fecha <= excepcion.hasta) {
    return {
      ...base,
      puede: true,
      razones: [...razones, `Te faltan: ${textoFaltas(faltan)}`],
      faltan,
      excepcion: `No se exigen correlativas para rendir hasta el ${formatear(excepcion.hasta)}${excepcion.estimado ? ' (fecha estimada)' : ''}: es el ciclo lectivo siguiente al cursado (Ord. 1549 7.2.2)`,
    };
  }
  const vencida = excepcion ? ` (la excepción del ciclo siguiente al cursado venció el ${formatear(excepcion.hasta)})` : '';
  return { ...base, puede: false, razones: [...razones, `Te faltan: ${textoFaltas(faltan)}${vencida}`], faltan };
}

// ---------- Requisitos no-materia ----------

export function puedeIniciarRequisito(ctx: Contexto, id: Id): Disponibilidad {
  const r = ctx.requisitos.get(id);
  if (!r) return { puede: false, razones: [`'${id}' no existe en el plan`], faltan: [], advertencias: [] };
  const advertencias = advertenciasDeDatos(ctx, id);
  if (requisitoCumplido(ctx, id)) return { puede: false, razones: ['Ya está cumplido'], faltan: [], advertencias };
  const c = r.correlativas.cursar;
  const faltan = [
    ...c.regularizadas.map(x => faltaMateria(ctx, x, 'regular')),
    ...c.aprobadas.map(x => faltaMateria(ctx, x, 'aprobada')),
  ].filter((f): f is Falta => f !== undefined);
  return faltan.length === 0
    ? { puede: true, razones: ['Cumplís los requisitos para iniciarlo'], faltan, advertencias }
    : { puede: false, razones: [`Te faltan: ${textoFaltas(faltan)}`], faltan, advertencias };
}
