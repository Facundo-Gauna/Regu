#!/usr/bin/env node
// Prueba de extremo a extremo en un Firefox real, sin drivers: una página "arnés" (herramientas/e2e/arnes.html) maneja
// la app dentro de un iframe, como lo haría una persona, y manda los resultados a este servidor.
//
//   npm run e2e            (construye la app si hace falta)
//   npm run e2e -- --build (fuerza la compilación)
//   E2E_PREFIJO=/regu-demo/ npm run e2e   (sirve la app bajo una subcarpeta, como un hosting de proyecto)
//
// Cómo funciona:
//  - Este script sirve dist/ y el arnés en un puerto local, y puede simular que no hay conexión (para probar el uso offline).
//  - Lanza Firefox headless con un perfil nuevo. El evento `load` de la página arnés queda retenido por una imagen que este
//    servidor no responde hasta recibir los resultados, así Firefox no saca su captura ni se cierra antes de tiempo.
//  - Imprime los resultados y sale con código 1 si algo falló. La captura final queda en .e2e/ultima.png.
//
// Requiere Firefox instalado. No descarga ni ejecuta nada externo.

import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const arnes = process.env['E2E_ARNES'] ?? join(raiz, 'herramientas', 'e2e', 'arnes.html'); // E2E_ARNES: otra página de pruebas (depuración)
const LIMITE_MS = 150_000;
// La app se sirve bajo este prefijo (por defecto en la raíz). Siempre termina en /.
const PREFIJO = (() => { const p = process.env['E2E_PREFIJO'] ?? '/'; return (p.startsWith('/') ? p : `/${p}`).replace(/\/*$/, '/'); })();

if (process.argv.includes('--build') || !existsSync(join(dist, 'index.html'))) {
  execFileSync('npm', ['run', 'build'], { cwd: raiz, stdio: 'inherit' });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

let sinRed = false;
let pedidosSinRed = [];
let resultados = null;
let parcial = null; // avance, por si el navegador se corta antes de terminar
let liberarImagen = null;

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const ruta = url.pathname;

  // Control del arnés (siempre responde, aunque se simule la falta de red)
  if (ruta === '/__sinred') {
    sinRed = url.searchParams.get('on') === '1';
    pedidosSinRed = [];
    return void res.end('ok');
  }
  if (ruta === '/__pedidos') return void res.end(JSON.stringify(pedidosSinRed));
  if (ruta === '/__resultado' && req.method === 'POST') {
    let cuerpo = '';
    req.on('data', d => (cuerpo += d));
    req.on('end', () => {
      resultados = JSON.parse(cuerpo);
      res.writeHead(204).end();
      liberarImagen?.();
    });
    return;
  }
  if (ruta === '/__parcial' && req.method === 'POST') {
    let cuerpo = '';
    req.on('data', d => (cuerpo += d));
    req.on('end', () => {
      parcial = JSON.parse(cuerpo);
      res.writeHead(204).end();
    });
    return;
  }
  if (ruta === '/__espera.gif') {
    liberarImagen = () => res.writeHead(200, { 'content-type': 'image/gif', 'cache-control': 'no-store' }).end(GIF);
    if (resultados) liberarImagen();
    return;
  }
  if (ruta === '/e2e.html') return void res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' }).end(readFileSync(arnes));

  // Archivos de la app: solo bajo el prefijo (afuera, 404: una referencia absoluta a "/" se notaría)
  if (!ruta.startsWith(PREFIJO)) return void res.writeHead(404).end('fuera del prefijo');
  const rutaApp = '/' + ruta.slice(PREFIJO.length);
  if (sinRed) {
    if (rutaApp !== '/sw.js') pedidosSinRed.push(ruta); // el navegador revisa sw.js por su cuenta; no cuenta
    return void res.writeHead(503).end('sin conexión (simulada)');
  }
  const relativa = rutaApp === '/' ? 'index.html' : normalize(decodeURIComponent(rutaApp)).replace(/^[/\\]+/, '');
  const archivo = join(dist, relativa);
  if (!archivo.startsWith(dist + sep) || !existsSync(archivo)) return void res.writeHead(404).end('no encontrado');
  res.writeHead(200, { 'content-type': MIME[extname(archivo)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(readFileSync(archivo));
});

await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const puerto = servidor.address().port;

const perfil = mkdtempSync(join(tmpdir(), 'regu-e2e-'));
const captura = join(perfil, 'captura.png');
const firefox = spawn('firefox', ['--headless', '--no-remote', '--profile', perfil, '--screenshot', captura, '--window-size=980,900', `http://127.0.0.1:${puerto}/e2e.html?base=${encodeURIComponent(PREFIJO)}`], { stdio: 'ignore' });
const reloj = setTimeout(() => firefox.kill('SIGKILL'), LIMITE_MS);
const codigo = await new Promise(ok => {
  firefox.on('exit', ok);
  firefox.on('error', e => {
    console.error(`No se pudo lanzar Firefox: ${e.message}`);
    ok(-1);
  });
});
clearTimeout(reloj);
servidor.close();

if (existsSync(captura)) {
  mkdirSync(join(raiz, '.e2e'), { recursive: true });
  copyFileSync(captura, join(raiz, '.e2e', 'ultima.png'));
}
rmSync(perfil, { recursive: true, force: true });

if (!resultados) {
  console.error(`✗ El navegador no devolvió resultados (Firefox salió con código ${codigo}; límite ${LIMITE_MS / 1000} s).`);
  if (parcial) {
    console.error(`Avance antes del corte (${parcial.resultados.length} pruebas; la última fue «${parcial.siguiente}»):`);
    for (const r of parcial.resultados) console.error(`${r.ok ? '✓' : '✗'} ${r.nombre}${r.ok ? '' : `\n    ${r.error}`}`);
  }
  process.exit(1);
}
let fallos = 0;
for (const r of resultados) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.nombre}${r.ok ? '' : `\n    ${r.error}`}`);
  if (!r.ok) fallos++;
}
console.log(`\n${resultados.length - fallos} de ${resultados.length} pruebas pasaron${PREFIJO === '/' ? '' : ` (app servida en ${PREFIJO})`}${existsSync(join(raiz, '.e2e', 'ultima.png')) ? ' · captura en .e2e/ultima.png' : ''}`);
process.exit(fallos ? 1 : 0);
