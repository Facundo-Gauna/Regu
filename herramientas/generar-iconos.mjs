#!/usr/bin/env node
// Genera el favicon y los íconos de la PWA en public/ a partir del dibujo de src/app/marca.ts.
// Requiere `rsvg-convert` (librsvg). Uso: node herramientas/generar-iconos.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgIcono } from '../src/app/marca.ts';

const publico = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(publico, { recursive: true });

// Favicon vectorial
writeFileSync(join(publico, 'favicon.svg'), svgIcono(64, 0.1, 0.2) + '\n');

// (nombre, lado, margen, redondeo)
// Los "maskable" van a sangre (sin esquinas) y con la palabra en la zona segura central; el sistema les aplica su máscara.
const iconos = [
  ['icon-192.png', 192, 0.12, 0.22],
  ['icon-512.png', 512, 0.12, 0.22],
  ['icon-maskable-512.png', 512, 0.22, 0],
  ['apple-touch-icon.png', 180, 0.14, 0],
];

const tmp = mkdtempSync(join(tmpdir(), 'regu-iconos-'));
try {
  for (const [nombre, lado, margen, redondeo] of iconos) {
    const svg = join(tmp, nombre.replace('.png', '.svg'));
    writeFileSync(svg, svgIcono(lado, margen, redondeo));
    execFileSync('rsvg-convert', ['-w', String(lado), '-h', String(lado), svg, '-o', join(publico, nombre)]);
    console.log(`✓ public/${nombre}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('✓ public/favicon.svg');
