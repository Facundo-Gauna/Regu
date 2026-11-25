// Rutas de la app, con hash (#/materias): funcionan en cualquier hosting estático y sin configurar el servidor.

import { FILTROS, type Filtro } from './materias.ts';

export type Ruta =
  | { nombre: 'inicio' }
  | { nombre: 'materias'; filtro: Filtro }
  | { nombre: 'materia'; id: string }
  | { nombre: 'plan'; seleccion?: string }
  | { nombre: 'finales' }
  | { nombre: 'calendario' }
  | { nombre: 'progreso' }
  | { nombre: 'ajustes' }
  | { nombre: 'cargar'; materiaId?: string; parte?: string }
  | { nombre: 'contanos'; desde?: 'regla'; titulo?: string; materiaId?: string }
  | { nombre: 'mas' };

const FILTROS_VALIDOS = new Set<string>(FILTROS.map(f => f.clave));

/** "#/materias?f=habilitadas" → { nombre: 'materias', filtro: 'habilitadas' }. Cualquier cosa desconocida cae en Inicio. */
export function parseRuta(hash: string): Ruta {
  const sinHash = hash.replace(/^#/, '');
  const [ruta = '', consulta = ''] = sinHash.split('?');
  const partes = ruta.split('/').filter(Boolean);
  const params = new URLSearchParams(consulta);
  switch (partes[0]) {
    case 'materias': {
      const f = params.get('f') ?? '';
      return { nombre: 'materias', filtro: FILTROS_VALIDOS.has(f) ? (f as Filtro) : 'todas' };
    }
    case 'materia':
      return partes[1] ? { nombre: 'materia', id: decodeURIComponent(partes[1]) } : { nombre: 'materias', filtro: 'todas' };
    case 'plan': {
      const sel = params.get('sel');
      return sel ? { nombre: 'plan', seleccion: sel } : { nombre: 'plan' };
    }
    case 'finales': return { nombre: 'finales' };
    case 'cargar': {
      const m = params.get('m');
      const p = params.get('p');
      return { nombre: 'cargar', ...(m ? { materiaId: m } : {}), ...(m && p ? { parte: p } : {}) };
    }
    case 'calendario': return { nombre: 'calendario' };
    case 'progreso': return { nombre: 'progreso' };
    case 'ajustes': return { nombre: 'ajustes' };
    case 'contanos': {
      const t = params.get('t');
      const m = params.get('m');
      if (params.get('d') !== 'regla' || !t) return { nombre: 'contanos' };
      return { nombre: 'contanos', desde: 'regla', titulo: t, ...(m ? { materiaId: m } : {}) };
    }
    case 'mas': return { nombre: 'mas' };
    default: return { nombre: 'inicio' };
  }
}

export const enlaces = {
  inicio: () => '#/',
  materias: (filtro?: Filtro) => (filtro && filtro !== 'todas' ? `#/materias?f=${filtro}` : '#/materias'),
  materia: (id: string) => `#/materia/${encodeURIComponent(id)}`,
  plan: (seleccion?: string) => (seleccion ? `#/plan?sel=${encodeURIComponent(seleccion)}` : '#/plan'),
  finales: () => '#/finales',
  calendario: () => '#/calendario',
  progreso: () => '#/progreso',
  ajustes: () => '#/ajustes',
  mas: () => '#/mas',
  contanos: (ctx?: { desde: 'regla'; titulo: string; materiaId?: string | undefined }) =>
    ctx ? `#/contanos?d=regla&t=${encodeURIComponent(ctx.titulo)}${ctx.materiaId ? `&m=${encodeURIComponent(ctx.materiaId)}` : ''}` : '#/contanos',
  cargar: (materiaId?: string, parte?: string) =>
    materiaId ? `#/cargar?m=${encodeURIComponent(materiaId)}${parte ? `&p=${encodeURIComponent(parte)}` : ''}` : '#/cargar',
};

/** A qué pestaña de la navegación pertenece cada ruta. */
export function pestaña(r: Ruta): 'inicio' | 'materias' | 'plan' | 'finales' | 'mas' {
  switch (r.nombre) {
    case 'inicio': return 'inicio';
    case 'materias':
    case 'materia': return 'materias';
    case 'plan': return 'plan';
    case 'finales': return 'finales';
    case 'cargar': return 'inicio';
    default: return 'mas';
  }
}
