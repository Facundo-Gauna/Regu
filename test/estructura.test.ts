import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import * as A from '../src/datos/acciones.ts';
import { crearBackup, leerBackup, leerBackupTexto, serializarBackup } from '../src/datos/backup.ts';
import { AlmacenMemoria } from '../src/datos/almacen.ts';
import type { Cursada, DatosUsuario, Evaluacion } from '../src/motor/tipos.ts';
import { calcular, formatearContra, formatearTotal } from '../src/vista/estructura.ts';
import { aplicarPlantilla } from '../src/vista/plantillas.ts';

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

// ---------- Cálculo ----------

const U = { promocion: 7, regular: 6 };
const algebra = (n: (number | null)[]) => ({
  estructura: { partes: [{ id: '1', nombre: 'RA 1', peso: 1 }, { id: '2', nombre: 'RA 2', peso: 1 }, { id: '3', nombre: 'RA 3', peso: 1 }] },
  evaluaciones: [item('i1', '1', 80, n[0] ?? null), item('c1', '1', 20, n[1] ?? null), item('i2', '2', 70, n[2] ?? null), item('c2', '2', 30, n[3] ?? null), item('i3', '3', 100, n[4] ?? null)],
});

test('cada parte pondera sus ítems y el total pondera las partes', () => {
  const r = calcular(algebra([8, 6, 7, 7, 9]), U);
  assert.ok(Math.abs(r.partes[0]!.nota! - 7.6) < 1e-9);
  assert.ok(Math.abs(r.total! - (7.6 + 7 + 9) / 3) < 1e-9);
  assert.equal(r.promocion.estado, 'cumple');
  assert.equal(r.regular.estado, 'cumple');
});

test('exactamente la nota pedida alcanza, aunque la cuenta en coma flotante dé 6,999…', () => {
  const r = calcular(algebra([7, 7, 7, 7, 7]), U);
  assert.equal(r.promocion.estado, 'cumple');
  assert.equal(formatearContra(r.total!, 7), '7');
  assert.equal(formatearContra(6.999, 7), '6,99'); // nunca se muestra «7» cuando no llega
});

test('con partes sin cargar dice cuánto hace falta, sin concluir', () => {
  const r = calcular(algebra([8, 6, null, 7, null]), U);
  assert.equal(r.promocion.estado, 'pendiente');
  assert.match(r.promocion.detalles.join(' '), /necesitás/i);
  assert.equal(r.partes[1]!.estado, 'pendiente');
});

test('una parte completa por debajo del mínimo impide cumplir aunque el promedio dé', () => {
  const r = calcular(algebra([10, 10, 5, 5, 10]), U);
  assert.equal(r.partes[1]!.estado, 'desaprobada');
  assert.equal(r.promocion.estado, 'no-cumple');
  assert.match(r.promocion.detalles.join(' '), /RA 2/);
});

test('cuando ni con 10 alcanza, lo dice', () => {
  assert.equal(calcular(algebra([2, 2, 2, 2, null]), U).promocion.estado, 'no-cumple');
});

test('porcentajes que no suman 100 o a medio poner: avisa y no concluye', () => {
  const c = algebra([8, 8, 8, 8, 8]);
  c.evaluaciones[0]!.peso = 50;
  const r = calcular(c, U);
  assert.equal(r.promocion.estado, 'pendiente');
  assert.match(r.partes[0]!.aviso!, /70 %/);
  delete c.evaluaciones[0]!.peso;
  assert.match(calcular(c, U).partes[0]!.aviso!, /todas o en ninguna/);
});

test('sin porcentajes las evaluaciones de la parte valen igual; las que no tienen parte no cuentan', () => {
  const r = calcular({
    estructura: { partes: [{ id: '1', nombre: 'Notas', peso: 1 }] },
    evaluaciones: [{ id: 'a', nombre: 'a', tipo: 'otra', nota: 8, parte: '1' }, { id: 'b', nombre: 'b', tipo: 'otra', nota: 6, parte: '1' }, { id: 'x', nombre: 'x', tipo: 'otra', nota: 1 }, { id: 'y', nombre: 'y', tipo: 'otra', nota: 2, parte: 'borrada' }],
  }, U);
  assert.equal(r.total, 7);
  assert.deepEqual(r.sinParte.map(e => e.id), ['x', 'y']);
});

test('un recuperatorio ocupa el lugar y el peso de la que reemplaza', () => {
  const c = algebra([4, 6, 7, 7, 9]);
  c.evaluaciones.push({ id: 'r', nombre: 'Recu', tipo: 'recuperatorio', nota: 8, reemplazaA: 'i1' });
  const r = calcular(c, U);
  assert.ok(Math.abs(r.partes[0]!.nota! - 7.6) < 1e-9);
  assert.equal(r.partes[0]!.items[0]!.reemplazo?.id, 'r');
  assert.deepEqual(r.sinParte, []);
});

test('plantillas: la lista única adopta las notas que ya había; Análisis I suma 100', () => {
  const ya: Evaluacion[] = [{ id: 'p', nombre: 'Parcial 1', tipo: 'parcial', nota: 8 }];
  let n = 0;
  const lista = aplicarPlantilla('lista', ya, () => `x${n++}`);
  assert.equal(lista.evaluaciones.find(e => e.id === 'p')!.parte, lista.estructura.partes[0]!.id);
  const am = aplicarPlantilla('analisis-1', ya, () => `x${n++}`);
  assert.equal(am.evaluaciones.reduce((s, e) => s + (e.peso ?? 0), 0), 100);
  assert.equal(am.evaluaciones.find(e => e.id === 'p')!.parte, undefined);
  const al = aplicarPlantilla('algebra', [], () => `x${n++}`);
  assert.deepEqual(al.estructura.partes.map(p => p.nombre), ['RA 1', 'RA 2', 'RA 3']);
});

test('cargar una nota no mueve la evaluación de lugar', () => {
  const d = A.guardarEvaluacion(conEstructura(), M, C, item('a', 'ra1', 80, 9));
  assert.deepEqual(cursada(d).evaluaciones!.map(e => [e.id, e.nota]), [['a', 9], ['b', null]]);
});

test('el total se redondea normal, salvo que el redondeo haga parecer que llega a un umbral', () => {
  assert.equal(formatearTotal(23 / 3, U), '7,67');
  assert.equal(formatearTotal(6.999, U), '6,99');
  assert.equal(formatearTotal(5.999, U), '5,99');
});
