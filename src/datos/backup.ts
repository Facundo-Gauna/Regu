// Formato único de los datos del usuario: sirve para el backup exportable y para lo que se guarda en el dispositivo.
// La fuente de verdad de la forma de los datos es `DatosUsuario` (src/motor/tipos.ts).
//
// Al leer se valida y se normaliza:
//  - los datos incorrectos (fechas, notas, enums) hacen fallar la importación con una lista de errores;
//  - las listas que faltan se completan con [] (el motor llama .filter/.map sobre ellas);
//  - los ids que no están en el plan NO se borran: se avisan (un plan puede haberse actualizado);
//  - una versión de esquema desconocida se rechaza.

import type {
  CalendarioUsuario, Cursada, DatosMateriaUsuario, DatosUsuario, EleccionElectiva, Evaluacion, EstadoRequisitoUsuario, IntentoFinal, Plan, Umbrales, EstructuraCursada,
} from '../motor/tipos.ts';
import { esFechaValida } from '../motor/fechas.ts';

export const APP = 'regu';
/** La versión más nueva que sabe leer esta app. Se escribe solo si los datos usan algo de ella. */
export const VERSION_ESQUEMA = 2;

/** 2 si hay estructura de cursada: una app anterior la descartaría sin avisar, así que mejor que rechace. */
function versionDe(datos: DatosUsuario): number {
  const usaEstructura = datos.materias.some(m => m.cursadas.some(c => c.estructura || c.evaluaciones?.some(e => e.parte !== undefined || e.peso !== undefined)));
  return usaEstructura ? 2 : 1;
}

export interface BackupUsuario {
  app: typeof APP;
  schemaVersion: number;
  /** Fecha y hora ISO (UTC) de la exportación. */
  exportado: string;
  datos: DatosUsuario;
}

export type ResultadoLectura = { ok: true; datos: DatosUsuario; avisos: string[] } | { ok: false; errores: string[] };

export function usuarioVacio(planId: string, calendarioId: string, anioIngreso: number): DatosUsuario {
  return { perfil: { planId, calendarioId, anioIngreso }, materias: [], electivasElegidas: [], requisitos: [] };
}

export function crearBackup(datos: DatosUsuario, ahora: Date = new Date()): BackupUsuario {
  return { app: APP, schemaVersion: versionDe(datos), exportado: ahora.toISOString(), datos: structuredClone(datos) };
}

export function serializarBackup(b: BackupUsuario): string {
  return JSON.stringify(b, null, 2);
}

export function leerBackupTexto(texto: string, plan?: Plan): ResultadoLectura {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, errores: ['El archivo no es un JSON válido'] };
  }
  return leerBackup(json, plan);
}

// ---------- Validación ----------

const CUATRIMESTRES = ['1C', '2C', 'anual'] as const;
const RESULTADOS_CURSADA = ['cursando', 'aprobada-directa', 'promocion-practica', 'regular', 'libre'] as const;
const RESULTADOS_FINAL = ['aprobado', 'insuficiente', 'ausente'] as const;
const FORMAS = ['directa', 'final', 'equivalencia'] as const;
const TIPOS_EVALUACION = ['parcial', 'tp', 'recuperatorio', 'otra'] as const;
const ESTADOS_FORZADOS = ['no-cursada', 'cursando', 'regular', 'aprobada', 'recursar'] as const;
const ESTADOS_REQUISITO = ['pendiente', 'en-curso', 'cumplido'] as const;

type Obj = Record<string, unknown>;
const esObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

class Lector {
  errores: string[] = [];
  avisos: string[] = [];

  texto(o: Obj, k: string, ruta: string, opcional = false): string | undefined {
    const v = o[k];
    if (v === undefined || v === null) {
      if (!opcional) this.errores.push(`${ruta}.${k}: falta`);
      return undefined;
    }
    if (typeof v !== 'string' || v === '') {
      this.errores.push(`${ruta}.${k}: debe ser un texto`);
      return undefined;
    }
    return v;
  }

  fecha(o: Obj, k: string, ruta: string, opcional = false): string | undefined {
    const v = this.texto(o, k, ruta, opcional);
    if (v !== undefined && !esFechaValida(v)) {
      this.errores.push(`${ruta}.${k}: fecha inválida (${v})`);
      return undefined;
    }
    return v;
  }

  entero(o: Obj, k: string, ruta: string, min: number, max: number, opcional = false): number | undefined {
    const v = o[k];
    if (v === undefined || v === null) {
      if (!opcional) this.errores.push(`${ruta}.${k}: falta`);
      return undefined;
    }
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      this.errores.push(`${ruta}.${k}: debe ser un entero entre ${min} y ${max}`);
      return undefined;
    }
    return v;
  }

  opcion<T extends string>(o: Obj, k: string, ruta: string, opciones: readonly T[]): T | undefined {
    const v = o[k];
    if (typeof v !== 'string' || !(opciones as readonly string[]).includes(v)) {
      this.errores.push(`${ruta}.${k}: debe ser uno de ${opciones.join(', ')}`);
      return undefined;
    }
    return v as T;
  }

  numero(o: Obj, k: string, ruta: string, min: number, max: number): number | undefined {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      this.errores.push(`${ruta}.${k}: debe ser un número entre ${min} y ${max}`);
      return undefined;
    }
    return v;
  }

  lista(o: Obj, k: string, ruta: string): unknown[] {
    const v = o[k];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      this.errores.push(`${ruta}.${k}: debe ser una lista`);
      return [];
    }
    return v;
  }

  objeto(x: unknown, ruta: string): Obj | undefined {
    if (!esObj(x)) {
      this.errores.push(`${ruta}: debe ser un objeto`);
      return undefined;
    }
    return x;
  }
}

function leerCursada(l: Lector, x: unknown, ruta: string): Cursada | undefined {
  const o = l.objeto(x, ruta);
  if (!o) return undefined;
  const ciclo = l.entero(o, 'ciclo', ruta, 1990, 2200);
  const cuatrimestre = l.opcion(o, 'cuatrimestre', ruta, CUATRIMESTRES);
  const resultado = l.opcion(o, 'resultado', ruta, RESULTADOS_CURSADA);
  const fechaResultado = l.fecha(o, 'fechaResultado', ruta, true);
  const evaluaciones = l.lista(o, 'evaluaciones', ruta).map((e, i) => leerEvaluacion(l, e, `${ruta}.evaluaciones[${i}]`)).filter((e): e is Evaluacion => !!e);
  let umbrales: Umbrales | undefined;
  if (o['umbrales'] != null) {
    const u = l.objeto(o['umbrales'], `${ruta}.umbrales`);
    if (u) {
      const promocion = l.numero(u, 'promocion', `${ruta}.umbrales`, 1, 10);
      const regular = l.numero(u, 'regular', `${ruta}.umbrales`, 1, 10);
      if (promocion !== undefined && regular !== undefined) umbrales = { promocion, regular };
    }
  }
  if (ciclo === undefined || !cuatrimestre || !resultado) return undefined;
  const estructura = leerEstructura(o['estructura']);
  return {
    id: typeof o['id'] === 'string' && o['id'] ? o['id'] : `${ciclo}-${cuatrimestre}`,
    ciclo,
    cuatrimestre,
    resultado,
    ...(fechaResultado ? { fechaResultado } : {}),
    ...(evaluaciones.length ? { evaluaciones } : {}),
    ...(umbrales ? { umbrales } : {}),
    ...(estructura ? { estructura } : {}),
  };
}

/** Tolerante a propósito: una estructura a medias no puede dejar al usuario sin sus datos. Lo estricto está en el editor. */
function leerEstructura(x: unknown): EstructuraCursada | undefined {
  if (!esObj(x) || !Array.isArray(x['partes'])) return undefined;
  const vistas = new Set<string>();
  const partes = x['partes'].flatMap((p: unknown) => {
    if (!esObj(p)) return [];
    const { id, nombre, peso } = p;
    if (typeof id !== 'string' || !id || vistas.has(id)) return [];
    vistas.add(id);
    return [{ id, nombre: typeof nombre === 'string' && nombre ? nombre : 'Parte', peso: typeof peso === 'number' && Number.isFinite(peso) && peso > 0 ? peso : 1 }];
  });
  if (!partes.length) return undefined;
  const min = x['minimoParte'];
  const ref = x['referencias'];
  const nota = (n: unknown): n is number => typeof n === 'number' && n >= 1 && n <= 10;
  return {
    partes,
    ...(nota(min) ? { minimoParte: min } : {}),
    ...(esObj(ref) && nota(ref['promocion']) && nota(ref['regular']) ? { referencias: { promocion: ref['promocion'], regular: ref['regular'] } } : {}),
  };
}

function leerEvaluacion(l: Lector, x: unknown, ruta: string): Evaluacion | undefined {
  const o = l.objeto(x, ruta);
  if (!o) return undefined;
  const id = l.texto(o, 'id', ruta);
  const nombre = l.texto(o, 'nombre', ruta);
  const tipo = l.opcion(o, 'tipo', ruta, TIPOS_EVALUACION);
  const nota = o['nota'] == null ? null : l.numero(o, 'nota', ruta, 1, 10);
  const fecha = l.fecha(o, 'fecha', ruta, true);
  const reemplazaA = l.texto(o, 'reemplazaA', ruta, true);
  if (!id || !nombre || !tipo || nota === undefined) return undefined;
  const parte = typeof o['parte'] === 'string' && o['parte'] ? o['parte'] : undefined;
  const peso = typeof o['peso'] === 'number' && o['peso'] > 0 && o['peso'] <= 100 ? o['peso'] : undefined;
  return { id, nombre, tipo, nota, ...(fecha ? { fecha } : {}), ...(reemplazaA ? { reemplazaA } : {}), ...(parte ? { parte } : {}), ...(peso !== undefined ? { peso } : {}) };
}

function leerFinal(l: Lector, x: unknown, ruta: string): IntentoFinal | undefined {
  const o = l.objeto(x, ruta);
  if (!o) return undefined;
  const fecha = l.fecha(o, 'fecha', ruta);
  const resultado = l.opcion(o, 'resultado', ruta, RESULTADOS_FINAL);
  const nota = l.entero(o, 'nota', ruta, 1, 10, true);
  if (!fecha || !resultado) return undefined;
  return { fecha, resultado, ...(nota !== undefined ? { nota } : {}), ...(o['soloTeorico'] === true ? { soloTeorico: true } : {}) };
}

function leerMateria(l: Lector, x: unknown, ruta: string): DatosMateriaUsuario | undefined {
  const o = l.objeto(x, ruta);
  if (!o) return undefined;
  const materiaId = l.texto(o, 'materiaId', ruta);
  const cursadas = l.lista(o, 'cursadas', ruta).map((c, i) => leerCursada(l, c, `${ruta}.cursadas[${i}]`)).filter((c): c is Cursada => !!c);
  const finales = l.lista(o, 'finales', ruta).map((f, i) => leerFinal(l, f, `${ruta}.finales[${i}]`)).filter((f): f is IntentoFinal => !!f);
  const res: DatosMateriaUsuario = { materiaId: materiaId ?? '', cursadas, finales };

  if (o['aprobacion'] != null) {
    const a = l.objeto(o['aprobacion'], `${ruta}.aprobacion`);
    if (a) {
      const forma = l.opcion(a, 'forma', `${ruta}.aprobacion`, FORMAS);
      const fecha = l.fecha(a, 'fecha', `${ruta}.aprobacion`);
      const nota = a['nota'] == null ? null : l.entero(a, 'nota', `${ruta}.aprobacion`, 1, 10);
      if (forma && fecha) {
        res.aprobacion = { forma, nota: nota ?? null, fecha, ...(typeof a['registradaEnMesa'] === 'boolean' ? { registradaEnMesa: a['registradaEnMesa'] } : {}) };
      }
    }
  }
  if (o['correccion'] != null) {
    const c = l.objeto(o['correccion'], `${ruta}.correccion`);
    if (c) {
      const estado = l.opcion(c, 'estado', `${ruta}.correccion`, ESTADOS_FORZADOS);
      const fecha = l.fecha(c, 'fecha', `${ruta}.correccion`);
      const motivo = typeof c['motivo'] === 'string' ? c['motivo'] : '';
      if (estado && fecha) res.correccion = { estado, motivo, fecha };
    }
  }
  return res;
}

function leerCalendarioUsuario(l: Lector, x: unknown, ruta: string): CalendarioUsuario | undefined {
  if (x == null) return undefined;
  const o = l.objeto(x, ruta);
  if (!o) return undefined;
  const res: CalendarioUsuario = {};

  const ciclos = l.lista(o, 'ciclosLectivos', ruta).flatMap((c, i) => {
    const r = `${ruta}.ciclosLectivos[${i}]`;
    const co = l.objeto(c, r);
    if (!co) return [];
    const id = l.entero(co, 'id', r, 1990, 2200);
    const inicio = l.fecha(co, 'inicio', r, true);
    const fin = l.fecha(co, 'fin', r);
    return id !== undefined && fin ? [{ id, inicio: inicio ?? null, fin }] : [];
  });
  if (ciclos.length) res.ciclosLectivos = ciclos;

  const cuatrimestres = l.lista(o, 'cuatrimestres', ruta).flatMap((c, i) => {
    const r = `${ruta}.cuatrimestres[${i}]`;
    const co = l.objeto(c, r);
    if (!co) return [];
    const id = l.texto(co, 'id', r);
    const ciclo = l.entero(co, 'ciclo', r, 1990, 2200);
    const cuatrimestre = l.opcion(co, 'cuatrimestre', r, ['1C', '2C'] as const);
    const inicio = l.fecha(co, 'inicio', r);
    const fin = l.fecha(co, 'fin', r);
    let inscripcion: { desde: string; hasta: string } | undefined;
    if (co['inscripcion'] != null) {
      const io = l.objeto(co['inscripcion'], `${r}.inscripcion`);
      const desde = io ? l.fecha(io, 'desde', `${r}.inscripcion`) : undefined;
      const hasta = io ? l.fecha(io, 'hasta', `${r}.inscripcion`) : undefined;
      if (desde && hasta) inscripcion = { desde, hasta };
    }
    return id && ciclo !== undefined && cuatrimestre && inicio && fin ? [{ id, ciclo, cuatrimestre, inicio, fin, ...(inscripcion ? { inscripcion } : {}) }] : [];
  });
  if (cuatrimestres.length) res.cuatrimestres = cuatrimestres;

  const periodos = l.lista(o, 'periodosExamen', ruta).flatMap((c, i) => {
    const r = `${ruta}.periodosExamen[${i}]`;
    const co = l.objeto(c, r);
    if (!co) return [];
    const id = l.texto(co, 'id', r);
    const tipo = l.opcion(co, 'tipo', r, ['turno', 'mesas-moviles', 'especial'] as const);
    const desde = l.fecha(co, 'desde', r);
    const hasta = l.fecha(co, 'hasta', r);
    const inscripcionDesde = l.fecha(co, 'inscripcionDesde', r, true);
    return id && tipo && desde && hasta ? [{ id, tipo, desde, hasta, inscripcionDesde: inscripcionDesde ?? null }] : [];
  });
  if (periodos.length) res.periodosExamen = periodos;

  const feriados = l.lista(o, 'feriados', ruta).flatMap((c, i) => {
    const r = `${ruta}.feriados[${i}]`;
    const co = l.objeto(c, r);
    if (!co) return [];
    const fecha = l.fecha(co, 'fecha', r);
    const nombre = l.texto(co, 'nombre', r);
    return fecha && nombre ? [{ fecha, nombre }] : [];
  });
  if (feriados.length) res.feriados = feriados;

  return res;
}

/** Valida y normaliza un backup (o el contenido guardado en el dispositivo). */
export function leerBackup(entrada: unknown, plan?: Plan): ResultadoLectura {
  if (!esObj(entrada)) return { ok: false, errores: ['El archivo no tiene el formato de un backup de Regu'] };
  if (entrada['app'] !== APP) return { ok: false, errores: ['El archivo no es un backup de Regu'] };
  const version = entrada['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version)) return { ok: false, errores: ['Falta la versión del backup'] };
  if (version > VERSION_ESQUEMA) {
    return { ok: false, errores: [`El backup es de una versión más nueva (${version}) que la que entiende esta app (${VERSION_ESQUEMA}). Actualizá Regu y volvé a intentar.`] };
  }
  if (version < 1) return { ok: false, errores: [`Versión de backup no soportada (${version})`] };
  // Cuando exista la versión 2, acá se migra: v1 → v2 → …

  const l = new Lector();
  const d = l.objeto(entrada['datos'], 'datos');
  if (!d) return { ok: false, errores: l.errores };

  const p = l.objeto(d['perfil'], 'datos.perfil');
  const perfil = p
    ? { planId: l.texto(p, 'planId', 'datos.perfil') ?? '', calendarioId: l.texto(p, 'calendarioId', 'datos.perfil') ?? '', anioIngreso: l.entero(p, 'anioIngreso', 'datos.perfil', 1950, 2200) ?? 0 }
    : { planId: '', calendarioId: '', anioIngreso: 0 };

  const materias = l.lista(d, 'materias', 'datos').map((m, i) => leerMateria(l, m, `datos.materias[${i}]`)).filter((m): m is DatosMateriaUsuario => !!m);
  const vistas = new Set<string>();
  for (const m of materias) {
    if (vistas.has(m.materiaId)) l.errores.push(`datos.materias: '${m.materiaId}' aparece más de una vez`);
    vistas.add(m.materiaId);
  }

  const electivasElegidas: EleccionElectiva[] = l.lista(d, 'electivasElegidas', 'datos').flatMap((e, i) => {
    const r = `datos.electivasElegidas[${i}]`;
    const o = l.objeto(e, r);
    if (!o) return [];
    const electivaId = l.texto(o, 'electivaId', r);
    const paqueteId = l.texto(o, 'paqueteId', r);
    const horas = o['horas'] == null ? undefined : l.entero(o, 'horas', r, 0, 10000);
    return electivaId && paqueteId ? [{ electivaId, paqueteId, ...(horas !== undefined ? { horas } : {}) }] : [];
  });

  const requisitos: EstadoRequisitoUsuario[] = l.lista(d, 'requisitos', 'datos').flatMap((e, i) => {
    const r = `datos.requisitos[${i}]`;
    const o = l.objeto(e, r);
    if (!o) return [];
    const requisitoId = l.texto(o, 'requisitoId', r);
    const estado = l.opcion(o, 'estado', r, ESTADOS_REQUISITO);
    const fecha = l.fecha(o, 'fecha', r, true);
    const horasCumplidas = o['horasCumplidas'] == null ? undefined : l.entero(o, 'horasCumplidas', r, 0, 100000);
    return requisitoId && estado ? [{ requisitoId, estado, ...(fecha ? { fecha } : {}), ...(horasCumplidas !== undefined ? { horasCumplidas } : {}) }] : [];
  });

  const datos: DatosUsuario = { perfil, materias, electivasElegidas, requisitos };

  const correcciones = l.lista(d, 'correccionesPlan', 'datos').flatMap((c, i) => {
    const r = `datos.correccionesPlan[${i}]`;
    const o = l.objeto(c, r);
    if (!o) return [];
    const ref = l.texto(o, 'ref', r);
    const campo = l.texto(o, 'campo', r);
    return ref && campo && 'valor' in o ? [{ ref, campo, valor: o['valor'], ...(typeof o['motivo'] === 'string' ? { motivo: o['motivo'] } : {}) }] : [];
  });
  if (correcciones.length) datos.correccionesPlan = correcciones;

  if (d['horasPaquetes'] != null) {
    const h = l.objeto(d['horasPaquetes'], 'datos.horasPaquetes');
    if (h) {
      const horas: Record<string, number> = {};
      for (const [k, v] of Object.entries(h)) {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) horas[k] = v;
        else l.errores.push(`datos.horasPaquetes.${k}: debe ser un número mayor o igual a 0`);
      }
      datos.horasPaquetes = horas;
    }
  }

  const cal = leerCalendarioUsuario(l, d['calendario'], 'datos.calendario');
  if (cal && Object.keys(cal).length) datos.calendario = cal;

  if (l.errores.length) return { ok: false, errores: l.errores };

  // Ids desconocidos: se conservan y se avisan.
  if (plan) {
    if (perfil.planId !== plan.id) l.avisos.push(`El backup es del plan '${perfil.planId}', pero esta app tiene cargado '${plan.id}'`);
    const conocidos = new Set<string>([...plan.materias.map(m => m.id), ...plan.electivas.map(e => e.id)]);
    for (const m of materias) if (!conocidos.has(m.materiaId)) l.avisos.push(`Materia '${m.materiaId}' no existe en el plan (se conserva)`);
    const paquetes = new Set(plan.paquetesElectivas.map(p => p.id));
    for (const e of electivasElegidas) {
      if (!conocidos.has(e.electivaId)) l.avisos.push(`Electiva '${e.electivaId}' no existe en el plan (se conserva)`);
      if (!paquetes.has(e.paqueteId)) l.avisos.push(`Paquete '${e.paqueteId}' no existe en el plan (se conserva)`);
    }
    const reqs = new Set(plan.requisitos.map(r => r.id));
    for (const r of requisitos) if (!reqs.has(r.requisitoId)) l.avisos.push(`Requisito '${r.requisitoId}' no existe en el plan (se conserva)`);
  }
  return { ok: true, datos, avisos: l.avisos };
}
