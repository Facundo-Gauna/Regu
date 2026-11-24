import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import * as A from '../src/datos/acciones.ts';
import { crearBackup, leerBackup, leerBackupTexto, serializarBackup } from '../src/datos/backup.ts';
import { AlmacenMemoria } from '../src/datos/almacen.ts';
import type { Cursada, DatosUsuario, Evaluacion } from '../src/motor/tipos.ts';

const M = 'fisica-2';
const C = '2026-2C';
const cursada = (d: DatosUsuario) => d.materias.find(x => x.materiaId === M)!.cursadas.find(x => x.id === C)!;
const item = (id: string, parte: string, peso: number, nota: number | null): Evaluacion => ({ id, nombre: id, tipo: 'otra', nota, parte, peso });
const conEstructura = () =>
  A.guardarEstructura(datosEjemplo(), M, C, { partes: [{ id: 'ra1', nombre: 'RA 1', peso: 1 }], minimoParte: 6 }, [item('a', 'ra1', 80, 8), item('b', 'ra1', 20, null)]);

test('la estructura sobrevive al backup y al almacén, y el sobre pasa a versión 2 solo si la hay', async () => {
  assert.equal(crearBackup(datosEjemplo()).schemaVersion, 1);
  const d = conEstructura();
  assert.equal(crearBackup(d).schemaVersion, 2);
  const r = leerBackupTexto(serializarBackup(crearBackup(d)));
  assert.ok(r.ok, r.ok ? '' : r.errores.join('\n'));
  assert.deepEqual(r.datos, d);
  assert.deepEqual(await new AlmacenMemoria(d).cargarUsuario(), d);
});

test('declarar el resultado de la cursada conserva la estructura', () => {
  const d = A.agregarCursada(conEstructura(), M, { ciclo: 2026, cuatrimestre: '2C', resultado: 'regular', fechaResultado: '2026-11-20' });
  assert.equal(cursada(d).estructura?.partes[0]?.nombre, 'RA 1');
  assert.equal(cursada(d).evaluaciones?.[0]?.parte, 'ra1');
});

test('quitar la estructura no borra ninguna evaluación', () => {
  const antes = cursada(conEstructura()).evaluaciones!;
  const d = A.guardarEstructura(conEstructura(), M, C, null, antes);
  assert.equal(cursada(d).estructura, undefined);
  assert.deepEqual(cursada(d).evaluaciones!.map(e => [e.id, e.nota, e.parte, e.peso]), [['a', 8, undefined, undefined], ['b', null, undefined, undefined]]);
  assert.equal(crearBackup(d).schemaVersion, 1);
});

test('una estructura a medias o dañada no impide leer los datos guardados', () => {
  const base = crearBackup(conEstructura()) as unknown as { datos: { materias: { materiaId: string; cursadas: Record<string, unknown>[] }[] } };
  const c = base.datos.materias.find(x => x.materiaId === M)!.cursadas.find(x => x['id'] === C)!;
  c['estructura'] = { partes: [{ id: 'ra1', nombre: 'RA 1', peso: -3 }, { id: 'ra1', nombre: 'repetida', peso: 1 }, { nombre: 'sin id' }, 7], minimoParte: 40 };
  (c['evaluaciones'] as Record<string, unknown>[])[0]!['peso'] = 'mucho';
  const r = leerBackup(base);
  assert.ok(r.ok, r.ok ? '' : r.errores.join('\n'));
  const leida = r.datos.materias.find(x => x.materiaId === M)!.cursadas.find(x => x.id === C) as Cursada;
  assert.deepEqual(leida.estructura, { partes: [{ id: 'ra1', nombre: 'RA 1', peso: 1 }] });
  assert.equal(leida.evaluaciones![0]!.peso, undefined);
});
