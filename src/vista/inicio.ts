// Modelo de la pantalla de Inicio: qué le conviene hacer al usuario ahora.

import type { ConsultaCalendario, Cuatrimestre, DatosUsuario, EstudianteRegular, Fecha, PeriodoExamen, Plan, Resumen } from '../motor/index.ts';
import { sumarAnios, sumarDias } from '../motor/fechas.ts';
import { cursadasPorCerrar, type CursadaPorCerrar } from './cierres.ts';
import { aItem, cumpleFiltro, listarItems, type ItemLista } from './materias.ts';

export interface ProximoCuatrimestre {
  ciclo: number;
  cuatrimestre: Cuatrimestre;
  /** null si no se puede estimar. */
  inicio: Fecha | null;
  /** true si el calendario no trae este cuatrimestre y las fechas se estimaron. */
  estimado: boolean;
  ventana: { desde: Fecha; hasta: Fecha; estimada: boolean } | null;
}

/** Primer cuatrimestre que todavía no empezó. Si el calendario no llega tan lejos, se estima sumando un año al mismo cuatrimestre del año anterior. */
export function proximoCuatrimestre(cal: ConsultaCalendario, hoy: Fecha): ProximoCuatrimestre | null {
  const lista = [...cal.cal.cuatrimestres].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const futuro = lista.find(q => q.inicio > hoy);
  if (futuro) {
    const v = cal.ventanaInscripcionCursado(futuro.ciclo, futuro.cuatrimestre);
    return { ciclo: futuro.ciclo, cuatrimestre: futuro.cuatrimestre, inicio: futuro.inicio, estimado: false, ventana: v ? { desde: v.desde, hasta: v.hasta, estimada: v.estimada } : null };
  }
  const ultimo = lista.at(-1);
  if (!ultimo) return null;
  const siguiente: { ciclo: number; cuatrimestre: Cuatrimestre } = ultimo.cuatrimestre === '2C' ? { ciclo: ultimo.ciclo + 1, cuatrimestre: '1C' } : { ciclo: ultimo.ciclo, cuatrimestre: '2C' };
  // Referencia: el mismo cuatrimestre del ciclo anterior, corrido un año.
  const ref = lista.find(q => q.ciclo === siguiente.ciclo - 1 && q.cuatrimestre === siguiente.cuatrimestre);
  const inicio = ref ? sumarAnios(ref.inicio, 1) : null;
  const antes = cal.cal.reglas?.inscripcionCursadoDiasAntes ?? 14;
  const despues = cal.cal.reglas?.inscripcionCursadoDiasDespues ?? 14;
  return { ...siguiente, inicio, estimado: true, ventana: inicio ? { desde: sumarDias(inicio, -antes), hasta: sumarDias(inicio, despues), estimada: true } : null };
}

export interface AvisoRiesgo {
  id: string;
  nombre: string;
  texto: string;
  gravedad: 'atencion' | 'urgente';
}

export interface ModeloInicio {
  hoy: Fecha;
  ciclo: number;
  porCerrar: (CursadaPorCerrar & { nombre: string })[];
  inscripcionesFinal: { periodo: PeriodoExamen; cierre: Fecha }[];
  proximoPeriodo: PeriodoExamen | undefined;
  rendir: ItemLista[];
  pendientesMesa: ItemLista[];
  riesgos: AvisoRiesgo[];
  proximo: ProximoCuatrimestre | null;
  paraCursar: ItemLista[];
  regular: EstudianteRegular;
  cantidades: { aprobadas: number; total: number; cursando: number; regulares: number };
  /** El usuario todavía no cargó nada. */
  vacio: boolean;
}

export function modeloInicio(resumen: Resumen, datos: DatosUsuario, plan: Plan, cal: ConsultaCalendario, hoy: Fecha): ModeloInicio {
  const items = listarItems(resumen, plan);
  const obligatorias = items.filter(i => i.clase === 'materia');
  const nombre = (id: string) => items.find(i => i.id === id)?.nombre ?? id;
  const proximo = proximoCuatrimestre(cal, hoy);

  const riesgos: AvisoRiesgo[] = [];
  for (const i of items) {
    const e = i.resumen.estado;
    if (e.estado === 'regular' && e.aplazos >= 3) {
      riesgos.push({ id: i.id, nombre: i.nombre, texto: `${e.aplazos} de 4 aplazos: si te aplazan otra vez tenés que recursarla`, gravedad: 'urgente' });
    }
    const r = i.resumen.rendir;
    if (e.estado === 'regular' && r.excepcion && r.sinCorrelativasHasta) {
      const dias = diasEntre(hoy, r.sinCorrelativasHasta);
      if (dias <= 120) riesgos.push({ id: i.id, nombre: i.nombre, texto: `Sin correlativas para rendir solo hasta el ${formatear(r.sinCorrelativasHasta)} (${dias} días)`, gravedad: dias <= 45 ? 'urgente' : 'atencion' });
    }
  }

  return {
    hoy,
    ciclo: resumen.ciclo,
    porCerrar: cursadasPorCerrar(datos, cal, hoy).map(c => ({ ...c, nombre: nombre(c.materiaId) })),
    inscripcionesFinal: resumen.calendario.inscripcionesFinalAbiertas.map(({ cierre, ...periodo }) => ({ periodo, cierre })),
    proximoPeriodo: resumen.calendario.proximoPeriodoExamen,
    rendir: items.filter(i => cumpleFiltro(i, 'rendir')),
    pendientesMesa: items.filter(i => i.resumen.estado.pendienteRegistrarMesa),
    riesgos: riesgos.sort((a, b) => (a.gravedad === b.gravedad ? 0 : a.gravedad === 'urgente' ? -1 : 1)),
    proximo,
    paraCursar: proximo
      ? obligatorias.filter(i => cumpleFiltro(i, 'habilitadas') && (i.resumen.inicia === proximo.cuatrimestre))
      : [],
    regular: resumen.estudianteRegular,
    cantidades: {
      aprobadas: obligatorias.filter(i => i.resumen.estado.estado === 'aprobada').length,
      total: obligatorias.length,
      cursando: obligatorias.filter(i => i.resumen.estado.estado === 'cursando').length,
      regulares: obligatorias.filter(i => i.resumen.estado.estado === 'regular').length,
    },
    vacio: datos.materias.length === 0,
  };
}

function diasEntre(a: Fecha, b: Fecha): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function formatear(f: Fecha): string {
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a}`;
}

export { aItem };
