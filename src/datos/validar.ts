// Validación de los datos de referencia (planes y calendarios).
// Lo usan el CLI (herramientas/validar-datos.mjs) y la app al arrancar (PLAN-3: un plan inválido no se carga).
// Los errores impiden usar el archivo; las advertencias se muestran pero no lo impiden.

import type { Calendario, Plan, ReglaCursada } from '../motor/tipos.ts';
import { esFechaValida } from '../motor/fechas.ts';

export interface Validacion {
  errores: string[];
  avisos: string[];
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function faltantes(obj: Record<string, unknown>, campos: string[], donde: string): string[] {
  return campos.filter(c => !(c in obj)).map(c => `${donde}: falta el campo '${c}'`);
}

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function validarPlan(entrada: unknown): Validacion {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!esObjeto(entrada)) return { errores: ['el plan no es un objeto JSON'], avisos };
  errores.push(...faltantes(entrada, ['schemaVersion', 'tipo', 'id', 'institucion', 'carrera', 'anioPlan', 'versionDatos', 'niveles', 'materias', 'paquetesElectivas', 'electivas', 'requisitos', 'titulos'], 'plan'));
  if (errores.length) return { errores, avisos };
  if (entrada['tipo'] !== 'plan') return { errores: [`tipo '${String(entrada['tipo'])}' no es 'plan'`], avisos };
  for (const k of ['materias', 'paquetesElectivas', 'electivas', 'requisitos', 'titulos'] as const) {
    if (!Array.isArray(entrada[k])) return { errores: [`'${k}' debe ser una lista`], avisos };
  }
  try {
    validarPlanTipado(entrada as unknown as Plan, errores, avisos);
  } catch (e) {
    errores.push(`estructura inválida: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { errores, avisos };
}

function validarPlanTipado(p: Plan, errores: string[], avisos: string[]): void {
  if (p.schemaVersion !== 1) errores.push(`schemaVersion ${String(p.schemaVersion)} no soportada`);

  type Item = { id: string; nombre?: string; nivel?: number; verificar?: string[] };
  const items = new Map<string, { tipo: string; it: Item }>();
  const registrar = (tipo: string, lista: Item[]) => {
    for (const it of lista) {
      const donde = `${tipo} '${it.id ?? it.nombre}'`;
      if (!ID.test(it.id ?? '')) errores.push(`${donde}: id inválido`);
      if (items.has(it.id)) errores.push(`${donde}: id duplicado`);
      items.set(it.id, { tipo, it });
      if (it.nivel !== undefined && (it.nivel < 1 || it.nivel > p.niveles)) errores.push(`${donde}: nivel ${it.nivel} fuera de 1..${p.niveles}`);
      for (const v of it.verificar ?? []) avisos.push(`${donde}: verificar → ${v}`);
    }
  };
  registrar('materia', p.materias);
  registrar('paquete', p.paquetesElectivas);
  registrar('electiva', p.electivas);
  registrar('requisito', p.requisitos);
  registrar('titulo', p.titulos);

  // Números del PDF únicos
  const numeros = new Map<number, string>();
  for (const it of [...p.materias, ...p.requisitos]) {
    if (it.numero == null) continue;
    if (numeros.has(it.numero)) errores.push(`número ${it.numero} repetido: '${numeros.get(it.numero)}' y '${it.id}'`);
    numeros.set(it.numero, it.id);
  }

  // Correlativas
  const grafo = new Map<string, Set<string>>();
  for (const it of [...p.materias, ...p.electivas, ...p.requisitos]) {
    const donde = `'${it.id}'`;
    const c = it.correlativas;
    if (!c?.cursar || !c?.rendir) {
      errores.push(`${donde}: correlativas incompletas`);
      continue;
    }
    const refs = [...c.cursar.regularizadas, ...c.cursar.aprobadas];
    if (c.rendir.aprobadas === 'todas') {
      if (items.get(it.id)?.tipo === 'electiva') errores.push(`${donde}: una electiva no puede exigir 'todas'`);
    } else {
      refs.push(...c.rendir.aprobadas);
    }
    for (const lista of [c.cursar.regularizadas, c.cursar.aprobadas, Array.isArray(c.rendir.aprobadas) ? c.rendir.aprobadas : []]) {
      if (new Set(lista).size !== lista.length) errores.push(`${donde}: correlativa repetida en una lista`);
    }
    for (const r of refs) {
      const ref = items.get(r);
      if (!ref) {
        errores.push(`${donde}: correlativa '${r}' no existe`);
        continue;
      }
      if (ref.tipo !== 'materia' && ref.tipo !== 'electiva') errores.push(`${donde}: correlativa '${r}' es un ${ref.tipo}, no una materia`);
      if (r === it.id) errores.push(`${donde}: es correlativa de sí misma`);
      const nivelRef = ref.it.nivel;
      const nivel = (it as { nivel?: number }).nivel;
      if (nivelRef !== undefined && nivel !== undefined && nivelRef > nivel) avisos.push(`${donde} (nivel ${nivel}) exige '${r}' de nivel ${nivelRef}`);
    }
    grafo.set(it.id, new Set(refs));
    const regimen = (it as { regimen?: unknown; regimenOrigen?: string });
    if ('regimen' in it && regimen.regimen === null) avisos.push(`${donde}: régimen no especificado`);
    if (regimen.regimenOrigen === 'inferido') avisos.push(`${donde}: régimen inferido (${String(regimen.regimen)})`);
  }

  // Ciclos en el grafo de correlativas
  const estado = new Map<string, 1 | 2>(); // 1 = visitando, 2 = listo
  const visitar = (id: string, camino: string[]): void => {
    if (estado.get(id) === 2) return;
    if (estado.get(id) === 1) {
      errores.push(`ciclo de correlativas: ${[...camino, id].join(' → ')}`);
      return;
    }
    estado.set(id, 1);
    for (const r of grafo.get(id) ?? []) visitar(r, [...camino, id]);
    estado.set(id, 2);
  };
  for (const id of grafo.keys()) visitar(id, []);

  // Electivas → paquetes
  for (const e of p.electivas) {
    for (const pq of e.paquetesSugeridos) {
      if (items.get(pq)?.tipo !== 'paquete') errores.push(`electiva '${e.id}': paquete '${pq}' no existe`);
    }
    if (e.horas == null) avisos.push(`electiva '${e.id}': horas no especificadas`);
  }
  for (const pq of p.paquetesElectivas) {
    if (pq.horasExigidas == null) avisos.push(`paquete '${pq.id}': horas exigidas no especificadas`);
    if (!p.electivas.some(e => e.paquetesSugeridos.includes(pq.id))) avisos.push(`paquete '${pq.id}': ninguna electiva del catálogo lo sugiere`);
  }

  // Títulos
  if (!p.titulos.some(t => t.tipo === 'final')) errores.push('falta el título final');
  for (const t of p.titulos) {
    if (t.hastaNivel != null && (t.hastaNivel < 1 || t.hastaNivel > p.niveles)) errores.push(`título '${t.id}': hastaNivel fuera de rango`);
    for (const r of t.requisitosExtra ?? []) if (!items.has(r)) errores.push(`título '${t.id}': requisito '${r}' no existe`);
  }

  for (let n = 1; n <= p.niveles; n++) {
    if (!p.materias.some(m => m.nivel === n)) avisos.push(`nivel ${n} sin materias obligatorias`);
  }
}

export function validarCalendario(entrada: unknown): Validacion {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!esObjeto(entrada)) return { errores: ['el calendario no es un objeto JSON'], avisos };
  errores.push(...faltantes(entrada, ['schemaVersion', 'tipo', 'id', 'facultad', 'versionDatos', 'ciclosLectivos', 'cuatrimestres', 'periodosExamen', 'feriados'], 'calendario'));
  if (errores.length) return { errores, avisos };
  if (entrada['tipo'] !== 'calendario') return { errores: [`tipo '${String(entrada['tipo'])}' no es 'calendario'`], avisos };
  for (const k of ['ciclosLectivos', 'cuatrimestres', 'periodosExamen', 'feriados'] as const) {
    if (!Array.isArray(entrada[k])) return { errores: [`'${k}' debe ser una lista`], avisos };
  }
  try {
    validarCalendarioTipado(entrada as unknown as Calendario, errores, avisos);
  } catch (e) {
    errores.push(`estructura inválida: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { errores, avisos };
}

function validarCalendarioTipado(c: Calendario, errores: string[], avisos: string[]): void {
  if (c.schemaVersion !== 1) errores.push(`schemaVersion ${String(c.schemaVersion)} no soportada`);

  const rango = (obj: Record<string, unknown>, a: string, b: string, donde: string) => {
    for (const k of [a, b]) {
      const v = obj[k];
      if (v !== null && (typeof v !== 'string' || !esFechaValida(v))) errores.push(`${donde}: fecha '${k}' inválida (${String(v)})`);
    }
    const va = obj[a];
    const vb = obj[b];
    if (typeof va === 'string' && typeof vb === 'string' && va > vb) errores.push(`${donde}: '${a}' (${va}) es posterior a '${b}' (${vb})`);
  };

  const ciclos = new Map<number, Calendario['ciclosLectivos'][number]>();
  for (const cl of c.ciclosLectivos) {
    rango(cl as unknown as Record<string, unknown>, 'inicio', 'fin', `ciclo ${cl.id}`);
    ciclos.set(cl.id, cl);
  }
  for (const q of c.cuatrimestres) {
    rango(q as unknown as Record<string, unknown>, 'inicio', 'fin', `cuatrimestre ${q.id}`);
    const cl = ciclos.get(q.ciclo);
    if (!cl) errores.push(`cuatrimestre ${q.id}: ciclo ${q.ciclo} no existe`);
    else if ((cl.inicio && q.inicio < cl.inicio) || q.fin > cl.fin) errores.push(`cuatrimestre ${q.id}: fuera del ciclo ${q.ciclo}`);
    if (q.inscripcion) rango(q.inscripcion as unknown as Record<string, unknown>, 'desde', 'hasta', `inscripción ${q.id}`);
  }
  const ids = new Set<string>();
  let anterior: Calendario['periodosExamen'][number] | null = null;
  for (const pe of c.periodosExamen) {
    const donde = `período ${pe.id}`;
    if (ids.has(pe.id)) errores.push(`${donde}: id duplicado`);
    ids.add(pe.id);
    rango(pe as unknown as Record<string, unknown>, 'desde', 'hasta', donde);
    if (pe.inscripcionDesde && !esFechaValida(pe.inscripcionDesde)) errores.push(`${donde}: inscripcionDesde inválida`);
    if (pe.inscripcionDesde && pe.inscripcionDesde >= pe.desde) errores.push(`${donde}: la inscripción empieza el día del examen o después`);
    if (anterior && pe.desde <= anterior.hasta) avisos.push(`${donde}: se superpone o está desordenado respecto de ${anterior.id}`);
    for (const v of pe.verificar ?? []) avisos.push(`${donde}: verificar → ${v}`);
    anterior = pe;
  }
  const fer = new Set<string>();
  for (const f of c.feriados) {
    if (!esFechaValida(f.fecha)) errores.push(`feriado '${f.nombre}': fecha inválida`);
    if (fer.has(f.fecha)) errores.push(`feriado ${f.fecha} duplicado`);
    fer.add(f.fecha);
  }
  for (const r of c.recesos ?? []) rango(r as unknown as Record<string, unknown>, 'desde', 'hasta', `receso ${r.nombre}`);
  for (const e of c.eventos ?? []) rango(e as unknown as Record<string, unknown>, 'desde', 'hasta', `evento ${e.nombre}`);
  for (const v of (c as unknown as { verificar?: string[] }).verificar ?? []) avisos.push(`verificar → ${v}`);
}

/** Valida el archivo de reglas de cátedra. Con el plan, además comprueba que cada materia exista en él. */
export function validarReglas(entrada: unknown, plan?: Plan): Validacion {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!esObjeto(entrada)) return { errores: ['reglas: el archivo no es un objeto'], avisos };
  errores.push(...faltantes(entrada, ['schemaVersion', 'tipo', 'id', 'planId', 'versionDatos', 'reglas'], 'reglas'));
  if (entrada['schemaVersion'] !== 1) errores.push(`schemaVersion ${String(entrada['schemaVersion'])} no soportada`);
  if (!Array.isArray(entrada['reglas'])) return { errores: [...errores, "reglas: 'reglas' debe ser una lista"], avisos };

  const ids = new Set(plan?.materias.map(m => m.id));
  const vistas = new Set<string>();
  for (const [i, raw] of (entrada['reglas'] as unknown[]).entries()) {
    if (!esObjeto(raw)) { errores.push(`reglas[${i}]: no es un objeto`); continue; }
    const r = raw as unknown as ReglaCursada;
    const donde = `regla ${String(r.materiaId ?? i)}`;
    errores.push(...faltantes(raw, ['materiaId', 'ciclo', 'tipo', 'instancias', 'recuperatorios', 'tambien', 'resumen', 'fuente', 'verificar'], donde));
    if (typeof r.materiaId !== 'string' || !ID.test(r.materiaId)) { errores.push(`${donde}: materiaId inválido`); continue; }
    const clave = `${r.materiaId}/${String(r.ciclo)}`;
    if (vistas.has(clave)) errores.push(`${donde}: duplicada para el ciclo ${String(r.ciclo)}`);
    vistas.add(clave);
    if (plan && !ids.has(r.materiaId)) errores.push(`${donde}: la materia no está en el plan`);
    if (!Number.isInteger(r.ciclo)) errores.push(`${donde}: ciclo inválido`);
    if (r.tipo !== 'notas' && r.tipo !== 'texto') errores.push(`${donde}: tipo '${String(r.tipo)}' desconocido`);
    if (r.instancias !== null && !(Number.isInteger(r.instancias) && r.instancias > 0)) errores.push(`${donde}: instancias debe ser un entero positivo o null`);
    if (!Array.isArray(r.tambien) || !Array.isArray(r.verificar)) errores.push(`${donde}: 'tambien' y 'verificar' deben ser listas`);
    if (esObjeto(r.fuente)) {
      for (const c of ['archivo', 'seccion', 'cita'] as const) if (typeof r.fuente[c] !== 'string' || !r.fuente[c]) errores.push(`${donde}: fuente.${c} vacío`);
    }
    for (const nivel of ['promocion', 'regular'] as const) {
      const c = r[nivel];
      if (c === undefined) continue;
      if (!esObjeto(c)) { errores.push(`${donde}: ${nivel} inválida`); continue; }
      for (const k of ['cadaInstanciaMin', 'promedioMin'] as const) {
        const v = c[k];
        if (v !== undefined && !(typeof v === 'number' && v >= 1 && v <= 10)) errores.push(`${donde}: ${nivel}.${k} debe estar entre 1 y 10`);
      }
      if (c.cadaInstanciaMin === undefined && c.promedioMin === undefined) errores.push(`${donde}: ${nivel} no define ningún mínimo`);
    }
    if (r.tipo === 'notas' && !r.promocion && !r.regular) errores.push(`${donde}: una regla de notas necesita promocion o regular`);
    if (r.tipo === 'texto' && (r.promocion || r.regular)) avisos.push(`${donde}: una regla de texto no se calcula; se ignoran sus mínimos`);
    for (const v of Array.isArray(r.verificar) ? r.verificar : []) avisos.push(`${donde}: verificar → ${v}`);
  }
  return { errores, avisos };
}

export function validar(entrada: unknown): Validacion & { tipo: 'plan' | 'calendario' | 'reglas' | null } {
  const tipo = esObjeto(entrada) ? entrada['tipo'] : undefined;
  if (tipo === 'plan') return { ...validarPlan(entrada), tipo };
  if (tipo === 'calendario') return { ...validarCalendario(entrada), tipo };
  if (tipo === 'reglas') return { ...validarReglas(entrada), tipo };
  return { errores: [`tipo desconocido '${String(tipo)}'`], avisos: [], tipo: null };
}
