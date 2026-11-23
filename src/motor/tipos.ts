// Tipos de los datos de referencia (datos/esquemas/*.schema.json) y del usuario (datos/README.md §4).

export type Id = string;
/** Fecha local en formato AAAA-MM-DD. */
export type Fecha = string;
export type Regimen = 'anual' | '1C' | '2C' | null;
export type Cuatrimestre = '1C' | '2C';

// ---------- Plan ----------

export interface Correlativas {
  cursar: { regularizadas: Id[]; aprobadas: Id[] };
  rendir: { aprobadas: Id[] | 'todas' };
}

interface ItemBase {
  id: Id;
  nombre: string;
  notas?: string;
  verificar?: string[];
}

export interface MateriaPlan extends ItemBase {
  numero: number | null;
  nivel: number;
  regimen: Regimen;
  regimenOrigen?: 'plan' | 'horario' | 'inferido' | 'usuario';
  horas?: number | null;
  correlativas: Correlativas;
  examenLibre?: boolean;
}

export interface PaqueteElectivas extends ItemBase {
  nivel: number;
  cuatrimestre?: Cuatrimestre | null;
  horasExigidas: number | null;
}

export interface Electiva extends ItemBase {
  regimen: Regimen;
  regimenOrigen?: 'plan' | 'horario' | 'inferido' | 'usuario';
  horas: number | null;
  paquetesSugeridos: Id[];
  correlativas: Correlativas;
  ofrecida?: string[];
}

export interface Requisito extends ItemBase {
  numero?: number | null;
  tipo: 'pps' | 'habilitacion' | 'pasantia' | 'seminario' | 'otro';
  nivel: number;
  horas?: number | null;
  correlativas: Correlativas;
}

export interface Titulo extends ItemBase {
  tipo: 'intermedio' | 'final';
  hastaNivel: number | null;
  requisitosExtra?: Id[];
}

export interface Plan {
  schemaVersion: 1;
  tipo: 'plan';
  id: Id;
  institucion: { universidad: string; facultad: string };
  carrera: { id: Id; nombre: string; titulo: string; tipo?: string };
  anioPlan: number;
  versionDatos: string;
  niveles: number;
  cargaHorariaUltimoNivel?: number | null;
  materias: MateriaPlan[];
  paquetesElectivas: PaqueteElectivas[];
  electivas: Electiva[];
  requisitos: Requisito[];
  titulos: Titulo[];
}

// ---------- Calendario ----------

export interface CicloLectivo {
  id: number;
  inicio: Fecha | null;
  fin: Fecha;
}

export interface CuatrimestreCalendario {
  id: Id;
  ciclo: number;
  cuatrimestre: Cuatrimestre;
  inicio: Fecha;
  fin: Fecha;
  inscripcion?: { desde: Fecha; hasta: Fecha };
}

export interface PeriodoExamen {
  id: Id;
  tipo: 'turno' | 'mesas-moviles' | 'especial';
  desde: Fecha;
  hasta: Fecha;
  inscripcionDesde: Fecha | null;
  verificar?: string[];
}

export interface Calendario {
  schemaVersion: 1;
  tipo: 'calendario';
  id: Id;
  facultad: string;
  versionDatos: string;
  reglas?: {
    cierreInscripcionFinalHorasHabiles?: number;
    inscripcionCursadoDiasAntes?: number;
    inscripcionCursadoDiasDespues?: number;
  };
  ciclosLectivos: CicloLectivo[];
  cuatrimestres: CuatrimestreCalendario[];
  periodosExamen: PeriodoExamen[];
  recesos?: { nombre: string; desde: Fecha; hasta: Fecha }[];
  feriados: { fecha: Fecha; nombre: string }[];
  eventos?: { nombre: string; desde: Fecha; hasta: Fecha }[];
}

// ---------- Usuario ----------

export type ResultadoCursada = 'cursando' | 'aprobada-directa' | 'promocion-practica' | 'regular' | 'libre';

export type TipoEvaluacion = 'parcial' | 'tp' | 'recuperatorio' | 'otra';

/** Una evaluación de una cursada: parcial, trabajo práctico, recuperatorio. */
export interface Evaluacion {
  id: Id;
  nombre: string;
  tipo: TipoEvaluacion;
  /** null = todavía sin nota. */
  nota: number | null;
  fecha?: Fecha;
  /** Para un recuperatorio: la evaluación cuya nota reemplaza (lo elige el usuario). */
  reemplazaA?: Id;
}

/** Notas de referencia para ver cómo viene la cursada. Las fija el usuario según la planificación de su cátedra. */
export interface Umbrales {
  promocion: number;
  regular: number;
}

/**
 * Condición de notas para promocionar o regularizar, según la planificación de una cátedra.
 * Solo expresa lo que se puede calcular con notas; lo demás (asistencia, laboratorios) va en `ReglaCursada.tambien`.
 */
export interface CondicionNotas {
  /** Cada instancia con nota debe llegar a este valor. */
  cadaInstanciaMin?: number;
  /** El promedio de las instancias debe llegar a este valor. */
  promedioMin?: number;
  /** true si la planificación dice "mayor a" y no "mayor o igual a" (hoy solo se muestra: la comparación es ≥). */
  estricto?: boolean;
}

/**
 * Regla de una cátedra para un ciclo, transcripta de su planificación. Es un dato de referencia, no del usuario.
 * `tipo: 'texto'` es para reglas que no se pueden expresar sin interpretar (ponderaciones, puntos, redacción ambigua):
 * se muestran tal cual y no se calculan.
 */
export interface ReglaCursada {
  materiaId: Id;
  ciclo: number;
  tipo: 'notas' | 'texto';
  /** Cuántas notas componen la cursada; null = la planificación no lo dice. */
  instancias: number | null;
  promocion?: CondicionNotas;
  regular?: CondicionNotas;
  /** Lo que dice la planificación sobre recuperatorios, en una frase. */
  recuperatorios: string;
  /** Condiciones que las notas no pueden decidir (asistencia, laboratorios, actividades): dependen del usuario. */
  tambien: string[];
  /** La regla explicada en una frase, para mostrar. */
  resumen: string;
  fuente: { archivo: string; seccion: string; cita: string };
  /** Dudas de la transcripción. Con alguna, la regla se muestra como "a confirmar". */
  verificar: string[];
}

export interface Cursada {
  id: Id;
  /** Ciclo lectivo en que se cursó, ej. 2026. */
  ciclo: number;
  cuatrimestre: Cuatrimestre | 'anual';
  resultado: ResultadoCursada;
  /** Fecha de cierre del cursado (cuando se conoce el resultado). */
  fechaResultado?: Fecha;
  evaluaciones?: Evaluacion[];
  /** Si falta, se usa la regla general (sin confirmar). */
  umbrales?: Umbrales;
}

export interface IntentoFinal {
  fecha: Fecha;
  resultado: 'aprobado' | 'insuficiente' | 'ausente';
  nota?: number;
  soloTeorico?: boolean;
}

export type FormaAprobacion = 'directa' | 'final' | 'equivalencia';

export interface Aprobacion {
  forma: FormaAprobacion;
  nota: number | null;
  fecha: Fecha;
  registradaEnMesa?: boolean;
}

export type EstadoForzado = 'no-cursada' | 'cursando' | 'regular' | 'aprobada' | 'recursar';

export interface DatosMateriaUsuario {
  materiaId: Id;
  cursadas: Cursada[];
  finales: IntentoFinal[];
  aprobacion?: Aprobacion;
  correccion?: { estado: EstadoForzado; motivo: string; fecha: Fecha };
}

export interface EleccionElectiva {
  electivaId: Id;
  paqueteId: Id;
  horas?: number;
}

export interface EstadoRequisitoUsuario {
  requisitoId: Id;
  estado: 'pendiente' | 'en-curso' | 'cumplido';
  fecha?: Fecha;
  horasCumplidas?: number;
}

export interface CorreccionPlan {
  ref: Id;
  /** Ruta con puntos dentro del ítem, ej. 'regimen' o 'correlativas.cursar.aprobadas'. */
  campo: string;
  valor: unknown;
  motivo?: string;
}

/**
 * Datos de calendario cargados por el usuario. Se combinan con los de referencia:
 * un ítem con el mismo id (o la misma fecha, en feriados) reemplaza al de referencia; el resto se agrega.
 */
export interface CalendarioUsuario {
  ciclosLectivos?: CicloLectivo[];
  cuatrimestres?: CuatrimestreCalendario[];
  periodosExamen?: PeriodoExamen[];
  feriados?: { fecha: Fecha; nombre: string }[];
}

export interface DatosUsuario {
  perfil: { planId: Id; calendarioId: Id; anioIngreso: number };
  materias: DatosMateriaUsuario[];
  electivasElegidas: EleccionElectiva[];
  requisitos: EstadoRequisitoUsuario[];
  correccionesPlan?: CorreccionPlan[];
  /** Horas exigidas por paquete cargadas por el usuario cuando el plan no las trae. */
  horasPaquetes?: Record<Id, number>;
  /** Fechas que la facultad todavía no publicó en el calendario de referencia (ej. cursado del año siguiente). */
  calendario?: CalendarioUsuario;
}
