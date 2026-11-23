// Persistencia real: el almacén de IndexedDB y el store, con fake-indexeddb. "Recargar" = importar una instancia nueva del store
// (los datos quedan en IndexedDB, como en el navegador).

import 'fake-indexeddb/auto';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/datos/acciones.ts';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import { calendario, plan } from './ayuda.ts';

type Store = typeof import('../src/app/store.ts');
let n = 0;
/** Una "recarga de la app": instancia nueva del módulo, mismo IndexedDB. */
const recargar = async (opciones = { ejemplo: false }): Promise<Store> => {
  const store = (await import(`../src/app/store.ts?recarga=${++n}`)) as Store;
  await store.iniciar(opciones);
  return store;
};

before(() => {
  // El store registra un listener de visibilidad: en Node no hay document.
  (globalThis as Record<string, unknown>)['document'] = { addEventListener() {}, hidden: false };
});

/** Vacía la base sin borrarla (borrarla esperaría a que se cierren las conexiones de las otras "recargas"). */
const borrarBase = () =>
  new Promise<void>((ok, mal) => {
    const r = indexedDB.open('regu', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => mal(r.error);
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').clear();
      tx.oncomplete = () => {
        db.close();
        ok();
      };
      tx.onerror = () => mal(tx.error);
    };
  });

test('primer uso: sin datos, con almacenamiento persistente', async () => {
  await borrarBase();
  const s = await recargar();
  const e = s.obtenerEstado();
  assert.equal(e.cargando, false);
  assert.equal(e.datos, null);
  assert.equal(e.persistente, true);
  assert.equal(e.modo, 'normal');
});

test('crear perfil, cargar cursada, final y preferencias: todo sobrevive a una recarga', async () => {
  const s = await recargar();
  s.crearPerfil(plan.id, calendario.id, 2026);
  s.actualizar(d => A.agregarCursada(d, 'analisis-matematico-1', { ciclo: 2026, cuatrimestre: '1C', resultado: 'regular', fechaResultado: '2026-07-03' }));
  s.actualizar(d => A.agregarFinal(d, 'analisis-matematico-1', { fecha: '2026-07-22', resultado: 'insuficiente', nota: 4 }));
  s.actualizar(d => A.elegirElectiva(d, { electivaId: 'testing-software', paqueteId: 'electivas-nivel-3', horas: 48 }));
  s.guardarPrefs({ tema: 'oscuro', fechaSimulada: '2026-12-01' });
  await s.esperarGuardado();
  const antes = structuredClone(s.obtenerEstado().datos);

  const recargada = await recargar();
  const e = recargada.obtenerEstado();
  assert.deepEqual(e.datos, antes);
  assert.equal(e.datos!.materias[0]!.finales[0]!.nota, 4);
  assert.deepEqual(e.prefs, { tema: 'oscuro', fechaSimulada: '2026-12-01' });
});

test('los cambios se guardan en orden aunque se disparen seguidos', async () => {
  const s = await recargar();
  for (let i = 1; i <= 20; i++) s.actualizar(d => A.fijarAnioIngreso(d, 2000 + i));
  await s.esperarGuardado();
  assert.equal((await recargar()).obtenerEstado().datos!.perfil.anioIngreso, 2020);
});

test('el modo ejemplo nunca toca lo guardado', async () => {
  const real = await recargar();
  await real.esperarGuardado();
  const guardado = structuredClone(real.obtenerEstado().datos);

  const ej = await recargar({ ejemplo: true });
  assert.equal(ej.obtenerEstado().modo, 'ejemplo');
  assert.equal(ej.obtenerEstado().datos!.perfil.anioIngreso, 2024);
  ej.actualizar(d => A.borrarMateria(d, 'analisis-matematico-1'));
  ej.actualizar(d => A.fijarAnioIngreso(d, 1999));
  await ej.esperarGuardado();

  assert.deepEqual((await recargar()).obtenerEstado().datos, guardado);
});

test('entrar y salir del modo ejemplo desde la app', async () => {
  const s = await recargar();
  const guardado = structuredClone(s.obtenerEstado().datos);
  s.entrarModoEjemplo();
  assert.equal(s.obtenerEstado().modo, 'ejemplo');
  s.actualizar(d => A.fijarAnioIngreso(d, 1999));
  await s.esperarGuardado();
  await s.salirModoEjemplo();
  assert.equal(s.obtenerEstado().modo, 'normal');
  assert.deepEqual(s.obtenerEstado().datos, guardado);
  assert.deepEqual((await recargar()).obtenerEstado().datos, guardado);
});

test('salir del modo ejemplo abierto directamente (?ejemplo=1) carga los datos reales guardados', async () => {
  const real = await recargar();
  const guardado = structuredClone(real.obtenerEstado().datos);
  assert.ok(guardado);
  const ej = await recargar({ ejemplo: true }); // nunca abrió el almacén real
  assert.equal(ej.obtenerEstado().datos!.perfil.anioIngreso, 2024);
  await ej.salirModoEjemplo();
  assert.equal(ej.obtenerEstado().modo, 'normal');
  assert.deepEqual(ej.obtenerEstado().datos, guardado);
  assert.equal(ej.obtenerEstado().persistente, true);
});

test('datos guardados ilegibles: se avisa y NO se pisan', async () => {
  // Se corrompe lo guardado directamente en IndexedDB
  const db = await new Promise<IDBDatabase>((ok, mal) => {
    const r = indexedDB.open('regu', 1);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
  const basura = { app: 'regu', schemaVersion: 99, datos: 'roto' };
  await new Promise<void>(ok => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(basura, 'usuario');
    tx.oncomplete = () => ok();
  });
  const s = await recargar();
  const e = s.obtenerEstado();
  assert.equal(e.cargando, false);
  assert.equal(e.datos, null);
  assert.match(e.errorCarga ?? '', /no se pueden leer/);
  // Lo guardado sigue igual (no se reemplazó por datos vacíos)
  const leido = await new Promise<unknown>(ok => {
    const r = db.transaction('kv').objectStore('kv').get('usuario');
    r.onsuccess = () => ok(r.result);
  });
  assert.deepEqual(leido, basura);
  db.close();
});

test('borrar todo: se borra también del almacenamiento', async () => {
  await borrarBase();
  const s = await recargar();
  s.reemplazarDatos(datosEjemplo());
  await s.esperarGuardado();
  assert.ok((await recargar()).obtenerEstado().datos);
  const t = await recargar();
  await t.borrarTodo();
  assert.equal(t.obtenerEstado().datos, null);
  assert.equal((await recargar()).obtenerEstado().datos, null);
});
