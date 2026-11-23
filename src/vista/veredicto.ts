// El veredicto de una materia en una línea: ¿puedo cursarla? ¿puedo rendirla?
// El detalle de las reglas (con la Ordenanza) queda en "Cómo se calculó"; acá va lo que hace falta para decidir.

import type { ResumenMateria } from '../motor/index.ts';
import { fechaCorta } from './formato.ts';

export interface Veredicto {
  /** true = se puede; false = todavía no; null = no aplica (ya está hecho). */
  puede: boolean | null;
  icono: 'check' | 'info' | 'candado';
  titulo: string;
  detalle?: string;
}

export function veredictoCursar(r: ResumenMateria): Veredicto {
  const e = r.estado;
  switch (e.estado) {
    case 'aprobada':
      return { puede: null, icono: 'check', titulo: 'Ya la aprobaste' };
    case 'regular':
      return { puede: null, icono: 'info', titulo: 'Ya la cursaste', detalle: 'Para volver a cursarla hace falta que lo autorice el director de carrera.' };
    case 'cursando':
      return { puede: null, icono: 'info', titulo: 'La estás cursando' };
    case 'recursar':
      return r.cursar.puede
        ? { puede: true, icono: 'check', titulo: 'Sí, podés recursarla', detalle: 'Tenés que volver a cursarla.' }
        : { puede: false, icono: 'candado', titulo: 'Tenés que recursarla, pero todavía no', detalle: 'Te faltan correlativas para volver a cursarla.' };
    case 'no-cursada':
      if (!r.cursar.puede) return { puede: false, icono: 'candado', titulo: 'Todavía no', detalle: 'Te faltan correlativas para cursarla.' };
      if (r.cursar.excepcion) {
        return { puede: true, icono: 'check', titulo: 'Sí, podés cursarla', detalle: 'Entrás por la excepción de las últimas materias: para rendirla sí te van a pedir las correlativas.' };
      }
      return { puede: true, icono: 'check', titulo: 'Sí, podés cursarla', detalle: r.cursar.faltan.length === 0 && r.cursar.razones.some(t => t.startsWith('No tiene')) ? 'No tiene correlativas.' : 'Tenés todas las correlativas.' };
  }
}

export function veredictoRendir(r: ResumenMateria): Veredicto {
  const e = r.estado;
  const d = r.rendir;
  switch (e.estado) {
    case 'aprobada':
      return {
        puede: null,
        icono: 'check',
        titulo: 'Ya está aprobada',
        ...(e.pendienteRegistrarMesa ? { detalle: 'Inscribite a una mesa de examen para que la nota quede en el acta.' } : {}),
      };
    case 'no-cursada':
      return { puede: false, icono: 'candado', titulo: 'Todavía no', detalle: 'Primero tenés que regularizarla.' };
    case 'cursando':
      return { puede: false, icono: 'candado', titulo: 'Todavía no', detalle: 'Vas a poder rendirla cuando la regularices.' };
    case 'recursar':
      return {
        puede: false,
        icono: 'candado',
        titulo: 'No',
        detalle: e.motivoRecursar === 'aplazos' ? 'Llegaste a 4 aplazos: tenés que recursarla.' : 'Quedaste libre: tenés que recursarla.',
      };
    case 'regular': {
      if (!d.puede) {
        const vencida = d.sinCorrelativasHasta ? ` El plazo en que no te las piden venció el ${fechaCorta(d.sinCorrelativasHasta)}.` : '';
        return { puede: false, icono: 'candado', titulo: 'Todavía no', detalle: `Te faltan correlativas aprobadas.${vencida}` };
      }
      const aplazos = `${e.aplazos} de 4 aplazos usados.`;
      const teorico = e.promocionPractica ? ' El final es solo teórico.' : '';
      if (d.excepcion && d.sinCorrelativasHasta) {
        return {
          puede: true,
          icono: 'check',
          titulo: 'Sí, podés rendirla',
          detalle: `Todavía no te piden las correlativas pendientes: vale hasta el ${fechaCorta(d.sinCorrelativasHasta)}${d.sinCorrelativasHastaEstimado ? ' (fecha estimada)' : ''}. ${aplazos}${teorico}`,
        };
      }
      return { puede: true, icono: 'check', titulo: 'Sí, podés rendirla', detalle: `${aplazos}${teorico}` };
    }
  }
}
