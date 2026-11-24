// Estructuras para empezar. Son un punto de partida editable: las de una cátedra salen de su planificación 2026
// y quedan «sin confirmar».

import type { EstructuraCursada, Evaluacion, Id, Umbrales } from '../motor/tipos.ts';

export type ClavePlantilla = 'lista' | 'tres-partes' | 'algebra' | 'analisis-1';

type Molde = { parte: string; items: [string, number?][] }[];

export const PLANTILLAS: { clave: ClavePlantilla; nombre: string; detalle: string; materiaId?: string; referencias?: Umbrales; molde: Molde }[] = [
  {
    clave: 'algebra', nombre: 'Según la planificación 2026', detalle: 'Tres RA con integradora y cuestionario. Sin confirmar.', materiaId: 'algebra-geometria-analitica', referencias: { promocion: 7, regular: 6 },
    molde: [
      { parte: 'RA 1', items: [['Integradora 1', 80], ['Cuestionario 1', 20]] },
      { parte: 'RA 2', items: [['Integradora 2', 70], ['Cuestionario 2', 30]] },
      { parte: 'RA 3', items: [['Integradora 3', 100]] },
    ],
  },
  {
    clave: 'analisis-1', nombre: 'Según la planificación 2026', detalle: 'La tabla de ponderación, que la planificación da como alternativa. Las notas para promocionar no son claras: ajustalas. Sin confirmar.', materiaId: 'analisis-matematico-1',
    molde: [{ parte: 'Cursada', items: [['Cuestionario 1', 5], ['Cuestionario 2', 5], ['Cuestionario 3', 5], ['Cuestionario 4', 15], ['Escrita 1', 16], ['Colaborativa', 24], ['Escrita 2', 30]] }],
  },
  { clave: 'tres-partes', nombre: 'Tres partes', detalle: 'Tres resultados de aprendizaje vacíos para completar.', molde: [{ parte: 'RA 1', items: [] }, { parte: 'RA 2', items: [] }, { parte: 'RA 3', items: [] }] },
  { clave: 'lista', nombre: 'Una sola lista', detalle: 'Tus notas actuales, con porcentajes si querés.', molde: [{ parte: 'Cursada', items: [] }] },
];

export function plantillasPara(materiaId: Id) {
  return PLANTILLAS.filter(p => !p.materiaId || p.materiaId === materiaId);
}

/** Arma la estructura. Las notas que ya había no se tocan; la lista única las adopta para que sigan contando. */
export function aplicarPlantilla(clave: ClavePlantilla, existentes: Evaluacion[], nuevoId: () => Id): { estructura: EstructuraCursada; evaluaciones: Evaluacion[] } {
  const { molde, referencias } = PLANTILLAS.find(p => p.clave === clave)!;
  const partes = molde.map(m => ({ id: nuevoId(), nombre: m.parte, peso: 1 }));
  const adoptadas = existentes.map(e => {
    const copia: Evaluacion = { ...e };
    delete copia.parte;
    delete copia.peso;
    if (clave === 'lista') copia.parte = partes[0]!.id;
    return copia;
  });
  const casillas: Evaluacion[] = molde.flatMap((m, i) => m.items.map(([nombre, peso]) => ({ id: nuevoId(), nombre, tipo: 'otra' as const, nota: null, parte: partes[i]!.id, ...(peso !== undefined ? { peso } : {}) })));
  return { estructura: { partes, ...(referencias ? { referencias } : {}) }, evaluaciones: [...adoptadas, ...casillas] };
}
