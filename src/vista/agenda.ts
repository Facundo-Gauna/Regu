// Agenda del calendario: eventos del calendario académico (con lo que cargó el usuario) ordenados por mes.

import type { ConsultaCalendario, Fecha } from '../motor/index.ts';

export type TipoAgenda = 'cursado' | 'receso' | 'turno' | 'mesas-moviles' | 'inscripcion-final' | 'inscripcion-cursado' | 'evento';

export interface ItemAgenda {
  clave: string;
  tipo: TipoAgenda;
  titulo: string;
  detalle?: string;
  desde: Fecha;
  hasta: Fecha;
  /** true si la fecha es una estimación (por ejemplo, la inscripción a cursado). */
  estimado?: boolean;
  /** Id del ítem de calendario que lo originó, para poder editarlo. */
  origenId?: string;
}

export interface MesAgenda {
  clave: string;
  titulo: string;
  items: ItemAgenda[];
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombreMes(clave: string): string {
  const [a, m] = clave.split('-');
  return `${MESES[Number(m) - 1]} ${a}`;
}

/** Todos los eventos que se superponen con [desde, hasta], ordenados por fecha. */
export function construirAgenda(cal: ConsultaCalendario, desde: Fecha, hasta: Fecha): ItemAgenda[] {
  const c = cal.cal;
  const items: ItemAgenda[] = [];

  for (const q of c.cuatrimestres) {
    items.push({ clave: `cursado-${q.id}`, tipo: 'cursado', titulo: `Cursado ${q.cuatrimestre === '1C' ? '1.er' : '2.º'} cuatrimestre ${q.ciclo}`, desde: q.inicio, hasta: q.fin, origenId: q.id });
    const v = cal.ventanaInscripcionCursado(q.ciclo, q.cuatrimestre);
    if (v) {
      items.push({
        clave: `insc-cursado-${q.id}`,
        tipo: 'inscripcion-cursado',
        titulo: `Inscripción a cursado ${q.cuatrimestre} ${q.ciclo}`,
        detalle: v.estimada ? 'Fechas estimadas: se hace en autogestión y suele abrir 1–2 semanas antes del inicio' : undefined,
        desde: v.desde,
        hasta: v.hasta,
        estimado: v.estimada,
        origenId: q.id,
      });
    }
  }
  for (const r of c.recesos ?? []) items.push({ clave: `receso-${r.desde}`, tipo: 'receso', titulo: r.nombre, desde: r.desde, hasta: r.hasta });
  for (const p of c.periodosExamen) {
    const etiqueta = p.tipo === 'mesas-moviles' ? 'Mesas móviles' : p.tipo === 'especial' ? 'Mesa especial' : 'Turno de finales';
    items.push({
      clave: `examen-${p.id}`,
      tipo: p.tipo === 'mesas-moviles' ? 'mesas-moviles' : 'turno',
      titulo: etiqueta,
      detalle: p.tipo === 'mesas-moviles' ? 'Mesas de final durante el cursado' : undefined,
      desde: p.desde,
      hasta: p.hasta,
      origenId: p.id,
    });
    if (p.inscripcionDesde) {
      items.push({
        clave: `insc-final-${p.id}`,
        tipo: 'inscripcion-final',
        titulo: p.tipo === 'mesas-moviles' ? 'Inscripción a mesas móviles' : 'Inscripción a finales',
        detalle: `Cierra 48 h hábiles antes de cada examen`,
        desde: p.inscripcionDesde,
        hasta: cal.cierreInscripcionFinal(p.hasta),
        origenId: p.id,
      });
    }
  }
  for (const e of c.eventos ?? []) items.push({ clave: `evento-${e.nombre}-${e.desde}`, tipo: 'evento', titulo: e.nombre, desde: e.desde, hasta: e.hasta });

  return items.filter(i => i.hasta >= desde && i.desde <= hasta).sort((a, b) => a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta));
}

/**
 * Agrupa por el mes en que empieza cada evento. Si se pasa `desdeVentana`, lo que ya había empezado antes
 * (por ejemplo, el cursado en marcha) se ubica en el primer mes visible, con sus fechas reales a la vista.
 */
export function agruparPorMes(items: ItemAgenda[], desdeVentana?: Fecha): MesAgenda[] {
  const meses = new Map<string, ItemAgenda[]>();
  for (const i of items) {
    const referencia = desdeVentana && i.desde < desdeVentana ? desdeVentana : i.desde;
    const clave = referencia.slice(0, 7);
    meses.set(clave, [...(meses.get(clave) ?? []), i]);
  }
  return [...meses.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([clave, items]) => ({ clave, titulo: nombreMes(clave), items }));
}
