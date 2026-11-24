import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AYUDAS } from '../src/vista/ayuda.ts';

test('cada pantalla con ayuda tiene título y entre 3 y 5 pasos', () => {
  for (const nombre of ['inicio', 'materias', 'materia', 'plan', 'finales', 'cargar', 'progreso'] as const) {
    const a = AYUDAS[nombre];
    assert.ok(a && a.titulo, nombre);
    assert.ok(a.pasos.length >= 3 && a.pasos.length <= 5, `${nombre}: ${a.pasos.length} pasos`);
    for (const p of a.pasos) assert.ok(p.titulo && p.texto, nombre);
  }
});

test('la ayuda de la materia explica cómo cargar y organizar las notas con los nombres de los botones', () => {
  const t = AYUDAS.materia!.pasos.map(p => p.texto).join(' ');
  for (const boton of ['Cargar nota', 'Organizar mis notas por partes', 'Ajustar', 'Promocioné']) assert.ok(t.includes(boton), boton);
});
