import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import * as A from '../src/datos/acciones.ts';
import { periodoFijo, periodosInvalidos } from '../src/vista/periodo.ts';
import { admitePracticaPromocionada } from '../src/vista/resultados.ts';
import { plan, usuario } from './ayuda.ts';

const item = (id: string) => [...plan.materias, ...plan.electivas].find(x => x.id === id)!;

test('el período queda fijo cuando lo dicen el plan o los horarios; si se infirió, se puede elegir', () => {
  assert.equal(periodoFijo(item('algoritmos-estructuras-datos')), 'anual');
  assert.equal(periodoFijo(item('fisica-1')), '2C');
  const inferido = [...plan.materias, ...plan.electivas].find(x => x.regimenOrigen === 'inferido')!;
  assert.equal(periodoFijo(inferido), null);
});

test('detecta cursadas cargadas en un período en que la materia no se dicta; los datos de ejemplo no tienen ninguna', () => {
  assert.deepEqual(periodosInvalidos(datosEjemplo(), plan), []);
  let d = usuario([]);
  d = A.agregarCursada(d, 'algoritmos-estructuras-datos', { ciclo: 2026, cuatrimestre: '1C', resultado: 'cursando' });
  d = A.agregarCursada(d, 'fisica-1', { ciclo: 2026, cuatrimestre: '2C', resultado: 'cursando' });
  assert.deepEqual(periodosInvalidos(d, plan), [{ materiaId: 'algoritmos-estructuras-datos', cursadaId: '2026-1C', actual: '1C', correcto: 'anual' }]);
});

test('corregir el período conserva notas y resultado, y no pisa otra cursada', () => {
  let d = usuario([]);
  d = A.agregarCursada(d, 'algoritmos-estructuras-datos', { ciclo: 2026, cuatrimestre: '1C', resultado: 'cursando', evaluaciones: [{ id: 'p', nombre: 'P1', tipo: 'parcial', nota: 8 }] });
  const ok = A.corregirPeriodo(d, 'algoritmos-estructuras-datos', '2026-1C', 'anual');
  const c = ok.materias[0]!.cursadas;
  assert.deepEqual(c.map(x => [x.id, x.cuatrimestre, x.evaluaciones?.[0]?.nota]), [['2026-anual', 'anual', 8]]);
  const doble = A.agregarCursada(d, 'algoritmos-estructuras-datos', { ciclo: 2026, cuatrimestre: 'anual', resultado: 'cursando' });
  assert.equal(A.corregirPeriodo(doble, 'algoritmos-estructuras-datos', '2026-1C', 'anual').materias[0]!.cursadas.length, 2);
});

test('la práctica promocionada solo aplica a las materias que la tienen', () => {
  assert.ok(admitePracticaPromocionada('fisica-2'));
  assert.ok(!admitePracticaPromocionada('algoritmos-estructuras-datos'));
});
