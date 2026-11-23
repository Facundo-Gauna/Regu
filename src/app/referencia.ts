// Datos de referencia incluidos en la app (plan y calendario). Se validan al arrancar (PLAN-3):
// si hay errores, no se cargan y la app lo muestra en lugar de calcular con datos rotos.

import type { Calendario, Plan, ReglaCursada } from '../motor/tipos.ts';
import { validarCalendario, validarPlan, validarReglas } from '../datos/validar.ts';
import planJson from '../../datos/planes/utn-frvm-isi-2023.json';
import calendarioJson from '../../datos/calendarios/utn-frvm-2026-27.json';
import reglasJson from '../../datos/reglas/utn-frvm-isi-2026.json';

export type Referencia = { ok: true; plan: Plan; calendario: Calendario; reglas: ReglaCursada[]; avisos: string[] } | { ok: false; errores: string[] };

export function cargarReferencia(): Referencia {
  const vp = validarPlan(planJson);
  const vc = validarCalendario(calendarioJson);
  const vr = validarReglas(reglasJson, planJson as unknown as Plan);
  const errores = [...vp.errores.map(e => `Plan: ${e}`), ...vc.errores.map(e => `Calendario: ${e}`), ...vr.errores.map(e => `Reglas: ${e}`)];
  if (errores.length) return { ok: false, errores };
  return {
    ok: true,
    plan: planJson as unknown as Plan,
    calendario: calendarioJson as unknown as Calendario,
    reglas: reglasJson.reglas as unknown as ReglaCursada[],
    avisos: [...vp.avisos.map(a => `Plan: ${a}`), ...vc.avisos.map(a => `Calendario: ${a}`)],
  };
}
