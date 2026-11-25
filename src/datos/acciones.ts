// Cambios sobre los datos del usuario. Son funciones puras: reciben los datos y devuelven una copia modificada.
// La interfaz las usa a través del store y así se pueden testear sin navegador.

import type {
  Aprobacion, CicloLectivo, Cursada, DatosMateriaUsuario, DatosUsuario, EleccionElectiva, EstadoRequisitoUsuario, IntentoFinal,
  CuatrimestreCalendario, PeriodoExamen, Id, Evaluacion, Umbrales, EstructuraCursada, CriterioAprobacion, CondicionNotas,
} from '../motor/tipos.ts';

const ORDEN_CUATRIMESTRE = { '1C': 0, anual: 1, '2C': 2 } as const;

function editarMateria(datos: DatosUsuario, materiaId: Id, cambio: (m: DatosMateriaUsuario) => void): DatosUsuario {
  const copia = structuredClone(datos);
  let m = copia.materias.find(x => x.materiaId === materiaId);
  if (!m) {
    m = { materiaId, cursadas: [], finales: [] };
    copia.materias.push(m);
  }
  cambio(m);
  // Una materia sin ningún dato no se guarda.
  if (!m.cursadas.length && !m.finales.length && !m.aprobacion && !m.correccion) {
    copia.materias = copia.materias.filter(x => x !== m);
  }
  return copia;
}

export function idCursada(ciclo: number, cuatrimestre: Cursada['cuatrimestre']): string {
  return `${ciclo}-${cuatrimestre}`;
}

/** Agrega una cursada; si ya hay una del mismo ciclo y cuatrimestre, la reemplaza. */
export function agregarCursada(datos: DatosUsuario, materiaId: Id, cursada: Omit<Cursada, 'id'>): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    const id = idCursada(cursada.ciclo, cursada.cuatrimestre);
    // Al volver a guardar la cursada (por ejemplo, al declarar el resultado) se conservan sus notas y umbrales
    const previa = m.cursadas.find(c => c.id === id);
    m.cursadas = m.cursadas.filter(c => c.id !== id);
    m.cursadas.push({
      ...cursada,
      id,
      ...(cursada.evaluaciones === undefined && previa?.evaluaciones ? { evaluaciones: previa.evaluaciones } : {}),
      ...(cursada.umbrales === undefined && previa?.umbrales ? { umbrales: previa.umbrales } : {}),
      ...(cursada.estructura === undefined && previa?.estructura ? { estructura: previa.estructura } : {}),
      ...(cursada.criterio === undefined && previa?.criterio ? { criterio: previa.criterio } : {}),
    });
    m.cursadas.sort((a, b) => a.ciclo - b.ciclo || ORDEN_CUATRIMESTRE[a.cuatrimestre] - ORDEN_CUATRIMESTRE[b.cuatrimestre]);
  });
}

const sinDatos = (c: Cursada) => c.resultado === 'cursando' && !c.evaluaciones?.length && !c.estructura && !c.criterio && !c.umbrales;
const enDestino = (cursadas: Cursada[], c: Cursada, cuatrimestre: Cursada['cuatrimestre']) => cursadas.find(x => x !== c && x.id === idCursada(c.ciclo, cuatrimestre));

/** true si hay otra cursada en el período correcto y las dos tienen datos: ahí tiene que elegir la persona. */
export function correccionBloqueada(cursadas: Cursada[], cursadaId: string, cuatrimestre: Cursada['cuatrimestre']): boolean {
  const c = cursadas.find(x => x.id === cursadaId);
  const otra = c && enDestino(cursadas, c, cuatrimestre);
  return !!c && !!otra && !sinDatos(c) && !sinDatos(otra);
}

/** Mueve una cursada al período correcto sin perder nada. De dos repetidas, descarta la que esté vacía. */
export function corregirPeriodo(datos: DatosUsuario, materiaId: Id, cursadaId: string, cuatrimestre: Cursada['cuatrimestre']): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    const c = m.cursadas.find(x => x.id === cursadaId);
    if (!c) return;
    if (correccionBloqueada(m.cursadas, cursadaId, cuatrimestre)) return;
    const otra = enDestino(m.cursadas, c, cuatrimestre);
    if (otra && sinDatos(c)) {
      m.cursadas = m.cursadas.filter(x => x !== c);
      return;
    }
    if (otra) m.cursadas = m.cursadas.filter(x => x !== otra);
    c.id = idCursada(c.ciclo, cuatrimestre);
    c.cuatrimestre = cuatrimestre;
  });
}

export function quitarCursada(datos: DatosUsuario, materiaId: Id, cursadaId: string): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    m.cursadas = m.cursadas.filter(c => c.id !== cursadaId);
  });
}

export function agregarFinal(datos: DatosUsuario, materiaId: Id, intento: IntentoFinal): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    m.finales.push(intento);
    m.finales.sort((a, b) => a.fecha.localeCompare(b.fecha));
  });
}

export function quitarFinal(datos: DatosUsuario, materiaId: Id, indice: number): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    m.finales = m.finales.filter((_, i) => i !== indice);
  });
}

export function fijarAprobacion(datos: DatosUsuario, materiaId: Id, aprobacion: Aprobacion | null): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    if (aprobacion) m.aprobacion = aprobacion;
    else delete m.aprobacion;
  });
}

export function fijarCorreccion(datos: DatosUsuario, materiaId: Id, correccion: DatosMateriaUsuario['correccion'] | null): DatosUsuario {
  return editarMateria(datos, materiaId, m => {
    if (correccion) m.correccion = correccion;
    else delete m.correccion;
  });
}

export function borrarMateria(datos: DatosUsuario, materiaId: Id): DatosUsuario {
  return { ...structuredClone(datos), materias: datos.materias.filter(m => m.materiaId !== materiaId).map(m => structuredClone(m)) };
}

// ---------- Electivas, requisitos, perfil ----------

export function elegirElectiva(datos: DatosUsuario, eleccion: EleccionElectiva): DatosUsuario {
  const copia = structuredClone(datos);
  copia.electivasElegidas = [...copia.electivasElegidas.filter(e => e.electivaId !== eleccion.electivaId), eleccion];
  return copia;
}

export function quitarElectiva(datos: DatosUsuario, electivaId: Id): DatosUsuario {
  const copia = structuredClone(datos);
  copia.electivasElegidas = copia.electivasElegidas.filter(e => e.electivaId !== electivaId);
  return copia;
}

export function fijarHorasPaquete(datos: DatosUsuario, paqueteId: Id, horas: number | null): DatosUsuario {
  const copia = structuredClone(datos);
  const horasPaquetes = { ...(copia.horasPaquetes ?? {}) };
  if (horas === null) delete horasPaquetes[paqueteId];
  else horasPaquetes[paqueteId] = horas;
  if (Object.keys(horasPaquetes).length) copia.horasPaquetes = horasPaquetes;
  else delete copia.horasPaquetes;
  return copia;
}

export function fijarRequisito(datos: DatosUsuario, requisito: EstadoRequisitoUsuario): DatosUsuario {
  const copia = structuredClone(datos);
  copia.requisitos = [...copia.requisitos.filter(r => r.requisitoId !== requisito.requisitoId), requisito];
  return copia;
}

export function fijarAnioIngreso(datos: DatosUsuario, anioIngreso: number): DatosUsuario {
  const copia = structuredClone(datos);
  copia.perfil.anioIngreso = anioIngreso;
  return copia;
}

// ---------- Calendario del usuario ----------

function editarCalendario<K extends 'ciclosLectivos' | 'cuatrimestres' | 'periodosExamen'>(
  datos: DatosUsuario,
  clave: K,
  cambio: (lista: NonNullable<NonNullable<DatosUsuario['calendario']>[K]>) => NonNullable<NonNullable<DatosUsuario['calendario']>[K]>,
): DatosUsuario {
  const copia = structuredClone(datos);
  const cal = copia.calendario ?? {};
  const lista = cambio((cal[clave] ?? []) as NonNullable<NonNullable<DatosUsuario['calendario']>[K]>);
  if (lista.length) cal[clave] = lista;
  else delete cal[clave];
  if (Object.keys(cal).length) copia.calendario = cal;
  else delete copia.calendario;
  return copia;
}

export function guardarCuatrimestre(datos: DatosUsuario, q: CuatrimestreCalendario): DatosUsuario {
  return editarCalendario(datos, 'cuatrimestres', l => [...l.filter(x => x.id !== q.id), q]);
}
export function quitarCuatrimestre(datos: DatosUsuario, id: string): DatosUsuario {
  return editarCalendario(datos, 'cuatrimestres', l => l.filter(x => x.id !== id));
}
export function guardarPeriodoExamen(datos: DatosUsuario, p: PeriodoExamen): DatosUsuario {
  return editarCalendario(datos, 'periodosExamen', l => [...l.filter(x => x.id !== p.id), p]);
}
export function quitarPeriodoExamen(datos: DatosUsuario, id: string): DatosUsuario {
  return editarCalendario(datos, 'periodosExamen', l => l.filter(x => x.id !== id));
}
export function guardarCiclo(datos: DatosUsuario, c: CicloLectivo): DatosUsuario {
  return editarCalendario(datos, 'ciclosLectivos', l => [...l.filter(x => x.id !== c.id), c]);
}
export function quitarCiclo(datos: DatosUsuario, id: number): DatosUsuario {
  return editarCalendario(datos, 'ciclosLectivos', l => l.filter(x => x.id !== id));
}

export interface ResultadoDeclarado {
  resultado: 'aprobada-directa' | 'regular' | 'libre';
  /** Fecha del resultado: ver `fechaDeCierre` (hoy, con tope en el fin del cuatrimestre). */
  fecha: string;
  /** Nota de la promoción, si la sabe. */
  nota?: number | null;
  registradaEnMesa?: boolean;
}

/**
 * El usuario cuenta cómo le fue en la cursada que tenía en curso (promoción, regular o libre).
 * Cierra la última cursada "cursando" con la fecha dada; con promoción y nota, además registra la aprobación.
 * Si no hay una cursada en curso, devuelve los datos sin cambios.
 */
export function declararResultado(datos: DatosUsuario, materiaId: Id, r: ResultadoDeclarado): DatosUsuario {
  const actual = datos.materias.find(m => m.materiaId === materiaId)?.cursadas.findLast(c => c.resultado === 'cursando');
  if (!actual) return datos;
  let nuevo = agregarCursada(datos, materiaId, { ciclo: actual.ciclo, cuatrimestre: actual.cuatrimestre, resultado: r.resultado, fechaResultado: r.fecha });
  if (r.resultado === 'aprobada-directa' && r.nota != null) {
    nuevo = fijarAprobacion(nuevo, materiaId, { forma: 'directa', nota: r.nota, fecha: r.fecha, registradaEnMesa: r.registradaEnMesa ?? false });
  }
  return nuevo;
}

// ---------- Notas de la cursada ----------

function editarCursada(datos: DatosUsuario, materiaId: Id, cursadaId: string, cambio: (c: Cursada) => void): DatosUsuario {
  const copia = structuredClone(datos);
  const c = copia.materias.find(m => m.materiaId === materiaId)?.cursadas.find(x => x.id === cursadaId);
  if (!c) return datos;
  cambio(c);
  return copia;
}

/** Agrega una evaluación a la cursada; si ya hay una con el mismo id, la reemplaza (editar). */
export function guardarEvaluacion(datos: DatosUsuario, materiaId: Id, cursadaId: string, evaluacion: Evaluacion): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    const lista = [...(c.evaluaciones ?? [])];
    const i = lista.findIndex(e => e.id === evaluacion.id);
    if (i >= 0) lista[i] = evaluacion;
    else lista.push(evaluacion);
    c.evaluaciones = lista;
  });
}

export function quitarEvaluacion(datos: DatosUsuario, materiaId: Id, cursadaId: string, evaluacionId: Id): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    const lista = (c.evaluaciones ?? []).filter(e => e.id !== evaluacionId);
    // Un recuperatorio que reemplazaba a la evaluación borrada queda como una evaluación común
    for (const e of lista) if (e.reemplazaA === evaluacionId) delete e.reemplazaA;
    if (lista.length) c.evaluaciones = lista;
    else delete c.evaluaciones;
  });
}

/** Guarda de una vez la estructura y sus evaluaciones. Con null se quita la estructura; las notas quedan. */
export function guardarEstructura(datos: DatosUsuario, materiaId: Id, cursadaId: string, estructura: EstructuraCursada | null, evaluaciones: Evaluacion[]): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    if (estructura) c.estructura = estructura;
    else delete c.estructura;
    const lista = evaluaciones.map(e => {
      const copia = { ...e };
      if (!estructura) {
        delete copia.parte;
        delete copia.peso;
      }
      return copia;
    });
    if (lista.length) c.evaluaciones = lista;
    else delete c.evaluaciones;
  });
}

/** Guarda cómo se aprueba la cursada; las notas de color salen de ahí para que no se contradigan. */
export function fijarCriterio(datos: DatosUsuario, materiaId: Id, cursadaId: string, criterio: CriterioAprobacion | null): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    if (!criterio) {
      delete c.criterio;
      delete c.umbrales;
      return;
    }
    c.criterio = criterio;
    const de = (x: CondicionNotas, otra: number) => x.promedioMin ?? x.cadaInstanciaMin ?? otra;
    c.umbrales = { promocion: de(criterio.promocion, 8), regular: de(criterio.regular, 6) };
  });
}

export function fijarSinMinimo(datos: DatosUsuario, materiaId: Id, cursadaId: string, sinMinimo: boolean): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    if (!c.estructura) return;
    if (sinMinimo) c.estructura.sinMinimo = true;
    else delete c.estructura.sinMinimo;
  });
}

export function fijarMinimoParte(datos: DatosUsuario, materiaId: Id, cursadaId: string, minimo: number | null): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    if (!c.estructura) return;
    if (minimo === null) delete c.estructura.minimoParte;
    else c.estructura.minimoParte = minimo;
  });
}

export function fijarUmbrales(datos: DatosUsuario, materiaId: Id, cursadaId: string, umbrales: Umbrales | null): DatosUsuario {
  return editarCursada(datos, materiaId, cursadaId, c => {
    if (umbrales) c.umbrales = umbrales;
    else delete c.umbrales;
  });
}
