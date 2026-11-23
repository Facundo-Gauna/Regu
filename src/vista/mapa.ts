// Mapa del plan: materias por nivel y relaciones de correlatividad (qué necesita y qué desbloquea cada una).

import type { Id, Plan, Resumen } from '../motor/index.ts';
import { aItem, type ItemLista } from './materias.ts';

export interface ColumnaNivel {
  nivel: number;
  items: ItemLista[];
}

export function columnasPlan(resumen: Resumen, plan: Plan): ColumnaNivel[] {
  const porId = new Map(resumen.materias.map(m => [m.id, m]));
  const cols: ColumnaNivel[] = [];
  for (let n = 1; n <= plan.niveles; n++) {
    const items = plan.materias.filter(m => m.nivel === n).map(m => aItem(porId.get(m.id)!, plan));
    if (items.length) cols.push({ nivel: n, items });
  }
  return cols;
}

export interface Relaciones {
  /** Lo que hace falta para cursar. */
  requiere: { regularizadas: Id[]; aprobadas: Id[] };
  /** Lo que hace falta aprobado para rendir ('todas' = todo el plan). */
  requiereParaRendir: Id[] | 'todas';
  /** Materias para cuyo cursado esta es correlativa. */
  desbloqueaCursar: Id[];
  /** Materias para cuyo final esta es correlativa. */
  desbloqueaRendir: Id[];
}

/** Relaciones directas de una materia. Las correlativas inversas se calculan recorriendo el plan. */
export function relaciones(plan: Plan, id: Id): Relaciones {
  const todas = [...plan.materias, ...plan.electivas];
  const actual = todas.find(m => m.id === id);
  const requiere = actual?.correlativas.cursar ?? { regularizadas: [], aprobadas: [] };
  const desbloqueaCursar: Id[] = [];
  const desbloqueaRendir: Id[] = [];
  for (const m of todas) {
    if (m.id === id) continue;
    const c = m.correlativas;
    if (c.cursar.regularizadas.includes(id) || c.cursar.aprobadas.includes(id)) desbloqueaCursar.push(m.id);
    if (c.rendir.aprobadas !== 'todas' && c.rendir.aprobadas.includes(id)) desbloqueaRendir.push(m.id);
  }
  return {
    requiere: { regularizadas: [...requiere.regularizadas], aprobadas: [...requiere.aprobadas] },
    requiereParaRendir: actual ? (actual.correlativas.rendir.aprobadas === 'todas' ? 'todas' : [...actual.correlativas.rendir.aprobadas]) : [],
    desbloqueaCursar,
    desbloqueaRendir,
  };
}

/** Todas las materias relacionadas con `id` (para resaltarlas en el mapa), con su tipo de relación. */
export function relacionadas(plan: Plan, id: Id): Map<Id, 'requisito' | 'desbloquea'> {
  const r = relaciones(plan, id);
  const mapa = new Map<Id, 'requisito' | 'desbloquea'>();
  for (const x of [...r.requiere.regularizadas, ...r.requiere.aprobadas]) mapa.set(x, 'requisito');
  if (r.requiereParaRendir !== 'todas') for (const x of r.requiereParaRendir) if (!mapa.has(x)) mapa.set(x, 'requisito');
  for (const x of [...r.desbloqueaCursar, ...r.desbloqueaRendir]) if (!mapa.has(x)) mapa.set(x, 'desbloquea');
  return mapa;
}
