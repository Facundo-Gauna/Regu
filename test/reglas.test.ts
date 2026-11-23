// Reglas de cátedra de 1.er año: el archivo es válido y «qué te falta» responde según las frases de cada planificación.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Evaluacion, ReglaCursada } from '../src/motor/tipos.ts';
import { validarReglas } from '../src/datos/validar.ts';
import { queFalta, seguimientoCursada, umbralesDeRegla } from '../src/vista/seguimiento.ts';
import { plan } from './ayuda.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const archivo = JSON.parse(readFileSync(join(raiz, 'datos/reglas/utn-frvm-isi-2026.json'), 'utf8'));
const reglas: ReglaCursada[] = archivo.reglas;
const regla = (id: string) => reglas.find(r => r.materiaId === id)!;

let n = 0;
const ev = (nombre: string, nota: number | null, tipo: Evaluacion['tipo'] = 'parcial'): Evaluacion => ({ id: `e${++n}`, nombre, tipo, nota });
const falta = (id: string, evaluaciones: Evaluacion[]) => queFalta(seguimientoCursada({ evaluaciones }, regla(id)), regla(id));

test('el archivo de reglas es válido contra el plan y cubre las 8 materias de 1.er año', () => {
  const v = validarReglas(archivo, plan);
  assert.deepEqual(v.errores, []);
  const primero = plan.materias.filter(m => m.nivel === 1).map(m => m.id).sort();
  assert.deepEqual(reglas.map(r => r.materiaId).sort(), primero);
});

test('el validador rechaza una materia inexistente, un mínimo fuera de rango y una regla de notas sin mínimos', () => {
  const mala = { ...archivo, reglas: [
    { ...regla('ingles-1'), materiaId: 'no-existe' },
    { ...regla('ingles-1'), materiaId: 'fisica-1', regular: { cadaInstanciaMin: 11 } },
    { ...regla('ingles-1'), materiaId: 'logica-estructuras-discretas', promocion: undefined, regular: undefined },
  ] };
  const e = validarReglas(mala, plan).errores.join('\n');
  assert.match(e, /no existe.*no está en el plan|no-existe: la materia no está en el plan/);
  assert.match(e, /fisica-1: regular\.cadaInstanciaMin debe estar entre 1 y 10/);
  assert.match(e, /necesita promocion o regular/);
});

test('Inglés I: «aprueban las tres instancias con 8» → promoción; con un 7 queda regular pero no promociona', () => {
  const todas8 = falta('ingles-1', [ev('Instancia 1', 8), ev('Instancia 2', 9), ev('Instancia 3', 8)]);
  assert.equal(todas8.promocion!.estado, 'cumple');
  assert.equal(todas8.regular!.estado, 'cumple');

  const unSiete = falta('ingles-1', [ev('Instancia 1', 8), ev('Instancia 2', 7), ev('Instancia 3', 9)]);
  assert.equal(unSiete.promocion!.estado, 'no-cumple');
  assert.match(unSiete.promocion!.detalles[0]!, /Instancia 2 \(7\)/);
  assert.equal(unSiete.regular!.estado, 'cumple');
});

test('Inglés I: con dos instancias cargadas lo que falta queda pendiente, no cumplido', () => {
  const r = falta('ingles-1', [ev('Instancia 1', 8), ev('Instancia 2', 8)]);
  assert.equal(r.promocion!.estado, 'pendiente');
  assert.match(r.promocion!.detalles[0]!, /te falta 1 instancia/);
});

test('Inglés I: un recuperatorio con nota reemplaza a la instancia y la condición se recalcula', () => {
  const i2 = ev('Instancia 2', 5);
  const rec: Evaluacion = { id: 'rec', nombre: 'Recuperatorio', tipo: 'recuperatorio', nota: 8, reemplazaA: i2.id };
  const r = falta('ingles-1', [ev('Instancia 1', 8), i2, ev('Instancia 3', 8), rec]);
  assert.equal(r.promocion!.estado, 'cumple');
});

test('Física I: cada parcial en 6 o más y promedio 7 → directa; promedio 6,5 → solo regular', () => {
  const directa = falta('fisica-1', [ev('Parcial 1', 7), ev('Parcial 2', 7)]);
  assert.equal(directa.promocion!.estado, 'cumple');

  const regular = falta('fisica-1', [ev('Parcial 1', 6), ev('Parcial 2', 7)]);
  assert.equal(regular.promocion!.estado, 'no-cumple'); // promedio 6,5 < 7
  assert.equal(regular.regular!.estado, 'cumple');
});

test('Física I: «Ningún parcial aprobado» (5 y 4) → ni regular ni directa por notas', () => {
  const r = falta('fisica-1', [ev('Parcial 1', 5), ev('Parcial 2', 4)]);
  assert.equal(r.promocion!.estado, 'no-cumple');
  assert.equal(r.regular!.estado, 'no-cumple');
});

test('Física I: con el primer parcial en 8 y falta el segundo, dice cuánto necesitás para el promedio', () => {
  const r = falta('fisica-1', [ev('Parcial 1', 8)]);
  assert.equal(r.promocion!.estado, 'pendiente');
  assert.match(r.promocion!.detalles.join(' '), /promedio de 7 o más necesitás al menos 6 en la instancia que falta/);
  const r2 = falta('fisica-1', [ev('Parcial 1', 2)]);
  assert.equal(r2.promocion!.estado, 'no-cumple'); // 2 < 6 en una instancia
});

test('Física I: la asistencia y los laboratorios se devuelven como «dependen de vos», no se deciden con notas', () => {
  const r = falta('fisica-1', [ev('Parcial 1', 9), ev('Parcial 2', 9)]);
  assert.ok(r.dependeDeVos.some(t => /80 %/.test(t)));
  assert.ok(r.dependeDeVos.some(t => /laboratorio/.test(t)));
});

test('Arquitectura: «mayor a seis» se muestra como «más de 6»; con una sola nota queda pendiente porque no se sabe cuántas hay', () => {
  const r = falta('arquitectura-computadoras', [ev('Nota final', 6)]);
  assert.equal(r.regular!.estado, 'pendiente'); // no se sabe cuántas notas hay, no se afirma
  assert.match(r.regular!.detalles[0]!, /más de 6/);
  assert.ok(regla('arquitectura-computadoras').verificar.length > 0);
});

test('Lógica: dos instancias, 8 y 8 → promoción; 8 y 6 → solo regular', () => {
  assert.equal(falta('logica-estructuras-discretas', [ev('Instancia 1', 8), ev('Instancia 2', 8)]).promocion!.estado, 'cumple');
  const r = falta('logica-estructuras-discretas', [ev('Instancia 1', 8), ev('Instancia 2', 6)]);
  assert.equal(r.promocion!.estado, 'no-cumple');
  assert.equal(r.regular!.estado, 'cumple');
});

test('Sistemas y Procesos: tres instancias y el TPI cuentan como cuatro notas', () => {
  const r = falta('sistemas-procesos-negocio', [ev('Inst. 1', 8), ev('Inst. 2', 9), ev('Inst. 3', 8), ev('TPI', 8, 'tp')]);
  assert.equal(r.promocion!.estado, 'cumple');
  assert.ok(r.dependeDeVos.some(t => /desafíos/.test(t)));
});

test('sin notas cargadas todo queda pendiente y se explica qué se pide', () => {
  const r = falta('ingles-1', []);
  assert.equal(r.promocion!.estado, 'pendiente');
  assert.match(r.promocion!.detalles[0]!, /Todavía no cargaste notas/);
});

test('las reglas de texto (AED, AM I, AGA) no se calculan: solo se muestran', () => {
  for (const id of ['algoritmos-estructuras-datos', 'analisis-matematico-1', 'algebra-geometria-analitica']) {
    const r = falta(id, [ev('Parcial 1', 9)]);
    assert.equal(r.calculable, false, id);
    assert.equal(r.promocion, undefined, id);
    assert.ok(regla(id).verificar.length > 0, `${id} lleva dudas`);
  }
});

test('Análisis Matemático I conserva la contradicción «promedio 6(siete)» como duda, sin elegir', () => {
  assert.ok(regla('analisis-matematico-1').verificar.some(v => /6\(siete\)/.test(v)));
});

test('las referencias salen de la regla; las del usuario las pisan; sin regla vale la general sin confirmar', () => {
  const sinNotas = { evaluaciones: [ev('P1', 7)] };
  assert.deepEqual(umbralesDeRegla(regla('fisica-1')), { promocion: 7, regular: 6 });
  const a = seguimientoCursada(sinNotas, regla('fisica-1'));
  assert.equal(a.origenUmbrales, 'planificacion');
  assert.equal(a.umbrales.promocion, 7);
  const b = seguimientoCursada({ ...sinNotas, umbrales: { promocion: 9, regular: 7 } }, regla('fisica-1'));
  assert.equal(b.origenUmbrales, 'usuario');
  assert.equal(b.umbrales.promocion, 9);
  const c = seguimientoCursada(sinNotas);
  assert.equal(c.origenUmbrales, 'general');
  assert.equal(umbralesDeRegla(regla('analisis-matematico-1')), null);
});
