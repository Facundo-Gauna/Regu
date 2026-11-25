// Cómo puede terminar una cursada y una materia, dicho con las palabras de la facultad (Ord. 1549 7.1 y 7.2).

import type { ResultadoCursada } from '../motor/tipos.ts';

/** Materias con promoción de la parte práctica, según las planificaciones relevadas (docs/investigacion.md §4). */
const CON_PRACTICA_PROMOCIONABLE = new Set(['fisica-2', 'seguridad-informatica', 'tecnologias-dlt-blockchain']);
export const admitePracticaPromocionada = (materiaId: string) => CON_PRACTICA_PROMOCIONABLE.has(materiaId);

export const RESULTADOS_CURSADA: { valor: ResultadoCursada; etiqueta: string; detalle: string }[] = [
  { valor: 'cursando', etiqueta: 'Cursando', detalle: 'Todavía no terminó.' },
  { valor: 'regular', etiqueta: 'Regular', detalle: 'Aprobaste la cursada. Te falta rendir el final.' },
  { valor: 'aprobada-directa', etiqueta: 'Promoción (aprobación directa)', detalle: 'Aprobaste la materia sin final.' },
  { valor: 'promocion-practica', etiqueta: 'Práctica promocionada', detalle: 'Quedás regular y el final es solo teórico.' },
  { valor: 'libre', etiqueta: 'Libre', detalle: 'No regularizaste: hay que recursar.' },
];

export const resultadosPara = (materiaId: string) => RESULTADOS_CURSADA.filter(r => r.valor !== 'promocion-practica' || admitePracticaPromocionada(materiaId));

export const GLOSARIO: { termino: string; texto: string }[] = [
  { termino: 'Regular', texto: 'Aprobaste la cursada. Para aprobar la materia te falta el final.' },
  { termino: 'Promoción o aprobación directa', texto: 'Son lo mismo: aprobás la materia sin final. En algunas hay que inscribirse a una mesa para que quede en el acta.' },
  { termino: 'Práctica promocionada', texto: 'Solo en algunas materias: quedás regular y el final es solo teórico.' },
  { termino: 'Libre', texto: 'No regularizaste: hay que volver a cursarla.' },
  { termino: 'Equivalencia', texto: 'Te reconocen una materia aprobada en otro plan o carrera. No cuenta para el promedio.' },
];
