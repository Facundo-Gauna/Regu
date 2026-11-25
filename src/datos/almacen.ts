// Persistencia local detrás de una interfaz: IndexedDB en la app (src/app/almacen-idb.ts), memoria en tests y en el modo ejemplo.
// Lo guardado usa el mismo sobre que el backup (con schemaVersion), así que siempre se puede migrar al cargar.

import type { DatosUsuario, Fecha } from '../motor/tipos.ts';
import type { Tema } from '../vista/temas.ts';
import { crearBackup, leerBackup, type BackupUsuario } from './backup.ts';

/** Preferencias de la app. No forman parte del backup. */
export interface Preferencias {
  /** Fecha y hora ISO de la última exportación de backup. */
  ultimoBackup?: string;
  /** Cada cuántos días recordar el backup (por defecto 14). */
  recordatorioBackupDias?: number;
  /** Fecha de "hoy" fijada a mano (para probar escenarios). null/ausente = fecha real. */
  fechaSimulada?: Fecha | null;
  /** Tema visual. «auto» sigue al sistema. */
  tema?: Tema;
  /** Accesos de carga rápida fijados en Inicio: una materia y, si tiene estructura, una de sus partes. */
  accesos?: { materiaId: string; parte?: string }[];
}

export interface Almacen {
  /** null si todavía no hay datos. Lanza si lo guardado es ilegible. */
  cargarUsuario(): Promise<DatosUsuario | null>;
  guardarUsuario(datos: DatosUsuario): Promise<void>;
  borrarUsuario(): Promise<void>;
  cargarPrefs(): Promise<Preferencias>;
  guardarPrefs(prefs: Preferencias): Promise<void>;
  /** true si los datos sobreviven a cerrar la app. Falso en memoria o si el navegador bloquea el almacenamiento. */
  readonly persistente: boolean;
}

/** Lee lo guardado (un sobre de backup) y lo valida. */
export function desempaquetar(guardado: unknown): DatosUsuario {
  const r = leerBackup(guardado);
  if (!r.ok) throw new Error(`Los datos guardados no se pueden leer: ${r.errores.join('; ')}`);
  return r.datos;
}

export function empaquetar(datos: DatosUsuario): BackupUsuario {
  return crearBackup(datos);
}

export class AlmacenMemoria implements Almacen {
  readonly persistente = false;
  private usuario: BackupUsuario | null = null;
  private prefs: Preferencias = {};

  constructor(inicial?: DatosUsuario) {
    if (inicial) this.usuario = empaquetar(inicial);
  }

  async cargarUsuario(): Promise<DatosUsuario | null> {
    return this.usuario ? desempaquetar(structuredClone(this.usuario)) : null;
  }

  async guardarUsuario(datos: DatosUsuario): Promise<void> {
    this.usuario = empaquetar(datos);
  }

  async borrarUsuario(): Promise<void> {
    this.usuario = null;
  }

  async cargarPrefs(): Promise<Preferencias> {
    return structuredClone(this.prefs);
  }

  async guardarPrefs(prefs: Preferencias): Promise<void> {
    this.prefs = structuredClone(prefs);
  }
}
