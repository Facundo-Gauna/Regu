import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diaSemana, restarDiasHabiles, sumarAnios, esFechaValida } from '../src/motor/fechas.ts';
import { ConsultaCalendario } from '../src/motor/calendario.ts';
import { calendario } from './ayuda.ts';

const cal = new ConsultaCalendario(calendario);

test('fechas: validación y aritmética', () => {
  assert.equal(esFechaValida('2026-02-30'), false);
  assert.equal(esFechaValida('2026-12-15'), true);
  assert.equal(diaSemana('2026-12-15'), 2); // martes
  assert.equal(sumarAnios('2026-03-12', 1), '2027-03-12');
  assert.equal(sumarAnios('2028-02-29', 1), '2029-02-28');
});

test('días hábiles: saltea fines de semana y feriados', () => {
  const feriados = new Set(['2026-12-07', '2026-12-08']);
  // Mesa miércoles 9/12: martes 8 y lunes 7 son feriados → viernes 4 (1), jueves 3 (2)
  assert.equal(restarDiasHabiles('2026-12-09', 2, feriados), '2026-12-03');
  assert.equal(restarDiasHabiles('2026-12-15', 2, feriados), '2026-12-11');
});

test('escenario 10: cierre de inscripción a 48 h hábiles', () => {
  // Mesa martes 15/12/2026 → cierra el viernes 11/12; el lunes 14 ya está cerrada.
  const cierre = cal.cierreInscripcionFinal('2026-12-15');
  assert.equal(cierre, '2026-12-11');
  assert.ok('2026-12-14' > cierre);
});

test('ciclo lectivo de una fecha', () => {
  assert.equal(cal.cicloDe('2026-03-13'), 2025); // último día del ciclo 2025
  assert.equal(cal.cicloDe('2026-03-14'), 2026); // entre ciclos: cuenta para el siguiente
  assert.equal(cal.cicloDe('2026-12-10'), 2026);
  assert.equal(cal.cicloDe('2027-03-12'), 2026);
  assert.equal(cal.cicloDe('2027-03-13'), 2027);
  assert.equal(cal.cicloDe('2028-07-15'), 2028);
});

test('fin de ciclo conocido y estimado', () => {
  assert.deepEqual(cal.finCiclo(2026), { fin: '2027-03-12', estimado: false });
  assert.deepEqual(cal.finCiclo(2027), { fin: '2028-03-12', estimado: true });
  const r = cal.rangoCiclo(2026);
  assert.equal(r.inicio, '2026-03-16');
  assert.equal(r.fin, '2027-03-12');
});

test('inscripciones a finales abiertas', () => {
  // 9/12/2026 abre la inscripción del turno de diciembre (10 al 18/12)
  const abiertas = cal.periodosConInscripcionAbierta('2026-12-09').map(p => p.id);
  assert.deepEqual(abiertas, ['2026-12-a']);
  assert.deepEqual(cal.periodosConInscripcionAbierta('2026-11-23'), []);
  assert.equal(cal.proximoPeriodo('2026-11-23')?.id, '2026-12-a');
});

test('ventana de inscripción a cursado estimada', () => {
  const v = cal.ventanaInscripcionCursado(2026, '2C');
  assert.deepEqual(v, { desde: '2026-07-27', hasta: '2026-08-24', estimada: true, inicioCursado: '2026-08-10' });
});

test('calendario del usuario: agrega 2027 y reemplaza por id sin tocar el original', async () => {
  const { aplicarCalendarioUsuario } = await import('../src/motor/calendario.ts');
  const extra = {
    ciclosLectivos: [{ id: 2027, inicio: '2027-03-15', fin: '2028-03-10' }],
    cuatrimestres: [
      { id: '2027-1c', ciclo: 2027, cuatrimestre: '1C' as const, inicio: '2027-03-15', fin: '2027-07-02', inscripcion: { desde: '2027-03-01', hasta: '2027-03-26' } },
      { id: '2026-2c', ciclo: 2026, cuatrimestre: '2C' as const, inicio: '2026-08-10', fin: '2026-11-30' },
    ],
  };
  const fusion = aplicarCalendarioUsuario(calendario, extra);
  const c = new ConsultaCalendario(fusion);
  // Fin de ciclo 2027 ahora es conocido; antes se estimaba
  assert.deepEqual(c.finCiclo(2027), { fin: '2028-03-10', estimado: false });
  // La ventana de inscripción cargada es confirmada, no estimada
  assert.deepEqual(c.ventanaInscripcionCursado(2027, '1C'), { desde: '2027-03-01', hasta: '2027-03-26', estimada: false, inicioCursado: '2027-03-15' });
  // El 2C 2026 se reemplazó (misma id) y no se duplicó
  assert.equal(fusion.cuatrimestres.filter(q => q.id === '2026-2c').length, 1);
  assert.equal(fusion.cuatrimestres.find(q => q.id === '2026-2c')?.fin, '2026-11-30');
  // El original no cambió
  assert.equal(calendario.cuatrimestres.find(q => q.id === '2026-2c')?.fin, '2026-11-27');
  assert.equal(calendario.cuatrimestres.length, 2);
  // Próxima inscripción a cursado ahora aparece
  assert.equal(c.proximaInscripcionCursado('2026-12-01')?.ciclo, 2027);
});

test('calendario del usuario: llega al motor a través de evaluar()', async () => {
  const { evaluar } = await import('../src/motor/index.ts');
  const { plan, usuario } = await import('./ayuda.ts');
  const datos = usuario([], { calendario: { cuatrimestres: [{ id: '2027-1c', ciclo: 2027, cuatrimestre: '1C', inicio: '2027-03-15', fin: '2027-07-02' }] } });
  const r = evaluar(plan, calendario, datos, '2027-02-20');
  assert.equal(r.calendario.proximaInscripcionCursado?.ciclo, 2027);
  assert.equal(r.calendario.proximaInscripcionCursado?.estimada, true);
});
