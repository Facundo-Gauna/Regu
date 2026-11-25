import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import * as A from '../src/datos/acciones.ts';
import { crearBackup, leerBackup } from '../src/datos/backup.ts';
import { calcular } from '../src/vista/estructura.ts';
import { seguimientoCursada, veredictoCriterio } from '../src/vista/seguimiento.ts';
import type { CriterioAprobacion, DatosUsuario, Evaluacion } from '../src/motor/tipos.ts';

const M = 'fisica-2';
const C = '2026-2C';
const cursada = (d: DatosUsuario) => d.materias.find(x => x.materiaId === M)!.cursadas.find(x => x.id === C)!;
const ev = (id: string, nota: number | null, extra: Partial<Evaluacion> = {}): Evaluacion => ({ id, nombre: id, tipo: 'parcial', nota, ...extra });
const cada: CriterioAprobacion = { promocion: { cadaInstanciaMin: 8 }, regular: { cadaInstanciaMin: 6 }, instancias: 3 };
const promedio: CriterioAprobacion = { promocion: { promedioMin: 8 }, regular: { promedioMin: 6 }, instancias: 3 };

test('con las mismas notas, «cada una» y «el promedio» dan resultados distintos', () => {
  const evaluaciones = [ev('a', 10), ev('b', 10), ev('c', 5)];
  const con = (criterio: CriterioAprobacion) => veredictoCriterio(seguimientoCursada({ evaluaciones, criterio }), criterio);
  assert.deepEqual([con(cada).promocion.estado, con(cada).regular.estado], ['no-cumple', 'no-cumple']);
  assert.deepEqual([con(promedio).promocion.estado, con(promedio).regular.estado], ['cumple', 'cumple']);
});

test('el criterio manda sobre la regla general, colorea las notas, sobrevive al backup y a declarar el resultado', () => {
  const d = A.fijarCriterio(datosEjemplo(), M, C, { promocion: { cadaInstanciaMin: 7, promedioMin: 9 }, regular: { promedioMin: 4 } });
  const s = seguimientoCursada(cursada(d));
  assert.deepEqual([s.umbrales.promocion, s.umbrales.regular, s.origenUmbrales], [9, 4, 'usuario']);
  assert.equal(crearBackup(d).schemaVersion, 2);
  const r = leerBackup(crearBackup(d));
  assert.ok(r.ok);
  assert.deepEqual(cursada(r.datos).criterio, cursada(d).criterio);
  const cerrada = A.agregarCursada(d, M, { ciclo: 2026, cuatrimestre: '2C', resultado: 'regular', fechaResultado: '2026-11-20' });
  assert.deepEqual(cursada(cerrada).criterio, cursada(d).criterio);
  const sin = A.fijarCriterio(d, M, C, null);
  assert.equal(cursada(sin).criterio, undefined);
  assert.equal(seguimientoCursada(cursada(sin)).origenUmbrales, 'general');
});

test('por partes: se puede pedir cada nota, solo el promedio, y apagar el mínimo por parte', () => {
  const base = {
    estructura: { partes: [{ id: '1', nombre: 'RA 1', peso: 1 }, { id: '2', nombre: 'RA 2', peso: 1 }] },
    evaluaciones: [ev('a', 10, { parte: '1' }), ev('b', 5, { parte: '2' })],
  };
  const U = { promocion: 7, regular: 6 };
  assert.equal(calcular(base, U).promocion.estado, 'no-cumple'); // RA 2 no llega a 6
  const sinMinimo = { ...base, estructura: { ...base.estructura, sinMinimo: true } };
  assert.equal(calcular(sinMinimo, U).promocion.estado, 'cumple');
  assert.equal(calcular(sinMinimo, U, { promocion: { cadaInstanciaMin: 7 }, regular: { cadaInstanciaMin: 4 } }).promocion.estado, 'no-cumple');
});

test('un criterio dañado en lo guardado se ignora sin romper la lectura', () => {
  const b = crearBackup(datosEjemplo()) as unknown as { datos: { materias: { materiaId: string; cursadas: Record<string, unknown>[] }[] } };
  b.datos.materias.find(x => x.materiaId === M)!.cursadas.find(x => x['id'] === C)!['criterio'] = { promocion: 'mucho', regular: { promedioMin: 40 } };
  const r = leerBackup(b);
  assert.ok(r.ok);
  assert.equal(cursada(r.datos).criterio, undefined);
});
