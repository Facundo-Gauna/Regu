// Almacén real: IndexedDB. Si el navegador lo bloquea (ventana privada, datos del sitio deshabilitados), se cae a memoria
// y la app avisa que hay que usar el backup.

import type { DatosUsuario } from '../motor/tipos.ts';
import { AlmacenMemoria, desempaquetar, empaquetar, type Almacen, type Preferencias } from '../datos/almacen.ts';

const BASE = 'regu';
const TABLA = 'kv';
const CLAVE_USUARIO = 'usuario';
const CLAVE_PREFS = 'prefs';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA);
    pedido.onsuccess = () => {
      const db = pedido.result;
      // Si otra pestaña necesita actualizar el esquema, esta suelta su conexión en lugar de bloquearla.
      db.onversionchange = () => db.close();
      resolver(db);
    };
    pedido.onerror = () => rechazar(pedido.error ?? new Error('No se pudo abrir IndexedDB'));
    pedido.onblocked = () => rechazar(new Error('IndexedDB bloqueada'));
  });
}

function pedir<T>(db: IDBDatabase, modo: IDBTransactionMode, accion: (t: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(TABLA, modo);
    const req = accion(tx.objectStore(TABLA));
    tx.oncomplete = () => resolver(req.result);
    tx.onerror = () => rechazar(tx.error ?? new Error('Error de IndexedDB'));
    tx.onabort = () => rechazar(tx.error ?? new Error('Transacción abortada'));
  });
}

class AlmacenIdb implements Almacen {
  readonly persistente = true;
  private readonly db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  async cargarUsuario(): Promise<DatosUsuario | null> {
    const guardado = await pedir<unknown>(this.db, 'readonly', t => t.get(CLAVE_USUARIO));
    return guardado === undefined ? null : desempaquetar(guardado);
  }

  async guardarUsuario(datos: DatosUsuario): Promise<void> {
    await pedir(this.db, 'readwrite', t => t.put(empaquetar(datos), CLAVE_USUARIO));
  }

  async borrarUsuario(): Promise<void> {
    await pedir(this.db, 'readwrite', t => t.delete(CLAVE_USUARIO));
  }

  async cargarPrefs(): Promise<Preferencias> {
    const p = await pedir<Preferencias | undefined>(this.db, 'readonly', t => t.get(CLAVE_PREFS));
    return p ?? {};
  }

  async guardarPrefs(prefs: Preferencias): Promise<void> {
    await pedir(this.db, 'readwrite', t => t.put(prefs, CLAVE_PREFS));
  }
}

export async function crearAlmacen(): Promise<Almacen> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('Sin IndexedDB');
    return new AlmacenIdb(await abrir());
  } catch {
    return new AlmacenMemoria();
  }
}
