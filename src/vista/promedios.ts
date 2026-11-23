// Promedios de carrera con y sin aplazos (para becas, pasantías, trabajos).

import type { DatosUsuario, Resumen } from '../motor/index.ts';

export interface Promedios {
  /** Promedio de las materias aprobadas con nota. null si no hay ninguna. */
  sinAplazos: number | null;
  /** Igual, sumando también las notas de los finales aplazados. */
  conAplazos: number | null;
  aprobadasConNota: number;
  aplazos: number;
  /** Aprobadas sin nota (aprobación directa sin cargar la nota, equivalencias): no entran en el promedio. */
  aprobadasSinNota: number;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

export function calcularPromedios(resumen: Resumen, datos: DatosUsuario): Promedios {
  const notas: number[] = [];
  let sinNota = 0;
  for (const m of resumen.materias) {
    const e = m.estado;
    if (e.estado !== 'aprobada') continue;
    if (e.nota == null || e.forma === 'equivalencia') sinNota++;
    else notas.push(e.nota);
  }
  const aplazadas = datos.materias.flatMap(m => m.finales).filter(f => f.resultado === 'insuficiente' && f.nota != null).map(f => f.nota!);
  const suma = (l: number[]) => l.reduce((a, b) => a + b, 0);
  return {
    sinAplazos: notas.length ? redondear(suma(notas) / notas.length) : null,
    conAplazos: notas.length ? redondear((suma(notas) + suma(aplazadas)) / (notas.length + aplazadas.length)) : null,
    aprobadasConNota: notas.length,
    aplazos: aplazadas.length,
    aprobadasSinNota: sinNota,
  };
}
