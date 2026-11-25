import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITES, ETIQUETAS, POST, armarIssue, celda, cerca, crearLimitador, manejar, validarEnvio, type Entorno } from '../api/feedback.ts';
import { MENSAJE_MAX, MENSAJE_MIN, TIPOS, validarMensaje } from '../src/vista/feedback.ts';

const ORIGEN = 'https://regu.example';
const ENTORNO: Entorno = { GITHUB_TOKEN: 't0ken', FEEDBACK_REPO: 'Facundo-Gauna/Regu-feedback', ORIGENES_PERMITIDOS: `${ORIGEN}, http://localhost:5173` };
const VALIDO = { tipo: 'idea', mensaje: 'una idea muy buena', sitio_web: '' };

function pedido(cuerpo: unknown, { origen = ORIGEN, metodo = 'POST', ip = '1.2.3.4' } = {}) {
  const body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  return new Request('https://regu.example/api/feedback', { method: metodo, headers: { origin: origen, 'x-forwarded-for': `${ip}, 10.0.0.1` }, ...(metodo === 'GET' ? {} : { body }) });
}

function github(estado = 201) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  const falso = (async (url: unknown, init?: RequestInit) => {
    llamadas.push({ url: String(url), init: init! });
    if (estado === 0) throw new Error('sin red');
    return new Response('{}', { status: estado });
  }) as typeof fetch;
  return { llamadas, deps: { fetch: falso, limitar: () => true } };
}

test('un envío válido crea el issue en el repo privado, con el token y la etiqueta', async () => {
  const g = github();
  const r = await manejar(pedido(VALIDO), ENTORNO, g.deps);
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(g.llamadas.length, 1);
  assert.equal(g.llamadas[0]!.url, 'https://api.github.com/repos/Facundo-Gauna/Regu-feedback/issues');
  assert.equal((g.llamadas[0]!.init.headers as Record<string, string>)['Authorization'], 'Bearer t0ken');
  const issue = JSON.parse(String(g.llamadas[0]!.init.body));
  assert.deepEqual(issue.labels, ['idea']);
  assert.equal(issue.title, '[Una idea] una idea muy buena');
});

test('método y origen: 405 y 403 sin llamar a GitHub', async () => {
  const g = github();
  assert.equal((await manejar(pedido(VALIDO, { metodo: 'GET' }), ENTORNO, g.deps)).status, 405);
  assert.equal((await manejar(pedido(VALIDO, { origen: 'https://malo.example' }), ENTORNO, g.deps)).status, 403);
  assert.equal((await manejar(pedido(VALIDO, { origen: '' }), ENTORNO, g.deps)).status, 403);
  assert.equal(g.llamadas.length, 0);
});

test('tope: 5 por hora y por IP', async () => {
  let ahora = 1_000_000;
  const limitar = crearLimitador(5, 3_600_000, () => ahora);
  const g = github();
  const deps = { ...g.deps, limitar };
  for (let i = 0; i < 5; i++) assert.equal((await manejar(pedido(VALIDO), ENTORNO, deps)).status, 201);
  assert.equal((await manejar(pedido(VALIDO), ENTORNO, deps)).status, 429);
  assert.equal((await manejar(pedido(VALIDO, { ip: '5.6.7.8' }), ENTORNO, deps)).status, 201);
  ahora += 3_600_001;
  assert.equal((await manejar(pedido(VALIDO), ENTORNO, deps)).status, 201);
});

test('pedidos inválidos: 400', async () => {
  const g = github();
  for (const malo of ['x'.repeat(9000), '{no es json', 'null', { ...VALIDO, tipo: 'spam' }, { ...VALIDO, mensaje: '   corto   ' }, { ...VALIDO, mensaje: 7 }]) {
    assert.equal((await manejar(pedido(malo), ENTORNO, g.deps)).status, 400, JSON.stringify(malo).slice(0, 60));
  }
  assert.equal(g.llamadas.length, 0);
});

test('campo trampa: responde 201 y no crea nada', async () => {
  const g = github();
  assert.equal((await manejar(pedido({ ...VALIDO, sitio_web: 'x' }), ENTORNO, g.deps)).status, 201);
  assert.equal(g.llamadas.length, 0);
});

test('falta configuración: 500; GitHub falla: 502', async () => {
  const g = github();
  assert.equal((await manejar(pedido(VALIDO), { ...ENTORNO, GITHUB_TOKEN: undefined }, g.deps)).status, 500);
  assert.equal(g.llamadas.length, 0);
  assert.equal((await manejar(pedido(VALIDO), ENTORNO, github(401).deps)).status, 502);
  assert.equal((await manejar(pedido(VALIDO), ENTORNO, github(0).deps)).status, 502);
});

test('el mensaje queda entero dentro del bloque de código: sin menciones ni imágenes activas', () => {
  assert.equal(cerca('a ```` b'), '`````');
  assert.equal(cerca('nada'), '```');
  const mensaje = '@facundo mirá ![x](http://e)\n```\n# título\n```';
  const { body } = armarIssue(validarEnvio({ ...VALIDO, mensaje })!);
  const marca = cerca(mensaje);
  assert.ok(body.startsWith(`${marca}text\n${mensaje}\n${marca}`));
  assert.equal(body.split('\n').filter(l => l.startsWith(marca)).length, 2);
});

test('el contexto manipulado no rompe la tabla ni menciona a nadie', () => {
  const c = celda('@alguien | x\ny [a](b) <img>');
  assert.ok(!c.includes('@a') && !c.includes('\n'));
  assert.ok(!/(?<!\\)[|[\]<>]/.test(c), c);
  assert.equal(celda('z'.repeat(500)).length, 200);
  const e = validarEnvio({ ...VALIDO, tecnico: { version: '1', notas: '10' }, contexto: { desde: 'regla', titulo: 't'.repeat(900), secreto: 'x' } })!;
  assert.deepEqual(Object.keys(e.tecnico!), ['version']);
  assert.deepEqual(Object.keys(e.contexto!), ['desde', 'titulo']);
  assert.equal(e.contexto!.titulo.length, 200);
  assert.match(armarIssue(e).body, /\| Dato \| Valor \|/);
});

test('cliente y servidor usan los mismos límites y tipos', () => {
  assert.equal(LIMITES.mensajeMin, MENSAJE_MIN);
  assert.equal(LIMITES.mensajeMax, MENSAJE_MAX);
  assert.deepEqual(ETIQUETAS, Object.fromEntries(TIPOS.map(t => [t.clave, t.texto])));
  const largo = 'é'.repeat(1998) + '🙂'; // 2000 unidades de JS
  assert.equal(validarMensaje(largo), null);
  assert.ok(validarEnvio({ ...VALIDO, mensaje: largo }));
  assert.ok(Buffer.byteLength(JSON.stringify({ ...VALIDO, mensaje: '€'.repeat(2000) })) < LIMITES.cuerpoMax);
});

test('POST, que es lo que llama Vercel, está cableado: un pedido sin origen se rechaza sin salir a la red', async () => {
  const r = await POST(new Request('https://regu.example/api/feedback', { method: 'POST', body: JSON.stringify(VALIDO) }));
  assert.equal(r.status, 403);
});
