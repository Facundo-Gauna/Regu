// El camino de una materia: Cursada → Final → Aprobada. Muestra en qué paso está y cuál es la única acción que sigue.
// Cursar es hacer la cursada (clases, parciales, TPs); rendir es dar el examen final en una mesa. Con promoción no hay final.

import type { ResumenMateria } from '../motor/index.ts';
import { veredictoRendir } from './veredicto.ts';

export type EstadoPaso = 'hecho' | 'actual' | 'pendiente' | 'omitido';

export interface Paso {
  clave: 'cursada' | 'final' | 'aprobada';
  etiqueta: string;
  estado: EstadoPaso;
  /** Una línea corta debajo del paso. */
  nota?: string;
}

/** Qué botón corresponde ahora. */
export type AccionSiguiente = 'empezar' | 'resultado' | 'final' | 'recursar' | 'ninguna';

export interface Camino {
  pasos: [Paso, Paso, Paso];
  titulo: string;
  texto: string;
  accion: AccionSiguiente;
}

export const GLOSA = 'Cursar es hacer la cursada: clases, parciales y trabajos del cuatrimestre. Rendir es dar el examen final en una mesa.';

export function caminoMateria(r: ResumenMateria): Camino {
  const e = r.estado;
  const paso = (clave: Paso['clave'], etiqueta: string, estado: EstadoPaso, nota?: string): Paso => ({ clave, etiqueta, estado, ...(nota ? { nota } : {}) });

  switch (e.estado) {
    case 'aprobada': {
      const forma = e.forma;
      const pasos: Camino['pasos'] =
        forma === 'directa'
          ? [paso('cursada', 'Cursada', 'hecho', 'Promoción'), paso('final', 'Final', 'omitido', 'no hizo falta'), paso('aprobada', 'Aprobada', 'hecho')]
          : forma === 'equivalencia'
            ? [paso('cursada', 'Cursada', 'omitido', 'equivalencia'), paso('final', 'Final', 'omitido'), paso('aprobada', 'Aprobada', 'hecho')]
            : [paso('cursada', 'Cursada', 'hecho', 'Regular'), paso('final', 'Final', 'hecho'), paso('aprobada', 'Aprobada', 'hecho')];
      return {
        pasos,
        titulo: 'Terminada',
        texto: e.pendienteRegistrarMesa ? 'Inscribite a una mesa de examen para que la nota quede en el acta.' : 'No te queda nada por hacer en esta materia.',
        accion: 'ninguna',
      };
    }
    case 'regular':
      return {
        pasos: [paso('cursada', 'Cursada', 'hecho', e.promocionPractica ? 'Práctica promocionada' : 'Regular'), paso('final', 'Final', 'actual', 'te falta rendirlo'), paso('aprobada', 'Aprobada', 'pendiente')],
        titulo: 'Te falta el final',
        texto: r.rendir.puede ? 'Cuando rindas, cargá cómo te fue.' : veredictoRendir(r).detalle ?? 'Todavía no podés rendirla.',
        accion: 'final',
      };
    case 'cursando':
      return {
        pasos: [paso('cursada', 'Cursada', 'actual', 'en curso'), paso('final', 'Final', 'pendiente'), paso('aprobada', 'Aprobada', 'pendiente')],
        titulo: 'La estás cursando',
        texto: 'Cuando sepas cómo te fue (o cuando termine el cuatrimestre), contalo:',
        accion: 'resultado',
      };
    case 'recursar':
      return {
        pasos: [paso('cursada', 'Cursada', 'actual', 'hay que repetirla'), paso('final', 'Final', 'pendiente'), paso('aprobada', 'Aprobada', 'pendiente')],
        titulo: 'Tenés que volver a cursarla',
        texto: e.motivoRecursar === 'aplazos' ? 'Llegaste a 4 aplazos en el final.' : 'Quedaste libre en la última cursada.',
        accion: r.cursar.puede ? 'recursar' : 'ninguna',
      };
    case 'no-cursada':
      return r.cursar.puede
        ? {
            pasos: [paso('cursada', 'Cursada', 'actual', 'para empezar'), paso('final', 'Final', 'pendiente'), paso('aprobada', 'Aprobada', 'pendiente')],
            titulo: 'Todavía no la cursaste',
            texto: 'Cuando empieces a cursarla, marcala acá para llevar el seguimiento.',
            accion: 'empezar',
          }
        : {
            pasos: [paso('cursada', 'Cursada', 'pendiente', 'bloqueada'), paso('final', 'Final', 'pendiente'), paso('aprobada', 'Aprobada', 'pendiente')],
            titulo: 'Todavía no podés cursarla',
            texto: 'Te faltan correlativas. Mirá cuáles abajo.',
            accion: 'ninguna',
          };
  }
}
