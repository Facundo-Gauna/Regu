// Modelo derivado: evalúa el motor con los datos del usuario y la fecha efectiva.
// Se recalcula solo cuando cambian los datos o la fecha.

import { useMemo } from 'preact/hooks';
import { aplicarCalendarioUsuario, ConsultaCalendario, evaluar, type Calendario, type DatosUsuario, type Fecha, type Plan, type Resumen } from '../motor/index.ts';
import { listarItems, type ItemLista } from '../vista/materias.ts';
import { fechaEfectiva, useStore } from './store.ts';
import { cargarReferencia } from './referencia.ts';

export const referencia = cargarReferencia();

export interface Modelo {
  plan: Plan;
  calendario: Calendario;
  datos: DatosUsuario;
  hoy: Fecha;
  /** true si la fecha de hoy está simulada desde Ajustes. */
  simulada: boolean;
  resumen: Resumen;
  cal: ConsultaCalendario;
  items: ItemLista[];
}

export function useModelo(): Modelo | null {
  const s = useStore();
  const hoy = fechaEfectiva(s);
  const datos = s.datos;
  return useMemo(() => {
    if (!datos || !referencia.ok) return null;
    const { plan, calendario } = referencia;
    const resumen = evaluar(plan, calendario, datos, hoy);
    const cal = new ConsultaCalendario(aplicarCalendarioUsuario(calendario, datos.calendario));
    return { plan, calendario, datos, hoy, simulada: s.prefs.fechaSimulada != null, resumen, cal, items: listarItems(resumen, plan) };
  }, [datos, hoy, s.prefs.fechaSimulada]);
}
