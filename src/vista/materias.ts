// Listado de materias: filtros, agrupación por nivel y separación de las electivas.

import type { Plan, Resumen, ResumenMateria } from '../motor/index.ts';
import { detalleCorto, etiquetaRegimenCorta, presentarMateria, type Presentacion } from './estados.ts';

export type Filtro = 'todas' | 'cursando' | 'habilitadas' | 'regulares' | 'rendir' | 'aprobadas' | 'bloqueadas';

export const FILTROS: { clave: Filtro; etiqueta: string }[] = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'cursando', etiqueta: 'Cursando' },
  { clave: 'habilitadas', etiqueta: 'Habilitadas' },
  { clave: 'regulares', etiqueta: 'Regulares' },
  { clave: 'rendir', etiqueta: 'Para rendir' },
  { clave: 'aprobadas', etiqueta: 'Aprobadas' },
  { clave: 'bloqueadas', etiqueta: 'Bloqueadas' },
];

export interface ItemLista {
  id: string;
  nombre: string;
  clase: 'materia' | 'electiva';
  nivel: number | null;
  regimen: string;
  presentacion: Presentacion;
  detalle: string;
  /** Dudas de la transcripción del plan para este ítem (se muestran como advertencia). */
  sinConfirmar: string[];
  resumen: ResumenMateria;
}

export interface Grupo {
  clave: string;
  titulo: string;
  nivel: number | null;
  items: ItemLista[];
}

/** Dudas de transcripción del plan para un ítem (materia, electiva o requisito). */
export function datosSinConfirmar(plan: Plan, id: string): string[] {
  const it = plan.materias.find(m => m.id === id) ?? plan.electivas.find(e => e.id === id) ?? plan.requisitos.find(r => r.id === id) ?? plan.paquetesElectivas.find(p => p.id === id);
  return it?.verificar ?? [];
}

export function aItem(m: ResumenMateria, plan: Plan): ItemLista {
  return {
    id: m.id,
    nombre: m.nombre,
    clase: m.clase,
    nivel: m.nivel,
    regimen: etiquetaRegimenCorta(m.regimen),
    presentacion: presentarMateria(m),
    detalle: detalleCorto(m),
    sinConfirmar: datosSinConfirmar(plan, m.id),
    resumen: m,
  };
}

/**
 * ¿Entra en el filtro? Las electivas con datos sin confirmar (por ejemplo, correlativas desconocidas) nunca
 * cuentan como "habilitadas": se muestran aparte y con advertencia, para no prometer algo que no sabemos.
 */
export function cumpleFiltro(item: ItemLista, filtro: Filtro): boolean {
  const e = item.resumen.estado.estado;
  switch (filtro) {
    case 'todas': return true;
    case 'cursando': return e === 'cursando';
    case 'regulares': return e === 'regular';
    case 'aprobadas': return e === 'aprobada';
    case 'rendir': return item.resumen.rendir.puede;
    case 'bloqueadas': return e === 'no-cursada' && !item.resumen.cursar.puede;
    case 'habilitadas':
      return (e === 'no-cursada' || e === 'recursar') && item.resumen.cursar.puede && !(item.clase === 'electiva' && item.sinConfirmar.length > 0);
  }
}

export function contarPorFiltro(items: ItemLista[]): Record<Filtro, number> {
  const r = {} as Record<Filtro, number>;
  for (const { clave } of FILTROS) r[clave] = items.filter(i => cumpleFiltro(i, clave)).length;
  return r;
}

export function listarItems(resumen: Resumen, plan: Plan): ItemLista[] {
  return resumen.materias.map(m => aItem(m, plan));
}

/** Obligatorias agrupadas por nivel, y las electivas en un grupo aparte al final. */
export function agrupar(items: ItemLista[], filtro: Filtro, busqueda = ''): Grupo[] {
  const q = normalizar(busqueda);
  const pasan = items.filter(i => cumpleFiltro(i, filtro) && (!q || normalizar(i.nombre).includes(q)));
  const grupos: Grupo[] = [];
  const niveles = [...new Set(pasan.filter(i => i.clase === 'materia').map(i => i.nivel!))].sort((a, b) => a - b);
  for (const n of niveles) {
    grupos.push({ clave: `nivel-${n}`, titulo: `${n}.º año`, nivel: n, items: pasan.filter(i => i.clase === 'materia' && i.nivel === n) });
  }
  const electivas = pasan.filter(i => i.clase === 'electiva');
  if (electivas.length) grupos.push({ clave: 'electivas', titulo: 'Electivas', nivel: null, items: electivas });
  return grupos;
}

/** El año que conviene abrir: el que tiene más materias en curso; si no hay ninguna, el primero con algo pendiente. */
export function nivelActual(items: ItemLista[]): number | null {
  const obligatorias = items.filter(i => i.clase === 'materia');
  const cursando = new Map<number, number>();
  for (const i of obligatorias) if (i.resumen.estado.estado === 'cursando') cursando.set(i.nivel!, (cursando.get(i.nivel!) ?? 0) + 1);
  const conMas = [...cursando].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (conMas) return conMas[0];
  const pendientes = obligatorias.filter(i => i.resumen.estado.estado !== 'aprobada').map(i => i.nivel!);
  return pendientes.length ? Math.min(...pendientes) : null;
}

/** Las materias a las que se les puede cargar notas hoy. Una aprobada conserva su cursada, pero ya no cuenta. */
export function enCurso(items: ItemLista[]) {
  return items.flatMap(i => (i.resumen.estado.estado === 'cursando' && i.resumen.estado.cursadaVigente ? [{ item: i, cursada: i.resumen.estado.cursadaVigente }] : []));
}

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
