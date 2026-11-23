// Estado de la app: datos del usuario, preferencias y modo. Un store mínimo (sin librerías) con persistencia.
//
// - Cada cambio actualiza el estado en el momento y se guarda en segundo plano, en orden.
// - Modo ejemplo: datos de un estudiante de ejemplo en memoria; nunca se toca lo guardado.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { DatosUsuario, Fecha } from '../motor/tipos.ts';
import { AlmacenMemoria, type Almacen, type Preferencias } from '../datos/almacen.ts';
import { usuarioVacio } from '../datos/backup.ts';
import { datosEjemplo } from '../datos/ejemplo.ts';
import { fechaLocal } from '../datos/hoy.ts';
import { crearAlmacen } from './almacen-idb.ts';

export interface EstadoApp {
  cargando: boolean;
  /** Error al leer lo guardado: los datos existen pero no se pudieron interpretar. */
  errorCarga?: string;
  datos: DatosUsuario | null;
  prefs: Preferencias;
  modo: 'normal' | 'ejemplo';
  /** Los datos sobreviven al cierre de la app (IndexedDB disponible). */
  persistente: boolean;
  /** El navegador aceptó guardar de forma persistente (no la borra por falta de espacio). */
  almacenamientoProtegido: boolean | null;
  errorGuardado?: string;
  /** "Hoy" real (cambia a medianoche). La fecha efectiva puede estar simulada en las preferencias. */
  hoyReal: Fecha;
  actualizacionDisponible: boolean;
}

let estado: EstadoApp = {
  cargando: true,
  datos: null,
  prefs: {},
  modo: 'normal',
  persistente: false,
  almacenamientoProtegido: null,
  hoyReal: fechaLocal(),
  actualizacionDisponible: false,
};

let almacen: Almacen = new AlmacenMemoria();
let almacenReal: Almacen | null = null;
let colaGuardado: Promise<void> = Promise.resolve();
let aplicarActualizacion: (() => void) | null = null;
const oyentes = new Set<() => void>();
/** Se incrementa en cada cambio: permite detectar los que ocurren entre el render y la suscripción. */
let version = 0;

function emitir(parcial: Partial<EstadoApp>): void {
  estado = { ...estado, ...parcial };
  version++;
  for (const o of oyentes) o();
}

export function useStore(): EstadoApp {
  const [, setN] = useState(0);
  const versionVista = useRef(version);
  versionVista.current = version;
  useEffect(() => {
    const oyente = () => setN(n => n + 1);
    oyentes.add(oyente);
    // Si el estado cambió después de renderizar y antes de suscribirnos, nos lo habríamos perdido.
    if (version !== versionVista.current) oyente();
    return () => void oyentes.delete(oyente);
  }, []);
  return estado;
}

/** Lectura directa del estado, fuera de un componente. */
export function obtenerEstado(): EstadoApp {
  return estado;
}

/** Se resuelve cuando terminaron de escribirse todos los cambios pendientes. */
export function esperarGuardado(): Promise<void> {
  return colaGuardado;
}

export function fechaEfectiva(s: Pick<EstadoApp, 'prefs' | 'hoyReal'>): Fecha {
  return s.prefs.fechaSimulada ?? s.hoyReal;
}

// ---------- Inicio ----------

export async function iniciar(opciones: { ejemplo: boolean }): Promise<void> {
  iniciarRelojDeFecha();
  if (opciones.ejemplo) {
    almacen = new AlmacenMemoria(datosEjemplo());
    emitir({ cargando: false, modo: 'ejemplo', datos: datosEjemplo(), persistente: false });
    return;
  }
  almacenReal = await crearAlmacen();
  almacen = almacenReal;
  try {
    const [datos, prefs] = await Promise.all([almacen.cargarUsuario(), almacen.cargarPrefs()]);
    emitir({ cargando: false, datos, prefs, persistente: almacen.persistente });
    if (datos) void pedirProteccion();
  } catch (e) {
    // Datos guardados ilegibles: no se pisan, se le avisa al usuario.
    emitir({ cargando: false, errorCarga: e instanceof Error ? e.message : String(e), persistente: almacen.persistente });
  }
}

/** Pide que el navegador no borre los datos si falta espacio (DAT-3). */
export async function pedirProteccion(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    const ya = (await navigator.storage.persisted?.()) ?? false;
    const ok = ya || (await navigator.storage.persist());
    emitir({ almacenamientoProtegido: ok });
    return ok;
  } catch {
    emitir({ almacenamientoProtegido: false });
    return false;
  }
}

let relojIniciado = false;

function iniciarRelojDeFecha(): void {
  if (relojIniciado) return;
  relojIniciado = true;
  const revisar = () => {
    const hoy = fechaLocal();
    if (hoy !== estado.hoyReal) emitir({ hoyReal: hoy });
  };
  const temporizador = setInterval(revisar, 60_000) as unknown as { unref?: () => void };
  temporizador.unref?.(); // fuera del navegador (tests) no debe mantener vivo el proceso
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revisar();
  });
}

// ---------- Datos ----------

function guardar(datos: DatosUsuario): void {
  colaGuardado = colaGuardado
    .then(() => almacen.guardarUsuario(datos))
    .then(() => {
      if (estado.errorGuardado) emitir({ errorGuardado: undefined });
    })
    .catch(e => emitir({ errorGuardado: e instanceof Error ? e.message : 'No se pudieron guardar los datos' }));
}

/** Aplica un cambio puro sobre los datos y lo guarda. */
export function actualizar(cambio: (d: DatosUsuario) => DatosUsuario): void {
  if (!estado.datos) return;
  const nuevos = cambio(estado.datos);
  emitir({ datos: nuevos });
  guardar(nuevos);
}

export function reemplazarDatos(datos: DatosUsuario): void {
  emitir({ datos });
  guardar(datos);
}

export function crearPerfil(planId: string, calendarioId: string, anioIngreso: number): void {
  reemplazarDatos(usuarioVacio(planId, calendarioId, anioIngreso));
  void pedirProteccion();
}

export async function borrarTodo(): Promise<void> {
  await colaGuardado;
  await almacen.borrarUsuario();
  emitir({ datos: null, errorGuardado: undefined });
}

// ---------- Preferencias ----------

export function guardarPrefs(cambio: Partial<Preferencias>): void {
  const prefs = { ...estado.prefs, ...cambio };
  emitir({ prefs });
  // En la misma cola que los datos: se guardan en orden y esperarGuardado() las incluye.
  colaGuardado = colaGuardado.then(() => almacen.guardarPrefs(prefs)).catch(() => undefined);
}

// ---------- Modo ejemplo ----------

export function entrarModoEjemplo(): void {
  almacen = new AlmacenMemoria(datosEjemplo());
  emitir({ modo: 'ejemplo', datos: datosEjemplo(), persistente: false });
}

export async function salirModoEjemplo(): Promise<void> {
  // Si la app se abrió directamente con ?ejemplo=1 nunca se abrió el almacén real: se abre ahora.
  almacenReal ??= await crearAlmacen();
  almacen = almacenReal;
  // Sin ?ejemplo=1 en la URL, recargar no vuelve a entrar al modo ejemplo.
  if (typeof history !== 'undefined' && typeof location !== 'undefined' && location.search.includes('ejemplo')) {
    history.replaceState(null, '', location.pathname + location.hash);
  }
  try {
    const [datos, prefs] = await Promise.all([almacen.cargarUsuario(), almacen.cargarPrefs()]);
    emitir({ modo: 'normal', datos, prefs, persistente: almacen.persistente });
  } catch (e) {
    emitir({ modo: 'normal', datos: null, persistente: almacen.persistente, errorCarga: e instanceof Error ? e.message : String(e) });
  }
}

// ---------- Actualización de la app (service worker) ----------

export function registrarActualizacion(aplicar: () => void): void {
  aplicarActualizacion = aplicar;
  emitir({ actualizacionDisponible: true });
}

export function aplicarActualizacionApp(): void {
  aplicarActualizacion?.();
}

export function descartarActualizacion(): void {
  emitir({ actualizacionDisponible: false });
}
