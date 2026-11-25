import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarEnvio, contextoDesde, resumirNavegador, textoParaCompartir, validarMensaje } from '../src/vista/feedback.ts';

const tecnico = { version: '0.1.0', pantalla: 'Más', navegador: 'Firefox 140 · Android', tema: 'auto' };

test('el mensaje va de 10 a 2000 caracteres, sin contar los espacios de las puntas', () => {
  assert.ok(validarMensaje('   '));
  assert.ok(validarMensaje('  123456789  '));
  assert.equal(validarMensaje('1234567890'), null);
  assert.equal(validarMensaje('é'.repeat(2000)), null);
  assert.ok(validarMensaje('a'.repeat(2001)));
});

test('sin el tilde no va ningún dato técnico, y nunca van claves fuera de las previstas', () => {
  const base = { tipo: 'idea' as const, mensaje: '  una idea muy buena  ', tecnico };
  const sin = armarEnvio({ ...base, incluirTecnico: false });
  assert.equal('tecnico' in sin, false);
  assert.equal(sin.mensaje, 'una idea muy buena');
  assert.equal(sin.sitio_web, '');
  const con = armarEnvio({ ...base, incluirTecnico: true, contexto: { desde: 'regla', titulo: 'X' } });
  assert.deepEqual(con.tecnico, tecnico);
  for (const k of Object.keys(con)) assert.ok(['tipo', 'mensaje', 'tecnico', 'contexto', 'sitio_web'].includes(k), k);
});

test('el texto para copiar dice el tipo, el mensaje y el contexto', () => {
  const t = textoParaCompartir(armarEnvio({ tipo: 'idea', mensaje: 'una idea muy buena', incluirTecnico: true, tecnico, contexto: { desde: 'regla', titulo: 'Dudas', materia: 'Análisis Matemático I' } }));
  for (const parte of ['Una idea', 'una idea muy buena', 'Dudas', 'Análisis Matemático I', '0.1.0']) assert.ok(t.includes(parte), parte);
});

test('el navegador se resume, no se manda el user agent entero', () => {
  assert.equal(resumirNavegador('Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0'), 'Firefox 140 · Android');
  assert.equal(resumirNavegador('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'), 'Chrome 131 · Windows');
  assert.equal(resumirNavegador('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'Safari 18 · iOS');
  assert.equal(resumirNavegador(''), 'Desconocido');
});

test('contexto de «Sin confirmar»: materia desconocida se omite y el título se recorta', () => {
  assert.deepEqual(contextoDesde({ desde: 'regla', titulo: 'X', materiaId: 'nope' }, () => undefined), { desde: 'regla', titulo: 'X' });
  assert.deepEqual(contextoDesde({ desde: 'regla', titulo: 'X', materiaId: 'am1' }, () => 'Análisis'), { desde: 'regla', titulo: 'X', materia: 'Análisis' });
  assert.equal(contextoDesde({ titulo: 'X' }, () => undefined), undefined);
  assert.equal(contextoDesde({ desde: 'regla', titulo: 'a'.repeat(500) }, () => undefined)?.titulo.length, 200);
});
