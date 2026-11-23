import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validar, validarCalendario, validarPlan } from '../src/datos/validar.ts';
import { calendario, plan } from './ayuda.ts';

const clon = <T>(x: T): T => structuredClone(x);

test('los datos de referencia reales no tienen errores', () => {
  assert.deepEqual(validarPlan(plan).errores, []);
  assert.deepEqual(validarCalendario(calendario).errores, []);
  assert.equal(validar(plan).tipo, 'plan');
  assert.equal(validar(calendario).tipo, 'calendario');
});

test('plan roto: detecta ciclo, referencia inexistente, número duplicado y "todas" en una electiva', () => {
  const p = clon(plan);
  p.materias[0]!.correlativas.cursar.regularizadas = ['analisis-matematico-2']; // AM1 ↔ AM2
  p.materias[1]!.correlativas.rendir.aprobadas = ['no-existe'];
  p.materias[2]!.numero = 1;
  p.electivas[0]!.correlativas.rendir.aprobadas = 'todas';
  const { errores } = validarPlan(p);
  assert.equal(errores.length, 4, errores.join('\n'));
  assert.ok(errores.some(e => /ciclo de correlativas/.test(e)));
  assert.ok(errores.some(e => /'no-existe' no existe/.test(e)));
  assert.ok(errores.some(e => /número 1 repetido/.test(e)));
  assert.ok(errores.some(e => /electiva no puede exigir 'todas'/.test(e)));
});

test('plan: correlativa a un paquete, a sí misma, id duplicado y nivel fuera de rango', () => {
  const p = clon(plan);
  p.materias[3]!.correlativas.cursar.aprobadas = ['electivas-nivel-3'];
  p.materias[4]!.correlativas.cursar.aprobadas = [p.materias[4]!.id];
  p.materias[5]!.id = p.materias[6]!.id;
  p.materias[7]!.nivel = 9;
  const { errores } = validarPlan(p);
  assert.ok(errores.some(e => /es un paquete/.test(e)));
  assert.ok(errores.some(e => /correlativa de sí misma/.test(e)));
  assert.ok(errores.some(e => /id duplicado/.test(e)));
  assert.ok(errores.some(e => /nivel 9 fuera de/.test(e)));
});

test('entradas que no son planes no rompen el validador', () => {
  assert.ok(validarPlan(null).errores.length > 0);
  assert.ok(validarPlan([]).errores.length > 0);
  assert.ok(validarPlan({}).errores.length > 0);
  assert.ok(validarPlan({ ...plan, materias: 'x' }).errores.length > 0);
  assert.ok(validarPlan({ ...plan, materias: [null] }).errores.length > 0); // estructura inválida, no excepción
  assert.equal(validar({ tipo: 'otra-cosa' }).tipo, null);
});

test('calendario roto: fechas inválidas, rangos invertidos y cuatrimestre fuera de ciclo', () => {
  const c = clon(calendario);
  c.periodosExamen[0]!.desde = '2026-02-30';
  c.periodosExamen[1]!.hasta = '2026-01-01';
  c.cuatrimestres[0]!.fin = '2028-01-01';
  c.feriados.push({ fecha: c.feriados[0]!.fecha, nombre: 'Duplicado' });
  const { errores } = validarCalendario(c);
  assert.ok(errores.some(e => /fecha 'desde' inválida/.test(e)));
  assert.ok(errores.some(e => /posterior a/.test(e)));
  assert.ok(errores.some(e => /fuera del ciclo/.test(e)));
  assert.ok(errores.some(e => /duplicado/.test(e)));
});
