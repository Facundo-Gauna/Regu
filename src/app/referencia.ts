// Datos de referencia incluidos en la app (plan y calendario). Se validan al arrancar (PLAN-3):
// si hay errores, no se cargan y la app lo muestra en lugar de calcular con datos rotos.

import type { Calendario, Plan } from '../motor/tipos.ts';
import { validarCalendario, validarPlan } from '../datos/validar.ts';
import planJson from '../../datos/planes/utn-frvm-isi-2023.json';
import calendarioJson from '../../datos/calendarios/utn-frvm-2026-27.json';

export type Referencia = { ok: true; plan: Plan; calendario: Calendario; avisos: string[] } | { ok: false; errores: string[] };

export function cargarReferencia(): Referencia {
  const vp = validarPlan(planJson);
  const vc = validarCalendario(calendarioJson);
  const errores = [...vp.errores.map(e => `Plan: ${e}`), ...vc.errores.map(e => `Calendario: ${e}`)];
  if (errores.length) return { ok: false, errores };
  return {
    ok: true,
    plan: planJson as unknown as Plan,
    calendario: calendarioJson as unknown as Calendario,
    avisos: [...vp.avisos.map(a => `Plan: ${a}`), ...vc.avisos.map(a => `Calendario: ${a}`)],
  };
}
