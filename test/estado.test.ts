import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto } from '../src/motor/contexto.ts';
import { aplazo, aprobada, ausente, calendario, cursada, nivelesAprobados, plan, regular, usuario } from './ayuda.ts';
import type { DatosMateriaUsuario } from '../src/motor/tipos.ts';

const estadoDe = (materias: DatosMateriaUsuario[], id: string, fecha: string) =>
  crearContexto(plan, calendario, usuario(materias), fecha).estados.get(id)!;

test('sin datos: no cursada', () => {
  assert.equal(estadoDe([], 'analisis-matematico-1', '2026-11-23').estado, 'no-cursada');
});

test('cursando y regular según la fecha de cierre', () => {
  const am1 = { materiaId: 'analisis-matematico-1', cursadas: [cursada(2026, '1C', 'regular')], finales: [] };
  assert.equal(estadoDe([am1], 'analisis-matematico-1', '2026-05-01').estado, 'cursando');
  assert.equal(estadoDe([am1], 'analisis-matematico-1', '2026-07-03').estado, 'regular');
});

test('escenario 9: 3 aplazos y 2 ausentes → sigue regular (los ausentes no cuentan)', () => {
  const am2 = regular('analisis-matematico-2', 2026, '1C', [
    aplazo('2026-07-22'), ausente('2026-08-05'), aplazo('2026-12-11'), ausente('2027-02-03'), aplazo('2027-02-17'),
  ]);
  const info = estadoDe([am2], 'analisis-matematico-2', '2027-03-01');
  assert.equal(info.estado, 'regular');
  assert.equal(info.aplazos, 3);
});

test('escenario 8: 4 aplazos → recursar', () => {
  const am2 = regular('analisis-matematico-2', 2026, '1C', [
    aplazo('2026-07-22'), aplazo('2026-08-05'), aplazo('2026-12-11'), aplazo('2027-02-17'),
  ]);
  const info = estadoDe([am2], 'analisis-matematico-2', '2027-03-01');
  assert.equal(info.estado, 'recursar');
  assert.equal(info.motivoRecursar, 'aplazos');
  // Antes del cuarto aplazo seguía regular
  assert.equal(estadoDe([am2], 'analisis-matematico-2', '2027-02-16').estado, 'regular');
});

test('recursar y regularizar de nuevo reinicia los aplazos', () => {
  const am2: DatosMateriaUsuario = {
    materiaId: 'analisis-matematico-2',
    cursadas: [cursada(2026, '1C', 'regular'), cursada(2027, '1C', 'regular')],
    finales: [aplazo('2026-07-22'), aplazo('2026-08-05'), aplazo('2026-12-11'), aplazo('2027-02-17'), aplazo('2027-07-21')],
  };
  const info = estadoDe([am2], 'analisis-matematico-2', '2027-08-01');
  assert.equal(info.estado, 'regular');
  assert.equal(info.aplazos, 1);
});

test('excepción de última materia: con 4 aplazos sigue pudiendo rendir', () => {
  const todas = plan.materias.filter(m => m.id !== 'gestion-gerencial').map(m => aprobada(m.id, '2030-12-10'));
  const gg = regular('gestion-gerencial', 2030, '1C', [aplazo('2030-07-22'), aplazo('2030-08-05'), aplazo('2030-12-11'), aplazo('2031-02-17')]);
  const info = estadoDe([...todas, gg], 'gestion-gerencial', '2031-03-01');
  assert.equal(info.estado, 'regular');
  assert.match(info.razones.join(' '), /8\.2\.7/);
});

test('final aprobado y aprobación directa', () => {
  const fin = regular('fisica-1', 2026, '2C', [aplazo('2026-12-11'), { fecha: '2027-02-17', resultado: 'aprobado', nota: 8 }]);
  const info = estadoDe([fin], 'fisica-1', '2027-03-01');
  assert.equal(info.estado, 'aprobada');
  assert.equal(info.forma, 'final');
  assert.equal(info.nota, 8);

  const ad = aprobada('algebra-geometria-analitica', '2026-07-03', 9, 'directa');
  const infoAd = estadoDe([ad], 'algebra-geometria-analitica', '2026-08-01');
  assert.equal(infoAd.estado, 'aprobada');
  assert.equal(infoAd.forma, 'directa');
  // Antes de la fecha de aprobación no está aprobada
  assert.notEqual(estadoDe([ad], 'algebra-geometria-analitica', '2026-06-01').estado, 'aprobada');
});

test('cursada con aprobación directa sin nota cargada: pendiente de registrar en mesa', () => {
  const ad = { materiaId: 'ingles-1', cursadas: [cursada(2026, 'anual', 'aprobada-directa')], finales: [] };
  const info = estadoDe([ad], 'ingles-1', '2026-12-01');
  assert.equal(info.estado, 'aprobada');
  assert.equal(info.pendienteRegistrarMesa, true);
});

test('libre → recursar', () => {
  const libre = { materiaId: 'fisica-1', cursadas: [cursada(2026, '2C', 'libre')], finales: [] };
  const info = estadoDe([libre], 'fisica-1', '2026-12-01');
  assert.equal(info.estado, 'recursar');
  assert.equal(info.motivoRecursar, 'libre');
});

test('la corrección manual tiene prioridad', () => {
  const am1: DatosMateriaUsuario = {
    ...regular('analisis-matematico-1', 2026, '1C'),
    correccion: { estado: 'aprobada', motivo: 'La cátedra redondeó el promedio', fecha: '2026-07-10' },
  };
  const info = estadoDe([am1], 'analisis-matematico-1', '2026-08-01');
  assert.equal(info.estado, 'aprobada');
  assert.equal(info.corregido, true);
});

test('los hechos futuros no afectan el estado', () => {
  const datos = nivelesAprobados([1], '2026-12-15');
  assert.equal(estadoDe(datos, 'fisica-1', '2026-12-14').estado, 'regular');
  assert.equal(estadoDe(datos, 'fisica-1', '2026-12-15').estado, 'aprobada');
});
