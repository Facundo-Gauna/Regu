// Textos de ayuda por pantalla. El tipo obliga a decidir qué pasa con cada ruta nueva.

import type { Ruta } from './rutas.ts';

export interface Ayuda {
  titulo: string;
  pasos: { titulo: string; texto: string }[];
}

export const AYUDAS: Record<Ruta['nombre'], Ayuda | null> = {
  inicio: {
    titulo: 'Cómo usar Inicio',
    pasos: [
      { titulo: 'Lo próximo', texto: 'La primera tarjeta es lo más urgente de hoy: una inscripción, una mesa o una nota por cargar.' },
      { titulo: 'Cargar una nota rápido', texto: 'En «Cargar nota» elegí la materia. Con «Fijar en Inicio» queda a un toque.' },
      { titulo: 'Cuando termina el cuatrimestre', texto: 'Aparece «¿Cómo te fue en el cursado?»: marcá Regularicé, Promocioné o Quedé libre.' },
    ],
  },
  materias: {
    titulo: 'Cómo usar Materias',
    pasos: [
      { titulo: 'Filtrar', texto: 'Los botones de arriba muestran solo las que cursás, podés cursar o podés rendir. En el celular se deslizan.' },
      { titulo: 'Abrir un año', texto: 'Tocá el año para ver sus materias.' },
      { titulo: 'Entrar a una materia', texto: 'Tocá la materia para cargar notas, cursadas y finales.' },
    ],
  },
  materia: {
    titulo: 'Cómo cargar tus notas',
    pasos: [
      { titulo: 'Primero, marcá que la cursás', texto: 'Con «Empezar a cursarla» aparece la sección «Cómo viene la cursada».' },
      { titulo: 'Cargar una nota', texto: 'Tocá «Cargar nota». Si todavía no te la dieron, dejala vacía.' },
      { titulo: 'Si tu cátedra pondera', texto: 'Con «Organizar mis notas por partes» armás partes (por ejemplo, RA) y porcentajes. Después tocás la casilla y elegís el número.' },
      { titulo: 'Las notas que se piden', texto: 'Revisá cuánto se necesita para promocionar y regularizar, y cambialo con «Ajustar».' },
      { titulo: 'Cuando sepas el resultado', texto: 'En «Tu camino» tocá «Regularicé», «Promocioné» (aprobás sin final) o «Quedé libre».' },
    ],
  },
  plan: {
    titulo: 'Cómo usar el Plan',
    pasos: [
      { titulo: 'Ver correlativas', texto: 'Tocá una materia: las líneas llenas son lo que necesita y las punteadas lo que desbloquea.' },
      { titulo: 'Cargar lo que ya hiciste', texto: 'Con la materia elegida, tocá «Editar estado».' },
      { titulo: 'Moverte por los años', texto: 'Deslizá hacia los costados.' },
    ],
  },
  finales: {
    titulo: 'Cómo usar Finales',
    pasos: [
      { titulo: 'Turnos', texto: 'Arriba está el próximo. La inscripción se hace en autogestión, hasta 48 h hábiles antes del examen.' },
      { titulo: 'Podés rendir', texto: 'Son tus materias regulares con las correlativas listas.' },
      { titulo: 'Después del examen', texto: 'Tocá «Cargar resultado»: aprobado, aplazo o ausente.' },
    ],
  },
  cargar: {
    titulo: 'Cómo cargar rápido',
    pasos: [
      { titulo: 'Elegí la materia', texto: 'Solo aparecen las que estás cursando.' },
      { titulo: 'Tocá la casilla', texto: 'Elegí un número de 1 a 10, o escribí un decimal. Con «Nueva nota» agregás una.' },
      { titulo: 'Dejalo a mano', texto: 'Con «Fijar en Inicio» queda como acceso. En Android también puede aparecer «Cargar nota» al mantener apretado el ícono de la app.' },
    ],
  },
  progreso: {
    titulo: 'Cómo leer Progreso',
    pasos: [
      { titulo: 'Promedios', texto: 'Se calculan con las materias aprobadas que tienen nota, con y sin aplazos.' },
      { titulo: 'Títulos', texto: 'Con «Ver qué falta» ves las materias pendientes de cada uno.' },
      { titulo: 'Electivas', texto: 'En «Elegir electivas y cargar horas» sumás las tuyas y sus horas.' },
    ],
  },
  calendario: null,
  ajustes: null,
  mas: null,
};
