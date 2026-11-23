#!/usr/bin/env node
// Valida los archivos de datos de referencia (planes y calendarios).
// Uso: node herramientas/validar-datos.mjs [archivo.json ...]
// Sin argumentos valida todo lo que hay en datos/planes y datos/calendarios.
// Sale con código 1 si hay errores. Las advertencias no hacen fallar.
// La lógica vive en src/datos/validar.ts (la comparte con la app).

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../src/datos/validar.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function archivosPorDefecto() {
  const out = [];
  for (const dir of ['datos/planes', 'datos/calendarios']) {
    try {
      for (const f of readdirSync(join(raiz, dir))) if (f.endsWith('.json')) out.push(join(raiz, dir, f));
    } catch { /* carpeta inexistente */ }
  }
  return out;
}

const archivos = process.argv.length > 2 ? process.argv.slice(2) : archivosPorDefecto();
let totalErrores = 0;
for (const archivo of archivos) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(archivo, 'utf8'));
  } catch (e) {
    console.log(`✗ ${archivo}: JSON inválido (${e.message})`);
    totalErrores++;
    continue;
  }
  const { errores, avisos } = validar(datos);
  const nombre = relative(raiz, archivo) || archivo;
  console.log(`${errores.length ? '✗' : '✓'} ${nombre}: ${errores.length} errores, ${avisos.length} advertencias`);
  for (const e of errores) console.log(`   ERROR  ${e}`);
  for (const a of avisos) console.log(`   aviso  ${a}`);
  totalErrores += errores.length;
}
process.exit(totalErrores ? 1 : 0);
