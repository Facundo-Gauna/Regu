// Helpers de tests: carga los datos reales de referencia y construye datos de usuario.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Calendario, Cursada, DatosMateriaUsuario, DatosUsuario, Fecha, IntentoFinal, Plan } from '../src/motor/tipos.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

export const plan: Plan = JSON.parse(readFileSync(join(raiz, 'datos/planes/utn-frvm-isi-2023.json'), 'utf8'));
export const calendario: Calendario = JSON.parse(readFileSync(join(raiz, 'datos/calendarios/utn-frvm-2026-27.json'), 'utf8'));

/** Cierres de cursado del calendario 2026 (para cursadas de otros años se usan fechas equivalentes). */
export const FIN_1C = (ciclo: number): Fecha => `${ciclo}-07-03`;
export const FIN_2C = (ciclo: number): Fecha => `${ciclo}-11-27`;

export function cursada(ciclo: number, cuatrimestre: Cursada['cuatrimestre'], resultado: Cursada['resultado'], fechaResultado?: Fecha): Cursada {
  const fin = fechaResultado ?? (resultado === 'cursando' ? undefined : cuatrimestre === '1C' ? FIN_1C(ciclo) : FIN_2C(ciclo));
  return { id: `${ciclo}-${cuatrimestre}`, ciclo, cuatrimestre, resultado, ...(fin ? { fechaResultado: fin } : {}) };
}

/** Materia regularizada en un ciclo y cuatrimestre, con finales opcionales. */
export function regular(materiaId: string, ciclo: number, cuatrimestre: Cursada['cuatrimestre'], finales: IntentoFinal[] = []): DatosMateriaUsuario {
  return { materiaId, cursadas: [cursada(ciclo, cuatrimestre, 'regular')], finales };
}

/** Materia aprobada por final o directa en una fecha. */
export function aprobada(materiaId: string, fecha: Fecha, nota = 7, forma: 'directa' | 'final' | 'equivalencia' = 'final'): DatosMateriaUsuario {
  const ciclo = Number(fecha.slice(0, 4)) - (fecha.slice(5) <= '03-14' ? 1 : 0);
  return {
    materiaId,
    cursadas: forma === 'equivalencia' ? [] : [cursada(ciclo, '1C', forma === 'directa' ? 'aprobada-directa' : 'regular', forma === 'directa' ? fecha : undefined)],
    finales: [],
    aprobacion: { forma, nota, fecha },
  };
}

export function aplazo(fecha: Fecha, nota = 2): IntentoFinal {
  return { fecha, resultado: 'insuficiente', nota };
}

export function ausente(fecha: Fecha): IntentoFinal {
  return { fecha, resultado: 'ausente' };
}

export function usuario(materias: DatosMateriaUsuario[], extra: Partial<DatosUsuario> = {}): DatosUsuario {
  return {
    perfil: { planId: plan.id, calendarioId: calendario.id, anioIngreso: 2026 },
    materias,
    electivasElegidas: [],
    requisitos: [],
    ...extra,
  };
}

/** Todas las materias obligatorias de los niveles indicados, aprobadas en una fecha. */
export function nivelesAprobados(niveles: number[], fecha: Fecha = '2025-12-15'): DatosMateriaUsuario[] {
  return plan.materias.filter(m => niveles.includes(m.nivel)).map(m => aprobada(m.id, fecha));
}
