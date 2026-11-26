import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guiaInstalacion, type EntornoInstalacion } from '../src/vista/instalacion.ts';

const env = (userAgent: string, extra: Partial<EntornoInstalacion> = {}): EntornoInstalacion =>
  ({ userAgent, platform: 'Linux armv8l', maxTouchPoints: 5, puedeInstalarConBoton: false, ...extra });

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1';
const ESCRITORIO = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

test('la compu no recibe recomendación', () => {
  assert.equal(guiaInstalacion(env(ESCRITORIO, { platform: 'Linux x86_64', maxTouchPoints: 0 })), null);
});

test('Android con evento de instalación usa el botón', () => {
  assert.deepEqual(guiaInstalacion(env(CHROME_ANDROID, { puedeInstalarConBoton: true })), { tipo: 'boton' });
});

test('cada navegador móvil recibe sus propios pasos', () => {
  const pasos = (ua: string) => (guiaInstalacion(env(ua)) as { pasos: string }).pasos;
  assert.match(pasos(CHROME_ANDROID), /Instalar app/);
  assert.match(pasos(FIREFOX_ANDROID), /«Instalar»/);
  assert.match(pasos(SAMSUNG), /☰/);
  assert.match(pasos(SAFARI_IOS), /Compartir/);
  assert.doesNotMatch(pasos(SAFARI_IOS), /Safari/);
  assert.match(pasos(CHROME_IOS), /abrí Regu en Safari/);
});

test('iPad que se presenta como Mac cuenta como móvil', () => {
  assert.notEqual(guiaInstalacion(env(SAFARI_IOS.replace('iPhone', 'Macintosh'), { platform: 'MacIntel' })), null);
});
