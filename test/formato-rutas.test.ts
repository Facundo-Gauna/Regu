import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diasEntre, fechaCorta, fechaLarga, nombreCuatrimestre, plural, rango, relativo } from '../src/vista/formato.ts';
import { enlaces, parseRuta, pestaña } from '../src/vista/rutas.ts';

test('formato de fechas en español, sin depender de la zona horaria', () => {
  const antes = process.env['TZ'];
  for (const tz of ['America/Argentina/Cordoba', 'Pacific/Auckland', 'UTC']) {
    process.env['TZ'] = tz;
    assert.equal(fechaLarga('2026-11-23'), 'lunes 23 de noviembre', tz);
    assert.equal(fechaCorta('2026-11-23'), '23/11/2026', tz);
  }
  if (antes === undefined) delete process.env['TZ'];
  else process.env['TZ'] = antes;
});

test('rangos, días y relativos', () => {
  assert.equal(rango('2026-12-10', '2026-12-18'), '10/12 – 18/12/2026');
  assert.equal(rango('2026-12-20', '2027-01-08'), '20/12/2026 – 08/01/2027');
  assert.equal(rango('2026-12-10', '2026-12-10'), '10/12/2026');
  assert.equal(diasEntre('2026-11-23', '2026-12-10'), 17);
  assert.equal(diasEntre('2026-12-31', '2027-01-01'), 1); // cruza el año
  assert.equal(relativo('2026-11-23', '2026-11-23'), 'hoy');
  assert.equal(relativo('2026-11-24', '2026-11-23'), 'mañana');
  assert.equal(relativo('2026-11-28', '2026-11-23'), 'en 5 días');
  assert.equal(relativo('2026-11-20', '2026-11-23'), 'hace 3 días');
  assert.equal(plural(1, 'aplazo', 'aplazos'), '1 aplazo');
  assert.equal(plural(3, 'aplazo', 'aplazos'), '3 aplazos');
  assert.equal(nombreCuatrimestre('2C'), '2.º cuatrimestre');
});

test('rutas: parseo y enlaces de ida y vuelta', () => {
  assert.deepEqual(parseRuta(''), { nombre: 'inicio' });
  assert.deepEqual(parseRuta('#/'), { nombre: 'inicio' });
  assert.deepEqual(parseRuta('#/plan'), { nombre: 'plan' });
  assert.deepEqual(parseRuta('#/plan?sel=paradigmas-programacion'), { nombre: 'plan', seleccion: 'paradigmas-programacion' });
  assert.deepEqual(parseRuta(enlaces.plan('fisica-2')), { nombre: 'plan', seleccion: 'fisica-2' });
  assert.deepEqual(parseRuta('#/materias'), { nombre: 'materias', filtro: 'todas' });
  assert.deepEqual(parseRuta('#/materias?f=habilitadas'), { nombre: 'materias', filtro: 'habilitadas' });
  assert.deepEqual(parseRuta('#/materias?f=inventado'), { nombre: 'materias', filtro: 'todas' });
  assert.deepEqual(parseRuta('#/materia/analisis-matematico-1'), { nombre: 'materia', id: 'analisis-matematico-1' });
  assert.deepEqual(parseRuta('#/materia/'), { nombre: 'materias', filtro: 'todas' });
  assert.deepEqual(parseRuta('#/cosa-rara'), { nombre: 'inicio' });
  for (const e of [enlaces.materias('rendir'), enlaces.materia('fisica-1'), enlaces.plan(), enlaces.finales(), enlaces.calendario(), enlaces.progreso(), enlaces.ajustes(), enlaces.mas(), enlaces.inicio()]) {
    assert.deepEqual(parseRuta(enlaces.materias('rendir')), { nombre: 'materias', filtro: 'rendir' });
    assert.ok(parseRuta(e).nombre);
  }
});

test('rutas: cada pantalla pertenece a una pestaña de la navegación', () => {
  assert.equal(pestaña(parseRuta('#/materia/fisica-1')), 'materias');
  assert.equal(pestaña(parseRuta('#/calendario')), 'mas');
  assert.equal(pestaña(parseRuta('#/progreso')), 'mas');
  assert.equal(pestaña(parseRuta('#/ajustes')), 'mas');
  assert.equal(pestaña(parseRuta('#/finales')), 'finales');
});

test('ruta de carga rápida: sola, con materia y con parte', () => {
  assert.deepEqual(parseRuta('#/cargar'), { nombre: 'cargar' });
  assert.deepEqual(parseRuta('#/cargar?m=fisica-2'), { nombre: 'cargar', materiaId: 'fisica-2' });
  assert.deepEqual(parseRuta('#/cargar?m=fisica-2&p=ra%201'), { nombre: 'cargar', materiaId: 'fisica-2', parte: 'ra 1' });
  assert.equal(enlaces.cargar('fisica-2', 'ra 1'), '#/cargar?m=fisica-2&p=ra%201');
  assert.equal(enlaces.cargar(), '#/cargar');
});

test('ruta de Contanos, con el contexto del aviso', () => {
  const ctx = { desde: 'regla' as const, titulo: 'Dudas sobre esta regla & más', materiaId: 'am1' };
  assert.deepEqual(parseRuta(enlaces.contanos(ctx)), { nombre: 'contanos', ...ctx });
  assert.deepEqual(parseRuta(enlaces.contanos()), { nombre: 'contanos' });
  assert.deepEqual(parseRuta('#/contanos?d=otra&t=x&m=am1'), { nombre: 'contanos' });
  assert.equal(pestaña({ nombre: 'contanos' }), 'mas');
});
