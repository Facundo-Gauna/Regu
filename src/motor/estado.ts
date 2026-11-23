// Estado de una materia a una fecha, derivado de los hechos cargados por el usuario.
// Reglas: Ord. 1549 7.1.2 (el cursado no vence), 8.2.6 (4 aplazos → recursar), 8.2.7 (excepción última materia).

import type { Cursada, DatosMateriaUsuario, Fecha, FormaAprobacion, Id } from './tipos.ts';
import { formatear } from './fechas.ts';

export type EstadoMateria = 'no-cursada' | 'cursando' | 'regular' | 'aprobada' | 'recursar';

export const MAX_APLAZOS = 4;

export interface InfoEstado {
  id: Id;
  estado: EstadoMateria;
  /** Cómo se aprobó (si está aprobada). */
  forma?: FormaAprobacion;
  nota?: number | null;
  fechaAprobacion?: Fecha;
  /** Aprobación directa que todavía hay que registrar inscribiéndose a una mesa. */
  pendienteRegistrarMesa: boolean;
  /** Regular con la parte práctica promocionada: el final es solo teórico. */
  promocionPractica: boolean;
  /** Aplazos desde la última cursada regular (los ausentes no cuentan). */
  aplazos: number;
  /** Cursada que define la regularidad actual. */
  cursadaVigente?: Cursada;
  /** Motivo por el que hay que recursar. */
  motivoRecursar?: 'libre' | 'aplazos';
  corregido: boolean;
  razones: string[];
}

const ORDEN_CUATRIMESTRE: Record<Cursada['cuatrimestre'], number> = { '1C': 0, anual: 1, '2C': 2 };

function compararCursadas(a: Cursada, b: Cursada): number {
  return a.ciclo - b.ciclo || ORDEN_CUATRIMESTRE[a.cuatrimestre] - ORDEN_CUATRIMESTRE[b.cuatrimestre];
}

/**
 * Calcula el estado de una materia a la fecha `fecha`, considerando solo los hechos ocurridos hasta ese día.
 * `cicloActual` es el ciclo lectivo de `fecha`: las cursadas de ciclos futuros se ignoran.
 */
export function calcularEstado(id: Id, datos: DatosMateriaUsuario | undefined, fecha: Fecha, cicloActual: number): InfoEstado {
  const base: InfoEstado = { id, estado: 'no-cursada', pendienteRegistrarMesa: false, promocionPractica: false, aplazos: 0, corregido: false, razones: [] };
  if (!datos) return { ...base, razones: ['Sin datos cargados'] };

  // 1. Corrección manual: tiene prioridad sobre todo.
  if (datos.correccion && datos.correccion.fecha <= fecha) {
    return {
      ...base,
      estado: datos.correccion.estado,
      corregido: true,
      razones: [`Estado corregido a mano: ${datos.correccion.motivo}`],
    };
  }

  const finales = datos.finales.filter(f => f.fecha <= fecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cursadas = datos.cursadas.filter(c => c.ciclo <= cicloActual).sort(compararCursadas);

  // 2. Aprobación explícita (directa, final o equivalencia).
  if (datos.aprobacion && datos.aprobacion.fecha <= fecha) {
    const a = datos.aprobacion;
    return {
      ...base,
      estado: 'aprobada',
      forma: a.forma,
      nota: a.nota,
      fechaAprobacion: a.fecha,
      pendienteRegistrarMesa: a.forma === 'directa' && a.registradaEnMesa === false,
      cursadaVigente: cursadas.at(-1),
      razones: [`Aprobada por ${textoForma(a.forma)}${a.nota != null ? ` con ${a.nota}` : ''}`],
    };
  }

  // 3. Final aprobado.
  const finalAprobado = finales.find(f => f.resultado === 'aprobado');
  if (finalAprobado) {
    return {
      ...base,
      estado: 'aprobada',
      forma: 'final',
      nota: finalAprobado.nota ?? null,
      fechaAprobacion: finalAprobado.fecha,
      cursadaVigente: cursadas.at(-1),
      razones: [`Final aprobado el ${formatear(finalAprobado.fecha)}${finalAprobado.nota != null ? ` con ${finalAprobado.nota}` : ''}`],
    };
  }

  const ultima = cursadas.at(-1);
  if (!ultima) return { ...base, razones: ['Todavía no la cursaste'] };

  // Una cursada cuyo resultado es posterior a la fecha de consulta todavía está en curso.
  const resultado = ultima.fechaResultado && ultima.fechaResultado > fecha ? 'cursando' : ultima.resultado;

  switch (resultado) {
    case 'cursando':
      return { ...base, estado: 'cursando', cursadaVigente: ultima, razones: [`Cursando (${ultima.cuatrimestre} ${ultima.ciclo})`] };

    case 'aprobada-directa': {
      const fechaAD = ultima.fechaResultado ?? fecha;
      return {
        ...base,
        estado: 'aprobada',
        forma: 'directa',
        nota: null,
        fechaAprobacion: fechaAD,
        pendienteRegistrarMesa: true,
        cursadaVigente: ultima,
        razones: ['Aprobación directa (falta cargar la nota y registrarla en mesa)'],
      };
    }

    case 'libre':
      return { ...base, estado: 'recursar', motivoRecursar: 'libre', cursadaVigente: ultima, razones: [`Quedaste libre en ${ultima.cuatrimestre} ${ultima.ciclo}: hay que recursar`] };

    case 'regular':
    case 'promocion-practica': {
      const desde = ultima.fechaResultado ?? '0000-01-01';
      const aplazos = finales.filter(f => f.resultado === 'insuficiente' && f.fecha > desde).length;
      const promocionPractica = resultado === 'promocion-practica';
      const razones = [`Regular desde ${ultima.cuatrimestre} ${ultima.ciclo}${promocionPractica ? ' (práctica promocionada: final solo teórico)' : ''}`];
      if (aplazos > 0) razones.push(`${aplazos} de ${MAX_APLAZOS} aplazos usados`);
      if (aplazos >= MAX_APLAZOS) {
        return {
          ...base,
          estado: 'recursar',
          motivoRecursar: 'aplazos',
          aplazos,
          promocionPractica,
          cursadaVigente: ultima,
          razones: [...razones, `Con ${MAX_APLAZOS} aplazos hay que recursar (Ord. 1549 8.2.6)`],
        };
      }
      return { ...base, estado: 'regular', aplazos, promocionPractica, cursadaVigente: ultima, razones };
    }
  }
}

function textoForma(f: FormaAprobacion): string {
  return f === 'directa' ? 'aprobación directa' : f === 'final' ? 'examen final' : 'equivalencia';
}

/** Excepción de última materia (Ord. 1549 8.2.7): con 4 aplazos se puede seguir rindiendo. */
export function aplicarExcepcionUltimaMateria(info: InfoEstado): InfoEstado {
  if (info.estado !== 'recursar' || info.motivoRecursar !== 'aplazos') return info;
  return {
    ...info,
    estado: 'regular',
    motivoRecursar: undefined,
    razones: [...info.razones.slice(0, -1), 'Es la última materia del plan: no aplica el límite de aplazos (Ord. 1549 8.2.7)'],
  };
}
